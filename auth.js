import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0/+esm";

const SUPABASE_URL = "https://efbkhmfekfujbwfdpfhk.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_N62MLBZ5CQ7016suLKhOmg_wpuQYSbH";
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const $ = (id) => document.getElementById(id);
const statusBox = $("authStatus");
const formsPanel = $("authForms");
const accountPanel = $("accountPanel");
const loginForm = $("loginForm");
const signupForm = $("signupForm");
const recoveryForm = $("recoveryForm");
const newPasswordForm = $("newPasswordForm");
const appBase = window.location.pathname.replace(/[^/]*$/, "");
const redirectUrl = window.location.origin + appBase + "login.html";

function showStatus(message, kind = "info") {
  statusBox.textContent = message;
  statusBox.dataset.kind = kind;
}
function clearStatus() {
  statusBox.textContent = "";
  statusBox.dataset.kind = "";
}
function showForm(name) {
  loginForm.hidden = name !== "login";
  signupForm.hidden = name !== "signup";
  recoveryForm.hidden = name !== "recovery";
  newPasswordForm.hidden = name !== "newPassword";
  $("showLogin").classList.toggle("active", name === "login");
  $("showSignup").classList.toggle("active", name === "signup");
  $("showLogin").setAttribute("aria-selected", String(name === "login"));
  $("showSignup").setAttribute("aria-selected", String(name === "signup"));
  $("authForms").hidden = false;
  accountPanel.hidden = true;
  clearStatus();
}
function readableError(error) {
  const message = error?.message || "Something went wrong. Please try again.";
  if (/invalid login credentials/i.test(message)) return "Email or password is incorrect.";
  if (/email not confirmed/i.test(message)) return "Please verify your email using the link we sent you.";
  if (/user already registered/i.test(message)) return "An account already exists for this email. Please log in.";
  return message;
}
function effectiveMembership(row) {
  if (!row) return { plan: "Free", info: "Your free membership is active." };
  if (row.plan === "premium" && (!row.premium_until || new Date(row.premium_until) > new Date())) {
    return { plan: "Premium", info: row.premium_until ? "Premium access until " + new Date(row.premium_until).toLocaleDateString() + "." : "Premium access is active." };
  }
  if (row.plan === "trial" && row.trial_ends_at && new Date(row.trial_ends_at) > new Date()) {
    const ends = new Date(row.trial_ends_at);
    return { plan: "Free Trial", info: "Your 3-day trial ends on " + ends.toLocaleString() + "." };
  }
  return { plan: "Free", info: "Your free membership is active. Your trial or premium access has ended." };
}
async function showAccount(user) {
  formsPanel.hidden = true;
  accountPanel.hidden = false;
  $("accountName").textContent = user.user_metadata?.display_name || user.email?.split("@")[0] || "Student";
  $("accountEmail").textContent = user.email || "";
  const { data, error } = await supabase.from("memberships").select("plan,trial_started_at,trial_ends_at,premium_until").eq("user_id", user.id).maybeSingle();
  if (error) {
    $("membershipPlan").textContent = "Membership unavailable";
    $("membershipInfo").textContent = "Please refresh the page to try again.";
    return;
  }
  const membership = effectiveMembership(data);
  $("membershipPlan").textContent = membership.plan;
  $("membershipInfo").textContent = membership.info;
}
$("showLogin").addEventListener("click", () => showForm("login"));
$("showSignup").addEventListener("click", () => showForm("signup"));
$("forgotPassword").addEventListener("click", () => showForm("recovery"));
$("backToLogin").addEventListener("click", () => showForm("login"));

signupForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearStatus();
  const displayName = $("signupName").value.trim();
  const email = $("signupEmail").value.trim().toLowerCase();
  const password = $("signupPassword").value;
  if (!displayName) return showStatus("Please enter your display name.", "error");
  if (password.length < 8) return showStatus("Use a password with at least 8 characters.", "error");
  const button = signupForm.querySelector("button[type=submit]");
  button.disabled = true; button.textContent = "Creating account…";
  const { data, error } = await supabase.auth.signUp({
    email, password,
    options: { data: { display_name: displayName }, emailRedirectTo: redirectUrl }
  });
  button.disabled = false; button.textContent = "Create account";
  if (error) return showStatus(readableError(error), "error");
  if (data.session) {
    showStatus("Your account is ready. Your 3-day trial has started.", "success");
    await showAccount(data.user);
  } else {
    showStatus("Account created. Check your inbox and verify your email before logging in. Your 3-day trial starts now.", "success");
    showForm("login");
  }
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearStatus();
  const button = loginForm.querySelector("button[type=submit]");
  button.disabled = true; button.textContent = "Signing in…";
  const { data, error } = await supabase.auth.signInWithPassword({
    email: $("loginEmail").value.trim().toLowerCase(),
    password: $("loginPassword").value
  });
  button.disabled = false; button.textContent = "Log in";
  if (error) return showStatus(readableError(error), "error");
  await showAccount(data.user);
});

recoveryForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = $("recoveryEmail").value.trim().toLowerCase();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: redirectUrl + "?mode=recovery"
  });
  if (error) return showStatus(readableError(error), "error");
  showStatus("If an account exists for that email, a password reset link has been sent.", "success");
});

newPasswordForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const password = $("newPassword").value;
  const confirm = $("confirmNewPassword").value;
  if (password.length < 8) return showStatus("Use a password with at least 8 characters.", "error");
  if (password !== confirm) return showStatus("The passwords do not match.", "error");
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return showStatus(readableError(error), "error");
  showStatus("Password updated. You can now use your new password.", "success");
  showForm("login");
});

$("logoutButton").addEventListener("click", async () => {
  const { error } = await supabase.auth.signOut();
  if (error) return showStatus(readableError(error), "error");
  accountPanel.hidden = true;
  formsPanel.hidden = false;
  showForm("login");
  showStatus("You have been logged out.", "success");
});

supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === "PASSWORD_RECOVERY") {
    showForm("newPassword");
  } else if (session?.user && event === "SIGNED_IN") {
    await showAccount(session.user);
  } else if (event === "SIGNED_OUT") {
    formsPanel.hidden = false;
    accountPanel.hidden = true;
  }
});

$("year").textContent = new Date().getFullYear();
const params = new URLSearchParams(window.location.search);
if (params.get("mode") === "recovery") {
  showForm("newPassword");
} else {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) await showAccount(session.user);
  else showForm("login");
  if (params.get("verified") === "1") showStatus("Email verified. You can now log in.", "success");
}
