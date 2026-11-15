// Voxel Raid · HORSE RIDER (v31): the link opens straight into Horse Rider (auto shared lobby, voice, guns, zombies, rideable
// mountains). The old voxel raid / zombies modes and their menu were removed in v31; they live on in git history (<= v30).
import './src/assetshim.js?v=45b';
import { PERF, PERF_ITEMS, setPerf } from './src/perfopts.js?v=45b';
import './src/hraudio.js?v=45b';
import './src/stylize.js?v=45b'; // v40 stylized art pipeline (patches shader chunks before any material compiles)
import { createGraphics, loadPBR, pickQuality, IS_TOUCH } from './src/gfx.js?v=45b';
import { FX, SFX } from './src/fx.js?v=45b';
import { initTouch } from './src/touch.js?v=45b';
import { createHorseRider } from './src/horse.js?v=45b';
import { createHorseNet } from './src/horsenet.js?v=45b';
import * as THREE from 'three';
import { PF, initPerf } from './src/perf.js?v=45b';
const $ = id => document.getElementById(id);
const Q = new URLSearchParams(location.search);
if (IS_TOUCH) document.body.classList.add('touch');
// ---------------- Graphics ----------------
const QNAME = pickQuality();
let GX; try { GX = createGraphics(QNAME); } catch (e) { window.__bootFail && window.__bootFail('gpu', e); throw e; } // v36: no black page
const { renderer, scene, camera } = GX;
const PBRS = loadPBR(renderer, QNAME == 'high' || QNAME == 'ultra');
const sfx = new SFX();
const G = { mode: 'horse', phase: 'menu', t: 0, over: false };
const P = { pos: new THREE.Vector3(), vel: new THREE.Vector3(), yaw: 0, pitch: 0, hp: 100, dead: 0, onGround: false, spawn: new THREE.Vector3(), recoil: 0, bob: 0 };
const fx = new FX(scene, camera, renderer, GX.Q, () => false); fx.setScale(); addEventListener('resize', () => fx.setScale());
let msgT = 0; function msg(s, t = 2) { $('msg').textContent = s; msgT = t; }
// ---------------- Input ----------------
const keys = {};
addEventListener('keydown', e => { sfx.init(); keys[e.code] = true; onKey(e.code); }); addEventListener('keyup', e => keys[e.code] = false);
// v34: never 'stuck running': drop every held key / stick when the page loses focus, is hidden or paged out
// v36: the one reset path: keys, stick, look ownership, every touch button, fire/jump/use/ADS, queued shots / reloads / aim, pending scoped look
window.__inputResets = window.__inputResets || [];
const dropInput = () => { for (const k in keys) keys[k] = false; input.mx = input.mz = 0; input.fire = input.jump = input.use = input.ads = false; P.lookPend = null; window.__touchReset && window.__touchReset(); for (const f of window.__inputResets) { try { f(); } catch (_) {} } window.__inputDrops = (window.__inputDrops || 0) + 1; };
addEventListener('blur', dropInput); addEventListener('pagehide', dropInput); document.addEventListener('visibilitychange', () => { if (document.hidden) dropInput(); }); window.__dropInput = dropInput;
const locked = () => document.pointerLockElement === renderer.domElement;
const lookSens = () => { try { return (+localStorage.getItem('hr_sens') || 100) / 100; } catch (_) { return 1; } }; window.__lookSens = lookSens;
document.addEventListener('mousemove', e => { if (!locked()) return; const k = lookSens(); look(e.movementX * .0022 * k, e.movementY * .0022 * k); });
function look(dx, dy, src) { const ls = P.lookScale || 1; dx *= ls; dy *= ls; P.swX = (P.swX || 0) + dx; P.swY = (P.swY || 0) + dy;
  if (src === 'touch' && P.lookSmooth) { const q = P.lookPend || (P.lookPend = { x: 0, y: 0 }); q.x += dx; q.y += dy; return; } // in the rifle scope a finger's look is low-pass filtered (drained per frame by hrguns)
  P.yaw -= dx; P.pitch = Math.max(-1.553, Math.min(1.553, P.pitch - dy)); }
