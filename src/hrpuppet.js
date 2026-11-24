// ---------------- v71 one look for everyone: NPCs wear the main rider model ----------------
// Every procedural Frontier character (townsfolk, sheriff, saloon bandits, card players, train guards, cave outlaws)
// keeps its own skeleton, AI and animation code; we hide its procedural body and hang a clone of the main rider
// model on it, driven bone-for-bone every frame:
//  - at setup both rigs are in rest pose; for each mapped bone we store an offset that turns the doll bone's rotation into
//    the rider bone's rotation AND swings the rider limb onto the doll limb's direction (so A-pose arms follow arms-down)
//  - each frame: riderRoot(bone) = dollRoot(bone) * offset, converted to local through the rider's own hierarchy
//  - hips height follows the doll (sitting works); a prop gun moves to the rider's hand
// Variety without new art: per-character clothing hue / saturation / value and skin tone, applied in the shader to the
// rider's own texture (skin-coloured texels keep their hue), plus the George repaint for some.
// Female characters (barmaid, dancers) keep their own models.
import * as THREE from 'three';
import { clone as cloneSkinned } from '../addons/utils/SkeletonUtils.js?v=99';

export const PENDING = []; // dolls made before the rider model has loaded
// v76: period palette - small hue nudges, mostly desaturating / darkening the farmer's clothes into browns, greys,
// faded blues, blacks and oxblood; skin is protected (wider mask) and only lightened/darkened
const LOOKS = [
  { hue: .0, sat: .55, val: .62, skin: .92 }, { hue: .02, sat: .25, val: .45, skin: .7 }, { hue: -.04, sat: .4, val: .55, skin: 1.05 }, { hue: .03, sat: .15, val: .38, skin: .55 },
  { hue: .0, sat: .7, val: .48, skin: .82 }, { hue: -.02, sat: .3, val: .7, skin: 1.1 }, { hue: .05, sat: .5, val: .4, skin: .62 }, { hue: .0, sat: .1, val: .3, skin: .95 },
  { hue: .0, sat: .5, val: .5, skin: .8, g: 1 }, { hue: .02, sat: .3, val: .62, skin: 1, g: 1 }, { hue: -.03, sat: .45, val: .42, skin: .6, g: 1 } ];
const SHERIFF = { hue: .05, sat: .35, val: .42, skin: .62 };
const matCache = new Map(); let georgeTex = null;
function lookMaterial(base, L) { const key = base.uuid + JSON.stringify(L); if (matCache.has(key)) return matCache.get(key);
  const m = base.clone(); if (L.g) { if (!georgeTex) { georgeTex = new THREE.TextureLoader().load('assets/horses/rider_george_1k.webp'); georgeTex.flipY = false; georgeTex.colorSpace = THREE.SRGBColorSpace; } m.map = georgeTex; }
  m.onBeforeCompile = s => { s.uniforms.uLook = { value: new THREE.Vector4(L.hue, L.sat, L.val, L.skin) };
    s.fragmentShader = s.fragmentShader.replace('#include <common>', `#include <common>
uniform vec4 uLook;
vec3 rgb2hsv(vec3 c){ vec4 K = vec4(0., -1./3., 2./3., -1.); vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g)); vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r)); float d = q.x - min(q.w, q.y); float e = 1.0e-10; return vec3(abs(q.z + (q.w - q.y) / (6. * d + e)), d / (q.x + e), q.x); }
vec3 hsv2rgb(vec3 c){ vec3 p = abs(fract(c.xxx + vec3(0., 2./3., 1./3.)) * 6. - 3.); return c.z * mix(vec3(1.), clamp(p - 1., 0., 1.), c.y); }`)
      .replace('#include <map_fragment>', `#include <map_fragment>
{ vec3 sr = sqrt(max(diffuseColor.rgb, 0.)); vec3 h = rgb2hsv(sr); bool skin = (h.x < .105 || h.x > .96) && h.y > .12 && h.y < .7 && h.z > .25 && h.z < .98;
  if (skin) sr *= uLook.w; else { h.x = fract(h.x + uLook.x); h.y = clamp(h.y * uLook.y, 0., 1.); h.z *= uLook.z; sr = hsv2rgb(h); }
  diffuseColor.rgb = sr * sr; }`); };
  m.customProgramCacheKey = () => 'hr-look-' + key; matCache.set(key, m); return m; }

const MAP = ['Hips', 'Spine02', 'Spine01', 'neck', 'Head', 'Arm', 'ForeArm', 'Hand', 'UpLeg', 'Leg', 'Foot', 'ToeBase'];
const qA = new THREE.Quaternion(), qB = new THREE.Quaternion(), vA = new THREE.Vector3(), vB = new THREE.Vector3();
// root-space rest transforms of a bone hierarchy (from the bones' current local TRS)
function restOf(root) { const out = new Map(), inv = new THREE.Matrix4(); root.updateMatrixWorld(true); inv.copy(root.matrixWorld).invert(); const M = new THREE.Matrix4(), sc = new THREE.Vector3();
  root.traverse(c => { if (c === root) return; M.multiplyMatrices(inv, c.matrixWorld); const p = new THREE.Vector3(), q = new THREE.Quaternion(); M.decompose(p, q, sc); out.set(c, { p, q, m: M.clone() }); }); return out; }

