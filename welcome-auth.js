import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0/+esm";
const supabase = createClient("https://efbkhmfekfujbwfdpfhk.supabase.co", "sb_publishable_N62MLBZ5CQ7016suLKhOmg_wpuQYSbH");
const overlay = document.getElementById("welcomeAuthOverlay");
const continueButton = document.getElementById("welcomeAuthContinue");
const closePopup = () => { if (overlay) overlay.hidden = true; };
continueButton?.addEventListener("click", closePopup);
overlay?.addEventListener("click", event => { if (event.target === overlay) closePopup(); });
document.addEventListener("keydown", event => { if (event.key === "Escape") closePopup(); });
const { data: { session } } = await supabase.auth.getSession();
if (session?.user) closePopup();
supabase.auth.onAuthStateChange((_event, sessionNow) => {
  if (sessionNow?.user) closePopup();
});

if (document.documentElement.classList.contains("show-new-user-welcome")) {
  const studentName = document.documentElement.dataset.welcomeName || "Student";
  const greeting = document.getElementById("welcomeOrbitGreeting");
  if (greeting) greeting.textContent = `Welcome, ${studentName}!`;
  closePopup();
  const orbitOverlay = document.getElementById("welcomeOrbitOverlay");
  const enterButton = document.getElementById("welcomeOrbitEnter");
  enterButton?.addEventListener("click", () => {
    if (!orbitOverlay || orbitOverlay.classList.contains("is-exiting")) return;
    enterButton.disabled = true;
    orbitOverlay.classList.add("is-exiting");
    document.documentElement.classList.add("welcome-home-opening");
    window.setTimeout(() => {
      document.documentElement.classList.remove("show-new-user-welcome");
      orbitOverlay.classList.remove("is-exiting");
    }, 1150);
    window.setTimeout(() => document.documentElement.classList.remove("welcome-home-opening"), 1500);
  });
}
