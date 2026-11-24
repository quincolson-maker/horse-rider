// v61 THE IRON HORSE: a steam train runs a big loop of track around town (same position for everyone: it runs off the wall
// clock). Locomotive + tender + two coaches + a gold-trimmed EXPRESS car carrying the strongbox.
// TRAIN HEIST: gallop alongside the express car to leap aboard. Three railroad guards on the roof shoot back; drop them,
// then hold tight while the safe is blasted (+3,000). Once every 10 minutes. Ride off the side to jump down any time.
import { mergeStatic } from './hrmerge.js?v=154';
import * as THREE from 'three';
import { makeFrontierCharacter, poseFrontierCharacter } from './hrcharacters.js?v=154';
export function createTrain({ scene, H, P, hAt, msg, sfx, mobile, input, PEN }) {
  const tone = (...a) => sfx && sfx.ctx && sfx.tone && sfx.tone(...a);
  const SPEED = 17, CARS = [['loco', 9.2], ['tender', 6], ['coach', 11], ['open', 10], ['express', 10]], GAP = .6, DWELL = 14, ACC = 5; // v77: an open observation car to ride in
  let path = null, L = 0, built = false; const yS = [];
  // ---------- choose the loop ----------
  // v77 THE MOUNTAIN LINE: one grand loop round the whole map - out of Dry Gulch, up through the foothills and every ridge
  // (rock tunnels where the mountain is higher than the grade, timber trestles where the ground falls away), six stations
  let STATIONS = [], TUN = [];
  function plan() { const town = H.places && H.places.town; if (!town) return false; const W = (H.WALK || 1000) - 80;
    const WP = [[town[0] + 40, town[1] - 105, 'Dry Gulch'], [-200, -470], [-500, -520, 'Eagle Pass'], [-660, -150], [-560, 330, 'Silver Ridge'], [-250, 630], [150, 660, 'North Pass'], [520, 520], [640, 120, 'Summit Junction'], [560, -150], [430, -330, 'Outlaw Flats'], [260, -320]];
    const curve = new THREE.CatmullRomCurve3(WP.map(([x, z]) => new THREE.Vector3(Math.max(-W, Math.min(W, x)), 0, Math.max(-W, Math.min(W, z)))), true, 'centripetal', .5);
    const n = Math.round(curve.getLength() / 4), P2 = curve.getSpacedPoints(n).slice(0, n).map(v => [v.x, 0, v.z]);
    const g = P2.map(p => hAt(p[0], p[2])), N2 = P2.length; let y = g.slice();
    // stations: nearest sample to each named waypoint; the grade is pinned to the ground there
    STATIONS = WP.filter(w => w[2]).map(([x, z, name]) => { let bi = 0, bd = 1e18; P2.forEach((p, k) => { const d = (p[0] - x) ** 2 + (p[2] - z) ** 2; if (d < bd) { bd = d; bi = k; } }); return { name, i: bi }; });
    const pin = new Float32Array(N2).fill(0); for (const st of STATIONS) for (let k = -12; k <= 12; k++) pin[(st.i + k + N2) % N2] = 1 - Math.abs(k) / 13;
    for (let it = 0; it < 3; it++) { const w = 6, ny = new Array(N2); for (let i = 0; i < N2; i++) { let a = 0; for (let k = -w; k <= w; k++) a += y[(i + k + N2) % N2]; ny[i] = a / (2 * w + 1); } y = ny.map((v, i) => v + (g[i] - v) * pin[i]); }
    const GR = .18 * 4; for (let pass = 0; pass < 8; pass++) { for (let i = 1; i < N2 * 2; i++) { const a = (i - 1) % N2, b = i % N2; y[b] = Math.max(y[a] - GR, Math.min(y[a] + GR, y[b])); } for (let i = N2 * 2; i > 0; i--) { const a = i % N2, b = (i - 1) % N2; y[b] = Math.max(y[a] - GR, Math.min(y[a] + GR, y[b])); } } // v77: 12% mountain grade, no hard pins (no cliffs)
    { // v82: stations sit on the ground - ease the line down to ground level within ~240 m of each platform, then re-grade outward from the platforms (no cliffs)
      const ord = STATIONS.slice().sort((a, b) => a.i - b.i), tgt = ord.map(st => g[st.i]), G1 = .17; // feasible station heights: each reachable from its neighbours at 17% (margin under the 20% re-grade)
      for (let it = 0; it < 40; it++) for (let k = 0; k < ord.length; k++) { const a = ord[k], b = ord[(k + 1) % ord.length], d = ((b.i - a.i + N2) % N2) * 4, lim = G1 * d; const kb = (k + 1) % ord.length; if (ord[kb].name !== 'Dry Gulch') tgt[kb] = Math.max(tgt[k] - lim, Math.min(tgt[k] + lim, tgt[kb])); if (ord[k].name !== 'Dry Gulch') tgt[k] = Math.max(tgt[kb] - lim, Math.min(tgt[kb] + lim, tgt[k])); } // Dry Gulch (by town) is the anchor
      const fix = new Uint8Array(N2), Wn = 60; ord.forEach((st, si) => { const T0 = tgt[si]; st.y = T0; for (let k = -Wn; k <= Wn; k++) { const i = (st.i + k + N2) % N2, w = Math.abs(k) <= 4 ? 1 : (t => t * t * (3 - 2 * t))(1 - (Math.abs(k) - 4) / (Wn - 4)); y[i] = y[i] + (T0 - y[i]) * w; if (Math.abs(k) <= 4) { y[i] = T0; fix[i] = 1; } } });
      const G2 = .2 * 4; for (let pass = 0; pass < 12; pass++) { for (let i = 1; i < N2 * 2; i++) { const a = (i - 1) % N2, b = i % N2; if (!fix[b]) y[b] = Math.max(y[a] - G2, Math.min(y[a] + G2, y[b])); } for (let i = N2 * 2; i > 0; i--) { const a = i % N2, b = (i - 1) % N2; if (!fix[b]) y[b] = Math.max(y[a] - G2, Math.min(y[a] + G2, y[b])); } } }
    for (let i = 0; i < N2; i++) P2[i][1] = y[i] + .35;
    // tunnels: runs where the ground stands more than 1.2 m over the rails (min 6 samples)
    TUN = []; let st = -1; for (let i = 0; i <= N2; i++) { const under = i < N2 && g[i] > P2[i][1] + 4; if (under && st < 0) st = i; if (!under && st >= 0) { if (i - st >= 6) TUN.push([Math.max(0, st - 2), Math.min(N2 - 1, i + 1)]); st = -1; } }
    path = P2; const cum = [0]; for (let i = 1; i <= N2; i++) { const a = P2[i - 1], b = P2[i % N2]; cum.push(cum[i - 1] + Math.hypot(b[0] - a[0], b[2] - a[2], b[1] - a[1])); } L = cum[N2]; path.cum = cum;
    for (const S0 of STATIONS) S0.s = cum[S0.i]; STATIONS.sort((a, b) => a.s - b.s); buildSchedule(); return true; }
  // timetable: run (trapezoid speed: ACC s to accelerate / brake) to the next station, dwell, repeat - a pure function of the wall clock, same for everyone
  const OBS = 9.2 + GAP + 6 + GAP + 11 + GAP + 5; let SCH = [], PERIOD = 1;
  function buildSchedule() { SCH = []; let t = 0; for (let k = 0; k < STATIONS.length; k++) { const a = STATIONS[k].s + OBS, b = STATIONS[(k + 1) % STATIONS.length].s + OBS + (k + 1 === STATIONS.length ? L : 0), d = b - a, Tm = d / SPEED + ACC;
      SCH.push({ k, t0: t, Tm, a, d }); t += Tm + DWELL; } PERIOD = t; }
  function sched(now) { const t = ((now / 1000) % PERIOD + PERIOD) % PERIOD; for (const g of SCH) { if (t < g.t0 || t >= g.t0 + g.Tm + DWELL) continue; const u = t - g.t0, v = SPEED, ta = ACC;
      if (u >= g.Tm) return { s: (g.a + g.d) % L, v: 0, at: (g.k + 1) % STATIONS.length, left: g.Tm + DWELL - u, next: (g.k + 1) % STATIONS.length };
      const x = u < ta ? .5 * v / ta * u * u : u > g.Tm - ta ? g.d - .5 * v / ta * (g.Tm - u) ** 2 : v * ta / 2 + v * (u - ta); const sp = u < ta ? v * u / ta : u > g.Tm - ta ? v * (g.Tm - u) / ta : v;
      return { s: (g.a + x) % L, v: sp, at: -1, eta: g.Tm - u, next: (g.k + 1) % STATIONS.length }; } return { s: 0, v: 0, at: -1, next: 0 }; }
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
  // ---------- v77 tunnels + stations ----------
  function buildTunnels() { const rock = new THREE.MeshStandardMaterial({ color: 0x5a5148, roughness: 1, side: THREE.DoubleSide }), stone = new THREE.MeshStandardMaterial({ color: 0x8a7e6c, roughness: .95 }), dark = new THREE.MeshBasicMaterial({ color: 0x0c0a08, side: THREE.DoubleSide });
    const p = new THREE.Vector3(), t = new THREE.Vector3(), RN = 15, Wd = 3.4, Ht = 5.6;
    TUN.forEach(([a, b], ti) => { const pos = [], idx = []; for (let i = a; i <= b; i++) { at(path.cum[i], p, t); const rx = t.z, rz = -t.x, rl = Math.hypot(rx, rz) || 1;
        for (let k = 0; k < RN; k++) { const th = k / (RN - 1) * Math.PI, jit = ((i * 7 + k * 13) % 5) * .06; pos.push(p.x + rx / rl * Math.cos(th) * (Wd + jit), p.y - .45 + Math.sin(th) * (Ht + jit), p.z + rz / rl * Math.cos(th) * (Wd + jit)); }
        if (i > a) { const o = (i - a) * RN, q = o - RN; for (let k = 0; k < RN - 1; k++) idx.push(q + k, o + k, q + k + 1, q + k + 1, o + k, o + k + 1); } }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals(); const m = new THREE.Mesh(geo, rock); m.receiveShadow = true; m.frustumCulled = false; scene.add(m);
      for (const [i, dir] of [[a, -1], [b, 1]]) { at(path.cum[i], p, t); const yaw = Math.atan2(t.x, t.z), g = new THREE.Group(); g.position.copy(p); g.rotation.y = yaw; scene.add(g); // stone portal + a dark face so the hill closes round it
        for (const sx of [-Wd - .55, Wd + .55]) { const o = new THREE.Mesh(new THREE.BoxGeometry(1.1, Ht + .6, 1.4), stone); o.position.set(sx, Ht / 2 - .3, 0); g.add(o); } const lt = new THREE.Mesh(new THREE.BoxGeometry(Wd * 2 + 2.4, 1.2, 1.5), stone); lt.position.set(0, Ht + .5, 0); g.add(lt);
        const cv = document.createElement('canvas'); cv.width = 256; cv.height = 48; const x = cv.getContext('2d'); x.fillStyle = '#8a7e6c'; x.fillRect(0, 0, 256, 48); x.fillStyle = '#2a2016'; x.font = '900 28px Georgia'; x.textAlign = 'center'; x.fillText('TUNNEL No. ' + (ti + 1) + ' · ' + (1880 + ti * 3), 128, 33); const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace;
        const pl = new THREE.Mesh(new THREE.PlaneGeometry(4.2, .8), new THREE.MeshStandardMaterial({ map: tx })); pl.position.set(0, Ht + .5, -dir * .76); pl.rotation.y = dir > 0 ? 0 : Math.PI; g.add(pl);
        const face = new THREE.Shape(); face.moveTo(-14, -2); face.lineTo(14, -2); face.lineTo(14, 16); face.lineTo(-14, 16); face.closePath(); const hole = new THREE.Path(); hole.moveTo(-Wd, -.45); for (let k = 0; k <= 16; k++) { const th = k / 16 * Math.PI; hole.lineTo(-Math.cos(th) * Wd, -.45 + Math.sin(th) * Ht); } hole.lineTo(Wd, -.45); face.holes.push(hole);
        const fm = new THREE.Mesh(new THREE.ShapeGeometry(face), rock); fm.position.z = dir * .3; g.add(fm); } });
    return TUN.length; }
  function buildStations() { const T = H.town2; const p = new THREE.Vector3(), t = new THREE.Vector3(); const wood = new THREE.MeshStandardMaterial({ color: 0x6a4a2c, roughness: .85 }), dk = new THREE.MeshStandardMaterial({ color: 0x3a2818, roughness: .8 }), roof = new THREE.MeshStandardMaterial({ color: 0x7a2a1e, roughness: .7 }), lampM = new THREE.MeshStandardMaterial({ color: 0x222, emissive: 0xffd08a, emissiveIntensity: 2 });
    STATIONS.forEach((st, k) => { at(st.s, p, t); const side = new THREE.Vector3(t.z, 0, -t.x).normalize(), c = p.clone().addScaledVector(side, 3.25), g = new THREE.Group(); g.position.copy(c); g.rotation.y = Math.atan2(t.x, t.z); scene.add(g); const gy = hAt(c.x, c.z), deckY = Math.max(p.y + .6, gy + .25) - c.y;
      const deck = new THREE.Mesh(new THREE.BoxGeometry(3, .2, 26), wood); deck.position.y = deckY; deck.receiveShadow = deck.castShadow = true; g.add(deck); const edge = new THREE.Mesh(new THREE.BoxGeometry(.25, .22, 26), new THREE.MeshStandardMaterial({ color: 0xd8c070 })); edge.position.set(-1.4, deckY + .01, 0); g.add(edge);
      const hh = Math.max(.3, deckY - (gy - c.y)); for (const z of [-12, -6, 0, 6, 12]) for (const x of [-1.3, 1.3]) { const o = new THREE.Mesh(new THREE.BoxGeometry(.25, hh, .25), dk); o.position.set(x, deckY - hh / 2, z); g.add(o); }
      { const up = deckY - (gy - c.y); if (up > .35) { const n = Math.ceil(up / .22), run = .3; for (let k = 0; k < n; k++) { const st2 = new THREE.Mesh(new THREE.BoxGeometry(1.6, .08, run + .02), wood); st2.position.set(.4, deckY - (k + 1) * (up / n) + .04, 13 + (k + .5) * run); g.add(st2); const rs = new THREE.Mesh(new THREE.BoxGeometry(1.6, up / n, .05), dk); rs.position.set(.4, deckY - (k + .5) * (up / n), 13 + k * run); g.add(rs); }
        for (const sx of [-.42, 1.22]) { const len = Math.hypot(n * run, up), rl = new THREE.Mesh(new THREE.BoxGeometry(.06, .06, len), dk); rl.position.set(sx, deckY - up / 2 + .9, 13 + n * run / 2); rl.rotation.x = Math.atan2(up, n * run); g.add(rl); } } } // v82: stairs down to the ground
      for (const z of [-5, 5]) { const o = new THREE.Mesh(new THREE.BoxGeometry(.18, 3, .18), dk); o.position.set(1.2, deckY + 1.5, z); g.add(o); } const rf = new THREE.Mesh(new THREE.BoxGeometry(3.4, .14, 12), roof); rf.position.set(0, deckY + 3.05, 0); rf.rotation.z = -.12; g.add(rf);
      const cv = document.createElement('canvas'); cv.width = 512; cv.height = 96; const x = cv.getContext('2d'); x.fillStyle = '#efe2c0'; x.fillRect(0, 0, 512, 96); x.strokeStyle = '#3a2818'; x.lineWidth = 8; x.strokeRect(4, 4, 504, 88); x.fillStyle = '#2a1c10'; x.font = '900 52px Georgia'; x.textAlign = 'center'; x.fillText(st.name.toUpperCase(), 256, 66);
      const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; const sg = new THREE.Mesh(new THREE.BoxGeometry(.1, .7, 3.7), [dk, dk, dk, dk, new THREE.MeshStandardMaterial({ map: tx }), new THREE.MeshStandardMaterial({ map: tx })]); sg.position.set(1.2, deckY + 2.5, 0); sg.rotation.y = Math.PI / 2; g.add(sg);
      for (const z of [-10, 10]) { const pole = new THREE.Mesh(new THREE.CylinderGeometry(.06, .08, 2.8, 8), dk); pole.position.set(-.9, deckY + 1.4, z); g.add(pole); const lp = new THREE.Mesh(new THREE.BoxGeometry(.32, .4, .32), lampM); lp.position.set(-.9, deckY + 2.9, z); g.add(lp); }
      const bench = new THREE.Mesh(new THREE.BoxGeometry(.5, .45, 3), wood); bench.position.set(1, deckY + .32, -2.5); g.add(bench); const bb = new THREE.Mesh(new THREE.BoxGeometry(.1, .5, 3), wood); bb.position.set(1.25, deckY + .7, -2.5); g.add(bb);
      g.traverse(o => { if (o.isMesh) o.castShadow = true; }); try { mergeStatic(g); } catch (_) {} H.cullAdd && H.cullAdd(g, 380); // v109: one draw per material + hidden when far
      st.plat = c.clone(); st.side = side; st.deckY = c.y + deckY; st.spot = { x: c.x, y: gy, z: c.z, kind: 'train', label: '🚂 ' + st.name + ' station', r: 4.5, st: k }; if (T && T.spots) T.spots.push(st.spot); });
    if (T) { const prev = T.onUse; T.onUse = o => (o && o.kind === 'train') ? (platformUse(o.st), true) : (prev ? prev(o) : false); } }
  // ---------- v77 riding as a passenger ----------
  let pass = null, lastAt = -2;
  function untilAt(k) { const now = Date.now() / 1000, t = ((now % PERIOD) + PERIOD) % PERIOD; const g = SCH.find(q => (q.k + 1) % STATIONS.length === k); if (!g) return 0; let arr = g.t0 + g.Tm; let dt = arr - t; if (dt < -DWELL) dt += PERIOD; return Math.max(0, dt); }
  function platformUse(k) { const S0 = sched(Date.now()); if (S0.at === k) { boardP(); return; } const w = Math.round(untilAt(k)); msg(`🚂 Next train at ${STATIONS[k].name} in ${w >= 60 ? Math.floor(w / 60) + ' min ' + (w % 60) + ' s' : w + ' s'}`, 2.5); }
  function boardP() { if (heist || pass) return; if (H.dismountNow) H.dismountNow(); const car = cars.find(c => c.kind === 'open'); pass = { car, off: (Math.random() - .5) * 5, side: Math.random() < .5 ? -.95 : .95 }; H.trainRide = rideP; H.trainUse = useP; H.onTrain = true;
    const S0 = sched(Date.now()); msg(`🚂 All aboard! Next stop: ${STATIONS[(S0.at + 1) % STATIONS.length].name}.  USE at a station to get off · JUMP to leap off`, 4); whistle(); }
  function rideP(dt) { const c = pass.car; tmp.set(pass.side, 1.47, pass.off).applyQuaternion(c.g.quaternion).add(c.g.position); P.pos.copy(tmp); if (input && input.jump) leaveP(null, true); if (H.dead) leaveP(); }
  function useP() { const S0 = sched(Date.now()); if (S0.at >= 0) { leaveP(STATIONS[S0.at]); return true; } msg('Between stations — wait for the next stop, or JUMP to leap off', 2); return true; }
  function leaveP(st, jump) { H.trainRide = null; H.trainUse = null; H.onTrain = false; const c = pass && pass.car; pass = null;
    if (st) { const x = st.plat.x + st.side.x * 2.4, z = st.plat.z + st.side.z * 2.4; P.pos.set(x, hAt(x, z), z); msg('🚉 ' + st.name + ' — whistle (Z) for your horse', 3); }
    else if (c) { tan.set(0, 0, 1).applyQuaternion(c.g.quaternion); const x = c.g.position.x - tan.z * 3.8, z = c.g.position.z + tan.x * 3.8; P.pos.set(x, hAt(x, z), z); if (jump) msg('You leap clear of the train', 2); } }
  function passTick() { if (!STATIONS.length) return; const S0 = sched(Date.now()); if (pass) { if (S0.at >= 0 && lastAt !== S0.at) msg(`🚉 ${STATIONS[S0.at].name} — USE to get off`, 3); else if (S0.at < 0 && lastAt >= 0) msg(`🚂 Next stop: ${STATIONS[S0.next].name}`, 2.5); }
    for (const [k, st] of STATIONS.entries()) if (st.spot) st.spot.label = S0.at === k ? '🚂 Board the train (' + Math.ceil(S0.left) + ' s)' : '🚉 ' + st.name + ' · next train ' + (() => { const w = Math.round(untilAt(k)); return w >= 60 ? Math.floor(w / 60) + ' min' : w + ' s'; })();
    if (S0.at !== lastAt && (S0.at >= 0 || lastAt >= 0)) { const dl = Math.hypot(P.pos.x - cars[0].g.position.x, P.pos.z - cars[0].g.position.z); if (dl < 300) whistle(); } lastAt = S0.at; }
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
      else if (kind === 'open') { ws = wheelsFor(g, len); B(g, 2.7, .3, len, M.wood, 0, 1.3, 0); B(g, 2.8, .12, len, M.black, 0, 1.12, 0); B(g, 2.9, .14, len + .3, M.red, 0, 3.95, 0); B(g, 2.6, .06, len, M.gold, 0, 3.85, 0); // v77 observation car: open sides, roof on posts
        for (const z of [-len / 2 + .2, -len / 6, len / 6, len / 2 - .2]) for (const sx of [-1.3, 1.3]) C(g, .06, 2.45, M.gold, sx, 2.65, z, 0);
        for (const sx of [-1.3, 1.3]) { B(g, .06, .06, len - .2, M.gold, sx, 2.35, 0); B(g, .04, .04, len - .2, M.gold, sx, 1.95, 0); }
        B(g, .5, .42, len - 1.6, M.red, 0, 1.66, 0); B(g, .12, .55, len - 1.6, M.wood, 0, 2.1, 0); for (const sx of [-.5, .5]) B(g, .5, .08, len - 1.6, M.wood, sx * .45, 1.9, 0); // back-to-back bench facing out
        for (const z of [-len / 2 + .05, len / 2 - .05]) B(g, 2.6, .9, .06, M.wood, 0, 1.9, z); }
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
  function heistTick(dt) { if (!heist && pass) return; if (!heist) { const ex = cars[cars.length - 1], h = H.mounted; if (!h || !ready()) { alongT = 0; return; } const d = Math.hypot(h.pos.x - ex.g.position.x, h.pos.z - ex.g.position.z); if (d < 6 && Math.abs(H.speed || 0) > 8) { alongT += dt; if (alongT > 1.2) { alongT = 0; board(ex); } } else alongT = 0; return; }
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
  function update(dt) { if (!built) { if (!H.places) return; if (!plan()) return; buildTrack(); buildTunnels(); buildTrain(); buildStations(); built = true; H.trainPath = path; H.trainStations = STATIONS; }
    const SS = sched(Date.now()), s = SS.s, VNOW = SS.v; H.trainSched = SS; let off = 0; const pw = new THREE.Vector3(), pt = new THREE.Vector3();
    for (const c of cars) { const mid = s - off - c.len / 2; at(mid + c.len / 2 - 1, pw, pt); const front = pw.clone(); at(mid - c.len / 2 + 1, pw, pt); const back = pw.clone(); c.g.position.copy(front).add(back).multiplyScalar(.5); c.g.lookAt(tmp.copy(front).add(c.g.position).sub(back));
      for (const w of c.ws) w.rotation.x -= VNOW * dt / .7; off += c.len + GAP; }
    const loco = cars[0]; H.trainPos = [loco.g.position.x, loco.g.position.z]; const dl = Math.hypot(P.pos.x - loco.g.position.x, P.pos.z - loco.g.position.z);
    sT -= dt; if (sT <= 0 && dl < 400) { sT = .12; tmp.set(0, 5.2, 3.1).applyQuaternion(loco.g.quaternion).add(loco.g.position); sp.set([tmp.x, tmp.y, tmp.z], si * 3); sAge[si] = 0; si = (si + 1) % SN; }
    for (let i = 0; i < SN; i++) { sAge[i] += dt; sp[i * 3 + 1] += dt * 2.2; } sg.attributes.position.needsUpdate = true; smoke.material.size = 4.5;
    wT -= dt; if (wT <= 0) { wT = 25 + Math.random() * 20; if (dl < 260 && VNOW > 1) whistle(); }
    passTick(); heistTick(dt); }
  return { update, get stations() { return STATIONS; }, get tunnels() { return TUN.length; }, sched: () => sched(Date.now()), boardP, get passenger() { return !!pass; }, get guards() { return guards; }, get heist() { return heist; }, get cars() { return cars; }, get length() { return L; }, board: () => cars.length && board(cars[cars.length - 1]) };
}
