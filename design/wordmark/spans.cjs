const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const G=require('./glyphs.json');
(async()=>{const b=await chromium.launch();const p=await b.newPage();
const r=await p.evaluate((d)=>{const c=document.createElement('canvas');c.width=700;c.height=700;const g=c.getContext('2d');g.translate(0,600);g.scale(1,-1);g.fill(new Path2D(d));
const im=g.getImageData(0,0,700,700).data;const col=x=>{const s=[];let inn=false,st=0;for(let y=0;y<700;y++){const a=im[(y*700+x)*4+3]>127;if(a&&!inn){inn=true;st=y}if(!a&&inn){inn=false;s.push([600-y+1,600-st])}}return s};
const row=y=>{const s=[];let inn=false,st=0;const yy=600-y;for(let x=0;x<700;x++){const a=im[(yy*700+x)*4+3]>127;if(a&&!inn){inn=true;st=x}if(!a&&inn){inn=false;s.push([st,x-1])}}return s};
const o={};for(let x=270;x<=360;x+=6)o[x]=col(x);return o},G.e.d);
console.log(JSON.stringify(r));await b.close();})();
