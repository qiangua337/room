import * as THREE from 'three';
import { createWorld, HOME_SCALE, HOME_WIDTH, SUITE_OFFSET } from './world.js';
import { createDog } from './dog.js';
import { createNavigation, pointSegment } from './navigation.js';
import './style.css';

const $=s=>document.querySelector(s),canvas=$('#scene'),S=HOME_SCALE;
let renderer;
try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});}
catch(error){$('#loading').remove();$('#error').hidden=false;$('#error').textContent='暂时无法显示 3D 场景。请用支持 WebGL 的浏览器，并开启硬件加速。';throw error;}
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.94;
const scene=new THREE.Scene();scene.background=new THREE.Color('#dce5e3');
const viewFov=()=>innerWidth/innerHeight<.8?88:74;
const camera=new THREE.PerspectiveCamera(viewFov(),innerWidth/innerHeight,.04,100);camera.rotation.order='YXZ';
const world=createWorld(scene),nav=createNavigation(world,S),dog=createDog();
dog.group.scale.setScalar(.92*1.25*S);dog.group.position.set(.14*S,0,1.8*S);scene.add(dog.group);
// Store feet separately from the eye, using the architecture's scale throughout.
const player=new THREE.Vector3(0,0,4*S),eyeHeight=1.68*S;
let yaw=0,pitch=innerWidth/innerHeight<.8?-.20:-.055,active=false,overview=false,night=false,follow=true,drag=null,selected=null,toastTimer;
let walkTime=0,elapsed=0,mapTick=0,loft=null,climb=null,deskSide=null,orbitAngle=.57,orbitHeight=8.1*S,orbitDistance=8.3*S;
const clock=new THREE.Clock(),keys=new Set(),touch={x:0,y:0};
const roomInfo={bedroom:['卧室','两侧是熟悉的床铺，中间留给散步。'],wash:['洗漱区','打开水龙头，或去窗边看看。'],bath:['浴室','浴室门和淋浴门都可以开关。'],balcony:['阳台','窗外的光，和轻轻晃动的衣服。']};
function roomAt(p){return p.z>-.55*S?'bedroom':p.z<-2.83*S?'balcony':p.x<-.67*S?'bath':'wash';}
function toast(text){$('#toast').textContent=text;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),3000);}
function begin(lock=false){active=true;$('#welcome').classList.add('hidden');$('#welcome').hidden=true;document.body.classList.add('walking');if(overview)toggleOverview();if(lock&&!matchMedia('(pointer:coarse)').matches){try{canvas.requestPointerLock()?.catch?.(()=>toast('按住画面拖动，也可以环顾四周'));}catch{toast('按住画面拖动，也可以环顾四周');}}}
$('#startBtn').onclick=()=>begin(true);$('#walkBtn').onclick=()=>begin(true);
function toggleOverview(){if(climb)return;overview=!overview;world.setOverview(overview);document.body.classList.toggle('overview',overview);$('#overviewBtn').textContent=overview?'返回室内':'俯瞰全屋';$('#modeLabel').textContent=overview?'空间总览':'第一视角';if(overview){document.exitPointerLock?.();keys.clear();$('#welcome').classList.add('hidden');$('#welcome').hidden=true;active=true;toast('拖动画面旋转 · 滚轮缩放');}}
$('#overviewBtn').onclick=toggleOverview;
$('#mapToggle').onclick=()=>{const open=!document.body.classList.contains('map-open');document.body.classList.toggle('map-open',open);$('#mapToggle').setAttribute('aria-expanded',String(open));};
document.addEventListener('pointerlockchange',()=>{keys.clear();$('#walkBtn').textContent=document.pointerLockElement===canvas?'Esc 释放鼠标':'锁定鼠标';});
document.addEventListener('mousemove',e=>{if(document.pointerLockElement===canvas&&!overview){yaw-=e.movementX*.0022;pitch=THREE.MathUtils.clamp(pitch-e.movementY*.0022,-1.25,1.15);}});
canvas.addEventListener('pointerdown',e=>{if(document.pointerLockElement===canvas)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);if(!active)begin();});
canvas.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.x=e.clientX;drag.y=e.clientY;if(overview){orbitAngle-=dx*.006;orbitHeight=THREE.MathUtils.clamp(orbitHeight+dy*.018,4*S,13*S);}else{yaw-=dx*.004;pitch=THREE.MathUtils.clamp(pitch-dy*.004,-1.25,1.15);}});
for(const event of ['pointerup','pointercancel'])canvas.addEventListener(event,()=>{drag=null;});
canvas.addEventListener('wheel',e=>{if(overview){e.preventDefault();orbitDistance=THREE.MathUtils.clamp(orbitDistance+e.deltaY*.008,4.5*S,15*S);}},{passive:false});

