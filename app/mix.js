// Melodyn mixer: DJ-style transitions (preview clip → full song, song → next song, skip).
// Works on any BaseAudioContext, so the same code runs live and in an OfflineAudioContext for tests.

const FPS = 200; // analysis frames per second (5 ms)

// Beat analysis: low-band onset envelope, tempo near the hint, best beat phase
export function analyze(buf, bpmHint, maxSeconds = 40, fromSeconds = 0) {
  const sr = buf.sampleRate;
  const from = Math.max(0, Math.min(fromSeconds, buf.duration - 5));
  const first = Math.floor(from * sr);
  const len = Math.min(buf.length - first, Math.floor(maxSeconds * sr));
  const c0 = buf.getChannelData(0).subarray(first), c1 = buf.numberOfChannels > 1 ? buf.getChannelData(1).subarray(first) : c0;
  const hop = Math.round(sr / FPS), n = Math.floor(len / hop);
  const a = Math.exp(-2 * Math.PI * 160 / sr);
  const env = new Float32Array(n);
  let y = 0;
  for (let f = 0; f < n; f++) {
    let e = 0;
    for (let i = f * hop, end = i + hop; i < end; i++) { y = (1 - a) * (c0[i] + c1[i]) * 0.5 + a * y; e += y * y; }
    env[f] = Math.sqrt(e / hop);
  }
  const on = new Float32Array(n);
  for (let f = 1; f < n; f++) { const d = env[f] - env[f - 1]; on[f] = d > 0 ? d : 0; }

  const hint = bpmHint > 40 ? bpmHint : 100;
  let best = { score: -1, bpm: hint };
  for (let b = hint * 0.9; b <= hint * 1.1; b += 0.2) {
    const P = FPS * 60 / b;
    let s = 0, cnt = 0;
    for (let f = 0; f + 2 * P < n; f += 2) { s += on[f] * (on[Math.round(f + P)] + 0.5 * on[Math.round(f + 2 * P)]); cnt++; }
    s /= Math.max(1, cnt);
    if (s > best.score) best = { score: s, bpm: b };
  }
  const P = FPS * 60 / best.bpm;
  let phase = 0, ps = -1;
  for (let ph = 0; ph < P; ph++) {
    let s = 0;
    for (let k = ph; k < n; k += P) s += on[Math.round(k)] || 0;
    if (s > ps) { ps = s; phase = ph; }
  }
  return { bpm: best.bpm, beat: 60 / best.bpm, phase: from + phase / FPS, duration: buf.duration };
}

// Last beat of the clip at or before t
function beatAtOrBefore(a, t) { return a.phase + Math.floor((t - a.phase) / a.beat) * a.beat; }

// Decide how and where to mix. minStart: earliest clip time the transition may begin.
export function plan(clipInfo, fullInfo, minStart = 0) {
  const ratio = fullInfo.bpm / clipInfo.bpm;
  const blend = Math.abs(ratio - 1) <= 0.045;
  const end = clipInfo.duration - 0.8; // Lyria clips tend to fade in the last moment
  const fullOffset = fullInfo.phase % fullInfo.beat; // start the incoming song on its first beat
  if (blend) {
    const beats = 8;
    const ts = beatAtOrBefore(clipInfo, end - beats * clipInfo.beat);
    if (ts < minStart) return null;
    return { mode: 'blend', rate: ratio, ts, beats, beat: fullInfo.beat, fullOffset, takeover: Math.max(minStart, ts - 1.2) };
  }
  const cut = beatAtOrBefore(clipInfo, end - 0.4);
  if (cut - 2 * clipInfo.beat < minStart) return null;
  return { mode: 'echo', rate: 1, ts: cut, beat: clipInfo.beat, beatB: fullInfo.beat, fullOffset, takeover: Math.max(minStart, cut - 2 * clipInfo.beat - 1.2) };
}

// Skip pressed: short echo-out on the next beat, no build-up
export function quickPlan(fromInfo, toInfo, now) {
  const b = fromInfo.beat;
  let ts = fromInfo.phase + Math.ceil((now + 0.3 - fromInfo.phase) / b) * b;
  if (ts > fromInfo.duration - 0.2) return null;
  return { mode: 'echo', quick: true, rate: 1, ts, beat: b, beatB: toInfo.beat, fullOffset: toInfo.phase % toInfo.beat, takeover: now };
}

let noiseCache = null;
function noise(ctx) {
  if (noiseCache && noiseCache.sampleRate === ctx.sampleRate) return noiseCache;
  const b = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return (noiseCache = b);
}

