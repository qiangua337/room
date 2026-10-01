// A visible sequence of treads, ending inside the open half of the bunk end rail.
export function createStairLayout(side,offset,scale){
 const p=(x,y,z)=>({x:side*(offset+x)*scale,y:y*scale,z:z*scale});
 const climb=[p(.24,0,3.23),p(.24,0,3.03),p(.24,.423,2.87),p(.24,.846,2.62),p(.24,1.269,2.38),p(.24,1.692,2.13),p(.24,1.95,1.86),p(.34,1.95,1.60)];
 return {side,name:side<0?'左侧上铺':'右侧上铺',climb,entry:climb[0],top:climb.at(-1),
  bounds:{minX:Math.min(side*(offset+.24),side*(offset+.93))*scale,maxX:Math.max(side*(offset+.24),side*(offset+.93))*scale,minZ:.14*scale,maxZ:1.68*scale},
  eyeHeight(feetY){const t=Math.max(0,Math.min(1,(feetY/scale-.75)/1.20));return (1.68-.83*t)*scale},
 };
}