function interactItem(item){toast(item.toggle());replan=0;if(soundOn)chirp();updateDeskButtons();}
function action(){if(climb)return;interaction();if(selected?.type==='stair')startClimb(selected.stair);else if(selected?.type==='down')startClimb(loft,true);else if(selected?.type==='pet')petDog();else if(selected?.door){world.toggleDoor(selected.door);replan=0;toast(`${selected.door.name}${selected.door.target?'正在打开':'正在关闭'}`);}else if(selected?.item)interactItem(selected.item);else toast('靠近门、桌子或楼梯，会出现互动提示');}
$('#interact').onclick=action;
function callDog(){follow=!follow;path=[];dogGoal=null;replan=0;wanderTimer=0;$('#dogBtn').textContent=follow?'自由活动':'跟着我';toast(follow?'豆豆会走在你前方，陪你一起逛':'豆豆去自己散步了');if(soundOn)chirp();}
$('#dogBtn').onclick=callDog;
function lookAtDog(){if(overview)toggleOverview();begin();dogLookPauseUntil=elapsed+3;const dx=dog.group.position.x-player.x,dz=dog.group.position.z-player.z;yaw=Math.atan2(-dx,-dz);pitch=THREE.MathUtils.clamp(Math.atan2(.4*S-camera.position.y,Math.hypot(dx,dz)),-1.25,1.15);toast('豆豆在这里，尾巴也在动');}
$('#findDogBtn').onclick=lookAtDog;
let happyUntil=0,dogLookPauseUntil=0;
function petDog(){happyUntil=elapsed+4;dog.setSitting(true);path=[];toast('摸摸豆豆，它开心地摇起尾巴');if(soundOn)chirp();}
document.addEventListener('keydown',e=>{if($('#helpDialog').open)return;if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();keys.add(e.code);if(e.repeat)return;if(e.code==='KeyE')action();if(e.code==='KeyF')callDog();if(e.code==='KeyG')lookAtDog();if(e.code==='KeyC')toast(world.toggleCurtains()?'拉开窗帘':'合上窗帘');if(e.code==='KeyM')$('#mapToggle').click();if(!active&&['KeyW','KeyA','KeyS','KeyD','ArrowUp'].includes(e.code))begin();});
document.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>{keys.clear();touch.x=touch.y=0;});
$('#helpBtn').onclick=()=>{document.exitPointerLock?.();keys.clear();$('#helpDialog').showModal();};$('#closeHelp').onclick=()=>$('#helpDialog').close();$('#helpDialog').addEventListener('click',e=>{if(e.target===$('#helpDialog'))$('#helpDialog').close();});
$('#lightBtn').onclick=()=>{night=!night;world.setNight(night);$('#lightBtn').innerHTML=night?'☾ <span>夜间</span>':'☼ <span>日间</span>';toast(night?'夜灯亮了':'阳光回来了');};
$('#curtainBtn').onclick=()=>toast(world.toggleCurtains()?'拉开窗帘':'合上窗帘');

