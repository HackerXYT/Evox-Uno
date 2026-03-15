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

    fetch("http://localhost:3000/2FA", {
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
                document.getElementById("loading").style.display = 'flex'
                redirect()
            } else {
                alert("Login failed: " + (data.msg || data.message || "Unknown error"));
            }
        })
        .catch(err => console.error(err));
}

function login() {
    const identifier = document.getElementById('id').value
    const password = document.getElementById('pswd').value
    if (!identifier || !password) {
        alert("Please enter both email and password.");
        return;
    }
    fetch("http://localhost:3000/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-Forwarded-For": "1.2.3.4"
        },
        body: JSON.stringify({
            identifier,
            password
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
                complete: data
            };
            if (data.success) {
                if (data.twofactordone === true) {
                    document.getElementById('login').style.display = 'none';
                    document.getElementById('2fa').style.display = 'none';
                    document.getElementById("loading").style.display = 'flex'
                    redirect()
                } else {
                    document.getElementById("greeting").innerText = `Welcome back, ${data.name !== "Unknown" ? data.name.split(" ")[0] : data.username}`
                    twoFactorAuth();
                }
            } else {
                alert("Login failed: " + (data.msg || data.message || "Unknown error"));
            }
        })
        .catch(err => console.error(err));
}

function redirect() {
    localStorage.setItem("evx-account", JSON.stringify(tempAccount.complete, null, 2))
    setTimeout(function () {
        window.location.href = '/'
    }, 2000)
}