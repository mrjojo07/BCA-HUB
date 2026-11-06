import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0/+esm";
const supabase = createClient("https://efbkhmfekfujbwfdpfhk.supabase.co", "sb_publishable_N62MLBZ5CQ7016suLKhOmg_wpuQYSbH");

function updateSidebarThemeLabel(){
  const link=document.querySelector(".sidebar-premium");
  if(!link) return;
  const premium=document.body.classList.contains("premium-mode");
  link.innerHTML=premium?"🔵 &nbsp; Old Theme":"♛ &nbsp; Premium";
  link.setAttribute("aria-label",premium?"Switch to Old Theme":"Open BCA SYNC Premium");
}

// Premium theme requires an explicit Premium-button choice in this tab,
// plus trusted access from Supabase app_metadata.
function applyBcaPremiumTheme(user){
  const meta=user?.app_metadata||{};
  const hasAccess=meta.role==="admin"||meta.admin===true;
  const storedPremium=sessionStorage.getItem("bca-sync-experience")==="premium"||localStorage.getItem("bca-sync-experience")==="premium";
  // Keep the already-selected visual theme during the brief auth-session restore
  // on refresh; a signed-in non-admin is still switched back to the standard theme.
  const enabled=storedPremium&&(!user||hasAccess);
  const shouldAnimate=enabled&&sessionStorage.getItem("bca-sync-premium-transition")==="1";
  if(shouldAnimate){
    sessionStorage.removeItem("bca-sync-premium-transition");
    document.body.classList.remove("premium-mode","premium-transitioning");
    window.bcaPremiumTransitionTimers=[];
    const beginTimer=window.setTimeout(()=>{
      if(!document.body.isConnected) return;
      document.body.classList.add("premium-transitioning","premium-mode");
      const finishTimer=window.setTimeout(()=>{
        document.body.classList.remove("premium-transitioning");
        window.bcaPremiumTransitionTimers=[];
      },2300);
      window.bcaPremiumTransitionTimers.push(finishTimer);
      updateSidebarThemeLabel();
    },450);
    window.bcaPremiumTransitionTimers.push(beginTimer);
  }else{
    document.body.classList.toggle("premium-mode",enabled);
    document.body.classList.remove("premium-transitioning");
    updateSidebarThemeLabel();
  }
}
(async()=>{
  // Restore the selected subject immediately; do not wait for Supabase session lookup.
  await Promise.resolve();
  const returnParams=new URLSearchParams(window.location.search);
  const savedReturnSlug=sessionStorage.getItem("bca-sync-return-subject")||"";
  const savedReturnSemester=Number(sessionStorage.getItem("bca-sync-return-semester")||1);
  const returnSlug=returnParams.get("returnSubject")||savedReturnSlug;
  const returnSemester=Number(returnParams.get("returnSemester")||savedReturnSemester||1);
  if(returnSlug){
    const subjects=semesterSubjects[returnSemester]||[];
    const normalizedSlug=String(returnSlug).toLowerCase().trim();
    const match=subjects.find(name=>subjectSlug(name)===normalizedSlug);
    if(match){
      currentSemester=returnSemester;
      showCategories(match);
      subjectBrowser.hidden=false;
      requestAnimationFrame(()=>subjectBrowser.scrollIntoView({behavior:"auto",block:"start"}));
      sessionStorage.removeItem("bca-sync-return-subject");
      sessionStorage.removeItem("bca-sync-return-semester");
      history.replaceState(null,"",window.location.pathname+window.location.hash);
    }
  }
  try{
    const {data:{session}}=await supabase.auth.getSession();
    applyBcaPremiumTheme(session?.user||null);
    supabase.auth.onAuthStateChange((_event,nextSession)=>applyBcaPremiumTheme(nextSession?.user||null));
  }catch(error){
    applyBcaPremiumTheme(null);
    console.warn("Could not restore auth session; subject navigation was restored independently.",error);
  }
})();
const oldThemeButton=document.getElementById("oldThemeButton");
oldThemeButton?.addEventListener("click",()=>{
  sessionStorage.removeItem("bca-sync-experience");
  sessionStorage.removeItem("bca-sync-premium-transition");
  localStorage.removeItem("bca-sync-experience");
  (window.bcaPremiumTransitionTimers||[]).forEach(timer=>window.clearTimeout(timer));
  window.bcaPremiumTransitionTimers=[];
  document.body.classList.remove("premium-mode","premium-transitioning");
  oldThemeButton.blur();
  updateSidebarThemeLabel();
});
document.querySelector(".sidebar-premium")?.addEventListener("click",(event)=>{
  if(!document.body.classList.contains("premium-mode")) return;
  event.preventDefault();
  oldThemeButton?.click();
});
const menuToggle = document.getElementById("menuToggle");

// If the browser restores this page from its back-forward cache, reload it cleanly.
window.addEventListener("pageshow", event => {
  if (event.persisted) window.location.reload();
});
const navLinks = document.getElementById("navLinks");

function setActiveSidebarLink(activeLink){
  navLinks?.querySelectorAll(".sidebar-link").forEach(link=>{
    const active=link===activeLink;
    link.classList.toggle("active",active);
    if(active) link.setAttribute("aria-current","page");
    else link.removeAttribute("aria-current");
  });
}

function syncSidebarActiveLink(){
  if(!navLinks) return;
  const hash=window.location.hash;
  const pathname=window.location.pathname.split("/").pop()||"index.html";
  let target=null;
  if(hash){
    target=Array.from(navLinks.querySelectorAll(".sidebar-link")).find(link=>{
      const href=link.getAttribute("href")||"";
      return href.startsWith("#")&&href===hash;
    });
  }
  if(!target&&pathname==="index.html") target=navLinks.querySelector('.sidebar-link[href="#"]');
  if(target) setActiveSidebarLink(target);
}

navLinks?.querySelectorAll(".sidebar-link").forEach(link=>{
  link.addEventListener("click",()=>{
    setActiveSidebarLink(link);
    navLinks.classList.remove("open");
    menuToggle?.setAttribute("aria-expanded","false");
  });
});
window.addEventListener("hashchange",syncSidebarActiveLink);
syncSidebarActiveLink();

const year = document.getElementById("year");
if (year) year.textContent = new Date().getFullYear();

