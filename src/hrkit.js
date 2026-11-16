// ---------------- v70 SPEC-OPS KIT (original, generic: no unit insignia) ----------------
// Worn by the rigged rider. Three kinds of parts:
//  1. fitted SKINNED shells copied from the rider's own body (like the v42 jacket): multicam combat shirt + pants,
//     gloves, boots - pushed out along welded normals and bound to the same skeleton, so they bend with every pose
//  2. RIGID gear parented to bones: plate carrier (chest), high-cut helmet + quad-tube night vision (head), knee pads,
//     thigh holster - built in the body's bind space and moved under the bone with the bone's inverse bind matrix
//  3. the straw hat is hidden while the helmet is on (its triangles are dropped from the body's index, then restored)
// Body mesh space: 2 units tall (-1..1), +Z = the rider's front.
import * as THREE from 'three';

let KM = null;
function canvas(w, h, f) { const c = document.createElement('canvas'); c.width = w; c.height = h; f(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t; }
function rnd(s) { return () => (s = (s * 16807) % 2147483647) / 2147483647; }
function kitMats() { if (KM) return KM;
  // multicam: blotches in five tones + thin dark "branches", computed from the shell's bind-space position (no UVs needed)
  const camo = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .92, metalness: 0 });
  camo.onBeforeCompile = s => { s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vCam;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvCam = position;');
    s.fragmentShader = s.fragmentShader.replace('#include <common>', `#include <common>
varying vec3 vCam;
float h3(vec3 p){ p = fract(p * .3183099 + .1); p *= 17.; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float n3(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3. - 2. * f);
  return mix(mix(mix(h3(i), h3(i + vec3(1,0,0)), f.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), f.x), f.y), mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), f.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), f.x), f.y), f.z); }
float fb(vec3 p){ return n3(p) * .55 + n3(p * 2.1) * .3 + n3(p * 4.3) * .15; }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
{ vec3 p = vCam * 7.5;
  vec3 base = vec3(.56, .51, .38), tan = vec3(.68, .61, .45), olive = vec3(.34, .37, .22), brown = vec3(.38, .27, .16), dark = vec3(.16, .14, .1), cream = vec3(.8, .75, .6);
  vec3 col = base; float a = fb(p + 3.1), b = fb(p * 1.3 + 11.7), c = fb(p * .8 + 27.3), d = fb(p * 2.6 + 41.);
  col = mix(col, tan, smoothstep(.52, .56, a)); col = mix(col, olive, smoothstep(.55, .59, b)); col = mix(col, brown, smoothstep(.58, .61, c));
  col = mix(col, cream, smoothstep(.66, .69, d) * .8); float br = abs(fb(p * 1.7 + 5.) - .5); col = mix(col, dark, (1. - smoothstep(.018, .03, br)) * step(.52, fb(p * .9 + 2.)));
  float weave = .96 + .04 * sin(vCam.x * 900.) * sin(vCam.y * 900.); diffuseColor.rgb = col * col * weave; }`); };
  const weave = (base, lines) => canvas(256, 256, (x, w, h) => { const r = rnd(5); x.fillStyle = base; x.fillRect(0, 0, w, h); for (let i = 0; i < 2200; i++) { x.fillStyle = `rgba(${r() < .5 ? '255,255,255' : '0,0,0'},${.06 * r()})`; x.fillRect(r() * w, r() * h, 2, 1); }
    if (lines) { x.fillStyle = 'rgba(0,0,0,.28)'; for (let y = 0; y < h; y += 32) x.fillRect(0, y + 22, w, 3); x.fillStyle = 'rgba(255,255,255,.06)'; for (let y = 0; y < h; y += 32) x.fillRect(0, y + 4, w, 2); x.fillStyle = 'rgba(0,0,0,.35)'; for (let y = 0; y < h; y += 32) for (let xx = 0; xx < w; xx += 32) x.fillRect(xx, y + 4, 2, 18); } });
  const flag = canvas(256, 140, (x, w, h) => { x.fillStyle = '#3b3a2c'; x.fillRect(0, 0, w, h); for (let i = 0; i < 7; i++) { x.fillStyle = i % 2 ? '#2a2a20' : '#55533f'; x.fillRect(0, i * (h / 7) + 0, w, h / 13); }
    x.fillStyle = '#2a2a20'; x.fillRect(w * .55, 0, w * .45, h * .54); x.fillStyle = '#6b6850'; for (let r = 0; r < 5; r++) for (let c = 0; c < 6; c++) { x.beginPath(); x.arc(w * .58 + c * 17, 10 + r * 14, 3, 0, 6.3); x.fill(); } x.strokeStyle = '#1b1b14'; x.lineWidth = 6; x.strokeRect(0, 0, w, h); }); // subdued, reversed (worn on the right side)
  KM = { camo, rg: new THREE.MeshStandardMaterial({ color: 0x5b5f46, roughness: .9, map: weave('#c8c8c8', true) }), // ranger green MOLLE
    rgP: new THREE.MeshStandardMaterial({ color: 0x555941, roughness: .92, map: weave('#c4c4c4', false) }),
    coy: new THREE.MeshStandardMaterial({ color: 0x8b7656, roughness: .9, map: weave('#d0d0d0', false) }), // coyote boots / gloves
    helm: new THREE.MeshStandardMaterial({ color: 0x6b6450, roughness: .75, metalness: .05, map: weave('#d6d6d6', false) }),
    black: new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: .6, metalness: .3 }), rubber: new THREE.MeshStandardMaterial({ color: 0x111111, roughness: .9 }),
    lens: new THREE.MeshStandardMaterial({ color: 0x122826, roughness: .05, metalness: .9, emissive: 0x0a3020, emissiveIntensity: .4 }),
    buckle: new THREE.MeshStandardMaterial({ color: 0x222222, roughness: .5 }), flag: new THREE.MeshStandardMaterial({ map: flag, roughness: .95 }),
    velcro: new THREE.MeshStandardMaterial({ color: 0x5a5a48, roughness: 1 }) }; return KM; }

