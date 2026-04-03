document.getElementById('loginForm').addEventListener('submit', function (e) {
    e.preventDefault();
    login();
});

document.getElementById('twoFaForm').addEventListener('submit', function (e) {
    e.preventDefault();
    twoFactorAuthCheck();
});

document.querySelector('.back-button').addEventListener('click', function () {
    console.log('Back button clicked');
});

let tempAccount = null;

function twoFactorAuth() {
    document.getElementById('login').style.display = 'none';
    document.getElementById('2fa').style.display = 'flex';
}

function twoFactorAuthCheck() {
    if (tempAccount === null) {
        alert("No login attempt found. Please login first.");
        return;
    }
    const email = tempAccount.email;
    const password = tempAccount.password;
    const username = tempAccount.username;
    const evxToken = tempAccount.evxToken;
    const code = document.getElementById('code').value.trim();

    if (!code) {
        alert("Please enter the verification code.");
        return;
    }

    fetch("https://uno.evox.uno/2FA", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-Forwarded-For": "1.2.3.4"
        },
        body: JSON.stringify({
            evxToken,
            code
        })
    })
        .then(res => res.json())
        .then(data => {
            console.log(data)
            if (data.success) {
                document.getElementById('login').style.display = 'none';
                document.getElementById('2fa').style.display = 'none';
                if (isTazro) {
                    document.getElementById("signintext").innerText = 'Getting your Tazro account ready...'
                    document.getElementById("loading").style.display = 'flex'
                    const name = tempAccount.name !== "Unknown" ? tempAccount.name.split(" ")[0] : tempAccount.username
                    const tazroData = {
                        user: { name, initial: name[0] },
                        balance: 0,
                        savings: 0,
                        currentView: 'home',
                        selectedDate: new Date(),
                        addSheetOpen: false,
                        debtSheetOpen: false,
                        goalSheetOpen: false,
                        addType: 'expense',
                        amountStr: '',
                        selectedCategory: null,
                        debtType: 'owe',
                        debtViewTab: 'owe',
                        editingDebtId: null,
                        transactionFilter: 'all',
                        searchQuery: '',
                        transactions: [],
                        savingsGoals: [],
                        debts: [],
                    }
                    localStorage.setItem("tazroState", JSON.stringify(tazroData, null, 2))
                    setTimeout(function () {
                        redirect()
                    }, 3000)
                } else {
                    document.getElementById("loading").style.display = 'flex'
                    redirect()
                }

            } else {
                alert("Login failed: " + (data.msg || data.message || "Unknown error"));
            }
        })
        .catch(err => console.error(err));
}

function login() {
    const identifier = document.getElementById('id').value
    const password = document.getElementById('pswd').value
    const username = document.getElementById('username').value
    const firstName = document.getElementById('firstName').value
    const lastName = document.getElementById('lastName').value
    if (!identifier || !password) {
        alert("Please enter both email and password.");
        return;
    }
    fetch("https://uno.evox.uno/register", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-Forwarded-For": "1.2.3.4"
        },
        body: JSON.stringify({
            email: identifier,
            password,
            username,
            name: `${firstName} ${lastName}`
        })
    })
        .then(res => res.json())
        .then(data => {
            console.log(data)
            tempAccount = {
                email: data.email,
                username: data.username,
                password: password,
                evxToken: data.evxToken,
                complete: data,
                name: data.name
            };
            if (data.success) {
                document.getElementById('login').style.display = 'none';
                document.getElementById('2fa').style.display = 'none';
                document.getElementById("loading").style.display = 'flex'
                if (isTazro) {
                    document.getElementById("signintext").innerText = 'Getting your Tazro account ready...'
                    document.getElementById("loading").style.display = 'flex'
                    const name = tempAccount.name !== "Unknown" ? tempAccount.name.split(" ")[0] : tempAccount.username
                    const tazroData = {
                        user: { name, initial: name[0] },
                        balance: 0,
                        savings: 0,
                        currentView: 'home',
                        selectedDate: new Date(),
                        addSheetOpen: false,
                        debtSheetOpen: false,
                        goalSheetOpen: false,
                        addType: 'expense',
                        amountStr: '',
                        selectedCategory: null,
                        debtType: 'owe',
                        debtViewTab: 'owe',
                        editingDebtId: null,
                        transactionFilter: 'all',
                        searchQuery: '',
                        transactions: [],
                        savingsGoals: [],
                        debts: [],
                    }
                    localStorage.setItem("tazroState", JSON.stringify(tazroData, null, 2))
                    setTimeout(function () {
                        redirect()
                    }, 3000)
                } else {
                    document.getElementById("loading").style.display = 'flex'
                    redirect()
                }
            } else {
                alert("Login failed: " + (data.msg || data.message || "Unknown error"));
            }
        })
        .catch(err => console.error(err));
}

function redirect() {
    localStorage.setItem("evx-account", JSON.stringify(tempAccount.complete, null, 2))

    if (isTazro) {
        setTimeout(function () {
            window.location.href = '/Tazro'
        }, 2000)
    } else {
        setTimeout(function () {
            window.location.href = '/'
        }, 2000)
    }

}

let isTazro = false;
document.addEventListener('DOMContentLoaded', function () {
    const params = new URLSearchParams(window.location.search);

    const login = params.get('login');
    if (login === 'tazro') {
        isTazro = true;
        document.getElementById("logo-row").querySelectorAll("*").forEach(el => el.style.display = 'flex');
        document.getElementById("heading").innerText = "Login to continue on Tazro"
    }

    setTimeout(() => {
        document.getElementById("loading-main").style.opacity = '0';
        document.getElementById("loading-main").style.display = 'none';
        document.querySelectorAll("main").forEach(el => el.style.opacity = '1');
    }, 330)
})

function signIn() {
    window.location.href = '../' + (isTazro ? '?login=tazro' : '')
}

