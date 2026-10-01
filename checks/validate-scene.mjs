import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import * as THREE from '../node_modules/three/build/three.module.js';
import {createWorld,HOME_SCALE} from '../src/world.js';
import {createNavigation} from '../src/navigation.js';
const noop=()=>{};
globalThis.document={createElement(){return {width:0,height:0,getContext(){return new Proxy({createLinearGradient(){return{addColorStop:noop}}},{get:(o,k)=>k in o?o[k]:noop,set:(o,k,v)=>(o[k]=v,true)})}}}};
const scene=new THREE.Scene(),world=createWorld(scene),nav=createNavigation(world,HOME_SCALE),S=HOME_SCALE;
const point=(x,z)=>({x:x*S,z:z*S}),start=point(0,3.8);
const destinations={wash:point(.55,-1.6),bath:point(-1.08,-1.08),shower:point(-1.02,-2.3),balcony:point(.18,-3.37),leftDesk:point(-1.38,.28),rightDesk:point(1.38,.28),leftStair:point(-1.53,3.23),rightStair:point(1.53,3.23),vestibule:point(0,5.0)};
const scenarios=[['closed',[]],['bath open',['浴室门']],['balcony open',['阳台门']],['bath + shower open',['浴室门','淋浴门']],['all open',['浴室门','淋浴门','阳台门','入户门']]];
const results=[];
for(const [name,open]of scenarios){
 for(const d of world.doors)d.target=open.includes(d.name)?1:0;
 for(let i=0;i<80;i++)world.update(.1,i,[]);nav.refresh();
 const targets={};
 for(const [key,target]of Object.entries(destinations)){
  const route=nav.route(start,target,nav.playerRadius),end=route.at(-1)||start;
  const distance=Math.hypot(end.x-target.x,end.z-target.z),reachable=distance<.04*S;
  let previous=start;for(const p of route){assert(nav.clearLine(previous,p,nav.playerRadius),`${name}/${key}: route cuts through collider`);previous=p;}
  targets[key]={free:nav.free(target.x,target.z),reachable,distance:Math.round(distance*100)/100};
 }
 for(const key of ['wash','leftDesk','rightDesk','leftStair','rightStair'])assert(targets[key].reachable,`${name}: ${key} not reachable`);
 assert.equal(targets.bath.reachable,open.includes('浴室门'),`${name}: bath door failure`);
 assert.equal(targets.shower.reachable,open.includes('浴室门')&&open.includes('淋浴门'),`${name}: shower door failure`);
 assert.equal(targets.balcony.reachable,open.includes('阳台门'),`${name}: balcony door failure`);
 assert.equal(targets.vestibule.reachable,open.includes('入户门'),`${name}: entry door failure`);
 results.push({name,targets});console.log(JSON.stringify({name,targets}));
}
// The visitor cannot cross a wall even during a fast movement frame.
const moving={x:0,z:3.6*S};nav.move(moving,20*S,0);assert(nav.free(moving.x,moving.z));assert(moving.x<2.44*S);
for(const stair of world.stairs){
 assert(nav.free(stair.entry.x,stair.entry.z),'Stair entry blocked');
 for(const p of stair.climb)assert(p.y+stair.eyeHeight(p.y)<3.13*S,'Stair camera penetrates ceiling');
 assert(stair.top.x>=stair.bounds.minX&&stair.top.x<=stair.bounds.maxX);
 assert(stair.top.z>=stair.bounds.minZ&&stair.top.z<=stair.bounds.maxZ);
 for(let i=1;i<stair.climb.length;i++)assert(stair.climb[i].y>=stair.climb[i-1].y,'Stair path must rise');
}
// Pulling out the drawer must expand its physical footprint into the aisle.
const drawer=world.interactions.find(i=>i.id==='right-drawer');
world.update(.1,20,[]);const closedDrawer=world.colliders.filter(c=>c.kind==='drawer')[1];
const probe={x:closedDrawer.minX-.18*S,z:(closedDrawer.minZ+closedDrawer.maxZ)/2};
assert(nav.free(probe.x,probe.z,.03*S));drawer.toggle();world.update(1,21,[]);nav.refresh();
const openDrawer=world.colliders.filter(c=>c.kind==='drawer')[1];
assert(openDrawer.minX<closedDrawer.minX-.22*S);assert(!nav.free(probe.x,probe.z,.03*S),'Open drawer collision not updated');
drawer.toggle();world.update(1,22,[]);nav.refresh();
const blockedDrawer=world.colliders.filter(c=>c.kind==='drawer')[1],blocker={x:blockedDrawer.minX-.23*S,y:0,z:(blockedDrawer.minZ+blockedDrawer.maxZ)/2};
assert(nav.free(blocker.x,blocker.z,nav.playerRadius));drawer.toggle();world.update(1,23,[blocker]);
assert(drawer.blocked,'Drawer must pause when visitor stands in opening path');
assert(Math.abs(world.colliders.filter(c=>c.kind==='drawer')[1].minX-blockedDrawer.minX)<.01*S);
world.update(1,24,[]);assert(!drawer.blocked);drawer.toggle();world.update(1,25,[]);nav.refresh();
// Dog routes go around the visitor, and every smoothed segment stays clear.
const dogFrom=point(0,3.3),dogTarget=point(0,.1),visitor=point(0,1.7),avoid={...visitor,radius:.36*S};
const dogRoute=nav.route(dogFrom,dogTarget,nav.dogRadius,[avoid]);assert(dogRoute.length>1,'Dog must route around visitor');
let previous=dogFrom;for(const p of dogRoute){assert(nav.clearLine(previous,p,nav.dogRadius));const n=Math.ceil(Math.hypot(p.x-previous.x,p.z-previous.z)/(.02*S));for(let i=0;i<=n;i++){const t=i/n;assert(Math.hypot(previous.x+(p.x-previous.x)*t-visitor.x,previous.z+(p.z-previous.z)*t-visitor.z)>=nav.dogRadius+avoid.radius-1e-5,'Dog route crosses visitor');}previous=p;}
const furnitureBounds=[];scene.updateMatrixWorld(true);
scene.traverse(o=>{if(o.name==='photo-loft-bed-suite'){const b=new THREE.Box3().setFromObject(o);assert(b.min.x>=-2.48*S-.01&&b.max.x<=2.48*S+.01,'Furniture intersects side wall');assert(b.min.z>=-.48*S&&b.max.z<4.43*S,'Furniture intersects room ends');furnitureBounds.push({min:b.min.toArray(),max:b.max.toArray()});}});
writeFileSync(new URL('./navigation-validation-v2.json',import.meta.url),JSON.stringify({scale:S,standingHeight:1.68*S,playerRadius:nav.playerRadius,furnitureBounds,results},null,2));
console.log('PASS: room access, closed doors, collision paths, stair heights, furniture bounds, drawer collision and dog avoidance');