// copy the triangles picked by keep(v) from the body as a skinned shell, pushed out by push(v)
function shell(body, keep, push, mat, name) { const sk = body.skeleton, G = body.geometry, pos = G.attributes.position, nor = G.attributes.normal, si = G.attributes.skinIndex, sw = G.attributes.skinWeight; if (!nor || !si) return null;
  const index = body.userData.kitIndex0 || (G.index ? G.index.array : null), n = pos.count, P = new THREE.Vector3(), N = new THREE.Vector3(), ok = new Uint8Array(n); for (let v = 0; v < n; v++) ok[v] = keep(v) ? 1 : 0;
  const tri = []; const L = index ? index.length : n; for (let t = 0; t < L; t += 3) { const a = index ? index[t] : t, b = index ? index[t + 1] : t + 1, c = index ? index[t + 2] : t + 2; if (ok[a] + ok[b] + ok[c] >= 2) tri.push(a, b, c); } if (tri.length < 30) return null;
  const used = [...new Set(tri)], remap = new Map(used.map((v, i) => [v, i])), m = used.length, nP = new Float32Array(m * 3), nN = new Float32Array(m * 3), nSI = new Uint16Array(m * 4), nSW = new Float32Array(m * 4);
  const key = v => Math.round(pos.getX(v) * 3000) + ',' + Math.round(pos.getY(v) * 3000) + ',' + Math.round(pos.getZ(v) * 3000), avg = new Map();
  for (const v of used) { const k = key(v), a = avg.get(k) || new THREE.Vector3(); a.add(N.fromBufferAttribute(nor, v)); avg.set(k, a); } for (const a of avg.values()) a.normalize();
  used.forEach((v, i) => { P.fromBufferAttribute(pos, v); N.copy(avg.get(key(v))); const d = push(v, P); nP.set([P.x + N.x * d, P.y + N.y * d, P.z + N.z * d], i * 3); nN.set([N.x, N.y, N.z], i * 3); for (let k = 0; k < 4; k++) { nSI[i * 4 + k] = si.getComponent(v, k); nSW[i * 4 + k] = sw.getComponent(v, k); } });
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(nP, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nN, 3)); g.setAttribute('skinIndex', new THREE.BufferAttribute(nSI, 4)); g.setAttribute('skinWeight', new THREE.BufferAttribute(nSW, 4));
  g.setIndex(tri.map(v => remap.get(v))); g.computeBoundingSphere();
  const sm = new THREE.SkinnedMesh(g, mat); sm.name = name; sm.castShadow = true; sm.frustumCulled = false; sm.position.copy(body.position); sm.quaternion.copy(body.quaternion); sm.scale.copy(body.scale); body.parent.add(sm); sm.bind(sk, body.bindMatrix); return sm; }

