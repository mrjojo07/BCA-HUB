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

  // Each subject has three trackable tasks: notes, important questions and MCQ quiz.
  const subjects = new Map();
  rows.forEach((item) => {
    const key = item.semester + ":" + item.subject_slug;
    if (!subjects.has(key)) subjects.set(key, { semester: item.semester, subject_slug: item.subject_slug, completed: new Set() });
    if (item.completed) subjects.get(key).completed.add(item.category);
  });

  [...subjects.values()].slice(0, 8).forEach((item) => {
    const done = item.completed.size;
    const percent = Math.round(done / 3 * 100);
    const line = document.createElement("div");
    line.className = "dashboard-list-item dashboard-progress-item";

    const info = document.createElement("div");
    const heading = document.createElement("strong");
    heading.textContent = titleFromSlug(item.subject_slug);
    const detail = document.createElement("small");
    detail.textContent = "Semester " + item.semester + " · " + done + " of 3 tasks completed";
    info.append(heading, detail);

    const ring = document.createElement("div");
    ring.className = "dashboard-progress-ring" + (percent === 100 ? " is-complete" : "");
    ring.style.setProperty("--progress", percent + "%");
    ring.setAttribute("role", "img");
    ring.setAttribute("aria-label", percent + " out of 100 percent complete");
    const value = document.createElement("span");
    value.textContent = percent;
    const suffix = document.createElement("small");
    suffix.textContent = " / 100";
    ring.append(value, suffix);

    line.append(info, ring);
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
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !sessionData?.session?.user) {
    window.location.replace("login.html");
    return;
  }
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
  const [profileResult, progressResult, quizResult, savedResult] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
    supabase.from("learning_progress").select("semester,subject_slug,category,completed,updated_at").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(30),
    supabase.from("quiz_attempts").select("semester,subject_slug,score,total_questions,attempted_at").eq("user_id", user.id).order("attempted_at", { ascending: false }).limit(20),
    supabase.from("saved_resources").select("resource_path,resource_title,semester,subject_slug,category,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(30)
  ]);
  const failed = [profileResult, progressResult, quizResult, savedResult].find((result) => result.error);
  if (failed) {
    message("Some dashboard information could not be loaded. Please refresh and try again.", "error");
    return;
  }
  const progress = progressResult.data || [];
  const quizzes = quizResult.data || [];
  const saved = savedResult.data || [];
  $("studentName").textContent = profileResult.data?.display_name || user.user_metadata?.display_name || user.email?.split("@")[0] || "Student";
  $("studentEmail").textContent = user.email || "";
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

const aiChatForm = $("aiChatForm");
const aiChatInput = $("aiChatInput");
const aiChatMessages = $("aiChatMessages");
const aiChatStatus = $("aiChatStatus");
const aiSendButton = $("aiSendButton");
const aiLanguage = $("aiLanguage");
let aiConversation = [];

function addAiMessage(role, text) {
  const bubble = document.createElement("div");
  bubble.className = "ai-message " + (role === "user" ? "ai-message-user" : "ai-message-assistant");
  const label = document.createElement("strong");
  label.textContent = role === "user" ? "You" : "BCA HUB AI";
  const paragraph = document.createElement("p");
  paragraph.textContent = text;
  bubble.append(label, paragraph);
  aiChatMessages.append(bubble);
  aiChatMessages.scrollTop = aiChatMessages.scrollHeight;
}
function setAiStatus(text, isError = false) {
  aiChatStatus.textContent = text;
  aiChatStatus.dataset.kind = isError ? "error" : "info";
}
async function sendAiMessage(rawText) {
  const question = (rawText || "").trim();
  if (!question || aiSendButton.disabled) return;
  aiConversation.push({ role: "user", content: question });
  addAiMessage("user", question);
  aiChatInput.value = "";
  aiSendButton.disabled = true;
  aiSendButton.querySelector("span").textContent = "Thinking…";
  setAiStatus("Preparing your answer…");
  try {
    const { data, error } = await supabase.functions.invoke("bca-ai-study-assistant", {
      body: { messages: aiConversation.slice(-10), language: aiLanguage.value }
    });
    if (error) {
      let detail = error.message || "Could not connect to the AI assistant.";
      try { const context = await error.context?.json(); if (context?.error) detail = context.error; } catch {}
      throw new Error(detail);
    }
    if (!data?.answer) throw new Error(data?.error || "No answer received. Please try again.");
    aiConversation.push({ role: "assistant", content: data.answer });
    addAiMessage("assistant", data.answer);
    setAiStatus("Answer generated by AI. Verify important information with your class notes.");
  } catch (error) {
    const detail = error?.message || "Something went wrong. Please try again.";
    setAiStatus(detail, true);
    if (aiConversation[aiConversation.length - 1]?.role === "user") aiConversation.pop();
  } finally {
    aiSendButton.disabled = false;
    aiSendButton.querySelector("span").textContent = "Send";
    aiChatInput.focus();
  }
}
if (aiChatForm) {
  aiChatForm.addEventListener("submit", (event) => {
    event.preventDefault();
    sendAiMessage(aiChatInput.value);
  });
  aiChatInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      aiChatForm.requestSubmit();
    }
  });
  document.querySelectorAll("[data-ai-prompt]").forEach((button) => {
    button.addEventListener("click", () => sendAiMessage(button.dataset.aiPrompt));
  });
  $("aiClearChat").addEventListener("click", () => {
    aiConversation = [];
    aiChatMessages.replaceChildren();
    addAiMessage("assistant", "പുതിയ chat തുടങ്ങി! Ask your BCA question in Malayalam or English.");
    setAiStatus("New conversation started.");
  });
}
