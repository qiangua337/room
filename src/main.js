import * as THREE from 'three';
import { createWorld, HOME_SCALE } from './world.js';
import { createDog } from './dog.js';
import './style.css';

const $=s=>document.querySelector(s),canvas=$('#scene');
let renderer;
try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});}catch(error){$('#loading').style.display='none';$('#error').hidden=false;$('#error').textContent='这个浏览器暂时无法显示 3D 场景。请使用支持 WebGL 的 Chrome、Edge 或 Safari，并开启硬件加速。';throw error}
renderer.setPixelRatio(Math.min(devicePixelRatio,1.65));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.03;
const scene=new THREE.Scene();scene.background=new THREE.Color('#dce5e3');
const camera=new THREE.PerspectiveCamera(67,innerWidth/innerHeight,.045,80);camera.rotation.order='YXZ';
const world=createWorld(scene),dog=createDog();scene.add(dog.group);dog.group.position.set(.12*HOME_SCALE,0,1.8*HOME_SCALE);
const player=new THREE.Vector3(0,1.65,4.0*HOME_SCALE);let yaw=0,pitch=.015,active=false,overview=false,night=false,follow=false,drag=null,toastTimer,selected=null,walkTime=0;
const keys=new Set(),touch={x:0,y:0},clock=new THREE.Clock();let elapsed=0,orbitAngle=.57,orbitHeight=8.1*HOME_SCALE,orbitDistance=8.3*HOME_SCALE;
const roomInfo={bedroom:['卧室','原木色，和熟悉的日常。'],wash:['洗漱区','窗边透进来的光，刚刚好。'],bath:['浴室','推开玻璃门，看看里面。'],balcony:['阳台','晾晒日常，也晒晒太阳。']};
function roomAt(p){return p.z>-.55*HOME_SCALE?'bedroom':p.z<-2.83*HOME_SCALE?'balcony':p.x<-.67*HOME_SCALE?'bath':'wash'}
function toast(text){$('#toast').textContent=text;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),2800)}
function pointSegment(x,z,a,b){const dx=b.x-a.x,dz=b.z-a.z,t=THREE.MathUtils.clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz||1),0,1);return Math.hypot(x-a.x-t*dx,z-a.z-t*dz)}
let doorSegments=[];
function free(x,z,r=.205){const b=world.bounds;if(x<b.minX+r||x>b.maxX-r||z<b.minZ+r||z>b.maxZ-r)return false;
 for(const c of world.colliders){const cx=THREE.MathUtils.clamp(x,c.minX,c.maxX),cz=THREE.MathUtils.clamp(z,c.minZ,c.maxZ);if((x-cx)**2+(z-cz)**2<r*r)return false}
 for(const s of doorSegments)if(pointSegment(x,z,s.a,s.b)<r+.026)return false;
 return true;
}
function move(pos,dx,dz,r){const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.08));for(let i=0;i<steps;i++){if(free(pos.x+dx/steps,pos.z,r))pos.x+=dx/steps;if(free(pos.x,pos.z+dz/steps,r))pos.z+=dz/steps}}
function begin(lock=false){active=true;$('#welcome').classList.add('hidden');if(overview)toggleOverview();if(lock&&!matchMedia('(pointer:coarse)').matches){try{const p=canvas.requestPointerLock();if(p?.catch)p.catch(()=>toast('按住画面拖动，也可以环顾四周'));}catch{toast('按住画面拖动，也可以环顾四周')}}$('#walkBtn').innerHTML='继续漫游 <span>↗</span>';}
$('#startBtn').onclick=()=>begin(true);$('#walkBtn').onclick=()=>begin(true);
function toggleOverview(){overview=!overview;world.setOverview(overview);document.body.classList.toggle('overview',overview);$('#overviewBtn').textContent=overview?'返回室内':'俯瞰全屋';$('#modeLabel').textContent=overview?'空间总览':'第一视角';if(overview){document.exitPointerLock?.();$('#welcome').classList.add('hidden');active=true;toast('拖动画面旋转 · 滚轮缩放')}else toast('回到第一视角');}
$('#overviewBtn').onclick=toggleOverview;
document.addEventListener('pointerlockchange',()=>{keys.clear();$('#walkBtn').innerHTML=document.pointerLockElement===canvas?'漫游中 <span>Esc 退出</span>':'进入漫游 <span>↗</span>'});
document.addEventListener('mousemove',e=>{if(document.pointerLockElement===canvas&&!overview){yaw-=e.movementX*.0022;pitch=THREE.MathUtils.clamp(pitch-e.movementY*.0022,-1.15,1.15)}});
canvas.addEventListener('pointerdown',e=>{if(document.pointerLockElement===canvas)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);if(!active)begin()});
canvas.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.x=e.clientX;drag.y=e.clientY;if(overview){orbitAngle-=dx*.006;orbitHeight=THREE.MathUtils.clamp(orbitHeight+dy*.018,4.0*HOME_SCALE,13*HOME_SCALE)}else{yaw-=dx*.004;pitch=THREE.MathUtils.clamp(pitch-dy*.004,-1.15,1.15)}});
function endDrag(){drag=null}canvas.addEventListener('pointerup',endDrag);canvas.addEventListener('pointercancel',endDrag);
canvas.addEventListener('wheel',e=>{if(overview){e.preventDefault();orbitDistance=THREE.MathUtils.clamp(orbitDistance+e.deltaY*.008,4.5*HOME_SCALE,15*HOME_SCALE)}},{passive:false});
function action(){if(selected){world.toggleDoor(selected);toast(`${selected.name}${selected.target?'正在打开':'正在关闭'}`)}else toast('靠近一扇门，再按 E 开关')}
$('#interact').onclick=action;
function callDog(){follow=!follow;$('#dogBtn').innerHTML=follow?'自由活动 <kbd>F</kbd>':'叫它过来 <kbd>F</kbd>';toast(follow?'豆豆听见啦，正在朝你走来':'豆豆开始自己散步啦');replan=0;dogGoal=null;if(soundOn)chirp()}
$('#dogBtn').onclick=callDog;
document.addEventListener('keydown',e=>{if($('#helpDialog').open)return;if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();keys.add(e.code);if(e.repeat)return;if(e.code==='KeyE')action();if(e.code==='KeyF')callDog();if(e.code==='KeyC')toast(world.toggleCurtains()?'拉开窗帘':'合上窗帘');if(e.code==='KeyM')toggleOverview();if(!active&&['KeyW','KeyA','KeyS','KeyD'].includes(e.code))begin()});
document.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>{keys.clear();touch.x=touch.y=0});
$('#helpBtn').onclick=()=>{document.exitPointerLock?.();keys.clear();$('#helpDialog').showModal()};$('#closeHelp').onclick=()=>$('#helpDialog').close();$('#helpDialog').addEventListener('click',e=>{if(e.target===$('#helpDialog'))$('#helpDialog').close()});
$('#lightBtn').onclick=()=>{night=!night;world.setNight(night);$('#lightBtn').innerHTML=night?'☾ <span>夜间</span>':'☼ <span>日间</span>';toast(night?'夜灯亮了，晚安。':'阳光回来了。')};
const destinations={bedroom:[0,3.8,0],wash:[.35,-1.7,Math.PI/2],bath:[-1.1,-1.1,0],balcony:[.2,-3.45,0]};
document.querySelectorAll('[data-room]').forEach(button=>button.onclick=()=>{const p=destinations[button.dataset.room];if(overview)toggleOverview();begin();keys.clear();touch.x=touch.y=0;player.set(p[0]*HOME_SCALE,1.65,p[1]*HOME_SCALE);yaw=p[2];pitch=-.03;toast(`来到${roomInfo[button.dataset.room][0]}`)});
const joy=$('#joystick'),stick=$('#stick');let joyId=null;
function joystick(e){const b=joy.getBoundingClientRect();let dx=e.clientX-b.left-b.width/2,dy=e.clientY-b.top-b.height/2;const len=Math.hypot(dx,dy);if(len>34){dx*=34/len;dy*=34/len}touch.x=dx/34;touch.y=-dy/34;stick.style.transform=`translate(${dx}px,${dy}px)`}
joy.addEventListener('pointerdown',e=>{begin();joyId=e.pointerId;joy.setPointerCapture(e.pointerId);joystick(e)});joy.addEventListener('pointermove',e=>{if(e.pointerId===joyId)joystick(e)});for(const event of ['pointerup','pointercancel'])joy.addEventListener(event,()=>{joyId=null;touch.x=touch.y=0;stick.style.transform=''})
// Dog routing uses the same walls, furniture and moving doors as the player.
let dogGoal=null,path=[],replan=0,wanderTimer=0,lastDogSpeed=0;
const grid=.20,nx=Math.ceil(4.3*HOME_SCALE/grid),nz=Math.ceil(8.7*HOME_SCALE/grid),gx=i=>-2.15*HOME_SCALE+i*grid,gz=j=>-4.2*HOME_SCALE+j*grid;
function route(from,to){const valid=new Uint8Array(nx*nz);for(let j=0;j<nz;j++)for(let i=0;i<nx;i++)valid[j*nx+i]=free(gx(i),gz(j),.155)?1:0;
 function nearest(p){let best=-1,d=Infinity;for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const n=j*nx+i;if(valid[n]){const q=(gx(i)-p.x)**2+(gz(j)-p.z)**2;if(q<d){d=q;best=n}}}return best}
 const start=nearest(from),end=nearest(to);if(start<0||end<0)return [];const prev=new Int32Array(nx*nz).fill(-1),queue=[start];prev[start]=start;let head=0;while(head<queue.length){const n=queue[head++];if(n===end)break;const x=n%nx,z=Math.floor(n/nx);for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]]){const a=x+dx,b=z+dz,k=b*nx+a;if(a<0||a>=nx||b<0||b>=nz||!valid[k]||prev[k]>=0)continue;prev[k]=n;queue.push(k)}}if(prev[end]===-1)return[];const points=[];let n=end;while(n!==start){points.push(new THREE.Vector3(gx(n%nx),0,gz(Math.floor(n/nx))));n=prev[n]}return points.reverse();
}
const waypoints=[new THREE.Vector3(0,0,3.45),new THREE.Vector3(.2,0,1.3),new THREE.Vector3(-.1,0,.0),new THREE.Vector3(.5,0,-1.7),new THREE.Vector3(.0,0,-3.6)].map(p=>p.multiplyScalar(HOME_SCALE));let wanderIndex=0;
function animateDog(dt,t){replan-=dt;wanderTimer-=dt;const pos=dog.group.position;const distance=Math.hypot(pos.x-player.x,pos.z-player.z);if(replan<=0){replan=.65;if(follow){dogGoal=player.clone()}else if(!dogGoal||pos.distanceTo(dogGoal)<.25||wanderTimer<0){dogGoal=waypoints[wanderIndex++%waypoints.length];wanderTimer=7}path=route(pos,dogGoal)}let speed=0;
 if(path.length&&(!follow||distance>.8)){const p=path[0],delta=p.clone().sub(pos);delta.y=0;const dist=delta.length();if(dist<.09)path.shift();else{delta.normalize();speed=follow?1.2:.46;const old=pos.clone();move(pos,delta.x*speed*dt,delta.z*speed*dt,.155);speed=old.distanceTo(pos)/dt;const target=Math.atan2(delta.x,delta.z),angle=THREE.MathUtils.euclideanModulo(target-dog.group.rotation.y+Math.PI,Math.PI*2)-Math.PI;dog.group.rotation.y+=angle*Math.min(1,dt*8)}}
 lastDogSpeed=THREE.MathUtils.damp(lastDogSpeed,speed,8,dt);dog.setSitting(follow&&distance<.86);dog.update(t,lastDogSpeed,follow&&distance<2);$('#petStatus').textContent=follow?(distance<.9?'乖乖陪着你':path.length?'正跟着你走':'在门边等你'):'在家里散步';
}
let soundOn=false,audioCtx=null,ambience=null,stepTimer=0;
function noiseBuffer(){const buffer=audioCtx.createBuffer(1,audioCtx.sampleRate*.15,audioCtx.sampleRate);const a=buffer.getChannelData(0);for(let i=0;i<a.length;i++)a[i]=(Math.random()*2-1)*(1-i/a.length);return buffer}
function footstep(){if(!soundOn)return;const s=audioCtx.createBufferSource(),f=audioCtx.createBiquadFilter(),g=audioCtx.createGain();s.buffer=noiseBuffer();f.type='lowpass';f.frequency.value=400;g.gain.value=.07;s.connect(f).connect(g).connect(audioCtx.destination);s.start()}
function chirp(){const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type='triangle';o.frequency.setValueAtTime(420,audioCtx.currentTime);o.frequency.exponentialRampToValueAtTime(250,audioCtx.currentTime+.15);g.gain.setValueAtTime(.055,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+.2);o.connect(g).connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+.22)}
$('#soundBtn').onclick=async()=>{soundOn=!soundOn;if(soundOn){audioCtx||=new(window.AudioContext||window.webkitAudioContext)();await audioCtx.resume()}$('#soundBtn').innerHTML=soundOn?'♪ <span>声音开</span>':'♪ <span>声音关</span>';toast(soundOn?'已开启脚步与互动声音':'声音已关闭')};
const map=$('#minimap'),ctx=map.getContext('2d');
function drawMap(){const w=map.width,h=map.height,s=25,ox=120,oy=130;const px=x=>ox+x*s,pz=z=>oy+z*s;ctx.clearRect(0,0,w,h);ctx.fillStyle='#e7e7dc';ctx.fillRect(px(-2.2),pz(-4.24),4.4*s,8.75*s);ctx.fillStyle='#ccd9d7';ctx.fillRect(px(-2.16),pz(-4.2),4.32*s,1.37*s);ctx.fillStyle='#d0d8cf';ctx.fillRect(px(-2.15),pz(-2.82),1.52*s,2.27*s);ctx.fillStyle='#e8e5d8';ctx.fillRect(px(-.57),pz(-2.78),2.72*s,2.2*s);
 ctx.strokeStyle='#8e9e98';ctx.lineWidth=2;ctx.strokeRect(px(-2.2),pz(-4.24),4.4*s,8.75*s);ctx.beginPath();ctx.moveTo(px(-2.2),pz(-.55));ctx.lineTo(px(-.62),pz(-.55));ctx.moveTo(px(-.62),pz(-.55));ctx.lineTo(px(-.62),pz(-2.82));ctx.lineTo(px(-2.2),pz(-2.82));ctx.moveTo(px(-.62),pz(-2.82));ctx.lineTo(px(2.2),pz(-2.82));ctx.stroke();
 for(const side of [-1,1]){ctx.fillStyle='#bcab8b';ctx.fillRect(px(side===-1?-2.1:.94),pz(-.2),1.16*s,2.18*s);ctx.fillStyle='#cfbea1';ctx.fillRect(px(side===-1?-2.1:.94),pz(1.98),1.16*s,1*s);ctx.fillStyle='#d7d3c3';ctx.fillRect(px(side===-1?-2.1:.94),pz(3.02),1.16*s,.68*s)}ctx.fillStyle='#b9c6bb';ctx.fillRect(px(1.52),pz(-2.45),.65*s,1.7*s);
 ctx.font='11px Arial';ctx.fillStyle='#667a73';ctx.textAlign='center';ctx.fillText('阳台',px(0),pz(-3.55));ctx.fillText('浴室',px(-1.42),pz(-2.2));ctx.fillText('洗漱',px(.44),pz(-1.5));ctx.fillText('卧室',px(0),pz(2.0));
 ctx.save();ctx.translate(px(player.x/HOME_SCALE),pz(player.z/HOME_SCALE));ctx.rotate(-yaw);ctx.fillStyle='#3d869533';ctx.beginPath();ctx.moveTo(0,0);ctx.arc(0,0,19,-Math.PI*.67,-Math.PI*.33);ctx.closePath();ctx.fill();ctx.restore();ctx.fillStyle='#377c8b';ctx.beginPath();ctx.arc(px(player.x/HOME_SCALE),pz(player.z/HOME_SCALE),4,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=1.5;ctx.stroke();ctx.fillStyle='#bd874b';ctx.beginPath();ctx.arc(px(dog.group.position.x/HOME_SCALE),pz(dog.group.position.z/HOME_SCALE),3,0,Math.PI*2);ctx.fill();
}
function interaction(){selected=null;let best=1.5;for(const d of world.doors){const seg=doorSegments.find(s=>s.door===d);if(!seg)continue;const distance=pointSegment(player.x,player.z,seg.a,seg.b);if(distance<best){const midpoint=seg.a.clone().add(seg.b).multiplyScalar(.5);let visible=true;for(let i=1;i<12;i++){const f=i/12,x=player.x+(midpoint.x-player.x)*f,z=player.z+(midpoint.z-player.z)*f;if(world.colliders.some(c=>x>c.minX&&x<c.maxX&&z>c.minZ&&z<c.maxZ)){visible=false;break}}if(visible){selected=d;best=distance}}}$('#interact').hidden=!selected||overview;if(selected)$('#interact span').textContent=`${selected.target?'关闭':'打开'}${selected.name}`}
let roomPrevious='',mapTick=0;
function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.04);elapsed+=dt;world.update(dt,elapsed,player);doorSegments=world.segments();let moving=false;
 if(active&&!overview&&!$('#helpDialog').open){let fw=(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0)+touch.y,rt=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0)+touch.x;const n=Math.hypot(fw,rt);if(n>.01){fw/=Math.max(1,n);rt/=Math.max(1,n);const speed=keys.has('ShiftLeft')||keys.has('ShiftRight')?2.5:1.45;const old=player.clone();move(player,(-Math.sin(yaw)*fw+Math.cos(yaw)*rt)*speed*dt,(-Math.cos(yaw)*fw-Math.sin(yaw)*rt)*speed*dt,.205);moving=old.distanceTo(player)>.001;walkTime+=dt*speed*5;stepTimer-=dt;if(moving&&stepTimer<=0){footstep();stepTimer=.43/speed*1.45}}}
 if(overview){camera.position.set(Math.sin(orbitAngle)*orbitDistance,orbitHeight,Math.cos(orbitAngle)*orbitDistance);camera.lookAt(0,.25,.05)}else{camera.position.copy(player);camera.position.y+=moving?Math.sin(walkTime)*.014:0;camera.rotation.set(pitch,yaw,0,'YXZ')}
 animateDog(dt,elapsed);mapTick+=dt;if(mapTick>.1){mapTick=0;drawMap();interaction();const room=roomAt(player);if(room!==roomPrevious){roomPrevious=room;$('#roomName').textContent=roomInfo[room][0];$('#roomDesc').textContent=roomInfo[room][1];document.querySelectorAll('[data-room]').forEach(b=>b.classList.toggle('active',b.dataset.room===room))}}
 renderer.render(scene,camera);
}
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.65))});
world.update(.01,0,player);doorSegments=world.segments();animate();$('#loading').style.opacity='0';setTimeout(()=>$('#loading').remove(),500);
// Expose read-only diagnostics useful for checking the delivered scene.
window.homeWalk={getState:()=>({room:roomAt(player),position:player.toArray(),dogPosition:dog.group.position.toArray(),doors:world.doors.map(d=>({name:d.name,open:d.openness,target:d.target})),overview,follow,night,meshes:renderer.info.render.calls}),canStand:(x,z)=>free(x,z),scene,camera,renderer};
