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
function isAdminUser(user) {
  const appMeta = user?.app_metadata || {};
  return appMeta.role === "admin" || appMeta.admin === true;
}
function openAdminPanel(user) {
  if (isAdminUser(user)) {
    window.location.replace("admin.html");
    return true;
  }
  return false;
}
async function showAccount(user) {
  if (openAdminPanel(user)) return;
  formsPanel.hidden = true;
  accountPanel.hidden = false;
  $("accountName").textContent = user.user_metadata?.display_name || user.email?.split("@")[0] || "Student";
  $("accountEmail").textContent = user.email || "";
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
    showStatus("Your account is ready.", "success");
    await showAccount(data.user);
  } else {
    showForm("login");
    showStatus("Account created. Check your inbox and verify your email before logging in.", "success");
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
  if (openAdminPanel(data.user)) return;
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
  showForm("login");
  showStatus("Password updated. You can now use your new password.", "success");
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
    queueMicrotask(() => showAccount(session.user));
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
  if (session?.user) {
    if (!openAdminPanel(session.user)) await showAccount(session.user);
  } else showForm("login");
  if (params.get("verified") === "1") showStatus("Email verified. You can now log in.", "success");
}
