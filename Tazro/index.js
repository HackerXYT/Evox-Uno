const express = require("express");
const axios = require("axios");
const cors = require("cors");
const fs = require("fs");
const path = require("path")
const app = express();
const crypto = require("crypto")
require('dotenv').config()
app.use(cors());
app.use(express.json());
app.set('trust proxy', true);

const { sendMail } = require("./components/emails")
const { getUserByEmail, getNameByUsername, addIPToAccount, complete2FA } = require("./components/helpers")
const { CLIENT_ID, CLIENT_SECRET, REDIRECT_URI } = process.env

const defaultFinavoxDB = () => ({
    balance: 0,
    savings: 0,
    transactions: [],
    goals: [],
    debts: [],
    payments: []
});

function getEvxToken(req) {
    const authHeader = req.headers["authorization"];
    let bearerToken = "";

    if (authHeader && authHeader.startsWith("Bearer ")) {
        bearerToken = authHeader.slice(7); // remove "Bearer "
    }

    const headerToken = req.headers["x-evx-token"];
    const bodyToken = req.body?.evxToken;
    const queryToken = req.query?.evxToken;

    return String(
        bearerToken || bodyToken || queryToken || headerToken || ""
    ).trim();
}

function getAccountFolderByToken(evxToken) {
    return path.join(__dirname, "database", "accounts", evxToken);
}

function getFinavoxPathByToken(evxToken) {
    return path.join(getAccountFolderByToken(evxToken), "tazro.evox");
}

function getAccountFileByToken(evxToken) {
    return path.join(getAccountFolderByToken(evxToken), "account.json");
}

function readFinavoxDB(evxToken) {
    const folder = getAccountFolderByToken(evxToken);
    if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });

    const dbPath = getFinavoxPathByToken(evxToken);
    if (!fs.existsSync(dbPath)) {
        fs.writeFileSync(dbPath, JSON.stringify(defaultFinavoxDB(), null, 2), "utf-8");
    }
    return JSON.parse(fs.readFileSync(dbPath, "utf-8"));
}

function writeFinavoxDB(evxToken, data) {
    fs.writeFileSync(getFinavoxPathByToken(evxToken), JSON.stringify(data, null, 2), "utf-8");
}

function requireEvxToken(req, res, next) {
    const evxToken = getEvxToken(req);
    if (!evxToken) {
        return res.status(400).json({ success: false, msg: "evxToken is required" });
    }

    const accountPath = getAccountFileByToken(evxToken);
    if (!fs.existsSync(accountPath)) {
        return res.status(401).json({ success: false, msg: "Invalid evxToken" });
    }

    req.evxToken = evxToken;
    next();
}

app.post("/exchange", async (req, res) => {
    const { code } = req.body;
    try {

        const tokenRes = await axios.post("https://oauth2.googleapis.com/token", {
            code,
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            redirect_uri: REDIRECT_URI,
            grant_type: "authorization_code"
        }, {
            headers: { "Content-Type": "application/json" }
        });

        const tokenData = tokenRes.data;

        const userRes = await axios.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            {
                headers: {
                    Authorization: `Bearer ${tokenData.access_token}`
                }
            }
        );

        const user = userRes.data;

        res.json({
            success: true,
            user
        });

        if (user?.id) {
            fs.writeFileSync(`user-${user.id}.json`, JSON.stringify(user, null, 2));
        }

    } catch (err) {
        console.error("Error exchanging code:", err.response ? err.response.data : err.message);
        res.json({ success: false });
    }

});

