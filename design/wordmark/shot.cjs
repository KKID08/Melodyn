const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1500,height:420}});await p.goto('file://'+__dirname+'/view.html');await p.waitForTimeout(300);await p.screenshot({path:__dirname+'/_v.png',clip:{x:0,y:0,width:1500,height:370}});await b.close();})();
