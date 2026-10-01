// Melodyn demo mode: the whole app without Google. Nothing here costs money.
// Wishes are read with simple keyword rules, songs come from a few real Lyria songs in /demo,
// and the DJ speaks with the browser's own voice.

const MOODS = [
  { k: /hyper ?pop|glitch|drüber/i, genre: 'maximalist hyperpop', de: 'Hyperpop', bpm: 158, pal: 'run', vox: 'female', mood: ['euphoric', 'chaotic'], station: 'Hyperpop', titles: ['Glitter Static', 'Sugar Crash', 'Pixel Heart'] },
  { k: /hip.?hop|rap|westside|west coast|90s|90er|tupac|g.?funk/i, genre: '1990s West Coast G-funk hip-hop', de: '90er West Coast', bpm: 90, pal: 'brass', vox: 'male', mood: ['laid-back', 'warm'], station: 'Westside, entspannt', titles: ['Sunset Boulevard', 'Low Rider Hours', 'Golden State of Mind'] },
  { k: /koch|freunde|essen|dinner|party/i, genre: 'warm neo soul', de: 'Neo-Soul', bpm: 92, pal: 'kitchen', vox: 'female', mood: ['warm', 'social'], station: 'Kochen mit Freunden', titles: ['Pfeffer & Gold', 'Offene Küche', 'Letzter Gang'] },
  { k: /konzentr|lernen|arbeit|fokus|focus|study/i, genre: 'lo-fi hip-hop', de: 'Lo-Fi', bpm: 78, pal: 'focus', vox: 'none', mood: ['calm', 'steady'], station: 'Fokus', titles: ['Stille Seiten', 'Kaffee um vier', 'Tiefer Gedanke'] },
  { k: /traurig|trennung|weinen|vermiss|herz/i, genre: 'gentle indie ballad', de: 'Indie-Ballade', bpm: 72, pal: 'dusk', vox: 'female', mood: ['tender', 'sad'], station: 'Heute Abend, leise', titles: ['Halbe Wahrheit', 'Dein Pulli', 'Leises Licht'] },
  { k: /regen|grau|herbst/i, genre: 'melancholic dream pop', de: 'Dream Pop', bpm: 84, pal: 'rain', vox: 'female', mood: ['melancholic', 'soft'], station: 'Regentag', titles: ['Tropfen am Fenster', 'Grauer Samt', 'Nebelweit'] },
  { k: /sport|lauf|jogg|gym|training|run/i, genre: 'driving drum and bass', de: 'Drum & Bass', bpm: 172, pal: 'run', vox: 'none', mood: ['energetic', 'driving'], station: 'Laufen', titles: ['Kilometer Null', 'Puls 170', 'Letzte Runde'] },
  { k: /morgen|aufsteh|frühstück|sonne/i, genre: 'bright indie pop', de: 'Indie-Pop', bpm: 112, pal: 'morning', vox: 'male', mood: ['hopeful', 'bright'], station: 'Guten Morgen', titles: ['Erster Kaffee', 'Fenster auf', 'Neuer Tag'] },
  { k: /jazz|bar|saxo/i, genre: 'late night jazz trio', de: 'Jazz', bpm: 96, pal: 'brass', vox: 'none', mood: ['smoky', 'relaxed'], station: 'Spät in der Bar', titles: ['Blue Hour', 'Last Call', 'Smoke Rings'] },
  { k: /nacht|fahr|auto|heim|synth/i, genre: 'nocturnal synthwave', de: 'Synthwave', bpm: 98, pal: 'tunnel', vox: 'male', mood: ['calm', 'nocturnal'], station: 'Heimfahrt, nachts', titles: ['Tunnel Lights', 'Neon Road', 'Exit 41'] },
];
const DEFAULT = MOODS[MOODS.length - 1];

let n = 0;
const pick = list => list[n++ % list.length];

