// v216+ EXTRAS: small world features added in the 200-batch run. One module, one update hook.
import * as THREE from 'three';
export function createExtra({ scene, H, P, hAt, msg, sfx, mobile }) {
  const X = { t: 0, parts: [] }, add = f => { try { const u = f(); if (u) X.parts.push(u); } catch (e) { console.warn('extra', e); } };
  const inTown = () => (H.saloon && H.saloon.inside && H.saloon.inside()) || (H.zombies && H.zombies.inSafeZone && H.zombies.inSafeZone(P.pos.x, P.pos.z) === 'town');
  const ppos = () => (H.mounted ? H.mounted.pos : P.pos);

  // v216 DUST DEVILS: on clear days a twisting column of dust wanders the range; ride through one and it shoves you and stings your eyes
  add(() => {
    const N = 2, geo = new THREE.CylinderGeometry(2.2, .5, 16, 14, 8, true); geo.translate(0, 8, 0);
    { const p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i), a = y * .35, x = p.getX(i), z = p.getZ(i); p.setXZ(i, x * Math.cos(a) - z * Math.sin(a), x * Math.sin(a) + z * Math.cos(a)); } }
    const mat = new THREE.MeshBasicMaterial({ color: 0xc9a979, transparent: true, opacity: .0, depthWrite: false, side: THREE.DoubleSide });
    const devs = Array.from({ length: N }, () => { const m = new THREE.Mesh(geo, mat); m.frustumCulled = false; m.visible = false; scene.add(m); return { m, x: 0, z: 0, life: 0, vx: 0, vz: 0, cool: 20 + Math.random() * 40 }; });
    let shove = 0;
    return dt => { const n = H.night || 0, rain = H.wx ? (H.wx.rain || 0) : 0, ok = n < .35 && rain < .2 && !inTown(), pp = ppos();
      mat.opacity += ((ok ? .28 : 0) - mat.opacity) * Math.min(1, dt);
      for (const d of devs) { if (d.life <= 0) { d.m.visible = false; d.cool -= dt; if (d.cool <= 0 && ok) { const a = Math.random() * 6.28, r = 45 + Math.random() * 40; d.x = pp.x + Math.cos(a) * r; d.z = pp.z + Math.sin(a) * r; d.life = 25 + Math.random() * 20; d.cool = 30 + Math.random() * 60; d.vx = -Math.cos(a) * 2.2; d.vz = -Math.sin(a) * 2.2; } continue; }
        d.life -= dt; d.vx += (Math.random() - .5) * dt * 3; d.vz += (Math.random() - .5) * dt * 3; d.x += d.vx * dt; d.z += d.vz * dt; d.m.visible = mat.opacity > .02; d.m.position.set(d.x, hAt(d.x, d.z) - .3, d.z); d.m.rotation.y += dt * 6; const s = Math.min(1, d.life / 4, 1); d.m.scale.set(s, .6 + .4 * s, s);
        const dist = Math.hypot(pp.x - d.x, pp.z - d.z); if (dist < 3 && ok) { const k = dt * 6 * (1 - dist / 3); if (H.mounted) { H.mounted.pos.x += (pp.z - d.z) * k * .3; H.mounted.pos.z -= (pp.x - d.x) * k * .3; } else { P.pos.x += (pp.z - d.z) * k * .3; P.pos.z -= (pp.x - d.x) * k * .3; } H.shake = Math.max(H.shake || 0, .25); if ((shove -= dt) <= 0) { shove = 6; msg('🌪️ Dust devil!', 1.4); const st = H.stats || (H.stats = {}); st.devils = (st.devils || 0) + 1; if (sfx.nz && sfx.ctx) sfx.nz('bandpass', 600, .7, .25, 1.2); } } } };
  });

  X.update = dt => { X.t += dt; for (const f of X.parts) f(dt); };
  return X;
}
