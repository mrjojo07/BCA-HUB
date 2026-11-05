import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0/+esm";
const supabase = createClient("https://efbkhmfekfujbwfdpfhk.supabase.co", "sb_publishable_N62MLBZ5CQ7016suLKhOmg_wpuQYSbH");
const overlay = document.getElementById("welcomeAuthOverlay");
const closePopup = () => { if (overlay) overlay.hidden = true; };
const firstLoginWelcome = document.documentElement.classList.contains("show-new-user-welcome");

// Keep the auth welcome hidden until Supabase has restored the saved session.
// This prevents a signed-in user from seeing the login card flash on refresh.
try {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user || firstLoginWelcome) {
    closePopup();
  } else if (overlay) {
    overlay.hidden = false;
  }
} catch (error) {
  // If session restoration fails, avoid incorrectly blocking the public home page.
  if (!firstLoginWelcome && overlay) overlay.hidden = false;
}

supabase.auth.onAuthStateChange((_event, sessionNow) => {
  if (sessionNow?.user || firstLoginWelcome) {
    closePopup();
  } else if (overlay) {
    overlay.hidden = false;
  }
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
