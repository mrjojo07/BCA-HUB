import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0/+esm";

const supabase = createClient(
  "https://efbkhmfekfujbwfdpfhk.supabase.co",
  "sb_publishable_N62MLBZ5CQ7016suLKhOmg_wpuQYSbH"
);
const $ = (id) => document.getElementById(id);
const status = $("dashboardStatus");
const content = $("dashboardContent");

function message(text, kind = "info") {
  status.textContent = text;
  status.dataset.kind = kind;
}
function safeDate(value) {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : date.toLocaleDateString();
}
function titleFromSlug(slug) {
  return (slug || "General").replace(/[-_]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
function membershipFor(row) {
  const now = Date.now();
  if (row?.plan === "premium" && (!row.premium_until || new Date(row.premium_until).getTime() > now)) {
    return { plan: "Premium", info: row.premium_until ? "Access until " + safeDate(row.premium_until) : "Premium access is active." };
  }
  if (row?.plan === "trial" && row.trial_ends_at && new Date(row.trial_ends_at).getTime() > now) {
    return { plan: "Free Trial", info: "Your 3-day trial ends " + new Date(row.trial_ends_at).toLocaleString() + "." };
  }
  return { plan: "Free", info: "Your free membership is active." };
}
function addEmpty(target, text) {
  const p = document.createElement("p");
  p.className = "dashboard-empty";
  p.textContent = text;
  target.replaceChildren(p);
}
function renderProgress(rows) {
  const target = $("progressList");
  if (!rows.length) return addEmpty(target, "No learning progress saved yet. Progress will appear here when you complete learning tasks while signed in.");
  target.replaceChildren();
  rows.slice(0, 8).forEach((item) => {
    const line = document.createElement("div");
    line.className = "dashboard-list-item";
    const info = document.createElement("div");
    const heading = document.createElement("strong");
    heading.textContent = titleFromSlug(item.subject_slug);
    const detail = document.createElement("small");
    detail.textContent = "Semester " + item.semester + " · " + titleFromSlug(item.category);
    info.append(heading, detail);
    const state = document.createElement("span");
    state.className = item.completed ? "dashboard-state done" : "dashboard-state";
    state.textContent = item.completed ? "Completed" : "In progress";
    line.append(info, state);
    target.append(line);
  });
}
function renderQuizzes(rows) {
  const target = $("quizList");
  if (!rows.length) return addEmpty(target, "No quiz attempts recorded yet.");
  target.replaceChildren();
  rows.slice(0, 8).forEach((item) => {
    const line = document.createElement("div");
    line.className = "dashboard-list-item";
    const info = document.createElement("div");
    const heading = document.createElement("strong");
    heading.textContent = titleFromSlug(item.subject_slug);
    const detail = document.createElement("small");
    detail.textContent = "Semester " + item.semester + " · " + safeDate(item.attempted_at);
    info.append(heading, detail);
    const score = document.createElement("span");
    score.className = "dashboard-score";
    score.textContent = item.score + "/" + item.total_questions;
    line.append(info, score);
    target.append(line);
  });
}
function renderSaved(rows) {
  const target = $("savedList");
  if (!rows.length) return addEmpty(target, "No saved resources yet. Save useful materials from the website to see them here.");
  target.replaceChildren();
  rows.slice(0, 10).forEach((item) => {
    const line = document.createElement("div");
    line.className = "dashboard-list-item";
    const info = document.createElement("div");
    const heading = document.createElement("strong");
    heading.textContent = item.resource_title || "Saved resource";
    const detail = document.createElement("small");
    detail.textContent = "Semester " + item.semester + " · " + titleFromSlug(item.category);
    info.append(heading, detail);
    const link = document.createElement("a");
    link.className = "dashboard-open-link";
    link.href = item.resource_path || "index.html";
    link.textContent = "Open ↗";
    if (/^https?:\/\//i.test(link.href)) {
      link.target = "_blank";
      link.rel = "noopener noreferrer";
    }
    line.append(info, link);
    target.append(line);
  });
}
async function loadDashboard() {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  const user = userData?.user;
  if (userError || !user) {
    message("Please log in to view your student dashboard.", "error");
    const link = document.createElement("a");
    link.href = "login.html";
    link.className = "button button-gold";
    link.textContent = "Go to student login";
    status.append(" ", link);
    return;
  }
  const [profileResult, membershipResult, progressResult, quizResult, savedResult] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
    supabase.from("memberships").select("plan,trial_started_at,trial_ends_at,premium_until").eq("user_id", user.id).maybeSingle(),
    supabase.from("learning_progress").select("semester,subject_slug,category,completed,updated_at").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(30),
    supabase.from("quiz_attempts").select("semester,subject_slug,score,total_questions,attempted_at").eq("user_id", user.id).order("attempted_at", { ascending: false }).limit(20),
    supabase.from("saved_resources").select("resource_path,resource_title,semester,subject_slug,category,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(30)
  ]);
  const failed = [profileResult, membershipResult, progressResult, quizResult, savedResult].find((result) => result.error);
  if (failed) {
    message("Some dashboard information could not be loaded. Please refresh and try again.", "error");
    return;
  }
  const progress = progressResult.data || [];
  const quizzes = quizResult.data || [];
  const saved = savedResult.data || [];
  $("studentName").textContent = profileResult.data?.display_name || user.user_metadata?.display_name || user.email?.split("@")[0] || "Student";
  $("studentEmail").textContent = user.email || "";
  const membership = membershipFor(membershipResult.data);
  $("studentPlan").textContent = membership.plan;
  $("studentPlanInfo").textContent = membership.info;
  $("progressCount").textContent = progress.filter((item) => item.completed).length;
  $("quizCount").textContent = quizzes.length;
  $("savedCount").textContent = saved.length;
  renderProgress(progress);
  renderQuizzes(quizzes);
  renderSaved(saved);
  status.textContent = "";
  content.hidden = false;
}
$("dashboardLogout").addEventListener("click", async () => {
  $("dashboardLogout").disabled = true;
  const { error } = await supabase.auth.signOut();
  if (error) {
    message("Could not log out. Please try again.", "error");
    $("dashboardLogout").disabled = false;
    return;
  }
  window.location.href = "login.html";
});
$("year").textContent = new Date().getFullYear();
loadDashboard();