// Build and schedule the transition. at: context time where clip content time aOffset plays.
// Returns what the caller needs to continue the full song on an <audio> element afterwards.
export function schedule(ctx, dest, clipBuf, fullBuf, p, at, aOffset) {
  const T = x => at + (x - aOffset) / p.rate; // clip content time -> context time
  // Soft limiter so two decks never clip
  const lim = ctx.createDynamicsCompressor();
  lim.threshold.value = -1.5; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = 0.003; lim.release.value = 0.12;
  lim.connect(dest);
  const out = ctx.createGain(); out.gain.value = 0.92; out.connect(lim);

  // Deck A: the clip
  const srcA = ctx.createBufferSource(); srcA.buffer = clipBuf; srcA.playbackRate.value = p.rate;
  const hpA = ctx.createBiquadFilter(); hpA.type = 'highpass'; hpA.frequency.value = 20; hpA.Q.value = 0.7;
  const gA = ctx.createGain(); gA.gain.value = 1;
  srcA.connect(hpA); hpA.connect(gA); gA.connect(out);
  // Echo send on deck A
  const send = ctx.createGain(); send.gain.value = 0;
  const dly = ctx.createDelay(4); dly.delayTime.value = p.mode === 'blend' ? p.beat : p.beat;
  const fb = ctx.createGain(); fb.gain.value = 0.5;
  const ehp = ctx.createBiquadFilter(); ehp.type = 'highpass'; ehp.frequency.value = 320;
  const eOut = ctx.createGain(); eOut.gain.value = 1;
  hpA.connect(send); send.connect(dly); dly.connect(ehp); ehp.connect(fb); fb.connect(dly); ehp.connect(eOut); eOut.connect(out);

  // Deck B: the full song
  const srcB = ctx.createBufferSource(); srcB.buffer = fullBuf;
  const hpB = ctx.createBiquadFilter(); hpB.type = 'highpass'; hpB.frequency.value = 20; hpB.Q.value = 0.7;
  const lpB = ctx.createBiquadFilter(); lpB.type = 'lowpass'; lpB.frequency.value = 20000; lpB.Q.value = 0.7;
  const gB = ctx.createGain(); gB.gain.value = 0;
  srcB.connect(hpB); hpB.connect(lpB); lpB.connect(gB); gB.connect(out);

  srcA.start(at, aOffset);
  let bStart, doneAt;
  if (p.mode === 'blend') {
    const t0 = T(p.ts), b = p.beat, swap = t0 + 4 * b, end = t0 + p.beats * b;
    bStart = t0;
    // Incoming: bass cut, rises over four beats, bass swap on beat 5
    hpB.frequency.setValueAtTime(380, at);
    gB.gain.setValueAtTime(0.0001, t0);
    gB.gain.linearRampToValueAtTime(0.8, swap);
    hpB.frequency.setValueAtTime(380, swap - 0.02);
    hpB.frequency.exponentialRampToValueAtTime(20, swap + 0.06);
    gB.gain.linearRampToValueAtTime(1, end);
    // Outgoing: loses its bass on the swap, filter sweeps up, echo on the last two beats
    hpA.frequency.setValueAtTime(20, swap - 0.02);
    hpA.frequency.exponentialRampToValueAtTime(420, swap + 0.06);
    hpA.frequency.exponentialRampToValueAtTime(2600, end);
    gA.gain.setValueAtTime(1, swap);
    gA.gain.linearRampToValueAtTime(0.0001, end);
    send.gain.setValueAtTime(0, end - 2 * b);
    send.gain.linearRampToValueAtTime(0.55, end - b);
    send.gain.setValueAtTime(0, end);
    eOut.gain.setValueAtTime(0.75, end);
    eOut.gain.linearRampToValueAtTime(0.0001, end + 4 * b);
    srcA.stop(end + 0.1);
    doneAt = end + 4 * b;
  } else {
    const tc = T(p.ts), b = p.beat;
    // Riser over the last two beats (not when the listener skipped)
    if (!p.quick) {
    const nz = ctx.createBufferSource(); nz.buffer = noise(ctx); nz.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.2; bp.frequency.value = 500;
    const gR = ctx.createGain(); gR.gain.value = 0;
    nz.connect(bp); bp.connect(gR); gR.connect(out);
    gR.gain.setValueAtTime(0.0001, tc - 2 * b);
    gR.gain.exponentialRampToValueAtTime(0.07, tc);
    gR.gain.exponentialRampToValueAtTime(0.0001, tc + 0.35);
    bp.frequency.setValueAtTime(500, tc - 2 * b);
    bp.frequency.exponentialRampToValueAtTime(7000, tc);
    nz.start(tc - 2 * b); nz.stop(tc + 0.4);
    }
    // Echo out: last beat into the delay, dry cut on the beat, echoes ring on
    hpA.frequency.setValueAtTime(20, tc - b);
    hpA.frequency.exponentialRampToValueAtTime(700, tc);
    send.gain.setValueAtTime(0, tc - b);
    send.gain.linearRampToValueAtTime(1, tc - b + 0.03);
    send.gain.setValueAtTime(1, tc);
    send.gain.linearRampToValueAtTime(0, tc + 0.03);
    gA.gain.setValueAtTime(1, tc - 0.02);
    gA.gain.linearRampToValueAtTime(0.0001, tc + 0.02);
    fb.gain.setValueAtTime(0.6, tc);
    eOut.gain.setValueAtTime(1, tc + b);
    eOut.gain.linearRampToValueAtTime(0.0001, tc + 5 * b);
    srcA.stop(tc + 0.1);
    // Incoming drops one beat later, under the echoes, opening from muffled to clear
    const bb = p.beatB || b;
    bStart = tc + b;
    lpB.frequency.setValueAtTime(260, bStart);
    lpB.frequency.exponentialRampToValueAtTime(18000, bStart + 6 * bb);
    gB.gain.setValueAtTime(0.0001, bStart);
    gB.gain.exponentialRampToValueAtTime(1, bStart + 0.4);
    doneAt = bStart + 6 * bb;
  }
  srcB.start(bStart, p.fullOffset);
  return {
    bStart, bOffset: p.fullOffset, doneAt, gainB: gB, srcB, srcA, out,
    fullPos: t => p.fullOffset + Math.max(0, t - bStart),
    stop(t = ctx.currentTime) { try { out.gain.setValueAtTime(out.gain.value, t); out.gain.linearRampToValueAtTime(0.0001, t + 0.05); srcA.stop(t + 0.06); srcB.stop(t + 0.06); } catch { /* already stopped */ } },
  };
}
