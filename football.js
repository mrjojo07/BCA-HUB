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
  // Bright arcade-cartoon stadium with layered stands and a compact side-on pitch.
  const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,"#101b3b");sky.addColorStop(.48,"#526c91");sky.addColorStop(1,"#c0d9e0");ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
  // Roof silhouette and illuminated trusses.
  ctx.fillStyle="#10182b";ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(W,0);ctx.lineTo(W,H*.22);ctx.quadraticCurveTo(W*.5,H*.12,0,H*.22);ctx.closePath();ctx.fill();
  ctx.strokeStyle="#71859b";ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(0,H*.19);ctx.quadraticCurveTo(W*.5,H*.11,W,H*.19);ctx.stroke();
  ctx.strokeStyle="#d8efff55";ctx.lineWidth=2;for(let i=0;i<9;i++){const x=i*W/8;ctx.beginPath();ctx.moveTo(x,H*.02);ctx.lineTo(W*.5+(x-W*.5)*.85,H*.2);ctx.stroke();}
  // Three seating tiers.
  const stand=ctx.createLinearGradient(0,H*.19,0,H*.66);stand.addColorStop(0,"#62758b");stand.addColorStop(.35,"#354b68");stand.addColorStop(1,"#172d45");ctx.fillStyle=stand;ctx.fillRect(0,H*.19,W,H*.47);
  for(let row=0;row<9;row++){
    const y=H*.245+row*H*.043;
    ctx.fillStyle=row%2?"#263b57":"#405773";ctx.fillRect(0,y+8,W,3);
    for(let i=0;i<Math.ceil(W/13)+1;i++){
      const x=i*13+((row%2)*6),seed=(i*17+row*31)%13;
      const colors=["#f5eee0","#f7bf4a","#ed6470","#4ca3e8","#68d2a0","#a58be8","#e4f3ff"];
      const shirt=colors[seed%colors.length],headY=y+Math.sin(i*1.7+row)*1.5;
      // tiny cheering spectator with raised arms
      ctx.strokeStyle=shirt;ctx.lineWidth=2.1;ctx.lineCap="round";ctx.beginPath();
      ctx.moveTo(x-2,headY+7);ctx.lineTo(x-4-(seed%3),headY+2);ctx.moveTo(x+2,headY+7);ctx.lineTo(x+4+(seed%3),headY+2);ctx.stroke();
      ctx.fillStyle=shirt;ctx.beginPath();ctx.roundRect(x-3.4,headY+7,6.8,7,2);ctx.fill();
      ctx.fillStyle=seed%4===0?"#8c563d":"#e4ad83";ctx.beginPath();ctx.arc(x,headY+2,3.1,0,Math.PI*2);ctx.fill();
      ctx.fillStyle="#273247";ctx.beginPath();ctx.arc(x,headY+.4,3.1,Math.PI,Math.PI*2);ctx.fill();
    }
  }
  // Team banners and advertising boards.
  const bannerY=H*.595,bannerH=H*.055;
  const banner=ctx.createLinearGradient(0,bannerY,0,bannerY+bannerH);banner.addColorStop(0,"#18375f");banner.addColorStop(1,"#0a1d38");
  ctx.fillStyle=banner;ctx.fillRect(0,bannerY,W,bannerH);
  ctx.strokeStyle="#79baff";ctx.lineWidth=2;ctx.strokeRect(5,bannerY+3,W-10,bannerH-6);
  ctx.fillStyle="#d8eaff";ctx.font="900 "+Math.max(9,H*.023)+"px sans-serif";ctx.textAlign="center";ctx.fillText("BCA HUB  •  PLAY FAIR  •  SCORE BIG",W/2,bannerY+bannerH*.68);
  // Floodlights with soft beams.
  for(let i=0;i<4;i++){const x=i%2?W-30:30,y=H*.13;const g=ctx.createRadialGradient(x,y,2,x,y,W*.25);g.addColorStop(0,"#fff9d966");g.addColorStop(1,"#fff9d900");ctx.fillStyle=g;ctx.fillRect(0,0,W,H*.72);ctx.fillStyle="#f7fbff";ctx.beginPath();ctx.roundRect(x-10,y-4,20,8,4);ctx.fill();for(let k=0;k<4;k++){ctx.fillStyle="#fff5c9";ctx.beginPath();ctx.arc(x-6+k*4,y,1.6,0,7);ctx.fill();}}
  // Lush pitch with alternating mowing stripes and subtle texture.
  const top=H*.655,groundH=H-top;const grass=ctx.createLinearGradient(0,top,0,H);grass.addColorStop(0,"#58c66b");grass.addColorStop(.3,"#26964e");grass.addColorStop(1,"#07502e");ctx.fillStyle=grass;ctx.fillRect(0,top,W,groundH);
  for(let i=0;i<14;i++){ctx.fillStyle=i%2?"#c5ff9d13":"#00391c20";ctx.fillRect(i*W/14,top,W/14+1,groundH);}
  for(let i=0;i<350;i++){const x=(i*73%997)/997*W,y=top+((i*37%991)/991)*groundH;ctx.fillStyle=i%2?"#eaffd01b":"#003d211c";ctx.fillRect(x,y,1.4,2.2);}
  // Turf edge and painted football markings.
  ctx.fillStyle="#063d2a";ctx.fillRect(0,H-7,W,7);ctx.save();ctx.strokeStyle="#f3ffe6e8";ctx.lineWidth=Math.max(1.6,W/620);ctx.shadowColor="#efffe088";ctx.shadowBlur=3;
  ctx.strokeRect(9,top+7,W-18,groundH-14);ctx.beginPath();ctx.moveTo(W/2,top+7);ctx.lineTo(W/2,H-7);ctx.stroke();
  ctx.beginPath();ctx.ellipse(W/2,top+groundH*.53,Math.min(49,W*.085),groundH*.22,0,0,Math.PI*2);ctx.stroke();
  ctx.beginPath();ctx.arc(W/2,top+groundH*.53,3,0,7);ctx.fillStyle="#f3ffe6";ctx.fill();
  const boxW=Math.min(126,W*.19),boxH=groundH*.78,boxY=top+(groundH-boxH)/2;ctx.strokeRect(9,boxY,boxW,boxH);ctx.strokeRect(W-9-boxW,boxY,boxW,boxH);
  const sixW=boxW*.42,sixH=boxH*.48,sixY=top+(groundH-sixH)/2;ctx.strokeRect(9,sixY,sixW,sixH);ctx.strokeRect(W-9-sixW,sixY,sixH);
  ctx.restore();
  // Soft glow along the far touchline.
  const shade=ctx.createLinearGradient(0,top,0,top+groundH*.22);shade.addColorStop(0,"#f4ffdc24");shade.addColorStop(1,"#f4ffdc00");ctx.fillStyle=shade;ctx.fillRect(0,top,W,groundH*.22);
}
function drawGoal(x,dir){
  const y=H*.685,h=H*.245,w=Math.min(92,W*.135),depth=Math.min(34,W*.05),gx=dir<0?x-w:x;
  ctx.save();
  // Ground shadow and deep, angled net.
  ctx.fillStyle="#00251488";ctx.beginPath();ctx.ellipse(gx+w/2,y+h+5,w*.8,9,0,0,Math.PI*2);ctx.fill();
  const net=ctx.createLinearGradient(gx,y,gx+w,y+h);net.addColorStop(0,"#f7ffff88");net.addColorStop(1,"#7eabb955");
  ctx.fillStyle=net;ctx.beginPath();ctx.moveTo(gx+5,y+7);ctx.lineTo(gx+w-5,y+7);ctx.lineTo(gx+w+(dir<0?-depth:depth),y+h-2);ctx.lineTo(gx+(dir<0?-depth:depth),y+h-2);ctx.closePath();ctx.fill();
  ctx.strokeStyle="#f5ffffa8";ctx.lineWidth=1;
  for(let i=0;i<=10;i++){const t=i/10,fx=gx+5+t*(w-10),bx=gx+(dir<0?-depth: w+depth);ctx.beginPath();ctx.moveTo(fx,y+7);ctx.lineTo(bx+(dir<0?depth:0),y+h-2);ctx.stroke();}
  for(let j=1;j<10;j++){const yy=y+7+j*(h-9)/10;ctx.beginPath();ctx.moveTo(gx+5,yy);ctx.lineTo(gx+w-5,yy);ctx.stroke();}
  // Chunky, glossy cartoon frame with coloured corner caps.
  const metal=ctx.createLinearGradient(gx,0,gx+w,0);metal.addColorStop(0,"#7d929e");metal.addColorStop(.22,"#ffffff");metal.addColorStop(.5,"#c6f4ff");metal.addColorStop(.78,"#ffffff");metal.addColorStop(1,"#748b98");
  ctx.shadowColor="#001b11aa";ctx.shadowBlur=7;ctx.shadowOffsetY=3;ctx.fillStyle=metal;
  ctx.beginPath();ctx.roundRect(gx,y,w,8,4);ctx.roundRect(gx,y,8,h,4);ctx.roundRect(gx+w-8,y,8,h,4);ctx.fill();ctx.shadowBlur=0;ctx.shadowOffsetY=0;
  ctx.strokeStyle="#ffffff";ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(gx+4,y+3);ctx.lineTo(gx+w-4,y+3);ctx.moveTo(gx+4,y+4);ctx.lineTo(gx+4,y+h-4);ctx.moveTo(gx+w-4,y+4);ctx.lineTo(gx+w-4,y+h-4);ctx.stroke();
  // Bright red/white goal corner wraps.
  ctx.fillStyle="#ff5b63";ctx.fillRect(gx+9,y+1,12,5);ctx.fillRect(gx+w-21,y+1,12,5);
  ctx.fillStyle="#fff";ctx.beginPath();ctx.arc(gx+4,y+4,4,0,7);ctx.arc(gx+w-4,y+4,4,0,7);ctx.fill();
  ctx.restore();
}
function drawPlayer(p,color,trim){
  ctx.save();ctx.translate(p.x,p.y);
  const skin=ctx.createLinearGradient(-24,-72,24,-4);skin.addColorStop(0,"#ffd9aa");skin.addColorStop(.55,"#e6a071");skin.addColorStop(1,"#a85d43");
  const isBlue=p===player,jersey=ctx.createLinearGradient(-28,-12,28,32);jersey.addColorStop(0,isBlue?"#45b8ff":"#ff7b87");jersey.addColorStop(.55,color);jersey.addColorStop(1,trim);
  // Soft cartoon ground shadow.
  ctx.fillStyle="#001b1288";ctx.beginPath();ctx.ellipse(0,51,43,10,0,0,Math.PI*2);ctx.fill();
  // Animated-looking legs and chunky football boots.
  const swing=Math.sin(performance.now()/105+(isBlue?0:1))*Math.min(5,Math.abs(p.vx)*.012);
  ctx.strokeStyle=isBlue?"#d9edff":"#ffe2e4";ctx.lineWidth=14;ctx.lineCap="round";ctx.beginPath();ctx.moveTo(-12,17);ctx.lineTo(-15-swing,38);ctx.moveTo(12,17);ctx.lineTo(15+swing,38);ctx.stroke();
  ctx.fillStyle="#142338";ctx.beginPath();ctx.roundRect(-29-swing,37,27,13,6);ctx.roundRect(3+swing,37,27,13,6);ctx.fill();
  ctx.fillStyle="#f8ffff";ctx.fillRect(-27-swing,41,18,2);ctx.fillRect(7+swing,41,18,2);
  ctx.fillStyle="#f2bd4d";ctx.fillRect(-25-swing,49,4,2);ctx.fillRect(18+swing,49,4,2);
  // Arms behind the body.
  ctx.strokeStyle=skin;ctx.lineWidth=11;ctx.lineCap="round";ctx.beginPath();ctx.moveTo(-22,-5);ctx.quadraticCurveTo(-39,5,-34,18);ctx.moveTo(22,-5);ctx.quadraticCurveTo(39,5,34,18);ctx.stroke();
  ctx.fillStyle=isBlue?"#ffb52e":"#f4d8dc";ctx.beginPath();ctx.roundRect(-29,-11,13,12,4);ctx.roundRect(16,-11,13,12,4);ctx.fill();
  // Jersey torso, collar, sleeves and number.
  ctx.fillStyle=jersey;ctx.beginPath();ctx.roundRect(-26,-14,52,43,12);ctx.fill();
  ctx.fillStyle="#ffffff55";ctx.beginPath();ctx.roundRect(-4,-10,8,34,3);ctx.fill();
  ctx.fillStyle="#f8fbff";ctx.beginPath();ctx.moveTo(-10,-13);ctx.lineTo(0,-5);ctx.lineTo(10,-13);ctx.lineTo(6,-17);ctx.lineTo(-6,-17);ctx.closePath();ctx.fill();
  ctx.fillStyle="#fff";ctx.font="900 11px sans-serif";ctx.textAlign="center";ctx.fillText(isBlue?"7":"10",0,15);
  // Neck and oversized expressive head.
  ctx.fillStyle="#c98560";ctx.beginPath();ctx.roundRect(-8,-29,16,17,5);ctx.fill();
  ctx.fillStyle=skin;ctx.beginPath();ctx.ellipse(0,-49,32,35,0,0,Math.PI*2);ctx.fill();
  // Ears and cheek highlights.
  ctx.fillStyle="#d58c68";ctx.beginPath();ctx.arc(-30,-48,7,0,Math.PI*2);ctx.arc(30,-48,7,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#ffb19a66";ctx.beginPath();ctx.ellipse(-19,-38,7,4,0,0,7);ctx.ellipse(19,-38,7,4,0,0,7);ctx.fill();
  // Hair silhouette with side-swept fringe.
  ctx.fillStyle=isBlue?"#513022":"#29202a";ctx.beginPath();ctx.moveTo(-31,-51);ctx.quadraticCurveTo(-35,-83,-5,-84);ctx.quadraticCurveTo(25,-88,32,-57);ctx.quadraticCurveTo(22,-67,10,-66);ctx.quadraticCurveTo(1,-53,-11,-58);ctx.quadraticCurveTo(-21,-53,-31,-51);ctx.fill();
  ctx.fillStyle=isBlue?"#805039":"#57404a";ctx.beginPath();ctx.moveTo(-25,-68);ctx.quadraticCurveTo(-10,-86,12,-77);ctx.quadraticCurveTo(2,-74,-4,-65);ctx.fill();
  // Eyebrows, large eyes and pupils.
  ctx.strokeStyle="#49302a";ctx.lineWidth=4;ctx.lineCap="round";ctx.beginPath();ctx.moveTo(-20,-56);ctx.quadraticCurveTo(-13,-61,-6,-56);ctx.moveTo(7,-56);ctx.quadraticCurveTo(14,-61,21,-55);ctx.stroke();
  ctx.fillStyle="#fff";ctx.beginPath();ctx.ellipse(-13,-46,7,6,0,0,7);ctx.ellipse(13,-46,7,6,0,0,7);ctx.fill();
  ctx.fillStyle="#253244";ctx.beginPath();ctx.arc(-11,-45,3,0,7);ctx.arc(11,-45,3,0,7);ctx.fill();
  ctx.fillStyle="#fff";ctx.beginPath();ctx.arc(-10,-47,1.5,0,7);ctx.arc(12,-47,1.5,0,7);ctx.fill();
  // Nose, moustache and friendly grin.
  ctx.strokeStyle="#a75f48";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,-43);ctx.lineTo(-3,-33);ctx.lineTo(3,-32);ctx.stroke();
  ctx.fillStyle=isBlue?"#593326":"#3a2730";ctx.beginPath();ctx.moveTo(-19,-29);ctx.quadraticCurveTo(-9,-35,0,-29);ctx.quadraticCurveTo(9,-35,19,-29);ctx.quadraticCurveTo(12,-19,0,-20);ctx.quadraticCurveTo(-13,-19,-19,-29);ctx.fill();
  ctx.fillStyle="#fff";ctx.beginPath();ctx.roundRect(-8,-27,16,4,2);ctx.fill();
  // Glossy cartoon outline and team rim light.
  ctx.strokeStyle="#2a1b20";ctx.lineWidth=2.5;ctx.beginPath();ctx.ellipse(0,-49,32,35,0,0,Math.PI*2);ctx.stroke();
  ctx.strokeStyle=isBlue?"#9ee1ff99":"#ffc0c899";ctx.lineWidth=3;ctx.beginPath();ctx.arc(-3,-49,33,3.7,5.3);ctx.stroke();
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
function hitPlayer(p){let dx=ball.x-p.x,dy=ball.y-(p.y-18),dist=Math.hypot(dx,dy),min=ball.r+p.r;if(dist<min){if(dist<.01)dx=p.face;const nx=dx/dist,ny=dy/dist;ball.x=p.x+nx*(min+1);ball.y=p.y-18+ny*(min+1);const force=p===player?(keys.kick?780:260):210;ball.vx=nx*force+p.vx*.55;ball.vy=ny*force- (keys.kick?300:100);}}
function kick(p,dir){if(p.kickCd>0)return;const close=Math.hypot(ball.x-p.x,ball.y-(p.y-12))<p.r+ball.r+30;if(close){const isAI=p===ai;ball.vx=dir*(isAI?245:690)+p.vx*.32;ball.vy=isAI?-105:-300;p.kickCd=isAI?1.8:.38;}}
function movePlayer(p,dt,isAI=false){let dir=0;if(isAI){const dx=ball.x-p.x;const deadZone=34;dir=dx>deadZone?1:dx<-deadZone?-1:0;const close=Math.abs(dx)<p.r+ball.r+30;if(ball.y<p.y-72&&p.onGround&&Math.abs(dx)<96){p.vy=-390;p.onGround=false;}if(close&&p.kickCd<=0&&ball.y>p.y-105)kick(p,-1);}else{dir=(keys.right?1:0)-(keys.left?1:0);if(keys.jump&&p.onGround){p.vy=-690;p.onGround=false;}if(keys.kick)kick(p,1);}p.face=dir||p.face;const maxSpeed=isAI?150:620,accel=isAI?1.9:9;p.vx+=(dir*maxSpeed-p.vx)*Math.min(1,dt*accel);p.x+=p.vx*dt;p.vy+=gravity*dt;p.y+=p.vy*dt;if(p.y>floor-72){p.y=floor-72;p.vy=0;p.onGround=true;}p.x=Math.max(42,Math.min(W-42,p.x));p.kickCd=Math.max(0,p.kickCd-dt);}
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