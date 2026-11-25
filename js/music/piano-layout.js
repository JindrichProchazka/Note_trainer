import { pianoKeys } from './piano.js';
/** Never use the target note to choose a page. Basic eleven-white-key ranges fit at >=24 px/key. */
export function keyboardPages(min,max,width){
  const full=pianoKeys(min,max);
  if(full.width/48*24<=Math.max(1,width))return [{min,max}];
  const pages=[];
  for(let start=12*Math.floor(min/12);start<max;start+=12){
    const low=Math.max(min,start),high=Math.min(max,start+12);
    if(low<=high)pages.push({min:low,max:high});
  }
  return pages.length?pages:[{min,max}];
}
export function keyboardGeometry(min,max,width){
  const layout=pianoKeys(min,max),scale=Math.min(1,Math.max(1,width)/layout.width);
  return {...layout,width:layout.width*scale,whiteWidth:48*scale,blackWidth:32*scale,
    keys:layout.keys.map(key=>({...key,left:key.left*scale}))};
}
