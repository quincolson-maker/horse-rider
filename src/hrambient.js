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
  return { update };
}
