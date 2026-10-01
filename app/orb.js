// The Melodyn orb: a living sphere drawn on a canvas.
// Inside, the colours of the current mood drift like light in liquid; the Melodyn contour rings flow
// across it; soft 3D shading, a rim light and an outer glow make it read as an object you can press.
// It breathes when idle, swells with the voice while listening, pulses on the beat of the playing song
// and sends out a ripple when tapped.

const TAU = Math.PI * 2;
const hex = h => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const rgba = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const mix = (a, b, t) => a + (b - a) * t;

export class Orb {
  // canvas: drawn at (1 + 2 * glow) times the sphere size so the glow has room
  constructor(canvas, { glow = 0.42, rings = 10, lights = 5, still = false, maxDpr = 1.5 } = {}) {
    this.maxDpr = maxDpr;
    this.cv = canvas; this.ctx = canvas.getContext('2d');
    this.glow = glow; this.nRings = rings; this.nLights = lights; this.still = still;
    this.level = 0; this.levelT = 0; this.bpm = 0; this.beat0 = 0; this.busy = 0; this.busyT = 0;
    this.ripples = []; this.press = 0; this.pressT = 0;
    this.cols = null; this.target = null; this.bg = [11, 18, 54]; this.bgT = this.bg;
    this.seed = Math.random() * 100;
    // Everything soft (glow, colour light, shading) is painted small and scaled up: it is blurry anyway,
    // and it is by far the most expensive part. Only the fine lines are drawn at full resolution.
    this.soft = document.createElement('canvas'); this.sctx = this.soft.getContext('2d');
    this.softMax = 300; this.fps = 30; this.cost = 0; this.slowFrames = 0;
    this.phase = 0; this.lastT = 0; this.lastDraw = 0;
    this.running = false; this.t0 = performance.now();
    this.frame = this.frame.bind(this);
    this.resize();
  }
  resize() {
    const r = this.cv.getBoundingClientRect();
    if (!r.width) return false;
    // Lines stay sharp at 1.5x; beyond that the extra pixels cost more than they show
    const dpr = Math.min(this.maxDpr, window.devicePixelRatio || 1);
    const w = Math.round(r.width * dpr);
    if (w !== this.cv.width || w !== this.cv.height) this.cv.width = this.cv.height = w;
    this.W = w; this.R = w / (1 + 2 * this.glow) / 2; this.dpr = dpr;
    this.sizeSoft();
    if (!this.running) this.draw(this.now(), true);
    return true;
  }
  sizeSoft() {
    const s = Math.min(this.softMax, this.W);
    if (this.soft.width !== s || this.soft.height !== s) this.soft.width = this.soft.height = s;
  }
  setPalette(pal, instant = false) {
    const cols = pal.c.map(hex);
    while (cols.length < this.nLights) cols.push(cols[cols.length % pal.c.length]);
    this.target = cols.slice(0, this.nLights); this.bgT = hex(pal.bg);
    if (!this.cols || instant) { this.cols = this.target.map(c => c.slice()); this.bg = this.bgT.slice(); }
    if (!this.running) this.draw(this.now(), true);
  }
  setLevel(v) { this.levelT = Math.max(0, Math.min(1, v)); }
  setBpm(bpm) { if (bpm && bpm !== this.bpm) this.beat0 = this.now(); this.bpm = bpm || 0; }
  setBusy(on) { this.busyT = on ? 1 : 0; }
  setPressed(on) { this.pressT = on ? 1 : 0; }
  ripple() { this.ripples.push(this.now()); }
  now() { return (performance.now() - this.t0) / 1000; }
  start() {
    if (this.still) { this.draw(this.now(), true); return; }
    if (this.running) return;
    this.running = true; this.lastT = this.now(); requestAnimationFrame(this.frame);
  }
  stop() { this.running = false; }
  frame() {
    if (!this.running) return;
    const t = this.now();
    // Slow, soft motion looks the same at 30 fps and costs half
    if (t - this.lastDraw >= 1 / this.fps - 0.004) {
      const a = performance.now();
      this.draw(t);
      this.adapt(performance.now() - a);
    }
    requestAnimationFrame(this.frame);
  }
  // Weak device? Paint the soft layer smaller and drop to 24 fps before the page starts to stutter
  adapt(ms) {
    this.cost = this.cost * 0.9 + ms * 0.1;
    if (this.cost > 9 && ++this.slowFrames > 20 && this.softMax > 160) {
      this.softMax = Math.round(this.softMax * 0.7); this.fps = 24; this.slowFrames = 0; this.cost = 5; this.sizeSoft();
      this.nRings = Math.max(7, this.nRings - 2);
    }
  }