const destinations={bedroom:[0,3.8,0,-.055],wash:[.55,-1.60,-Math.PI/2,-.18],bath:[-1.08,-1.08,.55,-.15],balcony:[.10,-3.10,.22,-.07],'left-desk':[-1.38,.28,Math.PI*.65,-.34],'right-desk':[1.38,.28,-Math.PI*.65,-.34],'left-stair':[-1.53,3.23,0,-.10],'right-stair':[1.53,3.23,0,-.10],'left-cabinet':[-.8,3.61,Math.PI/2,-.20],'right-cabinet':[.8,3.61,-Math.PI/2,-.20]};
function quickVisit(key){
 if(climb)return;const p=destinations[key];if(!p)return;begin();keys.clear();touch.x=touch.y=0;loft=null;document.body.classList.remove('on-loft');
 const required=key==='bath'?'浴室门':key==='balcony'?'阳台门':null;if(required)world.doors.find(d=>d.name===required).target=1;
 nav.refresh();const target=new THREE.Vector3(p[0]*S,0,p[1]*S);
 if(!nav.free(target.x,target.z)){const options=[[0,.3],[.3,0],[-.3,0],[0,-.3],[.6,0],[-.6,0]],pair=options.find(([x,z])=>nav.free(target.x+x*S,target.z+z*S));if(!pair){toast('这里的门或家具挡住了，请先打开再过来');return;}target.x+=pair[0]*S;target.z+=pair[1]*S;}
 player.copy(target);yaw=p[2];pitch=p[3]-(key==='bedroom'&&innerWidth/innerHeight<.8?.15:0);replan=0;interaction();
 toast(key.includes('desk')?'桌面可以开灯、开合电脑和拉抽屉':key.includes('stair')?'靠近楼梯，按 E 登上上铺':key.includes('cabinet')?'按 E 打开衣柜，看看里面的层板':`来到${roomInfo[key][0]}`);
 if(innerWidth<760){document.body.classList.remove('map-open');$('#mapToggle').setAttribute('aria-expanded','false');}
}
document.querySelectorAll('[data-room]').forEach(b=>b.onclick=()=>quickVisit(b.dataset.room));document.querySelectorAll('[data-visit]').forEach(b=>b.onclick=()=>quickVisit(b.dataset.visit));
function startClimb(stair,descending=false){
 if(!stair||climb)return;begin();keys.clear();touch.x=touch.y=0;
 if(!descending){const approach=nav.route(player,stair.entry,nav.playerRadius),end=approach.at(-1);if(!end||Math.hypot(end.x-stair.entry.x,end.z-stair.entry.z)>.05*S){toast('请先关好旁边的柜门，从楼梯下方靠近');return;}climb={stair,points:[player.clone(),...approach.map(p=>new THREE.Vector3(p.x,0,p.z)),...stair.climb.slice(1)],index:0,progress:0,descending:false};yaw=0;pitch=-.09;toast('沿着储物阶梯登上上铺');}
 else{climb={stair,points:[player.clone(),stair.top,...stair.climb.slice(0,-1).reverse()],index:0,progress:0,descending:true};yaw=Math.PI;pitch=-.28;toast('沿楼梯回到地面');}
 document.body.classList.add('climbing');
}
function advanceClimb(dt){
 const a=climb.points[climb.index],b=climb.points[climb.index+1],distance=Math.hypot(b.x-a.x,b.z-a.z,b.y-a.y);
 climb.progress+=dt/Math.max(.32,distance/(1.25*S));const t=Math.min(1,climb.progress),smooth=t*t*(3-2*t),lift=b.y>a.y?Math.min(1,t*1.5):t;
 player.set(THREE.MathUtils.lerp(a.x,b.x,smooth),THREE.MathUtils.lerp(a.y,b.y,lift*lift*(3-2*lift)),THREE.MathUtils.lerp(a.z,b.z,smooth));
 $('#climbStatus').textContent=climb.descending?'正在下楼梯':`正在登阶 ${Math.min(4,Math.max(1,climb.index-1))} / 4`;
 if(t>=1){climb.index++;climb.progress=0;footstep();if(climb.index===climb.points.length-1){loft=climb.descending?null:climb.stair;toast(loft?'到上铺了 · 低头慢慢走，按 E 下楼梯':'回到地面了');climb=null;document.body.classList.remove('climbing');document.body.classList.toggle('on-loft',!!loft);pitch=loft?-.10:-.055;}}
}

const joy=$('#joystick'),stick=$('#stick');let joyId=null;
function joystick(e){const b=joy.getBoundingClientRect();let dx=e.clientX-b.left-b.width/2,dy=e.clientY-b.top-b.height/2;const len=Math.hypot(dx,dy);if(len>34){dx*=34/len;dy*=34/len;}touch.x=dx/34;touch.y=-dy/34;stick.style.transform=`translate(${dx}px,${dy}px)`;}
joy.addEventListener('pointerdown',e=>{begin();joyId=e.pointerId;joy.setPointerCapture(e.pointerId);joystick(e);});joy.addEventListener('pointermove',e=>{if(e.pointerId===joyId)joystick(e);});for(const event of ['pointerup','pointercancel'])joy.addEventListener(event,()=>{joyId=null;touch.x=touch.y=0;stick.style.transform='';});