renderer.domElement.addEventListener('mousedown', () => { gesture(); if (!IS_TOUCH && !locked()) renderer.domElement.requestPointerLock(); });
addEventListener('contextmenu', e => e.preventDefault());
const input = { mx: 0, mz: 0, fire: false, jump: false, ads: false };
const act = { settings: () => openSettings(true), build: () => horse.use(), ads() { input.ads = !input.ads; }, help() { const k = $('keys'); k.hidden = !k.hidden; },
  fs() { if (document.fullscreenElement || document.webkitFullscreenElement) (document.exitFullscreen || document.webkitExitFullscreen).call(document); else goFullscreen(); } };
function onKey(c) { if (G.phase == 'menu') return; if (c == 'KeyO') openSettings($('hrSettings').hidden); if (c == 'KeyE') horse.use(); if (c == 'KeyZ' && horse.state.whistle) horse.state.whistle(); if (c == 'KeyH') act.help(); if (c == 'KeyV') hnet.voice.toggle(); }
// first tap / click / key: unlock audio, re-ask for the mic if it was refused without a gesture, phones go fullscreen
let gestured = false; function gesture() { sfx.init(); if (gestured) return; gestured = true; hnet.prime(); if (IS_TOUCH) goFullscreen(); }
addEventListener('pointerdown', gesture, true); addEventListener('keydown', gesture, true);
if (IS_TOUCH) initTouch(input, look, act, gesture);
// ---------------- Horse Rider ----------------
const horse = createHorseRider({ scene, GX, P, keys, input, camera, sfx, fx, msg, PBRS, mobile: IS_TOUCH });
const hnet = createHorseNet({ horse, P, msg });
initPerf({ renderer, GX, H: horse.state, Q, qname: QNAME }); // v36 ?perf=1 measured overlay
function update(dt) { if (G.phase == 'menu') return; G.t += dt; horse.tick(dt); PF.s('net'); hnet.tick(dt); PF.e('net'); if (msgT > 0) { msgT -= dt; if (msgT <= 0) $('msg').textContent = ''; } }
// ---------------- HUD ----------------
let hudT = 0, hurtFlash = 0;
const CMP = (() => { let h = ''; for (let d = -360; d <= 720; d += 15) { const n = ((d % 360) + 360) % 360; const lab = { 0: 'N', 45: 'NE', 90: 'E', 135: 'SE', 180: 'S', 225: 'SW', 270: 'W', 315: 'NW' }[n]; h += `<span class="${lab ? 'c' : ''}">${lab || n}</span>`; } return h; })();
const PINS = [['pen', 'PEN', '#ffb35a'], ['town', 'TOWN', '#ff6a5a'], ['cave', 'FALLS', '#4fd2ff'], ['temple', 'TEMPLE', '#ffe11a'], ['job', '★ JOB', '#ffd700']];
function pins(hd) { const box = $('cpins'); if (!box || !horse.state.places) return; const H = horse.state, pl = H.places, w = (box.parentNode.clientWidth || 300) / 2 - 34;
  if (!box.dataset.on) { box.dataset.on = 1; box.innerHTML = PINS.map(([k, lab, col]) => `<i data-k="${k}" style="--c:${col}"><u></u><em>${lab}</em> <b></b></i>`).join(''); }
  const sideN = { l: 0, r: 0 }, bt = H.bountyTarget; let onPoi = null; if (bt) for (const [k] of PINS) { if (k === 'job') continue; const q = k === 'pen' ? [horse.PEN.x, horse.PEN.z] : k === 'town' ? pl.town : pl[k] ? [pl[k].x, pl[k].z] : null; if (q && Math.hypot(q[0] - bt[0], q[1] - bt[1]) < 40) onPoi = k; }
  const vis = []; for (const el of box.children) { const k = el.dataset.k; el.classList.toggle('jobOn', k === onPoi); if (k === 'job' && onPoi) { el.style.display = 'none'; continue; } const t = k === 'job' ? H.bountyTarget : k === 'pen' ? [horse.PEN.x, horse.PEN.z] : k === 'town' ? pl.town : pl[k] ? [pl[k].x, pl[k].z] : null; if (!t) { el.style.display = 'none'; continue; }
    const dx = t[0] - P.pos.x, dz = t[1] - P.pos.z, d = Math.hypot(dx, dz), b = Math.atan2(dx, -dz) * 180 / Math.PI, dl = ((b - hd) % 360 + 540) % 360 - 180; let x = dl / 15 * 40, edge = '';
    if (d < 20) { el.style.display = 'none'; continue; } if (x > w) { x = w; edge = '▶'; } else if (x < -w) { x = -w; edge = '◀'; }
    el.style.display = ''; vis.push({ el, x, edge }); el.style.opacity = edge ? .7 : 1; el.lastChild.textContent = (edge === '◀' ? '◀ ' : '') + (d > 999 ? (d / 1000).toFixed(1) + 'km' : Math.round(d) + 'm') + (edge === '▶' ? ' ▶' : ''); }
  // v45: chips that point the same way are nudged apart instead of printing on top of each other
  const all = vis.sort((a, b) => a.x - b.x); for (const v of all) v.w = (v.el.offsetWidth || 80) + 4; // v45: spaced by their real widths, both ways, inside the strip
  for (let i = 1; i < all.length; i++) { const g = (all[i - 1].w + all[i].w) / 2; if (all[i].x - all[i - 1].x < g) all[i].x = all[i - 1].x + g; }
  if (all.length && all[0].x < -(w + 32) + all[0].w / 2) { all[0].x = -(w + 32) + all[0].w / 2; for (let i = 1; i < all.length; i++) { const g = (all[i - 1].w + all[i].w) / 2; if (all[i].x - all[i - 1].x < g) all[i].x = all[i - 1].x + g; } }
  const lim = all.length ? w + 32 - all[all.length - 1].w / 2 : 0; if (all.length && all[all.length - 1].x > lim) { all[all.length - 1].x = lim; for (let i = all.length - 2; i >= 0; i--) { const g = (all[i + 1].w + all[i].w) / 2; if (all[i + 1].x - all[i].x < g) all[i].x = all[i + 1].x - g; } }
  for (const v of vis) v.el.style.transform = `translateX(${v.x.toFixed(0)}px) translateX(-50%)`; }