// rigid gear: build children in body (bind) space, then hang the group under the bone
function onBone(sk, name, build) { const i = sk.bones.findIndex(b => b.name === name); if (i < 0) return null; const g = new THREE.Group(); g.name = 'kit ' + name; build(g); g.applyMatrix4(sk.boneInverses[i]); sk.bones[i].add(g); g.traverse(o => { if (o.isMesh) o.castShadow = true; }); return g; }
const B = (g, mat, w, h, d, x, y, z, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); g.add(m); return m; };
const C = (g, mat, r1, r2, h, x, y, z, rx = 0, ry = 0, rz = 0, seg = 16) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg), mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); g.add(m); return m; };
const RB = (g, mat, w, h, d, x, y, z, r = .012) => { const s = new THREE.Shape(), a = w / 2 - r, b = h / 2 - r; s.moveTo(-a, -h / 2); s.lineTo(a, -h / 2); s.quadraticCurveTo(w / 2, -h / 2, w / 2, -b); s.lineTo(w / 2, b); s.quadraticCurveTo(w / 2, h / 2, a, h / 2); s.lineTo(-a, h / 2); s.quadraticCurveTo(-w / 2, h / 2, -w / 2, b); s.lineTo(-w / 2, -b); s.quadraticCurveTo(-w / 2, -h / 2, -a, -h / 2);
  const geo = new THREE.ExtrudeGeometry(s, { depth: d - .006, bevelEnabled: true, bevelThickness: .003, bevelSize: .003, bevelSegments: 2, curveSegments: 4 }); geo.translate(0, 0, -(d - .006) / 2); const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); g.add(m); return m; };

function plateCarrier(g, M) { // chest ~y .30-.52, front surface z ~.19, back z ~-.18
  RB(g, M.rg, .33, .3, .055, 0, .41, .205, .03); RB(g, M.rg, .34, .32, .055, 0, .42, -.2, .03); // front + back plate bags
  for (const s of [-1, 1]) { B(g, M.rg, .05, .17, .36, s * .195, .33, .0); B(g, M.rg, .08, .045, .2, s * .1, .61, .0, 0, 0, s * .35); } // cummerbund, shoulder straps
  for (let i = 0; i < 3; i++) { const x = -.1 + i * .1; RB(g, M.rgP, .085, .1, .045, x, .315, .25, .012); B(g, M.rgP, .087, .03, .05, x, .37, .252); B(g, M.velcro, .03, .012, .006, x, .37, .278); B(g, M.black, .015, .03, .044, x - .02, .4, .25); B(g, M.black, .015, .03, .044, x + .02, .4, .25); } // triple mag pouch with rifle mags peeking out
  RB(g, M.rgP, .2, .09, .03, 0, .48, .247, .012); B(g, M.flag, .1, .055, .004, .055, .5, .263); B(g, M.velcro, .07, .03, .004, -.06, .5, .263); // admin pouch, flag patch, name-tape velcro
  RB(g, M.rgP, .08, .12, .06, -.19, .38, .1, .015); C(g, M.black, .007, .007, .2, -.2, .52, .1); C(g, M.black, .012, .012, .02, -.2, .62, .1); // radio + antenna
  RB(g, M.rgP, .07, .09, .045, .19, .36, .12, .012); // med pouch
  for (const x of [-.13, .13]) B(g, M.buckle, .04, .02, .012, x, .27, .24); // cummerbund buckles
  B(g, M.rgP, .26, .03, .05, 0, .55, -.235); RB(g, M.rgP, .2, .14, .06, 0, .38, -.26, .015); C(g, M.black, .01, .01, .26, .07, .5, -.27, .2, 0, 0); } // drag handle, back panel, hydration tube
