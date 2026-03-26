function setUnoProgress(value) {
    const progressFill = document.querySelector('.progress-fill');
    const progressLabel = document.querySelector('.progress-header span:last-child');
    const builtLabel = document.querySelector('.stats-ribbon .ribbon-stat .num');

    if (!progressFill) {
        return;
    }

    const numericValue = Number(value);
    const clamped = Number.isFinite(numericValue) ? Math.min(100, Math.max(0, numericValue)) : 0;
    const percent = `${clamped}%`;

    progressFill.style.setProperty('--progress-value', percent);

    if (progressLabel) {
        progressLabel.textContent = `${clamped} %`;
    }

    if (builtLabel) {
        builtLabel.textContent = percent;
    }
}


fetch("https://uno.evox.uno/uno-progress", {
    method: "GET",
    headers: {
        "Content-Type": "application/json",
    }
})
    .then(res => res.json())
    .then(data => {
        setUnoProgress(data.progress);
    })
    .catch(err => console.error(err));

const userMenu = document.querySelector('#userMenu');
const userMenuToggle = userMenu ? userMenu.querySelector('.user-dropdown-toggle') : null;

if (userMenu && userMenuToggle) {
    userMenuToggle.addEventListener('click', () => {
        const isOpen = userMenu.classList.toggle('open');
        userMenuToggle.setAttribute('aria-expanded', String(isOpen));
    });

    document.addEventListener('click', (event) => {
        if (!userMenu.contains(event.target)) {
            userMenu.classList.remove('open');
            userMenuToggle.setAttribute('aria-expanded', 'false');
        }
    });
}

if (localStorage.getItem("evx-account")) {
    const account = JSON.parse(localStorage.getItem("evx-account"))
    document.getElementById("pfp").src = account.pfp
    document.getElementById("username").innerText = account.name !== 'Unknown' ? account.name : account.username
    document.getElementById("login").style.display = 'none'
    document.getElementById("userMenu").style.display = 'flex'
}

function logout() {
    localStorage.removeItem("evx-account")
    window.location.reload()
}