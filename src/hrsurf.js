// v330 SURFING at Paradise Cove. Rent a board at the shack, walk into the water and you're lying on it paddling.
//  PADDLE  : W / stick up to paddle, A D / stick to turn. Whitewater shoves you back to the beach - JUMP to duck-dive under it.
//  CATCH   : point at the beach as a wave face rises under you and paddle (or JUMP) - you pop up.
//  RIDE    : the wave keeps moving under you. Steer along the face: angle DOWN to gain speed, back UP to climb, W pumps,
//            S stalls (to slot into the barrel). Waves peel north -> south, so race the curl along the open shoulder.
//            Stay just ahead of the peel, low on the face, and you're in the BARREL. Go up through the lip with speed and you
//            launch an AERIAL - spin with A/D and land facing down the wave. Fall behind the curl, or land badly: WIPEOUT.
//  Scoring : speed on the face, bottom turns, cutbacks, tube time, airs and spins build a combo; points bank when the ride ends.
// Physics run in the wave's frame (position along the crest z, distance in front of the crest u), so the rider genuinely rides
// the moving, shoaling, peeling wave that the ocean shader draws.
import * as THREE from 'three';
import { BEACH, shoreX, waveAt, peelZ } from './hrbeachwave.js?v=338';

export function createSurf({ scene, H, P, T, hAt, msg, sfx, mobile, fx, input, keys, B, camera }) {
  const { SEA, XB, XS, ZC, C, K, T: TP } = BEACH, G = 9.8, S = () => H.stats || (H.stats = {});
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), wv = {}, wv2 = {};
  const earn = n => { const g = H.guns; if (g) { g.state.score += n; g.save && g.save(); } };
  // ---------- the surf shack: bamboo hut, thatch, a rack of boards ----------
  const shZ = ZC + 70, shX = shoreX(shZ) - 34, shY = hAt(shX, shZ); { const g = new THREE.Group(); g.position.set(shX, shY, shZ); g.name = 'surf shack'; const bam = new THREE.MeshStandardMaterial({ color: 0xc8a868, roughness: .8 }), th = new THREE.MeshStandardMaterial({ color: 0xb89a58, roughness: 1 });
    for (const [x, z] of [[-2.5, -2], [2.5, -2], [-2.5, 2], [2.5, 2]]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(.12, .14, 3.2, 6), bam); p.position.set(x, 1.6, z); g.add(p); }
    const roof = new THREE.Mesh(new THREE.ConeGeometry(4.6, 2.2, 4), th); roof.rotation.y = Math.PI / 4; roof.position.y = 4.2; roof.scale.z = .85; g.add(roof); const ct = new THREE.Mesh(new THREE.BoxGeometry(4.6, 1, .5), bam); ct.position.set(0, .5, 2); g.add(ct);
    const COLS = [0xff5a3a, 0xffd23a, 0x3ac8ff, 0xffffff, 0x7aff6a, 0xff7ae0]; COLS.forEach((c, i) => { const b = new THREE.Mesh(new THREE.CapsuleGeometry(.26, 1.7, 4, 10), new THREE.MeshStandardMaterial({ color: c, roughness: .4 })); b.scale.z = .25; b.position.set(-2.2 + i * .88, 1.2, -2.5); b.rotation.x = .12; g.add(b); });
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 128; const x = cv.getContext('2d'); x.fillStyle = '#1aa6b0'; x.fillRect(0, 0, 512, 128); x.fillStyle = '#fff4d8'; x.font = 'bold 66px Georgia,serif'; x.textAlign = 'center'; x.fillText('SURF SHACK', 256, 88); const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace;
    const sg = new THREE.Mesh(new THREE.PlaneGeometry(3.6, .9), new THREE.MeshStandardMaterial({ map: tx })); sg.position.set(0, 3.15, 2.35); g.add(sg); const sg2 = sg.clone(); sg2.rotation.y = Math.PI; sg2.position.z = -2.35; g.add(sg2);
    g.rotation.y = -Math.PI / 2; scene.add(g); H.cullAdd && H.cullAdd(g, 300, { x: shX, z: shZ }); }
  const rent = { x: shX + 3.2, z: shZ, y: shY, kind: 'surf_rent', label: '', r: 2.4, sf: true }; T.spots.push(rent);
  let board = 0; try { board = +localStorage.getItem('hr_board') || 0; } catch (_) {} const COLS = [0xff5a3a, 0xffd23a, 0x3ac8ff, 0xffffff, 0x7aff6a, 0xff7ae0];
  const setRentLabel = () => { rent.label = board ? `🏄 Swap boards (yours is #${board}) - then walk into the water` : '🏄 Rent a surfboard (free) - then walk into the water'; }; setRentLabel();
  // ---------- the board ----------
  const bMat = new THREE.MeshStandardMaterial({ color: COLS[(board || 1) - 1] || COLS[0], roughness: .35 }), brd = new THREE.Group(); { const b = new THREE.Mesh(new THREE.CapsuleGeometry(.27, 1.65, 4, 14), bMat); b.rotation.x = Math.PI / 2; b.scale.set(1, 1, .22); brd.add(b); const st = new THREE.Mesh(new THREE.BoxGeometry(.03, .05, 2.1), new THREE.MeshStandardMaterial({ color: 0x3a2a1a })); st.position.y = .03; brd.add(st); const fin = new THREE.Mesh(new THREE.BoxGeometry(.02, .16, .2), bMat); fin.position.set(0, -.1, -.9); brd.add(fin); }
  brd.visible = false; scene.add(brd);
  // ---------- HUD ----------
  const hud = document.createElement('div'); hud.id = 'hrSurf'; hud.style.cssText = 'position:fixed;left:50%;top:150px;transform:translateX(-50%);z-index:31;font:800 15px system-ui,sans-serif;color:#fff;text-shadow:0 2px 4px #000a;text-align:center;pointer-events:none;display:none'; document.body.appendChild(hud);
  const ex = document.createElement('button'); ex.textContent = '🏖️ To shore'; ex.style.cssText = 'position:fixed;right:12px;top:118px;z-index:32;padding:8px 12px;border-radius:10px;border:2px solid #fff8;background:#0a6a7acc;color:#fff;font:700 13px system-ui;display:none'; document.body.appendChild(ex);
  // ---------- state ----------
  const R = { mode: null, x: 0, z: 0, a: Math.PI * 0, sp: 0, duck: 0, k: 0, u: 0, th: 0, ride: null, air: null, wipe: 0, pop: 0, catchT: 0 };
  let score = 0, combo = 1, lastTh = 0, tubeT = 0, lastJump = false, sprayT = 0, crashT = 0, best = 0; try { best = +localStorage.getItem('hr_surfbest') || 0; } catch (_) {}
  const ctrl = () => { const k = keys || {}, i = input || {}; const fw = (k.KeyW || k.ArrowUp ? 1 : 0) + Math.max(0, -(i.mz || 0)), bk = (k.KeyS || k.ArrowDown ? 1 : 0) + Math.max(0, i.mz || 0), sd = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0) + (i.mx || 0), j = !!(k.Space || i.jump); return { fw: Math.min(1, fw), bk: Math.min(1, bk), sd: clamp(sd, -1, 1), j }; };
  const crestX = (k, z, t) => XS - C * (t - k * TP) - (z - ZC) * K;
  function enter() { if (B.surfing) return; B.surfing = true; lastT = -1; R.mode = 'paddle'; R.x = P.pos.x; R.z = P.pos.z; R.a = 0; R.sp = 0; R.duck = 0; H.trainRide = tick; H.trainUse = () => { leave('🏖️ You paddle in'); return true; }; brd.visible = true; ex.style.display = ''; hud.style.display = ''; const s0 = S(); if (!s0.surfTut) { s0.surfTut = 1; msg('🏄 SURF SCHOOL: paddle out (W / stick up). JUMP to duck-dive under whitewater.', 5); setTimeout(() => B.surfing && msg('🏄 Out past the break, turn to face the beach. When a wave lifts you, keep paddling - you pop up.', 6), 6000); setTimeout(() => B.surfing && msg('🏄 Riding: steer along the face (A/D). Down = speed, up = climb. Stay ahead of the curl - or tuck in for a BARREL.', 6.5), 13000); } else msg('🏄 Paddle out past the whitewater (W), duck-dive (JUMP) under the broken waves, then turn for the beach as a wave rises', 4.5); const s = S(); s.surfSessions = (s.surfSessions || 0) + 1; }
  function leave(why) { if (R.ride) bank(); H.camDist = 0; B.surfing = false; R.mode = null; H.trainRide = null; H.trainUse = null; brd.visible = false; ex.style.display = 'none'; hud.style.display = 'none'; const av = H.meAv; if (av && av.body) { av.body.rotation.x = av.body.rotation.z = 0; resetPose(av); } if (why) msg(why, 2); }
  ex.onclick = () => { if (B.surfing) { const x = shoreX(R.z) - 3; P.pos.set(x, hAt(x, R.z), R.z); leave('🏖️ Back on the sand'); } };
  function bank() { const r = R.ride; R.ride = null; if (!r) return; if (assist) score *= .7; /* assist rides score a little less */ const tot = Math.round(score); if (tot > 40) { const pts = Math.round(tot / 4); earn(pts); const s = S(); s.surfRides = (s.surfRides || 0) + 1; s.surfBest = Math.max(s.surfBest || 0, tot); s.surfTube = Math.max(s.surfTube || 0, +r.tube.toFixed(1)); s.surfAirs = (s.surfAirs || 0) + r.airs;
      const rec = tot > best; if (rec) { best = tot; try { localStorage.setItem('hr_surfbest', String(best)); } catch (_) {} } H.lb && H.lb.add && tot > 300 && H.lb.add(Math.round(tot / 4), 'surf'); msg(`🏄 Ride score ${tot.toLocaleString()}${r.tube > .5 ? ` · ${r.tube.toFixed(1)} s in the barrel` : ''}${r.airs ? ` · ${r.airs} air${r.airs > 1 ? 's' : ''}` : ''}  +${pts}${rec ? '  ★ NEW BEST' : ''}`, 4); } score = 0; combo = 1; }
  const flash = (t, n) => { score += n * combo; combo = Math.min(8, combo + (n >= 200 ? 1 : .5)); R.ride && (R.ride.lastTrick = t); hudMsg = t; hudT = 1.4; if (sfx.tone && sfx.ctx) sfx.tone('triangle', 660 + combo * 60, 880 + combo * 60, .06, .18); };
  let hudMsg = '', hudT = 0; let assist = true; try { assist = localStorage.getItem('hr_surfassist') !== '0'; } catch (_) {} const setAssist = v => { assist = !!v; try { localStorage.setItem('hr_surfassist', v ? '1' : '0'); } catch (_) {} };
  // ---------- avatar pose: stance on the board (bone overrides on top of the idle clip) ----------
  const bones = {}; function findBones(av) { if (bones.ok || !av || !av.W) return; av.W.m.traverse(o => { if (!o.isBone) return; const n = o.name.toLowerCase().replace(/mixamorig:?/, ''); for (const k of ['hips', 'spine', 'spine1', 'spine2', 'neck', 'leftarm', 'rightarm', 'leftforearm', 'rightforearm', 'leftupleg', 'rightupleg', 'leftleg', 'rightleg']) if (n === k || n.endsWith(k) && !bones[k]) bones[k] = o; }); bones.ok = true; }
  const q = new THREE.Quaternion(), e3 = new THREE.Euler();
  const turnBone = (b, x, y, z) => { if (!b) return; e3.set(x, y, z); q.setFromEuler(e3); b.quaternion.multiply(q); };
  function stance(av, crouch, lean, paddle, tnow) { findBones(av); if (paddle) { turnBone(bones.spine, .25, 0, 0); turnBone(bones.leftarm, -1.2 + Math.sin(tnow * 6) * .9, 0, -.3); turnBone(bones.rightarm, -1.2 - Math.sin(tnow * 6) * .9, 0, .3); turnBone(bones.leftupleg, .1, 0, 0); turnBone(bones.rightupleg, .1, 0, 0); return; }
    turnBone(bones.hips, 0, 0, 0); turnBone(bones.spine, .25 + crouch * .35, 0, lean * .35); turnBone(bones.leftupleg, -.6 - crouch * .5, 0, -.25); turnBone(bones.rightupleg, -.4 - crouch * .5, 0, .3); turnBone(bones.leftleg, .7 + crouch * .9, 0, 0); turnBone(bones.rightleg, .7 + crouch * .9, 0, 0);
    turnBone(bones.leftarm, 0, 0, 1.1 - lean * .5); turnBone(bones.rightarm, 0, 0, -1.1 - lean * .5); }
  function resetPose() {}
  // ---------- the main loop (called by horse.js in place of walking while surfing) ----------
  const nrm = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), qb = new THREE.Quaternion(), fwd = new THREE.Vector3(), m4 = new THREE.Matrix4();
  function surfaceAt(x, z, t) { waveAt(x, z, t, wv2); return SEA + wv2.eta; }
  let lastT = -1; function tick(dt0) { const t = (Date.now() / 1000) % 3600, c = ctrl(); let jumpEdge = c.j && !lastJump; lastJump = c.j;
    // the waves run on the wall clock, so the rider integrates wall-clock time too (in small sub-steps) - a slow frame never lets the curl jump ahead of you
    let dt = lastT < 0 || t < lastT ? dt0 : t - lastT; lastT = t; dt = Math.min(dt, .5); const n = Math.max(1, Math.ceil(dt / .03)), h = dt / n;
    for (let i = 0; i < n; i++) { const ti = t - dt + h * (i + 1); if (R.mode === 'paddle') paddle(h, ti, c, jumpEdge); else if (R.mode === 'ride') ride(h, ti, c, jumpEdge); else if (R.mode === 'air') air(h, ti, c); else if (R.mode === 'wipe') wipe(h, ti); jumpEdge = false; if (!B.surfing) break; }
    if (!B.surfing) return;
    // place the board + rider
    const x = R.x, z = R.z, y = surfaceAt(x, z, t), dir = R.dir || [Math.cos(R.a), Math.sin(R.a)], yAir = R.mode === 'air' ? R.air.y : y;
    const ex2 = surfaceAt(x + .5, z, t) - surfaceAt(x - .5, z, t), ez = surfaceAt(x, z + .5, t) - surfaceAt(x, z - .5, t); nrm.set(-ex2, 1, -ez).normalize(); if (R.mode === 'air') nrm.set(0, 1, 0);
    const yaw = Math.atan2(dir[0], dir[1]); qb.setFromUnitVectors(up, nrm); e3.set(R.mode === 'air' ? R.air.pitch : 0, yaw + (R.mode === 'air' ? R.air.spin : 0), R.mode === 'ride' ? clamp(-R.carve * .45, -.6, .6) : 0, 'YXZ'); q.setFromEuler(e3); brd.quaternion.copy(qb).multiply(q);
    brd.position.set(x, yAir + (R.mode === 'paddle' ? (R.duck > 0 ? -.6 : .05) : .08), z); if (R.mode === 'wipe') { brd.position.y = y + .1; brd.rotation.z += dt * 6; }
    P.pos.set(x, brd.position.y + (R.mode === 'paddle' ? -.55 : .02), z); H.vy = 0; if (H.fv) H.fv.set(0, 0);
    const av = H.meAv; if (av && av.body) { av.body.visible = !H.fp; av.body.position.copy(P.pos); if (R.mode === 'paddle') { av.body.rotation.set(-1.35, yaw + Math.PI, 0, 'YXZ'); av.body.position.y += .45; } else if (R.mode === 'wipe') { av.body.rotation.set(Math.sin(t * 9) * 2, yaw, Math.cos(t * 7) * 2, 'YXZ'); } else { av.body.rotation.set(0, yaw + Math.PI / 2 + (R.mode === 'air' ? R.air.spin : 0), clamp(R.carve * .25, -.4, .4), 'YXZ'); av.body.position.y -= .05; }
      if (av.W) { av.W.update(dt, 0); stance(av, R.mode === 'ride' ? clamp(.35 + R.sp * .03 + (R.tube ? .5 : 0), 0, 1) : .6, R.carve || 0, R.mode === 'paddle', t); } }
    // camera: drift behind the direction of travel
    const cvx = dir[0] + (R.mode === 'ride' || R.mode === 'air' ? .95 : 0), cvz = dir[1], vy = Math.atan2(-cvx, -cvz); /* ride cam: look across the face from the shoulder */ H.camDist = R.tube ? 3.0 : R.mode === 'ride' || R.mode === 'air' ? 4.6 + Math.min(2, (R.sp || 0) * .12) : 3.6; if (R.tube) P.pitch += (-.02 - P.pitch) * Math.min(1, dt * 3); let d = vy - P.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); P.yaw += d * Math.min(1, dt * (R.mode === 'ride' ? 1.6 : .8));
    // HUD
    hudT -= dt; hud.innerHTML = R.mode === 'ride' || R.mode === 'air' ? `<div style="font-size:26px">${Math.round(score).toLocaleString()} <span style="color:#ffd23a">×${combo.toFixed(1)}</span></div><div>${(R.sp || 0).toFixed(1)} m/s${R.tube ? ' · <span style="color:#7affff">BARREL ' + R.ride.tube.toFixed(1) + 's</span>' : ''}</div>${hudT > 0 ? `<div style="color:#ffd23a;font-size:20px">${hudMsg}</div>` : ''}`
      : R.mode === 'paddle' ? `<div>${R.duck > 0 ? '🫧 duck-dive' : R.catchHint ? '🌊 <span style="color:#ffd23a">WAVE! paddle / JUMP to pop up</span>' : '🏄 paddling'}${best ? ` · best ride ${best.toLocaleString()}` : ''}</div>` : R.mode === 'wipe' ? '<div style="color:#ff8a7a;font-size:22px">WIPEOUT</div>' : '';
    // sound: board spray while riding
    if (R.mode === 'ride' && sfx.nz && sfx.ctx && (sprayT -= dt) <= 0) { sprayT = .12; sfx.nz('highpass', 2500 + R.sp * 100, .5, .015 + Math.min(.05, R.sp * .004) + Math.abs(R.carve || 0) * .03, .14); }
    if (R.mode === 'ride' && fx && fx.smoke && Math.abs(R.carve || 0) > .35 && R.sp > 5) { const sd = R.carve > 0 ? 1 : -1; fx.smoke.emit(x - dir[0] * .8 + dir[1] * .3 * sd, y + .2, z - dir[1] * .8 - dir[0] * .3 * sd, -dir[1] * sd * 2.5, 1.6 + R.sp * .12, dir[0] * sd * 2.5, .95, .98, 1, .7, .8, .5, -.06, .35); }
  }
  function paddle(dt, t, c, jumpEdge) { waveAt(R.x, R.z, t, wv); const w = wv.wave; R.duck = Math.max(0, R.duck - dt); if (jumpEdge && R.duck <= 0 && !(R.catchHint)) { R.duck = 1.1; if (sfx.nz && sfx.ctx) sfx.nz('lowpass', 500, 1, .1, .3); }
    R.a += c.sd * 1.9 * dt; R.sp += (c.fw * 2.3 - R.sp * 1.1) * dt; R.sp = Math.max(0, R.sp); R.dir = [Math.cos(R.a), Math.sin(R.a)];
    let px = R.dir[0] * R.sp, pz = R.dir[1] * R.sp; if (w && w.broken && w.u > -6 && w.u < 9 && R.duck <= 0) { const push = Math.min(1.6, w.A) * 3.2; px -= push; if (Math.random() < dt * 2) R.a += (Math.random() - .5) * .8; }
    R.x += px * dt; R.z += pz * dt; R.z = clamp(R.z, -260, 590); R.x = Math.min(R.x, 1450);
    // catching: an unbroken face rising under you while you point at the beach and paddle
    R.catchHint = !!(w && !w.broken && w.s > .45 && w.u > -3.2 && w.u < 3.5 && R.dir[0] < -.25); if (R.catchHint) { R.catchT += c.fw > .3 ? dt : 0; if (jumpEdge || R.catchT > .45) popUp(t, w); } else R.catchT = 0;
    if (R.x < shoreX(R.z) + 10 && R.sp < 2) { const x = shoreX(R.z) - 2; P.pos.set(x, hAt(x, R.z), R.z); leave('🏖️ You carry your board up the sand'); } }
  function popUp(t, w) { R.mode = 'ride'; R.k = w.k; R.u = R.x - crestX(R.k, R.z, t); const d = R.dir; R.th = clamp(Math.atan2(-d[0], -d[1]), -1.2, 2.6); R.sp = Math.max(8, R.sp + 5.5); R.carve = 0; R.tube = false; R.ride = { t: 0, tube: 0, airs: 0, peak: 0, turnAcc: 0, lastTrick: '' }; score = 0; combo = 1; lastTh = R.th; msg('🏄 POP UP! Angle along the face - race the curl south', 2.2); P.pitch = Math.min(P.pitch, -.18); if (sfx.tone && sfx.ctx) sfx.tone('triangle', 520, 880, .08, .25); }
  function ride(dt, t, c, jumpEdge) { const r = R.ride; r.t += dt; const cx = crestX(R.k, R.z, t), x = cx + R.u, ez = surfaceAt(x + .35, R.z, t) - surfaceAt(x - .35, R.z, t), face = clamp(ez / .7, 0, 1.4); waveAt(x, R.z, t, wv); const A = wv.wave ? wv.wave.A : 1;
    // steering (carve), pump, stall
    const rate = 2.6 + 2.2 * clamp(1 - R.sp / 14, 0, 1); let sd = c.sd;
    if (assist && Math.abs(c.sd) < .15) { const tgt = -A * .55, want = clamp((R.u - tgt) * .45, -.55, .75) * (Math.cos(R.th) >= 0 ? 1 : -1) + (Math.cos(R.th) >= 0 ? 0 : Math.PI); let d = Math.atan2(Math.sin(want - R.th), Math.cos(want - R.th)); sd = clamp(d * 2.5, -.8, .8); } /* surf assist: holds a trim line mid-face */
    R.carve = sd; R.th += sd * rate * dt; R.th = Math.atan2(Math.sin(R.th), Math.cos(R.th)); R.sp *= 1 - Math.abs(sd) * .04 * dt;
    const down = Math.sin(R.th), trim = Math.abs(Math.cos(R.th)) > .35 ? 6 * Math.min(face, .9) * Math.abs(Math.cos(R.th)) : 0; /* the moving face keeps feeding a rider who trims along it */ R.sp += (G * .85 * face * down + trim + (c.fw && face > .08 ? 2.1 : 0) - (c.bk ? 3.2 : 0) - .06 * R.sp - .012 * R.sp * R.sp) * dt; R.sp = clamp(R.sp, 0, 19);
    const du = -R.sp * down * dt, dz = -R.sp * Math.cos(R.th) * dt; R.u += du; R.z += dz; R.z = clamp(R.z, -300, 640);
    R.x = crestX(R.k, R.z, t) + R.u; R.dir = [-Math.sin(R.th), -Math.cos(R.th)];
    // the curl: where is the peel relative to you?
    const pz = peelZ(R.k, t), behind = R.z - pz; // >0: you are in the broken (north) part
    R.tube = !!(behind > -1.5 && behind < 5 && R.u < -.3 && R.u > -A * 1.25 && crestX(R.k, R.z, t) < XB + 12 && R.sp > 4);
    if (R.tube) { r.tube += dt; score += 70 * dt * combo; if (r.tube > .6 && !r.tubeCall) { r.tubeCall = 1; flash('🌀 BARREL!', 150); } } else if (r.tubeCall && r.tube > .6) { r.tubeCall = 0; flash(`🌀 Out of the barrel! ${r.tube.toFixed(1)}s`, Math.round(r.tube * 220)); }
    // score flow: speed on a steep face
    score += R.sp * face * 4 * dt * combo;
    // maneuvers: bottom turn (down -> up quickly low on the face), cutback (reverse direction along the crest), floater (riding the lip)
    const dTh = Math.atan2(Math.sin(R.th - lastTh), Math.cos(R.th - lastTh)); r.turnAcc = r.turnAcc * Math.exp(-dt * 1.2) + Math.abs(dTh); lastTh = R.th;
    if (r.turnAcc > 2.4 && Math.cos(R.th) < -.3 && R.sp > 6) { r.turnAcc = 0; flash('↩️ CUTBACK', 180); }
    if (down < -.55 && R.u < -A * .8 && R.sp > 7 && !r.bt) { r.bt = 1; flash('⤴️ Bottom turn', 60); } if (down > .2) r.bt = 0;
    if (R.u > -.6 && R.u < .6 && behind > 0 && behind < 6 && R.sp > 5) { if (!r.fl) { r.fl = 1; flash('🌊 FLOATER', 160); } } else r.fl = 0;
    // launch off the lip
    if (R.u > -.4 && down < -.3 && R.sp > 6.5 && (jumpEdge || R.sp * -down > 7.5)) { R.mode = 'air'; R.air = { y: surfaceAt(R.x, R.z, t) + .1, vy: 3 + R.sp * .32 * -down, spin: 0, pitch: 0, th0: R.th }; msg('🛫 AIR!', 1); return; }
    // ends: over the back, outran the wave, caught by the curl
    if (R.u > 1.6) { bank(); R.mode = 'paddle'; R.a = Math.atan2(R.dir[1], R.dir[0]); R.sp = 1; msg('🏄 You kick out over the back', 1.8); return; }
    if (R.sp < 1.4 && face < .06) { bank(); R.mode = 'paddle'; R.sp = .5; R.a = Math.PI; msg('🏄 The wave runs away from you', 1.8); return; }
    if (behind > 6 && R.u > -A * 1.6 && crestX(R.k, R.z, t) < XB + 2) { if (R.sp < 3.5) { bank(); R.mode = 'paddle'; R.sp = .5; R.a = Math.PI; msg('🏄 The wave closes out - you straighten out and ride the foam in', 2); } else wipeout('🌊 The curl caught you!'); return; }
    if (R.x < shoreX(R.z) + 8) { bank(); const sx = shoreX(R.z) - 2; P.pos.set(sx, hAt(sx, R.z), R.z); leave('🏖️ You ride it all the way to the sand'); return; } }
  function air(dt, t, c) { const a = R.air, r = R.ride; a.vy -= G * dt; a.y += a.vy * dt; a.spin += c.sd * 7.5 * dt; a.pitch = Math.sin(Math.min(1, (a.vy + 6) / 12) * Math.PI) * -.2;
    R.u += 2.4 * dt; R.z += -R.sp * Math.cos(R.th) * dt * .6; R.x = crestX(R.k, R.z, t) + R.u; R.dir = [-Math.sin(R.th), -Math.cos(R.th)];
    const s = surfaceAt(R.x, R.z, t); if (a.y <= s && a.vy < 0) { const turns = a.spin / Math.PI, half = Math.round(turns), off = Math.abs(turns - half); if (off < .3) { const spins = Math.abs(half); R.th = R.th + half * Math.PI; if (spins % 2) R.th += 0; R.th = Math.atan2(Math.sin(R.th), Math.cos(R.th)); if (Math.sin(R.th) < -.2) R.th = Math.PI / 2 * .7 * (Math.cos(R.th) >= 0 ? 1 : -1) + (Math.cos(R.th) < 0 ? Math.PI : 0); R.u = Math.min(R.u, -.3); R.sp *= .85; R.mode = 'ride'; r.airs++; flash(spins >= 2 ? `🔄 ${spins * 180} AIR!` : spins === 1 ? '🔄 180 AIR REVERSE' : '🛬 AIR - stomped!', 350 + spins * 300); }
      else wipeout('💥 Bad landing!'); } }
  function wipeout(why) { R.why = why + ' u' + R.u.toFixed(1) + ' sp' + R.sp.toFixed(1); const s = S(); s.surfWipes = (s.surfWipes || 0) + 1; R.ride && (score *= .35); bank(); R.mode = 'wipe'; R.wipe = 2.4; R.tube = false; msg(why + ' WIPEOUT', 2.2); if (sfx.nz && sfx.ctx) { sfx.nz('lowpass', 300, 1, .35, 1.2); sfx.nz('bandpass', 1200, .6, .2, .8); } }
  function wipe(dt, t) { R.wipe -= dt; R.x -= 3 * dt; R.z += (Math.random() - .5) * dt; if (R.wipe <= 0) { R.mode = 'paddle'; R.sp = 0; R.a = 0; R.dir = [1, 0]; msg('🏄 You surface and climb back on your board', 2); } }
  // ---------- THE CURL: a translucent lip that pitches over the face at each wave's peel point (CPU-built, ~300 verts) ----------
  const LZ = 34, LA = 16, lipPos = new Float32Array(LZ * LA * 3), lipFoam = new Float32Array(LZ * LA), lipIdx = []; for (let j = 0; j < LZ - 1; j++) for (let i = 0; i < LA - 1; i++) { const a = j * LA + i, b = a + 1, c2 = a + LA, d = c2 + 1; lipIdx.push(a, c2, b, b, c2, d); }
  const lipG = new THREE.BufferGeometry(); lipG.setAttribute('position', new THREE.BufferAttribute(lipPos, 3)); lipG.setAttribute('foam', new THREE.BufferAttribute(lipFoam, 1)); lipG.setIndex(lipIdx);
  const lipM = new THREE.ShaderMaterial({ transparent: true, side: THREE.DoubleSide, depthWrite: false, uniforms: { uNight: { value: 0 } }, vertexShader: 'attribute float foam; varying float vF; varying vec3 vW; void main(){ vF = foam; vW = position; gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform float uNight; varying float vF; varying vec3 vW; void main(){ vec3 c = mix(vec3(.2, .82, .76), vec3(.97, .99, 1.0), clamp(vF, 0.0, 1.0)); float n = sin(vW.z * 1.7 + vW.y * 3.1) * .5 + .5; c = mix(c, vec3(1.0), smoothstep(.55, 1.0, vF) * (.6 + .4 * n)); c *= mix(1.0, .3, uNight); gl_FragColor = vec4(c, mix(.62, .95, vF)); }' });
  const lip = new THREE.Mesh(lipG, lipM); lip.frustumCulled = false; lip.visible = false; lip.renderOrder = 4; scene.add(lip);
  function curl(t) { const me = P.pos; if (me.x < 1060 || Math.abs(me.z - ZC) > 460) { lip.visible = false; return; }
    // which wave: the one you ride, else the nearest one that is peeling within view
    let k = R.ride ? R.k : null; if (k == null) { const k0 = Math.floor(t / TP); let bd = 1e9; for (let j = 0; j < 6; j++) { const kk = k0 - j, pz = peelZ(kk, t); if (pz < -240 || pz > 560) continue; const d = Math.abs(pz - me.z); if (d < bd) { bd = d; k = kk; } } }
    if (k == null) { lip.visible = false; return; } const pz = peelZ(k, t); if (pz < -240 || pz > 560) { lip.visible = false; return; }
    const amp = .75 + .6 * ((k * .618034) - Math.floor(k * .618034)) + (k % 5 === 0 ? .55 : 0), A = amp * 3.1; lip.visible = true; lipM.uniforms.uNight.value = H.night || 0;
    for (let j = 0; j < LZ; j++) { const z = pz - 8 + j * (24 / (LZ - 1)), rel = z - pz, grow = clamp((rel + 8) / 8, 0, 1), fall = clamp(1 - (rel - 2) / 14, 0, 1), cx = crestX(k, z, t);
      const r = A * .55 * grow, cy = A * (.95 - .45 * grow), cu = -r * .9; for (let i = 0; i < LA; i++) { const th = Math.PI / 2 - i / (LA - 1) * (Math.PI * (.35 + .7 * grow)), u = cu + Math.cos(th) * r * (i ? 1 : 0) + (i ? 0 : 0), h = cy + Math.sin(th) * r * fall * (1 - .35 * (1 - grow)) * 1, o = (j * LA + i) * 3;
        lipPos[o] = cx + (i ? u : -.2); lipPos[o + 1] = SEA + Math.max(.1, i ? h * fall + (1 - fall) * A * .2 : A * (.98 - .4 * (1 - fall))); lipPos[o + 2] = z; lipFoam[j * LA + i] = clamp((i / (LA - 1)) * 1.3 * grow + (1 - fall) * .9 + (rel > 0 ? .25 : 0), 0, 1); } }
    lipG.attributes.position.needsUpdate = true; lipG.attributes.foam.needsUpdate = true; lipG.computeBoundingSphere();
    if (fx && fx.smoke && (curl.sp = (curl.sp || 0) - .016) <= 0 && Math.abs(pz - me.z) < 120) { curl.sp = .06; const cx = crestX(k, pz + 1.5, t); fx.smoke.emit(cx - A * .7, SEA + A * .6, pz + 1.5 + Math.random() * 3, (Math.random() - .5) * 2, 1.5 + Math.random() * 2.5, 2 + Math.random() * 3, .96, .98, 1, .55, 1.6, 1.4, -.04, .4); } }

  // ---------- v337 the wake: a foam ribbon behind the board (last 40 positions, laid on the water) ----------
  const WN = 40, wkP = new Float32Array(WN * 2 * 3), wkA = new Float32Array(WN * 2), wkI = []; for (let i = 0; i < WN - 1; i++) { const a = i * 2; wkI.push(a, a + 1, a + 2, a + 2, a + 1, a + 3); }
  const wkG = new THREE.BufferGeometry(); wkG.setAttribute('position', new THREE.BufferAttribute(wkP, 3)); wkG.setAttribute('al', new THREE.BufferAttribute(wkA, 1)); wkG.setIndex(wkI);
  const wake = new THREE.Mesh(wkG, new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, vertexShader: 'attribute float al; varying float vA; void main(){ vA = al; gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0); }', fragmentShader: 'varying float vA; void main(){ gl_FragColor = vec4(.97, .99, 1.0, vA * .75); }' }));
  wake.frustumCulled = false; wake.renderOrder = 5; wake.visible = false; scene.add(wake); const trail = []; let trailT = 0;
  function wakeTick(dt, t) { const on = B.surfing && (R.mode === 'ride' || R.mode === 'paddle'); if (!on) { if (trail.length) trail.length = 0; wake.visible = false; return; } trailT -= dt; if (trailT <= 0) { trailT = .05; trail.unshift([R.x, R.z, R.mode === 'ride' ? Math.min(1, R.sp / 10) : .25]); if (trail.length > WN) trail.pop(); }
    wake.visible = trail.length > 2; for (let i = 0; i < WN; i++) { const p = trail[Math.min(i, trail.length - 1)] || [R.x, R.z, 0], q = trail[Math.min(i + 1, trail.length - 1)] || p, dx = p[0] - q[0], dz = p[1] - q[1], l = Math.hypot(dx, dz) || 1, w = .25 + i * .03, y = surfaceAt(p[0], p[1], t) + .06, f = (1 - i / WN) * p[2] * (i < trail.length ? 1 : 0);
      wkP.set([p[0] - dz / l * w, y, p[1] + dx / l * w, p[0] + dz / l * w, y, p[1] - dx / l * w], i * 6); wkA[i * 2] = wkA[i * 2 + 1] = f; } wkG.attributes.position.needsUpdate = true; wkG.attributes.al.needsUpdate = true; }
  // ---------- set warnings, first-time tutorial ----------
  let setWarn = -1; function setTick(t) { if (!B.surfing) return; const k0 = Math.floor(t / TP); for (let j = -3; j <= 0; j++) { const k = k0 - j; if (k % 5 !== 0 || k === setWarn) continue; const cx = crestX(k, R.z, t); if (cx > R.x + 25 && cx < R.x + 80) { setWarn = k; msg('🌊 SET WAVE coming - the big one! Paddle for it', 2.4); } } }

  // ---------- per frame (not surfing): rentals, entering the water, ambient crash sounds ----------
  const prevUse = T.onUse; T.onUse = o => { if (o === rent) { board = (board % COLS.length) + 1; bMat.color.setHex(COLS[board - 1]); try { localStorage.setItem('hr_board', String(board)); } catch (_) {} setRentLabel(); msg(`🏄 Board #${board} is yours - walk into the water to paddle out`, 3); const s = S(); s.surfBoard = 1; return true; } return prevUse ? prevUse(o) : false; };
  function update(dt, t) { curl(t); wakeTick(dt, t); setTick(t); if (B.surfing) { if (H.mounted || H.dead) leave(); return; }
    const me = P.pos; if (board && !H.mounted && !H.trainRide && me.x > shoreX(me.z) + 13 && me.x < 1460 && Math.abs(me.z - ZC) < 430) enter();
    if (me.x > 1040 && Math.abs(me.z - ZC) < 500 && sfx.nz && sfx.ctx && (crashT -= dt) <= 0) { crashT = 1.6 + Math.random() * 2.5; const d = Math.max(20, Math.abs(me.x - XB)); sfx.nz('lowpass', 420 + Math.random() * 300, .7, Math.min(.12, 6 / d), 1.8 + Math.random()); } }
  const testPop = () => { const t = (Date.now() / 1000) % 3600; waveAt(R.x, R.z, t, wv); if (wv.wave && !wv.wave.broken && wv.wave.u > -2.5 && wv.wave.u < 1.5 && wv.wave.s > .45) { popUp(t, wv.wave); return true; } return false; };
  const peelInfo = zRef => { const t = (Date.now() / 1000) % 3600, k0 = Math.floor(t / TP); let best = null; for (let j = 0; j < 6; j++) { const k = k0 - j, pz = peelZ(k, t); if (pz < -200 || pz > 500) continue; if (!best || Math.abs(pz - zRef) < Math.abs(best.pz - zRef)) best = { k, pz, cx: crestX(k, pz, t) }; } return best; };
  return { update, peelInfo, get state() { return R; }, enter, leave, testPop, setAssist, get assist() { return assist; }, peel: () => R.ride ? peelZ(R.k, (Date.now() / 1000) % 3600) : null };
}