let dogGoal=null,path=[],replan=0,wanderTimer=8,lastDogSpeed=0,wanderIndex=1,dogSight=true,nextSightCheck=0;
const petSightRay=new THREE.Raycaster();
function dogLineVisible(){
 const target=dog.group.position.clone();target.y=.35*S;const direction=target.sub(camera.position),distance=direction.length();
 petSightRay.set(camera.position,direction.normalize());petSightRay.near=.04;petSightRay.far=distance+.12*S;dog.group.updateMatrixWorld(true);
 for(const hit of petSightRay.intersectObject(scene,true)){const m=hit.object.material;if(!hit.object.visible||m?.transparent||(Array.isArray(m)&&m.every(x=>x.transparent)))continue;let p=hit.object;while(p){if(p===dog.group)return true;p=p.parent;}return false;}return false;
}
const waypoints=[[.14,1.8],[0,.05],[.48,-1.6],[.10,-3.45],[0,3.3]].map(([x,z])=>new THREE.Vector3(x*S,0,z*S));
function followGoal(){
 if(loft||climb){const stair=loft||climb.stair;return new THREE.Vector3(stair.side*.82*S,0,3.15*S);}
 const forward=new THREE.Vector3(-Math.sin(yaw),0,-Math.cos(yaw)),right=new THREE.Vector3(Math.cos(yaw),0,-Math.sin(yaw));
 const room=roomAt(player),candidates=[[2.05,.2],[1.8,-.35],[1.5,.5],[1.5,-.5],[.95,.25],[.85,-.2],[-.8,0]];
 for(const [d,s]of candidates){const q=player.clone().addScaledVector(forward,d*S).addScaledVector(right,s*S);q.y=0;if(roomAt(q)===room&&nav.free(q.x,q.z,nav.dogRadius))return q;}
 for(const distance of [1.2,.85,.70])for(let i=0;i<12;i++){const a=yaw+i*Math.PI/6,q=new THREE.Vector3(player.x-Math.sin(a)*distance*S,0,player.z-Math.cos(a)*distance*S);if(roomAt(q)===room&&nav.free(q.x,q.z,nav.dogRadius))return q;}
 for(const [d,s]of candidates){const q=player.clone().addScaledVector(forward,d*S).addScaledVector(right,s*S);q.y=0;if(nav.free(q.x,q.z,nav.dogRadius))return q;}
 return new THREE.Vector3(player.x,0,player.z);
}
function animateDog(dt,t){
 replan-=dt;wanderTimer-=active?dt:0;const pos=dog.group.position;let speed=0;
 if(active&&happyUntil<t&&dogLookPauseUntil<t){
  if(replan<=0){replan=.85;if(follow)dogGoal=followGoal();else if(!dogGoal||Math.hypot(pos.x-dogGoal.x,pos.z-dogGoal.z)<.22*S||wanderTimer<0){dogGoal=waypoints[wanderIndex++%waypoints.length];wanderTimer=7;}const avoid=player.y<.5*S&&Math.hypot(pos.x-player.x,pos.z-player.z)>.62*S?[{x:player.x,z:player.z,radius:.36*S}]:[];path=nav.route(pos,dogGoal,nav.dogRadius,avoid);}
  if(path.length){const p=path[0],dx=p.x-pos.x,dz=p.z-pos.z,distance=Math.hypot(dx,dz);if(distance<.065*S)path.shift();else{const pace=(follow?1.1:.48)*S,step=Math.min(distance,pace*dt),old=pos.clone(),xx=pos.x+dx/distance*step,zz=pos.z+dz/distance*step;if(Math.hypot(xx-player.x,zz-player.z)>.58*S||Math.hypot(xx-player.x,zz-player.z)>Math.hypot(pos.x-player.x,pos.z-player.z)||player.y>.7*S)nav.move(pos,dx/distance*step,dz/distance*step,nav.dogRadius);speed=old.distanceTo(pos)/dt;const target=Math.atan2(dx,dz),angle=THREE.MathUtils.euclideanModulo(target-dog.group.rotation.y+Math.PI,Math.PI*2)-Math.PI;dog.group.rotation.y+=angle*Math.min(1,dt*7);}}
 }
 const distance=Math.hypot(pos.x-player.x,pos.z-player.z),arrived=dogGoal&&Math.hypot(pos.x-dogGoal.x,pos.z-dogGoal.z)<.25*S;
 if(follow&&arrived&&speed<.05){const target=Math.atan2(player.x-pos.x,player.z-pos.z),angle=THREE.MathUtils.euclideanModulo(target-dog.group.rotation.y+Math.PI,Math.PI*2)-Math.PI;dog.group.rotation.y+=angle*Math.min(1,dt*3);}
 lastDogSpeed=THREE.MathUtils.damp(lastDogSpeed,speed,8,dt);dog.setSitting(happyUntil>t||(follow&&arrived&&speed<.05));dog.update(t,lastDogSpeed/(S*1.25),happyUntil>t||(follow&&distance<3*S));
 $('#petStatus').textContent=!active?'在前面等你':happyUntil>t?'开心地摇尾巴':loft||climb?'在楼梯下面等你':follow?(arrived?'就在你附近':speed>.05?'正在跟着你走':'在门边等你'):'在家里散步';
 const label=pos.clone();label.y=.7*S;label.project(camera);if(t>=nextSightCheck){nextSightCheck=t+.25;dogSight=dogLineVisible();}const visible=!overview&&dogSight&&label.z<1&&label.z>-1&&Math.abs(label.x)<.91&&Math.abs(label.y)<.86;
 $('#dogLabel').hidden=!visible;if(visible){$('#dogLabel').style.left=`${(label.x*.5+.5)*innerWidth}px`;$('#dogLabel').style.top=`${(-label.y*.5+.5)*innerHeight}px`;}
}

