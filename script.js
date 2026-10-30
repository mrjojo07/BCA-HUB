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
let currentSemester = 1;
let currentSubject = "";

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
  currentSubject = name;
  subjectBrowser.innerHTML = '<div class="browser-heading"><div><div class="eyebrow">SEMESTER '+currentSemester+' · SUBJECT</div><h3>'+name+'</h3></div><button class="browser-close" data-back="subjects" type="button">← Subjects</button></div><div class="material-grid"><button type="button" class="material-type" data-material="notes"><span>▤</span><h4>Notes</h4><p>Study notes and topic-wise learning materials.</p><small>Open category ↗</small></button><button type="button" class="material-type" data-material="important-questions"><span>✦</span><h4>Important Questions</h4><p>Key questions for revision and exam preparation.</p><small>Open category ↗</small></button><button type="button" class="material-type" data-material="previous-year-questions"><span>▧</span><h4>Previous Year Questions</h4><p>Previous examination question papers.</p><small>Open category ↗</small></button><button type="button" class="material-type" data-material="exam-preparation"><span>◎</span><h4>Exam Preparation</h4><p>Revision materials, model questions and exam guidance.</p><small>Open category ↗</small></button></div>';
  subjectBrowser.scrollIntoView({behavior:"smooth",block:"start"});
}
async function showMaterials(category) {
  const labels = {"notes":"Notes","important-questions":"Important Questions","previous-year-questions":"Previous Year Questions","exam-preparation":"Exam Preparation"};
  subjectBrowser.innerHTML = '<div class="browser-heading"><div><div class="eyebrow">SEMESTER '+currentSemester+' · '+labels[category].toUpperCase()+'</div><h3>'+labels[category]+'</h3></div><button class="browser-close" data-back="subject" type="button">← Back to subject</button></div><p class="browser-empty">Loading materials…</p>';
  const folder = 'resources/semester-'+currentSemester+'/'+category+'/'+subjectSlug(currentSubject);
  const apiUrl = 'https://api.github.com/repos/mrjojo07/BCA-HUB/contents/'+folder;
  try {
    const response = await fetch(apiUrl, {headers:{Accept:'application/vnd.github+json'}});
    if (!response.ok) throw new Error(response.status === 404 ? 'No files have been added to this category yet.' : 'Could not load files. Please try again.');
    const files = (await response.json()).filter(file => file.type === 'file');
    const heading = '<div class="browser-heading"><div><div class="eyebrow">SEMESTER '+currentSemester+' · '+labels[category].toUpperCase()+'</div><h3>'+labels[category]+'</h3></div><button class="browser-close" data-back="subject" type="button">← Back to subject</button></div>';
    if (!files.length) {
      subjectBrowser.innerHTML = heading+'<p class="browser-empty">No files have been uploaded here yet.</p>';
      return;
    }
    const list = document.createElement('div');
    list.className = 'subject-list';
    files.forEach(file => {
      const row = document.createElement('div');
      row.className = 'subject-item';
      const title = document.createElement('strong');
      title.textContent = file.name;
      const link = document.createElement('a');
      link.href = file.download_url || file.html_url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.className = 'subject-arrow';
      link.textContent = 'Open ↗';
      row.append(title, link);
      list.appendChild(row);
      if (/\.(png|jpe?g|webp|gif)$/i.test(file.name)) {
        const preview = document.createElement('img');
        preview.src = file.download_url;
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
semesterGrid?.addEventListener("click", (event) => {
  const card = event.target.closest("[data-semester]");
  if (card) showSemester(Number(card.dataset.semester));
});
subjectBrowser?.addEventListener("click", (event) => {
  const close = event.target.closest(".browser-close");
  if (close) {
    if (close.dataset.back === "subjects") showSemester(currentSemester);
    else if (close.dataset.back === "subject") showCategories(currentSubject);
    else subjectBrowser.hidden = true;
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
  if (material) showMaterials(material.dataset.material);
});


/* Timed MCQ practice quiz */
const quizQuestions = [
  {q:"Which component is known as the brain of a computer?",o:["RAM","CPU","Hard disk","Monitor"],a:1},
  {q:"Which of these is an input device?",o:["Printer","Speaker","Keyboard","Projector"],a:2},
  {q:"What does URL stand for?",o:["Uniform Resource Locator","Universal Record Link","Unified Routing Language","User Reference Location"],a:0},
  {q:"Which memory is volatile?",o:["ROM","SSD","RAM","DVD"],a:2},
  {q:"Which number system uses only 0 and 1?",o:["Decimal","Octal","Hexadecimal","Binary"],a:3}
];
const quizIntro=document.getElementById("quizIntro");
const quizPlay=document.getElementById("quizPlay");
const quizResult=document.getElementById("quizResult");
if(quizIntro&&quizPlay&&quizResult){
  let qIndex=0,answers=Array(quizQuestions.length).fill(null),secondsLeft=300,timerId=null,finished=false;
  const byId=id=>document.getElementById(id);
  function renderQuestion(){
    const q=quizQuestions[qIndex];
    byId("quizProgress").textContent="Question "+(qIndex+1)+" of "+quizQuestions.length;
    byId("quizProgressBar").style.width=((qIndex+1)/quizQuestions.length*100)+"%";
    byId("quizQuestion").textContent=q.q;
    const options=byId("quizOptions"); options.replaceChildren();
    q.o.forEach((option,index)=>{
      const label=document.createElement("label"); label.className="quiz-option"+(answers[qIndex]===index?" selected":"");
      const radio=document.createElement("input"); radio.type="radio"; radio.name="quizAnswer"; radio.value=index; radio.checked=answers[qIndex]===index;
      radio.addEventListener("change",()=>{answers[qIndex]=index;renderQuestion();});
      const text=document.createElement("span"); text.textContent=option;
      label.append(radio,text); options.append(label);
    });
    byId("quizPrevious").disabled=qIndex===0;
    byId("quizNext").hidden=qIndex===quizQuestions.length-1;
    byId("quizSubmit").hidden=qIndex!==quizQuestions.length-1;
  }
  function updateTimer(){
    const mins=String(Math.floor(secondsLeft/60)).padStart(2,"0"),secs=String(secondsLeft%60).padStart(2,"0");
    byId("quizTimer").textContent=mins+":"+secs;
    if(secondsLeft<=60)byId("quizTimer").classList.add("urgent");
  }
  function finishQuiz(){
    if(finished)return; finished=true; clearInterval(timerId);
    const score=answers.reduce((sum,answer,index)=>sum+(answer===quizQuestions[index].a?1:0),0);
    quizPlay.hidden=true;quizResult.hidden=false;
    const heading=document.createElement("h3");heading.textContent="Quiz completed!";
    const scoreText=document.createElement("p");scoreText.className="quiz-score";scoreText.textContent=score+" / "+quizQuestions.length;
    const detail=document.createElement("p");detail.textContent="You answered "+answers.filter(a=>a!==null).length+" of "+quizQuestions.length+" questions. "+(secondsLeft===0?"Time is up.":"Well done for practising!");
    const retry=document.createElement("button");retry.className="quiz-button";retry.textContent="Try again ↻";retry.addEventListener("click",resetQuiz);
    quizResult.replaceChildren(heading,scoreText,detail,retry);
  }
  function resetQuiz(){
    qIndex=0;answers=Array(quizQuestions.length).fill(null);secondsLeft=300;finished=false;
    quizResult.hidden=true;quizIntro.hidden=false;quizPlay.hidden=true;updateTimer();
  }
  byId("startQuiz").addEventListener("click",()=>{
    quizIntro.hidden=true;quizResult.hidden=true;quizPlay.hidden=false;renderQuestion();updateTimer();
    timerId=setInterval(()=>{secondsLeft--;updateTimer();if(secondsLeft<=0)finishQuiz();},1000);
  });
  byId("quizPrevious").addEventListener("click",()=>{if(qIndex>0){qIndex--;renderQuestion();}});
  byId("quizNext").addEventListener("click",()=>{if(qIndex<quizQuestions.length-1){qIndex++;renderQuestion();}});
  byId("quizSubmit").addEventListener("click",()=>{if(confirm("Submit your answers and view your score?"))finishQuiz();});
}

(async function(){const box=document.getElementById("examCountdownList");if(!box)return;try{const r=await fetch("exam-timetable.json?v="+Date.now());if(!r.ok)throw 0;const exams=await r.json();const today=new Date();today.setHours(0,0,0,0);box.replaceChildren();(Array.isArray(exams)?exams:[]).filter(x=>x.date&&x.title).sort((a,b)=>a.date.localeCompare(b.date)).forEach(x=>{const d=new Date(x.date+"T00:00:00");const n=Math.ceil((d-today)/86400000);const card=document.createElement("article");card.className="countdown-card";const title=document.createElement("h3");title.textContent=x.title;const date=document.createElement("p");date.textContent=d.toLocaleDateString();const days=document.createElement("strong");days.className="countdown-days";days.textContent=n<0?"Exam completed":n===0?"Exam is today":n+" days left";card.append(date,title,days);box.append(card);});if(!box.children.length)box.textContent="No upcoming exams have been added yet.";}catch(e){box.textContent="Exam timetable is currently unavailable.";}})();


/* Beginner programming practice examples */
const practiceExamples = {
  c: {
    label:"C PROGRAM", title:"Print a message",
    code:'#include <stdio.h>\n\nint main(void) {\n    printf("Hello, BCA HUB!\\n");\n    return 0;\n}',
    output:"Hello, BCA HUB!",
    tasks:["Print your name on the screen.","Read two integers and display their sum.","Check whether a number is even or odd."]
  },
  python: {
    label:"PYTHON PROGRAM", title:"Print a message",
    code:'print("Hello, BCA HUB!")',
    output:"Hello, BCA HUB!",
    tasks:["Print your name on the screen.","Read two numbers and display their sum.","Check whether a number is even or odd."]
  },
  java: {
    label:"JAVA PROGRAM", title:"Print a message",
    code:'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, BCA HUB!");\n    }\n}',
    output:"Hello, BCA HUB!",
    tasks:["Print your name on the screen.","Read two integers and display their sum.","Check whether a number is even or odd."]
  }
};
const practiceTabs=document.querySelectorAll(".practice-tab");
const practiceCode=document.getElementById("practiceCode");
if(practiceCode){
  function showPractice(language){
    const item=practiceExamples[language];
    document.getElementById("practiceLanguage").textContent=item.label;
    document.getElementById("practiceTitle").textContent=item.title;
    practiceCode.textContent=item.code;
    document.getElementById("practiceOutput").textContent=item.output;
    const tasks=document.getElementById("practiceTasks");
    tasks.replaceChildren();
    item.tasks.forEach(task=>{const li=document.createElement("li");li.textContent=task;tasks.append(li);});
    practiceTabs.forEach(tab=>{const active=tab.dataset.language===language;tab.classList.toggle("active",active);tab.setAttribute("aria-selected",String(active));});
  }
  practiceTabs.forEach(tab=>tab.addEventListener("click",()=>showPractice(tab.dataset.language)));
  document.getElementById("copyPracticeCode")?.addEventListener("click",async()=>{
    const button=document.getElementById("copyPracticeCode");
    try{await navigator.clipboard.writeText(practiceCode.textContent);button.textContent="Copied!";}
    catch(e){button.textContent="Select code to copy";}
    setTimeout(()=>button.textContent="Copy code",1600);
  });
  showPractice("c");
}
