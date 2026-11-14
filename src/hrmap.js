// v43 WORLD MAP — a true top-down map of the valley (M, or the 🗺 button), drawn from the same height field the terrain uses,
// with every point of interest at its real position (Bandit Falls is pinned at the cave mouth, not the middle of the hill),
// you as an arrow pointing where the camera looks, and the other riders. North is up (-z), east is right (+x) — the same frame
// as the compass strip.
import * as THREE from 'three';
export function createMap({ H, P, camera, PEN, mobile }) {
  const W = H.WALK || 1050, N = mobile ? 160 : 220; // sample grid (one-off, drawn the first time the map opens)
  let base = null, open = false, raf = 0;
  const el = document.createElement('div'); el.id = 'hrMap'; el.hidden = true;
  el.innerHTML = '<div class="mp"><canvas></canvas><div class="mh"><b>MAP</b><span>' + (mobile ? 'tap to close' : 'M or Esc to close') + '</span></div></div><div class="lg"></div>';
  document.body.appendChild(el); const cv = el.querySelector('canvas'), lg = el.querySelector('.lg');
  for (const ev of ['pointerdown', 'mousedown', 'touchstart', 'wheel']) el.addEventListener(ev, e => e.stopPropagation());
  el.addEventListener('click', () => toggle(false));
  const st = document.createElement('style'); st.textContent = `
#hrMap{position:fixed;inset:0;z-index:70;background:rgba(4,10,30,.62);display:flex;align-items:center;justify-content:center;-webkit-backdrop-filter:blur(3px);backdrop-filter:blur(3px)}
#hrMap[hidden]{display:none}
#hrMap .mp{position:relative;flex:none;width:min(92vmin,820px);aspect-ratio:1;border:3px solid #ffe11a;border-radius:10px;box-shadow:0 10px 40px rgba(0,0,0,.6);overflow:hidden;background:#20381c}
#hrMap canvas{width:100%;height:100%;display:block}
#hrMap .mh{position:absolute;left:0;right:0;top:0;display:flex;justify-content:space-between;align-items:center;padding:6px 10px;background:linear-gradient(#0a1d55dd,#0a1d5500);color:#fff;font:700 13px system-ui}
#hrMap .mh b{font:italic 900 20px "Arial Black",system-ui;color:#ffe11a;letter-spacing:.06em}
#hrMap{gap:14px}#hrMap .lg{display:flex;flex-direction:column;gap:6px;max-width:30vw;padding:10px 12px;border-radius:10px;background:rgba(10,29,85,.85);border:2px solid #ffe11a;font:700 12px system-ui;color:#fff;text-shadow:0 1px 2px #000}
@media (max-aspect-ratio:1/1){#hrMap{flex-direction:column}#hrMap .lg{max-width:92vw;flex-direction:row;flex-wrap:wrap}}
.touch #hrMap .lg{font-size:10.5px;gap:4px;padding:7px 9px}
#mapBtn{position:fixed;z-index:31;min-width:0!important;max-width:none!important;box-sizing:border-box!important;margin:0!important;transform:none!important;letter-spacing:0!important;display:flex;align-items:center;justify-content:center;right:max(10px,env(safe-area-inset-right));top:calc(max(6px,env(safe-area-inset-top)) + 96px);width:40px!important;height:40px!important;border-radius:50%!important;border:2px solid #ffe11a!important;background:rgba(10,29,85,.75)!important;color:#fff;font-size:20px;line-height:1;padding:0!important;box-shadow:0 2px 6px rgba(0,0,0,.4)!important}
body:not(.ingame) #mapBtn,body.hr-scoped #mapBtn{display:none}
.touch #mapBtn{width:34px!important;height:34px!important;font-size:17px;top:calc(max(6px,env(safe-area-inset-top)) + 64px)}`;
  document.head.appendChild(st);
  const btn = document.createElement('button'); btn.id = 'mapBtn'; btn.title = 'Map (M)'; btn.textContent = '🗺'; document.body.appendChild(btn);
  for (const ev of ['pointerdown', 'mousedown', 'touchstart']) btn.addEventListener(ev, e => e.stopPropagation());
  btn.addEventListener('click', e => { e.preventDefault(); toggle(); });

  // the POIs, read live from the world so the map can never disagree with it
  function pois() { const pl = H.places || {}, L = [];
    L.push({ x: PEN.x, z: PEN.z, ic: '🐎', n: 'Horse pen' });
    if (pl.town) L.push({ x: pl.town[0], z: pl.town[1], ic: '🏠', n: 'Town · saloon' });
    if (H.cave && H.cave.mouth) { const m = H.cave.mouth(); L.push({ x: m[0], z: m[1], ic: '💧', n: 'Bandit Falls' }); }
    if (H.temple && H.temple.info) { const t = H.temple.info(); L.push({ x: t.x, z: t.z, ic: '☀️', n: 'Hollow Sun' }); }
    (pl.towers || []).forEach((t, i) => L.push({ x: t[0], z: t[1], ic: '🗼', n: 'Lookout ' + (i + 1) + (t[2] === 'armory' ? ' · armory' : ' · upgrades') }));
    if (H.RANGE) L.push({ x: H.RANGE.x, z: H.RANGE.z, ic: '🎯', n: 'Shooting range' });
    return L; }
  H.pois = pois;

  // baked in time slices (a few ms a frame) so building the map never stutters the game; opening it early finishes the rest at once
  let bk = null;
  function bakeStep(budget) { const hAt = H.hAt, F = H.F; if (!hAt) return false;
    if (!bk) { const c = document.createElement('canvas'); c.width = c.height = N; bk = { c, hs: new Float32Array(N * N), j: 0, k: 0, lo: 1e9, hi: -1e9, step: 2 * W / (N - 1) }; }
    const t0 = performance.now(), { hs, step } = bk;
    while (bk.j < N) { for (let i = 0; i < N; i++) { const h = hAt(-W + i * step, -W + bk.j * step); hs[bk.j * N + i] = h; if (h < bk.lo) bk.lo = h; if (h > bk.hi) bk.hi = h; } bk.j++; if (performance.now() - t0 > budget) return false; }
    if (!bk.img) { bk.x = bk.c.getContext('2d'); bk.img = bk.x.createImageData(N, N); }
    const d = bk.img.data, lo = bk.lo, hi = bk.hi;
    while (bk.k < N) { const j = bk.k++; for (let i = 0; i < N; i++) { const k = j * N + i, h = hs[k], t = (h - lo) / Math.max(1, hi - lo);
      const hx = hs[j * N + Math.min(N - 1, i + 1)] - hs[j * N + Math.max(0, i - 1)], hz = hs[Math.min(N - 1, j + 1) * N + i] - hs[Math.max(0, j - 1) * N + i];
      const shade = Math.max(.45, Math.min(1.3, 1 - (hx * .7 + hz * .7) / (step * 2) * .55)); // light from the north-west
      let r, g, b; if (t < .35) { r = 92; g = 150; b = 62; } else if (t < .6) { const u = (t - .35) / .25; r = 92 + 60 * u; g = 150 - 30 * u; b = 62 + 20 * u; } else if (t < .8) { const u = (t - .6) / .2; r = 152 - 20 * u; g = 120 - 8 * u; b = 82 + 20 * u; } else { const u = Math.min(1, (t - .8) / .12); r = 132 + 110 * u; g = 112 + 130 * u; b = 102 + 140 * u; }
      const wx = -W + i * step, wz = -W + j * step;
      if (F && F.waterDist && F.waterDist(wx, wz) < 2) { r = 60; g = 140; b = 200; }
      else if (F && F.trailDist && F.trailDist(wx, wz) < 2.5) { r = 214; g = 186; b = 130; }
      d[k * 4] = Math.min(255, r * shade); d[k * 4 + 1] = Math.min(255, g * shade); d[k * 4 + 2] = Math.min(255, b * shade); d[k * 4 + 3] = 255; }
      if (performance.now() - t0 > budget) return false; }
    bk.x.putImageData(bk.img, 0, 0); base = bk.c; return true; }
  function bake() { if (!H.hAt) return null; while (!bakeStep(1e9)) {} return base; }

  const fwd = new THREE.Vector3();
  function draw() { if (!open) return; raf = requestAnimationFrame(draw);
    const r = cv.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1), S = Math.round(r.width * dpr); if (cv.width !== S) { cv.width = cv.height = S; }
    const x = cv.getContext('2d'), k = S / (2 * W), X = wx => (wx + W) * k, Z = wz => (wz + W) * k;
    x.imageSmoothingEnabled = true; if (base) x.drawImage(base, 0, 0, S, S); else { x.fillStyle = '#2c4a26'; x.fillRect(0, 0, S, S); }
    x.strokeStyle = 'rgba(255,255,255,.12)'; x.lineWidth = 1; for (let g = -1000; g <= 1000; g += 250) { x.beginPath(); x.moveTo(X(g), 0); x.lineTo(X(g), S); x.moveTo(0, Z(g)); x.lineTo(S, Z(g)); x.stroke(); }
    const fs = Math.round(S * .036), lab = Math.round(S * .019); x.textAlign = 'center'; x.textBaseline = 'middle';
    for (const p of pois()) { const px = X(p.x), pz = Z(p.z); x.fillStyle = 'rgba(10,29,85,.85)'; x.beginPath(); x.arc(px, pz, fs * .72, 0, 7); x.fill(); x.strokeStyle = '#ffe11a'; x.lineWidth = Math.max(1.5, S * .003); x.stroke();
      x.font = fs + 'px system-ui'; x.fillText(p.ic, px, pz + fs * .04); x.font = '700 ' + lab + 'px system-ui'; x.lineWidth = 3; x.strokeStyle = 'rgba(0,0,0,.75)'; x.strokeText(p.n, px, pz + fs * 1.15); x.fillStyle = '#fff'; x.fillText(p.n, px, pz + fs * 1.15); }
    for (const rr of (H.netRemotes ? H.netRemotes() : [])) { if (!rr || !rr.s || !Number.isFinite(rr.s.x)) continue; x.fillStyle = '#58c8ff'; x.beginPath(); x.arc(X(rr.s.x), Z(rr.s.z), S * .009, 0, 7); x.fill(); }
    camera.getWorldDirection(fwd); const a = Math.atan2(fwd.x, -fwd.z), px = X(P.pos.x), pz = Z(P.pos.z), s = S * .022;
    x.save(); x.translate(px, pz); x.rotate(a); x.fillStyle = '#ff3b2f'; x.strokeStyle = '#fff'; x.lineWidth = Math.max(2, S * .004); x.beginPath(); x.moveTo(0, -s * 1.3); x.lineTo(s * .85, s); x.lineTo(0, s * .45); x.lineTo(-s * .85, s); x.closePath(); x.fill(); x.stroke(); x.restore();
    x.font = '900 ' + Math.round(S * .03) + 'px system-ui'; x.fillStyle = '#ffe11a'; x.strokeStyle = '#0a1d55'; x.lineWidth = 4; x.strokeText('N', S - S * .05, S * .1); x.fillText('N', S - S * .05, S * .1); }

  function toggle(on = !open) { open = on; el.hidden = !on; H.mapOpen = on; if (on) { if (document.pointerLockElement) document.exitPointerLock();
      if (!base) bake(); lg.innerHTML = pois().map(p => `<span>${p.ic} ${p.n} · ${Math.round(Math.hypot(p.x - P.pos.x, p.z - P.pos.z))} m</span>`).join(''); cancelAnimationFrame(raf); draw(); } else cancelAnimationFrame(raf); }
  addEventListener('keydown', e => { if (!document.body.classList.contains('ingame')) return; if (e.code === 'KeyM' && !(H.uiOpen && !open)) toggle(); else if (e.code === 'Escape' && open) toggle(false); });
  // warm the base map a few ms a frame, starting once the world is warm, so the first open is instant
  const slice = () => { if (base) return; try { if (!bakeStep(mobile ? 3 : 5)) requestAnimationFrame(slice); } catch (_) {} };
  const go = () => setTimeout(() => requestAnimationFrame(slice), 1500); if (window.__hrReady) go(); else addEventListener('hr-ready', go, { once: true });
  return { toggle, get open() { return open; }, pois };
}