const semesterSubjects = {
  1: [
    "Fundamentals of Computers and Computational Thinking",
    "Introduction to Computers and Office Automation",
    "Mathematical Foundation for Computer Applications",
    "Discrete Structures for Computer Applications"
  ]
};
const subjectBrowser = document.getElementById("subjectBrowser");
const semesterGrid = document.getElementById("semesterGrid");
let currentSemester = 1;
let currentSubject = "";

function titleFromSlug(slug) { return (slug || "General").replace(/[-_]/g, " ").replace(/\b\w/g, letter => letter.toUpperCase()); }
function subjectSlug(name) {
  return name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
function showSemester(number) {
  currentSemester = number;
  const subjects = semesterSubjects[number] || [];
  subjectBrowser.hidden = false;
  if (!subjects.length) {
    subjectBrowser.innerHTML = '<div class="browser-heading"><div><div class="eyebrow">SEMESTER '+number+'</div><h3>Subjects are being added</h3></div><button class="browser-close" type="button">Close ×</button></div><p class="browser-empty">The subject list for this semester is not available yet. It will appear here once confirmed.</p>';
  } else {
    subjectBrowser.innerHTML = '<div class="browser-heading"><div><div class="eyebrow">SEMESTER '+number+'</div><h3>Choose your subject</h3></div><button class="browser-close" type="button">Close ×</button></div><div class="subject-list">'+subjects.map((name,index)=>'<button type="button" class="subject-item" data-subject-index="'+index+'"><span class="subject-number">'+String(index+1).padStart(2,"0")+'</span><strong>'+name+'</strong><span class="subject-arrow">↗</span></button>').join("")+'</div>';
  }
  subjectBrowser.scrollIntoView({behavior:"smooth",block:"start"});
}
function showCategories(name) {
  subjectBrowser.hidden = false;
  currentSubject = name;
  const quizCard = '<button type="button" class="material-type" data-material="mcq"><span>✓</span><h4>MCQ Quiz</h4><p>Take a 10-question random quiz from 30 important questions.</p><small>Start quiz ↗</small></button>';
  const questionDnaCard = document.body.classList.contains("premium-mode") ? '<button type="button" class="material-type question-dna-card" data-material="question-dna"><span>🧬</span><h4>Question DNA</h4><p>Find recurring terms and patterns in previous year papers.</p><small>Open Secret Study Lab ↗</small></button>' : '';
  subjectBrowser.innerHTML = '<div class="browser-heading"><div><div class="eyebrow">SEMESTER '+currentSemester+' · SUBJECT</div><h3>'+name+'</h3></div><button class="browser-close" data-back="subjects" type="button">← Subjects</button></div><div class="material-grid"><button type="button" class="material-type" data-material="notes"><span>▤</span><h4>Notes</h4><p>Module-wise study notes (Modules 1–4).</p><small>Choose module ↗</small></button><button type="button" class="material-type" data-material="important-questions"><span>✦</span><h4>Important Questions</h4><p>Key questions for revision and exam preparation.</p><small>Open category ↗</small></button><button type="button" class="material-type" data-material="previous-year-questions"><span>▧</span><h4>Previous Year Questions</h4><p>Previous examination question papers.</p><small>Open category ↗</small></button>'+quizCard+questionDnaCard+'</div>'+progressTrackerMarkup(name);
  loadSubjectProgress(name);
  subjectBrowser.scrollIntoView({behavior:"smooth",block:"start"});
}
function showNotesModules() {
  const heading = '<div class="browser-heading"><div><div class="eyebrow">SEMESTER '+currentSemester+' · NOTES</div><h3>'+currentSubject+'</h3></div><button class="browser-close" data-back="subject" type="button">← Back to subject</button></div>';
  const modules = '<div class="subject-list">'+Array.from({length:4}, (_, i) => i + 1).map(number => '<button type="button" class="subject-item" data-module="'+number+'"><span class="subject-number">'+String(number).padStart(2,"0")+'</span><strong>Module '+number+'</strong><span class="subject-arrow">↗</span></button>').join('')+'</div>';
  subjectBrowser.innerHTML = heading + modules;
  subjectBrowser.scrollIntoView({behavior:"smooth",block:"start"});
}
async function showMaterials(category, moduleNumber = 0) {
  if (category === "mcq") { startMcqQuiz(); return; }
  const labels = {"notes":"Notes","important-questions":"Important Questions","previous-year-questions":"Previous Year Questions","mcq":"MCQ"};
  const backTarget = category === "notes" && moduleNumber ? "modules" : "subject";
  const backLabel = backTarget === "modules" ? "← Back to modules" : "← Back to subject";
  subjectBrowser.innerHTML = '<div class="browser-heading"><div><div class="eyebrow">SEMESTER '+currentSemester+' · '+labels[category].toUpperCase()+'</div><h3>'+labels[category]+'</h3></div><button class="browser-close" data-back="'+backTarget+'" type="button">'+backLabel+'</button></div><p class="browser-empty">Loading materials…</p>';
  const baseFolder = 'resources/semester-'+currentSemester+'/'+category+'/'+subjectSlug(currentSubject);
  const folder = category === "notes" && moduleNumber ? baseFolder + "/module-" + moduleNumber : baseFolder;
  const apiUrl = 'https://api.github.com/repos/mrjojo07/BCA-HUB/contents/'+folder;
  try {
    const [githubResponse, storageResult] = await Promise.all([
      fetch(apiUrl, {headers:{Accept:'application/vnd.github+json'}}),
      supabase.storage.from("bca-hub-materials").list(folder, {limit:100, sortBy:{column:"name",order:"asc"}})
    ]);
    const githubFiles = githubResponse.ok ? (await githubResponse.json()).filter(file => file.type === 'file').map(file => ({name:file.name,url:file.download_url || file.html_url,preview:file.download_url})) : [];
    if (storageResult.error) throw storageResult.error;
    const storageFiles = (storageResult.data || []).filter(file => file.id && file.name)
      .sort((a,b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0))
      .map(file => { const publicUrl = 'https://efbkhmfekfujbwfdpfhk.supabase.co/storage/v1/object/public/bca-hub-materials/'+folder+'/'+encodeURIComponent(file.name); const cacheVersion = encodeURIComponent(file.updated_at || file.created_at || Date.now()); return {name:file.name.replace(/^[0-9a-f-]{36}-/i,''),url:publicUrl+'?v='+cacheVersion,preview:publicUrl+'?v='+cacheVersion}; });
    // Show one entry per filename, preferring the newest direct upload.
    const uniqueFiles = new Map();
    for (const file of storageFiles) {
      const key = file.name.trim().toLowerCase();
      if (!uniqueFiles.has(key)) uniqueFiles.set(key, file);
    }
    for (const file of githubFiles) {
      const key = file.name.trim().toLowerCase();
      if (!uniqueFiles.has(key)) uniqueFiles.set(key, file);
    }
    const files = [...uniqueFiles.values()];
    const { data: { user: signedInUser } } = await supabase.auth.getUser();
    const appMeta = signedInUser?.app_metadata || {};
    let canReadPremium = appMeta.premium === true || appMeta.premium_access === true;
    if (!canReadPremium && (appMeta.role === "admin" || appMeta.admin === true)) {
      const { data: assurance } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      canReadPremium = assurance?.currentLevel === "aal2";
    }
    if (canReadPremium) {
      const { data: premiumRows, error: premiumError } = await supabase
        .from("premium_materials")
        .select("id,title,storage_path,created_at")
        .eq("semester", Number(currentSemester))
        .eq("subject_slug", subjectSlug(currentSubject))
        .eq("category", category)
        .eq("is_published", true)
        .order("created_at", { ascending: false });
      if (premiumError) throw premiumError;
      for (const item of (premiumRows || [])) {
        const { data: signedFile, error: signedError } = await supabase.storage
          .from("bca-premium-materials")
          .createSignedUrl(item.storage_path, 600);
        if (signedError) throw signedError;
        files.push({
          name: item.title || item.storage_path.split("/").pop(),
          url: signedFile.signedUrl,
          preview: signedFile.signedUrl,
          premium: true
        });
      }
    }
    const heading = '<div class="browser-heading"><div><div class="eyebrow">SEMESTER '+currentSemester+' · '+labels[category].toUpperCase()+'</div><h3>'+labels[category]+'</h3></div><button class="browser-close" data-back="'+backTarget+'" type="button">'+backLabel+'</button></div>';
    if (!files.length) {
      subjectBrowser.innerHTML = heading+'<p class="browser-empty">No files have been uploaded here yet.</p>';
      return;
    }
    const list = document.createElement('div');
    list.className = 'subject-list';
    files.forEach(file => {
      const row = document.createElement('div');
      row.className = 'subject-item' + (file.premium ? ' premium-resource-item' : '');
      const title = document.createElement('strong');
      title.textContent = file.name;
      if (file.premium) {
        const premiumTag = document.createElement('span');
        premiumTag.textContent = 'PREMIUM';
        premiumTag.style.cssText = 'margin-left:8px;padding:3px 7px;border-radius:20px;background:#e8c76b;color:#172033;font-size:10px;font-weight:800;letter-spacing:.04em';
        title.appendChild(premiumTag);
      }
      const link = document.createElement('a');
      link.href = file.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.className = 'subject-arrow';
      link.textContent = 'Open ↗';
      const save = document.createElement('button');
      save.type = 'button';
      save.className = 'resource-save' + (isResourceSaved(link.href) ? ' is-saved' : '');
      save.textContent = isResourceSaved(link.href) ? '★ Saved' : '☆ Save';
      save.setAttribute('aria-pressed', String(isResourceSaved(link.href)));
      save.addEventListener('click', () => toggleSavedResource({
        name: file.name, url: link.href, subject: currentSubject,
        category: labels[category], semester: currentSemester
      }, save));
      if (file.premium) row.append(title, link); else row.append(title, link, save);
      list.appendChild(row);
      if (/\.(png|jpe?g|webp|gif)$/i.test(file.name)) {
        const preview = document.createElement('img');
        preview.src = file.preview;
        preview.alt = file.name;
        preview.loading = 'lazy';
        preview.style.cssText = 'display:block;max-width:100%;height:auto;border-radius:12px;margin:10px 0 18px';
        list.appendChild(preview);
      }
    });
    subjectBrowser.innerHTML = heading;
    subjectBrowser.appendChild(list);
  } catch (error) {
    const heading = subjectBrowser.querySelector('.browser-heading')?.outerHTML || '';
    subjectBrowser.innerHTML = heading+'<p class="browser-empty">'+error.message+'</p>';
  }
  subjectBrowser.scrollIntoView({behavior:"smooth",block:"start"});
}

let quizBank = [];
let quizSet = [];
let quizIndex = 0;
let quizScore = 0;
let quizAnswered = false;
async function startMcqQuiz() {
  subjectBrowser.innerHTML = '<div class="browser-heading"><div><div class="eyebrow">SEMESTER '+currentSemester+' · MCQ QUIZ</div><h3>Loading quiz…</h3></div><button class="browser-close" data-back="subject" type="button">← Back to subject</button></div>';
  try {
    if (!quizBank.length) {
      const response = await fetch('mcq-questions.json?v=1');
      if (!response.ok) throw new Error('Could not load the MCQ question bank.');
      quizBank = await response.json();
    }
    quizSet = [...(quizBank[currentSubject] || [])].sort(() => Math.random() - 0.5).slice(0, 10);
    if (quizSet.length < 10) throw new Error('This subject quiz is being prepared. Please check again later.');
    quizIndex = 0; quizScore = 0; quizAnswered = false;
    renderMcqQuestion();
  } catch (error) {
    subjectBrowser.innerHTML = '<div class="browser-heading"><div><div class="eyebrow">MCQ QUIZ</div><h3>Quiz unavailable</h3></div><button class="browser-close" data-back="subject" type="button">← Back to subject</button></div><p class="browser-empty">'+error.message+'</p>';
  }
}
function renderMcqQuestion() {
  const item = quizSet[quizIndex];
  subjectBrowser.replaceChildren();
  const heading = document.createElement('div');
  heading.className = 'browser-heading';
  const intro = document.createElement('div');
  intro.innerHTML = '<div class="eyebrow">SEMESTER '+currentSemester+' · MCQ QUIZ</div><h3>'+currentSubject+'</h3>';
  const back = document.createElement('button');
  back.className = 'browser-close'; back.type = 'button'; back.dataset.back = 'subject'; back.textContent = '← Back to subject';
  heading.append(intro, back);
  const panel = document.createElement('section'); panel.className = 'quiz-panel';
  const progress = document.createElement('p'); progress.className = 'quiz-progress'; progress.textContent = 'QUESTION '+(quizIndex+1)+' OF 10';
  const bar = document.createElement('div'); bar.className = 'quiz-progress-track';
  const fill = document.createElement('span'); fill.style.width = ((quizIndex+1)*10)+'%'; bar.append(fill);
  const question = document.createElement('h3'); question.className = 'quiz-question'; question.textContent = item[0];
  const options = document.createElement('div'); options.className = 'quiz-options';
  const feedback = document.createElement('p'); feedback.className = 'quiz-feedback'; feedback.setAttribute('aria-live','polite');
  item[1].forEach((option,index)=>{
    const button=document.createElement('button'); button.type='button'; button.className='quiz-option'; button.textContent=String.fromCharCode(65+index)+'. '+option;
    button.addEventListener('click',()=>{
      if(quizAnswered)return;
      quizAnswered=true;
      const correct=index===item[2];
      if(correct)quizScore++;
      [...options.children].forEach((el,i)=>{el.disabled=true;if(i===item[2])el.classList.add('correct');else if(i===index)el.classList.add('incorrect');});
      feedback.textContent=correct?'Correct answer!':'Not quite. Correct answer: '+item[1][item[2]];
      feedback.classList.toggle('is-correct',correct);
      next.disabled=false;
    });
    options.append(button);
  });
  const next=document.createElement('button'); next.type='button'; next.className='quiz-next'; next.textContent=quizIndex===9?'View result':'Next question'; next.disabled=true;
  next.addEventListener('click',()=>{
    if(quizIndex<9){quizIndex++;quizAnswered=false;renderMcqQuestion();}
    else renderMcqResult();
  });
  panel.append(progress,bar,question,options,feedback,next);
  subjectBrowser.append(heading,panel);
}
function renderMcqResult() {
  subjectBrowser.innerHTML='';
  const heading=document.createElement('div');heading.className='browser-heading';
  heading.innerHTML='<div><div class="eyebrow">QUIZ COMPLETED</div><h3>'+currentSubject+'</h3></div>';
  const back=document.createElement('button');back.className='browser-close';back.type='button';back.dataset.back='subject';back.textContent='← Back to subject';
  heading.append(back);
  const panel=document.createElement('section');panel.className='quiz-panel quiz-result';
  const score=document.createElement('div');score.className='quiz-score';score.textContent=quizScore+'/10';
  const message=document.createElement('h3');message.textContent=quizScore>=8?'Excellent work!':quizScore>=5?'Good effort!':'Keep practising!';
  const detail=document.createElement('p');detail.textContent='You answered '+quizScore+' out of 10 questions correctly.';
  const again=document.createElement('button');again.className='quiz-next';again.type='button';again.textContent='Try another random set';again.addEventListener('click',startMcqQuiz);
  panel.append(score,message,detail,again);subjectBrowser.append(heading,panel);
  supabase.auth.getUser().then(async ({data:{user}}) => {
    if (!user) return;
    const {error} = await supabase.from("quiz_attempts").insert({
      user_id:user.id, semester:currentSemester, subject_slug:subjectSlug(currentSubject),
      score:quizScore, total_questions:10
    });
    if (error) { console.warn("Quiz result was not saved:", error.message); return; }
    const slug = subjectSlug(currentSubject);
    const existing = await supabase.from("learning_progress").select("id")
      .eq("user_id",user.id).eq("semester",currentSemester)
      .eq("subject_slug",slug).eq("category","mcq-quiz").maybeSingle();
    if (existing.data) {
      await supabase.from("learning_progress").update({completed:true,updated_at:new Date().toISOString()}).eq("id",existing.data.id);
    } else if (!existing.error) {
      await supabase.from("learning_progress").insert({user_id:user.id,semester:currentSemester,subject_slug:slug,category:"mcq-quiz",completed:true});
    }
  });
  const slug = subjectSlug(currentSubject);
  const cache = progressCache[slug] || {};
  if (!cache.quiz) {
    const checkbox = subjectBrowser.querySelector("[data-progress-task=quiz]");
    if (checkbox) { checkbox.checked = true; checkbox.dispatchEvent(new Event("change", {bubbles:true})); }
  }
}

semesterGrid?.addEventListener("click", (event) => {
  const card = event.target.closest("[data-semester]");
  if (card) showSemester(Number(card.dataset.semester));
});


const savedResourcesKey = "BCA SYNC-saved-resources";
function readSavedResources() {
  try {
    const value = JSON.parse(localStorage.getItem(savedResourcesKey) || "[]");
    return Array.isArray(value) ? value : [];
  } catch (_) { return []; }
}
function writeSavedResources(items) {
  localStorage.setItem(savedResourcesKey, JSON.stringify(items));
  renderSavedResources();
}
function isResourceSaved(url) {
  return readSavedResources().some(item => item.url === url);
}
function renderSavedResources() {
  const section = document.getElementById("savedResourcesSection");
  const list = document.getElementById("savedResourcesList");
  if (!section || !list) return;
  const items = readSavedResources();
  list.replaceChildren();
  if (!items.length) {
    const empty = document.createElement("p");
    empty.className = "saved-empty";
    empty.textContent = "You have not saved any resources yet. Open a subject and tap ☆ Save on a file.";
    list.append(empty);
  }
  items.forEach((item, index) => {
    const row = document.createElement("article");
    row.className = "saved-resource-item";
    const info = document.createElement("div");
    info.className = "saved-resource-info";
    const title = document.createElement("strong");
    title.textContent = item.name;
    const meta = document.createElement("small");
    meta.textContent = item.subject + " · " + item.category;
    info.append(title, meta);
    const actions = document.createElement("div");
    actions.className = "saved-resource-actions";
    const open = document.createElement("a");
    open.href = item.url; open.target = "_blank"; open.rel = "noopener noreferrer";
    open.className = "saved-open"; open.textContent = "Open ↗";
    const remove = document.createElement("button");
    remove.type = "button"; remove.className = "saved-remove";
    remove.dataset.removeSaved = String(index); remove.textContent = "Remove";
    actions.append(open, remove);
    row.append(info, actions);
    list.append(row);
  });
}
async function toggleSavedResource(item, button) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { alert("Please log in to save resources to your dashboard."); return; }
  const existing = await supabase.from("saved_resources").select("id")
    .eq("user_id", user.id).eq("resource_path", item.url).maybeSingle();
  if (existing.error) { alert("Could not check saved resources. Please try again."); return; }
  let result;
  if (existing.data) {
    result = await supabase.from("saved_resources").delete().eq("id", existing.data.id);
  } else {
    result = await supabase.from("saved_resources").insert({
      user_id:user.id, resource_path:item.url, resource_title:item.name,
      semester:item.semester, subject_slug:subjectSlug(item.subject), category:item.category.toLowerCase().replace(/\s+/g,"-")
    });
  }
  if (result.error) {
    // A quick double tap or another open tab can race the initial lookup.
    // A duplicate-save conflict means the resource is already saved; refresh the list.
    if (result.error.code === "23505" || result.error.code === "409") {
      const latest = await supabase.from("saved_resources")
        .select("resource_path,resource_title,semester,subject_slug,category,created_at")
        .eq("user_id",user.id).order("created_at",{ascending:false});
      if (!latest.error) {
        writeSavedResources((latest.data || []).map(row => ({
          name:row.resource_title, url:row.resource_path, subject:titleFromSlug(row.subject_slug),
          category:titleFromSlug(row.category), semester:row.semester
        })));
        if (button) {
          button.textContent = "★ Saved";
          button.classList.add("is-saved");
          button.setAttribute("aria-pressed", "true");
        }
        return;
      }
    }
    alert("Could not update saved resources. Please try again.");
    console.error(result.error.message);
    return;
  }
  const rows = await supabase.from("saved_resources").select("resource_path,resource_title,semester,subject_slug,category,created_at")
    .eq("user_id",user.id).order("created_at",{ascending:false});
  if (!rows.error) {
    writeSavedResources((rows.data || []).map(row => ({
      name:row.resource_title, url:row.resource_path, subject:titleFromSlug(row.subject_slug),
      category:titleFromSlug(row.category), semester:row.semester
    })));
  }
  if (button) {
    const saved = !existing.data;
    button.textContent = saved ? "★ Saved" : "☆ Save";
    button.classList.toggle("is-saved", saved);
    button.setAttribute("aria-pressed", String(saved));
  }
}