  draw(t, force = false) {
    const { ctx, W } = this;
    if (!W || !this.cols) return;
    const dt = force ? 0 : Math.min(0.1, t - (this.lastDraw || t));
    this.lastDraw = t;
    // Ease toward targets, independent of frame rate
    const e = r => 1 - Math.pow(1 - r, dt * 60);
    const k = this.still || force ? 1 : 0;
    this.level = mix(this.level, this.levelT, k || e(this.levelT > this.level ? 0.3 : 0.07));
    this.busy = mix(this.busy, this.busyT, k || e(0.05));
    this.press = mix(this.press, this.pressT, k || e(0.3));
    const cr = k || e(0.03);
    for (let i = 0; i < this.cols.length; i++) for (let j = 0; j < 3; j++) this.cols[i][j] = mix(this.cols[i][j], this.target[i][j], cr);
    for (let j = 0; j < 3; j++) this.bg[j] = mix(this.bg[j], this.bgT[j], cr);

    const c = W / 2, L = this.level, B = this.busy;
    // Inner motion speeds up while thinking or hearing a voice. The phase is integrated, so a changing
    // speed never makes the colours jump.
    this.phase += dt * (1 + B * 2.2 + L * 1.5);
    const P = this.phase + this.seed * 10;
    const breath = this.still ? 0 : Math.sin(t * TAU / 5.5);
    let beat = 0;
    if (this.bpm && !this.still) { const ph = ((t - this.beat0) * this.bpm / 60) % 1; beat = Math.exp(-ph * 7); }
    const R = this.R * (1 + 0.018 * breath + 0.07 * L + 0.022 * beat - 0.06 * this.press);

    this.paintSoft(P, R, L, breath, beat);
    ctx.clearRect(0, 0, W, W);
    ctx.drawImage(this.soft, 0, 0, W, W);

    // Contour rings, the Melodyn signature, flowing slowly and rippling with the voice
    ctx.save();
    ctx.beginPath(); ctx.arc(c, c, R, 0, TAU); ctx.clip();
    const n = this.nRings, ox = c + Math.sin(P * 0.17) * R * 0.14, oy = c + Math.cos(P * 0.13) * R * 0.12;
    ctx.lineWidth = Math.max(1, this.dpr * 0.9);
    const seg = 56;
    for (let i = 0; i < n; i++) {
      const base = R * 1.15 * Math.pow((i + 1) / (n + 1), 1.1), amp = base * (0.06 + 0.1 * L + 0.03 * B);
      ctx.beginPath();
      for (let s2 = 0; s2 <= seg; s2++) {
        const a = s2 / seg * TAU;
        const rr = base + amp * Math.sin(a * 3 + P * 0.45 + i * 0.35) + amp * 0.5 * Math.sin(a * 5 - P * 0.3 - i * 0.25);
        const x = ox + rr * Math.cos(a), y = oy + rr * Math.sin(a);
        if (s2 === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = `rgba(255,255,255,${(0.19 - i / n * 0.11 + 0.08 * L).toFixed(3)})`;
      ctx.stroke();
    }
    ctx.restore();

    // Rim light
    const rim = ctx.createLinearGradient(c - R, c - R, c + R, c + R);
    rim.addColorStop(0, 'rgba(255,255,255,0.42)'); rim.addColorStop(0.5, 'rgba(255,255,255,0.08)'); rim.addColorStop(1, 'rgba(255,255,255,0.18)');
    ctx.strokeStyle = rim; ctx.lineWidth = Math.max(1, this.dpr * 0.75);
    ctx.beginPath(); ctx.arc(c, c, R - ctx.lineWidth / 2, 0, TAU); ctx.stroke();

    // Tap ripples
    if (this.ripples.length) {
      this.ripples = this.ripples.filter(r0 => t - r0 < 1.1);
      for (const r0 of this.ripples) {
        const p = (t - r0) / 1.1, eo = 1 - Math.pow(1 - p, 3);
        ctx.strokeStyle = `rgba(255,255,255,${(0.5 * (1 - p)).toFixed(3)})`;
        ctx.lineWidth = Math.max(1, this.dpr * 1.5 * (1 - p));
        ctx.beginPath(); ctx.arc(c, c, R * (1 + eo * 0.5), 0, TAU); ctx.stroke();
      }
    }
  }

  // Glow, colour light and shading on the small canvas, in full-size coordinates
  paintSoft(P, R, L, breath, beat) {
    const ctx = this.sctx, W = this.W, c = W / 2, f = this.soft.width / W;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.soft.width, this.soft.width);
    ctx.setTransform(f, 0, 0, f, 0, 0);

    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 3; i++) {
      const a = P * 0.13 + i * TAU / 3;
      const off = this.R * 0.1, gx = c + Math.cos(a) * off, gy = c + Math.sin(a) * off;
      // The glow must fade out before the canvas edge, or it shows a square
      const outer = Math.min(W / 2 - off - 1, R * (1.2 + this.glow * 1.4 + 0.3 * L));
      const g = ctx.createRadialGradient(gx, gy, R * 0.7, gx, gy, outer);
      g.addColorStop(0, rgba(this.cols[i], 0.13 + 0.03 * breath + 0.2 * L + 0.06 * beat));
      g.addColorStop(0.45, rgba(this.cols[i], 0.05 + 0.08 * L));
      g.addColorStop(1, rgba(this.cols[i], 0));
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, W);
    }
    ctx.globalCompositeOperation = 'source-over';

