// Ground navigation shared by the visitor and DouDou, in world-space units.
export function pointSegment(x,z,a,b){
 const dx=b.x-a.x,dz=b.z-a.z;
 const t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz||1)));
 return Math.hypot(x-a.x-t*dx,z-a.z-t*dz);
}

export function createNavigation(world,scale){
 let segments=[];
 const playerRadius=.19*scale,dogRadius=.22*scale,step=.14*scale;
 function refresh(){segments=world.segments();}
 function free(x,z,r=playerRadius){
  const b=world.bounds;
  if(x<b.minX+r||x>b.maxX-r||z<b.minZ+r||z>b.maxZ-r)return false;
  for(const c of world.colliders){
   const cx=Math.max(c.minX,Math.min(c.maxX,x)),cz=Math.max(c.minZ,Math.min(c.maxZ,z));
   if((x-cx)**2+(z-cz)**2<r*r)return false;
  }
  return !segments.some(s=>pointSegment(x,z,s.a,s.b)<r+.023*scale);
 }
 function clearLine(a,b,r=playerRadius){
  const count=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/(.04*scale)));
  for(let i=0;i<=count;i++)if(!free(a.x+(b.x-a.x)*i/count,a.z+(b.z-a.z)*i/count,r))return false;
  return true;
 }
 function move(pos,dx,dz,r=playerRadius){
  const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/(.055*scale)));
  for(let i=0;i<steps;i++){
   if(free(pos.x+dx/steps,pos.z,r))pos.x+=dx/steps;
   if(free(pos.x,pos.z+dz/steps,r))pos.z+=dz/steps;
  }
 }
 function route(from,to,r=dogRadius,avoid=[]){
  const routeFree=(x,z)=>free(x,z,r)&&avoid.every(p=>Math.hypot(x-p.x,z-p.z)>=r+p.radius);
  const routeLine=(a,b)=>{const n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/(.04*scale)));for(let i=0;i<=n;i++)if(!routeFree(a.x+(b.x-a.x)*i/n,a.z+(b.z-a.z)*i/n))return false;return true;};
  if(routeLine(from,to))return [{x:to.x,z:to.z}];
  const b=world.bounds,nx=Math.floor((b.maxX-b.minX)/step)+1,nz=Math.floor((b.maxZ-b.minZ)/step)+1;
  const coords=i=>({x:b.minX+(i%nx)*step,z:b.minZ+Math.floor(i/nx)*step});
  const valid=new Uint8Array(nx*nz),prev=new Int32Array(nx*nz).fill(-1),queue=new Int32Array(nx*nz);
  let start=-1,startDist=Infinity;
  for(let i=0;i<valid.length;i++){
   const p=coords(i);if(!routeFree(p.x,p.z))continue;valid[i]=1;
   const d=(p.x-from.x)**2+(p.z-from.z)**2;
   if(d<startDist&&routeLine(from,p)){startDist=d;start=i;}
  }
  if(start<0)return [];
  let head=0,tail=1;queue[0]=start;prev[start]=start;
  while(head<tail){
   const n=queue[head++],x=n%nx,z=Math.floor(n/nx),p=coords(n);
   for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){
    const xx=x+dx,zz=z+dz,k=zz*nx+xx;
    if(xx<0||xx>=nx||zz<0||zz>=nz||!valid[k]||prev[k]>=0)continue;
    if(dx&&dz&&(!valid[z*nx+xx]||!valid[zz*nx+x]))continue;
    if(!routeLine(p,coords(k)))continue;
    prev[k]=n;queue[tail++]=k;
   }
  }
  // Choose a reachable endpoint. A closed door must never send the dog through a wall.
  let end=start,best=Infinity;
  for(let i=0;i<tail;i++){const n=queue[i],p=coords(n),d=(p.x-to.x)**2+(p.z-to.z)**2;if(d<best){best=d;end=n;}}
  const points=[];let n=end;
  while(n!==start){points.push(coords(n));n=prev[n];}points.push(coords(start));points.reverse();
  if(routeFree(to.x,to.z)&&routeLine(coords(end),to))points.push({x:to.x,z:to.z});
  const smooth=[];let origin=from,index=0;
  while(index<points.length){let far=index;while(far+1<points.length&&routeLine(origin,points[far+1]))far++;smooth.push(points[far]);origin=points[far];index=far+1;}
  return smooth;
 }
 refresh();return {free,move,route,clearLine,refresh,playerRadius,dogRadius,get segments(){return segments}};
}
