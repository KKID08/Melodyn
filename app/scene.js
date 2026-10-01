// Home-screen looks besides the orb. Each is a calm, living picture in the colours of the current mood
// that reacts to touch and pulses with the playing song.
//   wave   – glowing sound-wave ribbons, the same language as the listening screen
//   aurora – soft curtains of light drifting like northern lights
//   pulse  – the Melodyn contour rings spreading out like sound from the centre
// Performance: soft parts (glow, light) are painted into a small canvas and scaled up; only thin lines
// are drawn at full resolution. 30 fps cap, frame-rate independent easing, quality drops on slow devices.

const TAU = Math.PI * 2;
const hex = h => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const rgba = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const mix = (a, b, t) => a + (b - a) * t;

export class Scene {
  constructor(canvas, { theme = 'wave', still = false } = {}) {
    this.cv = canvas; this.ctx = canvas.getContext('2d');
    this.theme = theme; this.still = still;
    this.soft = document.createElement('canvas'); this.sctx = this.soft.getContext('2d');
    this.softMax = 260; this.fps = 30; this.cost = 0; this.slow = 0;
    this.cols = null; this.target = null;
    this.press = 0; this.pressT = 0; this.bpm = 0; this.beat0 = 0; this.surge = 0;
    this.phase = 0; this.lastDraw = 0; this.running = false; this.t0 = performance.now();
    this.spawn = []; this.nextSpawn = 0;
    this.frame = this.frame.bind(this);
    this.resize();
  }
  setTheme(theme) { this.theme = theme; this.spawn = []; this.nextSpawn = 0; if (!this.running) this.draw(this.now(), true); }
  resize() {
    const r = this.cv.getBoundingClientRect();
    if (!r.width || !r.height) return false;
    const dpr = Math.min(1.5, window.devicePixelRatio || 1);
    const w = Math.round(r.width * dpr), h = Math.round(r.height * dpr);
    if (w !== this.cv.width || h !== this.cv.height) { this.cv.width = w; this.cv.height = h; }
    this.W = w; this.H = h; this.dpr = dpr;
    this.sizeSoft();
    if (!this.running) this.draw(this.now(), true);
    return true;
  }
  sizeSoft() {
    const f = Math.min(1, this.softMax / Math.max(this.W, this.H));
    const sw = Math.max(8, Math.round(this.W * f)), sh = Math.max(8, Math.round(this.H * f));
    if (this.soft.width !== sw || this.soft.height !== sh) { this.soft.width = sw; this.soft.height = sh; }
    this.f = f;
  }
  setPalette(pal, instant = false) {
    const cols = pal.c.map(hex);
    while (cols.length < 6) cols.push(cols[cols.length % pal.c.length]);
    this.target = cols.slice(0, 6); this.bgT = hex(pal.bg);
    if (!this.cols || instant) { this.cols = this.target.map(c => c.slice()); this.bg = this.bgT.slice(); }
    if (!this.running) this.draw(this.now(), true);
  }
  setBpm(bpm) { if (bpm && bpm !== this.bpm) this.beat0 = this.now(); this.bpm = bpm || 0; }
  setPressed(on) { this.pressT = on ? 1 : 0; }
  ripple() { this.surge = 1; if (this.theme === 'pulse') this.spawn.push({ t: this.now(), k: this.spawn.length, strong: true }); }
  now() { return (performance.now() - this.t0) / 1000; }
  start() {
    if (this.still) { this.draw(this.now(), true); return; }
    if (this.running) return;
    this.running = true; requestAnimationFrame(this.frame);
  }
  stop() { this.running = false; }
  frame() {
    if (!this.running) return;
    const t = this.now();
    if (t - this.lastDraw >= 1 / this.fps - 0.004) {
      const a = performance.now();
      this.draw(t);
      this.cost = this.cost * 0.9 + (performance.now() - a) * 0.1;
      if (this.cost > 8 && ++this.slow > 20 && this.softMax > 140) { this.softMax = Math.round(this.softMax * 0.7); this.fps = 24; this.slow = 0; this.cost = 4; this.sizeSoft(); }
    }
    requestAnimationFrame(this.frame);
  }

