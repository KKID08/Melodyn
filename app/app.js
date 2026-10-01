/* Melodyn live prototype.
   Real microphone -> Gemini (understands) -> Music-Spec -> Lyria (composes) -> real MP3.
   On GitHub Pages the browser talks to Google directly with the user's own key (kept in localStorage).
   On Vercel it goes through /api/* so the key stays on the server. */
import * as Mix from './mix.js?v=9e03fb5620';
import * as Demo from './demo.js?v=9e03fb5620';
import { Orb } from './orb.js?v=9e03fb5620';
import { Scene } from './scene.js?v=9e03fb5620';
import { API, GEMINI_MODEL, LYRIA_CLIP, LYRIA_FULL, PRODUCER_DEEP, PRODUCER_FAST, TTS_MODEL, producerBody, readProducer, readUnderstand, speakBody, understandBody } from './prompt.js?v=9e03fb5620';

(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = s => { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  const usd = (v, d = 2) => (v < 0.01 && v > 0 && d === 2 ? '<0,01' : v.toFixed(d).replace('.', ',')) + ' $';
  const REDUCED = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const store = {
    get(k, d) { try { const v = localStorage.getItem('melodyn.' + k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem('melodyn.' + k, JSON.stringify(v)); } catch { /* private mode */ } },
  };

  const PRICE = { full: 0.08, clip: 0.04, gText: 0.30e-6, gAudio: 1.0e-6, gOut: 2.5e-6 };
  // Per-model token prices [input, output] in $ per token, public list prices Sept 2026
  const MODEL_PRICE = { [PRODUCER_FAST]: [0.75e-6, 3.75e-6], [PRODUCER_DEEP]: [2.0e-6, 12.0e-6] };

  // ------------------------------------------------------------ icons
  document.body.insertAdjacentHTML('afterbegin', `<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <symbol id="mic" viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11.5" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/></symbol>
  <symbol id="play" viewBox="0 0 24 24"><path d="M7 4.8v14.4a.8.8 0 0 0 1.2.7l11.4-7.2a.8.8 0 0 0 0-1.4L8.2 4.1A.8.8 0 0 0 7 4.8z"/></symbol>
  <symbol id="pause" viewBox="0 0 24 24"><rect x="6" y="4.5" width="4" height="15" rx="1.2"/><rect x="14" y="4.5" width="4" height="15" rx="1.2"/></symbol>
  <symbol id="next" viewBox="0 0 24 24"><path d="M4 5.6v12.8a.7.7 0 0 0 1.1.6l9.2-6.4a.7.7 0 0 0 0-1.2L5.1 5A.7.7 0 0 0 4 5.6z"/><rect x="16.5" y="5" width="2.4" height="14" rx="1.1"/></symbol>
  <symbol id="prev" viewBox="0 0 24 24"><g transform="translate(24 0) scale(-1 1)"><path d="M4 5.6v12.8a.7.7 0 0 0 1.1.6l9.2-6.4a.7.7 0 0 0 0-1.2L5.1 5A.7.7 0 0 0 4 5.6z"/><rect x="16.5" y="5" width="2.4" height="14" rx="1.1"/></g></symbol>
  <symbol id="up" viewBox="0 0 24 24"><path d="M7 10.5V20H4.5A1.5 1.5 0 0 1 3 18.5V12a1.5 1.5 0 0 1 1.5-1.5H7zm0 0l3.6-6.6A1.9 1.9 0 0 1 14 5.3V9h4.9a2 2 0 0 1 2 2.4l-1.4 6.9a2 2 0 0 1-2 1.7H7"/></symbol>
  <symbol id="down" viewBox="0 0 24 24"><g transform="rotate(180 12 12)"><path d="M7 10.5V20H4.5A1.5 1.5 0 0 1 3 18.5V12a1.5 1.5 0 0 1 1.5-1.5H7zm0 0l3.6-6.6A1.9 1.9 0 0 1 14 5.3V9h4.9a2 2 0 0 1 2 2.4l-1.4 6.9a2 2 0 0 1-2 1.7H7"/></g></symbol>
  <symbol id="add" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></symbol>
  <symbol id="added" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="currentColor" stroke="none"/><path d="M8 12.3l2.7 2.7L16.2 9.5" stroke="#0a0a0c" stroke-width="2"/></symbol>
  <symbol id="chev" viewBox="0 0 24 24"><path d="M6 9.5l6 6 6-6"/></symbol>
  <symbol id="chevr" viewBox="0 0 24 24"><path d="M9.5 6l6 6-6 6"/></symbol>
  <symbol id="more" viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.7" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.7" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.7" fill="currentColor" stroke="none"/></symbol>
  <symbol id="plus" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></symbol>
  <symbol id="x" viewBox="0 0 24 24"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/></symbol>
  <symbol id="lock" viewBox="0 0 24 24"><rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3"/></symbol>
  <symbol id="send" viewBox="0 0 24 24"><path d="M12 19V5M6 11l6-6 6 6"/></symbol>
  <symbol id="listen" viewBox="0 0 24 24"><path d="M3.5 10.5v3M7.5 7v10M12 3.5v17M16.5 7.5v9M20.5 10v4"/></symbol>
  <symbol id="lib" viewBox="0 0 24 24"><rect x="3" y="7.5" width="13.5" height="13.5" rx="3"/><path d="M7.5 3.5h9.5A3.5 3.5 0 0 1 20.5 7v9.5"/></symbol>
  <symbol id="user" viewBox="0 0 24 24"><circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0"/></symbol>
  <symbol id="check" viewBox="0 0 24 24"><path d="M5 12.5l4.2 4.2L19 7"/></symbol>
  <symbol id="tune" viewBox="0 0 24 24"><path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/></symbol>
  <symbol id="stop" viewBox="0 0 24 24"><rect x="6.5" y="6.5" width="11" height="11" rx="2.2"/></symbol>
  <symbol id="logo" viewBox="0 0 32 32"><path d="M4 18.5c2.2 0 2.6-7 4.8-7s2.6 11 4.8 11 2.6-15 4.8-15 2.6 15 4.8 15 2.6-7.5 4.8-7.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></symbol>
</svg>`);
  $('#sbicons').innerHTML = `<svg width="18" height="12" viewBox="0 0 18 12" fill="currentColor"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5.5" width="3" height="6.5" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg><svg width="27" height="13" viewBox="0 0 27 13"><rect x=".5" y=".5" width="23" height="12" rx="3.8" fill="none" stroke="currentColor" opacity=".4"/><rect x="2" y="2" width="17" height="9" rx="2.4" fill="currentColor"/></svg>`;

  // ------------------------------------------------------------ auras
  const PAL = {
    night:   { bg: '#0b1236', c: ['#ff7a2f', '#e23d6d', '#2a47b8', '#0f6f8f', '#ffb56b', '#3b1f7a'] },
    tunnel:  { bg: '#0a0f2a', c: ['#ff9a3d', '#1d3fb0', '#c2366b', '#0a5f80', '#ffd08a'] },
    kitchen: { bg: '#3a1408', c: ['#ffb23f', '#e8472b', '#7a8f2e', '#ff8a5b', '#f6d38a'] },
    brass:   { bg: '#24120a', c: ['#ffb347', '#d9480f', '#8f3b76', '#ffd8a8', '#e8590c'] },
    focus:   { bg: '#0f2a2a', c: ['#8fc7b5', '#3f7f74', '#d7e6df', '#4e6e9e', '#a9c9d6'] },
    dusk:    { bg: '#120f2e', c: ['#6d5bd0', '#e79bb5', '#2c3a8c', '#b06ab3', '#f2c4ce'] },
    run:     { bg: '#1a0630', c: ['#ff3d71', '#5b2eff', '#00b3ff', '#ff8a00', '#c23bff'] },
    morning: { bg: '#2b2210', c: ['#ffd36b', '#ff9e7a', '#9fd3e6', '#f7efd8', '#e8b04b'] },
    rain:    { bg: '#101a24', c: ['#6f8fa8', '#c6d3dc', '#3d5a73', '#9bb3a6', '#e2e8ec'] },
    self:    { bg: '#0d0f2a', c: ['#ff7a2f', '#ffb23f', '#2a47b8', '#e23d6d', '#8fc7b5', '#6d5bd0'] },
  };
  const hexA = (h, a) => { const v = parseInt(h.slice(1), 16); return `rgba(${v >> 16 & 255},${v >> 8 & 255},${v & 255},${a})`; };
  function rng(seed) {
    let a = 0;
    for (const ch of String(seed)) a = Math.imul(a ^ ch.charCodeAt(0), 2654435761) >>> 0;
    return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function drawRings(c, W, H, seed, n, alpha) {
    const r = rng('rings' + seed);
    const cx = W * (0.3 + r() * 0.4), cy = H * (0.3 + r() * 0.4);
    const maxR = Math.hypot(W, H) * 0.62;
    const f1 = 2 + Math.floor(r() * 3), f2 = 4 + Math.floor(r() * 4), p1 = r() * 6.28, p2 = r() * 6.28;
    c.lineWidth = Math.max(0.6, W / 420);
    for (let i = 0; i < n; i++) {
      const base = maxR * Math.pow((i + 1) / (n + 1), 1.15), amp = base * 0.07;
      c.beginPath();
      for (let a = 0; a <= Math.PI * 2 + 0.02; a += Math.PI / 120) {
        const rr = base + amp * Math.sin(a * f1 + p1 + i * 0.28) + amp * 0.45 * Math.sin(a * f2 + p2 - i * 0.2);
        const x = cx + rr * Math.cos(a), y = cy + rr * Math.sin(a);
        if (a === 0) c.moveTo(x, y); else c.lineTo(x, y);
      }
      c.closePath();
      c.strokeStyle = `rgba(255,255,255,${alpha * (1 - i / n * 0.6)})`;
      c.stroke();
    }
    return [cx / W, cy / H];
  }
  // Aura artwork. The soft colour field is painted once into a small canvas (it is blurry anyway) and
  // the whole layer drifts with a cheap CSS transform. Live CSS blur on moving blobs looked the same
  // but made phones re-blur the full screen on every frame.
  function paint(el, p, seed, o = {}) {
    if (!el) return;
    el.classList.add('aura');
    const pal = PAL[p] || PAL.night;
    const W = el.clientWidth || 300, H = el.clientHeight || 300, M = Math.max(W, H);
    const r = rng(p + seed), blur = o.blur ?? 0.16, n = o.n ?? 4;
    const lay = document.createElement('div');
    lay.className = 'lay';
    lay.style.background = pal.bg;
    const f = Math.min(1, 200 / M), cv = document.createElement('canvas');
    // The field is drawn 24% larger than the element so the drift never shows an edge
    const pad = 0.12, cw = Math.max(8, Math.round(W * (1 + 2 * pad) * f)), ch = Math.max(8, Math.round(H * (1 + 2 * pad) * f));
    cv.width = cw; cv.height = ch; cv.className = 'field';
    const c = cv.getContext('2d');
    c.fillStyle = pal.bg; c.fillRect(0, 0, cw, ch);
    c.setTransform(f, 0, 0, f, W * pad * f, H * pad * f);
    for (let k = 0; k < n; k++) {
      const s = M * (0.5 + r() * 0.5), x = r() * W, y = r() * H, b = M * blur;
      const R0 = s / 2 + b, inner = Math.max(0, (s / 2 - b) / R0);
      const g = c.createRadialGradient(x, y, 0, x, y, R0), col = pal.c[k % pal.c.length], a = 0.75 + r() * 0.25;
      g.addColorStop(0, hexA(col, a)); g.addColorStop(inner, hexA(col, a * 0.92)); g.addColorStop(1, hexA(col, 0));
      c.fillStyle = g; c.fillRect(x - R0, y - R0, R0 * 2, R0 * 2);
      r(); r(); r(); r(); r(); // same number of draws per blob as before, so existing artwork keeps its look
    }
    cv.style.setProperty('--d', (14 + r() * 10).toFixed(1) + 's');
    cv.style.setProperty('--dx', ((r() - 0.5) * 8).toFixed(1) + '%');
    cv.style.setProperty('--dy', ((r() - 0.5) * 8).toFixed(1) + '%');
    lay.appendChild(cv);
    if (o.lines) {
      const cv = document.createElement('canvas'), d = 2;
      cv.width = Math.round(W * d); cv.height = Math.round(H * d);
      const c = cv.getContext('2d'); c.scale(d, d);
      const [ox, oy] = drawRings(c, W, H, p + seed, o.lines, o.la ?? 0.22);
      cv.style.setProperty('--ox', ox * 100 + '%'); cv.style.setProperty('--oy', oy * 100 + '%');
      lay.appendChild(cv);
    }
    const old = $$(':scope > .lay', el);
    if (old.length && o.fade !== false && !REDUCED) {
      lay.style.opacity = '0'; el.appendChild(lay);
      requestAnimationFrame(() => requestAnimationFrame(() => { lay.style.opacity = '1'; }));
      setTimeout(() => old.forEach(x => x.remove()), 1100);
    } else { old.forEach(x => x.remove()); el.appendChild(lay); }
  }
  function paintStatic(root) {
    $$('.aura[data-p]', root).forEach(el => {
      if (el.dataset.done || !el.clientWidth) return;
      el.dataset.done = '1';
      paint(el, el.dataset.p, el.dataset.seed || '1', { blur: parseFloat(el.dataset.blur || '0.16'), lines: parseInt(el.dataset.lines || '0', 10), la: parseFloat(el.dataset.la || '0.22'), fade: false });
    });
  }
  // Square artwork as an image, for the phone's own lock screen via Media Session
  function coverDataURL(p, seed) {
    const W = 512, cv = document.createElement('canvas'); cv.width = cv.height = W;
    const c = cv.getContext('2d'), pal = PAL[p] || PAL.night, r = rng(p + seed);
    c.fillStyle = pal.bg; c.fillRect(0, 0, W, W);
    c.filter = 'blur(70px)';
    for (let k = 0; k < 4; k++) { const s = W * (0.5 + r() * 0.5); c.fillStyle = pal.c[k % pal.c.length]; c.beginPath(); c.arc(r() * W, r() * W, s / 2, 0, Math.PI * 2); c.fill(); }
    c.filter = 'none';
    drawRings(c, W, W, p + seed, 14, 0.22);
    try { return cv.toDataURL('image/jpeg', 0.85); } catch { return ''; }
  }

  // ------------------------------------------------------------ state
  const S = {
    cur: null, history: [], library: [], next: null, nextPromise: null, nextToken: 0, nextState: 'none',
    composing: null, playing: false,
    session: null, stations: store.get('stations', []),
    chat: [], feedback: [],
    taste: store.get('taste', {}), rules: store.get('rules', []), reactions: store.get('reactions', 0), liked: new Set(),
    settings: Object.assign({ len: 'full', pregen: true, quick: true, dj: true, deep: true, mode: 'live', look: 'wave', limit: 25, code: '', key: '' }, store.get('settings', {})),
    total: store.get('costs', { lyria: 0, gemini: 0, songs: 0, clips: 0, calls: 0 }),
    sess: { lyria: 0, gemini: 0, songs: 0, clips: 0, calls: 0, genMs: [], firstMs: [], audioSec: 0, genSec: 0 },
    day: store.get('day', { date: '', count: 0 }),
    tab: 'home', libseg: 'songs', talkMode: null, limitOk: false,
  };
  const audio = $('#audio');
  const today = () => new Date().toISOString().slice(0, 10);
  if (S.day.date !== today()) S.day = { date: today(), count: 0 };
  const saveState = () => { store.set('taste', S.taste); store.set('rules', S.rules); store.set('reactions', S.reactions); store.set('settings', S.settings); store.set('costs', S.total); store.set('day', S.day); store.set('stations', S.stations.slice(0, 8)); };

  // ------------------------------------------------------------ toast + log + costs
  let toastT, toastFn = null;
  function toast(msg, ok = true, action = null) {
    $('#toasttxt').textContent = msg;
    $('#toast svg').style.display = ok ? '' : 'none';
    const b = $('#toastact');
    b.hidden = !action; b.textContent = action ? action.label : '';
    toastFn = action ? action.fn : null;
    $('#toast').classList.toggle('act', !!action);
    $('#toast').classList.add('on');
    clearTimeout(toastT); toastT = setTimeout(() => $('#toast').classList.remove('on'), action ? 6000 : Math.min(6000, 2200 + msg.length * 35));
  }
  function log(html, detail, err) {
    const ul = $('#calllog');
    const m = $('.muted', ul); if (m) m.remove();
    const li = document.createElement('li');
    if (err) li.className = 'err';
    li.innerHTML = `<span>${new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} · </span>${html}${detail ? `<details><summary>Details</summary><pre>${esc(detail)}</pre></details>` : ''}`;
    ul.prepend(li);
    while (ul.children.length > 30) ul.lastChild.remove();
  }
  function geminiCost(u, model) {
    if (!u) return 0;
    const mp = MODEL_PRICE[model];
    if (mp) return (u.promptTokenCount || 0) * mp[0] + ((u.candidatesTokenCount || 0) + (u.thoughtsTokenCount || 0)) * mp[1];
    let text = 0, aud = 0;
    for (const d of u.promptTokensDetails || []) { if (d.modality === 'AUDIO') aud += d.tokenCount; else text += d.tokenCount; }
    if (!u.promptTokensDetails) text = u.promptTokenCount || 0;
    return text * PRICE.gText + aud * PRICE.gAudio + ((u.candidatesTokenCount || 0) + (u.thoughtsTokenCount || 0)) * PRICE.gOut;
  }
  function renderCosts() {
    const s = S.sess, t = S.total;
    const sum = s.lyria + s.gemini, tsum = t.lyria + t.gemini;
    const avg = s.genMs.length ? s.genMs.reduce((a, b) => a + b, 0) / s.genMs.length / 1000 : 0;
    const firstAvg = s.firstMs.length ? s.firstMs.reduce((a, b) => a + b, 0) / s.firstMs.length / 1000 : 0;
    // Music cost per hour of freshly generated audio (skips not included), plus Gemini share
    const perHour = DEMO() ? 0 : s.genSec > 0 ? (s.lyria + s.gemini) / (s.genSec / 3600) : (S.settings.len === 'clip' ? PRICE.clip * 120 : PRICE.full * 20.3);
    const html = `<div class="big"><b>${usd(sum)}</b><span>diese Sitzung<br>${usd(tsum)} insgesamt</span></div>
      <dl>
        <dt>Songs von Lyria</dt><dd>${s.songs + s.clips} · ${usd(s.lyria)}</dd>
        <dt>Gemini (Zuhören, Prompt)</dt><dd>${s.calls} · ${usd(s.gemini, 4)}</dd>
        <dt>Ø Zeit bis Musik</dt><dd>${firstAvg ? firstAvg.toFixed(1).replace('.', ',') + ' s' : '–'}</dd>
        <dt>Ø Rechenzeit pro Song</dt><dd>${avg ? avg.toFixed(0) + ' s' : '–'}</dd>
        <dt>Pro Stunde neue Musik${s.genSec ? '' : ' (geschätzt)'}</dt><dd>≈ ${usd(perHour)}</dd>
        <dt>Erzeugte Musik</dt><dd>${fmt(s.genSec)} Min.</dd>
        <dt>Heute erzeugt</dt><dd>${S.day.count} / ${S.settings.limit}</dd>
      </dl>
      <p class="note">${DEMO() ? 'Demo-Modus: Keine Anfrage geht an Google, alles kostet 0 $.' : 'Nach öffentlichen Preislisten gerechnet. Die echte Rechnung steht in Google AI Studio.'}</p>`;
    $('#costbox').innerHTML = html;
    $('#costbox2').innerHTML = html;
  }
  function addCost(kind, v, extra = {}) {
    for (const o of [S.sess, S.total]) {
      if (kind === 'gemini') { o.gemini += v; o.calls++; }
      else { o.lyria += v; if (extra.clip) o.clips++; else o.songs++; }
    }
    if (kind === 'lyria') { S.sess.genMs.push(extra.ms); S.sess.genSec += extra.sec || 0; S.day.count++; }
    saveState(); renderCosts();
  }

  // ------------------------------------------------------------ server calls
  class ApiError extends Error { constructor(m, code, status) { super(m); this.code = code; this.status = status; } }
  async function post(path, body) {
    let r;
    try {
      r = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json', 'x-melodyn-code': S.settings.code || '' }, body: JSON.stringify(body) });
    } catch { throw new ApiError('Keine Verbindung zum Server. Bist du online?', 'net'); }
    if (r.ok) return r;
    let e = {};
    try { e = await r.json(); } catch { /* not json */ }
    if (r.status === 401 || e.code === 'auth') { openCode(); throw new ApiError('Zugangscode nötig.', 'auth'); }
    if (r.status === 413) throw new ApiError('Die Antwort war zu groß für den Server. Stell die Songlänge auf „Kurz“.', 'size');
    if (e.code === 'rate') throw new ApiError('Google meldet zu viele Anfragen. Warte kurz und versuch es nochmal.', 'rate');
    throw new ApiError(e.error || `Server-Fehler ${r.status}`, e.code);
  }
  // Direct mode: no server of our own (GitHub Pages, local file) or the user brought a key
  // Demo mode: no request ever leaves the browser, nothing costs money
  const DEMO = () => S.settings.mode === 'demo';
  const DIRECT = () => DEMO() || !!S.settings.key || /github\.io$/.test(location.hostname) || location.protocol === 'file:';
  async function google(model, body, attempt = 0) {
    if (!S.settings.key) { openKey(); throw new ApiError('Trag zuerst deinen Google API-Schlüssel ein.', 'nokey'); }
    let r;
    try {
      r = await fetch(`${API}/${model}:generateContent`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': S.settings.key }, body: JSON.stringify(body) });
    } catch {
      if (attempt < 1 && navigator.onLine !== false) { await sleep(1500); return google(model, body, attempt + 1); }
      throw new ApiError('Keine Verbindung zu Google. Bist du online?', 'net');
    }
    if (r.ok) return r.json();
    // Overloaded or hiccup on Google's side: one quiet retry before bothering the listener
    if ((r.status === 500 || r.status === 502 || r.status === 503 || r.status === 504) && attempt < 1) {
      log(`<b>Google</b> meldet ${r.status}, neuer Versuch`, '', true);
      await sleep(1500);
      return google(model, body, attempt + 1);
    }
    let m = '';
    try { m = (await r.json()).error.message || ''; } catch { /* not json */ }
    if (/api key not valid|api_key_invalid|api key expired/i.test(m)) { openKey(true); throw new ApiError('Google akzeptiert den Schlüssel nicht. Trag ihn neu ein.', 'key'); }
    if (r.status === 429) throw new ApiError('Google meldet zu viele Anfragen oder ein aufgebrauchtes Kontingent. Warte kurz und prüf die Abrechnung in AI Studio.', 'rate');
    throw new ApiError(m ? m.slice(0, 300) : `Google-Fehler ${r.status}`, 'google', r.status);
  }
  function context() {
    const taste = Object.entries(S.taste).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([g, v]) => ({ genre: g, score: v }));
    const h = new Date().getHours();
    return {
      taste, rules: S.rules.filter(r => r.scope !== 'Aus'),
      session: S.session ? { station: S.session.station, current_spec: S.session.spec, last_title: S.session.title } : null,
      recent_feedback: S.feedback.slice(-8),
      time_of_day: h < 6 ? 'nacht' : h < 11 ? 'morgen' : h < 17 ? 'tag' : h < 22 ? 'abend' : 'nacht',
    };
  }
  async function understand(payload) {
    const t0 = performance.now();
    const req = Object.assign({ history: S.chat.slice(-12), context: context() }, payload);
    let d;
    if (DEMO()) {
      await sleep(payload.mode === 'next' ? 500 : 900);
      d = { result: Demo.understand(req, demoHeard), usage: null };
    } else if (DIRECT()) {
      let body;
      try { body = understandBody(req); } catch (e) { throw new ApiError(e.message); }
      const raw = await google(GEMINI_MODEL, body);
      try { d = { result: readUnderstand(raw), usage: raw.usageMetadata }; }
      catch { throw new ApiError('Gemini hat keine lesbare Antwort geliefert. Bitte nochmal versuchen.'); }
    } else {
      const r = await post('/api/understand', req);
      d = await r.json();
    }
    const cost = geminiCost(d.usage);
    if (!DEMO()) addCost('gemini', cost);
    const tok = d.usage ? d.usage.totalTokenCount : 0;
    log(`<b>Gemini</b> ${payload.mode === 'next' ? 'plant den nächsten Song' : payload.audio ? 'hört zu und versteht' : 'versteht'} · ${((performance.now() - t0) / 1000).toFixed(1)} s · ${tok} Tokens · ${usd(cost, 4)}`, JSON.stringify(d.result, null, 2));
    if (payload.mode === 'next') d.result._next = true;
    return d.result;
  }
  // The producer: a second model writes the actual Lyria prompt from the spec and the listener's own words.
  // Falls back along the chain if a model is unavailable, and to the built-in prompt if all fail.
  const deadModels = new Set();
  async function producerCall(model, input) {
    const t0 = performance.now();
    let r, usage;
    try {
      if (DEMO()) { await sleep(400); r = Demo.produce(input); }
      else if (DIRECT()) { const raw = await google(model, producerBody(input, model)); r = readProducer(raw); usage = raw.usageMetadata; }
      else { const d = await (await post('/api/produce', { model, input })).json(); r = d.result; usage = d.usage; }
    } catch (e) {
      // Unknown model or unsupported option: don't try this one again in this session
      if (e.status === 400 || e.status === 403 || e.status === 404) deadModels.add(model);
      throw e;
    }
    const cost = DEMO() ? 0 : geminiCost(usage, model);
    if (!DEMO()) addCost('gemini', cost);
    r.model = DEMO() ? 'Demo' : model; r.ms = performance.now() - t0; r.cost = cost;
    return r;
  }
  async function producerChain(models, input) {
    for (const model of models.filter(m => !deadModels.has(m))) {
      try { return await producerCall(model, input); }
      catch (e) {
        if (e.code === 'nokey' || e.code === 'key') throw e;
        log(`<b>Produzent</b> ${model} nicht verfügbar`, e.message, true);
      }
    }
    return null;
  }
  // The producer: a second model writes the actual Lyria prompt from the spec and the listener's own words.
  // Prepared songs always get the thorough model. For a new wish both run side by side: the thorough answer
  // is used if it arrives within a few seconds, otherwise the fast one, so nobody waits long for quality.
  async function produce(res, { deep = false, previous = null } = {}) {
    const input = {
      mode: res._next ? 'next' : 'first',
      words: (S.session && S.session.words) || [],
      spec: res.spec,
      rules: S.rules.filter(r => r.scope !== 'Aus').map(r => r.text),
      previous,
    };
    const useDeep = S.settings.deep && !deadModels.has(PRODUCER_DEEP) && !DEMO();
    let r = null;
    if (useDeep && deep) r = await producerChain([PRODUCER_DEEP, PRODUCER_FAST, GEMINI_MODEL], input);
    else if (useDeep) {
      const t0 = performance.now();
      const deepP = producerCall(PRODUCER_DEEP, input).catch(e => { if (e.code === 'nokey' || e.code === 'key') throw e; log(`<b>Produzent</b> ${PRODUCER_DEEP} nicht verfügbar`, e.message, true); return null; });
      const fastP = producerChain([PRODUCER_FAST, GEMINI_MODEL], input);
      const fast = await fastP;
      const wait = Math.max(0, 7000 - (performance.now() - t0));
      r = await Promise.race([deepP, sleep(fast ? wait : 20000).then(() => null)]) || fast;
    } else r = await producerChain([PRODUCER_FAST, GEMINI_MODEL], input);
    if (!r) { log('<b>Produzent</b> nicht erreichbar, nutze einfachen Prompt', '', true); return null; }
    log(`<b>Produzent</b> schreibt den Lyria-Prompt · ${esc(r.target || '')} · ${r.model} · ${(r.ms / 1000).toFixed(1)} s · ${usd(r.cost, 4)}`,
      `Verstanden: ${r.listener_intent || ''}\nReferenz: ${r.reference_translation || ''}\nVibe: ${r.vibe || ''}\nGesang: ${r.vocal_delivery || ''}\n\n${r.core}\n\n${r.structure}\n\nAvoid: ${(r.avoid || []).join(', ')}`);
    res.lyria = r;
    return r;
  }
  function lyriaPrompt(res) {
    const s = res.spec, v = s.vocals;
    const parts = [s.genre, `${s.tempo_bpm} BPM`, `${(s.mood || []).join(', ')} mood`];
    if (s.instruments && s.instruments.length) parts.push('featuring ' + s.instruments.join(', '));
    if (v === 'none') parts.push('Instrumental only, no vocals');
    else parts.push(`${v === 'duet' ? 'Male and female duet' : v === 'female' ? 'Female' : 'Male'} vocals singing in ${s.lyrics_language === 'en' ? 'English' : 'German'}${s.lyrics_theme ? ' about ' + s.lyrics_theme : ''}`);
    const avoid = [...new Set([...(s.avoid || []), ...S.rules.filter(r => r.scope !== 'Aus').map(r => r.text)])];
    if (avoid.length) parts.push('Avoid: ' + avoid.join(', '));
    return parts.join('. ') + '.';
  }
  // Final text for Lyria: the producer's sound description, plus a timeline for full songs or a
  // "straight into the hook" note for 30 s clips, plus everything the song must not become
  function lyriaText(res, len) {
    const L = res.lyria;
    if (!L) return lyriaPrompt(res);
    // The producer already turned the listener's rules into English "avoid" phrases
    const avoid = [...new Set([...(L.avoid || []), ...(res.spec.avoid || [])])];
    const body = len === 'clip'
      ? `${L.core}\n30-second excerpt: start directly in the main hook with the full arrangement, so the style is unmistakable from the first second.`
      : `${L.core}\nStructure:\n${L.structure}`;
    return scrubNames(body + (avoid.length ? `\nAvoid: ${avoid.join(', ')}.` : ''), res.spec.references);
  }
  // Lyria refuses prompts with artist or song names; the producer is told so, this is the safety net
  function scrubNames(text, refs) {
    const names = String(refs || '').split(/[,;/&]|\bund\b|\band\b|\bwie\b|\blike\b/i).map(x => x.trim()).filter(x => x.length >= 3);
    for (const n of names) text = text.replace(new RegExp(n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '');
    return text.replace(/ {2,}/g, ' ').replace(/ ([,.])/g, '$1');
  }
  // Plain fallback if Lyria refuses the detailed prompt (titles or themes can trip its filters)
  function simplePrompt(res) {
    const s = res.spec;
    return `${s.genre}, ${s.tempo_bpm} BPM, ${(s.mood || []).slice(0, 2).join(' and ')}. ${s.vocals === 'none' ? 'Instrumental.' : `${s.vocals === 'female' ? 'Female' : 'Male'} vocals in ${s.lyrics_language === 'en' ? 'English' : 'German'}.`}`;
  }
  async function compose(res, opts = {}) {
    const len = opts.len || S.settings.len, retry = !!opts.retry, prompt = retry ? simplePrompt(res) : lyriaText(res, len);
    const t0 = performance.now();
    let d;
    if (DEMO()) return demoCompose(res, len, prompt, t0);
    try {
      if (DIRECT()) d = await google(len === 'clip' ? LYRIA_CLIP : LYRIA_FULL, { contents: [{ parts: [{ text: prompt }] }] });
      else d = await (await post('/api/compose', { prompt, length: len })).json();
    } catch (e) {
      log(`<b>Lyria</b> Fehler: ${esc(e.message)}`, prompt, true);
      throw e;
    }
    const ms = performance.now() - t0;
    const parts = d.candidates?.[0]?.content?.parts || [];
    const audioPart = parts.find(p => p.inlineData && /audio/.test(p.inlineData.mimeType));
    const lyrics = parts.filter(p => p.text).map(p => p.text).join('\n').trim();
    if (!audioPart) {
      const why = d.candidates?.[0]?.finishReason || d.promptFeedback?.blockReason || 'kein Audio';
      log(`<b>Lyria</b> hat keinen Song geliefert (${esc(why)})${retry ? '' : ', versuche es vereinfacht'}`, prompt + '\n\n' + lyrics, true);
      if (!retry) return compose(res, Object.assign({}, opts, { retry: true }));
      throw new ApiError(`Lyria hat keinen Song geliefert (${why}). Formuliere den Wunsch etwas anders.`);
    }
    const bin = atob(audioPart.inlineData.data), bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const blob = new Blob([bytes], { type: audioPart.inlineData.mimeType });
    const cost = len === 'clip' ? PRICE.clip : PRICE.full;
    addCost('lyria', cost, { clip: len === 'clip', ms, sec: blob.size * 8 / 192000 });
    log(`<b>${len === 'clip' ? 'Lyria Clip' : 'Lyria 3.5'}</b> komponiert „${esc(res.title)}“ · ${(ms / 1000).toFixed(0)} s · ${(blob.size / 1e6).toFixed(1)} MB · ${usd(cost)}`, 'Prompt an Lyria:\n' + prompt);
    const id = 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    return {
      id, title: res.title, station: res.station || (S.session && S.session.station) || 'Melodyn', palette: res.palette || 'self', seed: id,
      spec: res.spec, target: res.lyria ? res.lyria.target : '', intent: res.lyria ? res.lyria.listener_intent : '', lyrics, prompt, blob, url: URL.createObjectURL(blob), dur: 0, genMs: ms, len,
    };
  }

  // Demo: a short, believable wait, then one of the real Lyria songs that ship with the app
  async function demoCompose(res, len, prompt, t0) {
    const [song] = await Promise.all([Demo.song(len), sleep(len === 'clip' ? 2200 : 5500)]);
    const ms = performance.now() - t0, blob = song.blob;
    S.sess.genMs.push(ms); S.sess.genSec += blob.size * 8 / 192000;
    if (len === 'clip') S.sess.clips++; else S.sess.songs++;
    renderCosts();
    log(`<b>Demo</b> ${len === 'clip' ? 'Clip' : 'Song'} „${esc(res.title)}“ aus den Beispielsongs · ${(ms / 1000).toFixed(0)} s · kostenlos`, 'Dieser Prompt wäre an Lyria gegangen:\n' + prompt);
    const id = 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    return {
      id, title: res.title, station: res.station || (S.session && S.session.station) || 'Melodyn', palette: res.palette || 'self', seed: id,
      spec: res.spec, target: res.lyria ? res.lyria.target : '', intent: res.lyria ? res.lyria.listener_intent : '', lyrics: song.lyrics, prompt, blob, url: URL.createObjectURL(blob), dur: 0, genMs: ms, len, demo: true,
    };
  }
  let demoHeard = '';

  // ------------------------------------------------------------ DJ voice
  const dj = $('#dj');
  const PRICE_TTS = { in: 0.5e-6, out: 10e-6 };
  function pcmToWavUrl(b64, rate) {
    const bin = atob(b64), n = bin.length;
    const buf = new DataView(new ArrayBuffer(44 + n));
    const w = (o, t) => { for (let i = 0; i < t.length; i++) buf.setUint8(o + i, t.charCodeAt(i)); };
    w(0, 'RIFF'); buf.setUint32(4, 36 + n, true); w(8, 'WAVE'); w(12, 'fmt '); buf.setUint32(16, 16, true); buf.setUint16(20, 1, true); buf.setUint16(22, 1, true);
    buf.setUint32(24, rate, true); buf.setUint32(28, rate * 2, true); buf.setUint16(32, 2, true); buf.setUint16(34, 16, true); w(36, 'data'); buf.setUint32(40, n, true);
    for (let i = 0; i < n; i++) buf.setUint8(44 + i, bin.charCodeAt(i));
    return URL.createObjectURL(new Blob([buf.buffer], { type: 'audio/wav' }));
  }
  async function tts(text) {
    if (!text || !S.settings.dj) return null;
    if (DEMO()) return 'speech:' + text;
    const t0 = performance.now();
    let d;
    try {
      if (DIRECT()) d = await google(TTS_MODEL, speakBody(text));
      else d = await (await post('/api/speak', { text })).json();
    } catch (e) { log(`<b>DJ-Stimme</b> Fehler: ${esc(e.message)}`, text, true); return null; }
    const part = (d.candidates?.[0]?.content?.parts || []).find(p => p.inlineData);
    if (!part) return null;
    const rate = +((/rate=(\d+)/i.exec(part.inlineData.mimeType) || [0, 24000])[1]);
    const u = d.usageMetadata || {};
    const cost = (u.promptTokenCount || 0) * PRICE_TTS.in + (u.candidatesTokenCount || 0) * PRICE_TTS.out;
    addCost('gemini', cost);
    log(`<b>DJ-Stimme</b> „${esc(text)}“ · ${((performance.now() - t0) / 1000).toFixed(1)} s · ${usd(cost, 4)}`);
    return pcmToWavUrl(part.inlineData.data, rate);
  }
  let djDone = null;
  function playDj(url) {
    return new Promise(resolve => {
      if (!url) return resolve();
      const finish = () => { dj.onended = dj.onerror = null; S.djActive = false; djDone = null; renderNext(); $('#pcover').classList.remove('talking'); resolve(); };
      djDone = finish;
      S.djActive = true; renderNext(); $('#pcover').classList.add('talking');
      if (url.startsWith('speech:')) { heard(); Demo.speak(url.slice(7)).then(finish); return; }
      dj.onended = finish; dj.onerror = finish;
      dj.src = url;
      const p = dj.play();
      if (p && p.catch) p.catch(finish);
    });
  }
  function stopDj() { if (djDone) { dj.pause(); Demo.hush(); djDone(); } }
  let fillerUrl = null;
  async function filler() {
    if (!fillerUrl) fillerUrl = await tts('Gleich kommt die ganze Nummer. Bleib kurz dran.');
    return fillerUrl;
  }
  // Instant audible "got it" while Gemini is still thinking
  let chimeCtx;
  function chime() {
    try {
      chimeCtx = getMixCtx();
      if (!chimeCtx) return;
      chimeCtx.resume();
      const t = chimeCtx.currentTime;
      [[660, 0], [990, 0.12]].forEach(([f, d]) => {
        const o = chimeCtx.createOscillator(), g = chimeCtx.createGain();
        o.type = 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t + d); g.gain.exponentialRampToValueAtTime(0.12, t + d + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.5);
        o.connect(g); g.connect(chimeCtx.destination); o.start(t + d); o.stop(t + d + 0.55);
      });
    } catch { /* no audio */ }
  }

  // How long from "wish sent" to the first thing the listener hears (DJ or music)
  let wishT0 = 0;
  function wishSent() { wishT0 = performance.now(); }
  function heard() {
    if (!wishT0) return;
    const ms = performance.now() - wishT0; wishT0 = 0;
    S.sess.firstMs.push(ms); renderCosts();
    log(`<b>Erster Ton</b> ${(ms / 1000).toFixed(1)} s nach dem Wunsch`);
  }
  // Music gets quiet while Melodyn listens, so the microphone hears the voice and not the song
  let duckT;
  function duck(on) {
    clearInterval(duckT);
    const target = on ? 0.18 : 1, step = on ? -0.06 : 0.05;
    duckT = setInterval(() => {
      const v = audio.volume + step;
      audio.volume = on ? Math.max(target, v) : Math.min(target, v);
      if (audio.volume === target) clearInterval(duckT);
    }, 30);
  }

  // ------------------------------------------------------------ screens
  function isOn(id) { return $('#' + id).classList.contains('on'); }
  function setOn(id, on) { $('#' + id).classList.toggle('on', on); syncChrome(); }
  function syncChrome() {
    const full = isOn('s-player') || isOn('s-listen') || isOn('s-code') || isOn('s-key') || (isOn('s-talk') && $('#s-talk').classList.contains('solo'));
    const mini = !!(S.cur || S.composing) && !full && !isOn('s-talk') && !isOn('s-set') && !isOn('s-lyr');
    $('#mini').classList.toggle('on', mini);
    $('#phone').classList.toggle('hasmini', mini);
    $('#tabbar').style.transform = full ? 'translateY(100%)' : '';
    orbsVisible();
  }
  function showTab(t) {
    S.tab = t;
    $$('.tabscr').forEach(s => s.classList.toggle('on', s.id === 's-' + t));
    $$('#tabbar button').forEach(b => b.classList.toggle('on', b.dataset.tab === t));
    if (t === 'lib') renderLib();
    if (t === 'taste') renderTaste(true);
    if (t === 'home') renderRecent();
    orbsVisible();
  }

  // ------------------------------------------------------------ playback
  // 0.1 s of silence as WAV, used to unlock playback inside the first tap (iOS)
  const SILENT = (() => {
    const n = 800, b = new DataView(new ArrayBuffer(44 + n * 2));
    const w = (o, t) => { for (let i = 0; i < t.length; i++) b.setUint8(o + i, t.charCodeAt(i)); };
    w(0, 'RIFF'); b.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt '); b.setUint32(16, 16, true); b.setUint16(20, 1, true); b.setUint16(22, 1, true);
    b.setUint32(24, 8000, true); b.setUint32(28, 16000, true); b.setUint16(32, 2, true); b.setUint16(34, 16, true); w(36, 'data'); b.setUint32(40, n * 2, true);
    let bin = ''; new Uint8Array(b.buffer).forEach(x => { bin += String.fromCharCode(x); });
    return 'data:audio/wav;base64,' + btoa(bin);
  })();
  let unlocked = false;
  function unlockAudio() {
    const ctx = getMixCtx();
    if (ctx && ctx.state === 'suspended') ctx.resume();
    if (unlocked) return;
    unlocked = true;
    for (const el of S.cur ? [dj] : [audio, dj]) {
      el.src = SILENT;
      const p = el.play();
      if (p && p.catch) p.then(() => el.pause()).catch(() => { unlocked = false; });
    }
  }
  function setPlaying(on) {
    if (!S.cur) return;
    if (mix) { finishMix({ paused: !on }); return; }
    if (on) { const p = audio.play(); if (p && p.catch) p.catch(() => toast('Tippe auf Play, um zu starten', false)); }
    else audio.pause();
  }
  function syncPlayIcons() {
    S.playing = (!audio.paused || !!mix) && !!S.cur;
    $$('.playuse').forEach(u => u.setAttribute('href', S.playing ? '#pause' : '#play'));
    $('#miniplay use').setAttribute('href', S.playing ? '#pause' : '#play');
    $('#pcover').classList.toggle('paused', !S.playing && !S.composing);
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = S.playing ? 'playing' : 'paused';
    paintOrb();
  }
  // ------------------------------------------------------------ DJ transitions between tracks
  // Clip -> full song and song -> next song. Normal playback stays on the <audio> element (lock screen,
  // background). Only the seconds of a transition run through Web Audio, then the element takes over again.
  let mixCtx = null, mix = null;
  function getMixCtx() {
    if (!mixCtx) { try { mixCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch { mixCtx = null; } }
    return mixCtx;
  }
  function decoded(song) {
    const ctx = getMixCtx();
    if (!ctx) return Promise.reject(new Error('Kein Web Audio'));
    if (!song._buf) song._buf = song.blob.arrayBuffer().then(ab => ctx.decodeAudioData(ab));
    return song._buf;
  }
  // Analyse the end of `from` and the start of `to`, then plan the transition
  async function prepMix(from, to) {
    if (!from || !to || !from.blob || !to.blob || (from.mixTo && from.mixTo.to === to)) return;
    try {
      const [a, b] = await Promise.all([decoded(from), decoded(to)]);
      const ia = Mix.analyze(a, from.spec && from.spec.tempo_bpm, 45, a.duration - 45);
      const ib = Mix.analyze(b, (to.spec && to.spec.tempo_bpm) || ia.bpm, 40);
      const now = S.cur === from ? audio.currentTime : 0;
      const plan = Mix.plan(ia, ib, now + 2);
      from.mixTo = { to, a, b, ia, ib, plan };
      if (plan) log(`<b>Übergang</b> geplant: ${plan.mode === 'blend' ? 'DJ-Blend mit Bass-Tausch' : 'Echo-Out mit Filter-Einstieg'} · ${ia.bpm.toFixed(0)} → ${ib.bpm.toFixed(0)} BPM`);
    } catch (e) { log('<b>Übergang</b> konnte nicht analysiert werden, es folgt ein direkter Wechsel', String(e), true); }
  }
  function runMix(from, plan) {
    const ctx = getMixCtx(), mt = from.mixTo;
    if (!ctx || ctx.state !== 'running' || !mt || !plan) return false;
    const lead = 0.15, at = ctx.currentTime + lead, aOffset = audio.currentTime + lead;
    const h = Mix.schedule(ctx, ctx.destination, mt.a, mt.b, plan, at, aOffset);
    const m = mix = { from, to: mt.to, h, ctx, at, aOffset, rate: plan.rate, adopted: false };
    setTimeout(() => { if (mix === m) audio.pause(); }, lead * 1000);
    setTimeout(() => { if (mix === m) adoptTarget(m); }, Math.max(0, (h.bStart - ctx.currentTime) * 1000));
    setTimeout(() => { if (mix === m) finishMix(); }, Math.max(0, (h.doneAt + 1.2 - ctx.currentTime) * 1000));
    return true;
  }
  // The incoming track is audible now: switch the screen over to it
  function adoptTarget(m) {
    m.adopted = true;
    const to = m.to;
    if (!m.from.preview && !m.from.replay) S.history.push(m.from);
    if (S.next === to) { S.next = null; S.nextState = 'none'; }
    S.cur = to;
    paintNow(to); renderNow(); mediaSession(to);
    if (to.replay) prepQueue(to);
    else { if (S.session) S.session.title = to.title; armNext(to); }
    if (S.tab === 'lib') renderLib();
  }
  function mixPos(m) {
    const t = m.ctx.currentTime;
    return m.adopted ? m.h.fullPos(t) : m.aOffset + (t - m.at) * m.rate;
  }
  function mixDur(m) { return m.adopted ? m.to.blob.size * 8 / 192000 : m.from.mixTo.a.duration; }
  // Hand the incoming track from Web Audio back to the <audio> element without an audible seam
  function finishMix({ paused = false } = {}) {
    const m = mix;
    if (!m) return;
    if (!m.adopted) adoptTarget(m);
    audio.src = m.to.url;
    const go = () => {
      if (paused) { audio.currentTime = m.h.fullPos(m.ctx.currentTime); m.h.stop(); mix = null; release(m); syncPlayIcons(); renderTime(); return; }
      audio.currentTime = m.h.fullPos(m.ctx.currentTime + 0.2);
      const pr = audio.play();
      audio.addEventListener('playing', function onPlay() {
        audio.removeEventListener('playing', onPlay);
        const drift = m.h.fullPos(m.ctx.currentTime) - audio.currentTime;
        if (Math.abs(drift) > 0.06) audio.currentTime += drift;
        m.h.stop(m.ctx.currentTime + 0.05);
        if (mix === m) mix = null;
        release(m);
        syncPlayIcons();
      });
      if (pr && pr.catch) pr.catch(() => { m.h.stop(); if (mix === m) mix = null; syncPlayIcons(); });
    };
    if (audio.readyState >= 1) go(); else audio.addEventListener('loadedmetadata', go, { once: true });
  }
  function abortMix() {
    const m = mix;
    if (!m) return null;
    mix = null;
    m.h.stop();
    release(m);
    return m;
  }
  // Decoded songs take ~60 MB each: drop them as soon as a transition is over
  function release(m) {
    m.from._buf = null; m.from.mixTo = null;
    m.to._buf = null;
  }
  // Where the current track is heading: the full version of a preview, otherwise the prepared next song
  function mixTarget(c) { return c.preview ? c.full : c.replay ? queueNext(c) : S.next; }
  // Playing from the saved songs: go through them in order, free of charge, with the same transitions
  const repCache = new Map();
  function asReplay(song) {
    let r = repCache.get(song.id);
    if (!r) { r = Object.assign({}, song, { replay: true, url: song.url || URL.createObjectURL(song.blob) }); repCache.set(song.id, r); }
    return r;
  }
  function queueNext(c) {
    if (!S.queue || !c || !c.replay) return null;
    const list = S.queue.list, i = list.findIndex(x => x.id === c.id);
    return i >= 0 && list[i + 1] ? asReplay(list[i + 1]) : null;
  }
  function prepQueue(c) { const n = queueNext(c); if (n) prepMix(c, n); }
  // The next song is planned once the listener has heard a bit of this one, so a quick skip or
  // "not my thing" still shapes it, and nothing is paid for if they change direction right away
  function armNext(song) {
    S.nextToken++; S.next = null; S.nextPromise = null; S.nextTitle = '';
    S.armed = S.settings.pregen && S.session ? song : null;
    S.nextState = S.armed ? 'armed' : 'none';
    renderNext();
  }

  function setSong(song, { replay = false, djUrl = null, noPregen = false } = {}) {
    abortMix();
    clearInterval(duckT); audio.volume = 1;
    if (S.cur && S.cur !== song && !S.cur.replay && !S.cur.preview) S.history.push(S.cur);
    if (replay && !song.replay) song = asReplay(song);
    replay = !!song.replay;
    S.cur = song;
    S.composing = null;
    audio.src = song.url;
    audio.currentTime = 0;
    paintNow(S.cur);
    renderNow();
    mediaSession(S.cur);
    if (djUrl) playDj(djUrl).then(() => { if (S.cur === song && !S.composing) setPlaying(true); });
    else setPlaying(true);
    if (replay) { S.armed = null; prepQueue(song); }
    else if (!song.preview) { S.session && (S.session.title = song.title); if (!noPregen) armNext(song); }
    if (S.tab === 'lib') renderLib();
  }
  function mediaSession(s) {
    if (!('mediaSession' in navigator) || !window.MediaMetadata) return;
    const art = coverDataURL(s.palette, s.seed);
    navigator.mediaSession.metadata = new MediaMetadata({ title: s.title, artist: 'Melodyn · ' + s.station, album: s.spec ? s.spec.genre_de : 'Melodyn', artwork: art ? [{ src: art, sizes: '512x512', type: 'image/jpeg' }] : [] });
    const h = (a, f) => { try { navigator.mediaSession.setActionHandler(a, f); } catch { /* unsupported */ } };
    h('play', () => setPlaying(true)); h('pause', () => setPlaying(false));
    h('nexttrack', () => nextSong('skip')); h('previoustrack', prevSong);
  }
  function paintNow(s) {
    paint($('#pbg'), s.palette, s.seed, { blur: 0.2 });
    paint($('#pcoverart'), s.palette, s.seed, { blur: 0.1, lines: 16 });
    paint($('#minith'), s.palette, s.seed, { blur: 0.14, fade: false });
  }
  let waitTimer;
  function renderNow() {
    const c = S.composing, s = c || S.cur;
    if (!s) return;
    $('#ptitle').innerHTML = c ? '<span class="dots">Wird komponiert</span>' : esc(s.title);
    $('#pgenre').textContent = c ? (c.error ? c.error : `${c.spec.genre_de} · ${c.spec.tempo_bpm} BPM · „${c.title}“`) : `${s.spec.genre_de} · ${s.spec.tempo_bpm} BPM`;
    $('#pstation').textContent = s.station;
    $('#psub').textContent = c ? (c.waitFull ? 'Die ganze Version ist gleich fertig' : 'Melodyn komponiert für dich') : s.replay ? 'Aus deiner Bibliothek · kostet nichts' : s.preview ? 'Vorschau · die ganze Version kommt gleich' : s.demo ? 'Demo · Beispielsong, kostet nichts' : `für dich komponiert · ${(s.genMs / 1000).toFixed(0)} s Rechenzeit`;
    const saved = S.cur && (S.cur.preview ? (S.cur.wantSave || (S.cur.full && S.library.some(x => x.id === S.cur.full.id))) : S.library.some(x => x.id === S.cur.id));
    $('#paddicon').setAttribute('href', saved ? '#added' : '#add');
    $('#pup').classList.toggle('on', !!(S.cur && S.liked.has(S.cur.id)) && !c);
    $('#pcover').classList.toggle('composing', !!c && !c.error);
    $('#pcoverart').classList.toggle('fast', !!c && !c.error);
    $('#ptrack').classList.toggle('wait', !!c);
    $('#minititle').textContent = c ? 'Wird komponiert …' : s.title;
    $('#ministation').textContent = s.station;
    clearInterval(waitTimer);
    if (c && !c.error) {
      const expect = c.expect || (S.settings.len === 'clip' ? 9 : 46);
      const tick = () => {
        const el = (performance.now() - c.t0) / 1000;
        $('#waitclock').textContent = el < expect + 5 ? `noch ca. ${Math.max(1, Math.round(expect - el))} s` : `${Math.round(el)} s, gleich fertig`;
        $('#pbar').style.width = Math.min(96, el / expect * 100) + '%';
        $('#pcur').textContent = fmt(el); $('#prem').textContent = '~' + fmt(expect);
      };
      tick(); waitTimer = setInterval(tick, 250);
    } else renderTime();
    renderNext();
    syncPlayIcons();
  }
  function renderTime() {
    if (S.composing || !S.cur) return;
    if (mix) {
      const t = mixPos(mix), d = mixDur(mix);
      $('#pbar').style.width = (t / d * 100) + '%'; $('#miniprog').style.width = (t / d * 100) + '%';
      $('#pcur').textContent = fmt(t); $('#prem').textContent = '−' + fmt(d - t);
      return;
    }
    const d = audio.duration && isFinite(audio.duration) ? audio.duration : S.cur.dur || 0, t = audio.currentTime || 0;
    const pct = d ? t / d * 100 : 0;
    $('#pbar').style.width = pct + '%';
    $('#pcur').textContent = fmt(t);
    $('#prem').textContent = '−' + fmt(d - t);
    $('#miniprog').style.width = pct + '%';
  }
  function renderNext() {
    const el = $('#pnext'), t = $('#pnexttxt');
    el.classList.remove('ready');
    el.classList.toggle('djon', !!S.djActive);
    if (S.djActive) { t.innerHTML = '<b>Melodyn DJ</b> spricht'; return; }
    if (S.cur && S.cur.preview && !S.composing) {
      if (S.cur.full) { t.innerHTML = `Gleich: <b>${esc(S.cur.title)}</b> in voller Länge · bereit`; el.classList.add('ready'); }
      else if (S.cur.fullError) t.textContent = 'Die ganze Version hat nicht geklappt · Skip holt einen neuen Song';
      else t.innerHTML = `Gleich: <b>${esc(S.cur.title)}</b> in voller Länge · wird komponiert`;
      return;
    }
    if (S.composing) { t.innerHTML = S.composing.error ? 'Tippe unten und versuch es nochmal' : 'Der erste Song braucht einen Moment'; return; }
    if (!S.cur) { t.textContent = ''; return; }
    if (S.cur.replay) {
      const n = queueNext(S.cur);
      if (n) t.innerHTML = `Als Nächstes: <b>${esc(n.title)}</b> · gespeichert, kostenlos`;
      else t.textContent = 'Aus deiner Bibliothek · kostenlos';
      el.classList.add('ready'); return;
    }
    if (!S.settings.pregen) { t.textContent = 'Vorbereiten aus · Skip startet neuen Song'; return; }
    if (S.nextState === 'armed') t.textContent = 'Nächster Song wird gleich geplant';
    else if (S.nextState === 'working') t.innerHTML = `Als Nächstes: <b>${esc(S.nextTitle || 'neuer Song')}</b> · wird komponiert`;
    else if (S.nextState === 'ready' && S.next) { t.innerHTML = `Als Nächstes: <b>${esc(S.next.title)}</b> · bereit`; el.classList.add('ready'); }
    else if (S.nextState === 'error') t.textContent = 'Nächster Song kommt beim Skip';
    else t.textContent = '';
  }

  // ------------------------------------------------------------ song flow
  function applyResult(res) {
    for (const r of res.new_rules || []) {
      const ex = S.rules.find(x => x.text.toLowerCase() === r.text.toLowerCase());
      if (ex) ex.scope = r.scope; else S.rules.push({ text: r.text, scope: r.scope });
      toast(`Gemerkt: ${r.text} (${r.scope.toLowerCase()})`);
    }
    // The listener's own words travel with the session: the producer reads them, not just the spec
    const said = res._next ? '' : String(res.transcript || '').trim();
    if (res.new_session || !S.session) {
      S.session = { id: 'st' + Date.now().toString(36), station: res.station, palette: res.palette, spec: res.spec, title: res.title, words: said ? [said] : [] };
    } else {
      Object.assign(S.session, { spec: res.spec, palette: res.palette || S.session.palette });
      if (said) S.session.words = [...(S.session.words || []), said].slice(-5);
    }
    const st = { station: S.session.station, palette: S.session.palette, spec: S.session.spec, words: S.session.words };
    S.stations = [st, ...S.stations.filter(x => x.station !== st.station)].slice(0, 8);
    saveState(); renderTaste(false); renderRecent(); paintOrb();
  }
  // The orb on the home screen takes on the colours of the current moment and pulses with the music
  let homeOrb = null;
  function paintOrb() {
    if (!homeOrb) return;
    const c = S.cur && !S.composing ? S.cur : null;
    homeOrb.setPalette(PAL[(c && c.palette) || (S.session && S.session.palette) || 'self'] || PAL.self);
    homeOrb.setBpm(c && S.playing && c.spec ? c.spec.tempo_bpm : 0);
  }
  // Home look: the orb, or one of the wide scenes (wave, aurora, pulse)
  let orbV = null, sceneV = null;
  function applyLook() {
    const look = S.settings.look || 'wave', wide = look !== 'orb';
    if (homeOrb) homeOrb.stop();
    $('#orb').classList.toggle('wide', wide);
    $('#orb').dataset.look = look;
    if (wide) {
      if (!sceneV) sceneV = new Scene($('#scenecv'), { theme: look, still: REDUCED });
      sceneV.setTheme(look); homeOrb = sceneV;
    } else {
      if (!orbV) orbV = new Orb($('#orbcv'), { glow: 0.42, still: REDUCED });
      homeOrb = orbV;
    }
    $$('#lookseg button').forEach(b => b.classList.toggle('on', b.dataset.look === look));
    paintOrb();
    requestAnimationFrame(() => { homeOrb.resize(); orbsVisible(); });
  }
  function orbsVisible() {
    if (!homeOrb) return;
    const covered = isOn('s-player') || isOn('s-listen') || isOn('s-key') || isOn('s-code') || (isOn('s-talk') && $('#s-talk').classList.contains('solo'));
    if (S.tab === 'home' && !covered && !document.hidden) homeOrb.start(); else homeOrb.stop();
  }
  function overLimit(retry) {
    if (DEMO() || S.day.count < S.settings.limit || S.limitOk) return false;
    toast(`Tageslimit von ${S.settings.limit} Songs erreicht`, false, retry ? { label: 'Trotzdem', fn: () => { S.limitOk = true; retry(); } } : null);
    return true;
  }
  let composeToken = 0;
  // New wish or change of direction: DJ + 30 s clip first, full song takes over when ready
  async function startSong(res, opts = {}) {
    const { delayOpen = 0, dj: withDj = true } = opts;
    applyResult(res);
    if (overLimit(() => startSong(res, Object.assign({}, opts, { delayOpen: 0 })))) return;
    const token = ++composeToken;
    S.nextToken++; S.next = null; S.nextPromise = null; S.nextState = 'none'; S.armed = null; S.queue = null;
    stopDj();
    const quick = S.settings.len === 'full' && S.settings.quick;
    const t0 = performance.now();
    S.composing = { title: res.title, station: S.session.station, palette: res.palette, seed: 'c' + token + res.title, spec: res.spec, t0, expect: quick || S.settings.len === 'clip' ? 13 : 49 };
    if (S.cur) audio.pause();
    paintNow(S.composing);
    if (delayOpen) setTimeout(() => { if (token === composeToken) setOn('s-player', true); }, delayOpen);
    else setOn('s-player', true);
    renderNow();
    res.station = S.session.station;
    // The DJ can already be recorded while the producer writes the music prompt
    const djP = withDj ? tts(res.dj_line) : Promise.resolve(null);
    try { await produce(res, { previous: res._next && S.cur ? S.cur.prompt : null }); }
    catch (e) { if (token === composeToken) { S.composing.error = e.message; renderNow(); toast(e.message, false); } return; }
    if (token !== composeToken) return;
    const fullP = compose(res, { len: S.settings.len });
    const clipP = quick ? compose(res, { len: 'clip' }).catch(() => null) : null;
    const fail = e => {
      if (token !== composeToken) return;
      S.composing = S.composing || { title: res.title, station: S.session.station, palette: res.palette, seed: 'e' + token, spec: res.spec, t0 };
      S.composing.error = e.message; renderNow(); toast(e.message, false);
      addBotMsg('Das hat leider nicht geklappt: ' + e.message, true);
    };
    const djUrl = await djP;
    if (token !== composeToken) return;
    if (djUrl) await playDj(djUrl);
    if (token !== composeToken) return;
    if (clipP) {
      const clip = await clipP;
      if (token !== composeToken) return;
      if (clip) {
        clip.preview = true; clip.fullP = fullP; clip.fullT0 = t0;
        fullP.then(f => { clip.full = f; if (clip.wantSave) keep(f, true); if (S.cur === clip) { renderNext(); renderNow(); } prepMix(clip, f); }, () => { clip.fullError = true; if (S.cur === clip) renderNext(); });
        setSong(clip);
        return;
      }
    }
    try {
      const song = await fullP;
      if (token !== composeToken) return;
      setSong(song);
    } catch (e) { fail(e); }
  }
  // Clip finished (or skipped): hand over to the full version of the same moment
  async function handoff(clip) {
    if (clip.full) { setSong(clip.full); return; }
    if (clip.fullError) { clip.preview = false; nextSong('end'); return; }
    const token = composeToken;
    S.composing = { title: clip.title, station: clip.station, palette: clip.palette, seed: clip.seed, spec: clip.spec, t0: clip.fullT0, expect: 46, waitFull: true };
    audio.pause();
    renderNow();
    if (S.settings.dj) { const f = await filler(); if (f && token === composeToken && !clip.full) await playDj(f); }
    try {
      const full = await clip.fullP;
      if (token !== composeToken) return;
      setSong(full);
    } catch (e) {
      if (token !== composeToken) return;
      S.composing.error = e.message; renderNow(); toast(e.message, false);
    }
  }
  function prepareNext() {
    S.nextToken++;
    const token = S.nextToken;
    S.next = null; S.nextTitle = '';
    if (!S.settings.pregen || !S.session || (S.day.count >= S.settings.limit && !DEMO())) { S.nextState = 'none'; S.nextPromise = null; renderNext(); return; }
    S.nextState = 'working';
    renderNext();
    S.nextPromise = (async () => {
      const res = await understand({ mode: 'next' });
      if (token !== S.nextToken) return null;
      S.nextTitle = res.title; renderNext();
      res.station = S.session ? S.session.station : res.station;
      // No one is waiting here, so the more thorough producer model gets the job
      await produce(res, { deep: true, previous: S.cur ? S.cur.prompt : null });
      if (token !== S.nextToken) return null;
      const song = await compose(res);
      if (token !== S.nextToken) return null;
      if (S.session) S.session.spec = res.spec;
      S.next = song; S.nextState = 'ready'; renderNext();
      if (S.cur && !S.cur.preview && !S.cur.replay) prepMix(S.cur, song);
      return song;
    })().catch(e => { if (token === S.nextToken) { S.nextState = 'error'; renderNext(); log(`<b>Nächster Song</b> nicht vorbereitet: ${esc(e.message)}`, '', true); } return null; });
  }
  async function nextSong(reason) {
    if (S.composing && !S.composing.error) return;
    if (mix) { const m = abortMix(); if (!m.adopted) { setSong(m.to); return; } }
    if (S.cur && S.cur.preview && reason !== 'dislike') return handoff(S.cur);
    stopDj();
    // Saved songs play on in order and cost nothing
    const q = S.cur && S.cur.replay ? queueNext(S.cur) : null;
    if (q) {
      const c = S.cur;
      if (reason === 'skip' && c.mixTo && c.mixTo.to === q && !document.hidden && !audio.paused) {
        const qp = Mix.quickPlan(c.mixTo.ia, c.mixTo.ib, audio.currentTime);
        if (qp && runMix(c, qp)) return;
      }
      setSong(q);
      return;
    }
    if (S.cur && S.cur.replay && S.queue) { S.queue = null; if (!S.session) { toast('Das war dein letzter gespeicherter Song'); return; } }
    if (!S.session) { if (S.cur) toast('Sag Melodyn zuerst, wonach dir ist', false); return; }
    if (reason === 'skip' && S.cur && !S.cur.replay) feedback('skip');
    // "Not my thing": a song planned before this reaction would be more of the same
    if (reason === 'dislike') { S.nextToken++; S.next = null; S.nextPromise = null; S.nextState = 'none'; S.armed = null; }
    if (S.next && S.nextState === 'ready') {
      const n = S.next, c = S.cur;
      // Skip with the next song already analysed: short echo-out on the next beat instead of a hard cut
      if (reason === 'skip' && c && c.mixTo && c.mixTo.to === n && !document.hidden && !audio.paused) {
        const qp = Mix.quickPlan(c.mixTo.ia, c.mixTo.ib, audio.currentTime);
        if (qp && runMix(c, qp)) return;
      }
      setSong(n);
      return;
    }
    if (overLimit(() => nextSong(reason))) return;
    const token = ++composeToken;
    if (S.nextState === 'working' && S.nextPromise) {
      S.composing = { title: S.nextTitle || 'Nächster Song', station: S.session.station, palette: S.session.palette, seed: 'n' + token, spec: S.session.spec, t0: performance.now(), expect: 40 };
      audio.pause(); paintNow(S.composing); renderNow();
      const song = await S.nextPromise;
      if (token !== composeToken) return;
      if (song) { setSong(song); return; }
    }
    // Nothing prepared: same fast path as a new wish
    S.composing = { title: 'Nächster Song', station: S.session.station, palette: S.session.palette, seed: 'n' + token, spec: S.session.spec, t0: performance.now(), expect: 12 };
    audio.pause(); paintNow(S.composing); renderNow();
    try {
      const res = await understand({ mode: 'next' });
      if (token !== composeToken) return;
      res.new_session = false;
      startSong(res, { dj: false });
    } catch (e) {
      if (token !== composeToken) return;
      S.composing.error = e.message; renderNow(); toast(e.message, false);
    }
  }
  function prevSong() {
    if (!S.cur || S.composing) return;
    if (mix) { const m = abortMix(); setSong(m.to); return; }
    if (audio.currentTime > 5 || !S.history.length) { audio.currentTime = 0; return; }
    const p = S.history.pop();
    const cur = S.cur; S.cur = null;
    S.queue = null;
    setSong(p, { replay: true });
    S.history.push(cur);
  }
  function feedback(kind) {
    const s = S.cur;
    if (!s || !s.spec) return;
    const g = s.spec.genre_de;
    const d = { like: 4, save: 5, dislike: -5, skip: audio.currentTime < 30 ? -1 : 0, complete: 1 }[kind] || 0;
    if (d) { S.taste[g] = clamp((S.taste[g] ?? 50) + d, 5, 99); S.bumped = g; }
    S.reactions++;
    S.feedback.push({ title: s.title, genre: g, bpm: s.spec.tempo_bpm, action: kind, at_second: Math.round(audio.currentTime) });
    saveState(); renderTaste(false);
  }
  function like() {
    const s = S.cur; if (!s || S.composing) return;
    if (S.liked.has(s.id)) { S.liked.delete(s.id); toast('Like entfernt'); }
    else { S.liked.add(s.id); feedback('like'); toast(`Mehr davon. Gemerkt für ${s.station}`); }
    pop('#pup'); renderNow();
  }
  function dislike() {
    if (!S.cur || S.composing) return;
    feedback('dislike'); toast('Weniger davon. Nächster Song kommt');
    nextSong('dislike');
  }
  async function save() {
    let s = S.cur; if (!s || S.composing) return;
    // During the preview clip the listener means the song, so the full version is what gets saved
    if (s.preview) {
      if (s.full) s = s.full;
      else {
        s.wantSave = !s.wantSave;
        if (s.wantSave) feedback('save');
        toast(s.wantSave ? 'Wird gespeichert, sobald die ganze Version da ist' : 'Wird doch nicht gespeichert');
        pop('#padd'); renderNow(); return;
      }
    }
    const i = S.library.findIndex(x => x.id === s.id);
    if (i >= 0) { S.library.splice(i, 1); await DB.del(s.id); toast('Aus Bibliothek entfernt'); }
    else { feedback('save'); await keep(s); }
    pop('#padd'); renderNow();
  }
  async function keep(s, quiet) {
    if (S.library.some(x => x.id === s.id)) return;
    const rec = { id: s.id, title: s.title, station: s.station, palette: s.palette, seed: s.seed, spec: s.spec, lyrics: s.lyrics, blob: s.blob, dur: s.dur || s.blob.size * 8 / 192000, created: Date.now(), url: s.url };
    S.library.unshift(rec);
    const ok = await DB.put(rec);
    if (!quiet || !ok) toast(ok ? 'In Bibliothek gespeichert' : 'Gespeichert, bleibt aber nur bis zum Neuladen');
    if (S.tab === 'lib') renderLib();
  }
  function pop(sel) { const b = $(sel); b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); }

  // ------------------------------------------------------------ library (IndexedDB)
  const DB = {
    db: null,
    open() {
      return new Promise(res => {
        try {
          const r = indexedDB.open('melodyn', 1);
          r.onupgradeneeded = () => r.result.createObjectStore('songs', { keyPath: 'id' });
          r.onsuccess = () => { this.db = r.result; res(true); };
          r.onerror = () => res(false);
        } catch { res(false); }
      });
    },
    tx(mode, fn) {
      return new Promise(res => {
        if (!this.db) return res(null);
        try { const t = this.db.transaction('songs', mode); const q = fn(t.objectStore('songs')); t.oncomplete = () => res(q && q.result !== undefined ? q.result : true); t.onerror = () => res(null); } catch { res(null); }
      });
    },
    all() { return this.tx('readonly', s => s.getAll()); },
    put(rec) { const { url, ...plain } = rec; return this.tx('readwrite', s => s.put(plain)); },
    del(id) { return this.tx('readwrite', s => s.delete(id)); },
  };
  function renderLib() {
    $$('#libseg button').forEach(b => b.classList.toggle('on', b.dataset.seg === S.libseg));
    const list = S.libseg === 'songs' ? S.library : [...(S.cur ? [S.cur] : []), ...S.history.slice().reverse()];
    const body = $('#libbody');
    body._list = list;
    if (!list.length) {
      body.innerHTML = `<p class="empty">${S.libseg === 'songs' ? 'Noch nichts gespeichert. Tippe im Player auf ⊕, dann liegt der Song hier und kostet beim Wiederhören nichts.' : 'Noch kein Verlauf. Tippe auf der Startseite auf die Kugel.'}</p>`;
      return;
    }
    body.innerHTML = list.map((s, i) => `<button class="item${S.cur && S.cur.id === s.id ? ' playing' : ''}" data-song="${i}"><div class="art" id="la${i}"></div><div style="min-width:0"><b>${esc(s.title)}</b><span>${esc(s.spec ? s.spec.genre_de : '')} · ${esc(s.station)}</span></div><span class="d">${S.cur && S.cur.id === s.id ? `<span class="eq${S.playing ? '' : ' paused'}"><i></i><i></i><i></i></span>` : fmt(s.dur)}</span></button>`).join('');
    list.forEach((s, i) => paint($('#la' + i), s.palette, s.seed, { blur: 0.12, fade: false }));
  }
  function renderRecent() {
    const row = $('#recent');
    $('#recenth').textContent = S.stations.length ? 'Weiter hören' : 'Zum Start';
    $('#recentall').hidden = !S.stations.length;
    if (!S.stations.length) {
      // First visit: a few moments to tap instead of an empty shelf
      const ideas = [['Nachtfahrt nach Hause', 'tunnel', 'Synthwave'], ['90er West Coast, chillig', 'brass', 'Hip-Hop'], ['Ich muss mich konzentrieren', 'focus', 'Lo-Fi'], ['Ich koche für Freunde', 'kitchen', 'Neo-Soul'], ['Laufen gehen', 'run', 'Drum & Bass']];
      row.innerHTML = ideas.map(([w, p, g], i) => `<button class="card idea" data-wish="${esc(w)}"><div class="art" id="rc${i}"></div><b>${esc(w)}</b><span>${esc(g)}</span></button>`).join('');
      ideas.forEach(([w, p], i) => paint($('#rc' + i), p, w, { blur: 0.12, lines: 9, fade: false }));
      return;
    }
    row.innerHTML = S.stations.slice(0, 6).map((st, i) => `<button class="card" data-station="${i}"><div class="art" id="rc${i}"></div><b>${esc(st.station)}</b><span>${esc(S.session && S.session.station === st.station ? 'Läuft gerade' : st.spec.genre_de)}</span></button>`).join('');
    S.stations.slice(0, 6).forEach((st, i) => paint($('#rc' + i), st.palette, st.station, { blur: 0.12, lines: 9, fade: false }));
  }
  function renderTaste(animate) {
    const rows = Object.entries(S.taste).sort((a, b) => b[1] - a[1]).slice(0, 5);
    $('#genres').innerHTML = rows.length ? rows.map(([g, v]) => `<div class="g${S.bumped === g ? ' bump' : ''}"><span>${esc(g)}</span><div class="ln"><i style="width:${animate ? 0 : v}%" data-w="${v}"></i></div><span class="v">${v}</span></div>`).join('') : '<p class="empty" style="text-align:left;padding:6px 0">Noch keine Reaktionen.</p>';
    if (animate) requestAnimationFrame(() => requestAnimationFrame(() => $$('#genres .ln i').forEach(i => { i.style.width = i.dataset.w + '%'; })));
    if (rows.length) {
      const top = rows.slice(0, 2).map(r => r[0]);
      const likes = S.feedback.filter(f => f.action === 'like' || f.action === 'save');
      const bpm = likes.length ? Math.round(likes.reduce((a, f) => a + f.bpm, 0) / likes.length) : null;
      $('#tastesum').textContent = `Am liebsten ${top.join(' und ')}${bpm ? `, meist um ${bpm} BPM` : ''}.`;
    }
    $('#learned').textContent = S.reactions ? `Gelernt aus ${S.reactions} ${S.reactions === 1 ? 'Reaktion' : 'Reaktionen'}` : '';
    $('#nowblk').innerHTML = S.session
      ? `<div class="nowcard"><b>Gerade: ${esc(S.session.station)}</b><span>Bleibt nur für diese Session</span><button class="forget" id="forget">Vergessen</button></div>`
      : '<div class="nowcard gone"><b>Keine aktive Session</b><span>Sag Melodyn, wonach dir ist</span></div>';
    $('#rules').innerHTML = S.rules.length ? S.rules.map((r, i) => `<button class="rule${r.scope === 'Aus' ? ' off' : ''}" data-rule="${i}"><b>${esc(r.text)}</b><span>${r.scope}<svg class="i" style="width:16px;height:16px"><use href="#chevr"/></svg></span></button>`).join('') : '<p class="empty" style="text-align:left;padding:6px 0">Sag zum Beispiel „nie wieder Autotune“.</p>';
  }

  // ------------------------------------------------------------ microphone
  const Rec = {
    async start() {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 } });
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      await this.ctx.resume();
      this.src = this.ctx.createMediaStreamSource(this.stream);
      this.an = this.ctx.createAnalyser(); this.an.fftSize = 1024;
      this.proc = this.ctx.createScriptProcessor(4096, 1, 1);
      this.chunks = [];
      this.proc.onaudioprocess = e => this.chunks.push(new Float32Array(e.inputBuffer.getChannelData(0)));
      this.src.connect(this.an); this.src.connect(this.proc); this.proc.connect(this.ctx.destination);
      this.buf = new Uint8Array(this.an.fftSize);
      this.on = true;
    },
    level() {
      if (!this.on) return 0;
      this.an.getByteTimeDomainData(this.buf);
      let s = 0; for (const v of this.buf) { const x = (v - 128) / 128; s += x * x; }
      return Math.sqrt(s / this.buf.length);
    },
    async stop() {
      if (!this.on) return null;
      this.on = false;
      try { this.proc.disconnect(); this.src.disconnect(); } catch { /* already gone */ }
      this.stream.getTracks().forEach(t => t.stop());
      const sr = this.ctx.sampleRate;
      await this.ctx.close().catch(() => {});
      const total = this.chunks.reduce((a, c) => a + c.length, 0);
      if (total < sr * 0.4) return null;
      const all = new Float32Array(total); let o = 0;
      for (const c of this.chunks) { all.set(c, o); o += c.length; }
      const target = 16000, ratio = sr / target, n = Math.floor(total / ratio);
      const pcm = new Int16Array(n);
      for (let i = 0; i < n; i++) {
        const a = Math.floor(i * ratio), b = Math.min(total, Math.floor((i + 1) * ratio));
        let s = 0; for (let j = a; j < b; j++) s += all[j];
        const v = clamp(s / Math.max(1, b - a), -1, 1);
        pcm[i] = v < 0 ? v * 0x8000 : v * 0x7fff;
      }
      const wav = new DataView(new ArrayBuffer(44 + pcm.length * 2));
      const w = (off, str) => { for (let i = 0; i < str.length; i++) wav.setUint8(off + i, str.charCodeAt(i)); };
      w(0, 'RIFF'); wav.setUint32(4, 36 + pcm.length * 2, true); w(8, 'WAVE'); w(12, 'fmt ');
      wav.setUint32(16, 16, true); wav.setUint16(20, 1, true); wav.setUint16(22, 1, true); wav.setUint32(24, target, true);
      wav.setUint32(28, target * 2, true); wav.setUint16(32, 2, true); wav.setUint16(34, 16, true); w(36, 'data'); wav.setUint32(40, pcm.length * 2, true);
      for (let i = 0; i < pcm.length; i++) wav.setInt16(44 + i * 2, pcm[i], true);
      const bytes = new Uint8Array(wav.buffer);
      let bin = ''; for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
      return { data: btoa(bin), mime: 'audio/wav', seconds: n / target };
    },
    cancel() { if (this.on) { this.on = false; try { this.stream.getTracks().forEach(t => t.stop()); this.ctx.close(); } catch { /* ignore */ } } },
  };
  async function micStart() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('Dieser Browser erlaubt kein Mikrofon. Schreib stattdessen.');
    try { await Rec.start(); }
    catch (e) { throw new Error(e && e.name === 'NotAllowedError' ? 'Mikrofon nicht erlaubt. Erlaube es in den Browser-Einstellungen oder schreib stattdessen.' : 'Mikrofon konnte nicht starten. Schreib stattdessen.'); }
  }

  // ------------------------------------------------------------ listening screen
  let listenId = 0, sendNow = null;
  async function listen() {
    const id = ++listenId;
    unlockAudio();
    duck(true);
    try { await micStart(); }
    catch (e) { duck(false); toast(e.message, false); openTalk('solo'); return; }
    const hear = DEMO() ? Demo.hearStart() : null;
    paint($('#halo'), (S.session && S.session.palette) || 'self', 'halo' + id, { blur: 0.18, fade: false });
    $('#halo').style.transform = '';
    waveColours((S.session && S.session.palette) || 'self');
    $('#said').innerHTML = '<span class="w in" style="color:var(--text-3)">Sprich jetzt …</span>';
    $('#got').innerHTML = '';
    $('#livelabel').innerHTML = '<i></i>Melodyn hört zu';
    $('#listenhint').textContent = 'Tippen zum Senden';
    $('#stopbtn').style.visibility = '';
    setOn('s-listen', true);
    // Sound wave: each bar is stretched with a transform (no layout work), values eased per frame
    const bars = $$('#wave i'), N = bars.length, levels = new Float32Array(N), shown = new Float32Array(N);
    const env = Array.from({ length: N }, (_, k) => Math.sin(Math.PI * (k + 0.5) / N));
    bars.forEach((b, k) => { b.style.opacity = (0.35 + env[k] * 0.65).toFixed(2); });
    let spoke = false, quietSince = 0;
    const t0 = performance.now();
    await new Promise(resolve => {
      sendNow = resolve;
      const loop = () => {
        if (id !== listenId || !Rec.on) return resolve();
        const l = Math.min(1, Rec.level() * 9);
        levels.copyWithin(0, 1); levels[N - 1] = l;
        const tt = (performance.now() - t0) / 1000;
        for (let k = 0; k < N; k++) {
          // mirror the history from the centre outward, so the wave grows from the middle
          const src = levels[N - 1 - Math.abs(Math.round(k - (N - 1) / 2)) * 2] || 0;
          // a gentle travelling shimmer keeps it alive in speaking pauses
          const idle = 0.05 + 0.035 * (0.5 + 0.5 * Math.sin(tt * 3.2 - k * 0.32)) * env[k];
          const goal = Math.max(idle, src * (0.4 + 0.6 * env[k]));
          shown[k] += (goal - shown[k]) * (goal > shown[k] ? 0.45 : 0.18);
          bars[k].style.transform = `scaleY(${Math.max(0.06, shown[k]).toFixed(3)})`;
        }
        const now = performance.now();
        if (l > 0.03) { spoke = true; quietSince = now; }
        if (spoke && now - quietSince > 1600) return resolve();
        if (now - t0 > 20000) return resolve();
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    });
    if (id !== listenId) return;
    const clip = await Rec.stop();
    if (hear) demoHeard = await Demo.hearStop(hear);
    if (clip) { chime(); wishSent(); }
    bars.forEach(b => { b.style.transform = 'scaleY(0.08)'; });
    if (!clip) { duck(false); setOn('s-listen', false); toast('Ich habe nichts gehört. Nochmal?', false); return; }
    $('#livelabel').innerHTML = 'Melodyn versteht …';
    $('#listenhint').textContent = 'Gemini hört sich deine Aufnahme an';
    $('#stopbtn').style.visibility = 'hidden';
    $('#said').innerHTML = '<span class="w in" style="color:var(--text-3)"><span class="dots">Einen Moment</span></span>';
    let res;
    try { res = await understand({ mode: 'request', audio: { mime: clip.mime, data: clip.data } }); }
    catch (e) {
      if (id !== listenId) return;
      duck(false); wishT0 = 0;
      $('#said').innerHTML = `<span class="w in" style="font-size:22px">${esc(e.message)}</span>`;
      $('#livelabel').textContent = 'Hat nicht geklappt';
      $('#listenhint').textContent = 'Schließen mit ✕ oben links';
      return;
    }
    if (id !== listenId) return;
    if (!String(res.transcript || '').trim()) {
      duck(false); wishT0 = 0;
      $('#said').innerHTML = '<span class="w in" style="font-size:24px">Ich habe dich nicht richtig verstanden. Magst du es nochmal sagen?</span>';
      $('#livelabel').textContent = 'Nicht verstanden';
      $('#listenhint').textContent = 'Schließen mit ✕ und nochmal auf die Kugel tippen';
      return;
    }
    S.chat.push({ role: 'user', text: res.transcript || '(gesprochen)' });
    S.chat.push({ role: 'model', text: res.reply || '' });
    $('#livelabel').textContent = 'Verstanden';
    // Music and DJ start working right now; the screen keeps showing what was understood meanwhile
    if (!res.ask) startSong(res, { delayOpen: REDUCED ? 300 : 2600 });
    paint($('#halo'), res.palette || 'self', 'h' + id, { blur: 0.18 });
    waveColours(res.palette || 'self');
    const said = $('#said'); said.innerHTML = '';
    for (const word of String(res.transcript || '').split(/\s+/).filter(Boolean)) {
      const w = document.createElement('span'); w.className = 'w'; w.textContent = word;
      said.append(w, ' ');
      requestAnimationFrame(() => w.classList.add('in'));
      await sleep(REDUCED ? 0 : 70);
    }
    $('#got').innerHTML = '<div class="lab in">Verstanden</div>' + (res.understood || []).slice(0, 4).map(g => `<div class="row"><span>${esc(g.label)}</span><b>${esc(g.value)}</b></div>`).join('');
    for (const row of $$('#got .row')) { await sleep(REDUCED ? 0 : 220); row.classList.add('in'); }
    $('#listenhint').textContent = res.ask ? 'Melodyn hat eine Frage' : 'Lyria komponiert schon';
    await sleep(REDUCED ? 200 : 700);
    if (id !== listenId) return;
    $('#halo').style.transform = 'translateY(-160px) scale(1.2)';
    await sleep(300);
    if (res.ask) {
      duck(false); wishT0 = 0;
      setOn('s-listen', false);
      openTalk('solo', { silent: true });
      addMeMsg(res.transcript || '…', true);
      await showQuestion(res);
    } else {
      addMeMsg(res.transcript || '…', true, true);
      addBotMsg(res.reply, false, true);
      await sleep(250);
      setOn('s-listen', false);
    }
  }
  function waveColours(p) {
    const pal = PAL[p] || PAL.self, w = $('#wave');
    w.style.setProperty('--w1', pal.c[0]); w.style.setProperty('--w2', pal.c[1] || pal.c[0]); w.style.setProperty('--w3', pal.c[2] || pal.c[0]);
  }
  function cancelListen() { listenId++; Rec.cancel(); if (sendNow) sendNow(); duck(false); setOn('s-listen', false); }

  // ------------------------------------------------------------ conversation sheet
  function scrollMsgs() { const m = $('#msgs'); m.scrollTop = m.scrollHeight; }
  function addMeMsg(text, spoken, quiet) {
    $('#msgs').insertAdjacentHTML('beforeend', `<div class="me">${esc(text)}</div>${spoken ? '<div class="me-meta"><svg class="i" style="width:12px;height:12px"><use href="#mic"/></svg>Gesprochen</div>' : ''}`);
    if (!quiet) scrollMsgs();
  }
  function botShell() {
    const t = document.createElement('div');
    t.className = 'bot';
    t.innerHTML = '<div class="dot"></div><div class="typing"><i></i><i></i><i></i></div>';
    $('#msgs').appendChild(t);
    paint($('.dot', t), 'self', '4', { blur: 0.2, fade: false });
    scrollMsgs();
    return t;
  }
  function addBotMsg(text, err, quiet) {
    if (!text) return;
    const t = document.createElement('div');
    t.className = 'bot' + (err ? ' msg-err' : '');
    t.innerHTML = `<div class="dot"></div><p>${esc(text)}</p>`;
    $('#msgs').appendChild(t);
    paint($('.dot', t), 'self', '4', { blur: 0.2, fade: false });
    if (!quiet) scrollMsgs();
  }
  function setChips() {
    const list = S.session ? ['Etwas schneller', 'Ruhiger', 'Mehr Gitarren', 'Instrumental', 'Nochmal sowas', 'Nie wieder Autotune'] : ['Nachtfahrt nach Hause', '90er Hip-Hop, entspannt', 'Ich muss mich konzentrieren', 'Ich koche für Freunde', 'Ich bin gerade traurig'];
    $('#qchips').innerHTML = list.map(c => `<button data-chip="${esc(c)}">${esc(c)}</button>`).join('');
  }
  function openTalk(mode, { silent } = {}) {
    S.talkMode = mode;
    const s = $('#s-talk');
    s.classList.toggle('solo', mode === 'solo');
    if (mode === 'solo') {
      paint($('#tbg'), S.session ? S.session.palette : 'self', 'talk', { blur: 0.2, fade: false });
      const cur = S.cur;
      paint($('#tminiart'), cur ? cur.palette : 'self', cur ? cur.seed : 'm', { blur: 0.12, fade: false });
      $('#tminititle').textContent = cur ? cur.title : 'Melodyn';
      $('#tminisub').textContent = cur ? (S.playing ? 'Läuft' : 'Pausiert') + ' · ' + cur.station : 'Sag oder schreib, wonach dir ist';
    }
    setChips();
    setOn('s-talk', true);
    if (!silent && !$('#msgs').children.length) addBotMsg(S.session ? 'Was soll anders klingen? Ich passe den nächsten Song sofort an.' : 'Wonach ist dir? Beschreib eine Situation, ein Gefühl oder ein Genre.');
    else scrollMsgs();
  }
  async function showQuestion(res) {
    const t = botShell();
    await sleep(REDUCED ? 0 : 500);
    t.lastElementChild.outerHTML = `<p>${esc(res.question || res.reply)}</p>`;
    const opts = (res.options || []).slice(0, 2);
    if (opts.length) {
      $('#msgs').insertAdjacentHTML('beforeend', `<div class="choices">${opts.map((o, i) => `<button class="choice" data-opt="${i}"><div class="sw" id="opt${i}"></div><div><b>${esc(o.label)}</b><span>${esc(o.description)}</span></div><svg class="i"><use href="#chevr"/></svg></button>`).join('')}</div><p class="priv"><svg class="i"><use href="#lock"/></svg>Deine Stimmung bleibt in dieser Session. Sie fließt nicht in dein Musikprofil ein.</p>`);
      opts.forEach((o, i) => paint($('#opt' + i), o.palette || 'dusk', o.label, { blur: 0.14, lines: 6, fade: false }));
      $('#msgs')._opts = opts;
    }
    $('#qchips').innerHTML = '';
    scrollMsgs();
  }
  let talkBusy = false;
  async function talk({ text, audioClip }) {
    if (talkBusy) return;
    talkBusy = true;
    unlockAudio();
    chime(); wishSent();
    $$('.choice').forEach(c => { c.disabled = true; });
    if (text) addMeMsg(text, false);
    const t = botShell();
    $('#qchips').innerHTML = '';
    let res;
    try {
      res = await understand(audioClip ? { mode: 'request', audio: audioClip } : { mode: 'request', text });
    } catch (e) {
      duck(false); wishT0 = 0; t.remove(); addBotMsg(e.message, true); talkBusy = false; setChips(); return;
    }
    if (res.ask || !String(res.transcript || text || '').trim()) duck(false);
    if (audioClip && !String(res.transcript || '').trim()) { t.remove(); addBotMsg('Ich habe dich nicht richtig verstanden. Sag es nochmal oder schreib es.'); talkBusy = false; setChips(); return; }
    if (audioClip) { t.insertAdjacentHTML('beforebegin', `<div class="me">${esc(res.transcript || '…')}</div><div class="me-meta"><svg class="i" style="width:12px;height:12px"><use href="#mic"/></svg>Gesprochen</div>`); }
    S.chat.push({ role: 'user', text: res.transcript || text || '' });
    S.chat.push({ role: 'model', text: [res.reply, res.question].filter(Boolean).join(' ') });
    if (res.ask) { wishT0 = 0; t.remove(); await showQuestion(res); talkBusy = false; return; }
    t.lastElementChild.outerHTML = `<p>${esc(res.reply || 'Okay, kommt sofort.')}</p>`;
    scrollMsgs();
    startSong(res, { delayOpen: REDUCED ? 100 : 1100 });
    await sleep(REDUCED ? 100 : 1100);
    talkBusy = false;
    setOn('s-talk', false);
  }
  let talkRec = false, composeHear = null;
  async function composeMic() {
    const form = $('#compose'), inp = $('#composein');
    if (inp.value.trim()) { const v = inp.value; inp.value = ''; updateComposeIcon(); talk({ text: v }); return; }
    if (!talkRec) {
      unlockAudio();
      duck(true);
      try { await micStart(); } catch (e) { duck(false); toast(e.message, false); inp.focus(); return; }
      composeHear = DEMO() ? Demo.hearStart() : null;
      talkRec = true; form.classList.add('recording');
      inp.placeholder = 'Aufnahme läuft … zum Senden tippen';
      $('#composeicon use').setAttribute('href', '#stop');
      const t0 = performance.now();
      const auto = () => { if (talkRec && performance.now() - t0 > 20000) composeMic(); else if (talkRec) setTimeout(auto, 500); };
      auto();
      return;
    }
    talkRec = false; form.classList.remove('recording');
    inp.placeholder = 'Schreib Melodyn, wonach dir ist …';
    updateComposeIcon();
    const clip = await Rec.stop();
    if (composeHear) { demoHeard = await Demo.hearStop(composeHear); composeHear = null; }
    if (!clip) { duck(false); toast('Ich habe nichts gehört', false); return; }
    talk({ audioClip: { mime: clip.mime, data: clip.data } });
  }
  function updateComposeIcon() { $('#composeicon use').setAttribute('href', $('#composein').value.trim() ? '#send' : '#mic'); }

  // ------------------------------------------------------------ lyrics sheet
  function openLyrics() {
    const s = S.cur || S.composing;
    if (!s) return;
    let html = `<h3>${esc(s.title)}</h3><p class="meta">${esc(s.spec ? `${s.spec.genre_de} · ${s.spec.tempo_bpm} BPM` : '')} · ${esc(s.station)}</p>`;
    const lyr = String(s.lyrics || '').replace(/<instrumental>/i, '').trim();
    if (lyr) {
      const blocks = lyr.split(/\[\[[A-Z]\d+\]\]/).map(b => b.trim()).filter(Boolean);
      html += blocks.map(b => `<div class="part">${b.split('\n').map(l => l.replace(/^\[:\]\s*/, '').replace(/^\[\d+(?:\.\d+)?:\d+(?:\.\d+)?\]\s*/, '').trim()).filter(Boolean).map(l => `<p>${esc(l)}</p>`).join('')}</div>`).join('');
    } else html += '<div class="part"><p>Instrumental, ohne Text.</p></div>';
    if (s.prompt) html += `<div class="h-s">So hat Melodyn den Song bei Lyria bestellt</div>${s.intent ? `<p class="meta">Verstanden: ${esc(s.intent)}</p>` : ''}${s.target ? `<p class="meta">Ziel: ${esc(s.target)}</p>` : ''}<pre>${esc(s.prompt)}</pre>`;
    $('#lyrbody').innerHTML = html;
    setOn('s-lyr', true);
  }

  // ------------------------------------------------------------ access code
  function openCode() {
    $('#codein').value = S.settings.code || '';
    $('#codeerr').textContent = S.settings.code ? 'Dieser Code wurde nicht akzeptiert.' : '';
    setOn('s-code', true);
    setTimeout(() => $('#codein').focus(), 300);
  }

  // ------------------------------------------------------------ Google key (direct mode)
  function openKey(invalid) {
    $('#keyin').value = '';
    $('#keyerr').textContent = invalid ? 'Der gespeicherte Schlüssel wurde abgelehnt.' : '';
    setOn('s-set', false);
    setOn('s-key', true);
    setTimeout(() => $('#keyin').focus(), 300);
  }

  // Switch between real Google calls and the free demo
  function setMode(mode) {
    if (mode === S.settings.mode) return;
    S.settings.mode = mode; saveState();
    // Real mode on a static host needs the listener's own Google key first
    if (mode === 'live' && !S.settings.key && (/github\.io$/.test(location.hostname) || location.protocol === 'file:')) { renderSettings(); openKey(); }
    // Whatever was prepared in the other mode doesn't belong here
    S.nextToken++; S.next = null; S.nextPromise = null; S.nextState = 'none'; S.armed = null;
    renderSettings(); renderNext();
    toast(mode === 'demo' ? 'Demo-Modus: kostenlos, Beispielsongs' : 'Echter Modus: Gemini und Lyria, kostet Geld');
  }

  // ------------------------------------------------------------ layout
  function fit() {
    const pw = $('#phonewrap'), ph = $('#phoneframe'), phone = $('#phone');
    const real = window.innerWidth <= 600;
    phone.classList.toggle('real', real);
    // Real phones: fill the width, and let the layout take whatever height the browser gives
    const s = real ? window.innerWidth / 390 : Math.min(1, (window.innerHeight - 60) / 868, (window.innerWidth - 452) / 414);
    const h = real ? window.innerHeight / s : 844;
    phone.style.height = ph.style.height = h + 'px';
    ph.style.transform = `scale(${s})`;
    pw.style.width = 390 * s + 'px'; pw.style.height = h * s + 'px';
  }
  function clockTick() {
    const d = new Date();
    $$('.clock').forEach(c => { c.textContent = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }); });
    const h = d.getHours();
    $('#greet').textContent = h < 11 ? 'Guten Morgen' : h < 18 ? 'Guten Tag' : 'Guten Abend';
  }
  function renderSettings() {
    $$('#lenseg button').forEach(b => b.classList.toggle('on', b.dataset.len === S.settings.len));
    $$('#modeseg button').forEach(b => b.classList.toggle('on', b.dataset.mode === S.settings.mode));
    $$('#lookseg button').forEach(b => b.classList.toggle('on', b.dataset.look === (S.settings.look || 'wave')));
    document.body.classList.toggle('demo', DEMO());
    $('#pregen').setAttribute('aria-checked', String(!!S.settings.pregen));
    $('#quick').setAttribute('aria-checked', String(!!S.settings.quick));
    $('#djset').setAttribute('aria-checked', String(!!S.settings.dj));
    $('#deepset').setAttribute('aria-checked', String(!!S.settings.deep));
    $('#limitv').textContent = S.settings.limit;
    $('#codeinfo').textContent = S.settings.code ? 'Ein Code ist gespeichert.' : 'Nur nötig, wenn auf Vercel ein APP_CODE gesetzt ist.';
    $('#coderow').hidden = DIRECT();
    $('#keyinfo').textContent = S.settings.key ? `Gespeichert in diesem Browser (…${S.settings.key.slice(-4)})` : 'Noch kein Schlüssel eingetragen.';
    $('#delkey').hidden = !S.settings.key;
    renderCosts();
  }

  // ------------------------------------------------------------ events
  function bind() {
    document.addEventListener('click', e => {
      const t = e.target.closest('button');
      if (!t) return;
      const d = t.dataset;
      if (d.tab) { showTab(d.tab); return; }
      if (d.seg) { S.libseg = d.seg; renderLib(); return; }
      if (d.song !== undefined) {
        const s = $('#libbody')._list[+d.song];
        if (!s) return;
        unlockAudio();
        if (S.cur && S.cur.id === s.id) { setOn('s-player', true); return; }
        if (!s.url && s.blob) s.url = URL.createObjectURL(s.blob);
        S.queue = S.libseg === 'songs' ? { list: S.library } : null;
        setSong(s, { replay: true }); setOn('s-player', true); toast(S.queue ? 'Deine Songs laufen der Reihe nach · kostenlos' : 'Wiederhören · kostet nichts');
        return;
      }
      if (d.station !== undefined) {
        const st = S.stations[+d.station];
        if (!st) return;
        unlockAudio();
        if (S.session && S.session.station === st.station && S.cur && !S.cur.replay) { setOn('s-player', true); return; }
        S.session = { id: 'st' + Date.now().toString(36), station: st.station, palette: st.palette, spec: st.spec, title: '', words: st.words || [] };
        S.nextState = 'none'; S.next = null; S.armed = null; S.queue = null;
        wishSent(); paintOrb();
        setOn('s-player', true);
        nextSong('station');
        return;
      }
      if (d.rule !== undefined) {
        const r = S.rules[+d.rule];
        r.scope = r.scope === 'Immer' ? 'Nur heute' : r.scope === 'Nur heute' ? 'Aus' : 'Immer';
        saveState(); renderTaste(false);
        toast(r.scope === 'Aus' ? `„${r.text}“ ist aus` : `„${r.text}“ gilt: ${r.scope.toLowerCase()}`);
        return;
      }
      if (d.chip) { talk({ text: d.chip }); return; }
      if (d.wish) { unlockAudio(); openTalk('solo', { silent: true }); talk({ text: d.wish }); return; }
      if (d.opt !== undefined) {
        const o = ($('#msgs')._opts || [])[+d.opt];
        if (o) talk({ text: `${o.label}: ${o.description}` });
        return;
      }
      if (d.mode) { setMode(d.mode); return; }
      if (d.len) { S.settings.len = d.len; saveState(); renderSettings(); toast(d.len === 'clip' ? 'Kurze Songs: 30 s, schneller und günstiger' : 'Volle Songs: ca. 3 Minuten'); if (S.nextState === 'working' || S.nextState === 'ready') prepareNext(); return; }
      if (d.limit) { S.settings.limit = clamp(S.settings.limit + +d.limit, 5, 200); S.limitOk = false; saveState(); renderSettings(); return; }
      if (t.id === 'forget') {
        S.session = null; S.chat = []; S.nextToken++; S.next = null; S.nextState = 'none';
        $('#msgs').innerHTML = '';
        renderTaste(false); renderNext(); paintOrb(); toast('Session vergessen');
      }
    });
    $('#orb').addEventListener('click', listen);
    $('#typeinstead').addEventListener('click', () => { unlockAudio(); openTalk('solo'); setTimeout(() => $('#composein').focus(), 350); });
    $('#libplus').addEventListener('click', () => { showTab('home'); listen(); });
    $('#listenclose').addEventListener('click', cancelListen);
    $('#stopbtn').addEventListener('click', () => { if (sendNow) sendNow(); });
    $('#pclose').addEventListener('click', () => setOn('s-player', false));
    $('#plyrics').addEventListener('click', openLyrics);
    $('#pplay').addEventListener('click', () => {
      if (S.composing && S.composing.error) { openTalk('steer'); return; }
      if (S.djActive) { stopDj(); if (S.cur && !S.composing) setPlaying(true); return; }
      setPlaying(!S.playing);
    });
    $('#pnextbtn').addEventListener('click', () => nextSong('skip'));
    $('#pprev').addEventListener('click', prevSong);
    $('#pup').addEventListener('click', like);
    $('#pdown').addEventListener('click', dislike);
    $('#padd').addEventListener('click', save);
    $('#steer').addEventListener('click', () => openTalk(S.cur || S.composing ? 'steer' : 'solo'));
    $('#ptrack').addEventListener('click', e => {
      if (!S.cur || S.composing || !audio.duration || mix) return;
      const r = e.currentTarget.getBoundingClientRect();
      audio.currentTime = clamp((e.clientX - r.left) / r.width, 0, 0.99) * audio.duration;
    });
    $('#mini').addEventListener('click', e => {
      if (e.target.closest('#miniplay')) { setPlaying(!S.playing); return; }
      if (e.target.closest('#mininext')) { nextSong('skip'); return; }
      setOn('s-player', true);
    });
    $('#talkdim').addEventListener('click', () => { if (S.talkMode === 'steer') setOn('s-talk', false); });
    $$('.grab').forEach(g => g.addEventListener('click', () => { setOn('s-talk', false); setOn('s-lyr', false); setOn('s-set', false); }));
    $('#lyrdim').addEventListener('click', () => setOn('s-lyr', false));
    $('#setdim').addEventListener('click', () => setOn('s-set', false));
    $('#avatar').addEventListener('click', () => { renderSettings(); setOn('s-set', true); });
    $('#tastecost').addEventListener('click', () => { renderSettings(); setOn('s-set', true); });
    $('#pregen').addEventListener('click', () => { S.settings.pregen = !S.settings.pregen; saveState(); renderSettings(); if (!S.settings.pregen) { S.nextToken++; S.next = null; S.nextState = 'none'; S.armed = null; renderNext(); } else if (S.cur && !S.cur.replay && !S.cur.preview) armNext(S.cur); });
    $('#deepset').addEventListener('click', () => { S.settings.deep = !S.settings.deep; saveState(); renderSettings(); });
    $('#quick').addEventListener('click', () => { S.settings.quick = !S.settings.quick; saveState(); renderSettings(); });
    $('#djset').addEventListener('click', () => { S.settings.dj = !S.settings.dj; if (!S.settings.dj) stopDj(); saveState(); renderSettings(); });
    $('#setcode').addEventListener('click', () => { setOn('s-set', false); openCode(); });
    $('#resetcost').addEventListener('click', () => { S.total = { lyria: 0, gemini: 0, songs: 0, clips: 0, calls: 0 }; S.sess = { lyria: 0, gemini: 0, songs: 0, clips: 0, calls: 0, genMs: [], firstMs: [], audioSec: 0, genSec: 0 }; saveState(); renderSettings(); toast('Kostenzähler zurückgesetzt'); });
    $('#keyform').addEventListener('submit', e => {
      e.preventDefault();
      const k = $('#keyin').value.trim();
      if (k.length < 20) { $('#keyerr').textContent = 'Das sieht nicht nach einem vollständigen Schlüssel aus.'; return; }
      S.settings.key = k; S.settings.mode = 'live'; saveState(); setOn('s-key', false); renderSettings();
      toast('Schlüssel gespeichert. Tippe auf die Kugel.');
    });
    $('#keyclose').addEventListener('click', () => setOn('s-key', false));
    $('#keydemo').addEventListener('click', () => { setOn('s-key', false); S.settings.mode = 'live'; setMode('demo'); });
    $('#toastact').addEventListener('click', () => { const f = toastFn; toastFn = null; $('#toast').classList.remove('on'); if (f) f(); });
    $('#setkey').addEventListener('click', () => openKey());
    $('#delkey').addEventListener('click', () => { S.settings.key = ''; saveState(); renderSettings(); toast('Schlüssel aus diesem Browser entfernt'); });
    $('#codeform').addEventListener('submit', e => { e.preventDefault(); S.settings.code = $('#codein').value.trim(); saveState(); setOn('s-code', false); toast('Code gespeichert. Versuch es nochmal.'); });
    // Keyboard on desktop: space plays/pauses, arrows skip, escape closes the top layer
    document.addEventListener('keydown', e => {
      if (e.metaKey || e.ctrlKey || e.altKey || (e.target.closest && e.target.closest('input, textarea'))) return;
      if (e.key === 'Escape') {
        if (isOn('s-listen')) cancelListen();
        else if (isOn('s-lyr')) setOn('s-lyr', false);
        else if (isOn('s-set')) setOn('s-set', false);
        else if (isOn('s-talk')) setOn('s-talk', false);
        else if (isOn('s-key') && S.settings.key) setOn('s-key', false);
        else if (isOn('s-player')) setOn('s-player', false);
        return;
      }
      if (e.target.closest && e.target.closest('button') && (e.code === 'Space' || e.key === 'Enter')) return;
      if (e.code === 'Space' && S.cur) { e.preventDefault(); $('#pplay').click(); }
      else if (e.key === 'ArrowRight' && S.cur) nextSong('skip');
      else if (e.key === 'ArrowLeft' && S.cur) prevSong();
    });
    const ci = $('#composein');
    ci.addEventListener('input', updateComposeIcon);
    $('#compose').addEventListener('submit', e => { e.preventDefault(); composeMic(); });

    audio.addEventListener('timeupdate', renderTime);
    audio.addEventListener('timeupdate', () => {
      const a = S.armed;
      if (a && S.cur === a && !S.composing && !audio.paused && audio.currentTime >= (a.len === 'clip' ? 3 : 15)) { S.armed = null; prepareNext(); }
    });
    audio.addEventListener('timeupdate', () => {
      const c = S.cur;
      if (!c || mix || document.hidden || audio.paused || !c.mixTo || !c.mixTo.plan) return;
      if (c.mixTo.to !== mixTarget(c)) return;
      if (audio.currentTime >= c.mixTo.plan.takeover) runMix(c, c.mixTo.plan);
    });
    setInterval(() => { if (mix) renderTime(); }, 250);
    audio.addEventListener('play', syncPlayIcons);
    audio.addEventListener('playing', () => { if (audio.src !== SILENT) heard(); });
    dj.addEventListener('playing', () => { if (dj.src !== SILENT) heard(); });
    audio.addEventListener('pause', syncPlayIcons);
    audio.addEventListener('loadedmetadata', () => { if (S.cur && audio.src === S.cur.url) { S.cur.dur = audio.duration; renderTime(); } });
    let lastT = 0;
    audio.addEventListener('timeupdate', () => { const t = audio.currentTime; if (S.cur && !S.cur.replay && t > lastT && t - lastT < 2) S.sess.audioSec += t - lastT; lastT = t; });
    audio.addEventListener('ended', () => {
      if (!S.cur || audio.src === SILENT || mix) return;
      if (S.cur.preview) { handoff(S.cur); return; }
      feedback('complete'); nextSong('end');
    });
    window.addEventListener('resize', fit);
    window.addEventListener('resize', () => { if (homeOrb) homeOrb.resize(); });
    $('#lookseg').addEventListener('click', e => { const b = e.target.closest('[data-look]'); if (!b) return; S.settings.look = b.dataset.look; saveState(); applyLook(); });
    if (window.visualViewport) window.visualViewport.addEventListener('resize', fit);
    setInterval(clockTick, 15000);
    setInterval(renderCosts, 5000);
  }

  // ------------------------------------------------------------ boot
  async function boot() {
    clockTick();
    fit();
    bind();
    requestAnimationFrame(() => paintStatic(document));
    $('#wave').innerHTML = '<i></i>'.repeat(46);
    applyLook();
    const orbBtn = $('#orb');
    orbBtn.addEventListener('pointerdown', () => homeOrb.setPressed(true));
    for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) orbBtn.addEventListener(ev, () => homeOrb.setPressed(false));
    orbBtn.addEventListener('click', () => homeOrb.ripple());
    document.addEventListener('visibilitychange', orbsVisible);
    renderRecent(); renderTaste(false); renderSettings(); syncChrome();
    if (await DB.open()) {
      const rows = (await DB.all()) || [];
      S.library = rows.sort((a, b) => b.created - a.created).map(r => Object.assign(r, { url: URL.createObjectURL(r.blob) }));
    }
    document.documentElement.dataset.ready = '1';
    if (DIRECT() && !S.settings.key && !DEMO()) setTimeout(() => openKey(), 500);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