function helmet(g, M) { const hx = 0, hy = .835, hz = .065, R = .158;
  const shell = new THREE.Mesh(new THREE.SphereGeometry(R, 40, 20, 0, Math.PI * 2, 0, 1.38), M.helm); shell.scale.set(.98, .92, 1.08); shell.position.set(hx, hy - .015, hz); g.add(shell); // high-cut dome
  const rim = new THREE.Mesh(new THREE.TorusGeometry(R * .985, .006, 6, 48), M.black); rim.rotation.x = Math.PI / 2; rim.scale.set(.98, 1.08, 1); rim.position.set(hx, hy - .015 + Math.cos(1.38) * R * .92, hz); g.add(rim);
  for (const s of [-1, 1]) { const rail = B(g, M.black, .014, .022, .15, s * .152, hy - .01, hz - .01, 0, 0, s * .12); rail.scale.y = 1; for (let i = 0; i < 6; i++) B(g, M.black, .016, .006, .008, s * .158, hy - .002, hz - .07 + i * .025); } // ARC-style side rails
  B(g, M.black, .06, .035, .02, hx, hy + .045, hz + .168, -.35); // NVG shroud
  B(g, M.velcro, .09, .004, .07, hx, hy + .14, hz - .01, -.05); B(g, M.velcro, .06, .004, .05, hx, hy + .12, hz - .1, -.6); // velcro top + back
  RB(g, M.black, .07, .05, .03, hx, hy + .03, hz - .17, .01).rotation.x = .4; C(g, M.black, .006, .006, .05, hx + .03, hy + .07, hz - .15, 0, 0, Math.PI / 2); // battery pack + cable
  C(g, M.black, .012, .012, .014, hx - .03, hy + .145, hz - .06); // strobe
  // quad-tube night vision, flipped UP on its mount (tubes point up/forward above the brow)
  const nv = new THREE.Group(); nv.position.set(hx, hy + .075, hz + .2); nv.rotation.x = -1.15; g.add(nv); B(nv, M.black, .14, .03, .04, 0, 0, .0); B(nv, M.black, .03, .05, .03, 0, -.02, -.02);
  for (const [x, ry] of [[-.058, -.25], [-.022, 0], [.022, 0], [.058, .25]]) { const t = C(nv, M.black, .0145, .016, .085, x, .0, .055, Math.PI / 2, ry, 0, 18); const l = C(nv, M.lens, .0125, .0125, .004, 0, .044, 0); t.add(l); }
  // chin strap
  for (const s of [-1, 1]) { B(g, M.black, .012, .11, .006, s * .118, hy - .1, hz + .01, 0, 0, -s * .1); } B(g, M.black, .07, .012, .03, hx, hy - .18, hz + .09); }

