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
  constructor(canvas, { glow = 0.42, rings = 10, lights = 5, still = false } = {}) {
    this.cv = canvas; this.ctx = canvas.getContext('2d');
    this.glow = glow; this.nRings = rings; this.nLights = lights; this.still = still;
    this.level = 0; this.levelT = 0; this.bpm = 0; this.beat0 = 0; this.busy = 0; this.busyT = 0;
    this.ripples = []; this.press = 0; this.pressT = 0;
    this.cols = null; this.target = null; this.bg = [11, 18, 54]; this.bgT = this.bg;
    this.seed = Math.random() * 100;
    this.running = false; this.t0 = performance.now();
    this.frame = this.frame.bind(this);
    this.resize();
  }
  resize() {
    const r = this.cv.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (!r.width) return false;
    this.cv.width = Math.round(r.width * dpr); this.cv.height = Math.round(r.height * dpr);
    this.W = this.cv.width; this.R = this.W / (1 + 2 * this.glow) / 2; this.dpr = dpr;
    if (!this.running) this.draw(this.now());
    return true;
  }
  setPalette(pal, instant = false) {
    const cols = pal.c.map(hex);
    while (cols.length < this.nLights) cols.push(cols[cols.length % pal.c.length]);
    this.target = cols.slice(0, this.nLights); this.bgT = hex(pal.bg);
    if (!this.cols || instant) { this.cols = this.target.map(c => c.slice()); this.bg = this.bgT.slice(); }
    if (!this.running) this.draw(this.now());
  }
  setLevel(v) { this.levelT = Math.max(0, Math.min(1, v)); }
  setBpm(bpm) { if (bpm && bpm !== this.bpm) this.beat0 = this.now(); this.bpm = bpm || 0; }
  setBusy(on) { this.busyT = on ? 1 : 0; }
  setPressed(on) { this.pressT = on ? 1 : 0; }
  ripple() { this.ripples.push(this.now()); }
  now() { return (performance.now() - this.t0) / 1000; }
  start() { if (this.running || this.still) { this.draw(this.now()); return; } this.running = true; requestAnimationFrame(this.frame); }
  stop() { this.running = false; }
  frame() {
    if (!this.running) return;
    this.draw(this.now());
    requestAnimationFrame(this.frame);
  }

  draw(t) {
    const { ctx, W } = this;
    if (!W || !this.cols) return;
    // Ease every animated value toward its target
    const k = this.still ? 1 : 0.12;
    this.level = mix(this.level, this.levelT, this.levelT > this.level ? 0.35 : 0.08);
    this.busy = mix(this.busy, this.busyT, 0.05);
    this.press = mix(this.press, this.pressT, 0.3);
    for (let i = 0; i < this.cols.length; i++) for (let j = 0; j < 3; j++) this.cols[i][j] = mix(this.cols[i][j], this.target[i][j], k * 0.25);
    for (let j = 0; j < 3; j++) this.bg[j] = mix(this.bg[j], this.bgT[j], k * 0.25);

    const c = W / 2, L = this.level, B = this.busy;
    const breath = this.still ? 0 : Math.sin(t * TAU / 5.5);
    let beat = 0;
    if (this.bpm && !this.still) { const ph = ((t - this.beat0) * this.bpm / 60) % 1; beat = Math.exp(-ph * 7); }
    const R = this.R * (1 + 0.018 * breath + 0.07 * L + 0.022 * beat - 0.06 * this.press);
    const sp = 1 + B * 2.2 + L * 1.5; // inner motion speeds up while thinking or hearing a voice

    ctx.clearRect(0, 0, W, W);

    // Outer glow in the mood's colours
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 3; i++) {
      const a = t * 0.13 * sp + i * TAU / 3 + this.seed;
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

    // Sphere body
    ctx.save();
    ctx.beginPath(); ctx.arc(c, c, R, 0, TAU); ctx.clip();
    ctx.fillStyle = rgba(this.bg, 1); ctx.fillRect(c - R, c - R, 2 * R, 2 * R);
    // Drifting lights inside
    ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < this.cols.length; i++) {
      const s = this.seed + i * 1.7;
      const w1 = 0.11 + (i % 3) * 0.035, w2 = 0.09 + (i % 2) * 0.05;
      const x = c + Math.cos(t * w1 * sp + s) * R * 0.52 + Math.sin(t * 0.05 + s * 2) * R * 0.12;
      const y = c + Math.sin(t * w2 * sp + s * 1.3) * R * 0.5;
      const rr = R * (0.78 + 0.22 * Math.sin(t * 0.21 + s));
      const g = ctx.createRadialGradient(x, y, 0, x, y, rr);
      g.addColorStop(0, rgba(this.cols[i], 0.85));
      g.addColorStop(0.5, rgba(this.cols[i], 0.32));
      g.addColorStop(1, rgba(this.cols[i], 0));
      ctx.fillStyle = g; ctx.fillRect(c - R, c - R, 2 * R, 2 * R);
    }
    ctx.globalCompositeOperation = 'source-over';

    // Contour rings, the Melodyn signature, flowing slowly and rippling with the voice
    const n = this.nRings, ox = c + Math.sin(t * 0.17 + this.seed) * R * 0.14, oy = c + Math.cos(t * 0.13 + this.seed) * R * 0.12;
    ctx.lineWidth = Math.max(1, this.dpr * 0.9);
    for (let i = 0; i < n; i++) {
      const base = R * 1.15 * Math.pow((i + 1) / (n + 1), 1.1), amp = base * (0.06 + 0.1 * L + 0.03 * B);
      ctx.beginPath();
      for (let a = 0; a <= TAU + 0.01; a += TAU / 90) {
        const rr = base + amp * Math.sin(a * 3 + t * 0.45 * sp + i * 0.35) + amp * 0.5 * Math.sin(a * 5 - t * 0.3 * sp - i * 0.25);
        const x = ox + rr * Math.cos(a), y = oy + rr * Math.sin(a);
        if (a === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = `rgba(255,255,255,${(0.2 - i / n * 0.1 + 0.08 * L).toFixed(3)})`;
      ctx.stroke();
    }

    // 3D shading: soft key light top-left, falloff toward the edge
    let g = ctx.createRadialGradient(c - R * 0.38, c - R * 0.45, 0, c - R * 0.38, c - R * 0.45, R * 0.95);
    g.addColorStop(0, 'rgba(255,255,255,0.22)'); g.addColorStop(0.35, 'rgba(255,255,255,0.06)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(c - R, c - R, 2 * R, 2 * R);
    g = ctx.createRadialGradient(c - R * 0.12, c - R * 0.15, R * 0.45, c, c, R * 1.02);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.75, 'rgba(0,0,0,0.18)'); g.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = g; ctx.fillRect(c - R, c - R, 2 * R, 2 * R);
    // Bounce light from below in the mood's first colour
    g = ctx.createRadialGradient(c + R * 0.2, c + R * 1.05, 0, c + R * 0.2, c + R * 1.05, R * 0.8);
    g.addColorStop(0, rgba(this.cols[0], 0.35)); g.addColorStop(1, rgba(this.cols[0], 0));
    ctx.fillStyle = g; ctx.fillRect(c - R, c - R, 2 * R, 2 * R);
    ctx.restore();

    // Rim light
    const rim = ctx.createLinearGradient(c - R, c - R, c + R, c + R);
    rim.addColorStop(0, 'rgba(255,255,255,0.42)'); rim.addColorStop(0.5, 'rgba(255,255,255,0.08)'); rim.addColorStop(1, 'rgba(255,255,255,0.18)');
    ctx.strokeStyle = rim; ctx.lineWidth = Math.max(1, this.dpr * 0.75);
    ctx.beginPath(); ctx.arc(c, c, R - ctx.lineWidth / 2, 0, TAU); ctx.stroke();

    // Tap ripples
    this.ripples = this.ripples.filter(r0 => t - r0 < 1.1);
    for (const r0 of this.ripples) {
      const p = (t - r0) / 1.1, e = 1 - Math.pow(1 - p, 3);
      ctx.strokeStyle = `rgba(255,255,255,${(0.5 * (1 - p)).toFixed(3)})`;
      ctx.lineWidth = Math.max(1, this.dpr * 1.5 * (1 - p));
      ctx.beginPath(); ctx.arc(c, c, R * (1 + e * 0.5), 0, TAU); ctx.stroke();
    }
  }
}
