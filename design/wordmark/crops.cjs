const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:2600,height:720}});
await p.goto('file://'+__dirname+'/big.html');await p.waitForTimeout(300);
await p.screenshot({path:__dirname+'/_big.png'});await b.close();})();
