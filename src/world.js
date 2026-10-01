import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { createLoftSuite } from './furniture.js';

export const HOME_SCALE=2;
export function createWorld(rootScene){
 const scene=new THREE.Group();rootScene.add(scene);scene.scale.setScalar(HOME_SCALE);
 const colliders=[],doors=[],roof=[],cutWalls=[],animated=[],lights=[];
 const mat=(color,roughness=.72,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
 function texture(kind){const c=document.createElement('canvas');c.width=c.height=512;const g=c.getContext('2d');let seed=33;const rnd=()=>{seed=(seed*16807)%2147483647;return seed/2147483647};
  g.fillStyle=kind==='wood'?'#ba9b6a':kind==='floor'?'#c0ae90':'#d8d6cb';g.fillRect(0,0,512,512);
  for(let i=0;i<2500;i++){let v=rnd();g.strokeStyle=kind==='wood'?`rgba(92,62,30,${v*.12})`:`rgba(70,64,53,${v*.04})`;g.lineWidth=rnd()*2;g.beginPath();const x=rnd()*512,y=rnd()*512;g.moveTo(x,y);g.lineTo(x+(kind==='wood'?rnd()*5:rnd()*30),y+(kind==='wood'?rnd()*170:rnd()*10));g.stroke()}
  if(kind!=='wood'){g.strokeStyle=kind==='floor'?'#958d7e':'#b8b9b2';g.lineWidth=2;g.strokeRect(0,0,512,512)}const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=8;return t;
 }
 const wood=mat('#ffffff');wood.map=texture('wood');const white=mat('#eeeee7',.48),wall=mat('#e7e8df'),dark=mat('#263434',.42,.4),chrome=mat('#b6c0bb',.25,.78),tile=mat('#ffffff',.48);tile.map=texture('tile');
 const floorMat=mat('#ffffff',.64);floorMat.map=texture('floor');floorMat.map.repeat.set(5.4,7.2);
 const tileFloor=tile.clone();tileFloor.map=tile.map.clone();tileFloor.map.repeat.set(6,5);
 function box(w,h,d,x,y,z,m=white,parent=scene,round=0){const mesh=new THREE.Mesh(round?new RoundedBoxGeometry(w,h,d,2,round):new THREE.BoxGeometry(w,h,d),m);mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh}
 function rod(a,b,r=.016,m=chrome,parent=scene){const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b),dir=bv.clone().sub(av);const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r,r,dir.length(),10),m);mesh.position.copy(av.add(bv).multiplyScalar(.5));mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir.normalize());mesh.castShadow=true;parent.add(mesh);return mesh}
 function ball(x,y,z,sx,sy,sz,m=white,parent=scene){const mesh=new THREE.Mesh(new THREE.SphereGeometry(1,24,16),m);mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh}
 function collider(x,z,w,d){colliders.push({minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2})}
 function wallBox(w,h,d,x,y,z,m=wall,cut=false){const o=box(w,h,d,x,y,z,m);if(cut)cutWalls.push(o);collider(x,z,w,d);return o}
 // The bedroom, wash lobby and enclosed balcony share one narrow plan.
 box(4.4,.16,4.95,0,-.08,2,floorMat);box(4.4,.16,3.75,0,-.08,-2.35,tileFloor);
 wallBox(.14,3.15,8.6,-2.2,1.575,.1,wall,true);wallBox(.14,3.15,8.6,2.2,1.575,.1,wall,true);
 wallBox(4.4,3.15,.14,0,1.575,4.5,wall,true);
 roof.push(box(4.4,.1,5.0,0,3.18,2,wall),box(4.4,.1,3.6,0,2.85,-2.25,wall));roof.forEach(o=>o.castShadow=false);
 for(const x of [-2.105,2.105]){box(.024,.085,8.55,x,.047,.15,mat('#777d70'));box(.025,.042,4.95,x,2.94,2,white)}
 // Arch at the end of the beds. Bathroom sits to the left of the wash lobby.
 wallBox(1.56,3.15,.16,-1.42,1.575,-.55,wall);
 wallBox(.52,3.15,.16,1.94,1.575,-.55,wall);
 roof.push(box(2.5,.65,.24,.52,2.825,-.55,wall));
 wallBox(.12,2.8,1.05,-.62,1.4,-2.225,tile);wallBox(.12,2.8,.1,-.62,1.4,-.61,tile);
 roof.push(box(.12,.58,1.02,-.62,2.51,-1.18,tile));
 wallBox(1.58,2.8,.1,-1.42,1.4,-2.82,tile);
 // Built-in furniture mirrors the two sides in the source images.
 for(const side of [-1,1]){const suite=createLoftSuite({wood,white,metal:chrome,fabric:mat(side===1?'#839ea7':'#acb7b6')});suite.group.position.set(side*.94,0,1.33);suite.group.scale.x=side;scene.add(suite.group);for(const c of suite.colliders){const a=side*(.94+c.minX),b=side*(.94+c.maxX);colliders.push({minX:Math.min(a,b),maxX:Math.max(a,b),minZ:c.minZ+1.33,maxZ:c.maxZ+1.33})}}
 // Ceiling light and air conditioner above the arch.
 const glow=new THREE.MeshStandardMaterial({color:'#fff9e0',emissive:'#fff1ca',emissiveIntensity:1.3});
 box(.12,.035,1.65,0,3.085,1.7,white);box(.075,.027,1.57,0,3.057,1.7,glow);
 box(1.0,.30,.22,-.14,2.75,-.365,white,scene,.04);box(.88,.062,.012,-.14,2.685,-.247,dark);
 for(let i=0;i<4;i++)box(.84,.006,.012,-.14,2.665+i*.012,-.234,chrome);
 rod([-.64,2.67,-.41],[-.92,2.61,-.41],.035,mat('#a3a6a0'));
 for(const z of [1.55,-1.6,-3.6]){const l=new THREE.PointLight('#fff2d8',z===1.55?13:8,7,2);l.position.set(.1,z===1.55?2.85:2.62,z);scene.add(l);lights.push(l)}
 for(const z of [-1.6,-3.6]){const o=new THREE.Mesh(new THREE.CylinderGeometry(.14,.14,.025,32),glow);o.position.set(.35,2.777,z);scene.add(o)}
 // Basin cabinet to the right, with a mirrored upper wall.
 const vanity=mat('#c7beb0',.56);box(.58,.5,1.65,1.86,.61,-1.62,vanity);collider(1.85,-1.62,.65,1.7);
 box(.68,.075,1.73,1.81,.90,-1.62,white,scene,.025);
 box(.54,.03,1.67,1.85,.19,-1.62,dark);for(const z of [-2.4,-.84])box(.025,.67,.025,1.54,.5,z,dark);
 const sink=box(.42,.013,.57,1.76,.944,-1.59,mat('#b1bdba',.38),scene,.025);box(.33,.012,.46,1.76,.953,-1.59,white,scene,.022);
 rod([2,.94,-1.62],[2,1.15,-1.62],.027);rod([2,1.15,-1.62],[1.81,1.15,-1.62],.024);box(.09,.015,.033,2,1.18,-1.62,chrome);
 box(.04,1.02,1.72,2.105,1.75,-1.62,dark);
 const mirror=new Reflector(new THREE.PlaneGeometry(1.64,.94),{color:0xdbe5de,textureWidth:512,textureHeight:512,clipBias:.003});mirror.position.set(2.076,1.75,-1.62);mirror.rotation.y=-Math.PI/2;scene.add(mirror);
 const mint=mat('#bacab3');for(const z of [-2.23,-2.04]){box(.1,.16,.10,1.89,1.02,z,mint,scene,.014);rod([1.89,1.12,z],[1.89,1.15,z],.013);box(.075,.02,.018,1.87,1.15,z,white)}
 for(const z of [-2.14,-1.15]){const basin=new THREE.Mesh(new THREE.TorusGeometry(.18,.033,10,30),mat('#8bb8c0'));basin.rotation.x=Math.PI/2;basin.position.set(1.82,.28,z);scene.add(basin);ball(1.82,.22,z,.17,.045,.17,mat('#8bb8c0'))}
 // Frosted screen at the end of the vanity.
 const glass=new THREE.MeshPhysicalMaterial({color:'#bdced0',transparent:true,opacity:.24,roughness:.17,metalness:.05,depthWrite:false,side:THREE.DoubleSide});
 box(.67,1.6,.028,1.79,1.71,-.76,glass);for(const x of [1.465,2.12])box(.036,1.64,.045,x,1.71,-.76,dark);box(.67,.035,.04,1.79,2.52,-.76,dark);
 for(let i=0;i<27;i++)box(.005,1.54,.007,1.48+i*.024,1.71,-.74,mat('#c4d1cf',.35));
 // Tile joints and bathroom fittings.
 for(let y=.6;y<2.8;y+=.6){box(1.5,.007,.006,-1.42,y,-2.758,mat('#b8bcb3'));box(.006,.007,2.15,-2.122,y,-1.67,mat('#b8bcb3'))}
 box(.40,.40,.21,-1.71,.61,-.79,white,scene,.07);ball(-1.71,.28,-1.12,.225,.25,.33,white);ball(-1.71,.47,-1.16,.24,.08,.33,white);ball(-1.71,.502,-1.17,.162,.02,.24,mat('#becbc7'));const seat=new THREE.Mesh(new THREE.TorusGeometry(.18,.037,12,36),white);seat.rotation.x=-Math.PI/2;seat.scale.y=1.3;seat.position.set(-1.71,.528,-1.16);scene.add(seat);collider(-1.71,-1.03,.55,.77);
 box(.45,.49,.07,-1.71,.84,-.805,white,scene,.08);
 rod([-2.06,1.68,-1.32],[-2.06,1.68,-.88],.018);box(.018,.48,.34,-2.04,1.42,-1.13,mat('#bd9190'),scene,.005);
 const showerfloor=mat('#7a827e',.4);box(1.47,.024,.88,-1.4,.012,-2.3,showerfloor);box(.09,.01,.09,-1.02,.031,-2.53,chrome);
 rod([-1.8,1.04,-2.68],[-1.8,2.15,-2.68],.015);rod([-1.8,2.15,-2.68],[-1.8,2.20,-2.46],.024);ball(-1.8,2.19,-2.45,.095,.016,.065,chrome);box(.27,.08,.08,-1.8,1.05,-2.68,chrome,scene,.016);
 const hoseCurve=new THREE.CatmullRomCurve3([new THREE.Vector3(-1.72,1.04,-2.65),new THREE.Vector3(-1.57,.66,-2.59),new THREE.Vector3(-1.43,1.18,-2.6),new THREE.Vector3(-1.68,1.75,-2.66)]);scene.add(new THREE.Mesh(new THREE.TubeGeometry(hoseCurve,25,.009,6,false),chrome));
 box(.44,.17,.11,-1.3,1.20,-2.7,dark,scene,.008);box(.16,.073,.009,-1.3,1.21,-2.638,new THREE.MeshBasicMaterial({color:'#7daeb7'}));
 // Sliding shower screen: opening on right, fixed pane on left.
 box(.6,2.14,.025,-1.81,1.07,-1.85,glass);for(const x of [-2.1,-.71])box(.026,2.2,.035,x,1.1,-1.85,dark);box(1.42,.03,.035,-1.41,2.2,-1.85,dark);
 function door({name,x,z,width=1,height=2.2,yaw=0,sliding=false,shift=1,material=glass,open=false}){const pivot=new THREE.Group();pivot.position.set(x,0,z);pivot.rotation.y=yaw;scene.add(pivot);const leaf=new THREE.Group();pivot.add(leaf);box(width,height,.033,width/2,height/2,0,material,leaf);for(const a of [0,width])box(.032,height,.05,a,height/2,0,dark,leaf);for(const y of [.017,height-.017])box(width,.034,.05,width/2,y,0,dark,leaf);rod([width-.13,.89,.065],[width-.13,1.19,.065],.015,chrome,leaf);const d={name,pivot,leaf,width,yaw,sliding,shift,openness:open?1:0,target:open?1:0};doors.push(d);return d}
 door({name:'浴室门',x:-.62,z:-.69,width:1.0,yaw:Math.PI/2,shift:-1});
 collider(-1.81,-1.85,.60,.04);
 door({name:'淋浴门',x:-1.51,z:-1.85,width:.81,sliding:true,shift:-.60});
 // Balcony black-framed sliding glass door, with gathered blue curtains.
 box(1.35,2.63,.025,1.47,1.315,-2.84,glass);for(const x of [-.56,.79,2.13])box(.04,2.7,.055,x,1.35,-2.84,dark);box(2.7,.045,.05,.79,2.68,-2.84,dark);
 collider(1.47,-2.84,1.35,.04);collider(-.56,-2.84,.04,.055);
 const balconyDoor=door({name:'阳台门',x:-.55,z:-2.78,width:1.31,height:2.65,sliding:true,shift:1.29,open:false});
 const curtainMat=mat('#759da5',.98);curtainMat.side=THREE.DoubleSide;const curtains=[];
 for(let s=0;s<2;s++){const geo=new THREE.PlaneGeometry(1.38,2.63,48,20);const pos=geo.attributes.position;for(let i=0;i<pos.count;i++){pos.setZ(i,Math.sin((pos.getX(i)+.69)*Math.PI*18)*.055)}geo.computeVertexNormals();const o=new THREE.Mesh(geo,curtainMat);o.position.set(s===0?.1:1.47,1.34,-2.65);o.castShadow=o.receiveShadow=true;scene.add(o);curtains.push(o)}
 let curtainAmount=.72,curtainTarget=.72;
 rod([-.58,2.75,-2.65],[2.13,2.75,-2.65],.018,chrome);
 // Front window, pale facade beyond it and a simple indoor drying rail.
 wallBox(4.4,.8,.14,0,.4,-4.23,wall);roof.push(box(4.4,.2,.14,0,2.76,-4.23,wall));
 box(4.23,1.83,.015,0,1.72,-4.235,glass);for(const x of [-2.13,-1.07,0,1.07,2.13])box(.04,1.9,.065,x,1.74,-4.19,white);for(const y of [.81,2.67])box(4.3,.04,.09,0,y,-4.18,white);
 for(const y of [1,1.2,1.4])rod([-2.1,y,-4.36],[2.1,y,-4.36],.012,chrome);for(const x of [-2.1,0,2.1])rod([x,.85,-4.36],[x,1.45,-4.36],.014,chrome);
 rod([-1.95,2.46,-3.85],[1.98,2.46,-3.85],.014,chrome);
 for(let i=0;i<4;i++){const group=new THREE.Group();group.position.set(-1.08+i*.62,2.43,-3.85);scene.add(group);rod([0,0,0],[-.22,-.17,0],.008,chrome,group);rod([0,0,0],[.22,-.17,0],.008,chrome,group);rod([-.22,-.17,0],[.22,-.17,0],.008,chrome,group);const cloth=mat(['#d6c6a6','#536567','#f0e9d7','#789a9e'][i]);box(.37,.62,.025,0,-.49,0,cloth,group,.02);for(const sign of [-1,1]){const sleeve=box(.21,.18,.03,sign*.24,-.28,0,cloth,group,.018);sleeve.rotation.z=sign*.4}animated.push({group,phase:i})}
 // Modest plant by the balcony corner.
 const terracotta=mat('#9b7757');const pot=new THREE.Mesh(new THREE.CylinderGeometry(.18,.13,.28,20),terracotta);pot.position.set(1.82,.14,-3.77);scene.add(pot);for(let i=0;i<8;i++){const a=i*2.4;rod([1.82,.25,-3.77],[1.82+Math.sin(a)*.23,.45+i*.04,-3.77+Math.cos(a)*.23],.007,mat('#56735a'));const leaf=ball(1.82+Math.sin(a)*.23,.49+i*.04,-3.77+Math.cos(a)*.23,.09,.17,.025,mat('#668369'));leaf.rotation.z=-Math.sin(a)*.6}collider(1.82,-3.77,.37,.37);
 // A stylized neighbouring apartment block gives the windows depth.
 const outside=new THREE.Group();scene.add(outside);box(16,13,2,0,3,-10,mat('#d3d4ca'),outside);const brick=mat('#b88b76'),window=mat('#68868b',.25);for(let y=-2;y<10;y+=1.8){box(16,.57,.09,0,y,-8.96,brick,outside);for(let x=-7;x<8;x+=1.2){box(.75,1.05,.05,x,y+.76,-8.92,window,outside);box(.025,1.05,.07,x,y+.76,-8.87,white,outside)}}box(25,.1,12,0,-2.0,-8,mat('#899b87'),outside);
 // Entry door is also operable; its small vestibule is approximate.
 const entry=door({name:'入户门',x:-.5,z:4.39,width:1,height:2.28,shift:1,material:wood});
 // Entry is decorative against the outer wall: it opens but the home remains bounded.
 const sun=new THREE.DirectionalLight('#fff1d5',2.8);sun.position.set(-3,7,-6);sun.target.position.set(0,0,1);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-6;sun.shadow.camera.right=6;sun.shadow.camera.top=7;sun.shadow.camera.bottom=-7;sun.shadow.normalBias=.035;sun.shadow.bias=-.0001;scene.add(sun,sun.target);
 const hemi=new THREE.HemisphereLight('#dce9ed','#aba08a',2.1);scene.add(hemi);
 function segments(){return doors.map(d=>{d.pivot.updateMatrixWorld(true);d.leaf.updateMatrixWorld(true);return {a:d.leaf.localToWorld(new THREE.Vector3(0,0,0)),b:d.leaf.localToWorld(new THREE.Vector3(d.width,0,0)),door:d}})}
 function toggleDoor(d){d.target=d.target?0:1;if(d===balconyDoor&&d.target)curtainTarget=1}
 function update(dt,time,player){for(const d of doors){const prior=d.openness;d.openness=THREE.MathUtils.damp(d.openness,d.target,5,dt);if(d.sliding)d.leaf.position.x=d.shift*d.openness;else d.leaf.rotation.y=d.shift*d.openness*Math.PI*.49;
    // Pause closing when the player is in the leaf's path.
    if(d.target===0&&prior>.001&&player){const a=d.leaf.localToWorld(new THREE.Vector3()),b=d.leaf.localToWorld(new THREE.Vector3(d.width,0,0));const dx=b.x-a.x,dz=b.z-a.z,t=THREE.MathUtils.clamp(((player.x-a.x)*dx+(player.z-a.z)*dz)/(dx*dx+dz*dz),0,1);if(Math.hypot(player.x-a.x-dx*t,player.z-a.z-dz*t)<.29){d.target=1;d.openness=prior}}
  }curtainAmount=THREE.MathUtils.damp(curtainAmount,curtainTarget,3,dt);curtains.forEach((o,i)=>{o.scale.x=1-curtainAmount*.87;o.position.x=i===0?-.55+.69*o.scale.x:2.15-.69*o.scale.x});for(const a of animated)a.group.rotation.x=Math.sin(time*.8+a.phase)*.025;}
 function setOverview(v){roof.forEach(o=>o.visible=!v);cutWalls.forEach(o=>o.visible=!v);mirror.visible=!v;outside.visible=!v}
 function setNight(n){sun.intensity=n?.10:2.8;hemi.intensity=n?.62:2.1;hemi.color.set(n?'#7594b9':'#dce9ed');lights.forEach((l,i)=>l.intensity=(n?(i===0?17:10):(i===0?13:8))*HOME_SCALE**2);rootScene.background=new THREE.Color(n?'#162b3b':'#dce5e3')}
 for(const c of colliders)for(const k of ['minX','maxX','minZ','maxZ'])c[k]*=HOME_SCALE;
 lights.forEach(l=>l.distance*=HOME_SCALE);for(const k of ['left','right','top','bottom'])sun.shadow.camera[k]*=HOME_SCALE;sun.shadow.camera.updateProjectionMatrix();
 scene.updateMatrixWorld(true);setNight(false);
 return {colliders,doors,segments,toggleDoor,update,setOverview,setNight,curtains,toggleCurtains(){curtainTarget=curtainTarget>.5?0:1;return curtainTarget},materials:{wood,white},bounds:{minX:-2.09*HOME_SCALE,maxX:2.09*HOME_SCALE,minZ:-4.10*HOME_SCALE,maxZ:4.36*HOME_SCALE}};
}
