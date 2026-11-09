import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0/+esm";
const supabase = createClient("https://efbkhmfekfujbwfdpfhk.supabase.co", "sb_publishable_N62MLBZ5CQ7016suLKhOmg_wpuQYSbH");
const overlay = document.getElementById("welcomeAuthOverlay");
const closePopup = () => { if (overlay) overlay.hidden = true; };
const firstLoginWelcome = document.documentElement.classList.contains("show-new-user-welcome");

// The public homepage should open directly for everyone.
// Student login and account creation remain available through the site menu
// and protected actions; they no longer block the homepage on first visit.
closePopup();

supabase.auth.onAuthStateChange(() => {
  closePopup();
});

if (firstLoginWelcome) {
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
    window.setTimeout(() => {
      document.documentElement.classList.add("welcome-home-opening");
      document.documentElement.classList.remove("show-new-user-welcome");
      orbitOverlay.classList.remove("is-exiting");
    }, 3700);
    window.setTimeout(() => document.documentElement.classList.remove("welcome-home-opening"), 5400);
  });
}