function compass() { const el = $('cstrip'); if (!el) return; if (!el.innerHTML) el.innerHTML = CMP; const hd = ((-P.yaw * 180 / Math.PI) % 360 + 360) % 360; el.style.transform = `translateX(${-(hd + 360) / 15 * 40 - 20}px)`; $('chead').textContent = Math.round(hd); pins(hd); }
function hud(dt) { compass(); hurtFlash = Math.max(0, hurtFlash - dt * 1.5); $('vign').style.opacity = hurtFlash;
  hudT -= dt; if (hudT > 0) return; hudT = .1; uiSync(); horse.hud(); }
function uiSync() { if (!IS_TOUCH) return; const a = $('tAct'), lab = horse.touchLabel(); a.hidden = !lab; if (lab && a.innerHTML !== lab) a.innerHTML = lab; }
// ---------------- Screen ----------------
function goFullscreen() { const e = document.documentElement; const rq = e.requestFullscreen || e.webkitRequestFullscreen || e.webkitRequestFullScreen || e.mozRequestFullScreen || e.msRequestFullscreen;
  if (!rq || document.fullscreenElement || document.webkitFullscreenElement) return; try { const r = rq.call(e, { navigationUI: 'hide' }); r && r.then && r.then(() => screen.orientation?.lock?.('landscape').catch(() => {})).catch(() => {}); } catch (_) {} }
// orientation: robust across old phones (window.orientation, matchMedia, size compare), never blocks forever
let rotSkipped = false;
function isLandscape() { const vv = window.visualViewport; const w = vv ? vv.width : innerWidth, h = vv ? vv.height : innerHeight;
  if (Math.abs(w - h) > 40) return w > h; if (typeof window.orientation === 'number') return Math.abs(window.orientation) === 90;
  if (screen.orientation && screen.orientation.type) return screen.orientation.type.startsWith('landscape'); return matchMedia('(orientation: landscape)').matches; }