export function wearKit(root, on) { if (!root || !root.userData) return false;
  const U = root.userData; if (U.kit) { for (const m of U.kit) m.visible = !!on; hat(U, !!on); if (U.jacket) for (const m of U.jacket) m.visible = on ? false : !!U.jkOn; return true; } if (!on) return true;
  let body = null; root.traverse(o => { if (o.isSkinnedMesh && !o.userData.kitPart && (!body || o.geometry.attributes.position.count > body.geometry.attributes.position.count)) body = o; }); if (!body || !body.geometry.attributes.normal) return false;
  const M = kitMats(), sk = body.skeleton, G = body.geometry, pos = G.attributes.position, si = G.attributes.skinIndex, sw = G.attributes.skinWeight, bi = n => sk.bones.findIndex(b => b.name === n);
  if (!G.index) { const n = pos.count, I = n > 65535 ? new Uint32Array(n) : new Uint16Array(n); for (let i = 0; i < n; i++) I[i] = i; G.setIndex(new THREE.BufferAttribute(I, 1)); } // non-indexed body: give it an index so the hat can be dropped
  body.userData.kitIndex0 = G.index.array.slice();
  const dom = new Int16Array(pos.count); for (let v = 0; v < pos.count; v++) { let b = -1, w = 0; for (let k = 0; k < 4; k++) { const ww = sw.getComponent(v, k); if (ww > w) { w = ww; b = si.getComponent(v, k); } } dom[v] = b; }
  const S = n => new Set(n.map(bi).filter(i => i >= 0)), HANDS = S(['LeftHand', 'RightHand']), FEET = S(['LeftFoot', 'RightFoot', 'LeftToeBase', 'RightToeBase']), HEAD = S(['Head', 'head_end', 'headfront']), NECK = bi('neck');
  const parts = [], add = m => { if (m) { m.userData.kitPart = true; parts.push(m); } return m; };
  // 1. uniform: everything but head, hands, feet (neck only below the collar)
  add(shell(body, v => !HANDS.has(dom[v]) && !FEET.has(dom[v]) && !HEAD.has(dom[v]) && !(dom[v] === NECK && pos.getY(v) > .66), (v, P) => P.y < -.05 ? .014 : P.y > .5 ? .012 : .016, M.camo, 'kit uniform'));
  add(shell(body, v => HANDS.has(dom[v]), () => .007, M.coy, 'kit gloves')); add(shell(body, v => FEET.has(dom[v]), (v, P) => P.y < -.985 ? .004 : .012, M.coy, 'kit boots'));
  // 2. rigid gear
  add(onBone(sk, 'Spine01', g => plateCarrier(g, M))); add(onBone(sk, 'Head', g => helmet(g, M)));
  for (const [leg, s] of [['LeftLeg', 1], ['RightLeg', -1]]) add(onBone(sk, leg, g => { RB(g, M.black, .11, .14, .04, s * .19, -.44, .085, .03); B(g, M.black, .13, .018, .1, s * .19, -.41, .03); B(g, M.black, .13, .018, .1, s * .19, -.49, .03); }));
  add(onBone(sk, 'RightUpLeg', g => { B(g, M.rgP, .05, .03, .14, -.255, -.08, .0); RB(g, M.black, .05, .17, .09, -.27, -.2, .01, .015); B(g, M.black, .018, .05, .03, -.27, -.1, .04); B(g, M.rgP, .06, .03, .15, -.25, -.26, .0); })); // drop-leg holster
  // 3. the straw hat comes off: drop the crown above the skull and the wide brim
  if (G.index) { const hx = 0, hz = .07, keep = v => { const y = pos.getY(v), r = Math.hypot(pos.getX(v) - hx, pos.getZ(v) - hz); if (y > .735 && r > .165) return false; /* nothing but the hat is that high and that wide (shoulders stop at y .66) */ if (!HEAD.has(dom[v]) && dom[v] !== NECK) return true; return !(y > .905 || (y > .78 && r > .152) || (y > .655 && r > .168)); }, I0 = body.userData.kitIndex0, out = [];
    for (let t = 0; t < I0.length; t += 3) if (keep(I0[t]) && keep(I0[t + 1]) && keep(I0[t + 2])) out.push(I0[t], I0[t + 1], I0[t + 2]); body.userData.kitIndexHat = new (I0.constructor)(out); }
  U.kit = parts; U.kitBody = body; hat(U, true); if (U.jacket) { U.jkOn = U.jacket.some(m => m.visible); for (const m of U.jacket) m.visible = false; } return true; }
function hat(U, off) { const b = U.kitBody; if (!b || !b.userData.kitIndexHat) return; const want = off ? b.userData.kitIndexHat : b.userData.kitIndex0; if (b.geometry.index.array === want) return; b.geometry.setIndex(new THREE.BufferAttribute(want, 1)); }