const progressTasks = [
  ["notes", "Study notes completed", "notes"],
  ["important", "Important questions completed", "important-questions"],
  ["quiz", "MCQ quiz completed", "mcq-quiz"]
];
let progressCache = {};
async function loadSubjectProgress(subject) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { data, error } = await supabase.from("learning_progress")
    .select("category,completed").eq("user_id", user.id)
    .eq("semester", currentSemester).eq("subject_slug", subjectSlug(subject));
  if (error) { console.warn("Could not load learning progress:", error.message); return; }
  progressCache[subjectSlug(subject)] = Object.fromEntries(
    progressTasks.map(([key,,category]) => [key, !!data.find(row => row.category === category)?.completed])
  );
  const tracker = subjectBrowser.querySelector(".learning-progress");
  if (tracker && currentSubject === subject) tracker.outerHTML = progressTrackerMarkup(subject);
}
function progressTrackerMarkup(subject) {
  const saved = progressCache[subjectSlug(subject)] || {};
  const done = progressTasks.filter(([key]) => saved[key]).length;
  const percent = Math.round(done / progressTasks.length * 100);
  return '<section class="learning-progress"><div class="progress-heading"><div><div class="eyebrow">YOUR LEARNING JOURNEY</div><h4>Subject progress</h4></div><strong class="progress-percent">'+percent+'%</strong></div><div class="learning-progress-track"><span style="width:'+percent+'%"></span></div><div class="progress-checklist">'+progressTasks.map(([key,label])=>'<label><input type="checkbox" data-progress-task="'+key+'" '+(saved[key]?'checked':'')+'><span>'+label+'</span></label>').join('')+'</div><p>Progress is saved to your student account.</p></section>';
}
subjectBrowser?.addEventListener("change", async (event) => {
  const checkbox = event.target.closest("[data-progress-task]");
  if (!checkbox || !currentSubject) return;
  const task = progressTasks.find(([key]) => key === checkbox.dataset.progressTask);
  if (!task) return;
  const [key,,category] = task;
  const subject = currentSubject;
  const slug = subjectSlug(subject);
  const previous = !!(progressCache[slug] || {})[key];
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    checkbox.checked = previous;
    alert("Please log in to save your learning progress.");
    return;
  }
  const lookup = await supabase.from("learning_progress").select("id")
    .eq("user_id", user.id).eq("semester", currentSemester)
    .eq("subject_slug", slug).eq("category", category).maybeSingle();
  let result;
  if (lookup.error) result = lookup;
  else if (lookup.data) result = await supabase.from("learning_progress")
    .update({completed: checkbox.checked, updated_at: new Date().toISOString()}).eq("id", lookup.data.id);
  else result = await supabase.from("learning_progress").insert({
    user_id: user.id, semester: currentSemester, subject_slug: slug,
    category, completed: checkbox.checked
  });
  if (result.error) {
    checkbox.checked = previous;
    alert("Could not save progress. Please try again.");
    console.error("Progress save error:", result.error.message);
    return;
  }
  progressCache[slug] = {...(progressCache[slug] || {}), [key]: checkbox.checked};
  const tracker = subjectBrowser.querySelector(".learning-progress");
  if (tracker) tracker.outerHTML = progressTrackerMarkup(subject);
});


