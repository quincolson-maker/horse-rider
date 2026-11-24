// v42 BANDIT FALLS HIDEOUT — the inside of the waterfall cave, rebuilt from scratch.
// Three levels inside the mountain, reached through the tunnel behind the falls:
//   L0  OUTLAW HALL (floor 0)    torch-lit cavern: plank bar with bottle shelves, footlit stage with a red curtain, poker table,
//                                 three slot cabinets, a campfire, mine-cart rails, crates and barrels, hanging lanterns,
//                                 WANTED posters, and a timber lookout balcony (ladder) along the west wall
//   L1  THE CHASM (floor -6)      down a carved stair: a deep crack with a glowing underground river 11 m below,
//                                 crossed by a sagging rope-and-plank bridge with lanterns on its posts
//   L2  TREASURE GROTTO (-12)     down a second stair, behind the iron vault gate: heaps of gold, three strongboxes, a golden
//                                 idol on a pedestal in a shaft of light, an old ship's prow buried in the rock, glowing crystals
// Look: every static surface is merged into ONE vertex-coloured mesh with the torch / fire / river / gold light baked into its
// colours (painted, moody, and the same on a phone as on a desktop — no per-pixel lights needed for the rock). Characters are
// lit by a few real point lights (hrcave.js keeps two on phones). Collisions are axis-aligned boxes (the site is rotated by a
// multiple of 90 degrees), floors are box tops (stairs are 0.3 m steps), walls are rings of small boxes.
// API matches the old createBanditCave (src/hrbanditcave.js) so src/hrcave.js drives the fight, key, vault and loot.
import * as THREE from 'three';
import { PERF } from './perfopts.js?v=105';

const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function hash(x, y) { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); }
function vn(x, y) { const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy), b = hash(ix + 1, iy), c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1); return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy; }
function fbm(x, y, o = 3) { let s = 0, a = .5, n = 0; for (let i = 0; i < o; i++) { s += vn(x, y) * a; n += a; a *= .5; const t = x; x = x * 1.7 + y * .9 + 3.1; y = y * 1.7 - t * .9 + 1.7; } return s / n; }
const lin = hex => new THREE.Color(hex); // THREE.Color from hex = linear working space

// ---------------- layout (local metres: x across the mouth, +z out of the mouth, y up from the ground at the mouth) ----------------
export const HALL = { cx: -3, cz: -23, rx: 15, rz: 12.5, y: 0, h: 12.5 };
export const CHASM = { cx: 28, cz: -40, rx: 11, rz: 15.5, y: -6, pit: -18, h: 13 };
export const GROTTO = { cx: -8, cz: -50, rx: 14, rz: 7.5, y: -12, h: 9 };
const BRIDGE = { x: 28, z0: -30, z1: -49, y: -6, w: 1.8, sag: .6 };
const ROOMS = [HALL, CHASM, GROTTO];

// ---------------- light used for baking (local positions) ----------------
function bakeLights() {
  const L = []; const add = (x, y, z, hex, s, r) => L.push({ p: [x, y, z], c: lin(hex), s, r });
  add(0, 3, 2, 0x9fd8ff, 1.8, 7);                                    // daylight through the falls at the mouth
  add(-2, 1.4, -24, 0xff8a3a, 2.3, 7);                               // campfire
  for (const [x, y, z] of [[-4, 3.6, -33.6], [8.6, 3.2, -16.5], [-14, 2.9, -14.5], [10.2, 3, -30], [-16.5, 6.6, -23], [0, 3, -10.5], [-9.5, 3.3, -33.8]]) add(x, y, z, 0xffa04a, 1.15, 4.2);
  add(8.6, 1.2, -23, 0xff5c7a, 1.1, 4.5);                              // stage footlights (rosy)
  for (const [x, y, z] of [[14, 2.2, -23], [22, -1.4, -23], [28, -3.4, -25.5]]) add(x, y, z, 0xffa04a, 1.3, 5); // stair torches
  add(28, -15, -39.5, 0x38f0d0, 2.6, 10);                            // the glowing river
  for (const z of [-30, -39.5, -49]) for (const s of [-1, 1]) add(28 + s * 1.15, -4.4, z, 0xffb35a, 1, 3.5); // bridge lanterns
  add(22, -4.2, -50.5, 0xffa04a, 1.3, 5); add(12, -9, -50.5, 0xffa04a, 1.3, 5);
  add(-8, -6, -51, 0xffd27a, 2.2, 8);                               // the gold
  add(-8, -4, -56, 0xfff1c8, 1.8, 5);                                  // shaft of light on the idol
  add(-19, -9, -47, 0xb46cff, 1.4, 5); add(2, -10, -55, 0x46d8ff, 1.3, 4.5); // crystals
  return L;
}