app.post("/login", async (req, res) => {
    const { identifier, password } = req.body;
    if (!identifier || !password) return res.json({ success: false, msg: "Not ready." })
    const ip =
        req.headers["x-forwarded-for"]?.split(",")[0] ||
        req.socket.remoteAddress;
    const normalizedIdentifier = String(identifier).trim().toLowerCase();

    console.log("Client IP:", ip);
    try {
        const dictionaryPath = path.join(__dirname, "database", "dictionary.json");
        const dictionary = JSON.parse(fs.readFileSync(dictionaryPath, "utf-8"));
        const localToken = dictionary[identifier] || dictionary[normalizedIdentifier];

        if (localToken) {
            const accountFilePath = path.join(__dirname, "database", "accounts", localToken, "account.json");
            if (!fs.existsSync(accountFilePath)) {
                return res.json({ success: false, msg: "Local account file missing" });
            }

            const localAccount = JSON.parse(fs.readFileSync(accountFilePath, "utf-8"));
            if (localAccount.pswd !== password) {
                return res.json({ success: false, msg: "Creds Incorrect" });
            }

            return res.json({
                success: true,
                email: localAccount.email || normalizedIdentifier,
                username: localAccount.username,
                name: localAccount.name,
                pfp: localAccount.pfp,
                twofactordone: true,
                bypassedExternal: true,
                evxToken: localToken
            });
        }

        const userRes = await axios.get(
            `https://data.evoxs.xyz/accounts?email=${identifier}&password=${password}&autologin=true&ip=${ip}`
        );

        const user = userRes.data;
        const userText = typeof user === "string" ? user : JSON.stringify(user);

        console.log(user)
        const granted = userText.includes("IP Not Verified,") || userText.includes("Credentials Correct")
        if (granted) {
            const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,7}\b/;
            const serverEmail = userText.match(emailRegex);

            if (!serverEmail) {
                return res.json({ success: false, msg: "Email not found" });
            }

            const usernameRes = await getUserByEmail(serverEmail[0]);
            const nameRes = await getNameByUsername(usernameRes);
            const ipAdded = await addIPToAccount(usernameRes, serverEmail[0], password, ip);

            const account = {
                email: serverEmail[0],
                username: usernameRes,
                name: nameRes,
                pfp: `https://data.evoxs.xyz/profiles/?authorize=imagePfp&name=${usernameRes}`
            }

            let accountFile = {
                ...account,
                pswd: password
            }

            let twofactordone = false;
            if (ipAdded === 'Complete' || ipAdded === 'Exists') {
                twofactordone = false//true
                const code = await sendMail(serverEmail[0])
                accountFile.emailCode = { code, creation: new Date().toISOString() }
            } else {
                console.log(ipAdded)
            }
            const existingToken = dictionary[serverEmail[0]];
            const token = existingToken || crypto.randomBytes(32).toString("hex");

            const folderPath = path.join(__dirname, "database", "accounts", token);
            if (!fs.existsSync(folderPath)) {
                fs.mkdirSync(folderPath, { recursive: true });
            }

            const accountFilePath = path.join(folderPath, "account.json");
            fs.writeFileSync(accountFilePath, JSON.stringify(accountFile, null, 2), 'utf-8');

            if (!existingToken) {
                dictionary[serverEmail[0]] = token
                fs.writeFileSync(path.join(__dirname, 'database', 'dictionary.json'), JSON.stringify(dictionary, null, 2), 'utf-8');
            }

            if (userText.includes("IP Not Verified,") || userText.includes("Credentials Correct") || userText.includes("Do 2FA")) {
                res.json({
                    success: true,
                    ...account,
                    twofactordone: twofactordone,
                    evxToken: token
                });
            }

        } else {
            if (user === "Account Doesn't Exist") {
                res.json({ success: false, msg: "Creds Incorrect. To implement." });
            } else {
                res.json({ success: false, msg: "Creds Incorrect" });
            }
        }
    } catch (err) {
        console.error("Error exchanging code:", err.response ? err.response.data : err.message);
        res.json({ success: false });
    }

});