document.getElementById("savedResourcesList")?.addEventListener("click", async event => {
  const button = event.target.closest("[data-remove-saved]");
  if (!button) return;
  const items = readSavedResources();
  const item = items[Number(button.dataset.removeSaved)];
  if (!item) return;
  const {data:{user}} = await supabase.auth.getUser();
  if (!user) return;
  const {data:row} = await supabase.from("saved_resources").select("id")
    .eq("user_id",user.id).eq("resource_path",item.url).maybeSingle();
  if (!row) return;
  const {error} = await supabase.from("saved_resources").delete().eq("id",row.id);
  if (error) { alert("Could not remove this saved resource."); return; }
  items.splice(Number(button.dataset.removeSaved),1);
  writeSavedResources(items);
});
async function syncSavedResourcesFromAccount() {
  const {data:{user}} = await supabase.auth.getUser();
  if (!user) return renderSavedResources();
  const {data,error} = await supabase.from("saved_resources")
    .select("resource_path,resource_title,semester,subject_slug,category,created_at")
    .eq("user_id",user.id).order("created_at",{ascending:false});
  if (error) { console.warn("Saved resources could not be loaded:",error.message); return renderSavedResources(); }
  writeSavedResources((data || []).map(row => ({
    name:row.resource_title, url:row.resource_path, subject:titleFromSlug(row.subject_slug),
    category:titleFromSlug(row.category), semester:row.semester
  })));
}
syncSavedResourcesFromAccount();
const savedPanel = document.getElementById("savedResourcesSection");
function closeSavedResources() {
  if (savedPanel) savedPanel.hidden = true;
  document.getElementById("savedResourcesButton")?.setAttribute("aria-expanded", "false");
}
function toggleSavedResourcesPanel() {
  if (!savedPanel) return;
  savedPanel.hidden = !savedPanel.hidden;
  document.getElementById("savedResourcesButton")?.setAttribute("aria-expanded", String(!savedPanel.hidden));
  if (!savedPanel.hidden) renderSavedResources();
  navLinks?.classList.remove("open");
  menuToggle?.setAttribute("aria-expanded", "false");
}
document.getElementById("savedResourcesButton")?.addEventListener("click", toggleSavedResourcesPanel);
document.getElementById("savedNotesHeroButton")?.addEventListener("click", toggleSavedResourcesPanel);
document.getElementById("closeSavedResources")?.addEventListener("click", closeSavedResources);
document.addEventListener("keydown", event => {
  if (event.key === "Escape") closeSavedResources();
});

