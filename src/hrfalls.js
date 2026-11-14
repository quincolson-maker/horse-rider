// v41 BANDIT FALLS SCENERY — a natural cliff with the hideout's mouth hidden behind a waterfall.
// Replaces the old box cliff, flat water sheet and round pool of hrbanditcave.js (createBanditCave({ naturalFalls: true })).
//   - horseshoe cliff (~108 m wide, ~25 m tall) wrapping around the hideout: noise-carved rock with ledges and strata,
//     moss on every up-facing shelf, darker wet rock around the falls, the cave mouth cut into the foot of it
//   - the main falls: a 10 m wide curtain spilling over a notch in the lip and landing in front of the mouth (you walk
//     through it to get in), with a second, slower sheet behind it for depth, plus two thin side trickles off the ledges
//   - plunge pool: deep teal centre, bright shallows, rings rippling out from where the water lands, foam
//   - drifting mist, a faint rainbow in the spray, mossy boulders around the pool and along the cliff foot
// Local frame (same as the cave): x = across the mouth, +z = out of the mouth, y = up from the ground at the mouth.
import * as THREE from 'three';
import { loadRockModels } from './hrworld.js?v=43';

const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function hash(x, y) { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); }
function vnoise(x, y) { const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy), b = hash(ix + 1, iy), c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1); return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy; }
function fbm(x, y, o = 4) { let s = 0, a = .5, n = 0; for (let i = 0; i < o; i++) { s += vnoise(x, y) * a; n += a; a *= .5; const t = x; x = x * 1.7 + y * .9 + 3.1; y = y * 1.7 - t * .9 + 1.7; } return s / n; }

// cliff layout
const U0 = 54;                                                            // half width
export const baseZ = u => -Math.pow(Math.max(0, Math.abs(u) - 10), 2) * .022; // horseshoe: the sides sweep back
const dBaseZ = u => -2 * Math.max(0, Math.abs(u) - 10) * .022 * Math.sign(u);
const topH = u => 25 - 7 * sstep(15, U0, Math.abs(u)) + 3.2 * (fbm(u * .05, 7.3, 3) - .5) - 2.6 * Math.exp(-((u / 4.6) ** 2)); // notch for the falls
export const MOUTH = { hw: 2.7, h: 5.0 };                                // a little smaller than the tunnel, so the rock hides its rim
const inMouth = (u, y) => Math.abs(u) < MOUTH.hw && y > -3 && y < 2.4 + Math.sqrt(Math.max(0, 1 - (u / MOUTH.hw) ** 2)) * (MOUTH.h - 2.4);

