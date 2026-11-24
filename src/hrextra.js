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

  // v217 WANTED POSTER: crack the store safe and your poster goes up on the saloon front; the reward climbs with every job
  add(() => { let shown = -1, mesh = null; const tex = document.createElement('canvas'); tex.width = 256; tex.height = 352; const ct = new THREE.CanvasTexture(tex); ct.colorSpace = THREE.SRGBColorSpace;
    function draw(n) { const x = tex.getContext('2d'); x.fillStyle = '#e8d6a8'; x.fillRect(0, 0, 256, 352); for (let i = 0; i < 400; i++) { x.fillStyle = `rgba(120,90,40,${Math.random() * .12})`; x.fillRect(Math.random() * 256, Math.random() * 352, 2 + Math.random() * 6, 2 + Math.random() * 6); }
      x.strokeStyle = '#3a2414'; x.lineWidth = 5; x.strokeRect(8, 8, 240, 336); x.fillStyle = '#3a2414'; x.textAlign = 'center'; x.font = 'bold 54px Georgia,serif'; x.fillText('WANTED', 128, 66); x.font = 'bold 18px Georgia,serif'; x.fillText('DEAD OR ALIVE', 128, 92);
      x.fillStyle = '#c9b48a'; x.fillRect(58, 106, 140, 124); x.fillStyle = '#3a2414'; x.beginPath(); x.arc(128, 150, 26, 0, 7); x.fill(); x.fillRect(84, 186, 88, 44); x.fillRect(80, 118, 96, 12); x.fillRect(100, 100, 56, 22);
      x.font = 'bold 20px Georgia,serif'; x.fillText('THE SAFECRACKER', 128, 258); x.font = '14px Georgia,serif'; x.fillText(`for ${n} job${n === 1 ? '' : 's'} on the General Store`, 128, 280); x.font = 'bold 34px Georgia,serif'; x.fillText('$' + (500 * n).toLocaleString(), 128, 322); ct.needsUpdate = true; }
    return () => { const n = (H.stats && H.stats.safes) || 0, T = H.town, s = T && T.town; if (!s || n === shown) return; shown = n; if (!n) return; draw(n);
      if (!mesh) { mesh = new THREE.Mesh(new THREE.PlaneGeometry(.62, .85), new THREE.MeshStandardMaterial({ map: ct, roughness: .95 })); const [wx, wz] = T.toW(s, -11.2, -.3); mesh.position.set(wx, s.y0 + 1.75, wz); mesh.rotation.set(0, s.rot + Math.PI, .04); mesh.name = 'wanted poster'; scene.add(mesh); H.cullAdd && H.cullAdd(mesh, 90, { x: wx, z: wz }); if (n > 0) msg('📜 Your WANTED poster just went up on the saloon front', 3); } }; });

  X.update = dt => { X.t += dt; for (const f of X.parts) f(dt); };
  return X;
}