subjectBrowser?.addEventListener("click", (event) => {
  const close = event.target.closest(".browser-close");
  if (close) {
    if (close.dataset.back === "subjects") showSemester(currentSemester);
    else if (close.dataset.back === "modules") showNotesModules();
    else if (close.dataset.back === "subject") showCategories(currentSubject);
    else {
      subjectBrowser.hidden = true;
      document.getElementById("semesterGrid")?.scrollIntoView({behavior:"smooth",block:"center"});
    }
    return;
  }
  const item = event.target.closest("[data-subject-index]");
  if (item) {
    const subjects = semesterSubjects[currentSemester] || [];
    const name = subjects[Number(item.dataset.subjectIndex)];
    if (name) showCategories(name);
    return;
  }
  const material = event.target.closest("[data-material]");
  if (material) {
    if (material.dataset.material === "notes") showNotesModules();
    else if (material.dataset.material === "question-dna") {
      const slug=subjectSlug(currentSubject);
      const returnUrl="index.html?returnSemester="+encodeURIComponent(currentSemester)+"&returnSubject="+encodeURIComponent(slug);
      sessionStorage.setItem("bca-sync-return-semester",String(currentSemester));
      sessionStorage.setItem("bca-sync-return-subject",slug);
      history.replaceState({bcaSyncReturn:true},"",returnUrl);
      window.location.href = "question-dna.html?build=20261106-2&semester="+encodeURIComponent(currentSemester)+"&subject="+encodeURIComponent(slug);
    }
    else showMaterials(material.dataset.material);
    return;
  }
  const module = event.target.closest("[data-module]");
  if (module) showMaterials("notes", Number(module.dataset.module));
});






