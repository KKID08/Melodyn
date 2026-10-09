const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1400,height:600}});await p.goto('file://'+__dirname+'/view.html');await p.waitForTimeout(300);await p.screenshot({path:__dirname+'/_v.png'});await b.close();})();