export function puppetize(D, H, seed = 0) { const A = H && H.assets; if (!D || !D.g || D.puppet || !A || !A.riderSrc) return false; const o = D.o || {};
  if (o.sex === 'female' || o.kind === 'barmaid' || o.kind === 'dancer') { D.puppet = 'keep'; return false; }
  const R = cloneSkinned(A.riderSrc); let mesh = null; R.traverse(q => { if (q.isSkinnedMesh && (!mesh || q.geometry.attributes.position.count > mesh.geometry.attributes.position.count)) mesh = q; if (q.isMesh) { q.castShadow = !H.mobileLite; q.frustumCulled = false; } }); if (!mesh) return false;
  const L = o.kind === 'sheriff' ? SHERIFF : LOOKS[Math.abs(seed | 0) % LOOKS.length]; mesh.material = lookMaterial(mesh.material, L);
  // scale: rider hips to the doll's hips height
  R.position.set(0, 0, 0); R.quaternion.identity(); R.scale.set(1, 1, 1); const rRest = restOf(R), rb = n => mesh.skeleton.bones.find(b => b.name === n), rHips = rb('Hips'); if (!rHips) return false;
  const dB = D.g.userData.B || {}, dBones = Object.values(dB).filter(b => b && b.isBone), saved = dBones.map(b => b.quaternion.clone()); for (const b of dBones) b.quaternion.copy(b.userData.rest || qA.identity()); const hipSave = dB.Hips ? dB.Hips.position.clone() : null; if (dB.Hips) dB.Hips.position.set(0, .93, 0); // doll rest pose, standing (sitters have lowered hips)
  const dRest = restOf(D.g); const dh = dRest.get(dB.Hips), rh = rRest.get(rHips); if (!dh || !rh) { dBones.forEach((b, i) => b.quaternion.copy(saved[i])); if (hipSave) dB.Hips.position.copy(hipSave); return false; }
  const footY = Math.min(...['LeftFoot', 'RightFoot'].map(n => rRest.get(rb(n)) ? rRest.get(rb(n)).p.y : rh.p.y - 1)), s = (dh.p.y - .07) / Math.max(.2, rh.p.y - footY + .02); R.scale.setScalar(s); R.position.y = -footY * s + .0;
  // pair bones by name, limbs by side (the doll's "Left" is on -X, the rider's on +X: match the side, not the label)
  const pairs = []; const sideOf = (rest, b) => Math.sign(rest.get(b).p.x);
  for (const n of MAP) { if (['Hips', 'Spine02', 'Spine01', 'neck', 'Head'].includes(n)) { if (dB[n] && rb(n)) pairs.push([dB[n], rb(n)]); continue; }
    for (const side of ['Left', 'Right']) { const db = dB[side + n]; if (!db || !dRest.get(db)) continue; const sx = sideOf(dRest, db); const rbn = ['Left', 'Right'].map(sd => rb(sd + n)).find(b => b && rRest.get(b) && sideOf(rRest, b) === sx); if (rbn) pairs.push([db, rbn]); } }
  const P = [];
  for (const [db, rbn] of pairs) { const d = dRest.get(db), r = rRest.get(rbn); let swing = new THREE.Quaternion();
    const dc = db.children.find(c => c.isBone), rc = rbn.children.find(c => c.isBone && !/end|front/i.test(c.name)) || rbn.children.find(c => c.isBone);
    if (dc && rc && !/Hips|Spine|neck|Head/.test(rbn.name)) { vA.copy(rRest.get(rc).p).sub(r.p).normalize(); vB.copy(dRest.get(dc).p).sub(d.p).normalize(); if (vA.lengthSq() > .5 && vB.lengthSq() > .5) swing.setFromUnitVectors(vA, vB); }
    const off = d.q.clone().invert().multiply(swing.multiply(r.q)); P.push({ db, rb: rbn, off }); }
  dBones.forEach((b, i) => b.quaternion.copy(saved[i])); if (hipSave) dB.Hips.position.copy(hipSave);
  // the rider's own bones in hierarchy order, with rest locals for the unmapped ones (shoulders, spine top, ends)
  const order = []; const walk = o => { for (const c of o.children) { if (c.isBone) order.push(c); walk(c); } }; walk(R);
  const byR = new Map(P.map(p => [p.rb, p])), restLocal = new Map(order.map(b => [b, b.quaternion.clone()]));
  if (D.lod) { D.lod.removeFromParent(); D.lod = null; }
  D.g.add(R); D.body.visible = false; for (const c of D.g.children) if (c !== R && c.isMesh) c.visible = false;
  const gunHand = (P.find(p => p.db === D.hand) || {}).rb || null; if (D.gun && gunHand) { gunHand.add(D.gun); D.gun.scale.setScalar(1 / s); }
  const dRoot = new Map(), dWalk = (o, pq) => { for (const c of o.children) { if (c.isBone) { const q = pq.clone().multiply(c.quaternion); dRoot.set(c, q); dWalk(c, q); } else if (c !== R) dWalk(c, pq); } };
  const dHipsRest = dh.p.clone(), rootQ = new Map(), baseQ = new Map(), hp = rHips.parent, hpRest = rRest.get(hp), hipsParentInv = hpRest ? hpRest.m.clone().invert() : new THREE.Matrix4(); for (const b of order) if (b.parent && !b.parent.isBone && rRest.get(b.parent)) baseQ.set(b.parent, rRest.get(b.parent).q);
  D.puppet = { R, mesh, s, gunHand, update() { dWalk(D.g, new THREE.Quaternion());
      for (const b of order) { const pq = rootQ.get(b.parent) || (b.parent && baseQ.get(b.parent)) || qB.identity(), m = byR.get(b); let q;
        if (m && dRoot.get(m.db)) { q = dRoot.get(m.db).clone().multiply(m.off); b.quaternion.copy(pq.clone().invert().multiply(q)); } else { b.quaternion.copy(restLocal.get(b)); q = pq.clone().multiply(b.quaternion); } rootQ.set(b, q); }
      // hips follow the doll's hips (sitting, bobbing): delta in doll space -> rider hips' parent space
      const dhp = dB.Hips.position; vA.copy(rh.p).add(vB.set((dhp.x - dHipsRest.x) / s, (dhp.y - dHipsRest.y) / s, (dhp.z - dHipsRest.z) / s)).applyMatrix4(hipsParentInv); rHips.position.copy(vA); },
    dispose() { R.removeFromParent(); } };
  D.puppet.update(); return true; }

