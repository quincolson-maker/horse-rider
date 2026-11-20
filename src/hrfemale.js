// ---------------- v78 Greta (and the dancers) upgraded: surface detail + real accessories ----------------
// The Frontier characters are one vertex-coloured skinned mesh. This adds, in the shader, per-material surface detail from
// the bind-pose position (linen weave, gold-figured brocade, twill wool with deep pleats and a lace hem, a cotton apron
// with a cross-stitched border, hair strands, cheek blush and freckles), and hangs real accessories on the bones:
// braided bun + ringlets, a silk flower, a velvet choker with a cameo, drop earrings, bodice lacing with eyelets,
// fuller lashes. Same skeleton, so every saloon animation still drives her.
import * as THREE from 'three';

function upgradeMaterial(m) { if (!m || m.userData.femaleHD) return; m.userData.femaleHD = true; const prev = m.onBeforeCompile;
  m.onBeforeCompile = (sh, r) => { prev && prev.call(m, sh, r);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vFP;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvFP = position;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
varying vec3 vFP;
float fh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
{ vec3 c = diffuseColor.rgb, s = sqrt(max(c, 0.)); float mx = max(s.r, max(s.g, s.b)), mn = min(s.r, min(s.g, s.b)), sat = mx > 0. ? (mx - mn) / mx : 0.;
  float ang = atan(vFP.x, vFP.z), y = vFP.y;
  bool skinT = frontierTag < 1.5, clothT = frontierTag > 2.5 && frontierTag < 3.5;
  if (clothT) {
    float weave = .93 + .07 * sin(y * 950.) * sin((vFP.x + vFP.z) * 950.);
    if (s.r > s.g * 1.7 && sat > .5) { // wool skirt: twill, deep pleat shading, lace hem
      float tw = .9 + .1 * sin((y * 1.3 + ang * .2) * 380.); float pl = .76 + .24 * pow(cos(ang * 9.) * .5 + .5, .7); c *= tw * pl;
      if (y < .33) { float sc2 = step(.5, fract(ang * 14.)); c = mix(c, vec3(.82, .76, .62), .85 * (y < .305 + .012 * sin(ang * 28.) ? 1. : 0.) + .0 * sc2); } }
    else if (s.g > s.r * 1.25 && sat > .3) { // bodice: gold-figured brocade
      vec2 q = vec2(ang * 3.2, y * 32.); vec2 f = fract(q) - .5; float d = length(f * vec2(1., 1.4)); float motif = smoothstep(.34, .3, d) * (1. - smoothstep(.2, .16, d)) + smoothstep(.09, .06, length(f));
      float leaf = smoothstep(.06, .02, abs(f.x * f.y * 6. - .02)) * step(d, .45); c = mix(c * .8, vec3(.5, .38, .14), clamp(motif + leaf * .6, 0., 1.) * .6) * (.95 + .05 * sin(y * 700.)); }
    else if (mx > .72 && sat < .25) { // linen blouse / cotton apron: weave + cross-stitch border on the apron hem
      c *= weave; if (y > .385 && y < .45 && vFP.z > .05) { vec2 g = vec2(ang * 40., y * 220.); vec2 f = fract(g) - .5; float x1 = smoothstep(.07, .0, abs(f.x - f.y)), x2 = smoothstep(.07, .0, abs(f.x + f.y)); float band = step(.395, y) * step(y, .44);
        c = mix(c, vec3(.55, .07, .07), max(x1, x2) * band * .9); } }
    else if (mx < .35) { c *= .9 + .1 * sin(y * 500. + ang * 3.); } // leather: grain
  }
  if (skinT && y > 1.5) { // cheeks + a few freckles across the nose
    float ch = 0.; for (int k = 0; k < 2; k++) { vec3 cc = vec3(k == 0 ? -.056 : .056, 1.588, .078); ch += smoothstep(.034, .0, length(vFP - cc)); }
    c = mix(c, c * vec3(1.18, .78, .78), clamp(ch, 0., 1.) * .55);
    vec2 g = vFP.xy * 520.; float fr = step(.92, fh(floor(g))) * smoothstep(.06, .0, abs(vFP.x) - .045) * step(1.585, y) * step(y, 1.625) * step(.07, vFP.z); c = mix(c, c * vec3(.72, .55, .45), fr * .7); }
  if (!skinT && !clothT && y > 1.5 && sat > .35 && s.r > s.b * 1.4) { // hair: strand streaks
    float st = .78 + .22 * sin(ang * 140. + sin(y * 30.) * 3.) * sin(ang * 37. + y * 12.); c *= st; c += vec3(.06, .045, .02) * smoothstep(.85, 1., sin(ang * 60. + y * 9.)); }
  diffuseColor.rgb = c; }`); };
  const key0 = m.customProgramCacheKey ? m.customProgramCacheKey.bind(m) : () => ''; m.customProgramCacheKey = () => key0() + '|femaleHD'; m.needsUpdate = true; }

const M = {}; function mats() { if (M.gold) return M; const S = (o) => new THREE.MeshStandardMaterial(o);
  Object.assign(M, { gold: S({ color: 0xd8b25a, metalness: .9, roughness: .25 }), velvet: S({ color: 0x1a0e14, roughness: .9 }), ivory: S({ color: 0xf0e6d2, roughness: .45 }), cord: S({ color: 0x14100c, roughness: .8 }),
    petal: S({ color: 0xb02a3e, roughness: .6 }), petal2: S({ color: 0xd94a5e, roughness: .6 }), leaf: S({ color: 0x3a6a2a, roughness: .7 }), lash: S({ color: 0x120c08, roughness: .7 }), pearl: S({ color: 0xf6f0e6, roughness: .2, metalness: .1 }) }); return M; }
const ADD = (b, geo, mat, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.scale.set(sx, sy, sz); m.castShadow = true; b.add(m); return m; };
function hairMat(D) { const h = new THREE.Color(D.o.hair ?? 0xd6a94e); const c = document.createElement('canvas'); c.width = 64; c.height = 256; const x = c.getContext('2d'); const base = '#' + h.getHexString(); x.fillStyle = base; x.fillRect(0, 0, 64, 256);
  for (let i = 0; i < 120; i++) { x.strokeStyle = `rgba(${Math.random() < .5 ? '255,240,200' : '60,35,10'},${.15 + Math.random() * .25})`; x.lineWidth = .6 + Math.random() * 1.4; x.beginPath(); const sx = Math.random() * 64; x.moveTo(sx, 0); x.bezierCurveTo(sx + 6, 80, sx - 6, 170, sx + 3, 256); x.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return new THREE.MeshStandardMaterial({ map: t, roughness: .55 }); }

export function upgradeFemale(D) { if (!D || !D.body || D.femaleHD) return; D.femaleHD = true; const B = D.g.userData.B || {}, mt = mats(), barmaid = D.o.kind === 'barmaid';
  upgradeMaterial(D.body.material);
  const head = B.Head, neck = B.neck, spine = B.Spine02, HM = hairMat(D);
  if (head) {
    // braided bun: a coiled rope of three strands wound round a core, two pins, plus ringlets by the ears
    ADD(head, new THREE.SphereGeometry(.05, 20, 14), HM, 0, .2, -.128, 0, 0, 0, 1, .9, .85);
    for (let k = 0; k < 3; k++) { const pts = []; for (let i = 0; i <= 60; i++) { const t = i / 60, a = t * Math.PI * 4.2 + k * 2.1, r = .045 + .006 * Math.sin(t * 40 + k * 2); pts.push(new THREE.Vector3(Math.cos(a) * r, .2 + Math.sin(t * 50 + k) * .004 + (t - .5) * .02, -.128 + Math.sin(a) * r * .85)); }
      ADD(head, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 120, .013, 8, false), HM, 0, 0, 0); }
    for (const sd of [-1, 1]) { ADD(head, new THREE.CylinderGeometry(.0025, .0025, .12, 6), mt.gold, sd * .03, .225, -.13, 0, 0, sd * 1.1); ADD(head, new THREE.SphereGeometry(.007, 10, 8), mt.pearl, sd * .082, .255, -.13); }
    for (const sd of [-1, 1]) { const pts = []; for (let i = 0; i <= 50; i++) { const t = i / 50, a = t * Math.PI * 7; pts.push(new THREE.Vector3(sd * (.098 + Math.cos(a) * .011), .13 - t * .1, .015 + Math.sin(a) * .011)); } ADD(head, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 90, .0052, 6, false), HM, 0, 0, 0); }
    // a silk flower over the left ear
    { const f = new THREE.Group(); f.position.set(.098, .2, .02); f.rotation.set(-.2, 0, -1.1); head.add(f); for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; ADD(f, new THREE.SphereGeometry(.018, 10, 8), i % 2 ? mt.petal : mt.petal2, Math.cos(a) * .016, 0, Math.sin(a) * .016, 0, -a, 0, 1, .35, .7); }
      ADD(f, new THREE.SphereGeometry(.008, 10, 8), mt.gold, 0, .004, 0); for (const a of [2.2, 3.6]) ADD(f, new THREE.SphereGeometry(.02, 8, 6), mt.leaf, Math.cos(a) * .026, -.004, Math.sin(a) * .026, 0, -a, 0, 1, .2, .45); }
    // drop earrings
    for (const sd of [-1, 1]) { ADD(head, new THREE.SphereGeometry(.0045, 8, 6), mt.gold, sd * .104, .1, .0); ADD(head, new THREE.CylinderGeometry(.0012, .0012, .02, 5), mt.gold, sd * .104, .088, .0); ADD(head, new THREE.SphereGeometry(.0075, 10, 8), mt.pearl, sd * .104, .074, .0, 0, 0, 0, 1, 1.3, 1); }
    // fuller upper lashes (a few flicked hairs per eye)
    for (const sd of [-1, 1]) for (let i = 0; i < 7; i++) { const t = i / 6, x = sd * (.024 + t * .032), y = .156 + Math.sin(t * Math.PI) * .004; ADD(head, new THREE.CylinderGeometry(.0006, .0011, .011, 4), mt.lash, x, y + .004, .099 - Math.abs(t - .5) * .01, -.9, 0, sd * (t - .5) * .9); }
  }
  { const skinM = new THREE.MeshStandardMaterial({ color: D.o.skin ?? 0xeebf9d, roughness: .6 }); // v79: a real neck (was a thin tube under a wide jaw) + hair over the nape
    if (neck) ADD(neck, new THREE.CylinderGeometry(.044, .056, .15, 24), skinM, 0, .035, .004);
    if (head) { ADD(head, new THREE.SphereGeometry(.116, 28, 18, Math.PI, Math.PI, Math.PI * .22, Math.PI * .52), HM, 0, .118, -.004, 0, 0, 0, 1, 1.12, 1.02); // back of the head, down to the nape
      ADD(head, new THREE.CylinderGeometry(.075, .058, .08, 20, 1, true, Math.PI * .6, Math.PI * .8), HM, 0, .045, -.03); } }
  if (neck) { ADD(neck, new THREE.TorusGeometry(.046, .0055, 8, 32), mt.velvet, 0, .045, .002, Math.PI / 2, 0, 0, 1, 1, 1); const cam = ADD(neck, new THREE.SphereGeometry(.013, 16, 12), mt.gold, 0, .04, .049, 0, 0, 0, .8, 1, .35); ADD(neck, new THREE.SphereGeometry(.0105, 16, 12), mt.ivory, 0, .04, .052, 0, 0, 0, .7, .9, .3); }
  if (spine && barmaid) { // bodice lacing: crossed black cords between two rows of gold eyelets
    const zF = .152; for (let i = 0; i < 6; i++) { const y = .1 + i * .045; for (const sd of [-1, 1]) ADD(spine, new THREE.TorusGeometry(.0045, .0016, 5, 10), mt.gold, sd * .028, y, zF, 0, 0, 0); }
    for (let i = 0; i < 5; i++) { const y = .1 + i * .045; for (const sd of [-1, 1]) { const a = new THREE.Vector3(sd * .028, y, zF + .003), b = new THREE.Vector3(-sd * .028, y + .045, zF + .003); ADD(spine, new THREE.TubeGeometry(new THREE.LineCurve3(a, b), 2, .0018, 5, false), mt.cord, 0, 0, 0); } }
    ADD(spine, new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(-.012, .325, zF + .004), new THREE.Vector3(0, .31, zF + .01), new THREE.Vector3(.012, .325, zF + .004), new THREE.Vector3(.02, .27, zF + .02), new THREE.Vector3(.016, .24, zF + .015)]), 20, .0018, 5, false), mt.cord, 0, 0, 0); } // the bow
  D.g.traverse(o => { if (o.isMesh && o !== D.body) o.castShadow = true; }); }