    ctx.save();
    ctx.beginPath(); ctx.arc(c, c, R, 0, TAU); ctx.clip();
    ctx.fillStyle = rgba(this.bg, 1); ctx.fillRect(c - R, c - R, 2 * R, 2 * R);
    ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < this.cols.length; i++) {
      const s = i * 1.7;
      const w1 = 0.11 + (i % 3) * 0.035, w2 = 0.09 + (i % 2) * 0.05;
      const x = c + Math.cos(P * w1 + s) * R * 0.52 + Math.sin(P * 0.05 + s * 2) * R * 0.12;
      const y = c + Math.sin(P * w2 + s * 1.3) * R * 0.5;
      const rr = R * (0.78 + 0.22 * Math.sin(P * 0.21 + s));
      const g = ctx.createRadialGradient(x, y, 0, x, y, rr);
      g.addColorStop(0, rgba(this.cols[i], 0.85));
      g.addColorStop(0.5, rgba(this.cols[i], 0.32));
      g.addColorStop(1, rgba(this.cols[i], 0));
      ctx.fillStyle = g; ctx.fillRect(c - R, c - R, 2 * R, 2 * R);
    }
    ctx.globalCompositeOperation = 'source-over';
    // 3D shading: soft key light top-left, falloff toward the edge, bounce light from below
    let g = ctx.createRadialGradient(c - R * 0.38, c - R * 0.45, 0, c - R * 0.38, c - R * 0.45, R * 0.95);
    g.addColorStop(0, 'rgba(255,255,255,0.22)'); g.addColorStop(0.35, 'rgba(255,255,255,0.06)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(c - R, c - R, 2 * R, 2 * R);
    g = ctx.createRadialGradient(c - R * 0.12, c - R * 0.15, R * 0.45, c, c, R * 1.02);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.75, 'rgba(0,0,0,0.18)'); g.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = g; ctx.fillRect(c - R, c - R, 2 * R, 2 * R);
    g = ctx.createRadialGradient(c + R * 0.2, c + R * 1.05, 0, c + R * 0.2, c + R * 1.05, R * 0.8);
    g.addColorStop(0, rgba(this.cols[0], 0.35)); g.addColorStop(1, rgba(this.cols[0], 0));
    ctx.fillStyle = g; ctx.fillRect(c - R, c - R, 2 * R, 2 * R);
    ctx.restore();
  }
}
