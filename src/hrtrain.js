// v61 THE IRON HORSE: a steam train runs a big loop of track around town (same position for everyone: it runs off the wall
// clock). Locomotive + tender + two coaches + a gold-trimmed EXPRESS car carrying the strongbox.
// TRAIN HEIST: gallop alongside the express car to leap aboard. Three railroad guards on the roof shoot back; drop them,
// then hold tight while the safe is blasted (+3,000). Once every 10 minutes. Ride off the side to jump down any time.
import * as THREE from 'three';
import { makeFrontierCharacter, poseFrontierCharacter } from './hrcharacters.js?v=61';
export function createTrain({ scene, H, P, hAt, msg, sfx, mobile, input, PEN }) {
  const tone = (...a) => sfx && sfx.ctx && sfx.tone && sfx.tone(...a);
  const SPEED = 13, CARS = [['loco', 9.2], ['tender', 6], ['coach', 11], ['coach', 11], ['express', 10]], GAP = .6;
  let path = null, L = 0, built = false; const yS = [];
  // ---------- choose the loop ----------
  function plan() { const town = H.places && H.places.town; if (!town) return false; const pl = H.places, avoid = [[town[0], town[1], 70]]; for (const k of ['cave', 'temple']) if (pl[k]) avoid.push([pl[k].x, pl[k].z, 90]);
    if (H.ranchPos) avoid.push([H.ranchPos[0], H.ranchPos[1], 45]); if (PEN) avoid.push([PEN.x, PEN.z, 40]); const W = (H.WALK || 1000) - 60; let best = null, bs = 1e18;
    for (const rx of [300, 360, 420, 480, 540]) for (const k of [.65, .8, 1]) for (let r = 0; r < 6; r++) { const rot = r * Math.PI / 6, pts = [], N = 220; let pen = 0, ok = true;
      for (let i = 0; i < N; i++) { const a = i / N * Math.PI * 2, ex = Math.cos(a) * rx, ez = Math.sin(a) * rx * k, x = town[0] + ex * Math.cos(rot) - ez * Math.sin(rot), z = town[1] + ex * Math.sin(rot) + ez * Math.cos(rot);
        if (Math.abs(x) > W || Math.abs(z) > W) { ok = false; break; } for (const [ax, az, ar] of avoid) if (Math.hypot(x - ax, z - az) < ar) pen += 400; pts.push([x, hAt(x, z), z]); } if (!ok) continue;
      let var_ = 0; for (let i = 0; i < N; i++) var_ += Math.abs(pts[i][1] - pts[(i + 1) % N][1]); if (var_ + pen < bs) { bs = var_ + pen; best = pts; } }
    if (!best) return false; // densify + smooth heights (a railway grade, then never below the ground by much)
    const P2 = []; for (let i = 0; i < best.length; i++) { const a = best[i], b = best[(i + 1) % best.length], n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[2] - a[2]) / 4)); for (let k = 0; k < n; k++) P2.push([a[0] + (b[0] - a[0]) * k / n, 0, a[2] + (b[2] - a[2]) * k / n]); }
    const g = P2.map(p => hAt(p[0], p[2])), n = P2.length, w = 12; for (let i = 0; i < n; i++) { let s = 0; for (let k = -w; k <= w; k++) s += g[(i + k + n) % n]; P2[i][1] = Math.max(s / (2 * w + 1), g[i] - .05) + .35; }
    for (let it = 0; it < 3; it++) for (let i = 0; i < n; i++) P2[i][1] = Math.max((P2[(i - 1 + n) % n][1] + P2[i][1] * 2 + P2[(i + 1) % n][1]) / 4, g[i] + .3);
    path = P2; const cum = [0]; for (let i = 1; i <= n; i++) { const a = P2[i - 1], b = P2[i % n]; cum.push(cum[i - 1] + Math.hypot(b[0] - a[0], b[2] - a[2])); } L = cum[n]; path.cum = cum; return true; }
  const out = new THREE.Vector3(), tan = new THREE.Vector3();
  function at(s, o = out, t = tan) { s = ((s % L) + L) % L; const c = path.cum; let lo = 0, hi = path.length; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (c[m] <= s) lo = m; else hi = m; } const a = path[lo], b = path[(lo + 1) % path.length], k = (s - c[lo]) / Math.max(1e-6, c[lo + 1] - c[lo]);
    o.set(a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k); t.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]).normalize(); return o; }
  // ---------- track ----------
  function buildTrack() { const n = Math.floor(L / 1.3), tieG = new THREE.BoxGeometry(2.5, .16, .32), ties = new THREE.InstancedMesh(tieG, new THREE.MeshStandardMaterial({ color: 0x4a3420, roughness: .95 }), n);
    const rn = Math.floor(L / 2.6), railG = new THREE.BoxGeometry(.1, .14, 2.62), rails = new THREE.InstancedMesh(railG, new THREE.MeshStandardMaterial({ color: 0x6a6a72, metalness: .7, roughness: .4 }), rn * 2);
    const bedG = new THREE.BoxGeometry(3.6, .5, 2.62), bed = new THREE.InstancedMesh(bedG, new THREE.MeshStandardMaterial({ color: 0x8a7a66, roughness: 1 }), rn);
    const postG = new THREE.CylinderGeometry(.18, .22, 1, 6), posts = [], m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3(), t = new THREE.Vector3();
    for (let i = 0; i < n; i++) { at(i * 1.3, p, t); e.set(0, Math.atan2(t.x, t.z), 0); q.setFromEuler(e); m4.compose(p, q, sc); ties.setMatrixAt(i, m4); }
    for (let i = 0; i < rn; i++) { at(i * 2.6 + 1.3, p, t); const yaw = Math.atan2(t.x, t.z), pitch = -Math.asin(Math.max(-1, Math.min(1, t.y))); e.set(pitch, yaw, 0, 'YXZ'); q.setFromEuler(e);
      for (const sd of [-.72, .72]) { const v = new THREE.Vector3(sd, .14, 0).applyQuaternion(q).add(p); m4.compose(v, q, sc); rails.setMatrixAt(i * 2 + (sd > 0 ? 1 : 0), m4); }
      const gnd = hAt(p.x, p.z); const v = p.clone(); v.y -= .3; m4.compose(v, q, sc); bed.setMatrixAt(i, m4); if (p.y - gnd > 1.4 && i % 3 === 0) for (const sd of [-1.2, 1.2]) { const pv = new THREE.Vector3(sd, 0, 0).applyQuaternion(q).add(p); posts.push([pv.x, gnd, pv.z, p.y - gnd]); } }
    const tr = new THREE.InstancedMesh(postG, new THREE.MeshStandardMaterial({ color: 0x5a3e24, roughness: .9 }), Math.max(1, posts.length)); posts.forEach(([x, y, z, h], i) => { m4.compose(p.set(x, y + h / 2 - .3, z), q.identity(), sc.set(1, h + .2, 1)); tr.setMatrixAt(i, m4); }); tr.count = posts.length; sc.set(1, 1, 1);
    for (const o of [ties, rails, bed, tr]) { o.receiveShadow = true; o.frustumCulled = false; scene.add(o); } }
  // ---------- rolling stock ----------
  const M = { black: new THREE.MeshStandardMaterial({ color: 0x1c1c20, metalness: .5, roughness: .45 }), red: new THREE.MeshStandardMaterial({ color: 0x8a1e16, roughness: .55 }), gold: new THREE.MeshStandardMaterial({ color: 0xd8a83a, metalness: .6, roughness: .35, emissive: 0x2a1800 }),
    green: new THREE.MeshStandardMaterial({ color: 0x2a4a34, roughness: .6 }), wood: new THREE.MeshStandardMaterial({ color: 0x7a5232, roughness: .8 }), glass: new THREE.MeshStandardMaterial({ color: 0x2a2a20, emissive: 0xffb050, emissiveIntensity: .4 }), coal: new THREE.MeshStandardMaterial({ color: 0x0e0e10, roughness: 1 }) };
  const cars = []; const B = (g, w, h, d, m, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.castShadow = true; g.add(o); return o; };
  const C = (g, r, len, m, x, y, z, rx = Math.PI / 2) => { const o = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 16), m); o.position.set(x, y, z); o.rotation.x = rx; o.castShadow = true; g.add(o); return o; };
  function wheelsFor(g, len, big) { const ws = []; for (const z of big ? [len / 2 - 1.6, len / 2 - 3.4, -len / 2 + 2.4] : [len / 2 - 1.4, -len / 2 + 1.4]) for (const sx of [-.95, .95]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(big && z < len / 2 - 2 ? .85 : .5, big && z < len / 2 - 2 ? .85 : .5, .14, 14), M.red); w.rotation.z = Math.PI / 2; w.position.set(sx, big && z < len / 2 - 2 ? .85 : .5, z); g.add(w); ws.push(w); } return ws; }
  function buildTrain() { for (const [kind, len] of CARS) { const g = new THREE.Group(); scene.add(g); let ws;
      if (kind === 'loco') { ws = wheelsFor(g, len, true); B(g, 2.2, .5, len, M.black, 0, 1.3, 0); C(g, .95, 5.6, M.black, 0, 2.45, .9); for (const z of [-.6, 1.6, 2.9]) C(g, 1.0, .18, M.gold, 0, 2.45, z); C(g, .25, 1.4, M.black, 0, 3.9, 3.1, 0); const st = new THREE.Mesh(new THREE.CylinderGeometry(.55, .25, .7, 12), M.black); st.position.set(0, 4.8, 3.1); g.add(st);
        C(g, .35, .6, M.gold, 0, 3.55, 1.2, 0); B(g, 2.5, 2.6, 2.6, M.red, 0, 2.9, -3.1); B(g, 2.8, .2, 3.0, M.black, 0, 4.3, -3.1); for (const sx of [-1.26, 1.26]) B(g, .02, .8, 1.2, M.glass, sx, 3.4, -3); const cw = new THREE.Mesh(new THREE.ConeGeometry(1.2, 1.4, 4), M.red); cw.rotation.set(Math.PI / 2, Math.PI / 4, 0); cw.position.set(0, .8, len / 2 + .3); cw.scale.set(1, 1, .5); g.add(cw);
        const lamp = B(g, .5, .5, .5, M.glass, 0, 3.0, len / 2 - .4); lamp.material = new THREE.MeshStandardMaterial({ color: 0x222, emissive: 0xfff0b0, emissiveIntensity: 2.5 }); }
      else if (kind === 'tender') { ws = wheelsFor(g, len); B(g, 2.4, 1.8, len, M.black, 0, 1.9, 0); B(g, 2.0, .5, len - .8, M.coal, 0, 2.9, 0); }
      else { ws = wheelsFor(g, len); const body = kind === 'express' ? M.green : M.red; B(g, 2.6, 2.4, len, body, 0, 2.3, 0); B(g, 2.9, .22, len + .4, M.black, 0, 3.6, 0); B(g, 2.7, .2, len, M.gold, 0, 1.2, 0);
        if (kind === 'express') { B(g, 2.64, .14, len, M.gold, 0, 3.3, 0); const cv = document.createElement('canvas'); cv.width = 256; cv.height = 48; const c2 = cv.getContext('2d'); c2.fillStyle = '#2a4a34'; c2.fillRect(0, 0, 256, 48); c2.fillStyle = '#e8c060'; c2.font = '900 34px Georgia, serif'; c2.textAlign = 'center'; c2.fillText('EXPRESS', 128, 36); const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace;
          for (const sx of [-1.31, 1.31]) { const pl = new THREE.Mesh(new THREE.PlaneGeometry(4.5, .85), new THREE.MeshStandardMaterial({ map: tx })); pl.position.set(sx, 2.4, 0); pl.rotation.y = sx > 0 ? Math.PI / 2 : -Math.PI / 2; g.add(pl); } }
        else for (let k = -3; k <= 3; k++) for (const sx of [-1.31, 1.31]) B(g, .02, .7, .9, M.glass, sx, 2.6, k * 1.4); }
      cars.push({ g, kind, len, ws }); } }
  // smoke + whistle
  const puffT = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(90,90,96,.85)'); gr.addColorStop(1, 'rgba(90,90,96,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
  const SN = 36, sp = new Float32Array(SN * 3), sAge = new Float32Array(SN), sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3)); const smoke = new THREE.Points(sg, new THREE.PointsMaterial({ map: puffT, size: 4.5, transparent: true, depthWrite: false, opacity: .6 })); smoke.frustumCulled = false; scene.add(smoke); let si = 0, sT = 0;
  function whistle() { tone('sawtooth', 520, 500, 1.1, .08); tone('sine', 660, 640, 1.1, .1); }
  // ---------- heist ----------
  const ls = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (_) { return null; } };
  let heist = null, alongT = 0, guards = [];
  const ready = () => Date.now() - (+ls('hr_heist') || 0) > 10 * 60 * 1000;
  const guardMat = { coat: 0x2a3a5a, top: 0xd8d0c0, hatC: 0x1a1a22, skin: 0x9a6a4a, hair: 0x1a120c };
  function board(car) { if (H.dismountNow) H.dismountNow(); heist = { car, t: 0, stage: 'guards', off: .0, blast: 0 }; H.trainRide = ride; msg('🚂 You leap aboard the express car! Drop the railroad guards', 3.5); tone('square', 330, 660, .2, .14);
    guards = []; for (let i = 0; i < 3; i++) { const D = makeFrontierCharacter({ kind: 'townsfolk', sex: 'male', quality: 'low', name: 'Guard', ...guardMat }); scene.add(D.g); guards.push({ D, hp: 3, alive: true, car: 2 + (i % 2), off: i === 2 ? -3 : 2.5, cd: 1 + i * .7 }); } }
  function leave(why) { H.trainRide = null; const c = heist && heist.car; heist = null; for (const g of guards) g.D.g.removeFromParent(); guards = []; if (c) { tan.set(0, 0, 1).applyQuaternion(c.g.quaternion); const sx = -tan.z * 3.5, sz = tan.x * 3.5, x = c.g.position.x + sx, z = c.g.position.z + sz; P.pos.set(x, hAt(x, z), z); } if (why) msg(why, 2.5); }
  function ride(dt) { const c = heist.car; tan.set(0, 0, 1).applyQuaternion(c.g.quaternion); const v = new THREE.Vector3(0, 3.75, heist.off).applyQuaternion(c.g.quaternion).add(c.g.position); P.pos.copy(v);
    if (input && (input.jump || input.mx * input.mx > .8)) leave('You jump clear of the train'); }
  const tmp = new THREE.Vector3();
  function heistTick(dt) { if (!heist) { const ex = cars[cars.length - 1], h = H.mounted; if (!h || !ready()) { alongT = 0; return; } const d = Math.hypot(h.pos.x - ex.g.position.x, h.pos.z - ex.g.position.z); if (d < 6 && Math.abs(H.speed || 0) > 8) { alongT += dt; if (alongT > 1.2) { alongT = 0; board(ex); } } else alongT = 0; return; }
    heist.t += dt; const alive = guards.filter(g => g.alive);
    for (const g of guards) { const car = cars[g.car]; tmp.set(0, 3.75, g.off).applyQuaternion(car.g.quaternion).add(car.g.position); g.D.g.position.copy(tmp); if (!g.alive) { g.D.g.rotation.x = Math.min(1.5, (g.dead = (g.dead || 0) + dt) * 3); continue; }
      g.D.g.rotation.y = Math.atan2(P.pos.x - tmp.x, P.pos.z - tmp.z); poseFrontierCharacter(g.D, dt, { speed: 0 }); g.cd -= dt; if (g.cd <= 0) { g.cd = 1.6 + Math.random(); tone('sawtooth', 900, 200, .12, .12); if (Math.random() < .45 && H.zombies && H.zombies.hurt) H.zombies.hurt(7); } }
    if (heist.stage === 'guards' && !alive.length) { heist.stage = 'safe'; heist.blast = 4; msg('💣 Guards down — blasting the safe… hold on!', 3); }
    if (heist.stage === 'safe') { heist.blast -= dt; if (heist.blast <= 0) { heist.stage = 'done'; ls('hr_heist', String(Date.now())); const g = H.guns && H.guns.state; if (g) { g.score += 3000; H.guns.save && H.guns.save(); } H.lb && H.lb.add(3000, 'boss');
        const S = H.stats || (H.stats = {}); S.heists = (S.heists || 0) + 1; try { localStorage.setItem('hr_stats', JSON.stringify(S)); } catch (_) {} tone('sawtooth', 120, 40, .8, .3); setTimeout(() => leave('💰 The strongbox is yours!  +3,000 — you leap off with the loot'), 1500); } }
    if (H.dead) leave(); }
  H.shotHooks = H.shotHooks || []; H.shotHooks.push((o, dir) => { for (const g of guards) { if (!g.alive) continue; tmp.copy(g.D.g.position).add(new THREE.Vector3(0, 1.2, 0)).sub(o); const t = tmp.dot(dir); if (t < 0 || t > 200 || tmp.lengthSq() - t * t > .55 * .55) continue; g.hp--; H.hitX && H.hitX(false, g.hp <= 0); if (g.hp <= 0) { g.alive = false; const gs = H.guns && H.guns.state; if (gs) gs.score += 75; } break; } });
  // ---------- update ----------
  let lastS = 0, wT = 20;
  function update(dt) { if (!built) { if (!H.places) return; if (!plan()) return; buildTrack(); buildTrain(); built = true; H.trainPath = path; }
    const s = (Date.now() / 1000 * SPEED) % L; let off = 0; const pw = new THREE.Vector3(), pt = new THREE.Vector3();
    for (const c of cars) { const mid = s - off - c.len / 2; at(mid + c.len / 2 - 1, pw, pt); const front = pw.clone(); at(mid - c.len / 2 + 1, pw, pt); const back = pw.clone(); c.g.position.copy(front).add(back).multiplyScalar(.5); c.g.lookAt(tmp.copy(front).add(c.g.position).sub(back));
      for (const w of c.ws) w.rotation.x -= SPEED * dt / .7; off += c.len + GAP; }
    const loco = cars[0]; H.trainPos = [loco.g.position.x, loco.g.position.z]; const dl = Math.hypot(P.pos.x - loco.g.position.x, P.pos.z - loco.g.position.z);
    sT -= dt; if (sT <= 0 && dl < 400) { sT = .12; tmp.set(0, 5.2, 3.1).applyQuaternion(loco.g.quaternion).add(loco.g.position); sp.set([tmp.x, tmp.y, tmp.z], si * 3); sAge[si] = 0; si = (si + 1) % SN; }
    for (let i = 0; i < SN; i++) { sAge[i] += dt; sp[i * 3 + 1] += dt * 2.2; } sg.attributes.position.needsUpdate = true; smoke.material.size = 4.5;
    wT -= dt; if (wT <= 0) { wT = 25 + Math.random() * 20; if (dl < 260) whistle(); }
    heistTick(dt); }
  return { update, get guards() { return guards; }, get heist() { return heist; }, get cars() { return cars; }, get length() { return L; }, board: () => cars.length && board(cars[cars.length - 1]) };
}