app.post("/2FA", async (req, res) => {
    const { evxToken, code } = req.body;
    console.log(req.body)
    if (!evxToken || !code) return res.json({ success: false, msg: "Params not ready." })
    const ip =
        req.headers["x-forwarded-for"]?.split(",")[0] ||
        req.socket.remoteAddress;

    console.log("Client IP:", ip);
    try {
        const FactorRes = await complete2FA(evxToken, code, ip);
        if (FactorRes === 'Exists' || FactorRes === 'Complete') {
            res.json({ success: true })
        } else {
            console.log(FactorRes)
            res.json({ success: false })
        }
    } catch (err) {
        console.error("Error exchanging code:", err.response ? err.response.data : err.message);
        res.json({ success: false });
    }

});

const unoProgress = 10
app.get("/uno-progress", async (req, res) => {
    res.json({ progress: unoProgress })
})

// Finavox data (per-user by evxToken)
app.get('/tazro/data', requireEvxToken, (req, res) => {
    res.json(readFinavoxDB(req.evxToken));
});

app.post('/tazro/transactions', requireEvxToken, (req, res) => {
    const db = readFinavoxDB(req.evxToken);
    const tx = { ...req.body, id: Date.now() };

    tx.amount = Number(tx.amount);
    if (!Number.isFinite(tx.amount) || tx.amount < 0) {
        return res.status(400).json({ error: 'Invalid amount' });
    }

    db.transactions.unshift(tx);

    if (tx.type === 'expense') db.balance -= tx.amount;
    else db.balance += tx.amount;

    writeFinavoxDB(req.evxToken, db);
    res.json({ transaction: tx, balance: db.balance });
});

app.delete('/tazro/transactions/:id', requireEvxToken, (req, res) => {
    const db = readFinavoxDB(req.evxToken);
    const id = Number(req.params.id);
    const tx = db.transactions.find(t => t.id === id);

    if (!tx) return res.status(404).json({ error: 'Transaction not found' });

    if (tx.type === 'expense') db.balance += tx.amount;
    else db.balance -= tx.amount;

    db.transactions = db.transactions.filter(t => t.id !== id);
    writeFinavoxDB(req.evxToken, db);
    res.json({ balance: db.balance });
});

app.post('/tazro/goals', requireEvxToken, (req, res) => {
    const db = readFinavoxDB(req.evxToken);
    const goal = { ...req.body, id: Date.now() };
    db.goals.push(goal);
    writeFinavoxDB(req.evxToken, db);
    res.json(goal);
});

app.delete('/tazro/goals/:id', requireEvxToken, (req, res) => {
    const db = readFinavoxDB(req.evxToken);
    const id = Number(req.params.id);
    db.goals = db.goals.filter(g => g.id !== id);
    writeFinavoxDB(req.evxToken, db);
    res.json({ ok: true });
});

app.post('/tazro/debts', requireEvxToken, (req, res) => {
    const db = readFinavoxDB(req.evxToken);
    const debt = { ...req.body, id: Date.now() };
    db.debts.push(debt);
    writeFinavoxDB(req.evxToken, db);
    res.json(debt);
});

app.put('/tazro/debts/:id', requireEvxToken, (req, res) => {
    const db = readFinavoxDB(req.evxToken);
    const id = Number(req.params.id);
    const idx = db.debts.findIndex(d => d.id === id);

    if (idx === -1) return res.status(404).json({ error: 'Debt not found' });

    db.debts[idx] = { ...db.debts[idx], ...req.body, id };
    writeFinavoxDB(req.evxToken, db);
    res.json(db.debts[idx]);
});

app.delete('/tazro/debts/:id', requireEvxToken, (req, res) => {
    const db = readFinavoxDB(req.evxToken);
    const id = Number(req.params.id);
    db.debts = db.debts.filter(d => d.id !== id);
    writeFinavoxDB(req.evxToken, db);
    res.json({ ok: true });
});