function buildCliff(high) {
  const NU = high ? 216 : 120, NV = high ? 84 : 46, pos = [], col = [], idx = [], keep = [];
  const C = new THREE.Color(), sand = new THREE.Color(0xc4a07c), grey = new THREE.Color(0x9a978f), dark = new THREE.Color(0x5e5850), wet = new THREE.Color(0x4f6670), moss = new THREE.Color(0x4a7f2c), mossL = new THREE.Color(0x6b9a3a);
  const info = [];
  for (let j = 0; j < NV; j++) for (let i = 0; i < NU; i++) {
    const u = -U0 + 2 * U0 * i / (NU - 1), t = j / (NV - 1), H = topH(u);
    let y, zo = 0; if (t <= .8) y = -3 + (H + 3) * t / .8; else { const a = (t - .8) / .2 * Math.PI / 2; y = H + 4.2 * Math.sin(a); zo = -14 * (1 - Math.cos(a)) - 6 * a; }
    const tz = dBaseZ(u), nl = Math.hypot(tz, 1), nx = -tz / nl, nz = 1 / nl; // outward normal of the base curve
    const big = fbm(u * .085 + 11, y * .085, 4), mid = fbm(u * .28 + 5, y * .3 + 2, 3), led = sstep(.35, .62, (y / 3.1 + fbm(u * .06, y * .02 + 4, 2) * .9) % 1);
    let d = (big - .5) * 4.6 + (mid - .5) * 1.5 + led * .5;
    const mr = Math.hypot(u / (MOUTH.hw + 2.2), Math.max(0, y - 2) / (MOUTH.h + 1.2)); if (mr < 1.2 && y < MOUTH.h + 3) d = THREE.MathUtils.lerp(.35 + led * .2, d, sstep(.75, 1.2, mr)); // tight rim round the mouth
    if (Math.abs(u) < 6.5 && y > 0) d = THREE.MathUtils.lerp(d, Math.min(d, -.2), .6 * (1 - Math.abs(u) / 6.5)); // the falls have worn a shallow chute
    const x = u + nx * d, z = baseZ(u) + zo + nz * d * (t > .8 ? .6 : 1) + (t > .8 ? 0 : 0);
    pos.push(x, y + (t > .8 ? d * .4 : 0), z); info.push([u, y, d, big, mid, led]);
  }
  for (let j = 0; j < NV - 1; j++) for (let i = 0; i < NU - 1; i++) { const a = j * NU + i, b = a + 1, c = a + NU, e = c + 1;
    const cu = (info[a][0] + info[e][0]) / 2, cy = (info[a][1] + info[e][1]) / 2; if (inMouth(cu, cy)) continue; idx.push(a, b, c, b, e, c); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  const N = g.attributes.normal;
  for (let k = 0; k < info.length; k++) { const [u, y, d, big, mid, led] = info[k], ny = N.getY(k), H = topH(u);
    C.copy(sand).lerp(grey, sstep(.35, .7, big)); C.multiplyScalar(.84 + .28 * mid + .05 * led + .1 * (fbm(u * .15 + 2, y * .15 + 9, 2) - .5));           // sandstone / grey granite, strata
    C.lerp(dark, sstep(.1, -1.6, d) * .6);                                                                  // recesses darker
    const wz = (1 - sstep(4.5, 8, Math.abs(u))) * sstep(H + 1, H - 2, y); C.lerp(wet, wz * .75);          // wet rock beside the falls
    const m = sstep(.38, .7, ny) * (1 - wz * .7); if (m > 0) C.lerp(mid > .5 ? mossL : moss, m * .9);     // moss on the shelves and the top
    if (y < .8) C.lerp(moss, .35 * sstep(.8, -1, y));                                                       // damp foot
    col.push(C.r, C.g, C.b); }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return g;
}


// v43: real rock on the cliff and boulders — the game's own CC0 scanned rock textures, sampled triplanar in the rock's local space
// (no UVs needed, no stretching on the steep faces) and multiplied into the painted vertex colours, so the moss / wet / strata
// tints stay; a cheap bump from the texture's brightness gives the face real grain. Not run through the stylized mip bias: crisp.
const TXL = new THREE.TextureLoader(), txCache = {};
function rockTex(id, sz) { const k = id + sz; if (!txCache[k]) { const t = TXL.load(`assets/tex/${id}_diff_${sz}.webp`); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; txCache[k] = t; } return txCache[k]; }
function triplanarRock(m, tA, tB, scale, key) {
  m.onBeforeCompile = sh => { sh.uniforms.tRA = { value: tA }; sh.uniforms.tRB = { value: tB }; sh.uniforms.rSc = { value: scale };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vRP; varying vec3 vRN;').replace('#include <begin_vertex>', `#include <begin_vertex>
vec4 rp4 = vec4(transformed, 1.);
#ifdef USE_INSTANCING
rp4 = instanceMatrix * rp4;
#endif
vec3 rn = objectNormal;
#ifdef USE_INSTANCING
rn = mat3(instanceMatrix) * rn;
#endif
vRP = rp4.xyz; vRN = normalize(rn);`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
uniform sampler2D tRA, tRB; uniform float rSc; varying vec3 vRP; varying vec3 vRN; float rLum;
vec3 triR(sampler2D t, vec3 p, vec3 w) { return texture2D(t, p.zy).rgb * w.x + texture2D(t, p.xz).rgb * w.y + texture2D(t, p.xy).rgb * w.z; }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
{ vec3 w = pow(abs(normalize(vRN)), vec3(4.)); w /= (w.x + w.y + w.z); vec3 p = vRP * rSc;
  vec3 a = triR(tRA, p, w), b = triR(tRB, p * .37 + 3.1, w); float mixAB = smoothstep(.35, .65, texture2D(tRB, p.xz * .05).g);
  vec3 r = mix(a, b, mixAB * .6); float lum = dot(r, vec3(.333)); rLum = dot(b, vec3(.333));
  vec3 tint = mix(vec3(1.), r / max(.2, lum), .3); diffuseColor.rgb *= clamp(tint * (.62 + lum * .85), 0., 1.6); }`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
{ float hx = dFdx(rLum), hy = dFdy(rLum); vec3 dpx = dFdx(-vViewPosition), dpy = dFdy(-vViewPosition); vec3 r1 = cross(dpy, normal), r2 = cross(normal, dpx); float det = dot(dpx, r1);
  vec3 grad = sign(det) * (hx * r1 + hy * r2); normal = normalize(abs(det) * normal - grad * .7); }`); };
  m.customProgramCacheKey = () => 'hr-trirock-' + key; return m; }

// falls: a curved curtain + spill over the lip (uv.y: 0 at the pool .. 1 over the lip)
function buildSheet(w0, w1, top, z0, bulge, segX, segY) {
  const g = new THREE.PlaneGeometry(1, 1, segX, segY), p = g.attributes.position;
  for (let k = 0; k < p.count; k++) { const x01 = p.getX(k) + .5, y01 = p.getY(k) + .5, w = THREE.MathUtils.lerp(w0, w1, y01); let y, z;
    if (y01 < .93) { const s = y01 / .93; y = s * top - .15; z = z0 + bulge * Math.pow(1 - s, .7) + Math.sin(Math.PI * x01) * .35; }
    else { const s = (y01 - .93) / .07 * Math.PI / 2; y = top + .7 * Math.sin(s); z = z0 + .35 * Math.sin(Math.PI * x01) - 2.6 * (1 - Math.cos(s)); }
    p.setXYZ(k, (x01 - .5) * w, y, z); }
  g.computeVertexNormals(); return g;
}

function fallsMaterial(U, speed, alpha, part = 0) {
  const m = new THREE.MeshStandardMaterial({ color: 0xa9e4ec, emissive: 0x2a6f7a, emissiveIntensity: .35, roughness: .08, metalness: 0, transparent: true, side: THREE.DoubleSide, depthWrite: false });
  m.onBeforeCompile = sh => { sh.uniforms.fT = U.fT; sh.uniforms.fSp = { value: speed }; sh.uniforms.fA = { value: alpha }; sh.uniforms.pL = U.pL; sh.uniforms.pOn = { value: part };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float fT; varying vec2 fUV; varying vec3 fP;').replace('#include <begin_vertex>', '#include <begin_vertex>\nfUV = uv; fP = position; transformed.z += sin(position.x * 1.3 + fT * 1.7 + uv.y * 9.) * .06;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
uniform float fT, fSp, fA, pOn; uniform vec3 pL; varying vec2 fUV; varying vec3 fP;
float wh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float wn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(wh(i), wh(i + vec2(1, 0)), f.x), mix(wh(i + vec2(0, 1)), wh(i + 1.), f.x), f.y); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
float t = fT * fSp, y = fUV.y;
float a1 = wn(vec2(fUV.x * 38., y * 4. + t * 2.4)), a2 = wn(vec2(fUV.x * 90. + 3., y * 8. + t * 3.9)), a3 = wn(vec2(fUV.x * 14. + 7., y * 1.8 + t * 1.3));
float streak = smoothstep(.42, .9, a1 * .55 + a2 * .3 + a3 * .35);
float edge = wn(vec2(y * 7. + t * 1.4, fUV.x > .5 ? 3. : 9.)) * .07;
float side = smoothstep(.0 + edge, .11 + edge, fUV.x) * smoothstep(.0 + edge, .11 + edge, 1. - fUV.x);
float foam = smoothstep(.16, 0., y) * (.6 + .4 * wn(vec2(fUV.x * 26., y * 12. + t * 5.)));
float lip = smoothstep(.9, .97, y) * .55;
diffuseColor.rgb = mix(diffuseColor.rgb * (.85 + .3 * a3), vec3(1.), clamp(streak * .8 + foam + lip, 0., 1.));
diffuseColor.a = side * clamp(fA + streak * .45 + foam * .7 + lip, 0., .96);
// v43: the curtain parts round you as you walk through it, and the cave mouth behind it shows as a dark arch with lantern light
if (pOn > .5) { float dp = length(vec2(fP.x - pL.x, (fP.y - pL.y - 1.) * .55)), near = 1. - smoothstep(.6, 3.5, abs(fP.z - pL.z));
  diffuseColor.a *= mix(1., .1 + .25 * streak, near * (1. - smoothstep(.9, 2.3, dp)));
  float arch = (1. - smoothstep(2.0, 2.8, abs(fP.x))) * (1. - smoothstep(3.6, 5.0, fP.y));
  diffuseColor.a *= 1. - .38 * arch * (1. - streak * .6); }`)
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance *= .6 + .8 * streak;'); };
  m.customProgramCacheKey = () => 'hr-falls-v43-' + part; return m;
}

function poolMaterial(U, rx, rz, hit) {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .06, metalness: .05, transparent: true, depthWrite: false });
  m.onBeforeCompile = sh => { sh.uniforms.fT = U.fT; sh.uniforms.pR = { value: new THREE.Vector2(rx, rz) }; sh.uniforms.pH = { value: hit };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 pUV;').replace('#include <begin_vertex>', '#include <begin_vertex>\npUV = uv;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
uniform float fT; uniform vec2 pR, pH; varying vec2 pUV; float rip;
float ph(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 15731.7); }
float pn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(ph(i), ph(i + vec2(1, 0)), f.x), mix(ph(i + vec2(0, 1)), ph(i + 1.), f.x), f.y); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
vec2 q = (pUV - .5) * 2.; float r = length(q); vec2 mp = q * pR; float dh = length(mp - pH);
rip = sin(dh * 2.4 - fT * 4.2) * exp(-dh * .16) + .35 * sin(dot(mp, vec2(.8, .6)) * 1.7 + fT * 1.3);
vec3 deep = vec3(.02, .26, .33), shal = vec3(.24, .72, .70);
diffuseColor.rgb = mix(deep, shal, smoothstep(.45, .98, r)) + rip * .025;
float n = pn(mp * 1.8 + vec2(0., fT * 1.2)) * .6 + pn(mp * 4.3 - vec2(fT * .7, 0.)) * .4;
float foam = smoothstep(3.6, .3, dh) * smoothstep(.3, .75, n + .3 * smoothstep(3., 0., dh)) + smoothstep(.86, 1., r) * smoothstep(.45, .8, n) * .8;
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.96, 1., 1.), clamp(foam, 0., 1.));
diffuseColor.a = .9 * smoothstep(1., .96, r);`)
      .replace('#include <normal_fragment_begin>', '#include <normal_fragment_begin>\nnormal = normalize(normal + vec3(cos(rip * 3.) * .06, sin(rip * 2.) * .06, 0.));'); };
  m.customProgramCacheKey = () => 'hr-pool-v41'; return m;
}

function softDot() { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.45, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }

function boulderGeo(detail) { const g = new THREE.IcosahedronGeometry(1, detail), p = g.attributes.position, v = new THREE.Vector3();
  for (let k = 0; k < p.count; k++) { v.fromBufferAttribute(p, k); const n = fbm(v.x * 1.3 + 4, v.y * 1.3 + v.z * .9, 3); v.multiplyScalar(.78 + n * .45); v.y *= .72; p.setXYZ(k, v.x, v.y, v.z); }
  g.computeVertexNormals(); const N = g.attributes.normal, col = [], C = new THREE.Color(), rock = new THREE.Color(0x9a9298), moss = new THREE.Color(0x4f8a2e);
  for (let k = 0; k < p.count; k++) { v.fromBufferAttribute(p, k); C.copy(rock).multiplyScalar(.8 + .35 * fbm(v.x * 3, v.z * 3 + v.y, 2)); C.lerp(moss, sstep(.35, .75, N.getY(k)) * .85); col.push(C.r, C.g, C.b); }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); return g; }

export function createFalls({ position, rot, high = true }) {
  const group = new THREE.Group(); group.name = 'Bandit Falls scenery'; group.position.copy(position); group.rotation.y = rot;
  const U = { fT: { value: 0 }, pL: { value: new THREE.Vector3(0, -99, 99) } }, geos = [], mats = [], keep = (g, m) => (geos.push(g), mats.push(m), new THREE.Mesh(g, m));
  // cliff
  const SZ = high ? '1k' : '512', tRock = rockTex('rock_face', SZ), tAer = rockTex('aerial_rocks_02', SZ);
  const rockM = triplanarRock(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .88, metalness: 0 }), tRock, tAer, .14, 'cliff');
  const cliff = keep(buildCliff(high), rockM); cliff.castShadow = true; cliff.receiveShadow = true; group.add(cliff);
  // main falls (front curtain + slower sheet behind) and two side trickles
  const HN = topH(0) - .4;
  const front = keep(buildSheet(11.2, 8.4, HN, 1.0, 1.1, high ? 40 : 18, high ? 56 : 24), fallsMaterial(U, 1, .34, 1)); front.renderOrder = 3; group.add(front);
  const back = keep(buildSheet(10, 7.6, HN, .55, .7, high ? 24 : 12, high ? 40 : 18), fallsMaterial(U, .72, .22, 1)); back.renderOrder = 2; group.add(back);
  for (const s of [-1, 1]) { const u = 12.5 * s, hh = topH(u) * .62, tr = keep(buildSheet(1.7, 1.1, hh, .4, .5, 6, 20), fallsMaterial(U, 1.25, .3)); tr.position.set(u, 0, baseZ(u) + .6); tr.rotation.y = -Math.atan(dBaseZ(u)); tr.renderOrder = 2; group.add(tr); }
  // plunge pool (sits a hair under the flat apron, inside the terrain's dip)
  const PRX = 9.4, PRZ = 4.3, PZ = 4.4, poolG = new THREE.CircleGeometry(1, high ? 64 : 32); { const p = poolG.attributes.position; for (let k = 1; k < p.count; k++) { const a = Math.atan2(p.getY(k), p.getX(k)); const s = .93 + .1 * vnoise(Math.cos(a) * 2 + 5, Math.sin(a) * 2 + 3); p.setXY(k, p.getX(k) * s, p.getY(k) * s); } }
  const pool = keep(poolG, poolMaterial(U, PRX, PRZ, new THREE.Vector2(0, PZ - 2.1))); pool.rotation.x = -Math.PI / 2; pool.scale.set(PRX, PRZ, 1); pool.position.set(0, -.16, PZ); pool.renderOrder = 1; pool.receiveShadow = true; group.add(pool);
  // mist (soft sprites drifting up from where the water lands)
  const MN = high ? 46 : 20, mp = new Float32Array(MN * 3), mseed = []; for (let i = 0; i < MN; i++) mseed.push([Math.random(), (Math.random() - .5) * 12, Math.random() * 2.5, .5 + Math.random()]);
  const mistG = new THREE.BufferGeometry(); mistG.setAttribute('position', new THREE.BufferAttribute(mp, 3));
  const dot = softDot(), mistM = new THREE.PointsMaterial({ map: dot, size: high ? 5.5 : 4.5, sizeAttenuation: true, transparent: true, opacity: .28, depthWrite: false, color: 0xf2fbff });
  const mist = new THREE.Points(mistG, mistM); mist.frustumCulled = false; group.add(mist); geos.push(mistG); mats.push(mistM);
  // rainbow in the spray
  const rbG = new THREE.RingGeometry(6.2, 7.4, 64, 6, 0, Math.PI), rc = [], C = new THREE.Color(); { const p = rbG.attributes.position; for (let k = 0; k < p.count; k++) { const r = (Math.hypot(p.getX(k), p.getY(k)) - 6.2) / 1.2; C.setHSL(.83 * (1 - r) * .95, 1, .55); const e = Math.sin(Math.PI * Math.min(1, Math.max(0, r))); rc.push(C.r * e, C.g * e, C.b * e); } }
  rbG.setAttribute('color', new THREE.Float32BufferAttribute(rc, 3));
  const rbM = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: .16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const rainbow = keep(rbG, rbM); rainbow.position.set(0, -1.4, 6.4); rainbow.renderOrder = 4; group.add(rainbow);
  // mossy boulders round the pool and along the cliff foot (the front of the pool stays open: that is the way in)
  const bG = boulderGeo(high ? 4 : 3), bM = triplanarRock(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .85 }), tAer, tRock, .55, 'boulder'); geos.push(bG); mats.push(bM);
  const spots = []; let sd = 7; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 16; i++) { const a = Math.PI * (1.08 + .84 * i / 15) + (rnd() - .5) * .12; spots.push([Math.cos(a) * (PRX + 1.2 + rnd()), PZ + Math.sin(a) * (PRZ + .8 + rnd() * .8), .9 + rnd() * 1.6]); }
  for (let i = 0; i < 14; i++) { const u = (rnd() < .5 ? -1 : 1) * (11 + rnd() * 34); spots.push([u, baseZ(u) + 1.6 + rnd() * 3.5, 1.2 + rnd() * 2.6]); }
  for (const s of [-1, 1]) spots.push([s * (PRX + .6), PZ + 3.4, 1.4], [s * (PRX - .6), PZ + 4.8, .9]);
  const boulders = new THREE.InstancedMesh(bG, bM, spots.length), M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), S = new THREE.Vector3(), V = new THREE.Vector3();
  spots.forEach(([x, z, s], i) => { E.set((rnd() - .5) * .3, rnd() * 6.28, (rnd() - .5) * .3); Q.setFromEuler(E); M.compose(V.set(x, s * .25 - .3, z), Q, S.set(s * (1 + rnd() * .5), s, s * (1 + rnd() * .4))); boulders.setMatrixAt(i, M); });
  boulders.castShadow = true; boulders.receiveShadow = true; group.add(boulders);
  // v43: swap the stand-in boulders for the same scanned CC0 boulders the meadow uses, once they have loaded (same spots)
  let scanned = []; loadRockModels().then(R => { const per = R.map(() => []); spots.forEach((sp, i) => per[i % R.length].push([sp, i]));
    R.forEach((r, k) => { if (!per[k].length) return; const im = new THREE.InstancedMesh(r.geo, r.mat, per[k].length); per[k].forEach(([[x, z, sc], i], j) => { boulders.getMatrixAt(i, M); M.decompose(V, Q, S); const s2 = sc * 2.1; M.compose(V.set(x, -.35, z), Q, S.set(s2, s2 * .8, s2)); im.setMatrixAt(j, M); });
      im.castShadow = true; im.receiveShadow = true; group.add(im); scanned.push(im); }); boulders.visible = false; }).catch(() => {});
  // stylized pines along the top of the cliff
  const pineParts = [], pc = []; { const tr = new THREE.CylinderGeometry(.18, .26, 1.6, 6); tr.translate(0, .8, 0); pineParts.push([tr, 0x6a4a2c]); for (let k = 0; k < 3; k++) { const co = new THREE.ConeGeometry(1.7 - k * .42, 2.2, 8); co.translate(0, 1.9 + k * 1.15, 0); pineParts.push([co, [0x2f6a34, 0x3a7a3c, 0x4a8a44][k]]); } }
  const pinePos = [], pineCol = [], pineIdx = []; let off = 0; for (const [g0, hex] of pineParts) { const gi = g0.toNonIndexed(), p = gi.attributes.position; C.setHex(hex); for (let k = 0; k < p.count; k++) { pinePos.push(p.getX(k), p.getY(k), p.getZ(k)); pineCol.push(C.r, C.g, C.b); } g0.dispose(); gi.dispose(); }
  const pineG = new THREE.BufferGeometry(); pineG.setAttribute('position', new THREE.Float32BufferAttribute(pinePos, 3)); pineG.setAttribute('color', new THREE.Float32BufferAttribute(pineCol, 3)); pineG.computeVertexNormals();
  const pineM = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .85, flatShading: true }); geos.push(pineG); mats.push(pineM);
  const PN = high ? 22 : 12, pines = new THREE.InstancedMesh(pineG, pineM, PN);
  for (let i = 0; i < PN; i++) { let u = (rnd() * 2 - 1) * 42; if (Math.abs(u) < 7) u += Math.sign(u || 1) * 7; const t = .86 + rnd() * .1, a = (t - .8) / .2 * Math.PI / 2, y = topH(u) + 4.2 * Math.sin(a) - .9, z = baseZ(u) - 14 * (1 - Math.cos(a)) - 6 * a - 1.5;
    const s = 1.1 + rnd() * .9; E.set(0, rnd() * 6.28, 0); Q.setFromEuler(E); M.compose(V.set(u, y, z), Q, S.set(s, s * (1 + rnd() * .3), s)); pines.setMatrixAt(i, M); }
  pines.castShadow = true; group.add(pines);
  // ---- v43 upgrade: the way in reads from the meadow ----
  // warm lantern light spilling out of the mouth (seen through the parted curtain), a dark arch rim
  const glowT = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), gr = x.createRadialGradient(64, 78, 4, 64, 70, 64);
    gr.addColorStop(0, 'rgba(255,190,110,1)'); gr.addColorStop(.35, 'rgba(255,130,50,.55)'); gr.addColorStop(1, 'rgba(255,90,20,0)'); x.fillStyle = gr; x.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const glowM = new THREE.MeshBasicMaterial({ map: glowT, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: .85 }), glowG = new THREE.PlaneGeometry(5.6, 5.4);
  const glow = keep(glowG, glowM); glow.position.set(0, 2.5, -.9); glow.renderOrder = 1; group.add(glow);
  // two torches flanking the mouth (flame sprites flicker), iron brackets in the rock
  const flameT = (() => { const c = document.createElement('canvas'); c.width = 64; c.height = 128; const x = c.getContext('2d'), gr = x.createRadialGradient(32, 92, 2, 32, 80, 50);
    gr.addColorStop(0, 'rgba(255,250,210,1)'); gr.addColorStop(.25, 'rgba(255,190,70,.95)'); gr.addColorStop(.6, 'rgba(255,90,20,.5)'); gr.addColorStop(1, 'rgba(200,40,0,0)'); x.fillStyle = gr; x.beginPath(); x.ellipse(32, 76, 24, 52, 0, 0, Math.PI * 2); x.fill(); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const flameM = new THREE.SpriteMaterial({ fog: false, map: flameT, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }), stickM = new THREE.MeshStandardMaterial({ color: 0x2a1c12, roughness: .9 }), stickG = new THREE.CylinderGeometry(.07, .05, 1.1, 6);
  geos.push(stickG); mats.push(flameM, stickM, glowM); const flames = [];
  for (const s of [-1, 1]) { const st = new THREE.Mesh(stickG, stickM); st.position.set(s * 4.3, 2.4, .9); st.rotation.z = -s * .35; group.add(st); const f = new THREE.Sprite(flameM); f.position.set(s * 4.5, 3.15, .95); f.scale.set(.55, 1.1, 1); f.renderOrder = 5; group.add(f); flames.push(f);
    const hl = new THREE.Sprite(new THREE.SpriteMaterial({ fog: false, map: glowT, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: .45 })); hl.position.copy(f.position); hl.scale.set(3.2, 3.2, 1); hl.renderOrder = 4; group.add(hl); mats.push(hl.material); flames.push(hl); }
  // stepping stones across the pool to the mouth (the wading lane), flat-topped and wet
  { const stG = new THREE.CylinderGeometry(1, 1.1, 1, high ? 10 : 7); { const p = stG.attributes.position; for (let k = 0; k < p.count; k++) { const x = p.getX(k), z = p.getZ(k), a = Math.atan2(z, x); const r = .82 + .22 * vnoise(Math.cos(a) * 1.7 + 2, Math.sin(a) * 1.7 + k * 0); p.setX(k, x * r); p.setZ(k, z * r); } stG.computeVertexNormals(); }
    const stM = new THREE.MeshStandardMaterial({ color: 0x7d7a74, roughness: .35, metalness: 0 }); geos.push(stG); mats.push(stM);
    const lane = [[-.4, 8.2, .62], [.5, 6.7, .55], [-.3, 5.2, .6], [.4, 3.7, .52], [-.2, 2.3, .5]], st = new THREE.InstancedMesh(stG, stM, lane.length);
    lane.forEach(([x, z, r], i) => { E.set(0, rnd() * 6.28, 0); Q.setFromEuler(E); M.compose(V.set(x, -.38, z), Q, S.set(r * 1.25, .32, r)); st.setMatrixAt(i, M); }); st.receiveShadow = true; group.add(st); }
  // splash: droplets thrown up where the curtain lands
  const SN = high ? 70 : 30, sp = new Float32Array(SN * 3), sseed = []; for (let i = 0; i < SN; i++) sseed.push([Math.random(), (Math.random() - .5) * 8.5, .6 + Math.random() * 1.8, 1.5 + Math.random() * 2.5, (Math.random() - .3) * 2]);
  const splG = new THREE.BufferGeometry(); splG.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  const splM = new THREE.PointsMaterial({ map: dot, size: high ? .5 : .6, sizeAttenuation: true, transparent: true, opacity: .75, depthWrite: false, color: 0xffffff });
  const splash = new THREE.Points(splG, splM); splash.frustumCulled = false; splash.renderOrder = 5; group.add(splash); geos.push(splG); mats.push(splM);
  // ferns along the pool rim and the damp cliff foot (crossed alpha cards)
  { const c = document.createElement('canvas'); c.width = 64; c.height = 128; const x = c.getContext('2d'); x.strokeStyle = '#3f7a2a'; x.lineCap = 'round';
    for (let f = 0; f < 3; f++) { const ox = 20 + f * 12, lean = (f - 1) * .25; x.lineWidth = 2.2; x.beginPath(); x.moveTo(32, 128); x.quadraticCurveTo(ox, 60, ox + lean * 40, 8); x.stroke();
      for (let k = 0; k < 14; k++) { const t = k / 14, yy = 128 - t * 118, xx = 32 + (ox + lean * 40 - 32) * t, L = 15 * (1 - t * .75); x.lineWidth = 3 - t * 1.6; x.strokeStyle = k % 2 ? '#4f8f30' : '#3c7a28';
        for (const sg of [-1, 1]) { x.beginPath(); x.moveTo(xx, yy); x.lineTo(xx + sg * L, yy - L * .45); x.stroke(); } } }
    const fT = new THREE.CanvasTexture(c); fT.colorSpace = THREE.SRGBColorSpace; const fM = new THREE.MeshStandardMaterial({ map: fT, alphaTest: .45, side: THREE.DoubleSide, roughness: .8 });
    const a = new THREE.PlaneGeometry(1, 1.6); a.translate(0, .8, 0); const b = a.clone(); b.rotateY(Math.PI / 2); const { mergeGeometries } = { mergeGeometries: (gs) => { const o = new THREE.BufferGeometry(); const P = [], N = [], UV = [], I = []; let off = 0; for (const g of gs) { const p = g.attributes.position, n = g.attributes.normal, u = g.attributes.uv; for (let k = 0; k < p.count; k++) { P.push(p.getX(k), p.getY(k), p.getZ(k)); N.push(n.getX(k), n.getY(k), n.getZ(k)); UV.push(u.getX(k), u.getY(k)); } for (let k = 0; k < g.index.count; k++) I.push(g.index.getX(k) + off); off += p.count; } o.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); o.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); o.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2)); o.setIndex(I); return o; } };
    const fG = mergeGeometries([a, b]); a.dispose(); b.dispose(); geos.push(fG); mats.push(fM); fM.userData.tex = fT;
    const FN = high ? 64 : 28, ferns = new THREE.InstancedMesh(fG, fM, FN);
    for (let i = 0; i < FN; i++) { let x, z; if (i < FN * .6) { const an = Math.PI * (1.02 + .96 * rnd()); x = Math.cos(an) * (PRX + .5 + rnd() * 1.6); z = PZ + Math.sin(an) * (PRZ + .4 + rnd() * 1.2); if (Math.abs(x) < 4.5) x += Math.sign(x || 1) * 4.5; } else { const u = (rnd() < .5 ? -1 : 1) * (6 + rnd() * 30); x = u; z = baseZ(u) + .8 + rnd() * 1.4; }
      const s = .7 + rnd() * .8; E.set(0, rnd() * 6.28, 0); Q.setFromEuler(E); M.compose(V.set(x, -.1, z), Q, S.set(s, s, s)); ferns.setMatrixAt(i, M); }
    group.add(ferns); }
  // a weathered sign at the pool edge: BANDIT FALLS — the way in is through the falls
  { const c = document.createElement('canvas'); c.width = 512; c.height = 192; const x = c.getContext('2d'); const g2 = x.createLinearGradient(0, 0, 0, 192); g2.addColorStop(0, '#8a5a32'); g2.addColorStop(1, '#5e3a1e'); x.fillStyle = g2; x.fillRect(0, 0, 512, 192);
    x.strokeStyle = 'rgba(40,20,8,.35)'; x.lineWidth = 2; for (let k = 0; k < 9; k++) { x.beginPath(); x.moveTo(0, 14 + k * 21 + Math.sin(k) * 3); x.bezierCurveTo(170, 8 + k * 21, 340, 20 + k * 21, 512, 12 + k * 21); x.stroke(); }
    x.fillStyle = '#f6e2b0'; x.textAlign = 'center'; x.font = '900 64px Georgia, serif'; x.fillText('BANDIT FALLS', 256, 86); x.font = 'italic 700 30px Georgia, serif'; x.fillText('enter through the falls ➜', 256, 146);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; const bm = new THREE.MeshStandardMaterial({ map: t, roughness: .85 }), pm = new THREE.MeshStandardMaterial({ color: 0x4a301a, roughness: .9 });
    const bg = new THREE.BoxGeometry(3.2, 1.2, .12), pg = new THREE.BoxGeometry(.16, 2.4, .16); geos.push(bg, pg); mats.push(bm, pm); bm.userData.tex = t;
    const sign = new THREE.Group(); const board = new THREE.Mesh(bg, [pm, pm, pm, pm, bm, pm]); board.position.y = 1.75; sign.add(board); for (const s of [-1, 1]) { const po = new THREE.Mesh(pg, pm); po.position.set(s * 1.35, 1.1, -.08); po.castShadow = true; sign.add(po); }
    board.castShadow = true; sign.position.set(-PRX - 2.6, -.05, PZ + 6.5); sign.rotation.y = .55; group.add(sign); }
  // collision: the cliff foot as world-space segments (the mouth is left open)
  group.updateMatrixWorld(true); const segs = [], A = new THREE.Vector3(), B = new THREE.Vector3();
  for (let u = -U0; u < U0; u += 3) { const u2 = Math.min(U0, u + 3); if (Math.abs(u) < MOUTH.hw + .4 || Math.abs(u2) < MOUTH.hw + .4 || (u < 0 && u2 > 0)) continue;
    A.set(u, 0, baseZ(u) - .2); B.set(u2, 0, baseZ(u2) - .2); group.localToWorld(A); group.localToWorld(B); segs.push([A.x, A.z, B.x, B.z]); }
  for (const s of [-1, 1]) { A.set(s * (MOUTH.hw + .5), 0, -.4); B.set(s * (MOUTH.hw + .5), 0, 1.0); group.localToWorld(A); group.localToWorld(B); segs.push([A.x, A.z, B.x, B.z]); }
  const y0 = position.y;
  function hit(x, z, r, y) { if (y > y0 + 30 || Math.abs(x - position.x) > 75 || Math.abs(z - position.z) > 75) return false; for (const w of segs) { const ex = w[2] - w[0], ez = w[3] - w[1], L = ex * ex + ez * ez, t = Math.max(0, Math.min(1, ((x - w[0]) * ex + (z - w[1]) * ez) / L)), dx = x - (w[0] + ex * t), dz = z - (w[1] + ez * t); if (dx * dx + dz * dz < r * r) return true; } return false; }
  const inv = new THREE.Matrix4();
  function update(dt, near, pw) { U.fT.value += dt; if (!near) { U.pL.value.set(0, -99, 99); return; } const t = U.fT.value;
    if (pw) { inv.copy(group.matrixWorld).invert(); U.pL.value.copy(pw).applyMatrix4(inv); } // the curtain parts round the player
    for (let i = 0; i < SN; i++) { const [ph, x, vy, vz, vx] = sseed[i], life = (t * .9 * (1 + vy * .1) + ph) % 1, tt = life * .9; sp[i * 3] = x + vx * tt; sp[i * 3 + 1] = -.1 + vy * 2.6 * tt - 4.9 * tt * tt; sp[i * 3 + 2] = 2.1 + vz * tt; if (sp[i * 3 + 1] < -.2) sp[i * 3 + 1] = -.2; }
    splG.attributes.position.needsUpdate = true;
    for (let i = 0; i < flames.length; i++) { const f = flames[i], k = 1 + .14 * Math.sin(t * 13 + i * 2.1) + .08 * Math.sin(t * 29 + i); if (i % 2 === 0) f.scale.set(.55 * k, 1.1 * k, 1); else f.material.opacity = .38 + .1 * k; }
    for (let i = 0; i < MN; i++) { const [ph, x, z, sp] = mseed[i], life = (t * .16 * sp + ph) % 1; mp[i * 3] = x * (.7 + life * .5); mp[i * 3 + 1] = .2 + life * 6.5; mp[i * 3 + 2] = 1.8 + z + life * 2.4; }
    mistG.attributes.position.needsUpdate = true; mistM.opacity = .28; }
  function dispose() { group.removeFromParent(); for (const g of geos) g.dispose(); for (const m of mats) m.dispose(); dot.dispose(); glowT.dispose(); flameT.dispose(); for (const m of mats) if (m.userData.tex) m.userData.tex.dispose(); boulders.dispose(); pines.dispose(); for (const im of scanned) im.dispose(); }
  return { group, update, hit, dispose, segs };
}