function checkRot() { $('rot').classList.toggle('show', IS_TOUCH && !rotSkipped && !isLandscape()); }
const recheck = () => { checkRot(); setTimeout(checkRot, 250); setTimeout(checkRot, 800); GX.resize(); fx.setScale(); };
addEventListener('resize', recheck); addEventListener('orientationchange', recheck); window.visualViewport?.addEventListener('resize', recheck); screen.orientation?.addEventListener?.('change', recheck);
$('rotskip').onclick = () => { rotSkipped = true; checkRot(); }; setTimeout(() => { if ($('rot').classList.contains('show')) $('rotskip').textContent = 'Play anyway (portrait)'; }, 4000); checkRot();
const isIOS = /iP(hone|od|ad)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const standalone = navigator.standalone || matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches;
if (isIOS && !standalone && !document.documentElement.requestFullscreen && !localStorage.getItem('vr_ioshint')) $('ioshint').classList.add('show');
$('ioshintx').onclick = () => { localStorage.setItem('vr_ioshint', '1'); $('ioshint').classList.remove('show'); };
$('vMute').onclick = e => { e.preventDefault(); hnet.voice.toggle(); };
$('vMute').addEventListener('pointerdown', e => e.stopPropagation());
$('fps').hidden = !(localStorage.getItem('vr_fps') === '1' || Q.get('fps') === '1');
const KEYS = IS_TOUCH ? 'CONTROLS\nLeft side: move / steer · right side: look\nRIDE / GET OFF appears near a horse · 🔫 draws a gun, FIRE shoots, ADS aims\n⋯ menu: controls, fullscreen\nTap here to close'
  : 'CONTROLS\nWASD walk / ride · mouse look · E mount / dismount · Shift faster (hold: gallop) · C slower\nF draw / cycle guns · LMB fire · RMB aim · wheel zoom · V mute voice · H this help · Esc release mouse';
$('keys').textContent = KEYS; $('keys').onclick = () => { $('keys').hidden = true; };
if (!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen)) $('mFs').style.display = 'none';
// ---------------- v36 settings: field of view (desktop ⚙ / O, phones ⋯ > Settings) ----------------
// v42: developer MAX CHAOS button (shown only on a device unlocked with the bank code)
function devChaosBtn() { let on = false; try { on = localStorage.getItem('hr_dev') === '1'; } catch (_) {} if (!on || document.getElementById('devChaos')) return;
  const b = document.createElement('button'); b.id = 'devChaos'; b.textContent = '☠ MAX CHAOS'; b.style.cssText = 'position:fixed;left:10px;top:150px;z-index:41;padding:6px 10px;font:900 italic 13px system-ui;color:#fff;background:linear-gradient(180deg,#e0302a,#8a0f0b);border:0;border-radius:6px;box-shadow:0 3px 0 #4a0806;letter-spacing:.04em;pointer-events:auto';
  const sync = () => { const Zs = horse.state.zombies; const m = !!(Zs && Zs.maxChaos); b.textContent = m ? '☠ CHAOS: MAX (tap to stop)' : '☠ MAX CHAOS'; b.style.filter = m ? 'brightness(1.25)' : ''; };
  b.onclick = e => { e.stopPropagation(); const Zs = horse.state.zombies; if (!Zs || !Zs.setMaxChaos) { msg('Zombies are off in this game', 2); return; } if (horse.state.netRole && horse.state.netRole() === 'client') { msg('Only the host can start chaos', 2); return; }
    Zs.setMaxChaos(!Zs.maxChaos); sync(); syncChaos(); msg(Zs.maxChaos ? '☠ MAX CHAOS — the horde is coming' : 'Chaos stopped', 2.5); };
  ['pointerdown', 'touchstart'].forEach(ev => b.addEventListener(ev, e => e.stopPropagation(), { passive: true })); document.body.appendChild(b); sync(); }