/* Feedback is stored privately in Supabase and shown in the Admin Panel. */
const feedbackForm = document.getElementById("feedbackForm");
feedbackForm?.addEventListener("submit", async event => {
  event.preventDefault();
  const topic = document.getElementById("feedbackTopic").value;
  const rating = document.getElementById("feedbackRating").value;
  const details = document.getElementById("feedbackDetails").value.trim();
  const status = document.getElementById("feedbackStatus");
  const button = feedbackForm.querySelector('button[type="submit"]');
  if (!topic || !rating || !details) { status.textContent = "Please complete all fields before sending."; return; }
  if (details.length > 1500) { status.textContent = "Please keep your feedback under 1,500 characters."; return; }
  button.disabled = true;
  status.textContent = "Sending feedback…";
  try {
    const response = await fetch("https://efbkhmfekfujbwfdpfhk.supabase.co/rest/v1/feedback", {
      method: "POST",
      headers: {
        "apikey": "sb_publishable_N62MLBZ5CQ7016suLKhOmg_wpuQYSbH",
        "Authorization": "Bearer sb_publishable_N62MLBZ5CQ7016suLKhOmg_wpuQYSbH",
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
      },
      body: JSON.stringify({ topic, rating, details })
    });
    if (!response.ok) throw new Error("Feedback could not be sent. Please try again.");
    feedbackForm.reset();
    status.textContent = "Thank you! Your feedback was sent successfully."; 
  } catch (error) { status.textContent = error.message || "Could not send feedback. Please try again."; }
  finally { button.disabled = false; }
});


// Open image resources in an in-page viewer with a clear close control.
const imageViewer = document.createElement("div");
imageViewer.className = "image-viewer";
imageViewer.hidden = true;
imageViewer.innerHTML = '<div class="image-viewer-toolbar"><span class="image-viewer-title">Image preview</span><button type="button" class="image-viewer-close" aria-label="Close image preview">✕ Close</button></div><div class="image-viewer-content"><img alt="Image preview"></div>';
document.body.appendChild(imageViewer);
const imageViewerImage = imageViewer.querySelector("img");
function closeImageViewer() {
  imageViewer.hidden = true;
  imageViewerImage.removeAttribute("src");
  document.body.classList.remove("image-viewer-open");
}
subjectBrowser?.addEventListener("click", event => {
  const imageLink = event.target.closest('a.subject-arrow[href]');
  if (!imageLink || !/\\.(png|jpe?g|webp|gif)(?:[?#].*)?$/i.test(imageLink.href)) return;
  event.preventDefault();
  imageViewerImage.src = imageLink.href;
  imageViewerImage.alt = imageLink.closest(".subject-item")?.querySelector("strong")?.textContent || "Image preview";
  imageViewer.hidden = false;
  document.body.classList.add("image-viewer-open");
});
imageViewer.querySelector(".image-viewer-close")?.addEventListener("click", closeImageViewer);
imageViewer.addEventListener("click", event => {
  if (event.target === imageViewer) closeImageViewer();
});
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && !imageViewer.hidden) closeImageViewer();
});


