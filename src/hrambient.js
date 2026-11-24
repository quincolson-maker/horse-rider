// v113 AMBIENT LIFE: tumbleweeds bounce across the range downwind (more of them in dust storms), and vultures
// circle high above wherever the dead are thick. Both are instanced meshes (one draw call each) that follow
// the player, and they're skipped in town and the saloon.
import * as THREE from 'three';
export function createAmbient({ scene, H, P, hAt, mobile }) {
  const NT = mobile ? 6 : 12, NV = mobile ? 4 : 7;
  // tumbleweed: a twiggy icosahedron (wireframe-ish look via a noisy displaced shell)
  const tg = new THREE.IcosahedronGeometry(.45, 1); { const p = tg.attributes.position; for (let i = 0; i < p.count; i++) { const k = .75 + Math.random() * .45; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k); } tg.computeVertexNormals(); }
  const tm = new THREE.MeshStandardMaterial({ color: 0x9a7a4a, roughness: 1, wireframe: true });
  const TW = new THREE.InstancedMesh(tg, tm, NT); TW.frustumCulled = false; TW.castShadow = !mobile; scene.add(TW);
  // vulture: two swept wings + body as one merged geometry
  const vg = (() => { const w = new THREE.BufferGeometry(), v = new Float32Array([0, 0, .3, -1.1, .1, -.1, 0, 0, -.25, 0, 0, .3, 0, 0, -.25, 1.1, .1, -.1, 0, .05, .45, -.08, 0, -.4, .08, 0, -.4]); w.setAttribute('position', new THREE.BufferAttribute(v, 3)); w.computeVertexNormals(); return w; })();
  const VW = new THREE.InstancedMesh(vg, new THREE.MeshStandardMaterial({ color: 0x1a1612, roughness: .9, side: THREE.DoubleSide }), NV); VW.frustumCulled = false; scene.add(VW);
  const tw = Array.from({ length: NT }, () => ({ x: 0, z: 0, y: 0, vy: 0, rot: Math.random() * 6, life: 0 })), vu = Array.from({ length: NV }, (_, i) => ({ a: i / NV * 6.28, r: 14 + Math.random() * 18, h: 38 + Math.random() * 20, sp: .12 + Math.random() * .1, cx: 0, cz: 0 }));
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), S = new THREE.Vector3(1, 1, 1), V = new THREE.Vector3();
  let wind = Math.random() * 6.28, t = 0, vc = null;
  const hidden = () => (H.saloon && H.saloon.inside && H.saloon.inside()) || (H.zombies && H.zombies.inSafeZone && H.zombies.inSafeZone(P.pos.x, P.pos.z) === 'town');
  function respawn(o, first) { const d = first ? 10 + Math.random() * 50 : 45 + Math.random() * 15, side = (Math.random() - .5) * 70, wx = Math.sin(wind), wz = Math.cos(wind);
    o.x = P.pos.x - wx * d + wz * side; o.z = P.pos.z - wz * d - wx * side; o.y = hAt(o.x, o.z) + .45; o.vy = 0; o.life = 14 + Math.random() * 10; o.s = .7 + Math.random() * .6; }
  for (const o of tw) respawn(o, true);
  function update(dt) { t += dt; wind += Math.sin(t * .05) * dt * .02; const dust = (H.wx && H.wx.dust) || 0, hide = hidden(); TW.visible = VW.visible = !hide; if (hide) return;
    const spd = 3 + dust * 7, wx = Math.sin(wind), wz = Math.cos(wind), act = Math.round(NT * (.45 + .55 * dust));
    tw.forEach((o, i) => { if (i >= act) { M.makeScale(0, 0, 0); TW.setMatrixAt(i, M); return; } o.life -= dt; o.x += wx * spd * dt; o.z += wz * spd * dt; const g = hAt(o.x, o.z) + .45 * o.s; o.vy -= 9.8 * dt; o.y += o.vy * dt; if (o.y < g) { o.y = g; o.vy = 1.5 + Math.random() * 2.5 * (1 + dust); } o.rot += spd * dt / (.45 * o.s);
      if (o.life <= 0 || Math.hypot(o.x - P.pos.x, o.z - P.pos.z) > 80) respawn(o); E.set(o.rot * wz, 0, -o.rot * wx); Q.setFromEuler(E); S.setScalar(o.s); M.compose(V.set(o.x, o.y, o.z), Q, S); TW.setMatrixAt(i, M); }); TW.instanceMatrix.needsUpdate = true;
    // vultures: circle over the thickest knot of the dead nearby (or lazily over the player)
    if ((t | 0) % 3 === 0 || !vc) { let bx = P.pos.x, bz = P.pos.z, n = 0; const Z = H.zombies; if (Z) for (const o of Z.list) if (o.alive && Math.hypot(o.pos.x - P.pos.x, o.pos.z - P.pos.z) < 120) { bx += o.pos.x; bz += o.pos.z; n++; } vc = [bx / (n + 1), bz / (n + 1)]; }
    vu.forEach((o, i) => { o.cx += (vc[0] - o.cx) * Math.min(1, dt * .1); o.cz += (vc[1] - o.cz) * Math.min(1, dt * .1); o.a += o.sp * dt; const x = o.cx + Math.cos(o.a) * o.r, z = o.cz + Math.sin(o.a) * o.r, y = hAt(o.cx, o.cz) + o.h + Math.sin(t * .4 + i) * 2;
      E.set(0, -o.a, .35 + Math.sin(t * 1.3 + i) * .08); Q.setFromEuler(E); S.setScalar(1.3); M.compose(V.set(x, y, z), Q, S); VW.setMatrixAt(i, M); }); VW.instanceMatrix.needsUpdate = true; }
  for (const o of vu) { o.cx = P.pos.x; o.cz = P.pos.z; }
  // v127 night: shooting stars streak across the sky, and coyotes howl in the distance
  const starM = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }), star = new THREE.Mesh(new THREE.CylinderGeometry(.0, .35, 26, 5, 1, true), starM); star.frustumCulled = false; scene.add(star);
  let starT = 12, sk = null, howlT = 25; const sfx = window.__sfx;
  function night(dt) { const n = H.night || 0; starT -= dt; if (n > .7 && starT <= 0 && !sk) { starT = 18 + Math.random() * 30; const a = Math.random() * 6.28, d = 380; sk = { t: 0, p: new THREE.Vector3(P.pos.x + Math.cos(a) * d, P.pos.y + 230 + Math.random() * 80, P.pos.z + Math.sin(a) * d), v: new THREE.Vector3(Math.cos(a + 1.9), -.35, Math.sin(a + 1.9)).normalize().multiplyScalar(260) }; }
    if (sk) { sk.t += dt; sk.p.addScaledVector(sk.v, dt); star.position.copy(sk.p); star.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), sk.v.clone().normalize()); starM.opacity = Math.sin(Math.min(1, sk.t / .9) * Math.PI) * .9; if (sk.t > .9) { sk = null; starM.opacity = 0; } }
    howlT -= dt; if (n > .6 && howlT <= 0) { howlT = 40 + Math.random() * 50; if (!hidden() && sfx && sfx.ctx && sfx.tone) { const b = 480 + Math.random() * 120; sfx.tone('sine', b, b * 1.45, 1.1, .05); setTimeout(() => sfx.tone('sine', b * 1.45, b * 1.1, 1.6, .045), 1000); setTimeout(() => sfx.tone('sine', b * 1.3, b * 1.5, .9, .03), 2300); } } }
  // v141 fireworks over town: about every 8 minutes of deep night when you're within 300 m of town, a short show of rockets + bursts
  const FN = 64, FB = 6, fpos = new Float32Array(FN * FB * 3), fcol = new Float32Array(FN * FB * 3), fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.BufferAttribute(fpos, 3)); fg.setAttribute('color', new THREE.BufferAttribute(fcol, 3));
  const fm = new THREE.PointsMaterial({ size: 2.2, vertexColors: true, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, sizeAttenuation: true }), FW = new THREE.Points(fg, fm); FW.frustumCulled = false; FW.visible = false; scene.add(FW);
  const bursts = Array.from({ length: FB }, () => ({ t: -1, p: new THREE.Vector3(), v: [], c: new THREE.Color() })); let fwT = 120, show = 0, nextB = 0;
  const PAL = [0xff4a5a, 0xffd34a, 0x4ac8ff, 0x7aff6a, 0xff7ae0, 0xffffff];
  function fireworks(dt) { const town = H.places && H.places.town; if (!town) return; const near = Math.hypot(P.pos.x - town[0], P.pos.z - town[1]) < 300; fwT -= dt;
    if ((H.night || 0) > .85 && near && fwT <= 0 && !show) { show = 14; fwT = 480; nextB = 0; }
    if (show > 0) { show -= dt; nextB -= dt; if (nextB <= 0 && show > 2) { nextB = .7 + Math.random() * .9; const b = bursts.find(q => q.t < 0) || bursts[0]; b.t = 0; b.p.set(town[0] + (Math.random() - .5) * 40, hAt(town[0], town[1]) + 45 + Math.random() * 25, town[1] + (Math.random() - .5) * 40); b.c.setHex(PAL[(Math.random() * PAL.length) | 0]);
        b.v = Array.from({ length: FN }, () => { const u = Math.random() * 2 - 1, a = Math.random() * 6.28, r = Math.sqrt(1 - u * u), sp = 14 + Math.random() * 6; return [r * Math.cos(a) * sp, u * sp, r * Math.sin(a) * sp]; }); if (sfx && sfx.ctx && sfx.nz) setTimeout(() => sfx.nz('lowpass', 700, 1, .25, .35), 600); } }
    let any = false; bursts.forEach((b, j) => { for (let i = 0; i < FN; i++) { const k = (j * FN + i) * 3; if (b.t < 0) { fpos[k + 1] = -1e5; continue; } const v = b.v[i], t = b.t; fpos[k] = b.p.x + v[0] * t; fpos[k + 1] = b.p.y + v[1] * t - 4.9 * t * t; fpos[k + 2] = b.p.z + v[2] * t; const f = Math.max(0, 1 - t / 2.2); fcol[k] = b.c.r * f; fcol[k + 1] = b.c.g * f; fcol[k + 2] = b.c.b * f; }
      if (b.t >= 0) { any = true; b.t += dt; if (b.t > 2.2) b.t = -1; } }); FW.visible = any; if (any) { fg.attributes.position.needsUpdate = true; fg.attributes.color.needsUpdate = true; } }
  // v167 chickens peck around your ranch yard (instanced bodies + heads; only drawn when you're near the ranch)
  const NC = 6, cb = new THREE.SphereGeometry(.16, 8, 6); cb.scale(1, .85, 1.25); const CH = new THREE.InstancedMesh(cb, new THREE.MeshStandardMaterial({ color: 0xf2ece0, roughness: .9 }), NC), CR = new THREE.InstancedMesh(new THREE.ConeGeometry(.04, .1, 5), new THREE.MeshStandardMaterial({ color: 0xc8201a }), NC); CH.visible = CR.visible = false; CH.frustumCulled = CR.frustumCulled = false; scene.add(CH, CR);
  const hens = Array.from({ length: NC }, (_, i) => ({ a: i, x: 0, z: 0, tx: 0, tz: 0, t: 0, peck: 0 })); let henInit = false;
  function chickens(dt) { const R = H.ranchPos; const on = !!R && Math.hypot(P.pos.x - R[0], P.pos.z - R[1]) < 90; CH.visible = CR.visible = on; if (!on) return; const cx = R[0] + 5, cz = R[1] + 5;
    hens.forEach((c, i) => { if (!henInit) { c.x = c.tx = cx + (Math.random() - .5) * 8; c.z = c.tz = cz + (Math.random() - .5) * 8; } c.t -= dt; if (c.t <= 0) { c.t = 1 + Math.random() * 3; if (Math.random() < .5) { c.tx = cx + (Math.random() - .5) * 10; c.tz = cz + (Math.random() - .5) * 10; } else c.peck = 1.2; }
      const dx = c.tx - c.x, dz = c.tz - c.z, d = Math.hypot(dx, dz); if (d > .1 && c.peck <= 0) { c.x += dx / d * 1.2 * dt; c.z += dz / d * 1.2 * dt; c.a = Math.atan2(dx, dz); } c.peck = Math.max(0, c.peck - dt);
      const y = hAt(c.x, c.z) + .2, bob = c.peck > 0 ? Math.abs(Math.sin(c.peck * 14)) * .08 : 0; E.set(c.peck > 0 ? .5 : 0, c.a, 0); Q.setFromEuler(E); S.setScalar(1); M.compose(V.set(c.x, y, c.z), Q, S); CH.setMatrixAt(i, M);
      M.compose(V.set(c.x + Math.sin(c.a) * .16, y + .15 - bob, c.z + Math.cos(c.a) * .16), Q, S); CR.setMatrixAt(i, M); }); henInit = true; CH.instanceMatrix.needsUpdate = CR.instanceMatrix.needsUpdate = true; }
  // v171 high-country snow: above ~150 m the air fills with drifting flakes (one Points draw around the camera)
  const SN = mobile ? 500 : 1400, spos = new Float32Array(SN * 3), sg = new THREE.BufferGeometry(); for (let i = 0; i < SN; i++) { spos[i * 3] = (Math.random() - .5) * 60; spos[i * 3 + 1] = Math.random() * 30; spos[i * 3 + 2] = (Math.random() - .5) * 60; } sg.setAttribute('position', new THREE.BufferAttribute(spos, 3));
  const SM = new THREE.PointsMaterial({ color: 0xffffff, size: .14, transparent: true, opacity: 0, depthWrite: false }), SNOW = new THREE.Points(sg, SM); SNOW.frustumCulled = false; scene.add(SNOW); let snowK = 0;
  function snow(dt) { const hi = P.pos.y > 150 && !hidden(); snowK += ((hi ? 1 : 0) - snowK) * Math.min(1, dt * .5); SM.opacity = snowK * .85; SNOW.visible = snowK > .02; if (!SNOW.visible) return; SNOW.position.set(P.pos.x, P.pos.y - 8, P.pos.z);
    for (let i = 0; i < SN; i++) { let y = spos[i * 3 + 1] - dt * (1.2 + (i % 5) * .2); if (y < 0) y += 30; spos[i * 3 + 1] = y; spos[i * 3] += Math.sin(t * .7 + i) * dt * .3; } sg.attributes.position.needsUpdate = true; }
  return { update(dt) { update(dt); night(dt); fireworks(dt); chickens(dt); snow(dt); }, fireworks: () => { fwT = 0; H.night = Math.max(H.night || 0, .9); } };
}