let soundOn=false,audioCtx=null,stepTimer=0;
function footstep(){if(!soundOn)return;const buffer=audioCtx.createBuffer(1,audioCtx.sampleRate*.13,audioCtx.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*(1-i/data.length);const source=audioCtx.createBufferSource(),filter=audioCtx.createBiquadFilter(),gain=audioCtx.createGain();source.buffer=buffer;filter.type='lowpass';filter.frequency.value=roomAt(player)==='bedroom'?350:650;gain.gain.value=.055;source.connect(filter).connect(gain).connect(audioCtx.destination);source.start();}
function chirp(){const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type='triangle';o.frequency.setValueAtTime(420,audioCtx.currentTime);o.frequency.exponentialRampToValueAtTime(250,audioCtx.currentTime+.15);g.gain.setValueAtTime(.04,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+.2);o.connect(g).connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+.22);}
$('#soundBtn').onclick=async()=>{soundOn=!soundOn;if(soundOn){audioCtx||=new(window.AudioContext||window.webkitAudioContext)();await audioCtx.resume();}$('#soundBtn').innerHTML=soundOn?'♪ <span>声音开</span>':'♪ <span>声音关</span>';toast(soundOn?'已开启脚步和互动声音':'声音已关闭');};

function lineOfSight(a,b){const count=Math.ceil(Math.hypot(a.x-b.x,a.z-b.z)/(.06*S));for(let i=1;i<count;i++){const t=i/count,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t;if(world.colliders.some(c=>c.kind==='wall'&&x>c.minX&&x<c.maxX&&z>c.minZ&&z<c.maxZ))return false;}return true;}
function interaction(){
 selected=null;deskSide=null;let best=Infinity;
 function consider(option,p,maxDistance,bias=0){const dx=p.x-player.x,dz=p.z-player.z,distance=Math.hypot(dx,dz);if(distance>maxDistance*S||!lineOfSight(player,p))return;const ahead=(-Math.sin(yaw)*dx-Math.cos(yaw)*dz)/(distance||1);if(ahead<-.12)return;const score=distance/S+(1-ahead)*.5+bias;if(score<best){best=score;selected=option;}}
 if(!overview&&!climb){
  if(loft)selected={type:'down',label:'沿楼梯下去'};
  else{
   for(const d of world.doors){const s=nav.segments.find(s=>s.door===d);if(!s)continue;const dx=s.b.x-s.a.x,dz=s.b.z-s.a.z,t=THREE.MathUtils.clamp(((player.x-s.a.x)*dx+(player.z-s.a.z)*dz)/(dx*dx+dz*dz),.12,.88);consider({door:d,label:`${d.target?'关闭':'打开'}${d.name}`},{x:s.a.x+t*dx,z:s.a.z+t*dz},1.15);}
   for(const item of world.interactions){const p=item.anchor.getWorldPosition(new THREE.Vector3());consider({item,label:item.label},p,item.type==='tap'?1.80:1.12,.10);if(['lamp','laptop','drawer'].includes(item.type)&&Math.hypot(p.x-player.x,p.z-player.z)<1.48*S&&lineOfSight(player,p))deskSide=item.side;}
   for(const stair of world.stairs)consider({type:'stair',stair,label:`登上${stair.name}`},stair.entry,.70,-.05);
   consider({type:'pet',label:'摸摸豆豆'},dog.group.position,.95,-.20);
  }
 }
 $('#interact').hidden=!selected;if(selected)$('#interact span').textContent=selected.label;$('#deskPanel').hidden=deskSide===null||overview||!!loft||!!climb;if(deskSide!==null){$('#deskTitle').textContent=deskSide<0?'左侧书桌':'右侧书桌';updateDeskButtons();}
}
function updateDeskButtons(){if(deskSide===null)return;document.querySelectorAll('[data-desk-action]').forEach(button=>{const item=world.interactions.find(i=>i.side===deskSide&&i.type===button.dataset.deskAction);button.textContent=item.label;button.setAttribute('aria-pressed',String(item.state));});}
document.querySelectorAll('[data-desk-action]').forEach(button=>button.onclick=()=>{if(deskSide===null||climb||loft)return;interactItem(world.interactions.find(i=>i.side===deskSide&&i.type===button.dataset.deskAction));});

