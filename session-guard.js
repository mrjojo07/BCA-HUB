import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0/+esm";

const supabase = createClient(
  "https://efbkhmfekfujbwfdpfhk.supabase.co",
  "sb_publishable_N62MLBZ5CQ7016suLKhOmg_wpuQYSbH"
);

const SESSION_STARTED_KEY = "bca-hub-student-login-started-at";
const SESSION_MAX_AGE = 30 * 24 * 60 * 60 * 1000;
let redirecting = false;

async function requireStudentSession() {
  if (redirecting) return;
  const { data, error } = await supabase.auth.getSession();
  const session = data?.session;
  const startedAt = Number(localStorage.getItem(SESSION_STARTED_KEY));

  if (error || !session?.user || !startedAt || !Number.isFinite(startedAt) || Date.now() - startedAt >= SESSION_MAX_AGE) {
    redirecting = true;
    localStorage.removeItem(SESSION_STARTED_KEY);
    if (session) await supabase.auth.signOut({ scope: "local" });
    window.location.replace("login.html?reason=session-expired");
    return;
  }

  document.documentElement.style.visibility = "visible";

  const remaining = SESSION_MAX_AGE - (Date.now() - startedAt);
  window.setTimeout(requireStudentSession, remaining);
}

supabase.auth.onAuthStateChange((event) => {
  if (event === "SIGNED_OUT") localStorage.removeItem(SESSION_STARTED_KEY);
});

await requireStudentSession();