// BCA SYNC notification inbox: broadcast updates are stored in Supabase.
const notificationBell = document.getElementById("notificationBell");
const notificationPanel = document.getElementById("notificationPanel");
const notificationList = document.getElementById("notificationList");
const notificationCount = document.getElementById("notificationCount");
const notificationSummary = document.getElementById("notificationSummary");
const markAllNotificationsRead = document.getElementById("markAllNotificationsRead");
let notificationUserId = null;
let notificationItems = [];
let notificationReadIds = new Set();
let notificationChannel = null;

function notificationIcon(category) {
  return ({notes:"▤","previous-year-questions":"▧","important-questions":"✦",timetable:"▣",announcement:"!",general:"●"})[category] || "●";
}
function formatNotificationDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString([], {day:"numeric",month:"short",hour:"numeric",minute:"2-digit"});
}
function renderNotifications() {
  if (!notificationList) return;
  notificationList.replaceChildren();
  const unread = notificationItems.filter(item => !notificationReadIds.has(item.id)).length;
  if (notificationCount) {
    notificationCount.hidden = unread === 0;
    notificationCount.textContent = unread > 99 ? "99+" : String(unread);
  }
  if (notificationSummary) notificationSummary.textContent = unread ? unread + " unread update" + (unread === 1 ? "" : "s") : "You're all caught up";

  if (!notificationItems.length) {
    const empty = document.createElement("p"); empty.className = "notification-empty";
    empty.textContent = notificationUserId ? "No notifications yet. New BCA SYNC updates will appear here." : "Sign in to view your notifications.";
    notificationList.append(empty); return;
  }
  notificationItems.forEach(item => {
    const unreadItem = !notificationReadIds.has(item.id);
    const button = document.createElement("button");
    button.type = "button"; button.className = "notification-item" + (unreadItem ? " is-unread" : "");
    const icon = document.createElement("span"); icon.className = "notification-item-icon"; icon.textContent = notificationIcon(item.category);
    const copy = document.createElement("span"); copy.className = "notification-item-copy";
    const title = document.createElement("strong"); title.textContent = item.title;
    const message = document.createElement("span"); message.textContent = item.message;
    const date = document.createElement("small"); date.textContent = formatNotificationDate(item.created_at);
    copy.append(title,message,date); button.append(icon,copy);
    button.addEventListener("click", async () => {
      if (unreadItem && notificationUserId) {
        const {error} = await supabase.from("bca_notification_reads").upsert(
          {notification_id:item.id,user_id:notificationUserId},
          {onConflict:"notification_id,user_id"}
        );
        if (!error) notificationReadIds.add(item.id);
        renderNotifications();
      }
      if (item.target_url) {
        const target = new URL(item.target_url, window.location.href);
        if (target.protocol === "https:" || target.protocol === "http:") window.location.href = target.href;
      }
      notificationPanel.hidden = true;
      notificationBell?.setAttribute("aria-expanded","false");
    });
    notificationList.append(button);
  });
}
async function loadNotifications() {
  const {data:{session}} = await supabase.auth.getSession();
  notificationUserId = session?.user?.id || null;
  notificationItems = []; notificationReadIds = new Set();
  if (!notificationUserId) { renderNotifications(); return; }
  const [itemsResult,readsResult] = await Promise.all([
    supabase.from("bca_notifications").select("id,title,message,category,target_url,created_at").order("created_at",{ascending:false}).limit(40),
    supabase.from("bca_notification_reads").select("notification_id").eq("user_id",notificationUserId)
  ]);
  if (itemsResult.error) {
    const error = document.createElement("p"); error.className = "notification-empty";
    error.textContent = "Notifications are temporarily unavailable. Please try again later.";
    notificationList?.replaceChildren(error); return;
  }
  notificationItems = itemsResult.data || [];
  notificationReadIds = new Set((readsResult.data || []).map(row => row.notification_id));
  renderNotifications();
}
notificationBell?.addEventListener("click", async () => {
  const opening = notificationPanel.hidden;
  notificationPanel.hidden = !opening;
  notificationBell.setAttribute("aria-expanded",String(opening));
  if (opening) await loadNotifications();
});
notificationChannel = supabase.channel("bca-sync-notification-feed")
  .on("postgres_changes",{event:"INSERT",schema:"public",table:"bca_notifications"},() => loadNotifications())
  .subscribe();
markAllNotificationsRead?.addEventListener("click", async () => {
  if (!notificationUserId) return;
  const unreadIds = notificationItems.filter(item => !notificationReadIds.has(item.id)).map(item => item.id);
  if (!unreadIds.length) return;
  const rows = unreadIds.map(notification_id => ({notification_id,user_id:notificationUserId}));
  const {error} = await supabase.from("bca_notification_reads").upsert(rows,{onConflict:"notification_id,user_id"});
  if (!error) { unreadIds.forEach(id => notificationReadIds.add(id)); renderNotifications(); }
});
document.addEventListener("click", event => {
  if (notificationPanel && !notificationPanel.hidden && !event.target.closest("#notificationWrap")) {
    notificationPanel.hidden = true; notificationBell?.setAttribute("aria-expanded","false");
  }
});
supabase.auth.onAuthStateChange((_event,session) => {
  notificationUserId = session?.user?.id || null;
  window.setTimeout(loadNotifications,0);
});
loadNotifications();