// ---------------- merged, baked geometry ----------------
function Baker(lights, amb) {
  const P = [], C = [], I = []; let n = 0; const v = new THREE.Vector3(), nr = new THREE.Vector3(), nm = new THREE.Matrix3(), col = new THREE.Color();
  function lightAt(p, q, two, out) { let r = amb[0], g = amb[1], b = amb[2];
    for (const L of lights) { const dx = L.p[0] - p.x, dy = L.p[1] - p.y, dz = L.p[2] - p.z, d2 = dx * dx + dy * dy + dz * dz; if (d2 > L.r * L.r * 9) continue; const d = Math.sqrt(d2) + 1e-3;
      let k = (q.x * dx + q.y * dy + q.z * dz) / d; k = two ? Math.abs(k) : Math.max(0, k); const f = L.s * (k * .72 + .28) / (1 + d2 / (L.r * L.r)); r += L.c.r * f; g += L.c.g * f; b += L.c.b * f; }
    out[0] = r; out[1] = g; out[2] = b; return out; }
  const lo = [0, 0, 0];
  function add(geo, m, paint, o = {}) { const pos = geo.attributes.position; if (!geo.attributes.normal) geo.computeVertexNormals(); const nor = geo.attributes.normal; nm.getNormalMatrix(m);
    for (let k = 0; k < pos.count; k++) { v.fromBufferAttribute(pos, k).applyMatrix4(m); nr.fromBufferAttribute(nor, k).applyMatrix3(nm).normalize();
      paint(v, nr, col); lightAt(v, nr, o.two, lo); const e = o.emit || 0;
      P.push(v.x, v.y, v.z); const sat = x => x > 1.1 ? 1.1 + (x - 1.1) / (1 + (x - 1.1) * 1.5) : x; C.push(sat(col.r * (lo[0] + e)), sat(col.g * (lo[1] + e)), sat(col.b * (lo[2] + e))); }
    if (geo.index) for (let k = 0; k < geo.index.count; k++) I.push(geo.index.getX(k) + n); else for (let k = 0; k < pos.count; k++) I.push(k + n);
    n += pos.count; geo.dispose(); }
  function build() { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); g.setIndex(I); g.computeVertexNormals(); g.computeBoundingSphere(); return g; }
  return { add, build, lightAt, count: () => n };
}
const M4 = (x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
const flat = hex => { const c = lin(hex); return (p, q, out) => out.copy(c); };
const noisy = (hex, amt = .18, f = 1.3) => { const c = lin(hex); return (p, q, out) => out.copy(c).multiplyScalar(1 - amt + 2 * amt * vn(p.x * f + p.z * .37, p.y * f + p.z * f)); };
const wood = (hex = 0x7a4e2c) => { const c = lin(hex); return (p, q, out) => { const g = .78 + .32 * vn(p.x * 3.1 + p.z * 2.3, p.y * 14 + p.x * .5); out.copy(c).multiplyScalar(g); }; };

// rock: warm sandstone / cool slate, damp darker low down, wet sheen near the river, mineral streaks
function rockPaint(warm = 1) { const a = lin(0x8c7866), b = lin(0x6a6870), d = lin(0x3c3530), m = lin(0x4f6a3a), t = new THREE.Color();
  return (p, q, out) => { const n1 = fbm(p.x * .16 + p.z * .07, p.y * .2 + p.z * .11, 3), n2 = vn(p.x * .9 + p.z * .6, p.y * 1.1);
    out.copy(b).lerp(a, sstep(.3, .75, n1) * warm); out.multiplyScalar(.72 + .45 * n2); t.copy(d); out.lerp(t, .25 * sstep(.6, .9, vn(p.x * .4, p.y * 2.5 + p.z * .3)));
    if (q.y > .6 && p.y < -2) out.lerp(m, .25 * sstep(.6, .9, q.y)); }; }

// dome / cavern shell: closed but for the doorways (holes: {a: angle, w: half-width rad, y1: top})
function shell(B, R, holes, yb, paint, seg) { const NA = seg[0], NE = seg[1], pos = [], idx = [], keep = [], top = R.y + R.h;
  const at = (a, t) => { const e = t * Math.PI / 2, rr = Math.pow(Math.cos(e), .5), y = yb + (top - yb) * Math.sin(e);
    const nz = 1 + .16 * (fbm(a * 2.6 + R.cx, y * .22 + R.cz, 3) - .5) * 2 + .05 * (vn(a * 11, y * .9) - .5) * 2 + (t > .9 ? 0 : 0);
    return [R.cx + Math.cos(a) * R.rx * rr * nz, y + (t > .85 ? (vn(a * 5, R.cz) - .5) * 1.2 * sstep(.85, 1, t) : 0), R.cz + Math.sin(a) * R.rz * rr * nz]; };
  for (let j = 0; j <= NE; j++) for (let i = 0; i <= NA; i++) { const a = i / NA * Math.PI * 2; pos.push(...at(a, j / NE)); }
  for (let j = 0; j < NE; j++) for (let i = 0; i < NA; i++) { const a = (i + .5) / NA * Math.PI * 2, y = pos[((j * (NA + 1)) + i) * 3 + 1];
    let hole = false; for (const h of holes) { let d = Math.abs(((a - h.a) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI); if (d < h.w && y < h.y1 && y > (h.y0 ?? -1e9)) hole = true; } if (hole) continue;
    const p0 = j * (NA + 1) + i, p1 = p0 + 1, p2 = p0 + NA + 1, p3 = p2 + 1; idx.push(p0, p2, p1, p1, p2, p3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); B.add(g, new THREE.Matrix4(), paint, { two: true }); }

// tunnel: arch section along an axis-aligned polyline of floor points [x, y, z]; ends flare into the rooms
function tunnel(B, pts, w, h, paint, flare = [1.25, 1.25]) { const S = 14, rings = [];
  const path = []; for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1], L = Math.hypot(b[0] - a[0], b[2] - a[2]), n = Math.max(1, Math.ceil(L / .8)); for (let k = 0; k < n; k++) path.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n, a[2] + (b[2] - a[2]) * k / n]); } path.push(pts[pts.length - 1]);
  const pos = [], idx = [];
  path.forEach((p, i) => { const q = path[Math.min(path.length - 1, i + 1)], r = path[Math.max(0, i - 1)], dx = q[0] - r[0], dz = q[2] - r[2], L = Math.hypot(dx, dz) || 1, sx = -dz / L, sz = dx / L;
    const f = i === 0 ? flare[0] : i === path.length - 1 ? flare[1] : 1;
    for (let s = 0; s <= S; s++) { const th = s / S * Math.PI, c = Math.cos(th), lat = Math.sign(c) * Math.pow(Math.abs(c), .62) * w / 2 * f, up = Math.pow(Math.sin(th), .7) * h * f, nz = (vn(i * .7 + s * 1.3, p[1] + s) - .5) * .5;
      pos.push(p[0] + sx * (lat + Math.sign(c) * nz), p[1] - .3 + up + Math.abs(nz) * .4, p[2] + sz * (lat + Math.sign(c) * nz)); } });
  for (let i = 0; i < path.length - 1; i++) for (let s = 0; s < S; s++) { const a = i * (S + 1) + s, b = a + 1, c = a + S + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); B.add(g, new THREE.Matrix4(), paint, { two: true }); }

// v42: real scanned-rock texture detail on the baked colours (triplanar in world space, so no UVs needed; sharp, not blurred)
let ROCK_TEX = null;
export function rockDetail(mat, scale = 1.6, k = .7) { if (!ROCK_TEX) { ROCK_TEX = new THREE.TextureLoader().load('assets/tex/rock_face_diff_1k.webp'); ROCK_TEX.wrapS = ROCK_TEX.wrapT = THREE.RepeatWrapping; ROCK_TEX.anisotropy = 8; ROCK_TEX.colorSpace = THREE.SRGBColorSpace; }
  mat.onBeforeCompile = sh => { sh.uniforms.tRk = { value: ROCK_TEX };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 rkP; varying vec3 rkN;').replace('#include <begin_vertex>', '#include <begin_vertex>\nrkP = (modelMatrix * vec4(position, 1.)).xyz; rkN = normalize(mat3(modelMatrix) * normal);');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D tRk; varying vec3 rkP; varying vec3 rkN;')
      .replace('#include <color_fragment>', `#include <color_fragment>
{ vec3 w = pow(abs(rkN), vec3(4.)); w /= (w.x + w.y + w.z + 1e-4); vec3 p = rkP / ${scale.toFixed(2)};
  vec3 t = texture2D(tRk, p.zy).rgb * w.x + texture2D(tRk, p.xz).rgb * w.y + texture2D(tRk, p.xy).rgb * w.z; p *= .23;
  vec3 t2 = texture2D(tRk, p.zy + .37).rgb * w.x + texture2D(tRk, p.xz + .37).rgb * w.y + texture2D(tRk, p.xy + .37).rgb * w.z;
  float l = dot(t, vec3(.3, .59, .11)) / .075, l2 = dot(t2, vec3(.3, .59, .11)) / .075; /* the photo is dark and low-contrast: normalise to its mean, then stretch */
  float d = clamp(pow(l, 2.2) * mix(.75, 1.25, smoothstep(.7, 1.3, l2)), .38, 1.75);
  diffuseColor.rgb *= mix(1., d, ${k.toFixed(2)}); }`); };
  mat.customProgramCacheKey = () => 'rk' + scale + k; mat.needsUpdate = true; return mat; }