function chaosToMenu() { const b = $('devChaos'), m = $('uiMore'); if (!IS_TOUCH || !b || !m || $('mChaos')) return; b.style.setProperty('display', 'none', 'important'); // v45: on phones MAX CHAOS lives in the ⋯ menu
  const mb = document.createElement('button'); mb.id = 'mChaos'; mb.style.color = '#ffb3a8'; const lab = () => { const Z = horse.state.zombies; mb.textContent = Z && Z.maxChaos ? '☠ Stop chaos' : '☠ Max Chaos'; }; lab(); mb.onclick = e => { b.click(); lab(); }; m.insertBefore(mb, m.lastChild); }
addEventListener('hr-dev', () => setTimeout(chaosToMenu, 50)); setTimeout(chaosToMenu, 1600);
addEventListener('hr-dev', devChaosBtn); setTimeout(devChaosBtn, 1500);
function syncChaos() { const Zs = horse.state.zombies, b = $('chaosBtn'); if (!Zs || !b) return; const cl = !!(horse.state.netRole && horse.state.netRole() === 'client'), on = cl ? Zs.chaos : Zs.wantChaos;
  b.textContent = '☠ Chaos mode: ' + (on ? 'ON' : 'OFF') + (cl ? ' (host decides)' : ''); b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.disabled = cl; }
function openSettings(on) { const el = $('hrSettings'); el.hidden = !on; const H = horse.state; H.uiOpen = on ? true : !!(H.town2 && H.town2.ui) || !!(H.saloon && H.saloon.isOpen() && !H.seated); if (on) { if (document.pointerLockElement) document.exitPointerLock(); syncFov(); syncChaos(); } }
// v42 settings extras: look speed, volume, graphics quality, controls list
function setupSettingsX() { const st = (k, v) => { try { localStorage.setItem(k, v); } catch (_) {} }, gt = (k, d) => { try { return localStorage.getItem(k) ?? d; } catch (_) { return d; } };
  const sr = $('sensRange'), vr = $('volRange'); if (!sr || sr.dataset.on) return; sr.dataset.on = 1;
  const syncS = () => { sr.value = gt('hr_sens', 100); $('sensVal').textContent = sr.value + '%'; }; sr.oninput = () => { st('hr_sens', sr.value); syncS(); }; syncS();
  const syncV = () => { const v = +gt('hr_vol', 50); vr.value = v; $('volVal').textContent = v + '%'; sfx.vol = v / 100; if (sfx.master) sfx.master.gain.value = sfx.vol; }; vr.oninput = () => { st('hr_vol', vr.value); syncV(); }; syncV();
  { const pl = $('perfList'); if (pl) for (const [k, label] of PERF_ITEMS) { const b = document.createElement('button'); b.className = 'tog'; b.setAttribute('aria-pressed', PERF[k]); b.textContent = label + ': ' + (PERF[k] ? 'ON' : 'OFF'); b.onclick = () => { setPerf(k, !PERF[k]); location.reload(); }; pl.appendChild(b); } } // v42u
  { const gb = $('grassBtn'), on = gt('hr_grass', '0') === '1'; gb.textContent = '🌿 Grass blades: ' + (on ? 'ON' : 'OFF'); gb.setAttribute('aria-pressed', on); gb.onclick = () => { st('hr_grass', on ? '0' : '1'); location.reload(); }; }
  const cur = gt('vr_quality', 'auto'); for (const b of $('qSeg').children) { b.classList.toggle('on', b.dataset.q === cur); b.onclick = () => { if (b.dataset.q === gt('vr_quality', 'auto')) return; st('vr_quality', b.dataset.q); const u = new URL(location.href); u.searchParams.delete('q'); location.href = u.toString(); }; }
  const touch = matchMedia('(pointer: coarse)').matches, rows = touch ? [['Left thumb', 'move / steer'], ['Right thumb', 'look around'], ['RIDE / USE', 'mount a horse, talk, buy'], ['DRAW', 'take out a gun'], ['FIRE / AIM', 'shoot / zoom'], ['Gun swap', 'cycles guns, then 🧨 dynamite (hold FIRE to aim, let go to throw)'], ['JUMP', 'jump'], ['⋯', 'more: settings, fullscreen']]
    : [['W A S D', 'move / steer'], ['Mouse', 'look'], ['Shift', 'gallop / run'], ['E', 'mount, use, buy'], ['F / 1–6', 'draw a gun / pick one'], ['Click / Right-click', 'shoot / aim'], ['R', 'reload'], ['7', 'dynamite: hold click to aim, release to throw'], ['Space', 'jump'], ['O', 'settings']];
  $('ctlList').innerHTML = rows.map(([k, v]) => `<b>${k}</b><span>${v}</span>`).join(''); }
