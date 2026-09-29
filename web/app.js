/* Melodyn – klickbarer Prototyp
   Alles läuft im Browser: Mistral und ElevenLabs werden simuliert,
   der Sound kommt aus einem kleinen Web-Audio-Synth. */
(() => {
  'use strict';

  // ---------- Helfer ----------
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const REDUCED = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const clone = o => JSON.parse(JSON.stringify(o));
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmtTime = s => { s = Math.max(0, Math.floor(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  const usd = v => '$' + v.toFixed(2).replace('.', ',');
  const pct = v => Math.round(v * 100) + ' %';
  const nowStr = () => new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  const uniq = arr => Array.from(new Set(arr));

  function seeded(seed) {
    let h = 2166136261 >>> 0;
    const s = String(seed);
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    let a = h >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const pick = (r, arr) => arr[Math.floor(r() * arr.length)];

  const PRICE_PER_MIN = 0.15;
  const SONG_SEC = 180;
  const SONG_COST = PRICE_PER_MIN * SONG_SEC / 60;
  const MONTH_SONGS = 400;
  const DAY_LIMIT = 60;

  // ---------- Musik-Wissen (was "Mistral" im Prototyp erkennt) ----------
  const GENRES = {
    synthwave: { label: 'Synthwave', en: 'synthwave', bpm: 96, drums: 'straight', inst: ['analog synth pads', 'arpeggiated bass', 'gated drums'], re: /synth|retro|80er/ },
    hiphop: { label: 'Hip-Hop / Boom Bap', en: 'boom bap hip-hop', bpm: 90, drums: 'boombap', inst: ['dusty drums', 'upright bass', 'sampled keys'], re: /hip.?hop|\brap\b|boom.?bap/ },
    lofi: { label: 'Lo-Fi / Chillhop', en: 'lo-fi chillhop', bpm: 78, drums: 'boombap', inst: ['vinyl crackle', 'soft keys', 'mellow bass'], re: /lo.?fi|chill.?hop/ },
    jazz: { label: 'Nu Jazz', en: 'nu jazz', bpm: 104, drums: 'boombap', inst: ['rhodes piano', 'brushed drums', 'double bass'], re: /jazz/ },
    rock: { label: 'Indie Rock', en: 'indie rock', bpm: 122, drums: 'straight', inst: ['electric guitars', 'live drums', 'bass guitar'], re: /rock|indie/ },
    techno: { label: 'Melodic Techno', en: 'melodic techno', bpm: 126, drums: 'four', inst: ['driving kick', 'rolling bass', 'hypnotic synth lead'], re: /techno|rave/ },
    house: { label: 'Deep House', en: 'deep house', bpm: 122, drums: 'four', inst: ['warm chords', 'sub bass', 'shuffled hats'], re: /house/ },
    pop: { label: 'Pop', en: 'modern pop', bpm: 112, drums: 'straight', inst: ['bright synths', 'punchy drums', 'vocal hooks'], re: /\bpop\b/ },
    dnb: { label: 'Liquid Drum & Bass', en: 'liquid drum and bass', bpm: 172, drums: 'dnb', inst: ['fast breakbeats', 'deep sub bass', 'airy pads'], re: /drum.?(and|n|&|\+).?bass|\bdnb\b/ },
    ambient: { label: 'Ambient', en: 'ambient', bpm: 70, drums: 'none', inst: ['evolving pads', 'soft piano', 'field textures'], re: /ambient|meditat|einschlaf|schlafen/ },
    ballad: { label: 'Piano-Ballade', en: 'piano ballad', bpm: 72, drums: 'soft', inst: ['felt piano', 'strings', 'soft percussion'], re: /ballade|klavier|piano/ },
  };

  const SITUATIONS = [
    { label: 'Nachtfahrt', re: /nacht|fahr|\bauto\b|heimweg|autobahn/, mood: ['nocturnal', 'steady', 'slightly dark'], energy: 0.45, valence: 0.4, genre: 'synthwave', lyrics: 'city lights and the long road home' },
    { label: 'Training', re: /sport|training|trainier|gym|laufen|joggen|workout/, mood: ['driving', 'determined', 'powerful'], energy: 0.88, valence: 0.65, genre: 'dnb', lyrics: 'pushing through, not giving up' },
    { label: 'Kochen', re: /koch|küche|abendessen/, mood: ['warm', 'groovy', 'relaxed'], energy: 0.55, valence: 0.72, genre: 'jazz', lyrics: 'friends around a table' },
    { label: 'Fokus', re: /fokus|lern|konzentr|arbeit|coden|programmier/, mood: ['focused', 'calm', 'minimal'], energy: 0.32, valence: 0.55, genre: 'lofi', instrumental: true },
    { label: 'Party', re: /party|feier|tanz/, mood: ['euphoric', 'bouncy', 'bright'], energy: 0.9, valence: 0.85, genre: 'house', lyrics: 'one more song, one more night' },
    { label: 'Morgen', re: /morgen|aufwach|kaffee|frühstück/, mood: ['fresh', 'hopeful', 'light'], energy: 0.5, valence: 0.78, genre: 'pop', lyrics: 'a new day starting slow' },
  ];

  const EMOTIONS = [
    { id: 'breakup', label: 'Trennung', re: /trennung|getrennt|schluss gemacht|liebeskummer|herzschmerz/, ask: true },
    { id: 'sad', label: 'Traurig', re: /traurig|mies|schlecht drauf|\bdown\b|einsam/, ask: true },
    { id: 'angry', label: 'Wut', re: /\bwut\b|wütend|sauer|genervt/, mood: ['intense', 'raw', 'cathartic'], energy: 0.85, valence: 0.3 },
    { id: 'happy', label: 'Gute Laune', re: /glücklich|gut drauf|happy|freu|beste laune/, mood: ['joyful', 'sunny', 'uplifting'], energy: 0.7, valence: 0.9 },
    { id: 'tired', label: 'Müde', re: /müde|erschöpft|kaputt/, mood: ['soft', 'hazy', 'gentle'], energy: 0.25, valence: 0.5 },
  ];

  const RULES = [
    { re: /kein(en)?\s*auto.?tune/, text: 'kein Autotune', avoid: 'heavy autotune' },
    { re: /instrumental|ohne (gesang|text|vocals|stimme)/, text: 'Instrumental', vocals: 'none' },
    { re: /keine?\s*frauenstimme|männliche stimme/, text: 'keine Frauenstimme', vocals: 'male' },
    { re: /keine?\s*männerstimme|weibliche stimme/, text: 'keine Männerstimme', vocals: 'female' },
    { re: /mehr gitarre/, text: 'mehr Gitarren', add: 'prominent electric guitars' },
    { re: /nicht (zu |so )?aggressiv/, text: 'nicht zu aggressiv', avoid: 'aggressive delivery' },
    { re: /keine?\s*trap|nie wieder trap/, text: 'kein Trap', avoid: 'trap hi-hats' },
    { re: /kein(en)? text über|nicht über (die|meine) trennung/, text: 'kein Text über die Trennung', lyric: 'abstract, hopeful imagery' },
  ];

  const TWEAKS = [
    { re: /weniger traurig|fröhlicher|heller|positiver|optimistischer/, note: 'heller', fn: s => { s.valence = clamp(s.valence + 0.2, 0, 1); s.mood = uniq(['hopeful', ...s.mood.filter(m => !/dark|melanch/.test(m))]).slice(0, 3); } },
    { re: /trauriger|dunkler|düsterer|melanchol/, note: 'dunkler', fn: s => { s.valence = clamp(s.valence - 0.2, 0, 1); s.mood = uniq(['dark', ...s.mood.filter(m => !/bright|sunny|hopeful/.test(m))]).slice(0, 3); } },
    { re: /mehr wut|wütender|aggressiver/, note: 'mehr Wut', fn: s => { s.energy = clamp(s.energy + 0.15, 0, 1); s.valence = clamp(s.valence - 0.1, 0, 1); s.mood = uniq(['aggressive', ...s.mood]).slice(0, 3); } },
    { re: /schneller|mehr energie|härter|mehr power|mehr druck|pushen/, note: '+10 BPM, mehr Energie', fn: s => { s.tempo_bpm = Math.min(180, s.tempo_bpm + 10); s.energy = clamp(s.energy + 0.15, 0, 1); } },
    { re: /langsamer|ruhiger|chilliger|entspannter|sanfter/, note: '−10 BPM, ruhiger', fn: s => { s.tempo_bpm = Math.max(60, s.tempo_bpm - 10); s.energy = clamp(s.energy - 0.15, 0, 1); } },
    { re: /mehr bass/, note: 'mehr Bass', fn: s => { s.instruments = uniq([...s.instruments, 'heavier sub bass']); } },
  ];

  const MOOD_DE = {
    nocturnal: 'nächtlich', steady: 'gleichmäßig', 'slightly dark': 'leicht dunkel', driving: 'treibend', determined: 'entschlossen', powerful: 'kraftvoll',
    warm: 'warm', groovy: 'groovig', relaxed: 'entspannt', focused: 'fokussiert', calm: 'ruhig', minimal: 'minimal', euphoric: 'euphorisch', bouncy: 'federnd',
    bright: 'hell', fresh: 'frisch', hopeful: 'hoffnungsvoll', light: 'leicht', melancholic: 'melancholisch', intimate: 'nah', bittersweet: 'bittersüß',
    uplifting: 'aufbauend', defiant: 'trotzig', intense: 'intensiv', raw: 'roh', cathartic: 'befreiend', joyful: 'fröhlich', sunny: 'sonnig', soft: 'weich',
    hazy: 'verträumt', gentle: 'sanft', balanced: 'ausgewogen', dark: 'dunkel', aggressive: 'aggressiv', 'laid-back': 'lässig',
  };
  const moodDe = m => m.slice(0, 2).map(x => MOOD_DE[x] || x).join(' und ');

  const TITLES = {
    Nachtfahrt: ['Amber Exit', 'Tunnel Lights', 'Highway, 3 A.M.', 'Rear-View Neon', 'Low Beam Heart', 'Sodium Glow', 'Last Gas Station', 'Exit 41'],
    Training: ['Red Line', 'Last Rep', 'Pulse Runner', 'Hill Sprint', 'Second Wind'],
    Kochen: ['Slow Simmer', 'Garlic & Gold', 'Kitchen Radio', 'Sunday Sauce'],
    Fokus: ['Paper Rain', 'Deep Work', 'Quiet Grid', 'Margin Notes'],
    Party: ['Floor Theory', 'Strobe Honey', '4 A.M. Confetti', 'Hands Up, Lights Down'],
    Morgen: ['First Light', 'Cold Brew Sun', 'Open Window'],
    Trennung: ['Leere Seite', 'Your Coat Still Here', 'Zwei Tassen', 'Keys on the Table', 'Room to Breathe'],
    Traurig: ['Grey Harbor', 'Slow Tide', 'Soft Static'],
    Wut: ['Break the Glass', 'Static Fist', 'Burn Slow'],
    'Gute Laune': ['Sunny Side', 'Lemon Days', 'Golden Hour'],
    Müde: ['Half Asleep', 'Velvet Dusk'],
  };
  const ADJ = ['Velvet', 'Midnight', 'Glass', 'Slow', 'Golden', 'Hollow', 'Electric', 'Quiet', 'Paper', 'Neon'];
  const NOUN = ['Signal', 'Avenue', 'Tide', 'Motel', 'Orbit', 'Static', 'Harbor', 'Echo', 'Satellite', 'Window'];

  const VOICE_EXAMPLES = [
    'Mach mir 90er Hip-Hop, nicht zu aggressiv.',
    'Ich koche gerade für Freunde. Mach was Warmes mit Groove.',
    'Ich muss mich zwei Stunden konzentrieren.',
    'Ich geh jetzt laufen, gib mir Druck.',
    'Ich hab mich gerade getrennt. Mir geht\'s mies.',
  ];

  // ---------- Zustand ----------
  const state = {
    spec: null, current: null, next: null, preparing: false,
    playing: false, elapsed: 0,
    chat: [], typing: false, pending: null, busy: false,
    session: { context: null, emotion: null, direction: null },
    constraints: [{ id: 'r0', text: 'kein Autotune', avoid: 'heavy autotune', scope: 'dauerhaft' }],
    taste: {
      genres: { synthwave: 0.72, hiphop: 0.64, lofi: 0.55, jazz: 0.41, rock: 0.3, techno: 0.22 },
      energy: 0.5,
      vocals: { male: 0.45, female: 0.35, none: 0.2 },
    },
    library: [], learnLog: [],
    usage: { generations: 37, replays: 58, skips: 9, listenedSec: 37 * 150 + 58 * 170, today: 6 },
    skipTimes: [], counter: 0, usedTitles: new Set(),
    liked: false, disliked: false,
    provider: 'eleven', hoodTab: 'spec',
    pipe: { steps: ['stt', 'llm', 'adapter', 'gen', 'stream'], active: 5, note: null, gen: 1 },
  };

  // ---------- "Mistral": Wunsch → Music-Spec ----------
  function vocalsObj(type) {
    if (type === 'none') return { type: 'none' };
    return { type, register: type === 'male' ? 'mid' : 'mid-high', tone: 'warm' };
  }

  function baseSpec() {
    const top = Object.entries(state.taste.genres).sort((a, b) => b[1] - a[1])[0][0];
    const g = GENRES[top];
    const v = state.taste.vocals;
    const vt = v.none > v.male && v.none > v.female ? 'none' : v.male >= v.female ? 'male' : 'female';
    return {
      genre: top, era: null, tempo_bpm: g.bpm, key: null,
      energy: +state.taste.energy.toFixed(2), valence: 0.55,
      mood: ['warm', 'balanced'], vocals: vocalsObj(vt), instruments: g.inst.slice(),
      lyrics_theme: null, avoid: [], session_context: null,
    };
  }

  function setGenre(spec, key) {
    const g = GENRES[key];
    spec.genre = key;
    spec.tempo_bpm = g.bpm;
    spec.instruments = g.inst.slice();
  }

  function directionOf(t) {
    if (/raus|aufmunter|besser fühlen|ablenk|push|hochziehen/.test(t)) return 'out';
    if (/rein|fühl|zulassen|trauern|runterkommen/.test(t)) return 'in';
    return null;
  }

  function applyDirection(spec, dir, emo, genreGiven) {
    state.session.direction = dir === 'in' ? 'reinfühlen' : 'rauskommen';
    if (dir === 'in') {
      if (!genreGiven) setGenre(spec, 'ballad');
      spec.mood = ['melancholic', 'intimate', 'bittersweet'];
      spec.energy = 0.32; spec.valence = 0.2;
      spec.lyrics_theme = emo === 'breakup' ? 'letting go, memories of a shared apartment' : 'feeling heavy, being allowed to';
      return 'Okay, wir bleiben nah dran.';
    }
    if (!genreGiven) setGenre(spec, 'pop');
    spec.mood = ['uplifting', 'defiant', 'hopeful'];
    spec.energy = 0.68; spec.valence = 0.72;
    spec.lyrics_theme = emo === 'breakup' ? 'moving on, new beginnings' : 'the weight slowly lifting';
    return 'Okay, wir holen dich da raus.';
  }

  function addRule(rule, scope) {
    const found = state.constraints.find(c => c.text === rule.text);
    if (found) { if (scope === 'dauerhaft') found.scope = 'dauerhaft'; return found; }
    const c = { id: 'r' + Date.now() + Math.random().toString(16).slice(2, 6), text: rule.text, scope };
    ['avoid', 'vocals', 'add', 'lyric'].forEach(k => { if (rule[k]) c[k] = rule[k]; });
    state.constraints.push(c);
    return c;
  }

  function applyRules(spec) {
    for (const c of state.constraints) {
      if (c.avoid) spec.avoid = uniq([...spec.avoid, c.avoid]);
      if (c.vocals) spec.vocals = vocalsObj(c.vocals);
      if (c.add) spec.instruments = uniq([...spec.instruments, c.add]);
      if (c.lyric && spec.lyrics_theme) spec.lyrics_theme = c.lyric;
    }
    if (spec.vocals.type === 'none') spec.lyrics_theme = null;
    return spec;
  }

  function interpret(raw) {
    const t = raw.toLowerCase();
    let spec = state.spec ? clone(state.spec) : baseSpec();
    const info = { sit: null, dirText: null, tweaks: [], rules: [], variation: false, unsure: false, era: null };
    let matched = false;

    // Antwort auf eine Rückfrage
    if (state.pending) {
      const dir = directionOf(t);
      if (dir) {
        spec = state.pending.spec;
        info.dirText = applyDirection(spec, dir, state.pending.emo, state.pending.genreGiven);
        matched = true;
      }
      state.pending = null;
    }

    let genreKey = null;
    for (const [k, g] of Object.entries(GENRES)) if (g.re.test(t)) { genreKey = k; break; }
    if (genreKey) { setGenre(spec, genreKey); matched = true; }

    const era = t.match(/\b(?:19|20)?(\d0)er\b/);
    if (era) {
      const d = era[1];
      spec.era = (d >= '50' ? '19' : '20') + d + 's-inspired';
      info.era = spec.era; matched = true;
    }

    const sit = SITUATIONS.find(s => s.re.test(t));
    if (sit) {
      info.sit = sit;
      state.session.context = sit.label;
      spec.session_context = sit.label;
      spec.mood = sit.mood.slice(); spec.energy = sit.energy; spec.valence = sit.valence;
      if (!genreKey) setGenre(spec, sit.genre);
      spec.lyrics_theme = sit.lyrics || null;
      if (sit.instrumental) spec.vocals = vocalsObj('none');
      matched = true;
    }

    const emo = EMOTIONS.find(e => e.re.test(t));
    if (emo) {
      state.session.emotion = emo.label;
      if (!state.session.context || !sit) state.session.context = emo.label;
      spec.session_context = spec.session_context && sit ? spec.session_context : emo.label;
      matched = true;
      if (emo.ask) {
        const dir = directionOf(t);
        if (dir) info.dirText = applyDirection(spec, dir, emo.id, !!genreKey);
        else {
          state.pending = { emo: emo.id, spec, genreGiven: !!genreKey };
          return { question: 'Das tut mir leid. Willst du dich gerade reinfühlen oder eher rauskommen?', options: ['Reinfühlen', 'Rauskommen'] };
        }
      } else {
        spec.mood = emo.mood.slice(); spec.energy = emo.energy; spec.valence = emo.valence;
      }
    }

    const scope = /immer|dauerhaft|generell|grundsätzlich|nie wieder|nie mehr/.test(t) ? 'dauerhaft' : 'Session';
    for (const r of RULES) if (r.re.test(t)) { info.rules.push(addRule(r, scope)); matched = true; }

    for (const tw of TWEAKS) if (tw.re.test(t)) { tw.fn(spec); info.tweaks.push(tw.note); matched = true; }

    if (/nochmal|mehr davon|weiter so|ähnlich|so was|genau so/.test(t)) { info.variation = true; matched = true; }
    if (!matched) { info.unsure = true; info.variation = !!state.spec; }

    spec.energy = +clamp(spec.energy, 0, 1).toFixed(2);
    spec.valence = +clamp(spec.valence, 0, 1).toFixed(2);
    applyRules(spec);
    return { spec, reply: buildReply(spec, info) };
  }

  function buildReply(spec, info) {
    const g = GENRES[spec.genre];
    const parts = [];
    if (info.sit) parts.push(`${info.sit.label} also.`);
    if (info.dirText) parts.push(info.dirText);
    if (info.unsure) parts.push(info.variation ? 'Ich bin nicht ganz sicher, was du meinst. Ich bleib bei der Richtung und variiere.' : 'Ich starte mit etwas aus deinem Geschmack.');
    if (info.tweaks.length) parts.push(`Angepasst: ${info.tweaks.join(', ')}.`);
    else if (info.variation && !info.unsure) parts.push('Gleiche Richtung, neue Variation.');
    const era = spec.era ? ` im Stil der ${spec.era.slice(2, 4)}er` : '';
    parts.push(`${g.label}${era} um ${spec.tempo_bpm} BPM, ${moodDe(spec.mood)}${spec.vocals.type === 'none' ? ', instrumental' : ''}.`);
    if (info.rules.length) parts.push('Gemerkt: ' + info.rules.map(c => `„${c.text}“ (${c.scope === 'dauerhaft' ? 'dauerhaft' : 'nur diese Session'})`).join(', ') + '.');
    else {
      const perm = state.constraints.filter(c => c.scope === 'dauerhaft').map(c => c.text);
      if (perm.length && !info.tweaks.length) parts.push(`Deine Regeln gelten: ${perm.join(', ')}.`);
    }
    return parts.join(' ');
  }

  function variation(spec, seed) {
    const r = seeded(seed);
    const s = clone(spec);
    s.tempo_bpm = clamp(s.tempo_bpm + Math.round((r() - 0.5) * 8), 60, 180);
    s.energy = +clamp(s.energy + (r() - 0.5) * 0.1, 0, 1).toFixed(2);
    return s;
  }

  // ---------- "ElevenLabs": Spec → Song ----------
  const KEYS = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];

  function makeTitle(ctx, r) {
    const list = (TITLES[ctx] || []).filter(x => !state.usedTitles.has(x));
    let title = list.length ? pick(r, list) : null;
    for (let i = 0; !title && i < 20; i++) {
      const t = pick(r, ADJ) + ' ' + pick(r, NOUN);
      if (!state.usedTitles.has(t)) title = t;
    }
    title = title || 'Untitled ' + (state.counter + 1);
    state.usedTitles.add(title);
    return title;
  }

  function makeSong(reqSpec, opts = {}) {
    state.counter++;
    const spec = clone(reqSpec);
    const r = seeded(JSON.stringify(spec) + '#' + state.counter + (opts.title || ''));
    const rootIdx = Math.floor(r() * 12);
    const minor = spec.valence < 0.55;
    spec.key = `${KEYS[rootIdx]} ${minor ? 'minor' : 'major'}`;
    spec.duration_s = SONG_SEC;
    const progs = minor ? [[0, 5, 2, 6], [0, 3, 5, 4], [0, 6, 5, 6]] : [[0, 4, 5, 3], [0, 5, 3, 4], [0, 3, 0, 4]];
    const dens = GENRES[spec.genre].drums === 'none' ? 0.14 : 0.14 + spec.energy * 0.34;
    const music = {
      base: 48 + rootIdx - (rootIdx > 6 ? 12 : 0),
      scale: minor ? [0, 2, 3, 5, 7, 8, 10] : [0, 2, 4, 5, 7, 9, 11],
      prog: pick(r, progs),
      arp: Array.from({ length: 16 }, () => (r() < dens ? 1 + Math.floor(r() * 3) : 0)),
      lead: spec.instruments.some(i => /guitar/.test(i)) ? 'square' : spec.energy > 0.7 ? 'sawtooth' : 'triangle',
    };
    const title = opts.title || makeTitle(spec.session_context, r);
    if (opts.count !== false) { state.usage.generations++; state.usage.today++; }
    return {
      id: 's' + state.counter, title, spec, music, seed: title + state.counter,
      provider: state.provider === 'eleven' ? 'ElevenLabs Music' : 'Mureka',
      createdAt: nowStr(), example: !!opts.example,
    };
  }

  function toElevenLabs(spec) {
    const g = GENRES[spec.genre];
    const parts = [];
    parts.push(`${spec.era ? spec.era + ' ' : ''}${g.en}`);
    parts.push(`${spec.tempo_bpm} BPM${spec.key ? ', ' + spec.key : ''}`);
    parts.push(`${spec.mood.join(', ')} mood, energy ${spec.energy}`);
    parts.push('featuring ' + spec.instruments.join(', '));
    if (spec.vocals.type === 'none') parts.push('instrumental, no vocals');
    else parts.push(`${spec.vocals.type} ${spec.vocals.register}-register ${spec.vocals.tone} vocals${spec.lyrics_theme ? ', lyrics about ' + spec.lyrics_theme : ''}`);
    if (spec.avoid.length) parts.push('Avoid: ' + spec.avoid.join(', '));
    parts.push('Length: 3:00');
    return parts.join('. ') + '.';
  }

  function toMureka(spec) {
    const g = GENRES[spec.genre];
    const prompt = [`${spec.era ? spec.era + ' ' : ''}${g.en}`, `${spec.tempo_bpm} bpm`, ...spec.mood, ...spec.instruments.slice(0, 2)]
      .concat(spec.avoid.map(a => 'no ' + a)).join(', ').slice(0, 1024);
    return {
      model: 'auto',
      prompt,
      gender: spec.vocals.type === 'none' ? null : spec.vocals.type,
      lyrics: spec.vocals.type === 'none' ? '[Instrumental]' : `[auto: ${spec.lyrics_theme || 'free'}]`,
      stream: true,
    };
  }

  // ---------- Audio-Engine (Demo-Synth) ----------
  const Engine = {
    ctx: null, out: null, analyser: null, noiseBuf: null, timer: null, step: 0, nextT: 0, song: null, running: false,
    ensure() {
      if (this.ctx) return true;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      try { this.ctx = new AC(); } catch (e) { return false; }
      const c = this.ctx;
      this.out = c.createGain(); this.out.gain.value = 0;
      const comp = c.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 3;
      this.analyser = c.createAnalyser(); this.analyser.fftSize = 128; this.analyser.smoothingTimeConstant = 0.8;
      this.out.connect(comp); comp.connect(this.analyser); this.analyser.connect(c.destination);
      const len = c.sampleRate;
      this.noiseBuf = c.createBuffer(1, len, c.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      return true;
    },
    unlock() { if (this.ensure() && this.ctx.state === 'suspended') this.ctx.resume(); },
    load(song) { this.song = song; this.step = 0; },
    start() {
      if (!this.ensure()) return false;
      this.ctx.resume();
      const g = this.out.gain, t = this.ctx.currentTime;
      g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(0.5, t + 0.3);
      this.nextT = t + 0.06; this.running = true;
      clearInterval(this.timer);
      this.timer = setInterval(() => this.tick(), 25);
      return true;
    },
    stop() {
      clearInterval(this.timer); this.running = false;
      if (!this.ctx) return;
      const g = this.out.gain, t = this.ctx.currentTime;
      g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(0, t + 0.2);
    },
    tick() {
      const c = this.ctx, s = this.song;
      if (!s || !c) return;
      const sp = 60 / s.spec.tempo_bpm / 4;
      if (this.nextT < c.currentTime - 0.2) this.nextT = c.currentTime + 0.02;
      while (this.nextT < c.currentTime + 0.15) {
        this.playStep(this.step, this.nextT, sp);
        this.nextT += sp; this.step++;
      }
    },
    note(m, deg) { return m.base + m.scale[((deg % 7) + 7) % 7] + 12 * Math.floor(deg / 7); },
    playStep(step, t, sp) {
      const s = this.song, spec = s.spec, m = s.music, pat = GENRES[spec.genre].drums, e = spec.energy;
      const i = step % 16, bar = Math.floor(step / 16);
      const swing = pat === 'boombap' && i % 2 ? sp * 0.16 : 0;
      const tt = t + swing;
      if (pat === 'four') {
        if (i % 4 === 0) this.kick(t, 0.9);
        if (i === 4 || i === 12) this.snare(t, 0.3);
        if (i % 4 === 2) this.hat(t, 0.16, true); else if (e > 0.7 && i % 2) this.hat(t, 0.05);
      } else if (pat === 'boombap') {
        if (i === 0 || i === 10 || (e > 0.55 && i === 7)) this.kick(tt, 0.85);
        if (i === 4 || i === 12) this.snare(tt, 0.42);
        if (i % 2 === 0) this.hat(tt, i % 4 === 0 ? 0.11 : 0.07);
      } else if (pat === 'straight') {
        if (i === 0 || i === 8 || (e > 0.6 && i === 6)) this.kick(t, 0.85);
        if (i === 4 || i === 12) this.snare(t, 0.38);
        if (i % 2 === 0) this.hat(t, 0.08);
      } else if (pat === 'dnb') {
        if (i === 0 || i === 10) this.kick(t, 0.85);
        if (i === 4 || i === 12) this.snare(t, 0.42);
        this.hat(t, i % 2 ? 0.04 : 0.08);
      } else if (pat === 'soft') {
        if (i === 0) this.kick(t, 0.4);
        if (i === 8 && e > 0.3) this.hat(t, 0.05, true);
      }
      const chord = m.prog[bar % 4];
      const tones = [0, 2, 4].map(k => this.note(m, chord + k));
      if (i === 0) this.pad(t, tones.map(n => n + 12), sp * 16, 0.028 + (1 - e) * 0.018, 500 + e * 2200);
      const root = this.note(m, chord) - 12;
      if (pat === 'none') { if (i === 0) this.bass(t, root, sp * 15, 0.22); }
      else if (i === 0 || i === 8 || (e > 0.5 && (i === 6 || i === 14))) this.bass(t, root, sp * (i === 0 ? 3.5 : 1.6), 0.3);
      if (m.arp[i]) this.pluck(tt, tones[m.arp[i] - 1] + 24, 0.07, m.lead);
    },
    mtof(n) { return 440 * Math.pow(2, (n - 69) / 12); },
    env(g, t, a, peak, d) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); },
    kick(t, v) {
      const c = this.ctx, o = c.createOscillator(), g = c.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.13);
      this.env(g, t, 0.004, v, 0.32); o.connect(g); g.connect(this.out); o.start(t); o.stop(t + 0.4);
    },
    noise(t, dur, type, freq, v, q) {
      const c = this.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
      s.buffer = this.noiseBuf; f.type = type; f.frequency.value = freq; f.Q.value = q || 1;
      this.env(g, t, 0.002, v, dur); s.connect(f); f.connect(g); g.connect(this.out);
      s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
    },
    snare(t, v) {
      this.noise(t, 0.16, 'bandpass', 1900, v, 0.8);
      const c = this.ctx, o = c.createOscillator(), g = c.createGain();
      o.type = 'triangle'; o.frequency.setValueAtTime(200, t);
      this.env(g, t, 0.002, v * 0.5, 0.08); o.connect(g); g.connect(this.out); o.start(t); o.stop(t + 0.12);
    },
    hat(t, v, open) { this.noise(t, open ? 0.16 : 0.035, 'highpass', 7500, v); },
    bass(t, n, dur, v) {
      const c = this.ctx, o = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain();
      o.type = 'triangle'; o.frequency.value = this.mtof(n); f.type = 'lowpass'; f.frequency.value = 420;
      this.env(g, t, 0.01, v, dur); o.connect(f); f.connect(g); g.connect(this.out); o.start(t); o.stop(t + dur + 0.05);
    },
    pad(t, notes, dur, v, cut) {
      const c = this.ctx, f = c.createBiquadFilter(), g = c.createGain();
      f.type = 'lowpass'; f.frequency.value = cut; f.Q.value = 0.5;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(v, t + Math.min(0.6, dur * 0.3));
      g.gain.setValueAtTime(v, t + dur * 0.75);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.3);
      f.connect(g); g.connect(this.out);
      for (const n of notes) for (const det of [-7, 7]) {
        const o = c.createOscillator();
        o.type = 'sawtooth'; o.frequency.value = this.mtof(n); o.detune.value = det;
        o.connect(f); o.start(t); o.stop(t + dur + 0.35);
      }
    },
    pluck(t, n, v, type) {
      const c = this.ctx, o = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain();
      o.type = type; o.frequency.value = this.mtof(n);
      f.type = 'lowpass'; f.frequency.setValueAtTime(3200, t); f.frequency.exponentialRampToValueAtTime(600, t + 0.25);
      this.env(g, t, 0.005, v, 0.3); o.connect(f); f.connect(g); g.connect(this.out); o.start(t); o.stop(t + 0.4);
    },
  };

  // ---------- Grafik: Cover & Ringe ----------
  function cssVar(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }
  function hexToRgb(hex) {
    const h = hex.replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map(x => x + x).join('') : h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  let theme = {};
  function readTheme() {
    theme = { accent: hexToRgb(cssVar('--accent') || '#f4a640'), muted: hexToRgb(cssVar('--muted') || '#8da2a1'), line: cssVar('--line') || '#243238' };
  }

  function fitCanvas(cv) {
    const d = window.devicePixelRatio || 1;
    const w = Math.max(1, Math.round(cv.clientWidth * d)), h = Math.max(1, Math.round(cv.clientHeight * d));
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    return [cv.getContext('2d'), w, h];
  }

  function paintRings(c, w, h, o) {
    const r = seeded(o.seed);
    const cx = w * (0.35 + r() * 0.3), cy = h * (0.35 + r() * 0.3);
    const n = Math.round(7 + o.energy * 12);
    const maxR = Math.hypot(w, h) * 0.55;
    const f1 = 2 + Math.floor(r() * 4), f2 = 3 + Math.floor(r() * 5), p1 = r() * 6.28, p2 = r() * 6.28;
    const t = o.t || 0;
    c.lineWidth = Math.max(1, w / 240);
    for (let i = 0; i < n; i++) {
      const base = maxR * (i + 1) / (n + 1);
      const amp = base * (0.04 + o.energy * 0.1);
      c.beginPath();
      for (let a = 0; a <= Math.PI * 2 + 0.01; a += Math.PI / 90) {
        const rr = base + amp * Math.sin(a * f1 + p1 + t * 0.6 + i * 0.35) + amp * 0.5 * Math.sin(a * f2 + p2 - t * 0.4);
        const x = cx + rr * Math.cos(a), y = cy + rr * Math.sin(a);
        if (a === 0) c.moveTo(x, y); else c.lineTo(x, y);
      }
      c.closePath();
      c.strokeStyle = o.ink(i / n);
      c.stroke();
    }
  }

  function drawCover(cv, song) {
    if (!cv) return;
    const [c, w, h] = fitCanvas(cv);
    const s = song.spec;
    const hueA = 205 + (35 - 205) * s.valence + (seeded(song.seed)() - 0.5) * 24;
    const hueB = hueA + 38;
    const gr = c.createLinearGradient(0, 0, w, h);
    gr.addColorStop(0, `hsl(${hueA}, 52%, 26%)`);
    gr.addColorStop(1, `hsl(${hueB}, 58%, 10%)`);
    c.fillStyle = gr; c.fillRect(0, 0, w, h);
    paintRings(c, w, h, { seed: song.seed, energy: s.energy, ink: k => `hsla(${hueA + k * 30}, 90%, 78%, ${0.12 + 0.6 * (1 - k)})` });
    c.fillStyle = 'rgba(255,255,255,0.85)';
    c.font = `600 ${Math.round(w * 0.075)}px "Bricolage Grotesque", system-ui, sans-serif`;
    c.fillText('M', w * 0.07, h * 0.93);
  }

  // Hero-Ringe (Startseite)
  let heroT = 0;
  function drawHero() {
    const cv = $('#hero-canvas');
    if (!cv || cv.offsetParent === null) return;
    const [c, w, h] = fitCanvas(cv);
    c.clearRect(0, 0, w, h);
    const [r, g, b] = theme.accent;
    paintRings(c, w, h, { seed: 'melodyn-hero-7', energy: 0.55, t: heroT, ink: k => `rgba(${r},${g},${b},${0.1 + 0.75 * (1 - k)})` });
  }

  // Visualizer (App)
  const freq = new Uint8Array(64);
  let idleT = 0;
  function drawViz() {
    const cv = $('#viz');
    if (!cv || cv.offsetParent === null) return;
    const [c, w, h] = fitCanvas(cv);
    c.clearRect(0, 0, w, h);
    const bars = 48, gap = w / bars;
    const live = state.playing && Engine.analyser && Engine.running;
    if (live) Engine.analyser.getByteFrequencyData(freq);
    const [r, g, b] = theme.accent, [mr, mg, mb] = theme.muted;
    for (let i = 0; i < bars; i++) {
      let v;
      if (live) v = freq[Math.min(63, Math.floor(i * 1.2))] / 255;
      else v = state.playing ? 0.25 + 0.2 * Math.sin(idleT * 3 + i * 0.5) : 0.06 + 0.04 * Math.sin(i * 0.7 + idleT);
      const bh = Math.max(2, v * h * 0.95);
      c.fillStyle = state.playing ? `rgba(${r},${g},${b},${0.35 + v * 0.65})` : `rgba(${mr},${mg},${mb},0.35)`;
      const x = i * gap + gap * 0.2, bw = gap * 0.6;
      c.fillRect(x, (h - bh) / 2, bw, bh);
    }
  }

  let frame = 0;
  function loop() {
    frame++;
    if (frame % 60 === 0) readTheme();
    if (!REDUCED) { heroT += 0.012; idleT += 0.03; drawHero(); }
    drawViz();
    requestAnimationFrame(loop);
  }

  // ---------- Navigation ----------
  const VIEWS = ['start', 'app', 'konzept'];
  function show(view, fromHash) {
    if (!VIEWS.includes(view)) view = 'start';
    $$('.view').forEach(v => { v.hidden = v.dataset.view !== view; });
    $$('.mainnav button').forEach(b => b.setAttribute('aria-current', b.dataset.nav === view ? 'page' : 'false'));
    if (!fromHash) {
      try { if (location.hash !== '#' + view) history.replaceState(null, '', '#' + view); } catch (e) { /* sandbox */ }
      window.scrollTo(0, 0);
    }
    requestAnimationFrame(() => { drawHero(); if (state.current) drawCover($('#cover'), state.current); if (view === 'app') renderLibrary(); });
  }

  function showPane(p) {
    $$('.pane').forEach(el => { el.hidden = el.dataset.pane !== p; });
    $$('.app-nav button').forEach(b => b.setAttribute('aria-current', b.dataset.pane === p ? 'true' : 'false'));
    if (p === 'library') renderLibrary();
    if (p === 'taste') renderTaste();
    if (p === 'account') renderAccount();
  }

  // ---------- Rendering ----------
  function renderNow() {
    const s = state.current;
    if (!s) return;
    const g = GENRES[s.spec.genre];
    $('#np-title').textContent = s.title;
    $('#np-eyebrow').textContent = s.replay ? 'Aus deiner Bibliothek · kostet nichts' : state.playing ? 'Läuft gerade' : 'Bereit';
    $('#np-sub').textContent = `${g.label} · ${s.spec.tempo_bpm} BPM · ${s.spec.key} · ${s.replay ? 'Replay' : 'erzeugt mit ' + s.provider}`;
    const chips = [];
    if (s.spec.session_context) chips.push(`<span class="chip session">Session: ${esc(s.spec.session_context)}</span>`);
    s.spec.mood.slice(0, 3).forEach(m => chips.push(`<span class="chip">${esc(MOOD_DE[m] || m)}</span>`));
    if (s.spec.vocals.type === 'none') chips.push('<span class="chip">instrumental</span>');
    $('#np-chips').innerHTML = chips.join('');
    drawCover($('#cover'), s);
    $('#btn-like').setAttribute('aria-pressed', String(state.liked));
    $('#btn-dislike').setAttribute('aria-pressed', 'false');
    $('#btn-save').setAttribute('aria-pressed', String(state.library.some(x => x.id === s.id)));
    renderPlayState();
    renderUpNext();
  }

  function renderPlayState() {
    $('#play-icon').setAttribute('href', state.playing ? '#i-pause' : '#i-play');
    $('#btn-play').setAttribute('aria-label', state.playing ? 'Pausieren' : 'Abspielen');
    $('#play-label').textContent = state.playing ? 'Pause' : 'Abspielen';
    if (state.current) $('#np-eyebrow').textContent = state.current.replay ? 'Aus deiner Bibliothek · kostet nichts' : state.playing ? 'Läuft gerade' : 'Bereit';
  }

  function renderProgress() {
    $('#t-cur').textContent = fmtTime(state.elapsed);
    $('#t-dur').textContent = fmtTime(SONG_SEC);
    $('#prog').style.width = (state.elapsed / SONG_SEC * 100).toFixed(2) + '%';
  }

  function renderUpNext() {
    const el = $('#next-title'), chip = $('#next-chip');
    if (state.preparing) { el.textContent = 'wird vorbereitet …'; chip.textContent = 'ElevenLabs arbeitet'; }
    else if (state.next) { el.textContent = `${state.next.title} · ${GENRES[state.next.spec.genre].label}`; chip.textContent = 'vorausgeneriert'; }
    else if (state.current && state.current.replay) { el.textContent = 'neuer Song nach dem Replay'; chip.textContent = 'spart Budget'; }
    else { el.textContent = '–'; chip.textContent = 'noch nichts vorbereitet'; }
  }

  function renderChat() {
    const log = $('#chat-log');
    log.innerHTML = state.chat.map((m, idx) => {
      const tag = m.tag ? `<span class="tag"><svg class="ic"><use href="#i-mic"/></svg>${esc(m.tag)}</span>` : '';
      const who = m.who === 'bot' ? '<span class="who">Melodyn</span>' : '';
      const opts = m.options && idx === state.chat.length - 1 && state.pending
        ? `<div class="opts">${m.options.map(o => `<button class="chip" data-say="${esc(o)}">${esc(o)}</button>`).join('')}</div>` : '';
      return `<div class="msg ${m.who}">${who}<p>${esc(m.text)}</p>${tag}${opts}</div>`;
    }).join('') + (state.typing ? '<div class="msg bot"><span class="who">Melodyn</span><div class="typing"><span></span><span></span><span></span></div></div>' : '');
    log.scrollTop = log.scrollHeight;
    renderSuggest();
  }

  function renderSuggest() {
    const list = state.pending ? [] : ['Schneller', 'Ruhiger', 'Mehr Gitarren', 'Instrumental', 'Dunkler', 'Nochmal sowas', 'Nie wieder Trap'];
    $('#suggest').innerHTML = list.map(t => `<button class="chip" data-say="${esc(t)}">${esc(t)}</button>`).join('');
  }

  const PIPE_INFO = {
    stt: ['Sprache → Text', 'Transkription, z. B. Mistral Voxtral'],
    llm: ['Mistral versteht dich', 'Chat-Verlauf + Geschmack → Music-Spec'],
    adapter: ['Provider-Adapter', ''],
    gen: ['', 'Song wird erzeugt, ≈ 3:00 Audio'],
    stream: ['Stream', 'Song läuft, der nächste wird vorbereitet'],
  };
  const ALL_STEPS = ['stt', 'llm', 'adapter', 'gen', 'stream'];

  function renderPipe() {
    const p = state.pipe;
    const prov = state.provider === 'eleven' ? 'ElevenLabs Music' : 'Mureka';
    $('#pipe').innerHTML = ALL_STEPS.map(key => {
      const idx = p.steps.indexOf(key);
      let cls = 'pending', st = 'wartet';
      if (idx === -1) { cls = 'skipped'; st = key === 'stt' ? 'Texteingabe' : '–'; }
      else if (p.stopAt != null && idx > p.stopAt) { cls = 'skipped'; st = 'nicht nötig'; }
      else if (idx < p.active) { cls = 'done'; st = 'fertig'; }
      else if (idx === p.active) { cls = 'active'; st = 'läuft …'; }
      let [name, detail] = PIPE_INFO[key];
      if (key === 'adapter') detail = `Music-Spec → ${prov}-Prompt`;
      if (key === 'gen') name = prov;
      if (key === 'llm' && p.note) detail = p.note;
      const gbar = key === 'gen' && cls === 'active' ? `<div class="gbar"><i style="width:${Math.round(p.gen * 100)}%"></i></div>` : '';
      return `<li class="${cls}"><span class="dot"></span><div><div class="name">${esc(name)}</div><div class="detail">${esc(detail)}</div></div><span class="state">${st}</span>${gbar}</li>`;
    }).join('');
  }

  function hlJson(obj) {
    const s = esc(JSON.stringify(obj, null, 2));
    return s
      .replace(/(&quot;[^&]*?&quot;)(\s*:)/g, '<span class="k">$1</span>$2')
      .replace(/(:\s*|\[\s*|,\s*|^\s*)(&quot;.*?&quot;)/gm, '$1<span class="s">$2</span>')
      .replace(/(:\s)(-?\d+\.?\d*|null|true|false)(,?)$/gm, '$1<span class="n">$2</span>$3');
  }

  function specView(spec) {
    const o = {
      genre: GENRES[spec.genre].en, era: spec.era, tempo_bpm: spec.tempo_bpm, key: spec.key,
      energy: spec.energy, valence: spec.valence, mood: spec.mood, vocals: spec.vocals,
      instruments: spec.instruments, lyrics_theme: spec.lyrics_theme, avoid: spec.avoid,
      session_context: spec.session_context, duration_s: SONG_SEC,
    };
    Object.keys(o).forEach(k => { if (o[k] === null || o[k] === undefined) delete o[k]; });
    return o;
  }

  function renderHood() {
    $$('[data-hood]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.hood === state.hoodTab)));
    $$('[data-provider]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.provider === state.provider)));
    const song = state.current;
    const spec = song && !song.replay ? song.spec : state.spec;
    const body = $('#hood-body');
    if (!spec) { body.innerHTML = '<p class="empty">Noch kein Wunsch. Sag Melodyn, was du hören willst.</p>'; return; }
    if (state.hoodTab === 'spec') {
      body.innerHTML = `<pre class="code">${hlJson(specView(spec))}</pre>`;
    } else if (state.hoodTab === 'prompt') {
      if (state.provider === 'eleven') {
        const p = toElevenLabs(spec);
        body.innerHTML = `<pre class="code wrapped"><span class="c">// POST music generation · ElevenLabs Music\n// ${p.length} Zeichen, deterministisch aus der Music-Spec gebaut</span>\n${hlJson({ prompt: p, music_length_ms: SONG_SEC * 1000 })}</pre>`;
      } else {
        const m = toMureka(spec);
        body.innerHTML = `<pre class="code wrapped"><span class="c">// POST song generate · Mureka (Reserve-Adapter)\n// prompt: ${m.prompt.length} von max. 1024 Zeichen</span>\n${hlJson(m)}</pre>`;
      }
    } else {
      const recent = state.chat.slice(-6).length;
      const top = Object.entries(state.taste.genres).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => GENRES[k].label);
      const sess = [state.session.context, state.session.emotion, state.session.direction].filter(Boolean);
      body.innerHTML = `<dl class="ctx-list">
        <div><dt>Chat-Verlauf</dt><dd><span class="chip">letzte ${recent} Nachrichten</span></dd></div>
        <div><dt>Geschmack</dt><dd>${top.map(x => `<span class="chip accent">${esc(x)}</span>`).join('')}<span class="chip">Energie ${pct(state.taste.energy)}</span></dd></div>
        <div><dt>Session</dt><dd>${sess.length ? uniq(sess).map(x => `<span class="chip session">${esc(x)}</span>`).join('') : '<span class="chip">keine</span>'}</dd></div>
        <div><dt>Regeln</dt><dd>${state.constraints.length ? state.constraints.map(c => `<span class="chip">${esc(c.text)} · ${c.scope}</span>`).join('') : '<span class="chip">keine</span>'}</dd></div>
        <div><dt>Antwortformat</dt><dd><span class="chip">JSON-Modus, festes Schema</span></dd></div>
      </dl>`;
    }
    const cost = song && song.replay ? 'Replay: $0,00' : `Diese Generation ≈ ${usd(SONG_COST)}`;
    $('#hood-meta').innerHTML = `<span><b>${esc(cost)}</b></span><span>3:00 × $0,15/Min</span><span>Heute ${state.usage.today} / ${DAY_LIMIT} neue Songs</span>`;
  }

  function renderLibrary() {
    const grid = $('#lib-grid');
    if (!grid || grid.closest('[hidden]')) return;
    $('#lib-count').textContent = `${state.library.length} Songs · Replays kostenlos`;
    if (!state.library.length) { grid.innerHTML = '<p class="empty">Noch nichts gespeichert. Tippe im Stream auf „Speichern“.</p>'; return; }
    grid.innerHTML = state.library.map(s => `
      <article class="card song-card">
        <canvas data-cover="${s.id}" aria-hidden="true"></canvas>
        <div><h4>${esc(s.title)}</h4><p class="sub">${esc(GENRES[s.spec.genre].label)} · ${s.spec.tempo_bpm} BPM${s.spec.session_context ? ' · ' + esc(s.spec.session_context) : ''}</p></div>
        <div class="row"><span class="free">${s.example ? 'Beispiel · ' : ''}0 € pro Replay</span><button class="btn" data-replay="${s.id}"><svg class="ic solid"><use href="#i-play"/></svg>Hören</button></div>
      </article>`).join('');
    state.library.forEach(s => drawCover(grid.querySelector(`[data-cover="${s.id}"]`), s));
  }

  function renderTaste() {
    const T = state.taste;
    const rows = Object.entries(T.genres).sort((a, b) => b[1] - a[1]);
    $('#genre-bars').innerHTML = rows.map(([k, v]) => `<div class="brow"><span>${esc(GENRES[k].label)}</span><div class="bar"><i style="width:${(v * 100).toFixed(0)}%"></i></div><span class="v">${pct(v)}</span></div>`).join('');
    $('#energy-v').textContent = pct(T.energy);
    $('#energy-bar').style.width = pct(T.energy).replace(' ', '');
    const vs = T.vocals, sum = vs.male + vs.female + vs.none;
    const cols = { male: 'var(--accent)', female: 'var(--session)', none: 'var(--muted)' };
    const names = { male: 'Männlich', female: 'Weiblich', none: 'Instrumental' };
    $('#vocal-stack').innerHTML = Object.keys(vs).map(k => `<i style="width:${(vs[k] / sum * 100).toFixed(1)}%;background:${cols[k]}"></i>`).join('');
    $('#vocal-legend').innerHTML = Object.keys(vs).map(k => `<span style="--c:${cols[k]}">${names[k]} ${Math.round(vs[k] / sum * 100)} %</span>`).join('');

    const S = state.session;
    $('#session-kv').innerHTML = [
      ['Situation', S.context && S.context !== S.emotion ? S.context : '–'],
      ['Stimmung', S.emotion || '–'],
      ['Richtung', S.direction || '–'],
      ['Läuft ab', S.context || S.emotion ? 'in 6 Stunden' : '–'],
    ].map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('');

    $('#rules').innerHTML = state.constraints.length ? state.constraints.map(c => `
      <li><span>${esc(c.text)}</span><span class="acts">
        <button class="chip ${c.scope === 'dauerhaft' ? 'accent' : 'session'}" data-scope="${c.id}" title="Umschalten">${c.scope === 'dauerhaft' ? 'dauerhaft' : 'nur Session'}</button>
        <button class="icon-btn" data-remove="${c.id}" aria-label="Regel entfernen"><svg class="ic"><use href="#i-x"/></svg></button>
      </span></li>`).join('') : '<li><span>Keine Regeln aktiv.</span></li>';

    $('#learn-log').innerHTML = state.learnLog.map(l => `<li><time>${esc(l.time)}</time><span>${esc(l.text)}</span></li>`).join('');
  }

  function renderAccount() {
    const U = state.usage;
    $('#fresh-v').textContent = `${U.generations} / ${MONTH_SONGS}`;
    $('#fresh-bar').style.width = Math.min(100, U.generations / MONTH_SONGS * 100).toFixed(1) + '%';
    $('#st-fresh').textContent = U.generations;
    $('#st-replay').textContent = U.replays;
    $('#st-skip').textContent = U.skips;
    const recentSkips = state.skipTimes.filter(t => Date.now() - t < 60000).length;
    $('#guard').innerHTML = [
      ['Neue Songs heute', `${U.today} / ${DAY_LIMIT}`, U.today > DAY_LIMIT * 0.8 ? 'warn' : 'ok'],
      ['Skip-Schutz', recentSkips >= 3 ? `${recentSkips} Skips in 60 s` : 'normal', recentSkips >= 3 ? 'warn' : 'ok'],
      ['Vorausgenerieren', 'max. 1 Song', 'ok'],
      ['API-Schlüssel', 'nur im Backend', 'ok'],
      ['Kosten-Notbremse', 'nicht ausgelöst', 'ok'],
    ].map(([k, v, s]) => `<li><span>${k}</span><span class="status ${s}">${esc(v)}</span></li>`).join('');
    const cost = U.generations * SONG_COST;
    const hours = U.listenedSec / 3600;
    $('#cost-stats').innerHTML = [
      [usd(cost), 'Kosten diesen Monat'],
      [usd(SONG_COST), 'pro neuem Song'],
      [usd(cost / Math.max(hours, 0.01)), `pro Hörstunde (${hours.toFixed(1).replace('.', ',')} h inkl. Replays)`],
    ].map(([b, s]) => `<div class="stat"><b>${b}</b><span>${s}</span></div>`).join('');
  }

  function renderAll() { renderNow(); renderProgress(); renderChat(); renderPipe(); renderHood(); renderTaste(); renderAccount(); renderLibrary(); }

  let toastTimer;
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg; el.style.opacity = '1';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.style.opacity = '0'; }, 3800);
  }

  // ---------- Lernen ----------
  function learn(kind, song, at) {
    if (!song) return;
    const T = state.taste, g = song.spec.genre, label = GENRES[g].label;
    const bump = d => { T.genres[g] = +clamp((T.genres[g] ?? 0.3) + d, 0.02, 1).toFixed(3); };
    let msg = '';
    if (kind === 'like') {
      bump(0.06); T.energy = +(T.energy + (song.spec.energy - T.energy) * 0.2).toFixed(3);
      const vt = song.spec.vocals.type; T.vocals[vt] += 0.04;
      msg = `Like für „${song.title}“: ${label} +6 %, Energie-Vorliebe rückt Richtung ${pct(song.spec.energy)}.`;
    } else if (kind === 'save') {
      bump(0.1); msg = `„${song.title}“ gespeichert: ${label} +10 %. Replays kosten ab jetzt nichts.`;
    } else if (kind === 'dislike') {
      bump(-0.08); msg = `„Nicht mein Ding“: ${label} −8 %. Die Session bleibt unberührt.`;
    } else if (kind === 'skip') {
      if (at < 30) {
        if (song.spec.session_context) msg = `Skip nach ${fmtTime(at)} während „${song.spec.session_context}“: nur die Session wird angepasst, dein Profil bleibt.`;
        else { bump(-0.02); msg = `Früher Skip nach ${fmtTime(at)}: ${label} −2 %. Ein einzelner Skip zählt wenig.`; }
      } else msg = `Skip nach ${fmtTime(at)}: kaum Gewicht, der Song lief schon eine Weile.`;
    } else if (kind === 'complete') {
      bump(0.02); msg = `„${song.title}“ komplett gehört: ${label} +2 %.`;
    }
    state.learnLog.unshift({ time: nowStr(), text: msg });
    state.learnLog = state.learnLog.slice(0, 30);
    toast(msg);
    renderTaste();
    renderHood();
  }

  // ---------- Abspielen ----------
  function playSong(song, opts = {}) {
    if (state.playing && state.current && !state.current.replay) state.usage.listenedSec += state.elapsed;
    state.current = song;
    state.elapsed = 0;
    state.liked = false;
    Engine.load(song);
    if (opts.auto && Engine.ctx && Engine.ctx.state !== 'closed') setPlaying(true);
    renderNow(); renderProgress(); renderHood(); renderAccount();
    if (opts.pregen !== false && !song.replay) schedulePregen();
  }

  function setPlaying(on) {
    if (on) {
      Engine.unlock();
      Engine.start();
      state.playing = true;
    } else {
      Engine.stop();
      state.playing = false;
    }
    renderPlayState();
  }

  let pregenTimer;
  function schedulePregen() {
    clearTimeout(pregenTimer);
    state.next = null; state.preparing = true; renderUpNext();
    pregenTimer = setTimeout(() => {
      const base = state.current && !state.current.replay ? state.current.spec : state.spec;
      if (!base) { state.preparing = false; renderUpNext(); return; }
      const req = clone(base); req.key = null;
      state.next = makeSong(variation(req, state.counter + 'v'));
      state.preparing = false;
      renderUpNext(); renderAccount(); renderHood();
    }, 1800);
  }

  function advance(reason) {
    if (reason === 'skip' && checkSkipGuard()) return;
    if (state.next) {
      const n = state.next; state.next = null;
      playSong(n, { auto: true });
    } else if (state.spec) {
      clearTimeout(pregenTimer); state.preparing = false;
      playSong(makeSong(variation(state.spec, state.counter + 'x')), { auto: true });
    }
  }

  function checkSkipGuard() {
    const now = Date.now();
    state.skipTimes = state.skipTimes.filter(t => now - t < 60000);
    if (state.skipTimes.length >= 4 && state.library.length) {
      state.skipTimes = [];
      const fav = state.library[Math.floor(Math.random() * state.library.length)];
      state.chat.push({ who: 'note', text: 'Skip-Schutz: 4 Skips in einer Minute. Ich spiele kurz einen Favoriten aus deiner Bibliothek, der kostet nichts. Sag mir gern, was dich stört.' });
      renderChat();
      replay(fav);
      return true;
    }
    return false;
  }

  function replay(song) {
    const r = Object.assign({}, song, { replay: true });
    state.usage.replays++;
    clearTimeout(pregenTimer); state.preparing = false;
    playSong(r, { auto: true, pregen: false });
    state.next = null; renderUpNext();
  }

  // ---------- Ablauf: Nachricht → Song ----------
  async function runPipe(steps) {
    state.pipe = { steps, active: 0, note: null, gen: 0, stopAt: null };
    renderPipe();
  }
  function pipeTo(key) { state.pipe.active = state.pipe.steps.indexOf(key); renderPipe(); }

  async function send(text, voice) {
    text = (text || '').trim();
    if (!text || state.busy) return;
    state.busy = true;
    Engine.unlock();
    state.chat.push({ who: 'user', text, tag: voice ? 'gesprochen' : null });
    state.typing = true; renderChat();
    const steps = voice ? ['stt', 'llm', 'adapter', 'gen', 'stream'] : ['llm', 'adapter', 'gen', 'stream'];
    await runPipe(steps);
    if (voice) { await sleep(500); pipeTo('llm'); }
    await sleep(850);

    const res = interpret(text);
    state.typing = false;
    if (res.question) {
      state.chat.push({ who: 'bot', text: res.question, options: res.options });
      state.pipe.active = 1 + steps.indexOf('llm'); state.pipe.stopAt = steps.indexOf('llm');
      state.pipe.note = 'Rückfrage statt Song. Kostet nichts.';
      renderChat(); renderPipe(); renderHood();
      state.busy = false;
      return;
    }
    state.spec = res.spec;
    state.chat.push({ who: 'bot', text: res.reply });
    renderChat();
    pipeTo('adapter'); await sleep(300);
    pipeTo('gen');
    const dur = REDUCED ? 600 : 2200;
    const t0 = performance.now();
    while (performance.now() - t0 < dur) {
      state.pipe.gen = (performance.now() - t0) / dur;
      renderPipe();
      await sleep(80);
    }
    const song = makeSong(state.spec);
    state.spec.key = null;
    pipeTo('stream'); await sleep(200);
    state.pipe.active = steps.length; renderPipe();
    playSong(song, { auto: true });
    renderTaste();
    state.busy = false;
  }

  // ---------- Events ----------
  function bind() {
    document.addEventListener('click', e => {
      const t = e.target.closest('button, a');
      if (!t) return;
      if (t.dataset.nav) { e.preventDefault(); show(t.dataset.nav); return; }
      if (t.dataset.try) { Engine.unlock(); show('app'); showPane('stream'); send(t.dataset.try, false); return; }
      if (t.dataset.pane) { showPane(t.dataset.pane); return; }
      if (t.dataset.say) { send(t.dataset.say, false); return; }
      if (t.dataset.hood) { state.hoodTab = t.dataset.hood; renderHood(); return; }
      if (t.dataset.provider) { state.provider = t.dataset.provider; renderHood(); renderPipe(); return; }
      if (t.dataset.replay) { const s = state.library.find(x => x.id === t.dataset.replay); if (s) { Engine.unlock(); replay(s); showPane('stream'); } return; }
      if (t.dataset.scope) {
        const c = state.constraints.find(x => x.id === t.dataset.scope);
        if (c) { c.scope = c.scope === 'dauerhaft' ? 'Session' : 'dauerhaft'; renderTaste(); renderHood(); }
        return;
      }
      if (t.dataset.remove) {
        state.constraints = state.constraints.filter(x => x.id !== t.dataset.remove);
        if (state.spec) { state.spec.avoid = []; applyRules(state.spec); }
        renderTaste(); renderHood();
        return;
      }
    });

    $('#btn-play').addEventListener('click', () => { if (!state.current) return; setPlaying(!state.playing); });
    $('#btn-skip').addEventListener('click', () => {
      if (!state.current) return;
      state.usage.skips++; state.skipTimes.push(Date.now());
      if (!state.current.replay) learn('skip', state.current, state.elapsed);
      Engine.unlock();
      if (!state.playing) setPlaying(true);
      advance('skip');
    });
    $('#btn-like').addEventListener('click', () => {
      if (!state.current || state.liked) return;
      state.liked = true; $('#btn-like').setAttribute('aria-pressed', 'true');
      learn('like', state.current);
    });
    $('#btn-dislike').addEventListener('click', () => {
      if (!state.current) return;
      learn('dislike', state.current);
      Engine.unlock();
      if (!state.playing) setPlaying(true);
      advance('dislike');
    });
    $('#btn-save').addEventListener('click', () => {
      const s = state.current;
      if (!s || state.library.some(x => x.id === s.id)) return;
      const copy = Object.assign({}, s); delete copy.replay;
      state.library.unshift(copy);
      $('#btn-save').setAttribute('aria-pressed', 'true');
      learn('save', s);
      renderLibrary();
    });
    $('#composer').addEventListener('submit', e => {
      e.preventDefault();
      const inp = $('#chat-input');
      const v = inp.value; inp.value = '';
      send(v, false);
    });
    $('#btn-mic').addEventListener('click', async () => {
      if (state.busy) return;
      Engine.unlock();
      const btn = $('#btn-mic'), inp = $('#chat-input');
      btn.classList.add('listening');
      inp.placeholder = 'Hört zu …';
      await sleep(900);
      const text = VOICE_EXAMPLES[Math.floor(Math.random() * VOICE_EXAMPLES.length)];
      for (let i = 1; i <= text.length; i++) { inp.value = text.slice(0, i); await sleep(REDUCED ? 0 : 18); }
      await sleep(250);
      btn.classList.remove('listening');
      inp.placeholder = 'Sag oder schreib, wonach dir ist …';
      inp.value = '';
      send(text, true);
    });

    window.addEventListener('hashchange', () => show(location.hash.slice(1), true));
    window.addEventListener('resize', () => { if (state.current) drawCover($('#cover'), state.current); renderLibrary(); });

    let last = performance.now();
    setInterval(() => {
      const now = performance.now(), dt = (now - last) / 1000; last = now;
      if (!state.playing || !state.current) return;
      state.elapsed += dt;
      if (state.elapsed >= SONG_SEC) {
        state.usage.listenedSec += SONG_SEC;
        if (!state.current.replay) learn('complete', state.current);
        state.elapsed = 0;
        const n = state.next;
        if (n) { state.next = null; state.current = null; playSong(n, { auto: true }); }
        else advance('end');
        return;
      }
      renderProgress();
    }, 250);
  }

  // ---------- Start ----------
  function boot() {
    readTheme();
    const examples = [
      { title: 'Amber Exit', genre: 'synthwave', ctx: 'Nachtfahrt', mood: ['nocturnal', 'steady'], energy: 0.45, valence: 0.4, vocals: 'male' },
      { title: 'Slow Simmer', genre: 'jazz', ctx: 'Kochen', mood: ['warm', 'groovy'], energy: 0.55, valence: 0.72, vocals: 'female' },
      { title: 'Paper Rain', genre: 'lofi', ctx: 'Fokus', mood: ['focused', 'calm'], energy: 0.32, valence: 0.55, vocals: 'none' },
    ];
    state.library = examples.map(x => {
      const g = GENRES[x.genre];
      state.usedTitles.add(x.title);
      return makeSong({
        genre: x.genre, era: null, tempo_bpm: g.bpm, key: null, energy: x.energy, valence: x.valence, mood: x.mood,
        vocals: vocalsObj(x.vocals), instruments: g.inst.slice(), lyrics_theme: null, avoid: ['heavy autotune'], session_context: x.ctx,
      }, { title: x.title, count: false, example: true });
    });

    const first = 'Ich fahre nachts zwei Stunden nach Hause. Mach was dafür.';
    state.chat.push({ who: 'user', text: first, tag: 'gesprochen' });
    const res = interpret(first);
    state.spec = res.spec;
    state.chat.push({ who: 'bot', text: res.reply + ' Sag Bescheid, wenn es schneller oder ruhiger sein soll.' });
    const song = makeSong(state.spec, { count: false });
    state.spec.key = null;
    state.current = song;
    Engine.load(song);
    state.next = makeSong(variation(state.spec, 'boot'), { count: false });
    state.learnLog = [
      { time: '21:04', text: '„Slow Simmer“ gespeichert: Nu Jazz +10 %. Replays kosten ab jetzt nichts.' },
      { time: '20:51', text: 'Skip nach 0:14 während „Kochen“: nur die Session wird angepasst, dein Profil bleibt.' },
      { time: '18:32', text: 'Regel gemerkt: „kein Autotune“ (dauerhaft).' },
      { time: 'gestern', text: 'Like für „Amber Exit“: Synthwave +6 %, Energie-Vorliebe rückt Richtung 45 %.' },
    ];
    state.pipe = { steps: ALL_STEPS.slice(), active: 5, note: null, gen: 1, stopAt: null };

    bind();
    renderAll();
    const h = location.hash.slice(1);
    show(VIEWS.includes(h) ? h : 'start', true);
    drawHero();
    requestAnimationFrame(loop);
    if (window.matchMedia) {
      const mq = matchMedia('(prefers-color-scheme: dark)');
      const onChange = () => { readTheme(); drawHero(); };
      if (mq.addEventListener) mq.addEventListener('change', onChange);
      new MutationObserver(onChange).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  // ---------- Beispiel-Request für die Konzeptseite ----------
  const example = $('#mistral-example');
  if (example) {
    const req = {
      model: 'mistral-small-latest',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'Du bist die Prompt Engine von Melodyn. Antworte nur mit einer Music-Spec als JSON. Keine Diagnosen, höchstens eine Rückfrage, keine Künstlernamen.' },
        { role: 'system', content: 'Profil: Synthwave 72 %, Hip-Hop 64 %, Energie 50 %. Regeln: kein Autotune (dauerhaft). Session: Nachtfahrt.' },
        { role: 'user', content: 'Ich fahre nachts zwei Stunden nach Hause. Mach was dafür.' },
        { role: 'assistant', content: '(vorherige Music-Spec: Synthwave, 96 BPM)' },
        { role: 'user', content: 'Etwas schneller, und mehr Gitarren.' },
      ],
    };
    const out = { genre: 'synthwave', tempo_bpm: 106, energy: 0.6, mood: ['nocturnal', 'steady', 'slightly dark'], vocals: { type: 'male', register: 'mid', tone: 'warm' }, instruments: ['analog synth pads', 'arpeggiated bass', 'prominent electric guitars'], avoid: ['heavy autotune'], session_context: 'Nachtfahrt' };
    example.innerHTML = `<span class="c">// Anfrage an Mistral (vereinfacht)</span>\n${hlJson(req)}\n\n<span class="c">// Antwort: Music-Spec. „schneller“ versteht Mistral nur dank Chat-Verlauf.</span>\n${hlJson(out)}`;
  }
})();