// ---------------- the hideout ----------------
export function createHideout({ position, rotationY = 0, quality = 'high', viewDist = 320 } = {}) {
  const high = quality !== 'low', group = new THREE.Group(); group.name = 'Bandit Falls hideout';
  group.position.copy(position); group.rotation.y = rotationY; group.updateMatrixWorld(true);
  const W = (x, y, z) => new THREE.Vector3(x, y, z).applyMatrix4(group.matrixWorld);
  const colliders = [], interactions = [], spawnPoints = [], lootPoints = [], geos = [], mats = [], texs = [];
  const box3 = (x0, y0, z0, x1, y1, z1) => { const b = new THREE.Box3(new THREE.Vector3(Math.min(x0, x1), Math.min(y0, y1), Math.min(z0, z1)), new THREE.Vector3(Math.max(x0, x1), Math.max(y0, y1), Math.max(z0, z1))); b.applyMatrix4(group.matrixWorld); colliders.push(b); return b; };
  const floor = (x0, z0, x1, z1, y) => box3(x0, y - .4, z0, x1, y, z1);                  // walkable top at y (0.4 thick: not a wall)
  const wallBox = (x, z, y0, y1, s = .8) => box3(x - s, y0, z - s, x + s, y1, z + s);
  const marker = (id, type, x, y, z, extra = {}) => { const a = { id, type, position: W(x, y, z), radius: 2.4, ...extra }; interactions.push(a); return a; };
  const lights = bakeLights(), B = Baker(lights, [.07, .08, .11]); /* v42t: cooler fill so the torchlight reads as warm pools, not one orange wash */
  const rock = rockPaint(1), rockCool = rockPaint(.35);
  let seed = 9127; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  // ---- rock shells + doorways ----
  const ang = (R, x, z) => Math.atan2((z - R.cz) / R.rz, (x - R.cx) / R.rx);
  shell(B, HALL, [{ a: ang(HALL, 0, -10), w: .2, y1: 5.6 }, { a: ang(HALL, 12, -23), w: .22, y1: 4.6 }], HALL.y - .6, rock, high ? [96, 22] : [64, 14]);
  shell(B, CHASM, [{ a: ang(CHASM, 28, -27), w: .2, y0: -7.2, y1: -1.8 }, { a: ang(CHASM, 19.9, -50.5), w: .19, y0: -7.2, y1: -1.8 }], CHASM.pit - 1, rockCool, high ? [72, 30] : [48, 18]);
  shell(B, GROTTO, [{ a: ang(GROTTO, 6, -50.5), w: .24, y1: -7.4 }], GROTTO.y - .6, rock, high ? [80, 18] : [56, 12]);
  // tunnels: the mouth, stair 1 (hall -> chasm), stair 2 (chasm -> grotto)
  tunnel(B, [[0, 0, 1.2], [0, 0, -12]], 5.4, 5.3, rock, [1.15, 1.55]);
  tunnel(B, [[10.5, 0, -23], [15, 0, -23], [27, -6, -23], [28.5, -6, -23], [28.5, -6, -28.5]], 3.6, 4.2, rock, [1.6, 1.7]);
  tunnel(B, [[21.5, -6, -50.5], [18, -6, -50.5], [8, -12, -50.5], [5, -12, -50.5]], 3.6, 4.2, rock, [1.75, 1.7]);

  // ---- backstop: a dark rock box round the whole hideout (no front face), so a seam anywhere shows rock, never the sky ----
  { const dark = (() => { const c = lin(0x2a221c); return (p, q, o) => o.copy(c).multiplyScalar(.6 + .5 * vn(p.x * .4 + p.z * .3, p.y * .4)); })();
    const X0 = -25, X1 = 41, XM = 14, Y0 = -21, Y1 = 13, Z0 = -58, ZL = -12, ZR = -26, face = (x0, x1, z0, z1, y0, y1, m) => B.add(new THREE.PlaneGeometry(1, 1, 8, 8), m, dark, { two: true });
    const wall = (x0, z0, x1, z1) => { const L = Math.hypot(x1 - x0, z1 - z0); B.add(new THREE.PlaneGeometry(L, Y1 - Y0, 8, 8), M4((x0 + x1) / 2, (Y0 + Y1) / 2, (z0 + z1) / 2, 1, 1, 1, 0, Math.atan2(-(z1 - z0), x1 - x0), 0), dark, { two: true }); };
    const lid = (x0, x1, z0, z1, y) => B.add(new THREE.PlaneGeometry(x1 - x0, z1 - z0, 8, 8), M4((x0 + x1) / 2, y, (z0 + z1) / 2, 1, 1, 1, -Math.PI / 2), dark, { two: true }); void face;
    // only where the mountain covers it (never in front of the cliff)
    wall(X0, Z0, X1, Z0); wall(X0, Z0, X0, ZL); wall(X1, Z0, X1, ZR);
    for (const y of [Y0, Y1]) { lid(X0, XM, Z0, ZL, y); lid(XM, X1, Z0, ZR, y); } }
  // ---- floors (visual) ----
  const disc = (R, y, paint) => { const g = new THREE.CircleGeometry(1, high ? 64 : 40); g.rotateX(-Math.PI / 2); const p = g.attributes.position;
    for (let k = 0; k < p.count; k++) p.setY(k, (vn(p.getX(k) * 7 + R.cx, p.getZ(k) * 7) - .5) * .08); g.computeVertexNormals(); B.add(g, M4(R.cx, y, R.cz, R.rx * 1.05, 1, R.rz * 1.05), paint); };
  const dirt = (() => { const a = lin(0x5c4632), b = lin(0x7a6247), s = lin(0x8d8576); return (p, q, out) => { const n = fbm(p.x * .35, p.z * .35, 3); out.copy(a).lerp(b, n); out.lerp(s, sstep(.65, .85, vn(p.x * 1.4, p.z * 1.4)) * .6); }; })();
  disc(HALL, HALL.y + .01, dirt); disc(GROTTO, GROTTO.y + .01, (() => { const s = lin(0x9a8458), d = lin(0x6e5c3e); return (p, q, out) => out.copy(d).lerp(s, fbm(p.x * .4, p.z * .4)); })());
  const slab = (x0, z0, x1, z1, y, thick, paint) => B.add(new THREE.BoxGeometry(1, 1, 1, 4, 1, 4), M4((x0 + x1) / 2, y - thick / 2, (z0 + z1) / 2, Math.abs(x1 - x0), thick, Math.abs(z1 - z0)), paint);
  slab(-2.6, 1.2, 2.6, -12.5, 0, .5, dirt);                                                       // mouth tunnel floor
  slab(10, -21.2, 15, -24.8, 0, .5, dirt);                                                         // top of stair 1
  slab(17.5, -24, 38.5, -30.2, -6, 3, rockCool); slab(17.5, -48.8, 38.5, -56, -6, 3, rockCool);    // chasm ledges
  slab(26.8, -21.4, 30.2, -27.2, -6, .5, dirt);                                                    // stair 1 landing
  // stairs (visual + walkable steps)
  const stairs = (x0, x1, y0, y1, zMin, zMax) => { const n = Math.round(Math.abs(y1 - y0) / .3), dx = (x1 - x0) / n, dy = (y1 - y0) / n;
    for (let i = 0; i < n; i++) { const a = x0 + dx * i, b = a + dx, top = y0 + dy * (i + 1); floor(Math.min(a, b), zMin, Math.max(a, b), zMax, top);
      B.add(new THREE.BoxGeometry(1, 1, 1), M4((a + b) / 2, top - .35, (zMin + zMax) / 2, Math.abs(dx) + .02, .7, zMax - zMin), noisy(0x7d6d5c, .12, 2)); } };
  stairs(15, 27, 0, -6, -24.9, -21.1);
  stairs(18, 8, -6, -12, -52.4, -48.6);
  // walkable floors
  floor(-2.7, -12.6, 2.7, 1.8, 0); floor(HALL.cx - HALL.rx, HALL.cz - HALL.rz, HALL.cx + HALL.rx, HALL.cz + HALL.rz, 0); floor(10, -24.9, 15.2, -21.1, 0);
  floor(26.6, -28.8, 30.4, -21.1, -6); floor(17.5, -30.2, 38.5, -24, -6); floor(17.5, -56, 38.5, -48.8, -6); floor(17.8, -52.4, 21.6, -48.6, -6);
  floor(4.6, -52.4, 8.2, -48.6, -12); floor(GROTTO.cx - GROTTO.rx, GROTTO.cz - GROTTO.rz, GROTTO.cx + GROTTO.rx, GROTTO.cz + GROTTO.rz, -12);
  floor(17, -49, 39, -30, CHASM.pit + 1);                                                          // the river bed (a fall lands here; hrcave lifts you out)
  // walls: rings of boxes round each room (gaps at the doorways), boxes down both sides of each tunnel
  const ring = (R, y0, y1, gaps) => { const per = 2 * Math.PI * Math.sqrt((R.rx * R.rx + R.rz * R.rz) / 2), n = Math.ceil(per / 1.3);
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; let g = false; for (const h of gaps) { const d = Math.abs(((a - h.a) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI); if (d < h.w) g = true; } if (g) continue;
      wallBox(R.cx + Math.cos(a) * (R.rx + .3), R.cz + Math.sin(a) * (R.rz + .3), y0, y1, .75); } };
  ring({ ...HALL, rx: HALL.rx * .93, rz: HALL.rz * .93 }, -1, 9, [{ a: ang(HALL, 0, -10), w: .2 }, { a: ang(HALL, 12, -23), w: .2 }]);
  ring({ ...CHASM, rx: CHASM.rx * .85, rz: CHASM.rz * .85 }, -9, 4, [{ a: ang(CHASM, 28, -27), w: .2 }, { a: ang(CHASM, 22, -51.5), w: .42 }]); /* v42v: wider gap where the far ledge meets stair 2 (the old one left a wall across the path) */
  ring({ ...GROTTO, rx: GROTTO.rx * .92, rz: GROTTO.rz * .9 }, -13, -5, [{ a: ang(GROTTO, 6, -50.5), w: .22 }]);
  for (let z = 1.2; z > -11; z -= 1.2) { wallBox(-3.3, z, -1, 6); wallBox(3.3, z, -1, 6); }
  for (let x = 11; x < 28; x += 1.2) { const y = x < 15 ? 0 : Math.max(-6, -(x - 15) / 2); if (x < 25.5) wallBox(x, -25.6, y - 1, y + 5); wallBox(x, -20.4, y - 1, y + 5); } /* v42v: south wall stops before the landing so you can turn toward the bridge */
  for (let z = -22; z > -27.5; z -= 1.2) { if (z < -25.5) wallBox(26.1, z, -7, -1); wallBox(30.9, z, -7, -1); } /* v42v: the west landing wall used to block the foot of stair 1 */ wallBox(28.5, -20.4, -7, -1);
  for (let x = 6; x < 19.4; x += 1.2) { const y = x > 18 ? -6 : x < 8 ? -12 : -6 - (18 - x) * .6; wallBox(x, -47.9, y - 1, y + 5); wallBox(x, -53.1, y - 1, y + 5); }
  // the chasm pit: rails on the bridge, lips on the ledges (you cannot fall off by accident)
  box3(BRIDGE.x - BRIDGE.w / 2 - .25, -7, BRIDGE.z1, BRIDGE.x - BRIDGE.w / 2 - .05, -4.9, BRIDGE.z0); box3(BRIDGE.x + BRIDGE.w / 2 + .05, -7, BRIDGE.z1, BRIDGE.x + BRIDGE.w / 2 + .25, -4.9, BRIDGE.z0);
  box3(17.5, -7, -30.5, BRIDGE.x - BRIDGE.w / 2 - .1, -4.9, -30.2); box3(BRIDGE.x + BRIDGE.w / 2 + .1, -7, -30.5, 38.5, -4.9, -30.2);
  box3(17.5, -7, -48.8, BRIDGE.x - BRIDGE.w / 2 - .1, -4.9, -48.5); box3(BRIDGE.x + BRIDGE.w / 2 + .1, -7, -48.8, 38.5, -4.9, -48.5);

  // ---- stalactites / stalagmites (instanced into the bake) ----
  const cone = (x, y, z, r, h, down, paint) => B.add(new THREE.ConeGeometry(r, h, 7, 2), M4(x, down ? y - h / 2 : y + h / 2, z, 1, 1, 1, down ? Math.PI : 0, rnd() * 6), paint);
  for (const R of ROOMS) { const top = R.y + R.h, N = R === HALL ? 34 : 22;
    for (let i = 0; i < N; i++) { const a = rnd() * Math.PI * 2, rr = Math.sqrt(rnd()) * .8, x = R.cx + Math.cos(a) * R.rx * rr, z = R.cz + Math.sin(a) * R.rz * rr, e = Math.acos(Math.min(1, rr * rr)), y = (R === CHASM ? R.pit : R.y) + (top - (R === CHASM ? R.pit : R.y)) * Math.sin(e) - .2;
      cone(x, y + .3, z, .25 + rnd() * .55, 1 + rnd() * 2.8, true, rock); }
    const CLEAR = [[0, -11], [12, -23], [6, -50.5], [-13, -14.5], [8.6, -23], [-4, -31], [-8, -19.5], [-10.5, -23], [-16, -50.5], [-20, -50.5], [-8, -56]];
    for (let i = 0; i < (R === CHASM ? 0 : 9); i++) { const a = rnd() * Math.PI * 2, x = R.cx + Math.cos(a) * R.rx * .86, z = R.cz + Math.sin(a) * R.rz * .86; if (CLEAR.some(([cx, cz]) => Math.hypot(cx - x, cz - z) < 4.5)) continue; cone(x, R.y - .1, z, .35 + rnd() * .6, .8 + rnd() * 2, false, rock); } }

  // ---- props ----
  const bx = (x, y, z, sx, sy, sz, paint, ry = 0) => B.add(new THREE.BoxGeometry(1, 1, 1), M4(x, y, z, sx, sy, sz, 0, ry, 0), paint);
  const cyl = (x, y, z, r, h, paint, rx = 0, rz = 0, seg = 10, r2 = r) => B.add(new THREE.CylinderGeometry(r2, r, h, seg), M4(x, y, z, 1, 1, 1, rx, 0, rz), paint);
  const barrel = (x, y, z, s = 1) => { B.add(new THREE.CylinderGeometry(.42 * s, .42 * s, 1.05 * s, 12, 3), M4(x, y + .52 * s, z), wood(0x7a4a26)); for (const k of [.2, .85]) cyl(x, y + k * s, z, .44 * s, .06, flat(0x3a3530), 0, 0, 12); };
  const crate = (x, y, z, s = 1, ry = 0) => { bx(x, y + .45 * s, z, .9 * s, .9 * s, .9 * s, wood(0x9a6a3a), ry); bx(x, y + .45 * s, z, .95 * s, .12 * s, .95 * s, wood(0x6a4424), ry); };
  // HALL: the bar along the south wall
  bx(-4, .55, -32, 12, 1.1, 1, wood(0x6e4224)); bx(-4, 1.13, -31.8, 12.4, .08, 1.3, wood(0x9a6438));
  for (let i = 0; i < 3; i++) bx(-4, 1.3 + i * .7, -34.2, 10, .08, .45, wood(0x5a3820));
  for (let i = 0; i < 46; i++) { const sx = -8.6 + (i % 16) * .6 + rnd() * .1, row = (i / 16) | 0; cyl(sx, 1.55 + row * .7, -34.15 + rnd() * .1, .055, .32, flat([0x2a6a3a, 0x6a2a1c, 0x8a6a2a, 0x2a3a6a][i % 4]), 0, 0, 7, .03); }
  for (let i = 0; i < 5; i++) { const x = -8.5 + i * 2.2; cyl(x, .38, -30.5, .25, .08, wood(0x5a3820), 0, 0, 10); cyl(x, .2, -30.5, .05, .4, flat(0x2a2522), 0, 0, 6); }
  // the stage on the east side, red curtain behind
  bx(8.6, .4, -23, 4, .8, 8.5, wood(0x7a4a2a)); { /* v42t: a real pleated velvet curtain (was a flat red slab) with a gold-fringed valance */
    const g = new THREE.PlaneGeometry(7.4, 4.6, 80, 10), a = g.attributes.position; for (let k = 0; k < a.count; k++) { const z = a.getX(k), y = a.getY(k), sw = Math.abs(z) < .25 ? 0 : 1; a.setZ(k, -.16 * Math.sin(z * 7.3) * (1 - .25 * (y + 2.3) / 4.6) * sw - .04 * Math.sin(z * 19)); } g.computeVertexNormals();
    const vel = lin(0x5e0c18), velD = lin(0x1e0308);
    B.add(g, M4(10.2, 3.1, -23, 1, 1, 1, 0, -Math.PI / 2, 0), (p, q, o) => { const f = Math.sin(p.z * 7.3) * .5 + .5; o.copy(velD).lerp(vel, .35 + .65 * f); }, { two: true });
    bx(10.05, 5.6, -23, .3, .6, 7.8, (() => { const c = lin(0x8a1424), gd = lin(0xc89a3a); return (p, q, o) => o.copy(p.y < 5.42 ? gd : c).multiplyScalar(.8 + .3 * vn(p.z * 9, p.y * 4)); })()); }
  for (let i = 0; i < 7; i++) { cyl(6.65, .84, -26.6 + i * 1.2, .09, .09, flat(0xfff0c0), 0, 0, 8); }
  bx(8.4, 6.05, -23, 4, .5, 8.4, wood(0x5a3a22));
  // poker table + chairs, slot cabinets near the entrance, crates & barrels
  cyl(-8, .78, -19.5, 1.25, .1, flat(0x1f6a3a), 0, 0, 20); cyl(-8, .72, -19.5, 1.32, .08, wood(0x5a3820), 0, 0, 20); cyl(-8, .38, -19.5, .2, .76, wood(0x4a2c18));
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + .4; bx(-8 + Math.cos(a) * 1.75, .45, -19.5 + Math.sin(a) * 1.75, .45, .9, .45, wood(0x6a4424)); }
  for (let i = 0; i < 9; i++) cyl(-8.5 + rnd(), .86 + i * .012, -19.8 + rnd() * .6, .05, .02, flat([0xd02a2a, 0xf0f0f0, 0x2a5ad0][i % 3]), 0, 0, 10);
  for (let i = 0; i < 3; i++) { const x = -13 + i * 1.6; bx(x, .9, -13.6, 1.1, 1.8, .8, flat(0x8a1a1a)); bx(x, 1.35, -13.17, .8, .45, .05, flat(0xf2e6c0)); bx(x, 1.95, -13.6, 1.15, .2, .85, flat(0xd8a830)); }
  for (const [x, z, s] of [[5, -14, 1], [6, -14.2, .8], [5.5, -15, 1.1], [-15, -27, 1], [-14.2, -28.2, .9], [7.5, -31, 1], [8.5, -30, .8]]) crate(x, 0, z, s, rnd());
  for (const [x, z] of [[-1, -31], [.2, -30.6], [-15.8, -19], [3, -13.2], [4, -13.5]]) barrel(x, 0, z, 1);
  // campfire (stones + logs)
  for (let i = 0; i < 11; i++) { const a = i / 11 * Math.PI * 2; B.add(new THREE.IcosahedronGeometry(.28, 1), M4(-2 + Math.cos(a) * .95, .14, -24 + Math.sin(a) * .95, 1, .7, 1, 0, rnd() * 3), noisy(0x6a645e, .2, 3)); }
  for (let i = 0; i < 4; i++) cyl(-2, .25, -24, .1, 1.5, wood(0x3a2414), Math.PI / 2 - .3, i * .8);
  // mine-cart rails from the fire to the stair
  for (let x = 1; x < 15; x += .8) bx(x, .05, -23, .2, .08, 1.5, wood(0x5a3a22)); for (const z of [-23.55, -22.45]) bx(8, .14, z, 14, .08, .08, flat(0x4a4a50));
  bx(11.5, .75, -23, 1.6, .9, 1.1, flat(0x3a3a40)); for (const s of [-1, 1]) for (const t of [-1, 1]) cyl(11.5 + s * .55, .22, -23 + t * .45, .2, .08, flat(0x2a2a2e), 0, Math.PI / 2, 10);
  for (let i = 0; i < 10; i++) B.add(new THREE.IcosahedronGeometry(.18, 0), M4(11.3 + rnd() * .6, 1.25 + rnd() * .15, -23.3 + rnd() * .6), flat(0xd8b040), { emit: .6 }); // gold ore in the cart
  // the lookout balcony (timber scaffold along the west wall) + ladder
  const BY = 4.2; bx(-13.5, BY - .1, -23, 4.4, .2, 11, wood(0x8a5a32));
  for (const [x, z] of [[-11.4, -17.7], [-11.4, -23], [-11.4, -28.3], [-15.6, -17.7], [-15.6, -28.3]]) cyl(x, BY / 2, z, .14, BY, wood(0x5a3a20), 0, 0, 8);
  for (const z of [-17.7, -28.3]) bx(-13.5, BY + .55, z, 4.4, .08, .08, wood(0x6a4424)); bx(-11.35, BY + .55, -23, .08, .08, 10.6, wood(0x6a4424));
  for (let z = -27.8; z < -17.6; z += 1.1) bx(-11.35, BY + .28, z, .07, .55, .07, wood(0x6a4424));
  for (const s of [-1, 1]) bx(-10.5, BY / 2, -23 + s * .45, .1, BY + .6, .1, wood(0x6a4424)); for (let y = .35; y < BY; y += .38) bx(-10.5, y, -23, .07, .07, .9, wood(0x6a4424));
  floor(-15.8, -28.5, -11.2, -17.5, BY); box3(-11.4, BY, -28.5, -11.2, BY + 1.05, -23.6); box3(-11.4, BY, -22.4, -11.2, BY + 1.05, -17.5); box3(-15.8, BY, -28.6, -11.2, BY + 1.05, -28.4); box3(-15.8, BY, -17.6, -11.2, BY + 1.05, -17.4);
  marker('ladder', 'climb', -9.8, 0, -23, { destination: W(-12.4, BY + .05, -23) });
  // CHASM: plank bridge with rope rails and lantern posts
  const bridgeY = z => BRIDGE.y - BRIDGE.sag * Math.sin(Math.PI * (z - BRIDGE.z0) / (BRIDGE.z1 - BRIDGE.z0));
  for (let z = BRIDGE.z0; z > BRIDGE.z1; z -= .42) { const y = bridgeY(z); bx(BRIDGE.x + (rnd() - .5) * .08, y - .05, z, BRIDGE.w, .08, .34, wood(0x8a6038), (rnd() - .5) * .06); }
  for (let z = BRIDGE.z0; z > BRIDGE.z1 - .01; z -= 1) floor(BRIDGE.x - BRIDGE.w / 2, z - 1, BRIDGE.x + BRIDGE.w / 2, z, bridgeY(z - .5));
  for (const s of [-1, 1]) { const x = BRIDGE.x + s * (BRIDGE.w / 2 + .1), pts = []; for (let k = 0; k <= 24; k++) { const z = BRIDGE.z0 + (BRIDGE.z1 - BRIDGE.z0) * k / 24; pts.push(new THREE.Vector3(x, bridgeY(z) + .95 - .25 * Math.sin(Math.PI * k / 24), z)); }
    B.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, .035, 5), new THREE.Matrix4(), flat(0xb08a5a));
    const lo = pts.map(p => p.clone().setY(p.y - .45)); B.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(lo), 48, .03, 5), new THREE.Matrix4(), flat(0xa07a4a));
    for (let k = 0; k <= 24; k += 2) bx(x, pts[k].y - .45, pts[k].z, .03, .95, .03, flat(0x9a7448));
    for (const z of [BRIDGE.z0, (BRIDGE.z0 + BRIDGE.z1) / 2, BRIDGE.z1]) { cyl(x, bridgeY(z) + .6, z, .1, 1.5, wood(0x5a3820), 0, 0, 8); bx(x, bridgeY(z) + 1.45, z, .2, .3, .2, flat(0xffd890), 0); } }
  // river bed + boulders down in the chasm
  for (let i = 0; i < 22; i++) B.add(new THREE.IcosahedronGeometry(1, 1), M4(19 + rnd() * 18, CHASM.pit + .4 + rnd() * .5, -31 - rnd() * 17, .6 + rnd() * 1.3, .4 + rnd() * .8, .6 + rnd()), rockCool);
  // stair-2 lantern niche and the gate frame
  bx(6.9, -9.6, -50.5, .5, .5, 4.6, wood(0x4a2c18)); for (const z of [-52.6, -48.4]) bx(6.9, -10.9, z, .5, 2.7, .5, wood(0x4a2c18));
  // GROTTO: gold, ship's prow, idol, crystals, light shaft
  const gold = (() => { const g1 = lin(0xffc23a), g2 = lin(0xd8902a); return (p, q, o) => o.copy(g2).lerp(g1, vn(p.x * 9 + p.y * 5, p.z * 9)); })();
  const heap = (x, z, r, h) => { const g = new THREE.SphereGeometry(1, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2); const p = g.attributes.position; for (let k = 0; k < p.count; k++) { const s = 1 + (vn(p.getX(k) * 4 + x, p.getZ(k) * 4 + z) - .5) * .25; p.setXYZ(k, p.getX(k) * s, p.getY(k) * s, p.getZ(k) * s); }
    B.add(g, M4(x, GROTTO.y - .05, z, r, h, r), gold, { emit: .25 }); };
  for (const [x, z, r, h] of [[-14, -52, 2.6, 1.1], [-10, -54.5, 2.2, .9], [-17.5, -48, 1.8, .8], [-4, -55, 1.6, .7], [-12.5, -46, 1.5, .55], [-2, -46.5, 1.2, .45], [-19, -53, 1.6, .7]]) heap(x, z, r, h);
  for (let i = 0; i < (high ? 120 : 60); i++) { const a = rnd() * Math.PI * 2, rr = Math.sqrt(rnd()), x = GROTTO.cx - 3 + Math.cos(a) * 9 * rr, z = GROTTO.cz + Math.sin(a) * 6 * rr; cyl(x, GROTTO.y + .02 + rnd() * .03, z, .07, .02, gold, (rnd() - .5) * .6, (rnd() - .5) * .6, 8); }
  // goblets, bars and a cannon of the old ship
  for (let i = 0; i < 6; i++) bx(-15 + i * .45, GROTTO.y + .9 + (i % 2) * .12, -51.2 + (i % 3) * .2, .4, .12, .2, gold, rnd());
  for (let i = 0; i < 5; i++) { const x = -11 + rnd() * 4, z = -52 + rnd() * 4; cyl(x, GROTTO.y + .2 + .6, z, .12, .12, gold, 0, 0, 10, .18); cyl(x, GROTTO.y + .5 + .6, z, .03, .4, gold); }
  cyl(-6, GROTTO.y + .45, -46.5, .25, 2, flat(0x2a2a2e), Math.PI / 2 - .1, .3, 12, .32); for (const s of [-1, 1]) cyl(-6 + s * .35, GROTTO.y + .32, -46.2, .32, .1, wood(0x4a2c18), 0, Math.PI / 2, 12);
  // the ship's prow bursting from the west wall
  { const hull = new THREE.SphereGeometry(1, 28, 14, Math.PI, Math.PI, 0, Math.PI); const ws = (() => { const a = lin(0x4a2c18), b = lin(0x6e4424); return (p, q, o) => o.copy(a).lerp(b, (Math.sin(p.y * 9 + p.x) * .5 + .5) * .7 + .3 * vn(p.x * 3, p.z * 3)); })();
    B.add(hull, M4(-20.5, GROTTO.y + 1.5, -50.5, 6.5, 2.3, 2.1, .12, -Math.PI / 2, -.25), ws, { two: true });
    cyl(-17.6, GROTTO.y + 3.6, -50.5, .13, 5.4, wood(0x5a3820), 0, 0, 8); bx(-17.6, GROTTO.y + 5.6, -50.5, .14, .14, 3.2, wood(0x5a3820));
    const sail = new THREE.PlaneGeometry(3, 2.6, 8, 8), sp = sail.attributes.position; for (let k = 0; k < sp.count; k++) sp.setZ(k, Math.sin(sp.getX(k) * 1.4) * .3 + (vn(sp.getX(k) * 3, sp.getY(k) * 3) - .5) * .25);
    B.add(sail, M4(-17.45, GROTTO.y + 4.25, -50.5, 1, 1, 1, 0, Math.PI / 2, .05), (() => { const c = lin(0xd8ccae); return (p, q, o) => o.copy(c).multiplyScalar(.75 + .3 * vn(p.y * 5, p.z * 5)); })(), { two: true });
    bx(-14.6, GROTTO.y + 2.4, -50.5, 1.4, .3, .3, wood(0x8a5a32), 0); }
  // pedestal + golden idol under the shaft of light
  cyl(-8, GROTTO.y + .6, -56, .7, 1.2, noisy(0x9a9488, .1, 3), 0, 0, 12, .8);
  { const idol = new THREE.Group(); const parts = [[new THREE.SphereGeometry(.28, 14, 10), 0, 1.55, 0, 1, 1, 1], [new THREE.CylinderGeometry(.22, .3, .6, 12), 0, 1.15, 0, 1, 1, 1], [new THREE.CylinderGeometry(.32, .36, .25, 12), 0, .95, 0, 1, 1, 1], [new THREE.ConeGeometry(.12, .3, 6), 0, 1.85, 0, 1, 1, 1]];
    for (const [g, x, y, z] of parts) B.add(g, M4(-8 + x, GROTTO.y + .2 + y, -56 + z), gold, { emit: .8 }); void idol; }
  // strongboxes (lids are separate so they can open)
  const chestSpots = [[-16, -46.2], [-18.2, -50.5], [-16, -54.8]], lids = [];
  const lidM = new THREE.MeshBasicMaterial({ vertexColors: true }); mats.push(lidM);
  chestSpots.forEach(([x, z], i) => { bx(x, GROTTO.y + .38, z, 1.2, .75, .8, wood(0x5a3218), Math.PI / 2); for (const t of [-.4, .4]) bx(x + t * .9 * 0, GROTTO.y + .38, z + t, .82, .78, .08, flat(0xc8a040), Math.PI / 2 * 0);
    const LB = Baker(lights, [.05, .055, .075]); LB.add(new THREE.BoxGeometry(.8, .22, 1.2), M4(0, .11, -.4), wood(0x6a3a1c)); LB.add(new THREE.BoxGeometry(.82, .06, .1), M4(0, .14, -.97), flat(0xd8b048));
    const lg = LB.build(); geos.push(lg); const lid = new THREE.Mesh(lg, lidM); const pivot = new THREE.Group(); pivot.position.set(x, GROTTO.y + .76, z + .4); pivot.add(lid); group.add(pivot); lids.push(pivot);
    const h = marker('chest-' + i, 'chest', x + 1.1, GROTTO.y, z, { locked: true, opened: false }); lootPoints.push(h); });
  // crystals (bright, unbaked glow) — clusters on walls and floor
  const crystalG = new THREE.OctahedronGeometry(1, 0); crystalG.scale(.32, 1.2, .32); geos.push(crystalG);
  const crystM = new THREE.MeshBasicMaterial({ color: 0xffffff, vertexColors: false }); mats.push(crystM);
  const CL = [[-19.5, -12, -46, 0xb46cff], [-19, -12, -47.2, 0xd08cff], [2, -12, -55.5, 0x46d8ff], [3, -12, -54.2, 0x7ae8ff], [-1, -12, -43.6, 0x46d8ff], [-21, -10.5, -53, 0xb46cff], [33, -6, -51.5, 0x46d8ff], [21, -6, -28, 0xb46cff]];
  const crystals = new THREE.InstancedMesh(crystalG, crystM, CL.length * 5); { let k = 0; const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), p = new THREE.Vector3(), c = new THREE.Color();
    for (const [x, y, z, hex] of CL) for (let i = 0; i < 5; i++) { e.set((rnd() - .5) * 1.1, rnd() * 6, (rnd() - .5) * 1.1); q.setFromEuler(e); const sc = .4 + rnd() * .7; m.compose(p.set(x + (rnd() - .5) * .9, y + .4 * sc, z + (rnd() - .5) * .9), q, s.set(sc, sc, sc)); crystals.setMatrixAt(k, m); crystals.setColorAt(k, c.setHex(hex).multiplyScalar(1.6)); k++; } }
  group.add(crystals);
  // the vault gate (iron bars that rise into the rock when unlocked)
  const gate = new THREE.Group(); gate.position.set(6.9, GROTTO.y, -50.5); { const GB = Baker(lights, [.05, .055, .075]); for (let i = 0; i < 9; i++) GB.add(new THREE.CylinderGeometry(.045, .045, 4.2, 6), M4(0, 2.1, -1.9 + i * .475), flat(0x2a2a30));
    for (const y of [.5, 2.1, 3.7]) GB.add(new THREE.BoxGeometry(.1, .12, 4), M4(0, y, 0), flat(0x3a3a42)); const gg = GB.build(); geos.push(gg); gate.add(new THREE.Mesh(gg, lidM)); } group.add(gate);
  const gateBox = box3(6.6, -12, -52.6, 7.2, -7.6, -48.4);
  marker('vault-gate', 'gate', 8.6, -12, -50.5);
  // the key (glows where the last outlaw fell)
  const keyM = new THREE.MeshBasicMaterial({ color: 0xffd65a }); mats.push(keyM); const keyG = new THREE.Group(); { const r = new THREE.TorusGeometry(.12, .035, 8, 18), s = new THREE.CylinderGeometry(.03, .03, .5, 8), t1 = new THREE.BoxGeometry(.12, .05, .04); geos.push(r, s, t1);
    keyG.add(new THREE.Mesh(r, keyM)); const sh = new THREE.Mesh(s, keyM); sh.position.y = -.37; keyG.add(sh); const tt = new THREE.Mesh(t1, keyM); tt.position.set(.06, -.55, 0); keyG.add(tt); } keyG.visible = false; group.add(keyG);
  const keyHook = marker('vault-key', 'key', 23, -6, -50.5); keyHook.active = false;

  // ---- the merged, baked static mesh ----
  const staticG = B.build(); geos.push(staticG); const staticM = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }); mats.push(staticM); rockDetail(staticM, 1.6, .7);
  const staticMesh = new THREE.Mesh(staticG, staticM); staticMesh.frustumCulled = false; group.add(staticMesh);

  // ---- WANTED posters (canvas) ----
  { const cv = document.createElement('canvas'); cv.width = 512; cv.height = 256; const x = cv.getContext('2d'); const names = [['BLACK JACK', '$5,000'], ['ROSIE "SIX"', '$2,500']];
    names.forEach(([n, r], i) => { const ox = i * 256; x.fillStyle = '#e8d6a8'; x.fillRect(ox + 8, 8, 240, 240); x.strokeStyle = '#7a5a2a'; x.lineWidth = 6; x.strokeRect(ox + 14, 14, 228, 228); x.fillStyle = '#3a2410'; x.textAlign = 'center';
      x.font = 'bold 44px Georgia, serif'; x.fillText('WANTED', ox + 128, 64); x.font = 'bold 18px Georgia, serif'; x.fillText('DEAD OR ALIVE', ox + 128, 88);
      x.fillStyle = '#5a4020'; x.beginPath(); x.arc(ox + 128, 140, 34, 0, 7); x.fill(); x.fillRect(ox + 98, 168, 60, 30); x.fillStyle = '#3a2410'; x.font = 'bold 24px Georgia, serif'; x.fillText(n, ox + 128, 222); x.font = 'bold 20px Georgia'; x.fillText(r, ox + 128, 244); });
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; texs.push(t); const pm = new THREE.MeshBasicMaterial({ map: t, color: 0xb89a7a }); mats.push(pm);
    for (const [px, py, pz, ry, u] of [[-15.6, 2.4, -14.6, .75, 0], [9.8, 2.6, -15.6, -.9, 1], [-12.2, 2.4, -33.4, .2, 1]]) { const g = new THREE.PlaneGeometry(1, 1); const uv = g.attributes.uv; for (let k = 0; k < uv.count; k++) uv.setX(k, uv.getX(k) * .5 + u * .5); geos.push(g); const m = new THREE.Mesh(g, pm); m.position.set(px, py, pz); m.rotation.y = ry; group.add(m); } }

  // ---- flames, embers, river, mist, light shaft, dust ----
  const flameSpots = [[-2, .35, -24, 1.6], ...[[-4, 3.6, -33.6], [8.6, 3.2, -16.5], [-14, 2.9, -14.5], [10.2, 3, -30], [-16.5, 6.6, -23], [0, 3, -10.5], [-9.5, 3.3, -33.8], [14, 2.2, -23], [22, -1.4, -23], [28, -3.4, -25.5], [22, -4.2, -50.5], [12, -9, -50.5]].map(p => [...p, .55])];
  for (const [x, y, z, s] of flameSpots) if (s < 1) { cyl(x, y - .55, z, .05, .7, wood(0x3a2414)); }
  const flameTex = (() => { const c = document.createElement('canvas'); c.width = 64; c.height = 128; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 92, 2, 32, 80, 60); gr.addColorStop(0, 'rgba(255,250,220,1)'); gr.addColorStop(.25, 'rgba(255,190,80,.95)'); gr.addColorStop(.6, 'rgba(255,90,20,.5)'); gr.addColorStop(1, 'rgba(255,40,0,0)');
    g.fillStyle = gr; g.beginPath(); g.moveTo(32, 2); g.bezierCurveTo(60, 50, 62, 120, 32, 126); g.bezierCurveTo(2, 120, 4, 50, 32, 2); g.fill(); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })(); texs.push(flameTex);
  const flameM = new THREE.SpriteMaterial({ map: flameTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false }); mats.push(flameM);
  const flames = flameSpots.map(([x, y, z, s]) => { const sp = new THREE.Sprite(flameM); sp.position.set(x, y + .25 * s, z); sp.scale.set(.5 * s, .9 * s, 1); sp.userData = { x, y, z, s, ph: rnd() * 9 }; group.add(sp); return sp; });
  const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.4, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })(); texs.push(glowTex);
  const pts = (n, color, size, op) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3)); const m = new THREE.PointsMaterial({ map: glowTex, color, size, transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true }); geos.push(g); mats.push(m); const p = new THREE.Points(g, m); p.frustumCulled = false; group.add(p); return p; };
  const FXK = PERF.fx ? 1 : 0; const EN = Math.max(1, (high ? 60 : 26) * FXK), embers = pts(EN, 0xffa040, .12, .9), eSeed = Array.from({ length: EN }, () => [rnd(), rnd(), rnd()]);
  const MN = Math.max(1, (high ? 40 : 18) * FXK), riverMist = pts(MN, 0x7af8e0, 3.2, .16), mSeed = Array.from({ length: MN }, () => [rnd(), rnd(), rnd()]);
  const DN = Math.max(1, (high ? 70 : 30) * FXK), dust = pts(DN, 0xfff0c8, .09, .7), dSeed = Array.from({ length: DN }, () => [rnd(), rnd(), rnd()]); if (!FXK) embers.visible = riverMist.visible = dust.visible = false;
  const glows = pts(flameSpots.length + CL.length, 0xffa860, 1.8, .45); { const a = glows.geometry.attributes.position; flameSpots.forEach(([x, y, z, s], i) => a.setXYZ(i, x, y + .3 * s, z)); CL.forEach(([x, y, z], i) => a.setXYZ(flameSpots.length + i, x, y + .6, z)); }
  // the underground river: glowing teal water flowing along the bottom of the chasm
  const RU = { t: { value: 0 } };
  const riverG = new THREE.PlaneGeometry(17, 16, 1, 1); riverG.rotateX(-Math.PI / 2); geos.push(riverG);
  const riverM = new THREE.MeshBasicMaterial({ color: 0x2ad8c0, transparent: true, opacity: .92 }); mats.push(riverM);
  riverM.onBeforeCompile = sh => { sh.uniforms.rT = RU.t; sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 rUV;').replace('#include <begin_vertex>', '#include <begin_vertex>\nrUV = uv;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float rT; varying vec2 rUV; float rh(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);} float rn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(rh(i),rh(i+vec2(1,0)),f.x),mix(rh(i+vec2(0,1)),rh(i+1.),f.x),f.y);}')
      .replace('#include <color_fragment>', '#include <color_fragment>\nvec2 q=rUV*vec2(6.,10.); float n=rn(q+vec2(rT*1.4,0.))*.6+rn(q*2.3-vec2(rT*2.1,rT*.3))*.4; float band=smoothstep(.55,.95,n); diffuseColor.rgb=mix(vec3(.02,.35,.38),vec3(.25,1.25,1.05),band)+vec3(.0,.08,.06)*sin(rT*2.+rUV.x*20.);'); };
  riverM.customProgramCacheKey = () => 'hr-river-v42';
  const river = new THREE.Mesh(riverG, riverM); river.scale.set(1.25, 1, 1.25); river.position.set(28, CHASM.pit + .9, -39.5); group.add(river);
  // shaft of light down onto the idol
  const shaftG = new THREE.CylinderGeometry(.6, 2.2, 9, 20, 1, true); geos.push(shaftG);
  const shaftM = new THREE.MeshBasicMaterial({ color: 0xfff1c8, transparent: true, opacity: .12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }); mats.push(shaftM);
  const shaft = new THREE.Mesh(shaftG, shaftM); shaft.position.set(-8, GROTTO.y + 4.5, -56); group.add(shaft);

  // ---- dynamic point lights for the characters (index order = importance; hrcave keeps the first two on phones) ----
  const PL = [[-2, 1.6, -24, 0xff8a3a, 9, 14], [6, 3.2, -23, 0xff8a70, 6, 11], [-8, -9.5, -51, 0xffc860, 7, 13], [28, -9, -39.5, 0x40f0d0, 6, 16], [-4, 3, -29, 0xffa04a, 5, 11]];
  const plights = PL.map(([x, y, z, c, I, d]) => { const l = new THREE.PointLight(c, I, d, 1.6); l.position.set(x, y, z); l.userData.base = I; group.add(l); return l; });

  // ---- outlaws: posts on every level (the zombie system runs them) ----
  [[-6, 0, -28.5, 'guard'], [4, 0, -17.5, 'guard'], [-12.8, BY, -19.5, 'lookout'], [-12.8, BY, -26.5, 'lookout'], [5, 0, -29.5, 'captain'], [-9, 0, -15, 'guard'],
   [24.5, -6, -28.6, 'guard'], [31.5, -6, -28.6, 'guard'], [25, -6, -51.3, 'guard'], [32, -6, -50.8, 'guard']].forEach(([x, y, z, role], i) =>
    spawnPoints.push({ id: 'bandit-' + i, position: W(x, y, z), rotationY: rotationY + Math.PI, role }));
  // gameplay markers
  marker('bar', 'drink', -4, 0, -30.6); marker('poker', 'poker', -8, 0, -17.6);
  for (let i = 0; i < 3; i++) marker('slots-' + i, 'slots', -13 + i * 1.6, 0, -14.8);
  const dancerLocal = [[8.6, .8, -25.2], [8.6, .8, -23], [8.6, .8, -20.8]]; dancerLocal.forEach(([x, y, z], i) => marker('dance-' + i, 'dance', x - 2.3, y, z));
  const entrance = W(0, 0, 0);
  const defeated = new Set(); let challenge = false, time = 0, disposed = false; const inv = group.matrixWorld.clone().invert(), tmp = new THREE.Vector3();

  const result = { group, colliders, spawnPoints, lootPoints, interactions, lights: plights, dancerSpots: dancerLocal.map(([x, y, z]) => W(x, y, z)), entrance, update, dispose,
    state: { challenge: false, remainingGuards: spawnPoints.length, keyDropped: false, hasKey: false, vaultOpen: false },
    startChallenge() { if (disposed || challenge) return false; challenge = true; result.state.challenge = true; return true; },
    guardDefeated(id, at) { if (disposed || !challenge || !spawnPoints.some(p => p.id === id) || defeated.has(id)) return false; defeated.add(id); result.state.remainingGuards = spawnPoints.length - defeated.size;
      if (!result.state.remainingGuards && !result.state.keyDropped) { result.state.keyDropped = true; if (at) tmp.copy(at).applyMatrix4(inv); else tmp.set(23, -6, -50.5); tmp.y = Math.round(tmp.y / 6) * 6 + 1;
        keyG.position.copy(tmp); keyG.userData.y = tmp.y; keyG.visible = true; keyHook.position.copy(tmp).applyMatrix4(group.matrixWorld); keyHook.active = true; } return true; },
    interact(id, at) { if (disposed) return { ok: false }; const h = interactions.find(p => p.id === id); if (!h) return { ok: false };
      if (id === 'vault-key') { if (!keyHook.active) return { ok: false }; keyHook.active = false; keyG.visible = false; result.state.hasKey = true; return { ok: true, type: 'key' }; }
      if (id === 'vault-gate') { if (!result.state.hasKey) return { ok: false }; result.state.vaultOpen = true; gateBox.makeEmpty(); for (const l of lootPoints) l.locked = false; return { ok: true, type: 'gate' }; }
      return { ok: true, type: h.type, hook: h }; },
    fireAt: () => W(-2, .6, -24), riverAt: () => W(28, -16, -39.5),
    openChest(id) { const i = +String(id).split('-')[1]; if (lids[i]) lids[i].userData.open = true; },
    // ceiling height over a point (for the camera), or Infinity outside the hideout's spaces
    ceilAt(x, y, z) { tmp.set(x, y, z).applyMatrix4(inv); let best = Infinity;
      for (const R of ROOMS) { const d = ((tmp.x - R.cx) / R.rx) ** 2 + ((tmp.z - R.cz) / R.rz) ** 2; if (d >= 1) continue; const yb = R === CHASM ? R.pit : R.y; if (tmp.y < yb - 1) continue; const e = Math.acos(Math.min(1, d)); best = Math.min(best, group.position.y + yb + (R.y + R.h - yb) * Math.sin(e) - .3); }
      if (best === Infinity && tmp.z < 1.5 && tmp.z > -55 && tmp.y < 6) best = group.position.y + Math.max(tmp.y, Math.min(0, tmp.y)) + 3.6; return best; },
  };
  function update(dt, cam, playerPos) { if (disposed) return; time += Math.min(.1, Math.max(0, dt || 0)); RU.t.value = time;
    const d2 = playerPos ? playerPos.distanceToSquared(entrance) : 1e12; group.visible = d2 < viewDist * viewDist; if (!group.visible) return; const near = d2 < 90 * 90;
    for (const l of plights) l.intensity = near ? l.userData.base * (.9 + .1 * Math.sin(time * 9 + l.position.x) * Math.sin(time * 5.3 + l.position.z)) : 0;
    if (!near) return;
    for (const f of flames) { const u = f.userData, k = 1 + .14 * Math.sin(time * 13 + u.ph) + .08 * Math.sin(time * 23 + u.ph * 2); f.scale.set(.5 * u.s * (2 - k) * .9, .9 * u.s * k, 1); }
    { const a = embers.geometry.attributes.position; for (let i = 0; i < EN; i++) { const [p, q, r] = eSeed[i], life = (time * (.25 + r * .3) + p) % 1, src = flameSpots[i % 3 === 0 ? 0 : 1 + (i % (flameSpots.length - 1))]; a.setXYZ(i, src[0] + Math.sin(time * 2 + i) * .3 * life + (q - .5) * .4, src[1] + .3 + life * (src[3] > 1 ? 3.5 : 1.4), src[2] + Math.cos(time * 1.7 + i) * .3 * life); } a.needsUpdate = true; }
    { const a = riverMist.geometry.attributes.position; for (let i = 0; i < MN; i++) { const [p, q, r] = mSeed[i], life = (time * .05 * (.6 + r) + p) % 1; a.setXYZ(i, 20 + q * 16, CHASM.pit + 1 + life * 9, -32 - r * 15); } a.needsUpdate = true; riverMist.material.opacity = .16; }
    { const a = dust.geometry.attributes.position; for (let i = 0; i < DN; i++) { const [p, q, r] = dSeed[i], life = (time * .03 + p) % 1; a.setXYZ(i, -8 + Math.sin(time * .3 + i) * 1.2 * q, GROTTO.y + 8.5 - life * 8.5, -56 + Math.cos(time * .27 + i * 1.3) * 1.2 * r); } a.needsUpdate = true; }
    crystM.color.setScalar(.85 + .15 * Math.sin(time * 1.6));
    gate.position.y += ((result.state.vaultOpen ? GROTTO.y + 4.4 : GROTTO.y) - gate.position.y) * Math.min(1, dt * 1.5);
    if (keyG.visible) { keyG.position.y = keyG.userData.y + Math.sin(time * 2.2) * .12; keyG.rotation.y = time * 1.6; }
    for (const L of lids) { const o = L.userData.open ? -1.9 : 0; L.rotation.x += (o - L.rotation.x) * Math.min(1, dt * 3); } }
  function dispose() { if (disposed) return; disposed = true; group.removeFromParent(); for (const g of geos) g.dispose(); for (const m of mats) m.dispose(); for (const t of texs) t.dispose(); crystals.dispose(); }
  update(0, null, entrance); return result;
}
