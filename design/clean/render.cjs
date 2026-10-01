// Renders each concept of design/clean/concepts.html to design/clean/concept-<id>.png
const path = require('path');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1900, height: 1200 }, deviceScaleFactor: 1.5 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + path.join(__dirname, 'concepts.html'));
  await p.waitForFunction(() => document.documentElement.dataset.ready === '1');
  for (const id of ['A', 'B', 'C', 'D']) await (await p.$('#c' + id)).screenshot({ path: path.join(__dirname, `concept-${id}.png`) });
  console.log(errs.length ? errs : 'ok');
  await b.close();
})();
