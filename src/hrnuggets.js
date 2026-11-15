// v43 GOLD NUGGETS: 40 glinting nuggets hidden across the range (the same spots on every machine), +100 pts each.
// One instanced mesh for all of them; found ones are remembered per rider in localStorage.
import * as THREE from 'three';
export const NUGGET_N = 40, NUGGET_PTS = 100;
export function createNuggets({ scene, H, P, hAt, WALK, sfx, msg }) {
  let found = new Set(); try { found = new Set(JSON.parse(localStorage.getItem('hr_nuggets') || '[]')); } catch (_) {}
  const save = () => { try { localStorage.setItem('hr_nuggets', JSON.stringify([...found])); } catch (_) {} };
  let seed = 7771; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const geo = new THREE.IcosahedronGeometry(.22, 0); { const p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const k = .75 + .5 * Math.abs(Math.sin(i * 12.9898)); p.setXYZ(i, p.getX(i) * k * 1.25, p.getY(i) * k * .8, p.getZ(i) * k); } geo.computeVertexNormals(); }
  const mat = new THREE.MeshStandardMaterial({ color: 0xffc23a, metalness: .85, roughness: .28, emissive: 0x6a4200, emissiveIntensity: .6 });
  const mesh = new THREE.InstancedMesh(geo, mat, NUGGET_N); mesh.frustumCulled = false; mesh.count = 0; scene.add(mesh);
  const glow = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,240,170,1)'); gr.addColorStop(.25, 'rgba(255,200,60,.55)'); gr.addColorStop(1, 'rgba(255,180,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    g.strokeStyle = 'rgba(255,255,230,.9)'; g.lineWidth = 2; g.beginPath(); g.moveTo(32, 4); g.lineTo(32, 60); g.moveTo(4, 32); g.lineTo(60, 32); g.stroke(); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const spark = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ map: glow, size: 1.1, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: .9 }));
  spark.frustumCulled = false; scene.add(spark);
  const spots = []; let built = false; const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), s3 = new THREE.Vector3(1, 1, 1);
  function ok(x, z) { const Z = H.zombies; if (Z && Z.goodGround) return Z.goodGround(x, z); const h = hAt(x, z); return Math.abs(hAt(x + 1.5, z) - h) < 1 && Math.abs(hAt(x, z + 1.5) - h) < 1; }
  function build() { built = true; const W = (WALK || 600) - 20;
    for (let i = 0, tries = 0; spots.length < NUGGET_N && tries < 4000; tries++) { const x = (rnd() * 2 - 1) * W, z = (rnd() * 2 - 1) * W; if (!ok(x, z) || spots.some(s => Math.hypot(s.x - x, s.z - z) < 45)) continue; spots.push({ id: spots.length, x, z, y: hAt(x, z) + .12, r: rnd() * 6.28 }); }
    refresh(); }
  function refresh() { let n = 0; const pos = []; for (const s of spots) { if (found.has(s.id)) continue; e.set(.3, s.r, .2); q.setFromEuler(e); v.set(s.x, s.y, s.z); m4.compose(v, q, s3); mesh.setMatrixAt(n++, m4); pos.push(s.x, s.y + .35, s.z); }
    mesh.count = n; mesh.instanceMatrix.needsUpdate = true; spark.geometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); spark.geometry.computeBoundingSphere(); }
  let t = 0;
  function update(dt) { if (!built) { if (!H.places) return; build(); } t += dt; spark.material.size = .9 + .45 * Math.abs(Math.sin(t * 2.6)); mat.emissiveIntensity = .45 + .35 * Math.abs(Math.sin(t * 2.6));
    const px = (H.mounted ? H.mounted.pos : P.pos).x, pz = (H.mounted ? H.mounted.pos : P.pos).z, py = (H.mounted ? H.mounted.pos : P.pos).y, R = H.mounted ? 2.6 : 1.7;
    for (const s of spots) { if (found.has(s.id) || Math.abs(s.x - px) > R || Math.abs(s.z - pz) > R || Math.abs(s.y - py) > 3) continue; if (Math.hypot(s.x - px, s.z - pz) > R) continue;
      found.add(s.id); save(); refresh(); const g = H.guns && H.guns.state; if (g) { g.score += NUGGET_PTS; H.guns.save && H.guns.save(); } H.lb && H.lb.add(NUGGET_PTS);
      msg && msg(`Gold nugget! +${NUGGET_PTS} pts  (${found.size} / ${NUGGET_N})`, 2.2); if (sfx && sfx.ctx && sfx.tone) [1568, 2093, 2637].forEach((f, i) => setTimeout(() => sfx.tone('sine', f, f, .18, .14), i * 70)); } }
  return { update, get found() { return found.size; }, total: NUGGET_N, spots, nearest() { let b = null, bd = 1e9; for (const s of spots) { if (found.has(s.id)) continue; const d = Math.hypot(s.x - P.pos.x, s.z - P.pos.z); if (d < bd) { bd = d; b = s; } } return b; } };
}
