/* Melodyn interactive prototype.
   Everything is simulated in the browser: "Mistral" understanding, "ElevenLabs" composing
   and the music itself (a small Web Audio synth). */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = s => { s = Math.max(0, Math.floor(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  const REDUCED = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

  // ---------------------------------------------------------------- icons
  const SPRITE = `<svg width="0" height="0" style="position:absolute" aria-hidden="true">
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
  <symbol id="search" viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.3-4.3"/></symbol>
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
  <symbol id="airplay" viewBox="0 0 24 24"><path d="M6.5 17H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-1.5"/><path d="M12 14.5l4.5 5.5h-9z" fill="currentColor" stroke="none"/></symbol>
  <symbol id="flash" viewBox="0 0 24 24"><path d="M8.5 3h7l-1 5h-5zM9.5 8h5v12.5a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1z"/></symbol>
  <symbol id="cam" viewBox="0 0 24 24"><path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2.3l1.4-2h5.6l1.4 2h2.3A1.5 1.5 0 0 1 20 8.5v9A1.5 1.5 0 0 1 18.5 19h-13A1.5 1.5 0 0 1 4 17.5z"/><circle cx="12" cy="12.5" r="3.3"/></symbol>
  <symbol id="car" viewBox="0 0 24 24"><path d="M5 16.5V12l1.8-4.6A2 2 0 0 1 8.7 6h6.6a2 2 0 0 1 1.9 1.4L19 12v4.5M5 12h14M5 16.5h14v2a1 1 0 0 1-1 1h-1.5a1 1 0 0 1-1-1v-2M8.5 16.5v2a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-2"/></symbol>
  <symbol id="phoneic" viewBox="0 0 24 24"><path d="M6.6 3.8l2.3-.5a1 1 0 0 1 1.1.6l1.2 2.9a1 1 0 0 1-.3 1.2L9.4 9.2a11 11 0 0 0 5.4 5.4l1.2-1.5a1 1 0 0 1 1.2-.3l2.9 1.2a1 1 0 0 1 .6 1.1l-.5 2.3a1.6 1.6 0 0 1-1.6 1.3C10.8 18.7 5.3 13.2 5.3 5.4a1.6 1.6 0 0 1 1.3-1.6z"/></symbol>
  <symbol id="logo" viewBox="0 0 32 32"><path d="M4 18.5c2.2 0 2.6-7 4.8-7s2.6 11 4.8 11 2.6-15 4.8-15 2.6 15 4.8 15 2.6-7.5 4.8-7.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></symbol>
</svg>`;
  document.body.insertAdjacentHTML('afterbegin', SPRITE);
  $('#sbicons').innerHTML = `<svg width="18" height="12" viewBox="0 0 18 12" fill="currentColor"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5.5" width="3" height="6.5" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg>
    <svg width="16" height="12" viewBox="0 0 16 12" fill="currentColor"><path d="M8 2.4c2.3 0 4.4.9 6 2.4l1.1-1.2A10.2 10.2 0 0 0 8 .8 10.2 10.2 0 0 0 .9 3.6L2 4.8a8.6 8.6 0 0 1 6-2.4zm0 3.3c1.4 0 2.7.5 3.7 1.4l1.1-1.2A7 7 0 0 0 8 4.1a7 7 0 0 0-4.8 1.8l1.1 1.2c1-.9 2.3-1.4 3.7-1.4zm0 3.3c.6 0 1.1.2 1.5.6L8 11.2 6.5 9.6c.4-.4.9-.6 1.5-.6z"/></svg>
    <svg width="27" height="13" viewBox="0 0 27 13"><rect x=".5" y=".5" width="23" height="12" rx="3.8" fill="none" stroke="currentColor" opacity=".4"/><rect x="2" y="2" width="17" height="9" rx="2.4" fill="currentColor"/><path d="M25 4.5v4c.8-.3 1.3-1.1 1.3-2s-.5-1.7-1.3-2z" fill="currentColor" opacity=".45"/></svg>`;

  // ---------------------------------------------------------------- auras
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
  function rng(seed) {
    let a = 0;
    for (const ch of String(seed)) a = Math.imul(a ^ ch.charCodeAt(0), 2654435761) >>> 0;
    return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function drawRings(cv, W, H, seed, n, alpha) {
    const r = rng('rings' + seed), d = 2;
    cv.width = Math.max(1, Math.round(W * d)); cv.height = Math.max(1, Math.round(H * d));
    const c = cv.getContext('2d'); c.scale(d, d);
    const cx = W * (0.3 + r() * 0.4), cy = H * (0.3 + r() * 0.4);
    cv.style.setProperty('--ox', (cx / W * 100).toFixed(1) + '%');
    cv.style.setProperty('--oy', (cy / H * 100).toFixed(1) + '%');
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
  }
  // Paint (or cross-fade to) a living aura inside el
  function paint(el, p, seed, o = {}) {
    if (!el) return;
    el.classList.add('aura');
    const pal = PAL[p] || PAL.night;
    const W = el.clientWidth || 300, H = el.clientHeight || 300, M = Math.max(W, H);
    const r = rng(p + seed);
    const blur = o.blur ?? 0.16, n = o.n ?? 4;
    const lay = document.createElement('div');
    lay.className = 'lay';
    lay.style.background = pal.bg;
    for (let k = 0; k < n; k++) {
      const i = document.createElement('i');
      const s = M * (0.5 + r() * 0.5);
      i.style.cssText = `width:${s}px;height:${s}px;left:${r() * W - s / 2}px;top:${r() * H - s / 2}px;background:${pal.c[k % pal.c.length]};filter:blur(${M * blur}px);opacity:${0.75 + r() * 0.25};--dx:${((r() - 0.5) * M * 0.3).toFixed(1)}px;--dy:${((r() - 0.5) * M * 0.3).toFixed(1)}px;--sc:${(0.85 + r() * 0.35).toFixed(2)};--d:${(9 + r() * 10).toFixed(1)}s;animation-delay:-${(r() * 10).toFixed(1)}s`;
      lay.appendChild(i);
    }
    if (o.lines) {
      const cv = document.createElement('canvas');
      drawRings(cv, W, H, p + seed, o.lines, o.la ?? 0.22);
      lay.appendChild(cv);
    }
    const old = $$(':scope > .lay', el);
    if (old.length && o.fade !== false && !REDUCED) {
      lay.style.opacity = '0';
      el.appendChild(lay);
      requestAnimationFrame(() => requestAnimationFrame(() => { lay.style.opacity = '1'; }));
      setTimeout(() => old.forEach(x => x.remove()), 1100);
    } else {
      old.forEach(x => x.remove());
      el.appendChild(lay);
    }
  }
  function paintStatic(root) {
    $$('.aura[data-p]', root).forEach(el => {
      if (el.dataset.done) return;
      if (!el.clientWidth) return;
      el.dataset.done = '1';
      paint(el, el.dataset.p, el.dataset.seed || '1', { blur: parseFloat(el.dataset.blur || '0.16'), lines: parseInt(el.dataset.lines || '0', 10), la: parseFloat(el.dataset.la || '0.22'), fade: false });
    });
  }

  // ---------------------------------------------------------------- audio
  const Engine = {
    ctx: null, out: null, noiseBuf: null, timer: null, step: 0, nextT: 0, song: null, running: false,
    ensure() {
      if (this.ctx) return true;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      try { this.ctx = new AC(); } catch (e) { return false; }
      const c = this.ctx;
      this.out = c.createGain(); this.out.gain.value = 0;
      const comp = c.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 3;
      this.out.connect(comp); comp.connect(c.destination);
      this.noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      return true;
    },
    unlock() { if (this.ensure() && this.ctx.state === 'suspended') this.ctx.resume(); },
    load(song) { this.song = song; this.step = 0; },
    start() {
      if (!this.ensure()) return;
      this.ctx.resume();
      const g = this.out.gain, t = this.ctx.currentTime;
      g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(0.5, t + 0.35);
      this.nextT = t + 0.06; this.running = true;
      clearInterval(this.timer); this.timer = setInterval(() => this.tick(), 25);
    },
    stop() {
      clearInterval(this.timer); this.running = false;
      if (!this.ctx) return;
      const g = this.out.gain, t = this.ctx.currentTime;
      g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(0, t + 0.25);
    },
    tick() {
      const c = this.ctx, s = this.song;
      if (!s || !c) return;
      const sp = 60 / s.bpm / 4;
      if (this.nextT < c.currentTime - 0.2) this.nextT = c.currentTime + 0.02;
      while (this.nextT < c.currentTime + 0.15) { this.playStep(this.step, this.nextT, sp); this.nextT += sp; this.step++; }
    },
    note(m, deg) { return m.base + m.scale[((deg % 7) + 7) % 7] + 12 * Math.floor(deg / 7); },
    playStep(step, t, sp) {
      const s = this.song, m = s.music, pat = s.drums, e = s.energy;
      const i = step % 16, bar = Math.floor(step / 16);
      const tt = t + (pat === 'boombap' && i % 2 ? sp * 0.16 : 0);
      if (pat === 'boombap') { if (i === 0 || i === 10 || (e > 0.55 && i === 7)) this.kick(tt, 0.85); if (i === 4 || i === 12) this.snare(tt, 0.42); if (i % 2 === 0) this.hat(tt, i % 4 === 0 ? 0.11 : 0.07); }
      else if (pat === 'straight') { if (i === 0 || i === 8 || (e > 0.6 && i === 6)) this.kick(t, 0.85); if (i === 4 || i === 12) this.snare(t, 0.38); if (i % 2 === 0) this.hat(t, 0.08); }
      else if (pat === 'dnb') { if (i === 0 || i === 10) this.kick(t, 0.85); if (i === 4 || i === 12) this.snare(t, 0.42); this.hat(t, i % 2 ? 0.04 : 0.08); }
      else if (pat === 'soft') { if (i === 0) this.kick(t, 0.4); if (i === 8) this.hat(t, 0.05, true); }
      const chord = m.prog[bar % 4];
      const tones = [0, 2, 4].map(k => this.note(m, chord + k));
      if (i === 0) this.pad(t, tones.map(n => n + 12), sp * 16, 0.028 + (1 - e) * 0.018, 500 + e * 2200);
      const root = this.note(m, chord) - 12;
      if (i === 0 || i === 8 || (e > 0.5 && (i === 6 || i === 14))) this.bass(t, root, sp * (i === 0 ? 3.5 : 1.6), 0.3);
      if (m.arp[i]) this.pluck(tt, tones[m.arp[i] - 1] + 24, 0.07, s.lead);
    },
    mtof(n) { return 440 * Math.pow(2, (n - 69) / 12); },
    env(g, t, a, peak, d) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); },
    kick(t, v) { const c = this.ctx, o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.13); this.env(g, t, 0.004, v, 0.32); o.connect(g); g.connect(this.out); o.start(t); o.stop(t + 0.4); },
    noise(t, dur, type, freq, v) { const c = this.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); s.buffer = this.noiseBuf; f.type = type; f.frequency.value = freq; this.env(g, t, 0.002, v, dur); s.connect(f); f.connect(g); g.connect(this.out); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05); },
    snare(t, v) { this.noise(t, 0.16, 'bandpass', 1900, v); const c = this.ctx, o = c.createOscillator(), g = c.createGain(); o.type = 'triangle'; o.frequency.setValueAtTime(200, t); this.env(g, t, 0.002, v * 0.5, 0.08); o.connect(g); g.connect(this.out); o.start(t); o.stop(t + 0.12); },
    hat(t, v, open) { this.noise(t, open ? 0.16 : 0.035, 'highpass', 7500, v); },
    bass(t, n, dur, v) { const c = this.ctx, o = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain(); o.type = 'triangle'; o.frequency.value = this.mtof(n); f.type = 'lowpass'; f.frequency.value = 420; this.env(g, t, 0.01, v, dur); o.connect(f); f.connect(g); g.connect(this.out); o.start(t); o.stop(t + dur + 0.05); },
    pad(t, notes, dur, v, cut) {
      const c = this.ctx, f = c.createBiquadFilter(), g = c.createGain();
      f.type = 'lowpass'; f.frequency.value = cut;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + Math.min(0.6, dur * 0.3)); g.gain.setValueAtTime(v, t + dur * 0.75); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.3);
      f.connect(g); g.connect(this.out);
      for (const n of notes) for (const det of [-7, 7]) { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = this.mtof(n); o.detune.value = det; o.connect(f); o.start(t); o.stop(t + dur + 0.35); }
    },
    pluck(t, n, v, type) { const c = this.ctx, o = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain(); o.type = type; o.frequency.value = this.mtof(n); f.type = 'lowpass'; f.frequency.setValueAtTime(3200, t); f.frequency.exponentialRampToValueAtTime(600, t + 0.25); this.env(g, t, 0.005, v, 0.3); o.connect(f); f.connect(g); g.connect(this.out); o.start(t); o.stop(t + 0.4); },
  };

  // ---------------------------------------------------------------- data
  const ST = {
    night:   { name: 'Heimfahrt, nachts', p: 'night', genre: 'Synthwave', bpm: 96, energy: 0.45, valence: 0.4, drums: 'straight', count: 31, sub: 'Gestern · 31 Songs', titles: ['Amber Exit', 'Tunnel Lights', 'Rear-View Neon', 'Sodium Glow', 'Exit 41', 'Low Beam Heart', 'Last Gas Station'] },
    kitchen: { name: 'Sonntags kochen', p: 'kitchen', genre: 'Nu Jazz', bpm: 104, energy: 0.55, valence: 0.72, drums: 'boombap', count: 18, sub: 'Nu Jazz, warm', titles: ['Slow Simmer', 'Garlic & Gold', 'Kitchen Radio', 'Sunday Sauce', 'Butter & Brass'] },
    focus:   { name: 'Deep Work', p: 'focus', genre: 'Lo-Fi', bpm: 78, energy: 0.3, valence: 0.55, drums: 'boombap', count: 44, sub: 'Instrumental', titles: ['Paper Rain', 'Quiet Grid', 'Margin Notes', 'Slow Ink', 'Desk Lamp'] },
    run:     { name: 'Laufen, 10 km', p: 'run', genre: 'Drum & Bass', bpm: 172, energy: 0.88, valence: 0.65, drums: 'dnb', count: 12, sub: 'Drum & Bass', titles: ['Red Line', 'Second Wind', 'Hill Sprint', 'Last Rep', 'Pace Maker'] },
    hiphop:  { name: '90er Hip-Hop', p: 'brass', genre: 'Boom Bap', bpm: 90, energy: 0.55, valence: 0.6, drums: 'boombap', count: 0, sub: 'Boom Bap, lässig', titles: ['Corner Store Sun', 'Brownstone Echo', 'Tape Deck Summer', 'Stoop Talk', 'Walkman Days'] },
    dusk:    { name: 'Heute Abend', p: 'dusk', genre: 'Piano-Ballade', bpm: 72, energy: 0.3, valence: 0.2, drums: 'soft', count: 0, sub: 'Nah, ehrlich', titles: ['Zwei Tassen', 'Leere Seite', 'Your Coat Still Here', 'Stilles Treppenhaus'] },
    dawn:    { name: 'Heute Abend', p: 'morning', genre: 'Pop', bpm: 112, energy: 0.68, valence: 0.78, drums: 'straight', count: 0, sub: 'Nach vorn', titles: ['Room to Breathe', 'Neuer Anfang', 'Open Window', 'Lighter Now'] },
  };
  const VOICE = {
    night: { station: 'night', text: 'Ich fahre nachts zwei Stunden nach Hause. Mach was dafür.', got: [['Situation', 'Nachtfahrt'], ['Stimmung', 'ruhig, gleichmäßig'], ['Länge', 'ca. 2 Stunden'], ['Deine Regel', 'kein Autotune', 'immer']], hint: '„Was Ruhiges für die Heimfahrt“' },
    hiphop: { station: 'hiphop', text: 'Mach mir 90er Hip-Hop, aber nicht zu aggressiv.', got: [['Genre', 'Boom Bap, 90er'], ['Stimmung', 'lässig, warm'], ['Vermeiden', 'aggressive Vocals'], ['Deine Regel', 'kein Autotune', 'immer']], hint: '„90er Hip-Hop, nicht zu aggressiv“' },
    breakup: { ask: true, text: 'Ich hab mich gerade getrennt. Mir geht’s echt mies. Bau mir einen Song dazu.', got: [['Stimmung', 'traurig'], ['Thema', 'Trennung'], ['Speicherung', 'nur diese Session'], ['Nächster Schritt', 'eine Rückfrage']], hint: '„Mir geht’s gerade mies“' },
    kitchen: { station: 'kitchen', text: 'Ich koche gerade für Freunde. Mach was Warmes mit Groove.', got: [['Situation', 'Kochen mit Freunden'], ['Stimmung', 'warm, groovig'], ['Tempo', 'ca. 104 BPM'], ['Gesang', 'dezent']], hint: '„Was Warmes zum Kochen“' },
  };
  const ORB_ORDER = ['night', 'hiphop', 'breakup', 'kitchen'];
  const ADJ = ['Velvet', 'Midnight', 'Glass', 'Slow', 'Golden', 'Hollow', 'Quiet', 'Paper', 'Neon'];
  const NOUN = ['Signal', 'Avenue', 'Tide', 'Motel', 'Orbit', 'Static', 'Harbor', 'Echo', 'Window'];

  const S = {
    counter: 0, used: new Set(),
    cur: null, next: null, nextReady: false, playing: false, elapsed: 0, composing: false,
    history: [], library: [], recent: ['night', 'kitchen', 'focus'],
    session: null, forgotten: false, mods: {},
    liked: new Set(),
    tab: 'home', libseg: 'st', device: 'phone', mode: 'app',
    orbIdx: 0, reactions: 214,
    taste: { Synthwave: 78, 'Boom Bap': 64, 'Lo-Fi': 55, 'Nu Jazz': 47 },
    rules: [{ t: 'Kein Autotune', s: 'Immer' }, { t: 'Mehr Gitarren', s: 'Nur heute' }],
    plan: 'Plus',
  };
  const freshMods = () => ({ bpm: 0, energy: 0, valence: 0, guitar: false, instrumental: false });
  S.mods = freshMods();

  function makeSong(key, opts = {}) {
    const st = ST[key], m = opts.mods || S.mods;
    S.counter++;
    const r = rng(key + S.counter + (opts.title || ''));
    let title = opts.title;
    if (!title) {
      const free = st.titles.filter(t => !S.used.has(t));
      title = free.length ? free[Math.floor(r() * free.length)] : ADJ[Math.floor(r() * ADJ.length)] + ' ' + NOUN[Math.floor(r() * NOUN.length)];
    }
    S.used.add(title);
    const energy = clamp(st.energy + m.energy + (r() - 0.5) * 0.08, 0.1, 1);
    const valence = clamp(st.valence + m.valence, 0, 1);
    const bpm = Math.round(clamp(st.bpm + m.bpm + (r() - 0.5) * 6, 60, 180));
    const minor = valence < 0.55, root = Math.floor(r() * 12);
    const progs = minor ? [[0, 5, 2, 6], [0, 3, 5, 4], [0, 6, 5, 6]] : [[0, 4, 5, 3], [0, 5, 3, 4], [0, 3, 0, 4]];
    const dens = 0.14 + energy * 0.34;
    return {
      id: 's' + S.counter, title, key, station: st.name, p: st.p, seed: key + S.counter,
      genre: st.genre + (m.instrumental ? ', instrumental' : ''), bpm, energy, valence, drums: st.drums,
      lead: m.guitar ? 'square' : energy > 0.7 ? 'sawtooth' : 'triangle',
      dur: 150 + Math.floor(r() * 60),
      music: { base: 48 + root - (root > 6 ? 12 : 0), scale: minor ? [0, 2, 3, 5, 7, 8, 10] : [0, 2, 4, 5, 7, 9, 11], prog: progs[Math.floor(r() * progs.length)], arp: Array.from({ length: 16 }, () => (r() < dens ? 1 + Math.floor(r() * 3) : 0)) },
    };
  }

  // ---------------------------------------------------------------- toast
  let toastT;
  function toast(msg) {
    $('#toasttxt').textContent = msg;
    const el = $('#toast');
    el.classList.add('on');
    clearTimeout(toastT);
    toastT = setTimeout(() => el.classList.remove('on'), 2400);
  }

  // ---------------------------------------------------------------- screens
  const overlays = ['s-listen', 's-player', 's-talk', 's-pay'];
  function isOn(id) { return $('#' + id).classList.contains('on'); }
  function setOn(id, on) { $('#' + id).classList.toggle('on', on); syncChrome(); }
  function syncChrome() {
    const anyFull = isOn('s-player') || isOn('s-listen') || isOn('s-pay') || (isOn('s-talk') && $('#s-talk').classList.contains('solo'));
    $('#mini').classList.toggle('on', !!S.cur && !anyFull && !isOn('s-talk'));
    $('#tabbar').style.transform = anyFull ? 'translateY(100%)' : '';
  }
  function showTab(t) {
    S.tab = t;
    $$('.tabscr').forEach(s => s.classList.toggle('on', s.id === 's-' + t));
    $$('#tabbar button').forEach(b => b.classList.toggle('on', b.dataset.tab === t));
    if (t === 'lib') renderLib();
    if (t === 'taste') renderTaste(true);
    if (t === 'home') renderRecent();
  }

  // ---------------------------------------------------------------- now playing
  function setPlaying(on) {
    if (on && S.cur && !S.composing) { Engine.unlock(); Engine.start(); S.playing = true; }
    else { Engine.stop(); S.playing = false; }
    $$('.playuse').forEach(u => u.setAttribute('href', S.playing ? '#pause' : '#play'));
    $('#miniplay use').setAttribute('href', S.playing ? '#pause' : '#play');
    $('#pcover').classList.toggle('paused', !S.playing && !S.composing);
    $$('.eq').forEach(e => e.classList.toggle('paused', !S.playing));
  }

  function renderNow() {
    const s = S.cur;
    if (!s) return;
    const comp = S.composing;
    $('#ptitle').innerHTML = comp ? '<span class="dots">Wird komponiert</span>' : esc(s.title);
    $('#pgenre').textContent = comp ? 'Beat, Akkorde und Melodie entstehen' : `${s.genre} · ${s.bpm} BPM`;
    $('#pstation').textContent = s.station;
    $('#psub').textContent = s.replay ? 'Aus deiner Bibliothek · kostet nichts' : `Song ${S.history.filter(h => h.key === s.key).length + 1} · für dich komponiert`;
    const saved = S.library.some(x => x.id === s.id);
    $('#paddicon').setAttribute('href', saved ? '#added' : '#add');
    $('#pup').classList.toggle('on', S.liked.has(s.id));
    $('#ptrack').classList.toggle('indet', comp);
    $('#pcover').classList.toggle('composing', comp);
    $('#pcoverart').classList.toggle('fast', comp);
    // mini, lock, car
    $('#minititle').textContent = comp ? 'Wird komponiert …' : s.title;
    $('#ministation').textContent = s.station;
    $('#lktitle').textContent = comp ? 'Wird komponiert …' : s.title;
    $('#lksub').textContent = 'Melodyn · ' + s.station;
    $('#ctitle').textContent = comp ? 'Wird komponiert …' : s.title;
    $('#cgenre').textContent = comp ? 'Einen Moment' : `${s.genre} · ${s.bpm} BPM`;
    $('#cstation').textContent = s.station;
    $('#cup').classList.toggle('on', S.liked.has(s.id));
    renderNext(); renderTime();
  }
  function paintNow(s, composing) {
    paint($('#pbg'), s.p, s.seed, { blur: 0.2 });
    paint($('#pcoverart'), s.p, s.seed, { blur: 0.1, lines: 16 });
    paint($('#minith'), s.p, s.seed, { blur: 0.14, fade: false });
    if (S.device === 'lock') { paint($('#lkart'), s.p, s.seed, { blur: 0.12, lines: 7, fade: false }); paint($('#lockwall'), s.p === 'night' ? 'tunnel' : s.p, s.seed, { blur: 0.2, lines: 18, la: 0.12 }); }
    if (S.device === 'car') { paint($('#ccover'), s.p, s.seed, { blur: 0.11, lines: 12 }); paint($('#cbg'), s.p, s.seed, { blur: 0.2 }); }
    $('#pcoverart').classList.toggle('fast', !!composing);
  }
  function renderNext() {
    const el = $('#pnext'), t = $('#pnexttxt');
    if (!S.cur || S.composing) { t.innerHTML = 'Melodyn komponiert deinen Song'; el.classList.remove('ready'); $('#lknote').textContent = 'Neuer Song wird komponiert'; return; }
    if (S.cur.replay) { t.innerHTML = 'Wiederhören aus der Bibliothek · kostenlos'; el.classList.add('ready'); return; }
    if (!S.next) { t.innerHTML = ''; return; }
    t.innerHTML = `Als Nächstes: <b>${esc(S.next.title)}</b> · ${S.nextReady ? 'bereit' : 'wird komponiert'}`;
    el.classList.toggle('ready', S.nextReady);
    $('#lknote').textContent = S.nextReady ? 'Nächster Song ist fertig' : 'Nächster Song wird komponiert';
  }
  function renderTime() {
    const s = S.cur;
    if (!s) return;
    const pct = S.composing ? 0 : (S.elapsed / s.dur * 100);
    $('#pbar').style.width = pct + '%';
    $('#pcur').textContent = fmt(S.elapsed);
    $('#prem').textContent = '−' + fmt(s.dur - S.elapsed);
    $('#miniprog').style.width = pct + '%';
    $('#lkbar').style.width = pct + '%';
    $('#lkcur').textContent = fmt(S.elapsed);
    $('#lkrem').textContent = '−' + fmt(s.dur - S.elapsed);
    $('#cbar').style.width = pct + '%';
    $('#ccur').textContent = fmt(S.elapsed);
    $('#crem').textContent = '−' + fmt(s.dur - S.elapsed);
  }

  let nextTimer;
  function prepareNext() {
    clearTimeout(nextTimer);
    if (!S.session || (S.cur && S.cur.replay)) { S.next = null; renderNext(); return; }
    S.next = makeSong(S.session);
    S.nextReady = false;
    renderNext();
    nextTimer = setTimeout(() => { S.nextReady = true; renderNext(); }, 4200);
  }

  function setSong(song, { autoplay = true } = {}) {
    if (S.cur && !S.composing && S.cur !== song && !S.cur.replay) S.history.push(S.cur);
    S.cur = song;
    S.elapsed = 0;
    Engine.load(song);
    paintNow(song);
    renderNow();
    if (!song.replay) prepareNext(); else { S.next = null; renderNext(); }
    setPlaying(autoplay);
    renderLibIfOpen();
  }

  let composeId = 0;
  async function composeAndPlay(song, ms = 2400) {
    const id = ++composeId;
    if (S.cur && !S.cur.replay && !S.composing) S.history.push(S.cur);
    Engine.stop(); S.playing = false;
    S.composing = true;
    S.cur = song;
    paintNow(song, true);
    renderNow(); setPlaying(false);
    await sleep(REDUCED ? 500 : ms);
    if (id !== composeId) return;
    S.composing = false;
    S.cur = null; // setSong must not push the composing placeholder into history
    setSong(song);
    $('#pcoverart').classList.remove('fast');
  }

  function startSession(key, { voice = false } = {}) {
    const changed = S.session !== key;
    S.session = key; S.forgotten = false;
    if (changed) S.mods = freshMods();
    S.recent = [key, ...S.recent.filter(k => k !== key)].slice(0, 4);
    if (ST[key].count === 0) ST[key].count = 1;
    openPlayer();
    composeAndPlay(makeSong(key), voice ? 2600 : 1800);
    renderRecent();
  }

  function openPlayer() { if (!S.cur) return; setOn('s-player', true); }
  function closePlayer() { setOn('s-player', false); }

  function nextSong(reason) {
    if (!S.cur || S.composing) return;
    Engine.unlock();
    if (S.cur.replay || !S.next) {
      if (!S.session) return;
      composeAndPlay(makeSong(S.session), 1400);
      return;
    }
    const n = S.next;
    if (S.nextReady) setSong(n);
    else composeAndPlay(n, 1200);
    if (reason === 'skip' && S.elapsed < 30) S.reactions++;
  }
  function prevSong() {
    if (!S.cur || S.composing) return;
    if (S.elapsed > 5 || !S.history.length) { S.elapsed = 0; Engine.load(S.cur); renderTime(); return; }
    const p = S.history.pop();
    S.cur = null;
    setSong(p);
  }
  function bumpTaste(genre, d) {
    const g = genre.split(',')[0];
    S.taste[g] = clamp((S.taste[g] ?? 40) + d, 5, 99);
    S.reactions++;
    S.bumped = g;
    renderTaste(false);
  }
  function like() {
    const s = S.cur;
    if (!s || S.composing) return;
    if (S.liked.has(s.id)) { S.liked.delete(s.id); toast('Like entfernt'); }
    else { S.liked.add(s.id); bumpTaste(s.genre, 3); toast(`Mehr davon. Gemerkt für ${s.station}`); }
    $('#pup').classList.add('pop'); setTimeout(() => $('#pup').classList.remove('pop'), 450);
    renderNow();
  }
  function dislike() {
    const s = S.cur;
    if (!s || S.composing) return;
    bumpTaste(s.genre, -4);
    toast('Weniger davon. Nächster Song kommt');
    nextSong('dislike');
  }
  function save() {
    const s = S.cur;
    if (!s || S.composing) return;
    const i = S.library.findIndex(x => x.id === s.id);
    if (i >= 0) { S.library.splice(i, 1); toast('Aus Bibliothek entfernt'); }
    else { S.library.unshift(s); bumpTaste(s.genre, 2); toast('In Bibliothek gespeichert'); }
    const b = $('#padd'); b.classList.add('pop'); setTimeout(() => b.classList.remove('pop'), 450);
    renderNow(); renderLibIfOpen();
  }
  function replay(song) {
    const r = Object.assign({}, song, { replay: true });
    S.cur = null;
    setSong(r);
    openPlayer();
    toast('Wiederhören · kostet nichts');
  }

  // ---------------------------------------------------------------- home / library / taste
  function renderRecent() {
    $('#recent').innerHTML = S.recent.slice(0, 4).map((k, i) => `<button class="card" data-station="${k}"><div class="art" id="rc${i}"></div><b>${esc(ST[k].name)}</b><span>${esc(k === S.session ? 'Läuft gerade' : ST[k].sub)}</span></button>`).join('');
    S.recent.slice(0, 4).forEach((k, i) => paint($('#rc' + i), ST[k].p, k + 'card', { blur: 0.12, lines: 9, fade: false }));
    const nextKey = ORB_ORDER[S.orbIdx % ORB_ORDER.length];
    $('#orbhint').textContent = VOICE[nextKey].hint;
  }
  function renderLibIfOpen() { if (S.tab === 'lib') renderLib(); }
  function renderLib() {
    $$('#libseg button').forEach(b => b.classList.toggle('on', b.dataset.seg === S.libseg));
    const body = $('#libbody');
    const eq = `<span class="eq${S.playing ? '' : ' paused'}"><i></i><i></i><i></i></span>`;
    const item = (s, i, pre) => `<button class="item${S.cur && S.cur.id === s.id ? ' playing' : ''}" data-song="${pre}${i}"><div class="art" id="${pre}a${i}"></div><div style="min-width:0"><b>${esc(s.title)}</b><span>${esc(s.genre.split(',')[0])} · ${esc(s.station)}</span></div><span class="d">${S.cur && S.cur.id === s.id ? eq : fmt(s.dur)}</span></button>`;
    if (S.libseg === 'st') {
      const keys = Object.keys(ST).filter(k => ST[k].count > 0);
      body.innerHTML = `<div class="sgrid">${keys.map(k => `<button class="st" data-station="${k}"><div class="aura" style="inset:0" id="lst-${k}"></div><div class="shade"></div>${S.session === k ? `<span class="eq${S.playing ? '' : ' paused'}" style="position:absolute;top:12px;right:12px;z-index:5">${'<i></i>'.repeat(3)}</span>` : ''}<div class="lab"><b>${esc(ST[k].name)}</b><span>${ST[k].count} Songs</span></div></button>`).join('')}</div>
        <div class="list-h"><div class="h-s">Zuletzt gespeichert</div><small>Wiederhören ist immer inklusive</small></div>
        ${S.library.slice(0, 4).map((s, i) => item(s, i, 'L')).join('') || '<p class="empty">Noch nichts gespeichert.</p>'}`;
      keys.forEach(k => paint($('#lst-' + k), ST[k].p, k + 'card', { blur: 0.13, lines: 10, fade: false }));
      S.library.slice(0, 4).forEach((s, i) => paint($('#La' + i), s.p, s.seed, { blur: 0.12, fade: false }));
    } else {
      const list = S.libseg === 'songs' ? S.library : [...(S.cur && !S.composing ? [S.cur] : []), ...S.history.slice().reverse()];
      const pre = S.libseg === 'songs' ? 'L' : 'H';
      body.innerHTML = list.length ? list.map((s, i) => item(s, i, pre)).join('') : `<p class="empty">${S.libseg === 'songs' ? 'Noch nichts gespeichert. Tippe im Player auf ⊕.' : 'Noch kein Verlauf.'}</p>`;
      list.forEach((s, i) => paint($('#' + pre + 'a' + i), s.p, s.seed, { blur: 0.12, fade: false }));
      body._list = list;
    }
    body._lib = S.library;
  }
  function renderTaste(animate) {
    const rows = Object.entries(S.taste).sort((a, b) => b[1] - a[1]).slice(0, 5);
    $('#genres').innerHTML = rows.map(([g, v]) => `<div class="g${S.bumped === g ? ' bump' : ''}"><span>${esc(g)}</span><div class="ln"><i style="width:${animate ? 0 : v}%" data-w="${v}"></i></div><span class="v">${v}</span></div>`).join('');
    if (animate) requestAnimationFrame(() => requestAnimationFrame(() => $$('#genres .ln i').forEach(i => { i.style.width = i.dataset.w + '%'; })));
    $('#learned').textContent = `Gelernt aus ${S.reactions} Reaktionen in 5 Wochen`;
    const nb = $('#nowblk');
    if (S.session && !S.forgotten) nb.innerHTML = `<div class="nowcard"><b>Gerade: ${esc(ST[S.session].name)}</b><span>Bleibt nur für diese Session</span><button class="forget" id="forget">Vergessen</button></div>`;
    else nb.innerHTML = `<div class="nowcard gone"><b>Keine aktive Session</b><span>${S.forgotten ? 'Stimmung und Kontext sind gelöscht' : 'Starte einen Song, dann steht hier dein Moment'}</span></div>`;
    $('#rules').innerHTML = S.rules.map((r, i) => `<button class="rule${r.s === 'Aus' ? ' off' : ''}" data-rule="${i}"><b>${esc(r.t)}</b><span>${r.s}<svg class="i" style="width:16px;height:16px"><use href="#chevr"/></svg></span></button>`).join('');
  }

  // ---------------------------------------------------------------- listening
  let listenId = 0, waveOn = false, sendNow = null;
  function buildWave() { $('#wave').innerHTML = '<i></i>'.repeat(46); }
  function waveLoop(t) {
    if (!waveOn) return;
    const bars = $$('#wave i');
    bars.forEach((b, k) => {
      const x = k / (bars.length - 1), env = Math.sin(Math.PI * x);
      const n = 0.35 + 0.65 * Math.abs(Math.sin(t / 180 + k * 1.7) * Math.cos(t / 260 + k * 0.45));
      b.style.height = (6 + env * 52 * n).toFixed(1) + 'px';
      b.style.opacity = (0.35 + env * 0.65).toFixed(2);
    });
    requestAnimationFrame(waveLoop);
  }
  async function listen(key) {
    const id = ++listenId;
    const v = VOICE[key];
    Engine.unlock();
    if (S.playing) setPlaying(false);
    setOn('s-talk', false); setOn('s-pay', false);
    paint($('#halo'), v.ask ? 'dusk' : ST[v.station].p, key + 'halo', { blur: 0.18, fade: false });
    $('#halo').style.transform = '';
    $('#said').innerHTML = '';
    $('#got').innerHTML = '<div class="lab">Verstanden</div>' + v.got.map(g => `<div class="row"><span>${esc(g[0])}</span><b>${esc(g[1])}${g[2] ? `<small>${esc(g[2])}</small>` : ''}</b></div>`).join('');
    $('#livelabel').innerHTML = '<i></i>Melodyn hört zu';
    $('#listenhint').textContent = 'Tippen zum Senden';
    setOn('s-listen', true);
    waveOn = true; requestAnimationFrame(waveLoop);
    let fast = false;
    sendNow = () => { fast = true; };
    const words = v.text.split(' ');
    const said = $('#said');
    for (let k = 0; k < words.length; k++) {
      if (id !== listenId) return;
      const w = document.createElement('span');
      w.className = 'w'; w.textContent = words[k];
      said.append(w, ' ');
      requestAnimationFrame(() => w.classList.add('in'));
      if (!fast) await sleep(REDUCED ? 30 : 150 + Math.random() * 90);
    }
    said.insertAdjacentHTML('beforeend', '<span class="caret"></span>');
    const lab = $('#got .lab'); lab.classList.add('in');
    for (const row of $$('#got .row')) { if (id !== listenId) return; if (!fast) await sleep(REDUCED ? 30 : 320); row.classList.add('in'); }
    if (!fast) {
      await new Promise(res => { sendNow = res; setTimeout(res, 1500); });
    }
    if (id !== listenId) return;
    waveOn = false;
    $$('#wave i').forEach(b => { b.style.height = '4px'; });
    $('#livelabel').innerHTML = 'Verstanden';
    $('#listenhint').textContent = v.ask ? 'Melodyn hat eine Frage' : 'Melodyn komponiert';
    $('#halo').style.transform = 'translateY(-160px) scale(1.2)';
    await sleep(REDUCED ? 100 : 550);
    if (id !== listenId) return;
    S.orbIdx++;
    if (v.ask) { setOn('s-listen', false); openBreakup(v.text); }
    else { startSession(v.station, { voice: true }); await sleep(250); setOn('s-listen', false); }
    renderRecent();
  }
  function cancelListen() { listenId++; waveOn = false; setOn('s-listen', false); }

  // ---------------------------------------------------------------- conversation
  let talkMode = null;
  function addMe(text, spoken) {
    $('#msgs').insertAdjacentHTML('beforeend', `<div class="me">${esc(text)}</div>${spoken ? '<div class="me-meta"><svg class="i" style="width:12px;height:12px"><use href="#mic"/></svg>Gesprochen</div>' : ''}`);
    scrollMsgs();
  }
  async function addBot(text, delay = 900) {
    const t = document.createElement('div');
    t.className = 'bot';
    t.innerHTML = '<div class="dot aura" style="position:relative"></div><div class="typing"><i></i><i></i><i></i></div>';
    $('#msgs').appendChild(t);
    paint($('.dot', t), 'self', '4', { blur: 0.2, fade: false });
    scrollMsgs();
    await sleep(REDUCED ? 100 : delay);
    t.lastElementChild.outerHTML = `<p>${esc(text)}</p>`;
    scrollMsgs();
    return t;
  }
  function scrollMsgs() { const m = $('#msgs'); m.scrollTop = m.scrollHeight; }
  function setChips(list) { $('#qchips').innerHTML = list.map(c => `<button data-chip="${esc(c)}">${esc(c)}</button>`).join(''); }

  function openSteer() {
    talkMode = 'steer';
    $('#s-talk').classList.remove('solo');
    $('#msgs').innerHTML = '';
    setChips(['Etwas schneller', 'Ruhiger', 'Mehr Gitarren', 'Instrumental', 'Fröhlicher', 'Kein Autotune, immer']);
    setOn('s-talk', true);
    addBot('Was soll anders klingen? Ich passe den nächsten Song sofort an.', 500);
  }
  async function openBreakup(text) {
    talkMode = 'breakup';
    const s = $('#s-talk');
    s.classList.add('solo');
    paint($('#tbg'), 'dusk', '2', { blur: 0.2, fade: false });
    const last = S.cur;
    if (last) { paint($('#tminiart'), last.p, last.seed, { blur: 0.12, fade: false }); $('#tminititle').textContent = last.title; $('#tminisub').textContent = 'Heute Abend · pausiert'; }
    else { paint($('#tminiart'), 'rain', '3', { blur: 0.12, fade: false }); }
    $('#msgs').innerHTML = '';
    setChips([]);
    setOn('s-talk', true);
    await sleep(350);
    addMe(text, true);
    await addBot('Das tut mir leid. Willst du dich gerade reinfühlen oder eher rauskommen?', 1100);
    $('#msgs').insertAdjacentHTML('beforeend', `<div class="choices">
      <button class="choice" data-choice="in"><div class="sw" id="chin"></div><div><b>Reinfühlen</b><span>Langsam und nah. Ein Song über das, was war.</span></div><svg class="i"><use href="#chevr"/></svg></button>
      <button class="choice" data-choice="out"><div class="sw" id="chout"></div><div><b>Rauskommen</b><span>Mit Schwung nach vorn. Ein Song über das, was kommt.</span></div><svg class="i"><use href="#chevr"/></svg></button>
    </div><p class="priv"><svg class="i"><use href="#lock"/></svg>Deine Stimmung bleibt in dieser Session. Sie fließt nicht in dein Musikprofil ein.</p>`);
    paint($('#chin'), 'dusk', '8', { blur: 0.14, lines: 6, fade: false });
    paint($('#chout'), 'morning', '3', { blur: 0.14, lines: 6, fade: false });
    scrollMsgs();
  }
  async function choose(dir) {
    $$('.choice').forEach(c => { c.disabled = true; c.style.opacity = c.dataset.choice === dir ? '1' : '.4'; });
    addMe(dir === 'in' ? 'Reinfühlen' : 'Rauskommen');
    await addBot(dir === 'in' ? 'Okay. Ich schreib dir was Leises, Ehrliches. Klavier, wenig Beat.' : 'Okay. Wir holen dich da raus. Mit Schwung, aber ohne Kitsch.', 900);
    await sleep(700);
    startSession(dir === 'in' ? 'dusk' : 'dawn', { voice: true });
    await sleep(200);
    setOn('s-talk', false);
  }
  function steerInterpret(text) {
    const t = text.toLowerCase(), m = S.mods, out = [];
    let switchTo = null;
    if (/trenn|mies|traurig|liebeskummer/.test(t)) return { breakup: true };
    if (/hip.?hop|\brap\b|boom.?bap/.test(t)) switchTo = 'hiphop';
    else if (/jazz|koch/.test(t)) switchTo = 'kitchen';
    else if (/lo.?fi|fokus|konzentr|lernen|arbeit/.test(t)) switchTo = 'focus';
    else if (/laufen|sport|training|joggen/.test(t)) switchTo = 'run';
    else if (/nacht|fahr|synth/.test(t)) switchTo = 'night';
    if (/schneller|wacher|mehr energie|push|härter|tempo/.test(t)) { m.bpm += 10; m.energy += 0.12; out.push('Etwas schneller, plus 10 BPM.'); }
    if (/ruhiger|langsamer|chilliger|entspannter|leiser/.test(t)) { m.bpm -= 10; m.energy -= 0.12; out.push('Etwas ruhiger, minus 10 BPM.'); }
    if (/gitarre/.test(t)) { m.guitar = true; out.push('Mehr Gitarren sind drin.'); }
    if (/instrumental|ohne gesang|ohne text/.test(t)) { m.instrumental = true; out.push('Ab jetzt instrumental.'); }
    if (/fröhlich|heller|positiver|besser/.test(t)) { m.valence += 0.2; out.push('Heller und etwas fröhlicher.'); }
    if (/dunkler|düsterer|melanchol/.test(t)) { m.valence -= 0.2; out.push('Dunkler, mehr Moll.'); }
    if (/autotune/.test(t)) {
      const scope = /immer|nie wieder|nie mehr|generell/.test(t) ? 'Immer' : 'Nur heute';
      const r = S.rules.find(x => x.t === 'Kein Autotune');
      if (r) r.s = scope; else S.rules.push({ t: 'Kein Autotune', s: scope });
      out.push(`Gemerkt: kein Autotune, ${scope.toLowerCase()}.`);
      renderTaste(false);
    }
    if (switchTo) out.unshift(`Okay, wechsle zu ${ST[switchTo].name}.`);
    if (!out.length) out.push('Verstanden. Ich passe die Richtung an.');
    return { reply: out.join(' ') + ' Neuer Song kommt gleich.', switchTo };
  }
  async function steer(text, spoken) {
    if (!text.trim()) return;
    addMe(text, spoken);
    setChips([]);
    const res = steerInterpret(text);
    if (res.breakup) { await sleep(300); setOn('s-talk', false); openBreakup(text); return; }
    await addBot(res.reply, 900);
    await sleep(900);
    setOn('s-talk', false);
    if (res.switchTo) startSession(res.switchTo);
    else if (S.session) composeAndPlay(makeSong(S.session), 1800);
    else startSession('night');
  }
  async function fakeVoice(input, phrases) {
    const text = phrases[Math.floor(Math.random() * phrases.length)];
    input.value = '';
    input.placeholder = 'Hört zu …';
    for (let i = 1; i <= text.length; i++) { input.value = text.slice(0, i); await sleep(REDUCED ? 0 : 22); }
    await sleep(250);
    input.value = '';
    input.placeholder = 'Sag Melodyn, was anders sein soll …';
    return text;
  }

  // ---------------------------------------------------------------- devices
  function clockTick() {
    const d = new Date();
    const hm = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    $$('.clock').forEach(c => { c.textContent = hm; });
    $('#lktime').textContent = hm;
    $('#lkdate').textContent = d.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
    const h = d.getHours();
    $('#greet').textContent = (h < 11 ? 'Guten Morgen' : h < 18 ? 'Guten Tag' : 'Guten Abend') + ', Elias';
  }
  function setDevice(dev) {
    S.device = dev;
    $$('#devices button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.device === dev)));
    $('#phonewrap').hidden = dev === 'car';
    $('#carwrap').hidden = dev !== 'car';
    setOn('s-lock', dev === 'lock');
    fit();
    const s = S.cur;
    if (dev === 'lock' && s) { paint($('#lkart'), s.p, s.seed, { blur: 0.12, lines: 7, fade: false }); paint($('#lockwall'), s.p === 'night' ? 'tunnel' : s.p, s.seed, { blur: 0.2, lines: 18, la: 0.12, fade: false }); }
    if (dev === 'car') {
      requestAnimationFrame(() => {
        paintStatic($('#carwrap'));
        if (s) { paint($('#ccover'), s.p, s.seed, { blur: 0.11, lines: 12, fade: false }); paint($('#cbg'), s.p, s.seed, { blur: 0.2, fade: false }); }
      });
    }
  }
  async function carTalk() {
    const b = $('#ctalk'), p = $('#ctalktxt');
    if (b.classList.contains('listening')) return;
    Engine.unlock();
    b.classList.add('listening');
    p.innerHTML = 'Hört zu …';
    await sleep(800);
    const phrase = '„Hey Melodyn, etwas wacher“';
    for (let i = 1; i <= phrase.length; i++) { p.innerHTML = `<b>${esc(phrase.slice(0, i))}</b>`; await sleep(REDUCED ? 0 : 35); }
    await sleep(400);
    p.innerHTML = 'Okay, etwas wacher. <b>Neuer Song kommt.</b>';
    b.classList.remove('listening');
    if (!S.session) S.session = 'night';
    S.mods.bpm += 8; S.mods.energy += 0.1;
    composeAndPlay(makeSong(S.session), 1800);
    await sleep(3200);
    p.innerHTML = 'Sag einfach <b>„Hey Melodyn, etwas wacher“</b>';
  }
  function fit() {
    const panelW = window.innerWidth > 900 ? 340 + 64 + 48 : 32;
    const availW = window.innerWidth - panelW;
    const availH = window.innerWidth > 900 ? window.innerHeight - 120 : window.innerHeight - 170;
    const ph = $('#phoneframe'), pw = $('#phonewrap');
    const s = Math.min(1, availH / 868, availW / 414);
    ph.style.transform = `scale(${s})`;
    pw.style.width = 390 * s + 'px'; pw.style.height = 844 * s + 'px';
    const cf = $('#carframe'), cw = $('#carwrap');
    const cs = Math.min(1, (availW - 20) / 832, availH / 512);
    cf.style.transform = `scale(${cs})`;
    cw.style.width = 800 * cs + 'px'; cw.style.height = 480 * cs + 'px';
  }

  // ---------------------------------------------------------------- paywall
  async function payCta() {
    const b = $('#paycta');
    if (b.dataset.busy) return;
    b.dataset.busy = '1';
    b.innerHTML = '<span class="spinner"></span>';
    await sleep(1200);
    $('#paytitle').textContent = 'Willkommen bei ' + S.plan;
    $('#paysuccess').classList.add('on');
    await sleep(2000);
    setOn('s-pay', false);
    await sleep(500);
    $('#paysuccess').classList.remove('on');
    b.textContent = '7 Tage kostenlos testen';
    delete b.dataset.busy;
    toast(`${S.plan} ist aktiv`);
  }

  // ---------------------------------------------------------------- website
  const MOMENTS = [
    { kind: 'Situation', q: 'Ich fahre nachts heim. Mach was dafür.', p: 'night', seed: '7', cp: 'tunnel', cs: '1', title: 'Amber Exit', meta: 'Synthwave · 96 BPM · ruhig, nächtlich', st: 'night' },
    { kind: 'Genre', q: '90er Hip-Hop, aber nicht zu aggressiv.', p: 'kitchen', seed: '3', cp: 'brass', cs: '9', title: 'Corner Store Sun', meta: 'Boom Bap · 90 BPM · lässig, warm', st: 'hiphop' },
    { kind: 'Gefühl', q: 'Ich hab mich getrennt. Mir geht’s mies.', p: 'dusk', seed: '8', cp: 'dusk', cs: '2', title: 'Zwei Tassen', meta: 'Piano-Ballade · 72 BPM · nah, ehrlich', st: 'dusk' },
  ];
  let webPlaying = -1, webPainted = false;
  function buildMoments() {
    $('#mcols').innerHTML = MOMENTS.map((m, i) => `<article class="mcard reveal">
      <div class="art"><div class="aura" style="inset:0" data-p="${m.p}" data-seed="${m.seed}" data-blur=".13" data-lines="14"></div><div class="shade"></div><span class="kind">${m.kind}</span><q>${esc(m.q)}</q></div>
      <div class="mres"><div class="c aura" data-p="${m.cp}" data-seed="${m.cs}" data-blur=".12"></div><div style="min-width:0"><b>${esc(m.title)}</b><span id="mm${i}">${esc(m.meta)}</span></div><button class="circle" data-moment="${i}" aria-label="${esc(m.title)} abspielen"><svg class="i f"><use href="#play"/></svg></button></div>
    </article>`).join('');
  }
  function playMoment(i) {
    Engine.unlock();
    if (S.playing) setPlaying(false);
    const was = webPlaying;
    stopMoment();
    if (was === i) return;
    const m = MOMENTS[i];
    const song = makeSong(m.st, { title: m.title, mods: freshMods() });
    S.used.delete(m.title);
    Engine.load(song); Engine.start();
    webPlaying = i;
    $(`[data-moment="${i}"] use`).setAttribute('href', '#pause');
    $('#mm' + i).innerHTML = `<span class="eq"><i></i><i></i><i></i></span>Läuft · Demo-Sound`;
  }
  function stopMoment() {
    if (webPlaying < 0) return;
    Engine.stop();
    const i = webPlaying;
    webPlaying = -1;
    $(`[data-moment="${i}"] use`).setAttribute('href', '#play');
    $('#mm' + i).textContent = MOMENTS[i].meta;
  }
  let wtoastT;
  function wtoast(msg) { const t = $('#wtoast'); t.textContent = msg; t.classList.add('on'); clearTimeout(wtoastT); wtoastT = setTimeout(() => t.classList.remove('on'), 2200); }
  function setBilling(b) {
    $$('#ptoggle button').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.bill === b)));
    $$('.wplan .price').forEach(p => {
      const m = parseFloat(p.dataset.m);
      const v = b === 'y' ? m * 10 / 12 : m;
      p.innerHTML = v.toFixed(2).replace('.', ',') + ' €<small>/ Monat</small>';
      p.nextElementSibling.textContent = b === 'y' ? `${(m * 10).toFixed(2).replace('.', ',')} € jährlich abgerechnet` : '';
    });
  }
  function submitWaitlist(form) {
    const input = $('input', form), msg = form.parentElement.querySelector('.wmsg');
    const v = input.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) {
      msg.textContent = 'Bitte gib eine gültige E-Mail-Adresse ein, zum Beispiel name@mail.de.';
      msg.classList.add('err'); input.focus();
      return;
    }
    const wrap = form.parentElement;
    wrap.innerHTML = `<div class="wdone"><div class="ck"><svg class="i" style="width:20px;height:20px;stroke-width:2.4"><use href="#check"/></svg></div><div><b>Du bist auf der Warteliste.</b><span>Wir schreiben an ${esc(v)}, sobald die Beta startet.</span></div></div>`;
    $$('.wlist').forEach(w => { if (w !== wrap && $('form', w)) w.innerHTML = `<div class="wdone"><div class="ck"><svg class="i" style="width:20px;height:20px;stroke-width:2.4"><use href="#check"/></svg></div><div><b>Schon eingetragen.</b><span>${esc(v)}</span></div></div>`; });
  }
  function setMode(mode) {
    S.mode = mode;
    $$('.switch button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === mode)));
    $('#appmode').hidden = mode !== 'app';
    $('#webmode').hidden = mode !== 'web';
    try { history.replaceState(null, '', '#' + mode); } catch (e) { /* sandbox */ }
    if (mode === 'web') {
      if (S.playing) setPlaying(false);
      window.scrollTo(0, 0);
      requestAnimationFrame(() => { if (!webPainted) { paintStatic($('#webmode')); webPainted = true; } });
    } else {
      stopMoment();
      requestAnimationFrame(() => { fit(); paintStatic($('#appmode')); });
    }
  }

  // ---------------------------------------------------------------- events
  function bind() {
    document.addEventListener('click', e => {
      const t = e.target.closest('button, [data-mode], [data-station], .dash');
      if (!t) return;
      const d = t.dataset;
      if (d.mode) { setMode(d.mode); if (d.deviceGo) setDevice(d.deviceGo); return; }
      if (d.tab) { showTab(d.tab); return; }
      if (d.station) { Engine.unlock(); if (S.session === d.station && S.cur && !S.cur.replay) openPlayer(); else startSession(d.station); return; }
      if (d.scene) {
        Engine.unlock(); setDevice('phone');
        setOn('s-player', false); setOn('s-talk', false); setOn('s-pay', false); cancelListen();
        showTab('home');
        if (d.scene === 'run') startSession('run'); else listen(d.scene);
        return;
      }
      if (d.device) { setDevice(d.device); return; }
      if (d.seg) { S.libseg = d.seg; renderLib(); return; }
      if (d.song) {
        const pre = d.song[0], i = +d.song.slice(1);
        const list = pre === 'L' ? S.library : $('#libbody')._list;
        const s = list && list[i];
        if (s) { Engine.unlock(); if (S.cur && S.cur.id === s.id) openPlayer(); else replay(s); }
        return;
      }
      if (d.rule !== undefined) {
        const r = S.rules[+d.rule];
        r.s = r.s === 'Immer' ? 'Nur heute' : r.s === 'Nur heute' ? 'Aus' : 'Immer';
        renderTaste(false);
        toast(r.s === 'Aus' ? `„${r.t}“ ist aus` : `„${r.t}“ gilt: ${r.s.toLowerCase()}`);
        return;
      }
      if (d.chip) { steer(d.chip, false); return; }
      if (d.choice) { choose(d.choice); return; }
      if (d.moment !== undefined) { playMoment(+d.moment); return; }
      if (d.go) {
        const el = document.getElementById(d.go);
        if (el) el.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'start' });
        if (d.go === 'w-end') setTimeout(() => { const i = $('#wmail2'); if (i) i.focus({ preventScroll: true }); }, 700);
        return;
      }
      if (d.soon !== undefined) { wtoast('Diese Seite folgt bald.'); return; }
      if (d.plan) { S.plan = d.plan; $$('.plan').forEach(p => p.classList.toggle('on', p === t)); $('#payfine').textContent = `Danach ${d.price} € pro Monat. Jederzeit kündbar.`; return; }
      if (t.id === 'forget') { S.forgotten = true; S.mods = freshMods(); renderTaste(false); toast('Session vergessen'); return; }
    });

    $('#orb').addEventListener('click', () => listen(ORB_ORDER[S.orbIdx % ORB_ORDER.length]));
    $('#avatar').addEventListener('click', () => setOn('s-pay', true));
    $('#tastepay').addEventListener('click', () => setOn('s-pay', true));
    $('#payclose').addEventListener('click', () => setOn('s-pay', false));
    $('#paycta').addEventListener('click', payCta);
    $('#libplus').addEventListener('click', () => { showTab('home'); listen(ORB_ORDER[S.orbIdx % ORB_ORDER.length]); });
    $('#listenclose').addEventListener('click', cancelListen);
    $('#stopbtn').addEventListener('click', () => { if (sendNow) sendNow(); });
    $('#pclose').addEventListener('click', closePlayer);
    $('#pmore').addEventListener('click', () => toast('Teilen, Songtext und Details folgen'));
    $('#pplay').addEventListener('click', () => setPlaying(!S.playing));
    $('#pnextbtn').addEventListener('click', () => nextSong('skip'));
    $('#pprev').addEventListener('click', prevSong);
    $('#pup').addEventListener('click', like);
    $('#pdown').addEventListener('click', dislike);
    $('#padd').addEventListener('click', save);
    $('#steer').addEventListener('click', openSteer);
    $('#ptrack').addEventListener('click', e => {
      if (!S.cur || S.composing) return;
      const r = e.currentTarget.getBoundingClientRect();
      S.elapsed = clamp((e.clientX - r.left) / r.width, 0, 0.99) * S.cur.dur;
      renderTime();
    });
    $('#mini').addEventListener('click', e => {
      if (e.target.closest('#miniplay')) { setPlaying(!S.playing); return; }
      if (e.target.closest('#mininext')) { nextSong('skip'); return; }
      openPlayer();
    });
    $('#talkdim').addEventListener('click', () => { if (talkMode === 'steer') setOn('s-talk', false); });
    $('.grab').addEventListener('click', () => setOn('s-talk', false));
    const ci = $('#composein');
    ci.addEventListener('input', () => $('#composeicon use').setAttribute('href', ci.value.trim() ? '#send' : '#mic'));
    $('#compose').addEventListener('submit', async e => {
      e.preventDefault();
      Engine.unlock();
      if (ci.value.trim()) { const v = ci.value; ci.value = ''; $('#composeicon use').setAttribute('href', '#mic'); steer(v, false); return; }
      const v = await fakeVoice(ci, ['Etwas schneller, bitte', 'Mach es ruhiger', 'Mehr Gitarren', 'Kein Autotune, nie wieder']);
      steer(v, true);
    });
    // lockscreen
    $('#lkplay').addEventListener('click', () => setPlaying(!S.playing));
    $('#lknext').addEventListener('click', () => nextSong('skip'));
    $('#lkprev').addEventListener('click', prevSong);
    $('#lkup').addEventListener('click', like);
    $('#lkdown').addEventListener('click', dislike);
    $('#lksay').addEventListener('click', () => { setDevice('phone'); showTab('home'); listen(ORB_ORDER[S.orbIdx % ORB_ORDER.length]); });
    $('#unlock').addEventListener('click', () => setDevice('phone'));
    // car
    $('#cplay').addEventListener('click', () => setPlaying(!S.playing));
    $('#cnext').addEventListener('click', () => nextSong('skip'));
    $('#cprev').addEventListener('click', prevSong);
    $('#cup').addEventListener('click', like);
    $('#cdown').addEventListener('click', dislike);
    $('#ctalk').addEventListener('click', carTalk);
    $('#ctrack').addEventListener('click', e => {
      if (!S.cur || S.composing) return;
      const r = e.currentTarget.getBoundingClientRect();
      S.elapsed = clamp((e.clientX - r.left) / r.width, 0, 0.99) * S.cur.dur; renderTime();
    });
    // website
    $$('.wform').forEach(f => f.addEventListener('submit', e => { e.preventDefault(); submitWaitlist(f); }));
    $$('.wform input').forEach(i => i.addEventListener('input', () => { const m = i.closest('.wlist').querySelector('.wmsg'); m.textContent = ''; m.classList.remove('err'); }));
    $('#ptoggle').addEventListener('click', e => { const b = e.target.closest('button'); if (b) setBilling(b.dataset.bill); });
    window.addEventListener('scroll', () => $('#wnav').classList.toggle('scrolled', window.scrollY > 10), { passive: true });
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) en.target.classList.add('in'); }), { threshold: 0.12 });
      $$('.reveal').forEach(el => io.observe(el));
    } else $$('.reveal').forEach(el => el.classList.add('in'));
    window.addEventListener('resize', fit);
    window.addEventListener('keydown', e => {
      if (S.mode !== 'app' || e.target.closest('input')) return;
      if (e.code === 'Space') { e.preventDefault(); setPlaying(!S.playing); }
      if (e.key === 'ArrowRight') nextSong('skip');
    });

    let last = performance.now();
    setInterval(() => {
      const now = performance.now(), dt = (now - last) / 1000; last = now;
      if (!S.playing || !S.cur || S.composing) return;
      S.elapsed += dt;
      if (S.elapsed >= S.cur.dur) { if (!S.cur.replay) bumpTaste(S.cur.genre, 1); nextSong('end'); return; }
      renderTime();
    }, 250);
    setInterval(clockTick, 10000);
  }

  // ---------------------------------------------------------------- boot
  function boot() {
    $('#scenes').innerHTML = [
      ['night', 'Heimfahrt, nachts', 'Sprechen, verstehen, komponieren', 'night'],
      ['hiphop', '90er Hip-Hop', 'Ein Genre als Wunsch', 'brass'],
      ['breakup', 'Liebeskummer', 'Eine Rückfrage, dann Musik', 'dusk'],
      ['kitchen', 'Kochen mit Freunden', 'Situation als Wunsch', 'kitchen'],
      ['run', 'Laufen, 10 km', 'Station direkt starten', 'run'],
    ].map(([k, b, s, p]) => `<button class="scene" data-scene="${k}"><div class="sw aura" data-p="${p}" data-seed="${k}" data-blur=".16"></div><div><b>${b}</b><span>${s}</span></div></button>`).join('');
    buildWave();
    buildMoments();
    clockTick();

    // A paused song from last night so the app opens in a lived-in state
    const lib = [makeSong('night', { title: 'Amber Exit', mods: freshMods() }), makeSong('kitchen', { title: 'Slow Simmer', mods: freshMods() }), makeSong('focus', { title: 'Paper Rain', mods: freshMods() })];
    S.library = lib.slice();
    S.session = 'night';
    S.history = [];
    S.cur = lib[0];
    Engine.load(S.cur);
    S.elapsed = 72;

    bind();
    const start = location.hash.slice(1) === 'web' ? 'web' : 'app';
    setMode(start);
    fit();
    paintStatic($('#appmode'));
    paintNow(S.cur);
    prepareNext();
    renderNow();
    renderRecent();
    renderTaste(false);
    setPlaying(false);
    syncChrome();
    setBilling('m');
    document.documentElement.dataset.ready = '1';
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
