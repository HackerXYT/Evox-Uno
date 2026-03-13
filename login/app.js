const CLIENT_ID = "314460881843-5k3d8113ch5clklju6rhu23hgmilnsdv.apps.googleusercontent.com";
const REDIRECT_URI = "https://evox.uno/login/auth.html";

document.getElementById("login").onclick = () => {

  const url =
    "https://accounts.google.com/o/oauth2/v2/auth?" +
    new URLSearchParams({
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: "code",
      scope: "openid email profile",
      access_type: "offline",
      prompt: "consent"
    });

  window.location.href = url;

};