function ruleFrom(text) {
  const m = /(?:nie wieder|kein(?:e|en)?|ohne)\s+([a-zäöüß-]{3,}(?:\s[a-zäöüß-]{3,})?)/i.exec(text);
  if (!m) return null;
  const word = m[1].replace(/\b(mehr|bitte)\b/gi, '').trim();
  return { text: 'Kein ' + word.charAt(0).toUpperCase() + word.slice(1), scope: /nie wieder|immer|generell/i.test(text) ? 'Immer' : 'Nur heute' };
}

// Same shape as the real Gemini answer (see SCHEMA in prompt.js)
export function understand(req, heard) {
  const ctx = req.context || {};
  const cur = ctx.session && ctx.session.current_spec;
  const text = String(req.text || (req.audio ? heard : '') || '').trim() || 'Überrasch mich mit etwas Entspanntem';
  const last = (req.history || []).filter(h => h.role === 'model').pop();

  if (req.mode === 'next') {
    const base = MOODS.find(x => cur && x.de === cur.genre_de) || DEFAULT;
    const spec = Object.assign({}, cur || specOf(base), { tempo_bpm: (cur ? cur.tempo_bpm : base.bpm) + (n % 2 ? 3 : -3) });
    const title = pick(base.titles);
    return { transcript: '', ask: false, reply: '', understood: [], station: ctx.session ? ctx.session.station : base.station, palette: base.pal, title, dj_line: `Weiter geht's mit ${title}.`, new_session: false, new_rules: [], spec };
  }

  // Heavy feelings get one question first, like the real app (never twice in a row)
  if (/traurig|trennung|liebeskummer/i.test(text) && !(last && /\?$/.test(last.text.trim()))) {
    return {
      transcript: text, ask: true, question: 'Willst du dich reinfühlen oder lieber rauskommen?', options: [
        { label: 'Reinfühlen', description: 'Leise, ehrlich, darf wehtun', palette: 'dusk' },
        { label: 'Rauskommen', description: 'Warm, hell, etwas Bewegung', palette: 'morning' },
      ], reply: 'Okay. Kurz eine Frage, damit es passt.', understood: [], station: '', palette: 'dusk', title: '', dj_line: '', new_session: true, new_rules: [], spec: specOf(MOODS[4]),
    };
  }

  const followUp = cur && /schneller|langsamer|ruhiger|mehr|weniger|instrumental|nochmal|lauter/i.test(text) && !MOODS.slice(0, -1).some(x => x.k.test(text));
  let base = MOODS.find(x => x.k.test(text)) || DEFAULT;
  if (/rauskommen/i.test(text)) base = MOODS.find(x => x.pal === 'morning');
  let spec = followUp ? Object.assign({}, cur) : specOf(base);
  if (followUp) base = MOODS.find(x => x.de === cur.genre_de) || base;
  if (/schneller/i.test(text)) spec.tempo_bpm += 10;
  if (/langsamer|ruhiger/i.test(text)) { spec.tempo_bpm -= 10; spec.energy = Math.max(0.1, spec.energy - 0.2); }
  if (/instrumental|ohne gesang/i.test(text)) spec.vocals = 'none';
  const g = /mehr\s+([a-zäöüß]+)/i.exec(text);
  if (g) spec.instruments = [...new Set([g[1].toLowerCase(), ...spec.instruments])].slice(0, 5);
  const rule = ruleFrom(text);
  if (rule) spec.avoid = [...spec.avoid, rule.text];
  const title = pick(base.titles);
  const understood = [
    { label: followUp ? 'Anpassung' : 'Situation', value: text.length > 26 ? text.slice(0, 25) + '…' : text },
    { label: 'Genre', value: spec.genre_de },
    { label: 'Tempo', value: `${spec.tempo_bpm} BPM` },
  ];
  if (rule) understood.push({ label: 'Deine Regel', value: rule.text });
  return {
    transcript: text, ask: false,
    reply: followUp ? 'Alles klar, der nächste Song wird genau so.' : `${spec.genre_de}, gute Wahl. Kommt sofort.`,
    understood, station: followUp ? (ctx.session && ctx.session.station) || base.station : base.station,
    palette: base.pal, title, dj_line: `Hier ist ${title}. ${followUp ? 'Genau wie gewünscht.' : 'Für ' + base.station + '.'}`,
    new_session: !followUp, new_rules: rule ? [rule] : [], spec,
  };
}
function specOf(b) {
  return { genre: b.genre, genre_de: b.de, tempo_bpm: b.bpm, mood: b.mood, energy: 0.5, valence: 0.6, vocals: b.vox, lyrics_language: 'de', lyrics_theme: b.station, instruments: ['synth', 'bass', 'drums'], avoid: [], references: '', vibe: b.mood.join(', ') };
}

