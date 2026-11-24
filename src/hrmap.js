// ---------------- v86 WORLD MAP (M key / phone ⋯ > Map) ----------------
// A parchment-style top-down map: terrain shaded by height with contour lines and hillshade, the Mountain Line with its
// stations and the live train, places you've discovered (undiscovered ones show as a faint "?"), your horse, buddies,
// the wanted outlaw, and you. Places are discovered by coming within 140 m; saved in localStorage.
export function createMap({ H, P, hAt, PEN }) { let el = null, cv = null, base = null, open = false, tUp = 0; const R = () => (H.WALK || 1000);
  let disc = new Set(); try { disc = new Set(JSON.parse(localStorage.getItem('hr_disc') || '[]')); } catch (_) {}
  const saveDisc = () => { try { localStorage.setItem('hr_disc', JSON.stringify([...disc])); } catch (_) {} };
  function places() { const o = [], pl = H.places || {}; const t = H.town2 && H.town2.town; if (t) o.push({ id: 'town', name: 'Town', x: t.cx, z: t.cz, ic: '🏘️' });
    o.push({ id: 'pen', name: 'Horse pen', x: PEN.x, z: PEN.z, ic: '🐎' });
    if (pl.temple) o.push({ id: 'temple', name: 'Hollow Sun', x: pl.temple.x, z: pl.temple.z, ic: '☀️' }); if (pl.cave) o.push({ id: 'cave', name: 'Bandit Cave', x: pl.cave.x, z: pl.cave.z, ic: '🕳️' });
    if (H.fallsPool) o.push({ id: 'falls', name: 'Bandit Falls', x: H.fallsPool.x ?? H.fallsPool[0], z: H.fallsPool.z ?? H.fallsPool[1], ic: '💧' });
    (pl.towers || []).forEach((q, i) => o.push({ id: 'tower' + i, name: i ? 'Gun shop tower' : 'Lookout tower', x: q.x ?? q[0], z: q.z ?? q[1], ic: '🗼' }));
    if (H.ranch && H.ranch.pos) o.push({ id: 'ranch', name: 'Your ranch', x: H.ranch.pos.x ?? H.ranch.pos[0], z: H.ranch.pos.z ?? H.ranch.pos[1], ic: '🏠', always: true });
    (H.trainStations || []).forEach((s, i) => s.plat && o.push({ id: 'st' + i, name: s.name, x: s.plat.x, z: s.plat.z, ic: '🚉' }));
    return o.filter(q => isFinite(q.x) && isFinite(q.z)); }
  function tick() { const ps = places(); let ch = false; for (const q of ps) if (!disc.has(q.id) && (q.x - P.pos.x) ** 2 + (q.z - P.pos.z) ** 2 < 140 * 140) { disc.add(q.id); ch = true; if (q.id !== 'pen' && q.id !== 'town' && H.guns) { H.guns.state.score += 75; H.guns.save && H.guns.save(); } /* v145 explorer pay */ if (q.id !== 'pen' && q.id !== 'town' && H.msg) H.msg('🗺️ Discovered: ' + q.name + '  +75 (M for the map)', 2.5); } if (ch) saveDisc();
    if (open && (tUp -= 1 / 60) <= 0) { tUp = .25; draw(); } }
  function makeBase(S) { const c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d'), N = 200, W = R(), img = x.createImageData(N, N), hs = new Float32Array(N * N); let mn = 1e9, mx = -1e9;
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const h = hAt(-W + (i + .5) / N * 2 * W, -W + (j + .5) / N * 2 * W); hs[j * N + i] = h; mn = Math.min(mn, h); mx = Math.max(mx, h); }
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const h = hs[j * N + i], t = (h - mn) / (mx - mn + 1e-6), hl = hs[j * N + Math.max(0, i - 1)], hu = hs[Math.max(0, j - 1) * N + i], shade = Math.max(-1, Math.min(1, (h - hl + h - hu) * .06));
      let r = 214 - t * 70, g = 196 - t * 82, b = 150 - t * 80; if (t > .72) { const k = (t - .72) / .28; r += (240 - r) * k; g += (238 - g) * k; b += (232 - b) * k; } // parchment lowlands, browner hills, snow caps
      const l = 1 + shade * .5, contour = Math.abs(((h - mn) / 25) % 1 - .5) < .045 ? .82 : 1, k = (j * N + i) * 4; img.data[k] = r * l * contour; img.data[k + 1] = g * l * contour; img.data[k + 2] = b * l * contour; img.data[k + 3] = 255; }
    const t2 = document.createElement('canvas'); t2.width = t2.height = N; t2.getContext('2d').putImageData(img, 0, 0); x.imageSmoothingEnabled = true; x.drawImage(t2, 0, 0, S, S);
    const gr = x.createRadialGradient(S / 2, S / 2, S * .3, S / 2, S / 2, S * .75); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(70,40,10,.45)'); x.fillStyle = gr; x.fillRect(0, 0, S, S); // aged edges
    const path = H.trainPath; if (path && path.length) { x.strokeStyle = '#3a2614'; x.lineWidth = Math.max(2, S / 260); x.setLineDash([S / 90, S / 160]); x.beginPath(); path.forEach((p, i) => { const [u, v] = toMap(p[0], p[2], S); i ? x.lineTo(u, v) : x.moveTo(u, v); }); x.closePath(); x.stroke(); x.setLineDash([]); }
    return c; }
  const toMap = (wx, wz, S) => [(wx / R() * .5 + .5) * S, (wz / R() * .5 + .5) * S];
  function build() { el = document.createElement('div'); el.id = 'hrMap'; el.hidden = true; el.innerHTML = '<div class="mp"><div class="hd"><b>🗺️ MAP OF THE TERRITORY</b><button class="x" aria-label="Close map">✕</button></div><canvas></canvas><div class="lg">You ➤ · 🐴 your horse · 🚂 train · 🧑 buddies · 📜 wanted · ? undiscovered</div></div>';
    document.body.appendChild(el); cv = el.querySelector('canvas'); const st = document.createElement('style'); st.textContent = `#hrMap{position:fixed;inset:0;z-index:70;background:rgba(10,6,2,.6);display:flex;align-items:center;justify-content:center}#hrMap[hidden]{display:none}
#hrMap .mp{background:#2a1c0e;border:2px solid #c9a050;border-radius:12px;padding:8px;box-shadow:0 10px 40px #000a;max-width:96vw;max-height:96vh;display:flex;flex-direction:column}#hrMap .hd{display:flex;align-items:center;justify-content:space-between;color:#ffd98a;font:800 14px system-ui;letter-spacing:.08em;padding:0 4px 6px}
#hrMap .x{background:#3a2412;color:#ffe9b8;border:1px solid #c79a55;border-radius:8px;min-width:40px;min-height:36px;font-size:18px;cursor:pointer}#hrMap canvas{display:block;border-radius:6px;touch-action:none}#hrMap .lg{color:#e8d6ae;font:12px system-ui;padding-top:5px;text-align:center}`; document.head.appendChild(st);
    el.addEventListener('pointerdown', e => { e.stopPropagation(); if (e.target === el || e.target.closest('.x')) close(); }); }
  function size() { const S = Math.floor(Math.min(innerWidth * .94 - 16, innerHeight * .94 - 70)); cv.width = cv.height = S * Math.min(2, devicePixelRatio || 1); cv.style.width = cv.style.height = S + 'px'; return cv.width; }
  function draw() { const S = cv.width, x = cv.getContext('2d'); if (!base || base.width !== S) base = makeBase(S); x.drawImage(base, 0, 0); const k = S / 700, f = n => Math.round(n * k) + 'px system-ui';
    const pin = (wx, wz, ic, label, dim) => { const [u, v] = toMap(wx, wz, S); x.globalAlpha = dim ? .45 : 1; x.font = f(22); x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(ic, u, v); if (label) { x.font = '700 ' + f(12); x.lineWidth = 3 * k; x.strokeStyle = 'rgba(40,24,8,.85)'; x.strokeText(label, u, v + 17 * k); x.fillStyle = '#fff3d6'; x.fillText(label, u, v + 17 * k); } x.globalAlpha = 1; };
    for (const q of places()) { const known = q.always || disc.has(q.id); if (known) pin(q.x, q.z, q.ic, q.name); else { const [u, v] = toMap(q.x, q.z, S); x.globalAlpha = .55; x.fillStyle = '#5a3a1a'; x.font = '900 ' + f(20); x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('?', u, v); x.globalAlpha = 1; } }
    if (H.train && H.train.cars && H.train.cars[0]) { const g = H.train.cars[0].g.position; pin(g.x, g.z, '🚂'); }
    if (H.wantedPos) pin(H.wantedPos[0], H.wantedPos[1], '📜', 'Wanted');
    if (H.campPos) pin(H.campPos[0], H.campPos[1], '⛺', 'Your camp'); if (H.treasurePos) pin(H.treasurePos[0], H.treasurePos[1], '❌', 'Treasure'); if (H.fishSpot) pin(H.fishSpot[0], H.fishSpot[1], '🎣', 'Fishing + gold panning'); if (H.raid && H.raid.on && H.raid.gate) pin(H.raid.gate.x, H.raid.gate.z, '🔔', 'RAID!'); // v129
    const hz = H.mounted || H.lastHorse; if (hz && hz.pos && !H.mounted) pin(hz.pos.x, hz.pos.z, '🐴', H.breed && H.breed.name ? H.breed.name : 'Your horse');
    try { for (const r of (H.netRemotes ? H.netRemotes() : [])) { const s = r.s || r; if (isFinite(s.x)) pin(s.x, s.z, '🧑', r.name || r.id); } } catch (_) {}
    { const [u, v] = toMap(P.pos.x, P.pos.z, S); x.save(); x.translate(u, v); x.rotate(-P.yaw); x.fillStyle = '#c0392b'; x.strokeStyle = '#fff'; x.lineWidth = 2.5 * k; x.beginPath(); x.moveTo(0, -14 * k); x.lineTo(9 * k, 10 * k); x.lineTo(0, 5 * k); x.lineTo(-9 * k, 10 * k); x.closePath(); x.fill(); x.stroke(); x.restore(); }
    x.font = '700 ' + f(13); x.fillStyle = '#3a2614'; x.textAlign = 'left'; x.fillText('N ▲', 12 * k, 22 * k); }
  function openM() { if (!el) build(); size(); el.hidden = false; open = true; H.uiOpen = true; if (document.pointerLockElement) document.exitPointerLock(); draw(); }
  function close() { if (!el) return; el.hidden = true; open = false; H.uiOpen = false; }
  addEventListener('keydown', e => { if (!open) return; if (e.code === 'Escape' || e.code === 'KeyM') { e.preventDefault(); e.stopImmediatePropagation(); close(); } }, true);
  addEventListener('resize', () => { if (open) { size(); base = null; draw(); } });
  return { tick, open: openM, close, toggle: () => (open ? close() : openM()), get isOpen() { return open; }, discovered: () => [...disc] }; }