  draw(t, force = false) {
    if (!this.W || !this.cols) return;
    const dt = force ? 0 : Math.min(0.1, t - (this.lastDraw || t));
    this.lastDraw = t;
    const e = r => (force ? 1 : 1 - Math.pow(1 - r, dt * 60));
    this.press = mix(this.press, this.pressT, e(0.25));
    this.surge = Math.max(0, this.surge - dt * 1.4);
    const cr = e(0.03);
    for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) this.cols[i][j] = mix(this.cols[i][j], this.target[i][j], cr);
    for (let j = 0; j < 3; j++) this.bg[j] = mix(this.bg[j], this.bgT[j], cr);
    this.phase += dt;
    let beat = 0;
    if (this.bpm && !this.still) { const ph = ((t - this.beat0) * this.bpm / 60) % 1; beat = Math.exp(-ph * 6); }
    const energy = Math.min(1.6, 1 + 0.35 * beat + 0.8 * this.surge - 0.35 * this.press);
    const s = this.sctx;
    s.setTransform(1, 0, 0, 1, 0, 0); s.clearRect(0, 0, this.soft.width, this.soft.height);
    s.setTransform(this.f, 0, 0, this.f, 0, 0);
    this.ctx.clearRect(0, 0, this.W, this.H);
    if (this.theme === 'aurora') this.aurora(t, energy, beat);
    else if (this.theme === 'pulse') this.pulse(t, energy, beat);
    else this.wave(t, energy, beat);
  }
  blit() { this.ctx.drawImage(this.soft, 0, 0, this.W, this.H); }

  // ---------------------------------------------------------------- wave
  wave(t, energy) {
    const { W, H, sctx: s, ctx } = this, P = this.phase, cy = H / 2;
    const breath = 0.85 + 0.15 * Math.sin(t * TAU / 6);
    // Haze behind the ribbons
    // an ellipse that fades out before the canvas edge, so no box ever shows
    s.save(); s.translate(W / 2, cy); s.scale(W / H, 1);
    const g = s.createRadialGradient(0, 0, 0, 0, 0, H * 0.5);
    g.addColorStop(0, rgba(this.cols[0], 0.22 * energy)); g.addColorStop(0.55, rgba(this.cols[2], 0.07)); g.addColorStop(1, rgba(this.cols[2], 0));
    s.fillStyle = g; s.fillRect(-H / 2, -H / 2, H, H);
    s.restore();
    const n = 6, step = Math.max(4, Math.round(W / 90));
    const y = (k, x) => {
      const u = x / W, env = Math.pow(Math.sin(Math.PI * u), 1.6);
      const A = H * 0.2 * breath * energy * (0.55 + 0.45 * ((k * 37) % n) / n);
      return cy + A * env * (0.65 * Math.sin(u * TAU * (1.1 + k * 0.17) + P * (0.55 + k * 0.08) + k) + 0.35 * Math.sin(u * TAU * (2.3 + k * 0.11) - P * (0.4 + k * 0.05) + k * 2));
    };
    const path = (c, k) => { c.beginPath(); for (let x = 0; x <= W + step; x += step) { const yy = y(k, Math.min(x, W)); if (x === 0) c.moveTo(0, yy); else c.lineTo(Math.min(x, W), yy); } };
    // Glow: the same ribbons, thick, on the small canvas
    s.globalCompositeOperation = 'lighter';
    s.lineCap = 'round';
    for (let k = 0; k < n; k++) { path(s, k); s.strokeStyle = rgba(this.cols[k], 0.16); s.lineWidth = H * 0.06; s.stroke(); }
    s.globalCompositeOperation = 'source-over';
    this.blit();
    // Crisp ribbons, fading out at both ends
    ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < n; k++) {
      const lg = ctx.createLinearGradient(0, 0, W, 0);
      lg.addColorStop(0, rgba(this.cols[k], 0)); lg.addColorStop(0.5, rgba(this.cols[k], 0.95)); lg.addColorStop(1, rgba(this.cols[k], 0));
      path(ctx, k); ctx.strokeStyle = lg; ctx.lineWidth = Math.max(1.2, this.dpr * (k === 0 ? 2.2 : 1.4)); ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  // ---------------------------------------------------------------- aurora
  // Curtains made of many thin vertical strips: bright at the lower hem, fading upward, swaying slowly.
  // Painted tiny, softened once with a cheap blur on the small canvas, then scaled up.
  aurora(t, energy) {
    const { W, H, ctx } = this, P = this.phase;
    if (!this.au) { this.au = document.createElement('canvas'); this.auc = this.au.getContext('2d'); }
    const aw = this.soft.width, ah = this.soft.height;
    if (this.au.width !== aw || this.au.height !== ah) { this.au.width = aw; this.au.height = ah; }
    const a = this.auc, sx = aw / W;
    a.setTransform(1, 0, 0, 1, 0, 0); a.clearRect(0, 0, aw, ah); a.setTransform(sx, 0, 0, sx, 0, 0);
    a.globalCompositeOperation = 'lighter';
    const strips = 48, sw = W / strips;
    for (let k = 0; k < 4; k++) {
      const c = this.cols[k];
      for (let i = 0; i < strips; i++) {
        const u = (i + 0.5) / strips;
        // where this curtain lives across the width, and how strong it is there
        const centre = 0.5 + 0.38 * Math.sin(P * 0.09 + k * 1.9), spread = 0.28 + 0.08 * Math.sin(P * 0.13 + k);
        const w = Math.exp(-Math.pow((u - centre) / spread, 2)) * Math.pow(Math.sin(Math.PI * u), 0.8);
        if (w < 0.02) continue;
        const hem = H * (0.62 + 0.1 * Math.sin(u * 7 + P * 0.42 + k * 1.3) + 0.05 * Math.sin(u * 17 - P * 0.6 + k * 0.7));
        const tall = H * (0.35 + 0.12 * Math.sin(u * 4 - P * 0.3 + k * 2.1)) * (0.8 + 0.2 * energy);
        const flick = 0.75 + 0.25 * Math.sin(P * 1.3 + i * 0.9 + k * 3);
        const g = a.createLinearGradient(0, hem - tall, 0, hem + H * 0.04);
        g.addColorStop(0, rgba(c, 0)); g.addColorStop(0.75, rgba(c, 0.32 * w * flick * energy)); g.addColorStop(0.92, rgba(c, 0.7 * w * flick * energy)); g.addColorStop(1, rgba(c, 0));
        a.fillStyle = g; a.fillRect(i * sw - 0.5, hem - tall, sw + 1, tall + H * 0.04);
      }
    }
    a.globalCompositeOperation = 'source-over';
    const s = this.sctx;
    s.setTransform(1, 0, 0, 1, 0, 0);
    if ('filter' in s) s.filter = `blur(${Math.max(1.5, aw / 90).toFixed(1)}px)`;
    s.drawImage(this.au, 0, 0);
    if ('filter' in s) s.filter = 'none';
    this.blit();
    // a faint sheen of fine light threads on top keeps it crisp
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineWidth = Math.max(1, this.dpr * 0.7);
    for (let i = 0; i < 36; i++) {
      const u = (i + 0.5) / 36, x = W * u + Math.sin(P * 0.5 + i) * W * 0.006;
      const al = Math.pow(Math.sin(Math.PI * u), 2) * (0.05 + 0.06 * (0.5 + 0.5 * Math.sin(P * 0.8 + i * 1.7))) * energy;
      const hem = H * (0.62 + 0.1 * Math.sin(u * 7 + P * 0.42)), y0 = hem - H * 0.4;
      const lg = ctx.createLinearGradient(0, y0, 0, hem);
      lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(1, `rgba(255,255,255,${al.toFixed(3)})`);
      ctx.strokeStyle = lg; ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, hem); ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  // ---------------------------------------------------------------- pulse
  pulse(t, energy, beat) {
    const { W, H, sctx: s, ctx } = this, cx = W / 2, cy = H / 2, M = Math.min(W, H);
    // Core light
    const g = s.createRadialGradient(cx, cy, 0, cx, cy, M * 0.55);
    g.addColorStop(0, rgba(this.cols[0], 0.5 * energy)); g.addColorStop(0.35, rgba(this.cols[1], 0.2)); g.addColorStop(1, rgba(this.cols[2], 0));
    s.fillStyle = g; s.fillRect(0, 0, W, H);
    this.blit();
    // New ring every ~1.1 s, or on the beat of the playing song; start already filled
    const period = this.bpm ? 60 / this.bpm * 2 : 1.1, life = 4.6;
    if (!this.spawn.length && !this.nextSpawn) for (let i = 4; i > 0; i--) this.spawn.push({ t: t - i * period, k: -i });
    if (t >= this.nextSpawn) { this.spawn.push({ t, k: Math.floor(t / period) }); this.nextSpawn = t + period; }
    // rings must have faded out before they reach the edge of the canvas
    const maxR = Math.min(W / 2, H / 2 / 0.92) * 0.9;
    this.spawn = this.spawn.filter(r => t - r.t < life);
    ctx.globalCompositeOperation = 'lighter';
    for (const r of this.spawn) {
      const p = (t - r.t) / life, e = 1 - Math.pow(1 - p, 2.2);
      const R = M * 0.07 + e * (maxR - M * 0.07) * 0.9, a = Math.pow(1 - p, 1.6) * Math.min(1, p * 8) * (r.strong ? 0.9 : 0.6);
      const c = this.cols[((r.k % 6) + 6) % 6], amp = R * (0.035 + 0.02 * energy), ph = r.k * 1.7 + this.phase * 0.4;
      ctx.beginPath();
      for (let i = 0; i <= 72; i++) {
        const an = i / 72 * TAU, rr = R + amp * Math.sin(an * 3 + ph) + amp * 0.5 * Math.sin(an * 5 - ph * 1.3);
        const x = cx + rr * Math.cos(an), y = cy + rr * Math.sin(an) * 0.92;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = rgba(c, a.toFixed(3)); ctx.lineWidth = Math.max(1, this.dpr * (r.strong ? 2 : 1.2));
      ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
    // Small bright centre, beating with the music
    const cr = M * (0.03 + 0.01 * beat + 0.02 * this.surge);
    const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, cr * 2.4);
    cg.addColorStop(0, 'rgba(255,255,255,0.95)'); cg.addColorStop(0.4, rgba(this.cols[0], 0.6)); cg.addColorStop(1, rgba(this.cols[0], 0));
    ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(cx, cy, cr * 2.4, 0, TAU); ctx.fill();
  }
}
