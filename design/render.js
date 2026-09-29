// Renders every design/screens/*.html to design/shots/*.png
// Usage: node design/render.js [filter]
const path = require('path');
const fs = require('fs');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const dir = path.join(__dirname, 'screens');
const out = path.join(__dirname, 'shots');
const filter = process.argv[2] || '';

(async () => {
  const browser = await chromium.launch();
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.html') && f.includes(filter)).sort();
  for (const f of files) {
    const html = fs.readFileSync(path.join(dir, f), 'utf8');
    const m = html.match(/<meta name="size" content="(\d+)x(\d+)@?(\d)?">/);
    const [w, h, s] = m ? [+m[1], +m[2], +(m[3] || 2)] : [390, 844, 3];
    const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: s });
    const errs = [];
    page.on('pageerror', e => errs.push(e.message));
    page.on('requestfailed', r => errs.push('failed ' + r.url()));
    await page.goto('file://' + path.join(dir, f));
    await page.waitForFunction(() => document.documentElement.dataset.ready === '1');
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(out, f.replace('.html', '.png')) });
    console.log(f, `${w}x${h}@${s}`, errs.length ? errs : 'ok');
    await page.close();
  }
  await browser.close();
})();