setTimeout(() => { try { const v = +(localStorage.getItem('hr_vol') ?? 50); sfx.vol = v / 100; if (sfx.master) sfx.master.gain.value = sfx.vol; } catch (_) {} }, 0);
function syncFov() { setupSettingsX(); const v = horse.state.fovH; $('fovRange').value = v; $('fovVal').textContent = v + '°'; syncChar(); }
function syncChar() { const H = horse.state, row = $('charRow'); if (!row || !H.characters) return; if (row.children.length !== H.characters.length) { row.innerHTML = ''; H.characters.forEach((n, i) => { const b = document.createElement('button'); b.textContent = i ? n.split(' ')[0] : 'Classic'; b.title = n; b.dataset.cv = i; b.onclick = () => { H.setCharacter(i); syncChar(); }; row.appendChild(b); }); } for (const b of row.children) b.classList.toggle('on', +b.dataset.cv === (H.cv | 0)); } // v36 character picker (saved; sent to the lobby)
{ const el = $('hrSettings'), r = $('fovRange'), stop = e => e.stopPropagation(); document.body.appendChild(el); document.body.appendChild($('setBtn')); // own stacking context: above the touch look layer
  for (const ev of ['pointerdown', 'mousedown', 'touchstart', 'click', 'wheel']) { el.addEventListener(ev, stop); $('setBtn').addEventListener(ev, stop); }
  r.addEventListener('input', () => { horse.state.setFov(r.value); syncFov(); });
  $('fovReset').onclick = () => { horse.state.setFov(70); syncFov(); }; $('chaosBtn').onclick = () => { const Zs = horse.state.zombies; if (!Zs || !Zs.setChaos || (horse.state.netRole && horse.state.netRole() === 'client')) return; Zs.setChaos(!Zs.wantChaos); syncChaos(); }; $('setClose').onclick = () => openSettings(false); $('setBtn').onclick = () => openSettings($('hrSettings').hidden); syncFov(); }
// ---------------- Start: the link opens straight into Horse Rider (joins an open room with a free slot, else hosts one) ----------------
function start() { G.phase = 'ride'; document.body.classList.add('ingame', 'horse-mode'); $('hud').style.display = ''; horse.init(); }
hnet.prime(); start(); hnet.auto(Q.get('room') || undefined);
window.__t0 = performance.now(); // v34 reopen: the world is playable at once; the lobby joins / rejoins in the background
// iOS / Android resume: a page restored from the back-forward cache (or a home-screen app brought back) has dead WebGL / WebRTC
// state, so start fresh; after a long background stay, re-find a lobby if the link dropped
addEventListener('pageshow', e => { if (e.persisted) location.reload(); });
let hiddenAt = 0; document.addEventListener('visibilitychange', () => { if (document.hidden) { hiddenAt = performance.now(); return; } last = performance.now(); // no giant dt after a pause
  if (hiddenAt && performance.now() - hiddenAt > 20000 && hnet.state.role !== 'solo' && !(hnet.net && hnet.net.open)) hnet.auto(); });
// v36: a lost 3D view reloads once; lost again within a minute shows the failure screen with retry (no reload loop)
renderer.domElement.addEventListener('webglcontextlost', e => { e.preventDefault(); let L = []; try { L = JSON.parse(sessionStorage.getItem('hr_ctxlost') || '[]').filter(t => Date.now() - t < 60000); } catch (_) {}
  L.push(Date.now()); try { sessionStorage.setItem('hr_ctxlost', JSON.stringify(L)); } catch (_) {} window.__ctxLost = L.length;
  if (L.length >= 2) { window.__bootFail && window.__bootFail('ctx'); return; }
  const go = () => location.reload(); if (!document.hidden) setTimeout(go, 300); else document.addEventListener('visibilitychange', go, { once: true }); });
