let installPromptEvent = null;
const installButton = document.getElementById("installAppButton");
function showInstallHelp(message) {
  let note = document.getElementById("installAppStatus");
  if (!note) {
    note = document.createElement("p");
    note.id = "installAppStatus";
    note.className = "hero-note";
    note.setAttribute("role","status");
    installButton?.insertAdjacentElement("afterend",note);
  }
  note.textContent = message;
}
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  window.addEventListener("load",() => {
    navigator.serviceWorker.register(new URL("sw.js",document.baseURI),{scope:"./"})
      .catch(error => console.info("BCA SYNC offline support is unavailable:",error.message));
  },{once:true});
}
window.addEventListener("beforeinstallprompt",event => {
  event.preventDefault();
  installPromptEvent = event;
});
window.addEventListener("appinstalled",() => {
  installPromptEvent = null;
  if (installButton) installButton.hidden = true;
  showInstallHelp("BCA SYNC has been installed on your device.");
});
installButton?.addEventListener("click",async () => {
  if (!installPromptEvent) {
    showInstallHelp("To install, open Chrome menu ⋮ and choose ‘Add to Home screen’ or ‘Install app’.");
    return;
  }
  installPromptEvent.prompt();
  await installPromptEvent.userChoice;
  installPromptEvent = null;
});
if (window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone) {
  if (installButton) installButton.hidden = true;
}
