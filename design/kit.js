// Melodyn design kit: icon sprite, status bar, generated auras.
(function () {
  const SPRITE = `<svg width="0" height="0" style="position:absolute">
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
  <symbol id="queue" viewBox="0 0 24 24"><path d="M4 6.5h16M4 12h16M4 17.5h9"/></symbol>
  <symbol id="airplay" viewBox="0 0 24 24"><path d="M6.5 17H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-1.5"/><path d="M12 14.5l4.5 5.5h-9z" fill="currentColor" stroke="none"/></symbol>
  <symbol id="flash" viewBox="0 0 24 24"><path d="M8.5 3h7l-1 5h-5zM9.5 8h5v12.5a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1z"/></symbol>
  <symbol id="cam" viewBox="0 0 24 24"><path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2.3l1.4-2h5.6l1.4 2h2.3A1.5 1.5 0 0 1 20 8.5v9A1.5 1.5 0 0 1 18.5 19h-13A1.5 1.5 0 0 1 4 17.5z"/><circle cx="12" cy="12.5" r="3.3"/></symbol>
  <symbol id="car" viewBox="0 0 24 24"><path d="M5 16.5V12l1.8-4.6A2 2 0 0 1 8.7 6h6.6a2 2 0 0 1 1.9 1.4L19 12v4.5M5 12h14M5 16.5h14v2a1 1 0 0 1-1 1h-1.5a1 1 0 0 1-1-1v-2M8.5 16.5v2a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-2"/><circle cx="8" cy="14.2" r=".6" fill="currentColor"/><circle cx="16" cy="14.2" r=".6" fill="currentColor"/></symbol>
  <symbol id="logo" viewBox="0 0 32 32"><path d="M4 18.5c2.2 0 2.6-7 4.8-7s2.6 11 4.8 11 2.6-15 4.8-15 2.6 15 4.8 15 2.6-7.5 4.8-7.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></symbol>
</svg>`;
  document.body.insertAdjacentHTML('afterbegin', SPRITE);

  const SB_ICONS = `<span class="icons">
    <svg width="18" height="12" viewBox="0 0 18 12" fill="currentColor"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5.5" width="3" height="6.5" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg>
    <svg width="16" height="12" viewBox="0 0 16 12" fill="currentColor"><path d="M8 2.4c2.3 0 4.4.9 6 2.4l1.1-1.2A10.2 10.2 0 0 0 8 .8 10.2 10.2 0 0 0 .9 3.6L2 4.8a8.6 8.6 0 0 1 6-2.4zm0 3.3c1.4 0 2.7.5 3.7 1.4l1.1-1.2A7 7 0 0 0 8 4.1a7 7 0 0 0-4.8 1.8l1.1 1.2c1-.9 2.3-1.4 3.7-1.4zm0 3.3c.6 0 1.1.2 1.5.6L8 11.2 6.5 9.6c.4-.4.9-.6 1.5-.6z"/></svg>
    <svg width="27" height="13" viewBox="0 0 27 13"><rect x=".5" y=".5" width="23" height="12" rx="3.8" fill="none" stroke="currentColor" opacity=".4"/><rect x="2" y="2" width="17" height="9" rx="2.4" fill="currentColor"/><path d="M25 4.5v4c.8-.3 1.3-1.1 1.3-2s-.5-1.7-1.3-2z" fill="currentColor" opacity=".45"/></svg>
  </span>`;
  document.querySelectorAll('.sb').forEach(el => {
    el.innerHTML = `<span>${el.dataset.time || '21:47'}</span><div class="island"></div>${SB_ICONS}`;
  });

  const PALETTES = {
    night:   { bg: '#0b1236', c: ['#ff7a2f', '#e23d6d', '#2a47b8', '#0f6f8f', '#ffb56b', '#3b1f7a'] },
    tunnel:  { bg: '#0a0f2a', c: ['#ff9a3d', '#1d3fb0', '#c2366b', '#0a5f80', '#ffd08a'] },
    kitchen: { bg: '#3a1408', c: ['#ffb23f', '#e8472b', '#7a8f2e', '#ff8a5b', '#f6d38a'] },
    focus:   { bg: '#0f2a2a', c: ['#8fc7b5', '#3f7f74', '#d7e6df', '#4e6e9e', '#a9c9d6'] },
    dusk:    { bg: '#120f2e', c: ['#6d5bd0', '#e79bb5', '#2c3a8c', '#b06ab3', '#f2c4ce'] },
    run:     { bg: '#1a0630', c: ['#ff3d71', '#5b2eff', '#00b3ff', '#ff8a00', '#c23bff'] },
    morning: { bg: '#2b2210', c: ['#ffd36b', '#ff9e7a', '#9fd3e6', '#f7efd8', '#e8b04b'] },
    rain:    { bg: '#101a24', c: ['#6f8fa8', '#c6d3dc', '#3d5a73', '#9bb3a6', '#e2e8ec'] },
    self:    { bg: '#0d0f2a', c: ['#ff7a2f', '#ffb23f', '#2a47b8', '#e23d6d', '#8fc7b5', '#6d5bd0'] },
  };
  function rng(seed) {
    let a = 0;
    for (const ch of String(seed)) a = (Math.imul(a ^ ch.charCodeAt(0), 2654435761) >>> 0);
    return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function build(el) {
    const p = PALETTES[el.dataset.p] || PALETTES.night;
    const r = rng((el.dataset.p || '') + (el.dataset.seed || '1'));
    const W = el.clientWidth, H = el.clientHeight, M = Math.max(W, H);
    const blur = parseFloat(el.dataset.blur || '0.16');
    el.style.background = p.bg;
    const count = parseInt(el.dataset.n || Math.min(4, p.c.length), 10);
    for (let k = 0; k < count; k++) {
      const i = document.createElement('i');
      const s = M * (0.5 + r() * 0.5);
      const x = r() * W - s / 2, y = r() * H - s / 2;
      i.style.cssText = `width:${s}px;height:${s}px;left:${x}px;top:${y}px;background:${p.c[k % p.c.length]};filter:blur(${M * blur}px);opacity:${0.75 + r() * 0.25}`;
      el.appendChild(i);
    }
  }
  // Contour rings: the "always evolving" signature drawn over an aura
  function rings(el) {
    const r = rng('rings' + (el.dataset.p || '') + (el.dataset.seed || '1'));
    const W = el.clientWidth, H = el.clientHeight, d = 3;
    const cv = document.createElement('canvas');
    cv.width = W * d; cv.height = H * d;
    cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;z-index:1';
    const c = cv.getContext('2d');
    c.scale(d, d);
    const cx = W * (0.3 + r() * 0.4), cy = H * (0.3 + r() * 0.4);
    const n = parseInt(el.dataset.lines, 10) || 14;
    const maxR = Math.hypot(W, H) * 0.62;
    const f1 = 2 + Math.floor(r() * 3), f2 = 4 + Math.floor(r() * 4), p1 = r() * 6.28, p2 = r() * 6.28;
    const alpha = parseFloat(el.dataset.la || '0.22');
    c.lineWidth = Math.max(0.6, W / 420);
    for (let i = 0; i < n; i++) {
      const base = maxR * Math.pow((i + 1) / (n + 1), 1.15);
      const amp = base * 0.07;
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
    el.appendChild(cv);
  }
  window.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.aura').forEach(build);
    document.querySelectorAll('.aura[data-lines]').forEach(rings);
    document.documentElement.dataset.ready = '1';
  });
})();