// test hooks
const syncCamera = dt => horse.syncCamera(dt);
window.__sim = secs => { for (let i = 0; i < secs * 20; i++) update(.05); };
if (Q.get('dev') === '1') { window.__horse = horse; window.__hnet = hnet; window.__sfx = sfx; window.__coop = { act, syncCamera, keys, input }; }
window.__cam = camera; window.__G = G; window.__P = P; window.__Q = QNAME; window.__sfx = sfx;
// ---------------- Loop with adaptive resolution ----------------
const NORENDER = Q.has('norender'); const TSCALE = +(Q.get('ts') || 1); let last = performance.now(), fAcc = 0, fN = 0, lowT = 0, hiT = 0, pr = renderer.getPixelRatio(); const PR_MAX = Math.min(devicePixelRatio || 1, /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) ? Math.max(pr, 1.5) : Math.max(pr, 2));
function loop(t) { requestAnimationFrame(loop); window.__frames = (window.__frames || 0) + 1; if (window.__frames === 2) window.__booted = true; const rawMs = t - last, rdt = Math.max(0, Math.min(.1, rawMs / 1000)); last = t; const c0 = PF.on ? performance.now() : 0; if (PF.on) PF.frameStart(); const dt = Math.min(.05, rdt);
  try {
  for (let k = 0; k < TSCALE; k++) update(dt);
  if (G.phase != 'menu') { PF.s('cam'); syncCamera(dt); PF.e('cam'); sfx.listen(camera); PF.s('hud'); hud(dt); PF.e('hud'); }
  const lp = GX.lens(); if (lp) lp.uniforms.uT.value = (t % 1000);
  const gmat = scene.userData.grassMat; if (gmat && gmat.userData.sh) gmat.userData.sh.uniforms.uT.value = performance.now() / 1000;
  if (horse.preRender) horse.preRender(); // v36: character skins follow the final rider pose
  if (!NORENDER) { PF.s('fx'); fx.update(dt); PF.e('fx'); GX.followSun(P.pos); PF.s('render'); if (PF.on) PF.gpuBegin(); GX.render(); if (PF.on) PF.gpuEnd(); PF.e('render'); }
  } catch (e) { if (!window.__loopErr) { window.__loopErr = e; console.error('frame error', e); } if (/render|WebGL|shader/i.test(String(e && e.stack)) && GX.composer) { GX.composer = null; } }
  if (PF.on) PF.frameEnd(rawMs, performance.now() - c0);
  fAcc += rdt; fN++; if (fAcc > 2) { const fps = fN / fAcc; $('fps').textContent = Math.round(fps) + ' fps · ' + QNAME;
    const SM = IS_TOUCH; // v42: phones keep 50+ fps — trade a little sharpness early instead of stuttering
    if (fps > (SM ? 48 : 57) && pr < PR_MAX - .01) { if (++hiT >= (SM ? 2 : 3)) { hiT = 0; pr = Math.min(PR_MAX, pr + .1); GX.setPR(pr); fx.setScale(); } } else hiT = 0; // v33: adaptive both ways (sharper when there is headroom)
    if (fps < (SM ? 36 : 28)) { lowT++; if (lowT >= 2) { lowT = 0; if (SM && pr > 1.05) { pr = Math.max(1, pr - .1); GX.setPR(pr); fx.setScale(); } else if (SM && fps >= 25) { /* phones: stay sharp (never below full resolution) unless it is really struggling */ } else if (GX.aoPass && GX.aoPass.enabled) GX.disableAO(); else if (pr > .55) { pr = Math.max(.5, pr - .15); GX.setPR(pr); fx.setScale(); } } } else lowT = 0;
    fAcc = 0; fN = 0; }
  }
requestAnimationFrame(loop);
window.__mainDone = true; // v36 boot guard: the game script finished starting