// Same shape as the real producer answer
export function produce(input) {
  const s = input.spec || {};
  return {
    listener_intent: `Demo: ${(input.words || []).slice(-1)[0] || s.genre_de}`,
    reference_translation: 'none',
    target: s.genre,
    vibe: (s.mood || []).join(', '),
    vocal_delivery: s.vocals === 'none' ? 'instrumental' : `${s.vocals} vocals`,
    core: `${(s.mood || []).join(', ')} ${s.genre} at ${s.tempo_bpm} BPM. (Demo-Modus: dieser Prompt geht nicht an Lyria, es läuft ein Beispielsong.)`,
    structure: '[0:00-0:15] Intro\n[0:15-1:00] Verse\n[1:00-1:30] Hook\n[1:30-2:40] Verse, Hook\n[2:40-3:00] Outro',
    avoid: s.avoid || [],
  };
}

// Real Lyria songs that ship with the app
let library = null;
const blobs = new Map(), turn = { clip: -1, full: -1 };
async function files() {
  if (!library) library = fetch('demo/demo.json').then(r => r.json());
  return library;
}
export async function song(len) {
  const lib = await files();
  const list = len === 'clip' ? lib.clips : lib.songs;
  const k = len === 'clip' ? 'clip' : 'full';
  const item = list[(turn[k] = turn[k] + 1) % list.length];
  if (!blobs.has(item.file)) blobs.set(item.file, fetch(item.file).then(r => { if (!r.ok) throw new Error('Demo-Song fehlt'); return r.blob(); }));
  return { blob: await blobs.get(item.file), lyrics: item.lyrics };
}

// DJ with the browser's own speech synthesis
export function speak(text) {
  return new Promise(resolve => {
    const ss = window.speechSynthesis;
    if (!ss || !window.SpeechSynthesisUtterance) return resolve(false);
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'de-DE'; u.rate = 1.02; u.pitch = 0.9;
    const v = ss.getVoices().find(x => /^de/i.test(x.lang));
    if (v) u.voice = v;
    let done = false;
    const end = ok => { if (!done) { done = true; resolve(ok); } };
    u.onend = () => end(true); u.onerror = () => end(false);
    setTimeout(() => end(false), 12000);
    ss.cancel(); ss.speak(u);
  });
}
export function hush() { try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch { /* none */ } }

// What the listener said, via the browser's speech recognition (free; not every browser has it)
export function hearStart() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const st = { text: '', rec: null, done: Promise.resolve('') };
  if (!SR) return st;
  try {
    const rec = new SR();
    rec.lang = 'de-DE'; rec.interimResults = false; rec.continuous = true;
    st.rec = rec;
    st.done = new Promise(resolve => {
      rec.onresult = e => { for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) st.text += ' ' + e.results[i][0].transcript; };
      rec.onend = () => resolve(st.text.trim());
      rec.onerror = () => resolve(st.text.trim());
    });
    rec.start();
  } catch { st.rec = null; }
  return st;
}
export async function hearStop(st) {
  if (!st || !st.rec) return '';
  try { st.rec.stop(); } catch { /* already stopped */ }
  return Promise.race([st.done, new Promise(r => setTimeout(() => r(st.text.trim()), 1500))]);
}
