const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1024,height:1024}});
for(const n of ['klassik','baender','mBaender','nacht','korallBand','regenbogenM']){await p.goto('file://'+__dirname+'/icons.html#'+n);await p.reload();await p.waitForTimeout(150);await (await p.$('svg')).screenshot({path:__dirname+'/icon-'+n+'.png'});}
await b.close();console.log('ok')})();
