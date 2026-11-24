// v100 draw-call merge: under each parent node, fold the plain child meshes that share a material into one mesh.
// The merged mesh stays under that same parent, so animated rigs (doll arms, heads, fans) still move exactly as before.
// Meshes are left alone if they have children, a name, userData.keep, a multi-material, skinning / instancing,
// or a custom onBeforeRender (mirrors).
import * as THREE from 'three';
import { mergeGeometries } from '../addons/utils/BufferGeometryUtils.js?v=234';
const NOOP = THREE.Object3D.prototype.onBeforeRender;
const sig = g => Object.keys(g.attributes).sort().join(',') + (g.morphAttributes && Object.keys(g.morphAttributes).length ? '+m' : '');
export function mergeStatic(root, { minGroup = 2 } = {}) { if (!root) return 0; let saved = 0; const parents = [];
  root.traverse(o => { if (o.children && o.children.length > 1) parents.push(o); });
  for (const par of parents) { const groups = new Map();
    for (const o of par.children) { if (!o.isMesh || o.isSkinnedMesh || o.isInstancedMesh || o.children.length || o.name || (o.userData && o.userData.keep) || Array.isArray(o.material) || o.onBeforeRender !== NOOP || !o.visible || o.material.transparent && o.renderOrder) continue;
      const g = o.geometry; if (!g || !g.attributes.position || !g.attributes.normal) continue; const key = o.material.uuid + '|' + sig(g) + '|' + (o.castShadow ? 1 : 0) + (o.receiveShadow ? 1 : 0) + '|' + o.renderOrder;
      if (!groups.has(key)) groups.set(key, []); groups.get(key).push(o); }
    for (const list of groups.values()) { if (list.length < minGroup) continue; const gs = [];
      for (const o of list) { o.updateMatrix(); let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone(); g.applyMatrix4(o.matrix); for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(k)) g.deleteAttribute(k); gs.push(g); }
      let merged = null; try { merged = mergeGeometries(gs); } catch (_) { merged = null; } for (const g of gs) g.dispose(); if (!merged) continue;
      const m0 = list[0], mesh = new THREE.Mesh(merged, m0.material); mesh.castShadow = m0.castShadow; mesh.receiveShadow = m0.receiveShadow; mesh.renderOrder = m0.renderOrder; mesh.frustumCulled = m0.frustumCulled; mesh.userData.merged = list.length;
      for (const o of list) par.remove(o); par.add(mesh); saved += list.length - 1; } }
  return saved; }

// v109 distance culling for detail groups: hidden beyond maxD (checked a few at a time, so it costs nothing per frame)
export function createCuller(P) { const L = []; let i = 0;
  return { add(g, maxD, c) { if (g) L.push({ g, d2: maxD * maxD, c: c || null }); }, remove(g) { const i = L.findIndex(e => e.g === g); if (i >= 0) L.splice(i, 1); }, tick() { if (!L.length) return; for (let k = 0; k < 6; k++) { const e = L[i++ % L.length]; if (!e.c) { e.c = e.g.getWorldPosition(e.g.position.clone()); }
      const dx = e.c.x - P.pos.x, dz = e.c.z - P.pos.z, on = dx * dx + dz * dz < e.d2; if (e.g.visible !== on && !e.g.userData.cullLock) e.g.visible = on; } }, list: L }; }