const map=$('#minimap'),ctx=map.getContext('2d');let blockedItemPrevious=null;
function drawMap(){
 const s=25,ox=120,oy=120,px=x=>ox+x*s,pz=z=>oy+z*s;
 ctx.clearRect(0,0,map.width,map.height);ctx.fillStyle='#ece8dc';ctx.fillRect(px(-HOME_WIDTH/2),pz(-4.23),HOME_WIDTH*s,8.73*s);ctx.fillStyle='#ceddd9';ctx.fillRect(px(-2.55),pz(-4.23),5.1*s,1.4*s);ctx.fillStyle='#d7dcd2';ctx.fillRect(px(-2.55),pz(-2.82),1.93*s,2.27*s);
 ctx.strokeStyle='#8d9f97';ctx.lineWidth=2;ctx.strokeRect(px(-2.55),pz(-4.23),5.1*s,8.73*s);ctx.beginPath();ctx.moveTo(px(-2.55),pz(-.55));ctx.lineTo(px(-.62),pz(-.55));ctx.moveTo(px(-.62),pz(-.55));ctx.lineTo(px(-.62),pz(-2.82));ctx.lineTo(px(-2.55),pz(-2.82));ctx.moveTo(px(-.62),pz(-2.82));ctx.lineTo(px(2.55),pz(-2.82));ctx.stroke();
 for(const side of [-1,1]){const x=side<0?-SUITE_OFFSET-1.17:SUITE_OFFSET;ctx.fillStyle='#bda57e';ctx.fillRect(px(x),pz(-.17),1.17*s,2.1*s);ctx.fillStyle='#d7c5a6';ctx.fillRect(px(x),pz(1.98),1.17*s,1*s);for(let i=0;i<4;i++){ctx.strokeStyle='#b7a58c';ctx.beginPath();ctx.moveTo(px(x),pz(2+i*.247));ctx.lineTo(px(x+1.17),pz(2+i*.247));ctx.stroke();}ctx.fillStyle='#d0cebd';ctx.fillRect(px(side<0?-2.46:1.79),pz(3.02),.67*s,1.2*s);}
 ctx.fillStyle='#b7c6b7';ctx.fillRect(px(1.87),pz(-2.45),.65*s,1.7*s);for(const segment of nav.segments.filter(s=>s.door)){ctx.strokeStyle=segment.door.target?'#6b9c91':'#45686b';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(px(segment.a.x/S),pz(segment.a.z/S));ctx.lineTo(px(segment.b.x/S),pz(segment.b.z/S));ctx.stroke();}
 ctx.font='11px Arial';ctx.fillStyle='#66776f';ctx.textAlign='center';for(const [label,x,z]of [['阳台',0,-3.55],['浴室',-1.58,-2.25],['洗漱',.72,-1.65],['卧室',0,1.75]])ctx.fillText(label,px(x),pz(z));
 ctx.save();ctx.translate(px(player.x/S),pz(player.z/S));ctx.rotate(-yaw);ctx.fillStyle='#3d86952e';ctx.beginPath();ctx.moveTo(0,0);ctx.arc(0,0,19,-Math.PI*.67,-Math.PI*.33);ctx.closePath();ctx.fill();ctx.restore();for(const [p,r,color]of [[player,4,'#377c8b'],[dog.group.position,3,'#bd874b']]){ctx.fillStyle=color;ctx.beginPath();ctx.arc(px(p.x/S),pz(p.z/S),r,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=1.5;ctx.stroke();}
}
function diagnostics(){const dogBox=new THREE.Box3().setFromObject(dog.group),frustum=new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));return{version:'2026.09.30',room:roomAt(player),position:player.toArray(),eyeY:camera.position.y,standingHeight:eyeHeight,scale:S,loft:loft?.name||null,climbing:!!climb,dogPosition:dog.group.position.toArray(),dogInView:frustum.intersectsBox(dogBox)&&dogSight,dogSpeed:lastDogSpeed,follow,overview,night,doors:world.doors.map(d=>({name:d.name,open:Math.round(d.openness*100)/100,target:d.target})),items:world.interactions.map(i=>({id:i.id,on:i.state})),drawCalls:renderer.info.render.calls};}
function animate(){
 requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.05);elapsed+=dt;world.update(dt,elapsed,[player,dog.group.position]);nav.refresh();let moving=false;
 if(climb)advanceClimb(dt);
 else if(active&&!overview&&!$('#helpDialog').open){
  let fw=(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0)+touch.y,rt=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0)+touch.x;const n=Math.hypot(fw,rt);
  if(n>.01){fw/=Math.max(1,n);rt/=Math.max(1,n);const speed=(loft ? .62 : keys.has('ShiftLeft')||keys.has('ShiftRight')?2.45:1.5)*S,old=player.clone(),dx=(-Math.sin(yaw)*fw+Math.cos(yaw)*rt)*speed*dt,dz=(-Math.cos(yaw)*fw-Math.sin(yaw)*rt)*speed*dt;if(loft){player.x=THREE.MathUtils.clamp(player.x+dx,loft.bounds.minX,loft.bounds.maxX);player.z=THREE.MathUtils.clamp(player.z+dz,loft.bounds.minZ,loft.bounds.maxZ);}else nav.move(player,dx,dz);moving=old.distanceTo(player)>.001;walkTime+=dt*speed/S*5;stepTimer-=dt;if(moving&&stepTimer<=0){footstep();stepTimer=.43/(speed/S)*1.5;}}
 }
 if(overview){camera.position.set(Math.sin(orbitAngle)*orbitDistance,orbitHeight,Math.cos(orbitAngle)*orbitDistance);camera.lookAt(0,.25*S,.05*S);}else{const stair=loft||climb?.stair;camera.position.copy(player);camera.position.y+=(stair?stair.eyeHeight(player.y):eyeHeight)+(moving?Math.sin(walkTime)*.008*S:0);camera.rotation.set(pitch,yaw,0,'YXZ');}
 camera.updateMatrixWorld();animateDog(dt,elapsed);mapTick+=dt;if(mapTick>.16){mapTick=0;drawMap();interaction();const blocked=world.interactions.find(i=>i.blocked);if(blocked&&blocked!==blockedItemPrevious)toast(`后退一点，给${blocked.name}留出打开空间`);blockedItemPrevious=blocked;const room=roomAt(player);$('#roomName').textContent=loft?loft.name:roomInfo[room][0];$('#roomDesc').textContent=loft?'上铺空间较低，已自动降低视线。':roomInfo[room][1];document.querySelectorAll('[data-room]').forEach(b=>b.classList.toggle('active',b.dataset.room===room));document.body.dataset.walkState=JSON.stringify(diagnostics());}
 renderer.render(scene,camera);
}
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.fov=viewFov();camera.updateProjectionMatrix();if(!active)pitch=innerWidth/innerHeight<.8?-.20:-.055;renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));});
world.update(.01,0,[]);nav.refresh();animate();$('#loading').style.opacity='0';setTimeout(()=>$('#loading').remove(),500);
window.homeWalk={getState:diagnostics,canStand:nav.free};
