// Mobile touch controls (Pointer Events, multitouch): a floating joystick that starts only inside a thumb-sized zone around
// its resting spot (lower left); a touch anywhere else on the screen that is not a button drags the camera / aim (left or
// right thumb). Each finger is tracked by pointerId so move/look/fire/jump work together. Several look drags at once never
// add up: the newest drag steers, and when it lifts the older one takes over again from where it is (no jump).
export function initTouch(input, look, act, unlockAudio) {
  const $ = id => document.getElementById(id); const joy = $('joy'), stick = $('stick'), knob = $('knob'), lookEl = $('look');
  const R = 55, sens = () => 0.0055 * 900 / Math.max(600, innerWidth) * (window.__lookSens ? window.__lookSens() : 1);
  const cap = (el, e) => { try { el.setPointerCapture(e.pointerId); } catch (_) {} };
  let jid = null, jx = 0, jy = 0;
  const showStick = (x, y) => { stick.style.left = x + 'px'; stick.style.top = y + 'px'; stick.classList.add('active'); knob.style.transform = ''; };
  const restStick = () => { stick.classList.remove('active'); stick.style.left = '18%'; stick.style.top = '70%'; knob.style.transform = ''; };
  restStick();
  // joystick zone: a circle around the resting stick (18% / 70%), radius ~26% of the short side (85-125 px)
  const zone = () => { const r0 = (document.getElementById('touch') || document.body).getBoundingClientRect(); return { x: r0.left + r0.width * .18, y: r0.top + r0.height * .7, r: Math.max(85, Math.min(125, Math.min(innerWidth, innerHeight) * .26)) }; }; /* v409 zone follows the safe-area inset */ /* v214: smaller stick zone - drag anywhere else on the screen to look */
  const inZone = (x, y) => { const z = zone(); return Math.hypot(x - z.x, y - z.y) <= z.r; };
  // one shared look arbiter for every drag surface (left dead space, right half, FIRE)
  const lk = new Map(); // pointerId -> [x, y]; Map keeps start order, the last entry steers
  const lookStart = (id, x, y) => { lk.delete(id); lk.set(id, [x, y]); dbg(); };
  const lookMove = (id, x, y) => { const p = lk.get(id); if (!p) return; let top = null; for (const k of lk.keys()) top = k; if (top === id) look((x - p[0]) * sens(), (y - p[1]) * sens(), 'touch'); p[0] = x; p[1] = y; dbg(); };
  const lookEnd = id => { if (lk.delete(id)) dbg(); };
  window.__touchLook = { active: () => [...lk.keys()], zone, inZone }; // for tests / the debug overlay
  joy.addEventListener('pointerdown', e => { e.preventDefault(); unlockAudio();
    if (jid !== null || !inZone(e.clientX, e.clientY)) { cap(joy, e); lookStart(e.pointerId, e.clientX, e.clientY); return; } // left dead space: aim
    jid = e.pointerId; jx = e.clientX; jy = e.clientY; cap(joy, e); showStick(jx, jy); input.mx = input.mz = 0; dbg(); });
  joy.addEventListener('pointermove', e => { if (lk.has(e.pointerId)) { e.preventDefault(); lookMove(e.pointerId, e.clientX, e.clientY); return; } if (e.pointerId !== jid) return; e.preventDefault(); let dx = e.clientX - jx, dy = e.clientY - jy; const l = Math.hypot(dx, dy);
    if (l > R) { dx *= R / l; dy *= R / l; } knob.style.transform = `translate(${dx}px,${dy}px)`; const dz = l < 6 ? 0 : 1; input.mx = dz * dx / R; input.mz = dz * dy / R; });
  const jend = e => { lookEnd(e.pointerId); if (e.pointerId !== jid) return; jid = null; input.mx = input.mz = 0; restStick(); dbg(); };
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) joy.addEventListener(ev, jend);
  // v34 dead-man: a release anywhere ends the stick; no finger on the glass = no input (missed touchend / pointercancel / system gesture)
  for (const ev of ['pointerup', 'pointercancel']) addEventListener(ev, e => { if (e.pointerId === jid) jend(e); else lookEnd(e.pointerId); }, true);
  const btns = []; // v36: every button's finger ownership + pressed look is released by the reset too
  const touchReset = () => { jid = null; input.mx = input.mz = 0; lk.clear(); restStick(); for (const b of btns) b(); dbg(); }; window.__touchReset = touchReset;
  for (const ev of ['touchend', 'touchcancel']) addEventListener(ev, e => { if (!e.touches || e.touches.length === 0) touchReset(); }, true);
  // v146 pinch to zoom the camera: two fingers on the look area
  const pz = new Map(); let pd0 = 0; const pdist = () => { const v = [...pz.values()]; return v.length < 2 ? 0 : Math.hypot(v[0][0] - v[1][0], v[0][1] - v[1][1]); };
  lookEl.addEventListener('pointerdown', e => { e.preventDefault(); unlockAudio(); cap(lookEl, e); pz.set(e.pointerId, [e.clientX, e.clientY]); if (pz.size === 2) { pd0 = pdist(); for (const k of pz.keys()) lookEnd(k); return; } lookStart(e.pointerId, e.clientX, e.clientY); });
  lookEl.addEventListener('pointermove', e => { if (pz.has(e.pointerId)) pz.set(e.pointerId, [e.clientX, e.clientY]); if (pz.size >= 2) { e.preventDefault(); const d = pdist(), H = window.__hrH; if (pd0 > 20 && d > 20 && H) { H.zoom = Math.max(.5, Math.min(1.6, (H.zoom || 1) * pd0 / d)); } pd0 = d; return; } if (!lk.has(e.pointerId)) return; e.preventDefault(); lookMove(e.pointerId, e.clientX, e.clientY); });
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) lookEl.addEventListener(ev, e => { pz.delete(e.pointerId); pd0 = 0; });
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) lookEl.addEventListener(ev, e => lookEnd(e.pointerId));
  // ?touchzones=1: draw the joystick zone and live touches (green = move, yellow = steering look, grey = waiting look)
  let dbgEl = null; const showDbg = new URLSearchParams(location.search).has('touchzones');
  function dbg() { if (!showDbg) return; if (!dbgEl) { dbgEl = document.createElement('div'); dbgEl.id = 'touchDbg'; document.body.appendChild(dbgEl); }
    const z = zone(), act = [...lk.keys()], top = act[act.length - 1];
    let h = `<div class="tz" style="left:${z.x - z.r}px;top:${z.y - z.r}px;width:${z.r * 2}px;height:${z.r * 2}px"><span>MOVE</span></div><div class="tl">drag anywhere else to aim</div>`;
    if (jid !== null) h += `<i class="tp mv" style="left:${jx}px;top:${jy}px"></i>`; for (const [id, p] of lk) h += `<i class="tp ${id === top ? 'lk' : 'wt'}" style="left:${p[0]}px;top:${p[1]}px"></i>`;
    dbgEl.innerHTML = h; }
  dbg(); addEventListener('resize', dbg);
  // buttons; FIRE also acts as a look pad while held
  const btn = (id, down, up, drag) => { const el = $(id); if (!el || !down) return; let pid = null, last = null;
    el.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); unlockAudio(); if (pid !== null) { if (pid === e.pointerId) return; if (drag) lookEnd(pid); up && up(); } /* v72: a new press always takes over (a lost pointerup used to leave the button dead) */ pid = e.pointerId; cap(el, e); el.classList.add('down'); last = [e.clientX, e.clientY]; if (drag) lookStart(pid, e.clientX, e.clientY); down(); });
    if (drag) el.addEventListener('pointermove', e => { if (e.pointerId !== pid) return; e.preventDefault(); lookMove(pid, e.clientX, e.clientY); });
    const u = e => { if (e.pointerId !== pid) return; if (drag) lookEnd(pid); pid = null; el.classList.remove('down'); up && up(); };
    for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) el.addEventListener(ev, u);
    btns.push(() => { if (pid === null) return; pid = null; el.classList.remove('down'); up && up(); }); };
  btn('tFire', () => input.fire = true, () => input.fire = false, true);
  btn('tJump', () => input.jump = true, () => input.jump = false); btn('tCall', () => { const H = window.__hrH; if (H && H.whistle) H.whistle(); }, () => {});
  btn('tAct', () => { input.use = true; act.build(); }, () => input.use = false); btn('tReload', act.reload); btn('tPiece', act.piece); btn('tMat', act.mat); btn('tSkip', act.skip); btn('tAds', act.ads); btn('tSwap', act.swap);
  // the ⋯ menu holds everything that is not needed every second
  const more = $('uiMore'), setMore = v => { more.hidden = !v; $('tMore').classList.toggle('down', v); };
  btn('tMore', () => setMore(more.hidden));
  const item = (id, fn, keep) => { const el = $(id); if (!el || !fn) return; el.addEventListener('pointerdown', e => { e.stopPropagation(); }); el.addEventListener('click', e => { e.preventDefault(); unlockAudio(); fn(); if (!keep) setMore(false); }); };
  item('mMap', act.map); item('mCamp', act.camp); item('mStats', act.stats); item('mPhoto', act.photo); item('mNvg', act.nvg); item('mFeed', act.feed); item('mSlide', act.slide); item('mInspect', act.inspect); item('mScore', act.score); item('mHelp', act.help); item('mSet', act.settings); item('mFs', act.fs); item('mQuit', act.quit); item('mClose', () => {});
  // block page scroll/zoom gestures that would otherwise steal touches (iOS Safari)
  document.addEventListener('touchmove', e => { if (e.target.closest && e.target.closest('#touch')) e.preventDefault(); }, { passive: false });
  document.addEventListener('gesturestart', e => e.preventDefault());
  addEventListener('blur', () => { input.mx = input.mz = 0; input.fire = input.jump = input.use = false; });
}

/* v409 iPhone Safari: block pinch / double-tap page zoom and undo any zoom or drift left by a rotation (it cropped the buttons off both edges) */
(() => { const no = e => { e.preventDefault(); }; for (const ev of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(ev, no, { passive: false });
  let lastT = 0; document.addEventListener('touchend', e => { const n = Date.now(); if (n - lastT < 320 && !(e.target.closest && e.target.closest('input,textarea,select,a'))) e.preventDefault(); lastT = n; }, { passive: false });
  const meta = document.querySelector('meta[name=viewport]'), base = meta && meta.content;
  const fix = () => { if (window.scrollX || window.scrollY) window.scrollTo(0, 0); const vv = window.visualViewport; if (meta && vv && (vv.scale > 1.01 || vv.offsetLeft > 1 || vv.offsetTop > 1)) { meta.content = base + ',minimum-scale=1'; setTimeout(() => { meta.content = base; }, 60); } };
  for (const ev of ['orientationchange', 'resize']) addEventListener(ev, () => { fix(); setTimeout(fix, 300); setTimeout(fix, 900); }); if (window.visualViewport) { visualViewport.addEventListener('resize', fix); visualViewport.addEventListener('scroll', fix); } setInterval(fix, 2000); })();
