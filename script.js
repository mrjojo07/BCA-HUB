const menuToggle = document.getElementById("menuToggle");
const navLinks = document.getElementById("navLinks");

menuToggle?.addEventListener("click", () => {
  const isOpen = navLinks.classList.toggle("open");
  menuToggle.setAttribute("aria-expanded", String(isOpen));
  menuToggle.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
});

navLinks?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    navLinks.classList.remove("open");
    menuToggle?.setAttribute("aria-expanded", "false");
  });
});

const year = document.getElementById("year");
if (year) year.textContent = new Date().getFullYear();

const semesterSubjects = {
  1: [
    "Fundamentals of Computers and Computational Thinking",
    "Introduction to Computers and Office Automation",
    "Mathematical Foundation for Computer Applications",
    "Discrete Structures for Computer Applications",
    "Creativity, Innovation and Business Development"
  ]
};
const subjectBrowser = document.getElementById("subjectBrowser");
const semesterGrid = document.getElementById("semesterGrid");

function showSemester(number) {
  const subjects = semesterSubjects[number] || [];
  subjectBrowser.hidden = false;
  if (!subjects.length) {
    subjectBrowser.innerHTML = '<div class="browser-heading"><div><div class="eyebrow">SEMESTER '+number+'</div><h3>Subjects are being added</h3></div><button class="browser-close" type="button">Close ×</button></div><p class="browser-empty">The subject list for this semester is not available yet. It will appear here once confirmed.</p>';
  } else {
    subjectBrowser.innerHTML = '<div class="browser-heading"><div><div class="eyebrow">SEMESTER '+number+'</div><h3>Choose your subject</h3></div><button class="browser-close" type="button">Close ×</button></div><div class="subject-list">'+subjects.map((name,index)=>'<button type="button" class="subject-item" data-subject-index="'+index+'"><span class="subject-number">'+String(index+1).padStart(2,"0")+'</span><strong>'+name+'</strong><span class="subject-arrow">↗</span></button>').join("")+'</div>';
  }
  subjectBrowser.scrollIntoView({behavior:"smooth",block:"start"});
}
semesterGrid?.addEventListener("click",(event)=>{
  const card=event.target.closest("[data-semester]");
  if(card) showSemester(Number(card.dataset.semester));
});
subjectBrowser?.addEventListener("click",(event)=>{
  if(event.target.closest(".browser-close")) { subjectBrowser.hidden=true; return; }
  const item=event.target.closest("[data-subject-index]");
  if(!item) return;
  const name=semesterSubjects[1][Number(item.dataset.subjectIndex)];
  subjectBrowser.innerHTML='<div class="browser-heading"><div><div class="eyebrow">SEMESTER 1 · SUBJECT</div><h3>'+name+'</h3></div><button class="browser-close" type="button">← Back</button></div><div class="material-grid"><article class="material-type"><span>▤</span><h4>Notes</h4><p>Study notes for this subject will appear here.</p><small>Coming soon</small></article><article class="material-type"><span>✦</span><h4>Important Questions</h4><p>Important exam questions will appear here.</p><small>Coming soon</small></article><article class="material-type"><span>▧</span><h4>Previous Year Questions</h4><p>Previous year question papers will appear here.</p><small>Coming soon</small></article></div>';
});
