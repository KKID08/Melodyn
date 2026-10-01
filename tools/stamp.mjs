// Cache busting for GitHub Pages: adds ?v=<hash of the app files> to every app file the page loads,
// so a new deploy is picked up right away instead of after the browser's 10-minute cache.
// Run before every deploy: node tools/stamp.mjs
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';

const files = readdirSync('app').filter(f => /\.(js|css)$/.test(f)).sort();
const strip = s => s.replace(/\?v=[0-9a-f]+/g, '');
const h = createHash('sha1');
for (const f of files) h.update(strip(readFileSync('app/' + f, 'utf8')));
h.update(strip(readFileSync('index.html', 'utf8')));
const v = h.digest('hex').slice(0, 10);

const tag = s => s.replace(/(["'])((?:\.\/|app\/)[\w/.-]+\.(?:js|css))(?:\?v=[0-9a-f]+)?\1/g, `$1$2?v=${v}$1`);
writeFileSync('index.html', tag(readFileSync('index.html', 'utf8')));
for (const f of files.filter(f => f.endsWith('.js'))) {
  const src = readFileSync('app/' + f, 'utf8');
  // only module imports inside the app, never the Vercel functions' imports
  const out = src.replace(/(\bfrom\s+|\bimport\s*\(\s*)(["'])(\.\/[\w.-]+\.js)(?:\?v=[0-9a-f]+)?\2/g, `$1$2$3?v=${v}$2`);
  if (out !== src) writeFileSync('app/' + f, out);
}
console.log('version', v);
