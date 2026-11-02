import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";

const wrap=document.getElementById("canvasWrap");
const loading=document.getElementById("gameLoading");
const blueScoreEl=document.getElementById("blueScore");
const redScoreEl=document.getElementById("redScore");
const clockEl=document.getElementById("matchClock");
const goalFlash=document.getElementById("goalFlash");
const resultOverlay=document.getElementById("resultOverlay");
const resultTitle=document.getElementById("resultTitle");
const resultScore=document.getElementById("resultScore");
const pauseBtn=document.getElementById("pauseBtn");
const restartBtn=document.getElementById("restartBtn");
const keys=new Set();
let scene,camera,renderer,clock;
let player,opponent,ball,ballVelocity=new THREE.Vector3();
let blueScore=0,redScore=0,timeLeft=300,playing=false,paused=false,goalTimeout=null,kickCooldown=0;
const field={width:20,length:32,goalWidth:5};
const playerRadius=.68;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const v3=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);

function makePlayer(color,trim){
 const group=new THREE.Group();
 const jersey=new THREE.Mesh(new THREE.CapsuleGeometry(.48,.72,5,10),new THREE.MeshStandardMaterial({color,roughness:.55}));
 jersey.position.y=1.15;group.add(jersey);
 const head=new THREE.Mesh(new THREE.SphereGeometry(.32,16,12),new THREE.MeshStandardMaterial({color:0xd9a77e,roughness:.8}));
 head.position.y=1.95;group.add(head);
 const shorts=new THREE.Mesh(new THREE.CylinderGeometry(.43,.48,.38,12),new THREE.MeshStandardMaterial({color:trim,roughness:.7}));
 shorts.position.y=.58;group.add(shorts);
 for(const side of [-1,1]){
  const leg=new THREE.Mesh(new THREE.CylinderGeometry(.13,.12,.48,10),new THREE.MeshStandardMaterial({color:0xe5edf6}));
  leg.position.set(side*.2,.22,0);group.add(leg);
  const shoe=new THREE.Mesh(new THREE.BoxGeometry(.22,.13,.38),new THREE.MeshStandardMaterial({color:trim}));
  shoe.position.set(side*.2,.08,-.08);group.add(shoe);
 }
 const shadow=new THREE.Mesh(new THREE.CircleGeometry(.62,24),new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:.25}));
 shadow.rotation.x=-Math.PI/2;shadow.position.y=.025;group.add(shadow);
 scene.add(group);return group;
}
function addLine(points,color=0xffffff,opacity=.8){
 const geo=new THREE.BufferGeometry().setFromPoints(points.map(p=>v3(p[0],.035,p[1])));
 const line=new THREE.Line(geo,new THREE.LineBasicMaterial({color,transparent:true,opacity}));scene.add(line);
}
function buildGoal(z){
 const frameMat=new THREE.MeshStandardMaterial({color:0xe8f2ff,metalness:.25,roughness:.4});
 const postGeo=new THREE.CylinderGeometry(.09,.09,2.3,10);
 for(const x of [-field.goalWidth/2,field.goalWidth/2]){
  const post=new THREE.Mesh(postGeo,frameMat);post.position.set(x,1.15,z);scene.add(post);
 }
 const bar=new THREE.Mesh(new THREE.CylinderGeometry(.09,.09,field.goalWidth,10),frameMat);
 bar.rotation.z=Math.PI/2;bar.position.set(0,2.3,z);scene.add(bar);
 const net=new THREE.Mesh(new THREE.BoxGeometry(field.goalWidth,2.2,1.1),new THREE.MeshBasicMaterial({color:0xb9d7f5,wireframe:true,transparent:true,opacity:.22}));
 net.position.set(0,1.1,z+(z>0?.5:-.5));scene.add(net);
}
function buildArena(){
 scene=new THREE.Scene();scene.background=new THREE.Color(0x07111c);scene.fog=new THREE.Fog(0x07111c,35,75);
 camera=new THREE.PerspectiveCamera(48,1,.1,120);camera.position.set(0,24,27);camera.lookAt(0,0,0);
 renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio,1.8));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
 wrap.prepend(renderer.domElement);
 scene.add(new THREE.HemisphereLight(0xcce5ff,0x24452b,2.1));
 const sun=new THREE.DirectionalLight(0xffffff,2.6);sun.position.set(-8,20,12);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);scene.add(sun);
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(70,70),new THREE.MeshStandardMaterial({color:0x101c29,roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=-.08;ground.receiveShadow=true;scene.add(ground);
 const pitch=new THREE.Mesh(new THREE.PlaneGeometry(field.width,field.length),new THREE.MeshStandardMaterial({color:0x176b43,roughness:.92}));pitch.rotation.x=-Math.PI/2;pitch.receiveShadow=true;scene.add(pitch);
 for(let i=0;i<8;i++){
  const stripe=new THREE.Mesh(new THREE.PlaneGeometry(field.width,field.length/8),new THREE.MeshStandardMaterial({color:i%2?0x176b43:0x1b7549,roughness:1}));
  stripe.rotation.x=-Math.PI/2;stripe.position.set(0,.008,-field.length/2+field.length/16+i*field.length/8);scene.add(stripe);
 }
 const white=0xe7f4e9;
 addLine([[-10,-16],[10,-16],[10,16],[-10,16],[-10,-16]],white);
 addLine([[-10,0],[10,0]],white);
 const circle=[];for(let i=0;i<=64;i++){const a=i/64*Math.PI*2;circle.push([Math.cos(a)*3.1,Math.sin(a)*3.1]);}addLine(circle,white);
 for(const z of [-16,16]){
  const dir=z<0?1:-1;
  addLine([[-5.5,z],[5.5,z],[5.5,z+dir*3],[ -5.5,z+dir*3],[-5.5,z]],white);
 }
 buildGoal(-16.25);buildGoal(16.25);
 for(const side of [-1,1]){
  for(let z=-14;z<=14;z+=7){
   const post=new THREE.Mesh(new THREE.CylinderGeometry(.12,.2,7,8),new THREE.MeshStandardMaterial({color:0x263e5a}));post.position.set(side*12,3.5,z);scene.add(post);
   const lamp=new THREE.Mesh(new THREE.BoxGeometry(1.4,.18,.45),new THREE.MeshBasicMaterial({color:0x9bcaff}));lamp.position.set(side*12,7,z);scene.add(lamp);
  }
 }
 player=makePlayer(0x168cff,0x082f5c);opponent=makePlayer(0xff5368,0x6d1422);
 const ballMesh=new THREE.Mesh(new THREE.SphereGeometry(.38,24,18),new THREE.MeshStandardMaterial({color:0xffffff,roughness:.48,metalness:.04}));ballMesh.castShadow=true;scene.add(ballMesh);ball=ballMesh;
 const seams=new THREE.Mesh(new THREE.TorusGeometry(.385,.012,4,24),new THREE.MeshStandardMaterial({color:0x17202b}));seams.rotation.x=Math.PI/2;ball.add(seams);
 const spot=new THREE.Mesh(new THREE.CircleGeometry(.42,20),new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:.22}));spot.rotation.x=-Math.PI/2;spot.position.y=-.35;ball.add(spot);
 resetPositions();resize();
}
function resize(){if(!renderer)return;const w=wrap.clientWidth,h=wrap.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
function resetPositions(){player.position.set(0,0,9);opponent.position.set(0,0,-9);player.rotation.y=0;opponent.rotation.y=Math.PI;ball.position.set(0,.4,0);ballVelocity.set(0,0,0);kickCooldown=0;}
function updateScore(){blueScoreEl.textContent=blueScore;redScoreEl.textContent=redScore;}
function showGoal(text){goalFlash.textContent=text;goalFlash.classList.add("show");clearTimeout(goalTimeout);goalTimeout=setTimeout(()=>goalFlash.classList.remove("show"),1150);}
function scoreGoal(team){if(!playing)return;if(team==="blue"){blueScore++;showGoal("GOAL! BLUE SCORES");}else{redScore++;showGoal("RED TEAM SCORES");}updateScore();setTimeout(resetPositions,850);}
function finishMatch(){playing=false;paused=false;pauseBtn.textContent="Pause";pauseBtn.disabled=true;restartBtn.disabled=false;resultTitle.textContent=blueScore>redScore?"You win!":blueScore<redScore?"AI wins":"It's a draw";resultScore.textContent=blueScore+" - "+redScore;resultOverlay.hidden=false;}
function startMatch(){blueScore=0;redScore=0;timeLeft=300;playing=true;paused=false;resultOverlay.hidden=true;pauseBtn.disabled=false;restartBtn.disabled=false;pauseBtn.textContent="Pause";updateScore();clockEl.textContent="05:00";resetPositions();}
function movePlayer(obj,dx,dz,speed,dt){const len=Math.hypot(dx,dz);if(len>.10){const strength=Math.min(1,len);const nx=dx/len,nz=dz/len;obj.position.x+=nx*speed*strength*dt;obj.position.z+=nz*speed*strength*dt;obj.rotation.y=Math.atan2(-nx,-nz);}obj.position.x=clamp(obj.position.x,-9.1,9.1);obj.position.z=clamp(obj.position.z,-14.8,14.8);}
function tryKick(shooter,forward,boost=1){
 const distance=shooter.position.distanceTo(v3(ball.position.x,0,ball.position.z));
 if(distance>1.85)return false;
 const dir=v3(ball.position.x-shooter.position.x,0,ball.position.z-shooter.position.z);
 if(dir.length()<.25)dir.set(0,0,forward);
 dir.normalize();dir.z=forward<0?Math.min(dir.z,-.48):Math.max(dir.z,.48);dir.normalize();
 ballVelocity.addScaledVector(dir,boost*13);ballVelocity.y=Math.max(ballVelocity.y,3.1);return true;
}
function updateBall(dt){
 ball.position.x+=ballVelocity.x*dt;ball.position.z+=ballVelocity.z*dt;ball.position.y+=ballVelocity.y*dt;
 ballVelocity.x*=Math.pow(.985,dt*60);ballVelocity.z*=Math.pow(.988,dt*60);ballVelocity.y-=9.8*dt;
 if(ball.position.y<.38){ball.position.y=.38;if(ballVelocity.y<-.8)ballVelocity.y*=-.28;else ballVelocity.y=0;}
 if(Math.abs(ball.position.x)>9.65){ball.position.x=Math.sign(ball.position.x)*9.65;ballVelocity.x*=-.72;}
 if(ball.position.z>16.35||ball.position.z< -16.35){
  if(Math.abs(ball.position.x)<field.goalWidth/2){scoreGoal(ball.position.z<0?"blue":"red");return;}
  ball.position.z=clamp(ball.position.z,-16.35,16.35);ballVelocity.z*=-.7;
 }
 for(const p of [player,opponent]){
  const dx=ball.position.x-p.position.x,dz=ball.position.z-p.position.z,dist=Math.hypot(dx,dz);
  if(dist<1.05&&dist>.01){ball.position.x=p.position.x+dx/dist*1.05;ball.position.z=p.position.z+dz/dist*1.05;ballVelocity.x+=dx/dist*1.5;ballVelocity.z+=dz/dist*1.5;}
 }
}
function updateAI(dt){
 const targetX=ball.position.x*.8,targetZ=clamp(ball.position.z-1.15,-13.5,-1.5);
 const dx=targetX-opponent.position.x,dz=targetZ-opponent.position.z;
 movePlayer(opponent,dx,dz,3.55,dt);
 if(opponent.position.distanceTo(v3(ball.position.x,0,ball.position.z))<1.65&&ball.position.z>-14)tryKick(opponent,1,.88);
}
function update(dt){
 if(!playing||paused)return;
 const sprint=keys.has("ShiftLeft")||keys.has("ShiftRight")?6.2:4.6;
 let dx=(keys.has("KeyD")||keys.has("ArrowRight")?1:0)-(keys.has("KeyA")||keys.has("ArrowLeft")?1:0);
 let dz=(keys.has("KeyS")||keys.has("ArrowDown")?1:0)-(keys.has("KeyW")||keys.has("ArrowUp")?1:0);
 dx+=touchMove.x;dz+=touchMove.y;
 movePlayer(player,dx,dz,sprint,dt);
 if(touchShoot){tryKick(player,-1,1.08);touchShoot=false;}
 updateAI(dt);updateBall(dt);
 timeLeft=Math.max(0,timeLeft-dt);const sec=Math.ceil(timeLeft);clockEl.textContent=String(Math.floor(sec/60)).padStart(2,"0")+":"+String(sec%60).padStart(2,"0");if(timeLeft<=0)finishMatch();
}
function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.04);update(dt);if(player){const desired=v3(player.position.x*.16,23,27);camera.position.lerp(desired,.045);camera.lookAt(player.position.x*.12,0,0);}renderer.render(scene,camera);}
const touchMove={x:0,y:0};let touchShoot=false;
function setupTouch(){
 const pad=document.getElementById("touchPad"),dot=document.getElementById("padDot");let active=false,pointerId=null;
 const reset=()=>{active=false;touchMove.x=0;touchMove.y=0;dot.style.transform="translate(0,0)";};
 pad.addEventListener("pointerdown",e=>{active=true;pointerId=e.pointerId;pad.setPointerCapture(pointerId);updatePad(e);});
 pad.addEventListener("pointermove",e=>{if(active&&e.pointerId===pointerId)updatePad(e);});
 pad.addEventListener("pointerup",reset);pad.addEventListener("pointercancel",reset);
 function updatePad(e){const r=pad.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;let x=e.clientX-cx,y=e.clientY-cy;const max=Math.min(r.width,r.height)*.34,l=Math.hypot(x,y);if(l>max){x=x/l*max;y=y/l*max;}const raw=Math.min(1,Math.hypot(x,y)/max);const dead=.13;const strength=raw<dead?0:(raw-dead)/(1-dead);const angle=Math.atan2(y,x);touchMove.x=Math.cos(angle)*strength;touchMove.y=Math.sin(angle)*strength;dot.style.transform="translate("+x+"px,"+y+"px)";}
 document.getElementById("shootBtn").addEventListener("pointerdown",e=>{e.preventDefault();touchShoot=true;});
 document.getElementById("sprintBtn").addEventListener("pointerdown",()=>{keys.add("ShiftLeft");});
 document.getElementById("sprintBtn").addEventListener("pointerup",()=>keys.delete("ShiftLeft"));
 document.getElementById("sprintBtn").addEventListener("pointercancel",()=>keys.delete("ShiftLeft"));
}
window.addEventListener("keydown",e=>{if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Space"].includes(e.code))e.preventDefault();if(e.code==="Space"){if(!e.repeat)touchShoot=true;return;}keys.add(e.code);});
window.addEventListener("keyup",e=>keys.delete(e.code));
window.addEventListener("blur",()=>{keys.clear();touchMove.x=0;touchMove.y=0;});
document.getElementById("aiMode").addEventListener("click",()=>{document.getElementById("aiMode").classList.add("active");document.getElementById("onlineMode").classList.remove("active");document.getElementById("modeNote").textContent="Single Player is playable now. Online rooms and live matchmaking are planned for the multiplayer phase.";});
document.getElementById("onlineMode").addEventListener("click",()=>{document.getElementById("modeNote").textContent="Online Multiplayer is planned for Phase 3. Room creation, live synchronization and fair match validation are not active yet.";});
pauseBtn.addEventListener("click",()=>{if(!playing)return;paused=!paused;pauseBtn.textContent=paused?"Resume":"Pause";});
restartBtn.addEventListener("click",startMatch);document.getElementById("playAgainBtn").addEventListener("click",startMatch);
window.addEventListener("resize",resize);
try{buildArena();clock=new THREE.Clock();setupTouch();loading.classList.add("done");pauseBtn.disabled=false;restartBtn.disabled=false;startMatch();animate();}catch(error){loading.textContent="The 3D game could not start. Please use an updated browser with WebGL enabled.";console.error(error);}
