// v90 LASSO: buy it at the General Store, then throw it with T or the 🪢 button. It snags whatever you aim near, up to 20 m.
//  🧟 Zombies and outlaws are tied up for 7 s. Ride off while one is roped and you drag it behind your horse,
//     which hurts it, and anything it's dragged into takes a knock too.
//  🐎 A roped wild mustang stops bolting, so you can tame it from the saddle at up to 14 m.
// The rope is drawn with 24 instanced segments, so it's cheap on phones.
import * as THREE from 'three';
export function createLasso({ scene, H, P, camera, hAt, msg, sfx, mobile, input }) {
  const LS = 'hr_lasso', PRICE = 800, RANGE = 20, LEN = 7, HOLD = 7; let owned = false; try { owned = localStorage.getItem(LS) === '1'; } catch (_) {}
  const tone = (...a) => sfx && sfx.ctx && sfx.tone && sfx.tone(...a);
  const ropeM = new THREE.MeshStandardMaterial({ color: 0xc9a46a, roughness: .95 }), N = 24;
  const seg = new THREE.CylinderGeometry(.022, .022, 1, 5, 1); seg.translate(0, .5, 0);
  const rope = new THREE.InstancedMesh(seg, ropeM, N); rope.frustumCulled = false; rope.visible = false; scene.add(rope);
  const loop = new THREE.Mesh(new THREE.TorusGeometry(.42, .028, 6, 24), ropeM); loop.rotation.x = Math.PI / 2; loop.visible = false; scene.add(loop);
  const L = { state: 'idle', t: 0, cd: 0, tgt: null, kind: null, hold: 0, dragT: 0, from: new THREE.Vector3(), to: new THREE.Vector3(), miss: new THREE.Vector3() };
  const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), UP = new THREE.Vector3(0, 1, 0), A = new THREE.Vector3(), B = new THREE.Vector3(), D = new THREE.Vector3(), S = new THREE.Vector3();
  const hand = v => v.set(P.pos.x, P.pos.y + (H.mounted ? 1.05 : 1.45), P.pos.z);
  const tgtPos = (v, k, o) => k === 'mustang' ? v.set(o.g.position.x, o.g.position.y + 1.45, o.g.position.z) : v.set(o.pos.x, o.pos.y + (o.kind === 'crawler' ? .35 : 1.05 * (o.K ? o.K.s : 1)), o.pos.z);

  function pick() { const f = new THREE.Vector3(); camera.getWorldDirection(f); f.y = 0; f.normalize(); let best = null, bs = 1e9; const me = P.pos;
    const consider = (k, o, x, z, y) => { const dx = x - me.x, dz = z - me.z, d = Math.hypot(dx, dz); if (d > RANGE || d < .8 || Math.abs(y - me.y) > 6) return; const cos = (dx * f.x + dz * f.z) / d; if (cos < .86) return; const s = d * (2.2 - cos * 1.2); if (s < bs) { bs = s; best = { k, o }; } };
    const Z = H.zombies; if (Z) for (const o of Z.list) if (o.alive && o.kind !== 'boss' && !o.boss && !o.wantedName) consider('z', o, o.pos.x, o.pos.z, o.pos.y);
    const herd = H.wild && H.wild.herd; if (herd) for (const m of herd) if (!m.gone && m.g.visible) consider('mustang', m, m.g.position.x, m.g.position.z, m.g.position.y);
    return best; }
  function throwIt() { if (!owned) { msg('Buy a lasso at the General Store (800)', 2); return; } if (L.state !== 'idle' || L.cd > 0 || H.dead || H.uiOpen || (H.guns && H.guns.state.aiming && H.scoped)) return;
    if (L.tgt) release(); const p = pick(); L.state = 'fly'; L.t = 0; L.cd = 1.2; hand(L.from);
    if (p) { L.tgt = p.o; L.kind = p.k; } else { L.tgt = null; const f = new THREE.Vector3(); camera.getWorldDirection(f); f.y = 0; f.normalize(); L.miss.set(P.pos.x + f.x * 14, 0, P.pos.z + f.z * 14); L.miss.y = hAt(L.miss.x, L.miss.z) + .1; }
    tone('triangle', 260, 520, .25, .12); H.vib && H.vib(12); }
  function catchIt() { const o = L.tgt; L.state = 'held'; L.hold = HOLD; L.dragT = 0; tone('square', 180, 110, .12, .18); H.vib && H.vib(30);
    if (L.kind === 'z') { o.hold = true; o.lassoed = true; msg(o.kind === 'outlaw' ? '🪢 Outlaw roped!' : '🪢 Roped one! Ride off to drag it', 1.6); const s = H.stats || (H.stats = {}); s.lassos = (s.lassos || 0) + 1; }
    else { o.roped = 12; o.flee = 0; msg('🪢 Mustang roped — stay close to tame it', 2.4); } }
  function release() { const o = L.tgt; if (o && L.kind === 'z') { o.hold = false; o.lassoed = false; } L.tgt = null; L.state = 'idle'; rope.visible = loop.visible = false; }

  function drawRope(a, b, sag) { D.subVectors(b, a); const len = D.length(); let px = a.x, py = a.y, pz = a.z;
    for (let i = 0; i < N; i++) { const t1 = (i + 1) / N, x = a.x + D.x * t1, z = a.z + D.z * t1, y = a.y + D.y * t1 - Math.sin(t1 * Math.PI) * sag; A.set(px, py, pz); B.set(x, y, z); S.subVectors(B, A); const l = S.length() || .001;
      Q.setFromUnitVectors(UP, S.multiplyScalar(1 / l)); M4.compose(A, Q, new THREE.Vector3(1, l, 1)); rope.setMatrixAt(i, M4); px = x; py = y; pz = z; }
    rope.instanceMatrix.needsUpdate = true; rope.visible = true; return len; }

  function tick(dt) { L.cd = Math.max(0, L.cd - dt); if (btn) { const show = owned && !H.uiOpen && !H.dead; if (btn.hidden === show) btn.hidden = !show; }
    if (L.state === 'idle') return; hand(L.from);
    if (L.tgt && (L.kind === 'z' ? !L.tgt.alive : L.tgt.gone)) { release(); return; }
    if (L.state === 'fly') { L.t += dt / .38; const k = Math.min(1, L.t); if (L.tgt) tgtPos(L.to, L.kind, L.tgt); else L.to.copy(L.miss);
      B.lerpVectors(L.from, L.to, k); B.y += Math.sin(k * Math.PI) * 1.6; drawRope(L.from, B, .2); loop.position.copy(B); loop.rotation.z += dt * 18; loop.scale.setScalar(.6 + k * .5); loop.visible = true;
      if (k >= 1) { if (L.tgt) catchIt(); else { L.state = 'reel'; L.t = 0; } } return; }
    if (L.state === 'reel') { L.t += dt / .45; B.lerpVectors(L.miss, L.from, Math.min(1, L.t)); drawRope(L.from, B, .5 * (1 - L.t)); loop.position.copy(B); if (L.t >= 1) release(); return; }
    // held
    L.hold -= dt * (H.mounted && (H.speed || 0) > 2.5 ? .3 : 1); const o = L.tgt; // dragging keeps the knot tight longer tgtPos(L.to, L.kind, o); let d = Math.hypot(L.to.x - L.from.x, L.to.z - L.from.z);
    if (L.kind === 'z') { const pull = d - LEN; if (pull > 0 && H.mounted) { const ux = (L.from.x - o.pos.x) / d, uz = (L.from.z - o.pos.z) / d; o.pos.x += ux * pull; o.pos.z += uz * pull; o.pos.y = hAt(o.pos.x, o.pos.z); o.yaw = Math.atan2(-ux, -uz) + Math.PI; d = LEN;
        L.dragT += dt; if (L.dragT > .5 && (H.speed || 0) > 2.5) { L.dragT = 0; const Z = H.zombies; if (Z && Z.onHit) Z.onHit(o, 'lasso', false, o.pos.clone(), null, (8 + (H.speed || 0) * 1.2) / 50); // dragging hurts
          if (Z) for (const z of Z.list) if (z !== o && z.alive && Math.hypot(z.pos.x - o.pos.x, z.pos.z - o.pos.z) < 1.4) { z.push = [(z.pos.x - o.pos.x) * 2, (z.pos.z - o.pos.z) * 2]; z.flinch = 1; } } }
      else if (pull > 3) { release(); return; }
      o.g.rotation.x = H.mounted && pull > 0 && (H.speed || 0) > 2.5 ? -1.2 : 0; }
    else { o.roped = Math.max(o.roped || 0, .5); if (d > 16) { release(); msg('The rope slipped', 1.2); return; } }
    if (L.hold <= 0 && L.kind === 'z') { release(); return; } if (L.kind === 'mustang' && (!o.roped || o.gone)) { release(); return; }
    drawRope(L.from, L.to, Math.max(0, (LEN - d) * .25)); loop.position.copy(L.to); loop.rotation.z = 0; loop.scale.setScalar(L.kind === 'mustang' ? 1.1 : .75); loop.visible = true; }

  // input: L key, 🪢 touch button, store item
  addEventListener('keydown', e => { if (e.code === 'KeyT' && !e.repeat && !(e.target && /input|textarea/i.test(e.target.tagName))) throwIt(); });
  const btn = typeof document !== 'undefined' && document.getElementById('tLasso'); if (btn) btn.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); throwIt(); });
  const item = { state: { id: 'lasso', name: '🪢 Lasso · rope zombies, outlaws & wild mustangs (T)', price: PRICE, get owned() { return owned; }, maxed: false, get label() { return owned ? 'THROW (T)' : ''; } },
    buy() { const g = H.guns; if (g.pts() < PRICE) { msg('Not enough points', 1.5); return; } g.state.spent = (g.state.spent || 0) + PRICE; g.save(); owned = true; try { localStorage.setItem(LS, '1'); } catch (_) {} msg('🪢 Lasso bought — press T (or 🪢) to throw it at what you aim near', 3.5); },
    toggle() { msg('Aim near a zombie, outlaw or wild mustang and press T / 🪢', 2.2); } };
  return { tick, throw: throwIt, release, item, L, get owned() { return owned; }, give() { owned = true; } };
}