// Logo opens/closes the slide-out navigation; backdrop and Escape close it.
const brandMenuToggle = document.getElementById("brandMenuToggle");
const sidebarBackdrop = document.getElementById("sidebarBackdrop");
function setSidebarOpen(open){
  navLinks?.classList.toggle("open",open);
  brandMenuToggle?.setAttribute("aria-expanded",String(open));
  brandMenuToggle?.setAttribute("aria-label",open?"Close BCA SYNC menu":"Open BCA SYNC menu");
  if(sidebarBackdrop) sidebarBackdrop.hidden=!open;
}
brandMenuToggle?.addEventListener("click",event=>{event.preventDefault();setSidebarOpen(!navLinks?.classList.contains("open"));});
sidebarBackdrop?.addEventListener("click",()=>setSidebarOpen(false));
navLinks?.querySelectorAll("a,button").forEach(item=>item.addEventListener("click",()=>setSidebarOpen(false)));
document.addEventListener("keydown",event=>{if(event.key==="Escape"){setSidebarOpen(false);accountDropdown && (accountDropdown.hidden=true);accountMenuToggle?.setAttribute("aria-expanded","false");}});

// Account dropdown and quick notification access.
const accountMenuToggle=document.getElementById("accountMenuToggle");
const accountDropdown=document.getElementById("accountDropdown");
accountMenuToggle?.addEventListener("click",()=>{
  const opening=accountDropdown?.hidden;
  if(accountDropdown)accountDropdown.hidden=!opening;
  accountMenuToggle.setAttribute("aria-expanded",String(Boolean(opening)));
});
document.addEventListener("click",event=>{
  if(!event.target.closest(".account-menu-wrap")){
    if(accountDropdown)accountDropdown.hidden=true;
    accountMenuToggle?.setAttribute("aria-expanded","false");
  }
});
// Search visible items first, then search published Semester 1 filenames.
const siteSearchForm=document.getElementById("siteSearchForm");
const siteSearchInput=document.getElementById("siteSearchInput");
function normalizeSearchText(value){
  return String(value||"").normalize("NFKD").replace(/[\u0300-\u036f]/g,"")
    .toLocaleLowerCase().replace(/\.pdf$/i,"").replace(/[^a-z0-9]+/g," ").trim().replace(/\s+/g," ");
}
siteSearchForm?.addEventListener("submit",async event=>{
  event.preventDefault();
  const query=normalizeSearchText(siteSearchInput?.value||"");
  if(!query)return;
  const browser=document.getElementById("subjectBrowser");
  const candidates=[...document.querySelectorAll(".semester-card,.subject-item,.material-type,.resource-card,.countdown-card")];
  const ranked=candidates.map(node=>({node,text:normalizeSearchText(node.textContent)})).filter(item=>item.text);
  const match=ranked.find(item=>item.text===query)||ranked.find(item=>item.text.includes(query));
  if(match){
    match.node.scrollIntoView({behavior:"smooth",block:"center"});
    match.node.classList.add("search-match-highlight");
    window.setTimeout(()=>match.node.classList.remove("search-match-highlight"),1800);
    return;
  }
  if(!browser)return;
  browser.hidden=false;
  browser.innerHTML='<p class="browser-empty">Searching published study materials…</p>';
  browser.scrollIntoView({behavior:"smooth",block:"center"});
  const categories=[
    {key:"notes",label:"Notes"},
    {key:"important-questions",label:"Important Questions"},
    {key:"previous-year-questions",label:"Previous Year Questions"}
  ];
  const isPyqQuery=query.includes("previous year")||query.includes("pyq")||query.includes("question paper");
  const searchCategories=isPyqQuery?categories.filter(item=>item.key==="previous-year-questions"):categories;
  const results=[];
  try{
    for(const subject of (semesterSubjects[1]||[])){
      const slug=subjectSlug(subject);
      for(const category of searchCategories){
        const folder="resources/semester-1/"+category.key+"/"+slug;
        const [storageResult,githubResponse]=await Promise.all([
          supabase.storage.from("bca-hub-materials").list(folder,{limit:100,sortBy:{column:"name",order:"asc"}}),
          fetch("https://api.github.com/repos/mrjojo07/BCA-HUB/contents/"+folder,{headers:{Accept:"application/vnd.github+json"}})
        ]);
        if(storageResult.error)throw storageResult.error;
        const files=(storageResult.data||[]).filter(file=>file.id&&file.name).map(file=>({
          name:file.name.replace(/^[0-9a-f-]{36}-/i,""),
          url:"https://efbkhmfekfujbwfdpfhk.supabase.co/storage/v1/object/public/bca-hub-materials/"+folder+"/"+encodeURIComponent(file.name),
          category:category.label,subject
        }));
        if(githubResponse.ok){
          const remote=await githubResponse.json();
          remote.filter(file=>file.type==="file").forEach(file=>files.push({
            name:file.name,url:file.download_url||file.html_url,category:category.label,subject
          }));
        }
        files.forEach(file=>{
          if((isPyqQuery||normalizeSearchText(file.name).includes(query))&&!results.some(item=>item.url===file.url))results.push(file);
        });
      }
    }
    browser.replaceChildren();
    const heading=document.createElement("div");heading.className="browser-heading";
    const title=document.createElement("div");title.innerHTML='<div class="eyebrow">SEARCH RESULTS</div><h3>Study materials</h3>';
    const close=document.createElement("button");close.type="button";close.className="browser-close";close.textContent="Close";
    close.addEventListener("click",()=>{browser.hidden=true;});
    heading.append(title,close);browser.append(heading);
    if(!results.length){
      const empty=document.createElement("p");empty.className="browser-empty";
      empty.textContent="No matching published files found in the available Semester 1 folders.";
      browser.append(empty);
    }else{
      const list=document.createElement("div");list.className="subject-list";
      results.forEach(file=>{
        const row=document.createElement("div");row.className="subject-item";
        const name=document.createElement("strong");name.textContent=file.name;
        const detail=document.createElement("small");detail.textContent=file.subject+" · "+file.category;
        const link=document.createElement("a");link.className="subject-arrow";link.href=file.url;link.target="_blank";link.rel="noopener noreferrer";link.textContent="Open ↗";
        row.append(name,detail,link);list.append(row);
      });
      browser.append(list);
    }
  }catch(error){
    browser.innerHTML='<p class="browser-empty">Search could not load materials. Please try again.</p>';
    console.error("BCA SYNC search error:",error);
  }
});