// central registry: dolls register here; the nearest few (8 desktop / 4 phone, within 45 m) wear the rider model,
// built on demand (one per frame) and cached; farther ones show their own light body - a bounded GPU cost
export function createPuppets(H, mobile) { H.mobileLite = !!mobile; /* v81: phone NPCs in the rider model skip the shadow pass */ const all = [], K = mobile ? 3 : 12, R2 = 45 * 45, W = new THREE.Vector3();
  const show = (D, on) => { const P = D.puppet; if (!P || P === 'keep') return; if (P.R.visible === on) return; P.R.visible = on; D.body.visible = !on; if (D.gun && P.gunHand) { (on ? P.gunHand : D.hand).add(D.gun); D.gun.scale.setScalar(on ? 1 / P.s : 1); } };
  // v80: compile every look's shader while the game is loading, so dressing an NPC in town never stalls a frame (phones)
  function warm(renderer, scene, camera) { if (!H.assets || !H.assets.riderSrc || warm.done) return; warm.done = true; try { const R = cloneSkinned(H.assets.riderSrc); let mesh = null; R.traverse(q => { if (q.isSkinnedMesh && !mesh) mesh = q; }); if (!mesh) return; const base = mesh.material; R.position.copy(camera.position); scene.add(R);
      for (const L of [...LOOKS, SHERIFF]) { mesh.material = lookMaterial(base, L); renderer.compile(scene, camera); } scene.remove(R); } catch (e) { console.warn('puppet warm', e); } }
  return { warm, all, get list() { return all.filter(D => D.puppet && D.puppet !== 'keep'); }, tick(dt, cam) { while (PENDING.length) all.push(PENDING.shift()); if (!cam || !H.assets || !H.assets.riderSrc) return;
      const near = []; for (let i = all.length - 1; i >= 0; i--) { const D = all[i]; if (D.puppet === 'keep') continue; if (!D.g.parent && D.seen) { all.splice(i, 1); continue; } if (D.g.parent) D.seen = 1; if (!D.g.parent || !D.g.visible) { show(D, false); continue; } D.g.getWorldPosition(W); const d2 = W.distanceToSquared(cam.position); if (d2 < R2) near.push([d2, D]); else show(D, false); }
      near.sort((a, b) => a[0] - b[0]); let built = 0;
      near.forEach(([d2, D], i) => { if (i >= K) { show(D, false); return; } if (!D.puppet) { if (built++) return; try { if (!puppetize(D, H, D.seed || i)) { if (!D.puppet) D.puppet = 'keep'; return; } } catch (e) { console.warn('puppet', e); D.puppet = 'keep'; return; } D.puppet.R.visible = false; D.body.visible = true; }
        show(D, true); if (d2 > 400 && ((D.pt = (D.pt || 0) + 1) % 2)) return; D.puppet.update(); }); } }; }
