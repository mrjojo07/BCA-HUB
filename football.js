const canvas=document.getElementById("gameCanvas"),ctx=canvas.getContext("2d");
const $=id=>document.getElementById(id);const blueEl=$("blueScore"),redEl=$("redScore"),clockEl=$("matchClock"),loading=$("gameLoading"),panel=$("gamePanel");
let W=960,H=540,scale=1,last=0,floor=484,remaining=300,blueScore=0,redScore=0,paused=false,ended=false,goalTimer=0,flashTimer=0;
const gravity=1700,keys={left:false,right:false,jump:false,kick:false};
const player={x:190,y:floor-72,vx:0,vy:0,r:39,face:1,onGround:true,kickCd:0};
const ai={x:W-190,y:floor-72,vx:0,vy:0,r:39,face:-1,onGround:true,kickCd:0};
const ball={x:W/2,y:floor-100,vx:0,vy:0,r:18};
function resize(){const r=canvas.getBoundingClientRect();const d=Math.min(devicePixelRatio||1,2);canvas.width=Math.max(1,Math.round(r.width*d));canvas.height=Math.max(1,Math.round(r.height*d));W=r.width;H=r.height;floor=H-56;scale=d;ctx.setTransform(d,0,0,d,0,0);}
new ResizeObserver(resize).observe(canvas);
function resetPositions(){player.x=W*.2;player.y=H-120;player.vx=player.vy=0;player.onGround=true;ai.x=W*.8;ai.y=H-120;ai.vx=ai.vy=0;ai.onGround=true;ball.x=W/2;ball.y=H-105;ball.vx=ball.vy=0;}
function stadiumPath(x,y,w,h){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+w,y);ctx.lineTo(x+w-18,y+h);ctx.lineTo(x+18,y+h);ctx.closePath();}
function drawStadium(){
  const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,"#101c37");sky.addColorStop(.48,"#40536a");sky.addColorStop(1,"#9bc4d2");ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
  // Stadium roof and stands
  ctx.fillStyle="#101827";ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(W,0);ctx.lineTo(W,H*.30);ctx.lineTo(0,H*.30);ctx.fill();
  const stand=ctx.createLinearGradient(0,H*.18,0,H*.70);stand.addColorStop(0,"#526174");stand.addColorStop(.45,"#27374a");stand.addColorStop(1,"#152a32");ctx.fillStyle=stand;ctx.fillRect(0,H*.19,W,H*.48);
  // Crowd tiers
  for(let row=0;row<7;row++){const y=H*.25+row*H*.052;for(let i=0;i<Math.ceil(W/12);i++){const x=i*12+((row%2)*5);const seed=(i*17+row*31)%11;ctx.fillStyle=["#d6d9d7","#e4b34d","#bd4c55","#4779a9","#e7e5d9","#384e67"][seed%6];ctx.beginPath();ctx.arc(x,y+Math.sin(i*2+row)*2,2.5+seed%2,0,Math.PI*2);ctx.fill();ctx.fillRect(x-2,y+3,4,7);}}
  ctx.fillStyle="#a8bdc6";ctx.fillRect(0,H*.59,W,H*.025);ctx.fillStyle="#1b2a39";ctx.fillRect(0,H*.615,W,H*.025);
  // Floodlight beams
  for(let i=0;i<4;i++){const x=i%2?W-25:25;const g=ctx.createRadialGradient(x,H*.08,2,x,H*.36,W*.32);g.addColorStop(0,"#fff9d955");g.addColorStop(1,"#fff9d900");ctx.fillStyle=g;ctx.fillRect(0,0,W,H*.75);ctx.fillStyle="#eaf6ff";ctx.beginPath();ctx.arc(x,H*.08,5,0,7);ctx.fill();}
  // pitch
  const top=H*.66;const grass=ctx.createLinearGradient(0,top,0,H);grass.addColorStop(0,"#26834d");grass.addColorStop(1,"#0d4d35");ctx.fillStyle=grass;ctx.fillRect(0,top,W,H-top);
  for(let i=0;i<8;i++){ctx.fillStyle=i%2?"#ffffff08":"#001d1714";ctx.fillRect(i*W/8,top,W/8,H-top);}
  ctx.strokeStyle="#e9f5dcbb";ctx.lineWidth=2;ctx.strokeRect(10,top+8,W-20,H-top-16);ctx.beginPath();ctx.moveTo(W/2,top);ctx.lineTo(W/2,H);ctx.stroke();ctx.beginPath();ctx.ellipse(W/2,(top+H)/2,Math.min(48,W*.09),22,0,0,7);ctx.stroke();
  // penalty boxes
  ctx.strokeRect(10,top+22,Math.min(115,W*.18),H-top-44);ctx.strokeRect(W-Math.min(125,W*.18),top+22,115,H-top-44);
}
function drawGoal(x,dir){
  const y=H*.68,h=H*.25,w=Math.min(76,W*.12),gx=dir<0?x-w:x;
  ctx.save();ctx.fillStyle="#d9e5e8";ctx.fillRect(gx,y,w,5);ctx.fillRect(gx,y,5,h);ctx.fillRect(gx+w-5,y,5,h);
  ctx.strokeStyle="#dce8e8aa";ctx.lineWidth=1;for(let i=1;i<7;i++){ctx.beginPath();ctx.moveTo(gx+5+i*(w-10)/7,y+4);ctx.lineTo(gx+5+i*(w-10)/7,y+h);ctx.stroke();}for(let i=1;i<7;i++){ctx.beginPath();ctx.moveTo(gx+4,y+i*h/7);ctx.lineTo(gx+w-4,y+i*h/7);ctx.stroke();}
  ctx.restore();
}
function drawPlayer(p,color,trim){
  ctx.save();ctx.translate(p.x,p.y);const skin=ctx.createLinearGradient(-22,-65,24,-5);skin.addColorStop(0,"#ffe0b8");skin.addColorStop(1,"#b96e4d");
  // ground shadow and boots
  ctx.fillStyle="#00150f88";ctx.beginPath();ctx.ellipse(0,49,39,9,0,0,7);ctx.fill();
  ctx.fillStyle="#172337";ctx.beginPath();ctx.roundRect(-24,35,23,13,5);ctx.roundRect(3,35,23,13,5);ctx.fill();ctx.fillStyle="#e8edf0";ctx.fillRect(-23,43,19,2);ctx.fillRect(5,43,19,2);
  // legs
  ctx.strokeStyle=trim;ctx.lineWidth=13;ctx.lineCap="round";ctx.beginPath();ctx.moveTo(-11,17);ctx.lineTo(-15,38);ctx.moveTo(11,17);ctx.lineTo(15,38);ctx.stroke();
  // jersey with gradient
  const shirt=ctx.createLinearGradient(-25,-12,25,30);shirt.addColorStop(0,color);shirt.addColorStop(1,trim);ctx.fillStyle=shirt;ctx.beginPath();ctx.roundRect(-25,-12,50,39,10);ctx.fill();
  ctx.fillStyle="#ffffff55";ctx.fillRect(-3,-7,6,28);ctx.fillStyle="#fff";ctx.font="bold 10px sans-serif";ctx.textAlign="center";ctx.fillText(p===player?"7":"10",0,13);
  // neck and oversized head
  ctx.fillStyle="#c98761";ctx.fillRect(-8,-27,16,15);ctx.fillStyle=skin;ctx.beginPath();ctx.ellipse(0,-43,31,34,0,0,7);ctx.fill();
  // ears
  ctx.fillStyle="#c98761";ctx.beginPath();ctx.arc(-29,-42,7,0,7);ctx.arc(29,-42,7,0,7);ctx.fill();
  // hair cap
  ctx.fillStyle=p===player?"#4a2b20":"#251d20";ctx.beginPath();ctx.moveTo(-30,-49);ctx.quadraticCurveTo(-28,-81,2,-78);ctx.quadraticCurveTo(30,-77,31,-47);ctx.quadraticCurveTo(12,-62,-2,-58);ctx.quadraticCurveTo(-16,-53,-30,-49);ctx.fill();
  // eyebrows, eyes, nose, smile/beard
  ctx.strokeStyle="#39231e";ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-19,-51);ctx.lineTo(-7,-53);ctx.moveTo(8,-53);ctx.lineTo(20,-50);ctx.stroke();
  ctx.fillStyle="#fff";ctx.beginPath();ctx.ellipse(-13,-43,6,4,0,0,7);ctx.ellipse(13,-43,6,4,0,0,7);ctx.fill();ctx.fillStyle="#263243";ctx.beginPath();ctx.arc(-12,-43,2.5,0,7);ctx.arc(12,-43,2.5,0,7);ctx.fill();
  ctx.strokeStyle="#874b36";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,-40);ctx.lineTo(-3,-31);ctx.lineTo(3,-30);ctx.stroke();
  ctx.fillStyle=p===player?"#573126":"#332126";ctx.beginPath();ctx.moveTo(-19,-29);ctx.quadraticCurveTo(0,-18,19,-29);ctx.quadraticCurveTo(14,-8,0,-9);ctx.quadraticCurveTo(-15,-11,-19,-29);ctx.fill();
  ctx.fillStyle="#fff";ctx.fillRect(-7,-25,14,3);
  // rim light
  ctx.strokeStyle="#ffffff55";ctx.lineWidth=2;ctx.beginPath();ctx.arc(-2,-43,31,3.6,5.4);ctx.stroke();
  ctx.restore();
}
function drawBall(){
  ctx.save();ctx.shadowColor="#0009";ctx.shadowBlur=12;ctx.shadowOffsetY=5;
  const g=ctx.createRadialGradient(ball.x-7,ball.y-8,2,ball.x,ball.y,ball.r);g.addColorStop(0,"#fff");g.addColorStop(.75,"#d9e1e5");g.addColorStop(1,"#6b7884");ctx.fillStyle=g;ctx.beginPath();ctx.arc(ball.x,ball.y,ball.r,0,7);ctx.fill();ctx.shadowBlur=0;
  ctx.fillStyle="#202a36";for(let i=0;i<5;i++){const a=i*Math.PI*2/5;ctx.beginPath();ctx.arc(ball.x+Math.cos(a)*9,ball.y+Math.sin(a)*9,5,0,7);ctx.fill();}
  ctx.strokeStyle="#fff9";ctx.lineWidth=1;ctx.beginPath();ctx.arc(ball.x,ball.y,ball.r-2,0,7);ctx.stroke();ctx.restore();
}
function draw(){
  ctx.clearRect(0,0,W,H);drawStadium();drawGoal(8,1);drawGoal(W-8,-1);
  // players cast shadows and ball
  drawPlayer(player,"#168cff","#0754a0");drawPlayer(ai,"#f04c62","#8d2035");drawBall();
  if(flashTimer>0){ctx.save();ctx.textAlign="center";ctx.font="900 42px sans-serif";ctx.shadowColor="#ffb52e";ctx.shadowBlur=20;ctx.fillStyle="#fff4a8";ctx.fillText("GOAL!",W/2,H*.18);ctx.restore();}
}
function hitPlayer(p){let dx=ball.x-p.x,dy=ball.y-(p.y-18),dist=Math.hypot(dx,dy),min=ball.r+p.r;if(dist<min){if(dist<.01)dx=p.face;const nx=dx/dist,ny=dy/dist;ball.x=p.x+nx*(min+1);ball.y=p.y-18+ny*(min+1);const force=p===player?(keys.kick?780:260):380;ball.vx=nx*force+p.vx*.55;ball.vy=ny*force- (keys.kick?300:100);}}
function kick(p,dir){if(p.kickCd>0)return;const close=Math.hypot(ball.x-p.x,ball.y-(p.y-12))<p.r+ball.r+30;if(close){const isAI=p===ai;ball.vx=dir*(isAI?390:690)+p.vx*.4;ball.vy=isAI?-170:-300;p.kickCd=isAI?1.15:.38;}}
function movePlayer(p,dt,isAI=false){let dir=0;if(isAI){const dx=ball.x-p.x;const deadZone=34;dir=dx>deadZone?1:dx<-deadZone?-1:0;const close=Math.abs(dx)<p.r+ball.r+30;if(ball.y<p.y-58&&p.onGround&&Math.abs(dx)<78){p.vy=-480;p.onGround=false;}if(close&&p.kickCd<=0&&ball.y>p.y-115)kick(p,-1);}else{dir=(keys.right?1:0)-(keys.left?1:0);if(keys.jump&&p.onGround){p.vy=-690;p.onGround=false;}if(keys.kick)kick(p,1);}p.face=dir||p.face;const maxSpeed=isAI?245:620,accel=isAI?3.2:9;p.vx+=(dir*maxSpeed-p.vx)*Math.min(1,dt*accel);p.x+=p.vx*dt;p.vy+=gravity*dt;p.y+=p.vy*dt;if(p.y>floor-72){p.y=floor-72;p.vy=0;p.onGround=true;}p.x=Math.max(42,Math.min(W-42,p.x));p.kickCd=Math.max(0,p.kickCd-dt);}
function step(dt){if(paused||ended)return;remaining=Math.max(0,remaining-dt);clockEl.textContent=String(Math.floor(remaining/60)).padStart(2,"0")+":"+String(Math.floor(remaining%60)).padStart(2,"0");movePlayer(player,dt);movePlayer(ai,dt,true);ball.vy+=gravity*dt;ball.x+=ball.vx*dt;ball.y+=ball.vy*dt;ball.vx*=Math.pow(.992,dt*60);ball.vy*=Math.pow(.995,dt*60);if(ball.y+ball.r>floor){ball.y=floor-ball.r;ball.vy=-Math.abs(ball.vy)*.68;if(Math.abs(ball.vy)<55)ball.vy=0;}if(ball.y-ball.r<0){ball.y=ball.r;ball.vy=Math.abs(ball.vy)*.6;}if(ball.x<ball.r+5){ball.x=ball.r+5;ball.vx=Math.abs(ball.vx)*.65;}if(ball.x>W-ball.r-5){ball.x=W-ball.r-5;ball.vx=-Math.abs(ball.vx)*.65;}hitPlayer(player);hitPlayer(ai);if(ball.x<60&&ball.y>H-165){redScore++;redEl.textContent=redScore;scoreGoal();}else if(ball.x>W-60&&ball.y>H-165){blueScore++;blueEl.textContent=blueScore;scoreGoal();}if(flashTimer>0)flashTimer-=dt;if(remaining<=0)finish();}
function scoreGoal(){flashTimer=1.2;ball.x=W/2;ball.y=H-110;ball.vx=ball.vy=0;player.x=W*.2;ai.x=W*.8;}
function finish(){ended=true;$("resultTitle").textContent=blueScore>redScore?"You win!":blueScore<redScore?"AI wins":"It's a draw";$("resultScore").textContent=blueScore+" - "+redScore;$("resultOverlay").hidden=false;}
function loop(t){const dt=Math.min(.033,(t-last)/1000||0);last=t;step(dt);draw();requestAnimationFrame(loop);}
function restart(){blueScore=redScore=0;remaining=300;paused=false;ended=false;blueEl.textContent=redEl.textContent="0";clockEl.textContent="05:00";$("resultOverlay").hidden=true;$("pauseBtn").textContent="Pause";resetPositions();}
function setKey(k,v){if(k==="left")keys.left=v;if(k==="right")keys.right=v;if(k==="jump")keys.jump=v;if(k==="kick")keys.kick=v;}
window.addEventListener("keydown",e=>{const k=e.key.toLowerCase();if(["arrowleft","arrowright","arrowup"," "].includes(k))e.preventDefault();if(k==="a"||k==="arrowleft")keys.left=true;if(k==="d"||k==="arrowright")keys.right=true;if(k==="w"||k==="arrowup")keys.jump=true;if(k===" ")keys.kick=true;});
window.addEventListener("keyup",e=>{const k=e.key.toLowerCase();if(k==="a"||k==="arrowleft")keys.left=false;if(k==="d"||k==="arrowright")keys.right=false;if(k==="w"||k==="arrowup")keys.jump=false;if(k===" ")keys.kick=false;});
document.querySelectorAll("[data-key]").forEach(b=>{const k=b.dataset.key;b.addEventListener("pointerdown",e=>{e.preventDefault();b.setPointerCapture(e.pointerId);setKey(k,true);});for(const ev of ["pointerup","pointercancel","lostpointercapture"])b.addEventListener(ev,()=>setKey(k,false));});
$("pauseBtn").addEventListener("click",()=>{paused=!paused;$("pauseBtn").textContent=paused?"Resume":"Pause";});
$("restartBtn").addEventListener("click",restart);$("playAgainBtn").addEventListener("click",restart);
$("fullscreenBtn").addEventListener("click",async()=>{try{if(!document.fullscreenElement){await panel.requestFullscreen();$("fullscreenBtn").textContent="✕ Exit Full screen";}else{await document.exitFullscreen();}}catch(e){$("modeNote").textContent="Fullscreen is not available in this browser.";}});
document.addEventListener("fullscreenchange",()=>{$("fullscreenBtn").textContent=document.fullscreenElement?"✕ Exit Full screen":"⛶ Full screen";resize();});
$("onlineMode").addEventListener("click",()=>{$("modeNote").textContent="Online Multiplayer is coming in a future update.";});
resetPositions();resize();loading.classList.add("done");requestAnimationFrame(loop);