app.post('/tazro/transfer', requireEvxToken, (req, res) => {
    const amount = Number(req.body.amount);
    const { direction } = req.body;
    const db = readFinavoxDB(req.evxToken);

    if (!Number.isFinite(amount) || amount < 0) {
        return res.status(400).json({ error: 'Invalid amount' });
    }

    if (direction === 'save') {
        if (amount > db.balance) return res.status(400).json({ error: 'Insufficient balance' });
        db.balance -= amount;
        db.savings += amount;
        if (db.goals.length > 0) {
            db.goals[0].current = Math.min((Number(db.goals[0].current) || 0) + amount, Number(db.goals[0].target) || 0);
        }
    } else {
        if (amount > db.savings) return res.status(400).json({ error: 'Insufficient savings' });
        db.savings -= amount;
        db.balance += amount;
    }

    writeFinavoxDB(req.evxToken, db);
    res.json({ balance: db.balance, savings: db.savings, goals: db.goals });
});

// ---- PAYMENTS ----
app.post('/tazro/payments', requireEvxToken, (req, res) => {
    const db = readFinavoxDB(req.evxToken);
    if (!db.payments) db.payments = [];
    const payment = { ...req.body, id: Date.now(), status: 'pending' };
    payment.amount = Number(payment.amount);
    if (!Number.isFinite(payment.amount) || payment.amount < 0) {
        return res.status(400).json({ error: 'Invalid amount' });
    }
    db.payments.unshift(payment);
    writeFinavoxDB(req.evxToken, db);
    res.json(payment);
});

app.put('/tazro/payments/:id', requireEvxToken, (req, res) => {
    const db = readFinavoxDB(req.evxToken);
    if (!db.payments) db.payments = [];
    const id = Number(req.params.id);
    const idx = db.payments.findIndex(p => p.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Payment not found' });
    db.payments[idx] = { ...db.payments[idx], ...req.body, id };
    writeFinavoxDB(req.evxToken, db);
    res.json(db.payments[idx]);
});

app.delete('/tazro/payments/:id', requireEvxToken, (req, res) => {
    const db = readFinavoxDB(req.evxToken);
    if (!db.payments) db.payments = [];
    const id = Number(req.params.id);
    db.payments = db.payments.filter(p => p.id !== id);
    writeFinavoxDB(req.evxToken, db);
    res.json({ ok: true });
});

// Mark a payment as settled — also creates a transaction and adjusts balance
app.post('/tazro/payments/:id/settle', requireEvxToken, (req, res) => {
    const db = readFinavoxDB(req.evxToken);
    if (!db.payments) db.payments = [];
    const id = Number(req.params.id);
    const idx = db.payments.findIndex(p => p.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Payment not found' });

    const payment = db.payments[idx];
    if (payment.status === 'settled') {
        return res.status(400).json({ error: 'Already settled' });
    }

    // Create a matching transaction
    const txType = payment.type === 'incoming' ? 'income' : 'expense';
    const tx = {
        id: Date.now(),
        name: payment.name,
        category: payment.category || (txType === 'income' ? 'other_income' : 'other_expense'),
        type: txType,
        amount: payment.amount,
        date: new Date().toISOString(),
        note: payment.note || '',
    };

    db.transactions.unshift(tx);
    if (txType === 'expense') db.balance -= payment.amount;
    else db.balance += payment.amount;

    db.payments[idx].status = 'settled';
    db.payments[idx].settledAt = new Date().toISOString();

    writeFinavoxDB(req.evxToken, db);
    res.json({ payment: db.payments[idx], transaction: tx, balance: db.balance });
});

app.put('/tazro/settings', requireEvxToken, (req, res) => {
    const db = readFinavoxDB(req.evxToken);
    if (req.body.balance !== undefined) db.balance = Number(req.body.balance);
    if (req.body.savings !== undefined) db.savings = Number(req.body.savings);
    writeFinavoxDB(req.evxToken, db);
    res.json({ balance: db.balance, savings: db.savings });
});

app.listen(3000, () => {
    console.log("API running on port 3000");
});
