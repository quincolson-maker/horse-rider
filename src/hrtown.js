// HORSE RIDER v33: places you can walk into. Everything here is original procedural geometry (no downloaded assets).
//  - two FIRE LOOKOUT towers above the snow line at the tops of the mountain trails (opposite sides of the map): four
//    switchback flights of stairs to a cab 16 m up. Tower 1: a desk with a Tommy gun (100-round drum) and a box with the
//    Golden Buffalo rifle (walk up, take them). Tower 2: the gun upgrade station (bronze / silver / gold tiers for points,
//    plus the Tommy gun and the Golden Buffalo for sale).
//  - a little western TOWN in the meadows: a saloon and, right next to it, a general store, a boardwalk porch and a
//    hitching rail. It is a zombie safe zone. The saloon pours drinks (being drunk gets worse the more you drink) and has a
//    dartboard (301 against the bartender or another rider); the store sells a black windbreaker with HORSE RIDER on the back.
// Walkable structures: floor surfaces (boxes / ramps) + height-aware wall segments, queried by horse.js (floorAt / walls).
import * as THREE from 'three';
import { mergeGeometries } from '../addons/utils/BufferGeometryUtils.js?v=309';

export const TOWN_PRICES = { jacket: 5000, drink: 20 };
const TAU = Math.PI * 2;
function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
function rng(s) { return () => (s = (s * 16807) % 2147483647) / 2147483647; }
let MATS = null;
function mats() { if (MATS) return MATS;
  const plank = canvasTex(256, 256, (x, w, h) => { const r = rng(11); for (let i = 0; i < 8; i++) { const l = 30 + r() * 12; x.fillStyle = `hsl(${24 + r() * 8},${32 + r() * 10}%,${l}%)`; x.fillRect(0, i * h / 8, w, h / 8 - 2); x.fillStyle = 'rgba(20,10,4,.6)'; x.fillRect(0, i * h / 8 + h / 8 - 2, w, 2);
    for (let k = 0; k < 14; k++) { x.strokeStyle = `rgba(40,22,10,${.12 + r() * .15})`; x.beginPath(); const y = i * h / 8 + r() * h / 8; x.moveTo(0, y); x.bezierCurveTo(w * .3, y + r() * 6 - 3, w * .7, y + r() * 6 - 3, w, y); x.stroke(); } x.fillStyle = 'rgba(15,8,3,.55)'; x.fillRect(((r() * 4) | 0) * w / 4, i * h / 8, 2, h / 8); } });
  plank.wrapS = plank.wrapT = THREE.RepeatWrapping;
  // v42 saloon facade: faded barn-red lap siding (shadow line under each board, grain, weathering) and cedar shingles
  const siding = canvasTex(256, 256, (x, w, h) => { const r = rng(23); for (let i = 0; i < 8; i++) { const y0 = i * h / 8, l = 30 + r() * 7; x.fillStyle = `hsl(${4 + r() * 5},${48 + r() * 12}%,${l}%)`; x.fillRect(0, y0, w, h / 8);
      const gr = x.createLinearGradient(0, y0, 0, y0 + h / 8); gr.addColorStop(0, 'rgba(255,220,200,.16)'); gr.addColorStop(.75, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(40,6,4,.55)'); x.fillStyle = gr; x.fillRect(0, y0, w, h / 8);
      for (let k = 0; k < 10; k++) { x.strokeStyle = `rgba(60,14,8,${.1 + r() * .14})`; x.beginPath(); const y = y0 + 3 + r() * (h / 8 - 6); x.moveTo(0, y); x.bezierCurveTo(w * .3, y + r() * 4 - 2, w * .7, y + r() * 4 - 2, w, y); x.stroke(); }
      for (let k = 0; k < 4; k++) { x.fillStyle = `rgba(230,200,170,${.05 + r() * .08})`; x.fillRect(r() * w, y0 + 2, 20 + r() * 60, h / 8 - 6); } x.fillStyle = 'rgba(30,6,4,.6)'; x.fillRect(((r() * 4) | 0) * w / 4, y0, 2, h / 8); } });
  siding.wrapS = siding.wrapT = THREE.RepeatWrapping;
  const shingle = canvasTex(256, 256, (x, w, h) => { const r = rng(5); for (let j = 0; j < 8; j++) for (let i = 0; i < 6; i++) { const ox = (i + (j % 2) * .5) * w / 6; x.fillStyle = `hsl(${12 + r() * 10},${30 + r() * 10}%,${22 + r() * 9}%)`; x.fillRect(ox, j * h / 8, w / 6 - 2, h / 8); x.fillRect(ox - w, j * h / 8, w / 6 - 2, h / 8);
      x.fillStyle = 'rgba(10,4,2,.55)'; x.fillRect(ox, j * h / 8 + h / 8 - 3, w / 6, 3); } }); shingle.wrapS = shingle.wrapT = THREE.RepeatWrapping;
  const S = o => new THREE.MeshStandardMaterial(o);
  MATS = { side: S({ map: siding, roughness: .85 }), trim: S({ color: 0x3a2416, roughness: .85 }), cream: S({ color: 0xe6d6b2, roughness: .8 }), shingle: S({ map: shingle, roughness: .9 }), lamp: S({ color: 0xffd890, emissive: 0xffb050, emissiveIntensity: 1.6 }),
    plank: S({ map: plank, roughness: .88 }), dark: S({ color: 0x4a3322, roughness: .9 }), roof: S({ color: 0x5a5048, roughness: .75, metalness: .25 }), glass: new THREE.MeshPhysicalMaterial({ color: 0x9fb8c4, roughness: .05, transparent: true, opacity: .35, envMapIntensity: 1.5 }),
    iron: S({ color: 0x30302e, roughness: .5, metalness: .8 }), steel: S({ color: 0xaeb4b8, roughness: .42, metalness: .85 }), grate: S({ color: 0x8d9296, roughness: .55, metalness: .8 }), concrete: S({ color: 0x9c9a94, roughness: .96 }), wood: S({ map: plank, color: 0xb8b0a4, roughness: .92 }), red: S({ color: 0x8a2a20, roughness: .8 }), crate: S({ map: plank, color: 0xc9a070, roughness: .9 }), felt: S({ color: 0x2c4a2a, roughness: 1 }), brass: S({ color: 0xc9a245, roughness: .3, metalness: .9 }), mirror: S({ color: 0x5a5448, roughness: .16, metalness: .9 }), bGreen: S({ color: 0x2f5a30, roughness: .15, metalness: .1 }), bAmber: S({ color: 0x8a4a12, roughness: .15, metalness: .1 }), bone: S({ color: 0xe8dcc0, roughness: .7 }), black: S({ color: 0x15110e, roughness: .35, metalness: .1 }), ivory: S({ color: 0xf4efe0, roughness: .4 }), lamp: new THREE.MeshBasicMaterial({ color: 0xffd38a }) };
  return MATS; }
function signTex(txt, bg = '#3a2414', fg = '#f1dfb0', w = 512, h = 128, font = 'bold 64px Georgia,serif') { return canvasTex(w, h, (x) => { x.fillStyle = bg; x.fillRect(0, 0, w, h); x.strokeStyle = fg; x.lineWidth = 6; x.strokeRect(8, 8, w - 16, h - 16); x.fillStyle = fg; x.font = font; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(txt, w / 2, h / 2 + 4); }); }

// ---------------- darts: standard board, 301 ----------------
const ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
export function dartScore(x, y) { // mm from the bull, +x right, +y up
  const r = Math.hypot(x, y); if (r <= 6.35) return { pts: 50, label: 'BULL', m: 2 }; if (r <= 15.9) return { pts: 25, label: '25', m: 1 }; if (r > 170) return { pts: 0, label: 'MISS', m: 0 };
  const th = ((Math.atan2(x, y) * 180 / Math.PI) + 360 + 9) % 360, n = ORDER[Math.floor(th / 18) % 20];
  if (r >= 99 && r <= 107) return { pts: n * 3, label: 'T' + n, m: 3 }; if (r >= 162) return { pts: n * 2, label: 'D' + n, m: 2 }; return { pts: n, label: String(n), m: 1 }; }
export function segAim(n, ring) { const i = ORDER.indexOf(n), a = i * 18 * Math.PI / 180, r = ring === 3 ? 103 : ring === 2 ? 166 : 135; return [Math.sin(a) * r, Math.cos(a) * r]; }
export function aiTarget(rem) { if (rem > 60) return segAim(20, 3); if (rem === 50) return [0, 0]; if (rem <= 40 && rem % 2 === 0) return segAim(rem / 2, 2); if (rem <= 20) return segAim(rem, 1); if (rem % 3 === 0 && rem <= 60) return segAim(rem / 3, 3); return segAim(Math.min(20, rem - 20 > 0 ? rem - 20 : rem), 1); }
// 301: subtract each dart; going below zero (or to exactly 1, which can't be finished... kept simple: below zero) busts the turn
export function applyDart(G, pts) { const p = G.turn, rem = G.s[p] - pts; G.log.push({ p, pts }); if (rem < 0) { G.s[p] = G.start; G.bust = true; endTurn(G); return 'bust'; } G.s[p] = rem; if (rem === 0) { G.win = p; return 'win'; } if (++G.darts >= 3) endTurn(G); return 'ok'; }
function endTurn(G) { G.turn = 1 - G.turn; G.darts = 0; G.start = G.s[G.turn]; }
export function newGame(a, b) { return { id: Math.random().toString(36).slice(2, 8), who: [a, b], s: [301, 301], turn: 0, darts: 0, start: 301, win: -1, log: [], bust: false }; }

import { createPoker } from './hrpoker.js?v=309';
import { createCheckers, ckNew, ckMoves, ckApply, ckAI } from './hrcheckers.js?v=309';
export function createTown(c) {
  const { scene, hAt, H, P, mobile, msg, sfx, camera } = c, M = mats(), T = { structs: [], walls: [], spots: [], safe: [], towers: [], town: null, drunk: 0, drinks: 0, passT: 0, ui: null };
  H.town = T; H.safeRects = T.safe;
  // ---- structures: local (x, z) frame with a rotation (multiples of 90 deg), floors as boxes / ramps relative to the base height ----
  function struct(cx, cz, rot, y0) { const s = { cx, cz, rot, y0, c: Math.cos(rot), s: Math.sin(rot), floors: [], R: 0, geo: new Map() }; T.structs.push(s); return s; }
  const toW = (s, x, z) => [s.cx + x * s.c + z * s.s, s.cz - x * s.s + z * s.c], toL = (s, x, z) => { const dx = x - s.cx, dz = z - s.cz; return [dx * s.c - dz * s.s, dx * s.s + dz * s.c]; };
  function floor(s, x0, x1, z0, z1, ya, yb = ya, axis = 'x') { s.floors.push({ x0, x1, z0, z1, ya, yb, axis }); s.R = Math.max(s.R, Math.hypot(Math.max(Math.abs(x0), Math.abs(x1)), Math.max(Math.abs(z0), Math.abs(z1))) + 2); }
  function wall(s, ax, az, bx, bz, ya, yb) { const [wx, wz] = toW(s, ax, az), [vx, vz] = toW(s, bx, bz); T.walls.push([wx, wz, vx, vz, s.y0 + ya, s.y0 + yb]); }
  function cyl(s, mat, x, y, z, r, h, n = 14) { const g = new THREE.CylinderGeometry(r, r, h, n); g.translate(x, y, z); if (!s.geo.has(mat)) s.geo.set(mat, []); s.geo.get(mat).push(g); }
  function box(s, mat, x, y, z, w, h, d, ry = 0) { const g = new THREE.BoxGeometry(w, h, d); if (ry) g.rotateY(ry); g.translate(x, y, z); if (mat.map) { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * Math.max(w, d) / 2, uv.getY(i) * h / 2); } (s.geo.get(mat) || s.geo.set(mat, []).get(mat)).push(g); }
  function finish(s) { const g = new THREE.Group(); g.position.set(s.cx, s.y0, s.cz); g.rotation.y = s.rot; for (const [m, gs] of s.geo) { const me = new THREE.Mesh(mergeGeometries(gs), m); me.castShadow = !mobile || m !== M.glass; me.receiveShadow = true; g.add(me); } s.geo.clear(); scene.add(g); s.g = g; return g; }
  function spot(s, x, y, z, kind, label, r = 1.6) { const [wx, wz] = toW(s, x, z), o = { x: wx, z: wz, y: s.y0 + y, kind, label, r, s }; T.spots.push(o); return o; }
  // highest walkable surface at (x, z) that is no more than a step above y (else the terrain)
  T.floorAt = (x, z, y) => { let g = hAt(x, z); for (const s of T.structs) { const dx = x - s.cx, dz = z - s.cz; if (dx * dx + dz * dz > s.R * s.R) continue; const [lx, lz] = toL(s, x, z);
      for (const f of s.floors) { if (lx < f.x0 || lx > f.x1 || lz < f.z0 || lz > f.z1) continue; const t = f.axis === 'x' ? (lx - f.x0) / (f.x1 - f.x0) : (lz - f.z0) / (f.z1 - f.z0), h = s.y0 + f.ya + (f.yb - f.ya) * t; if (h <= y + .62 && h > g) g = h; } } return g; };
  T.onStruct = (x, z, y) => T.floorAt(x, z, y) > hAt(x, z) + .25;
  /* v216 optimization: wall colliders live in an 8 m grid (rebuilt when the list changes or every 1.5 s), so a big town costs
     the same per check as a small one */
  const WG = { n: -1, t: 0, m: new Map(), C: 8 }; const wkey = (i, j) => i * 73856 + j;
  T.wallsNear = (x, z, r) => { const now = performance.now(); if (WG.n !== T.walls.length || now - WG.t > 1500) { WG.n = T.walls.length; WG.t = now; WG.m.clear(); for (const w of T.walls) { const i0 = Math.floor(Math.min(w[0], w[2]) / WG.C), i1 = Math.floor(Math.max(w[0], w[2]) / WG.C), j0 = Math.floor(Math.min(w[1], w[3]) / WG.C), j1 = Math.floor(Math.max(w[1], w[3]) / WG.C); for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) { const k = wkey(i, j); let b = WG.m.get(k); if (!b) WG.m.set(k, b = []); b.push(w); } } }
    const out = T._wn || (T._wn = []), seen = T._ws || (T._ws = new Set()); out.length = 0; seen.clear(); const i0 = Math.floor((x - r) / WG.C), i1 = Math.floor((x + r) / WG.C), j0 = Math.floor((z - r) / WG.C), j1 = Math.floor((z + r) / WG.C);
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) { const b = WG.m.get(wkey(i, j)); if (b) for (const w of b) if (!seen.has(w)) { seen.add(w); out.push(w); } } return out; };
  T.wallHit = (x, z, r, y) => { for (const w of T.wallsNear(x, z, r + .2)) { if (y + 1.7 < w[4] || y > w[5] - .05) continue; const ex = w[2] - w[0], ez = w[3] - w[1], L = ex * ex + ez * ez, t = L ? Math.max(0, Math.min(1, ((x - w[0]) * ex + (z - w[1]) * ez) / L)) : 0; if (Math.hypot(x - w[0] - ex * t, z - w[1] - ez * t) < r + .08) return true; } return false; };

  // ---- v34 fire lookout: a US Forest Service style steel tower (Aermotor-like) ----
  // Tapered galvanized lattice (4 angled legs, girts + X bracing every 4 m) on concrete footings; an external switchback
  // stair on the +z side (two 1.1 m lanes, 4 flights of 4 m, railed landings at each level, the foot at ground height);
  // a railed catwalk around a square wooden cab (windows on all four sides, door facing the top landing, pyramid roof).
  // Local frame: entry at (-4.6, 4.6) walking +x; the base height y0 is the ground at the entry.
  const TW = { L: 16, HW0: 3.6, HW1: 2.3, C: 2.4, K: 3.4, A: 4.6, B: 5.7, Z0: 4.05, Z1: 5.15, Z2: 6.25, X: 3, LX: 4.2 };
  T.TW = TW;
  T.entry = t => ({ foot: toW(t, -4.6, TW.A), out: toW(t, -8, TW.A), y: t.y0 });
  T.inFoot = (t, x, z, m = 0) => { const [lx, lz] = toL(t, x, z); return Math.abs(lx) < TW.LX + .6 + m && lz > -TW.K - .6 - m && lz < TW.Z2 + .4 + m; };
  function beam(s, mat, a, b, w, d = w) { const v = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]), len = v.length(); if (len < 1e-3) return; const g = new THREE.BoxGeometry(w, len, d);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.multiplyScalar(1 / len))); g.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2); (s.geo.get(mat) || s.geo.set(mat, []).get(mat)).push(g); }
  function rail(s, ax, az, bx, bz, y, col = true) { if (col) wall(s, ax, az, bx, bz, y, y + 1.1); const n = Math.max(1, Math.round(Math.hypot(bx - ax, bz - az) / 1.2));
    beam(s, M.steel, [ax, y + 1.05, az], [bx, y + 1.05, bz], .05); beam(s, M.steel, [ax, y + .55, az], [bx, y + .55, bz], .035); for (let k = 0; k <= n; k++) { const t = k / n, x = ax + (bx - ax) * t, z = az + (bz - az) * t; beam(s, M.steel, [x, y, z], [x, y + 1.08, z], .05); } }
  function tower(cx, cz, kind, rot = 0) {
    const { L, HW0, HW1, C, K, A, B, Z0, Z1, Z2, X, LX } = TW; const s = struct(cx, cz, rot, 0); const gL = (x, z) => { const [wx, wz] = toW(s, x, z); return hAt(wx, wz); };
    s.y0 = gL(-4.6, A); s.kind = kind; T.towers.push(s); const G = (x, z) => gL(x, z) - s.y0, hw = y => HW0 + (HW1 - HW0) * Math.max(0, y) / L;
    // concrete footings + legs (each leg leans in from its footing to the top corner)
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const g0 = G(sx * HW0, sz * HW0), bx = sx * hw(g0), bz = sz * hw(g0); box(s, M.concrete, bx, g0 - .35, bz, .9, 1.3, .9);
      beam(s, M.steel, [bx, g0 + .3, bz], [sx * HW1, L, sz * HW1], .2); wall(s, bx, bz, bx, bz, g0 - 1, g0 + 3.5); } /* v42x: the leg leans in; its old full-height collider stood across the top landing */
    // girts at each level + X bracing on every face, per level
    const lv = [0, 4, 8, 12, L]; for (let k = 0; k < lv.length - 1; k++) { const y0 = lv[k], y1 = lv[k + 1], h0 = hw(y0), h1 = hw(y1);
      for (const [ux, uz] of [[1, 0], [0, 1]]) for (const sg of [-1, 1]) { const P0 = (h, t, y) => ux ? [t * h, y, sg * h] : [sg * h, y, t * h];
        beam(s, M.steel, P0(h1, -1, y1), P0(h1, 1, y1), .1); if (k === 0) beam(s, M.steel, P0(h0, -1, y0 + .35), P0(h0, 1, y0 + .35), .1);
        beam(s, M.steel, P0(h0, -1, y0 + .35), P0(h1, 1, y1), .05); beam(s, M.steel, P0(h0, 1, y0 + .35), P0(h1, -1, y1), .05); } }
    // switchback stair: flights alternate lanes A (+x) / B (-x); landings at x = +-3..4.2 at 4, 8, 12 (and the top landing at 16)
    const gFoot = G(-X, A); // v34: the first tread sits on the ground at the foot (no lip), plus a concrete entry pad that meets the ground
    { const ge = G(-5.4, A); floor(s, -5.4, -X, A - .55, A + .55, ge, gFoot, 'x'); const lo = Math.min(ge, gFoot); box(s, M.concrete, (-5.4 - X) / 2, (ge + gFoot) / 2 - .5, A, 5.4 - X, 1.0, 1.2); }
    for (let i = 0; i < 4; i++) { const lane = i % 2 ? B : A, up = i % 2 === 0, ya = i === 0 ? gFoot : i * 4, yb = (i + 1) * 4, zl = lane - .55, zr = lane + .55;
      floor(s, -X, X, zl, zr, up ? ya : yb, up ? yb : ya, 'x');
      const n = Math.round((yb - ya) / .21); for (let k = 0; k < n; k++) { const t = (k + .5) / n, x = up ? -X + 2 * X * t : X - 2 * X * t, y = ya + (yb - ya) * (k + 1) / n; box(s, M.grate, x, y - .03, lane, 2 * X / n + .05, .05, 1.0); }
      for (const ez of [zl + .04, zr - .04]) beam(s, M.steel, [up ? -X : X, ya - .15, ez], [up ? X : -X, yb - .15, ez], .06, .22); // stringers
      for (const ez of [zl, zr]) if (ez !== Z1 || up) beam(s, M.steel, [up ? -X : X, ya + 1, ez], [up ? X : -X, yb + 1, ez], .045); // sloped handrails
      if (i < 3) { const sx = up ? 1 : -1, lx0 = sx * X, lx1 = sx * LX; floor(s, Math.min(lx0, lx1), Math.max(lx0, lx1), Z0, Z2, yb); box(s, M.grate, (lx0 + lx1) / 2, yb - .04, (Z0 + Z2) / 2, LX - X, .08, Z2 - Z0);
        rail(s, lx1, Z0, lx1, Z2, yb); rail(s, lx0, Z0, lx1, Z0, yb); rail(s, lx0, Z2, lx1, Z2, yb); } }
    wall(s, -X, Z0, X, Z0, -3, 13.2); /* v42x: lane A tops out at 12 m; at full height this wall cut the top landing off from the cab */ wall(s, -X, Z1, X, Z1, -3, L + 1.2); wall(s, -X, Z2, X, Z2, -3, L + 1.2); // stair sides: solid stringers + rails (never fall off)
    wall(s, -X, Z1 + .05, -X, Z2 - .05, -3, 3.6); wall(s, X, Z0 + .05, X, Z1 - .05, -3, 0); // no walking under the flights
    for (const [x, z] of [[LX, Z0], [LX, Z2], [-LX, Z0], [-LX, Z2], [X, Z2], [-X, Z2]]) { const g0 = G(x, z), top = x > 0 ? 12 : L; box(s, M.concrete, x, g0 - .3, z, .5, 1, .5); beam(s, M.steel, [x, g0, z], [x, top, z], .12); if (Math.abs(x) === LX) wall(s, x, z, x, z, g0 - 1, top); }
    // catwalk (railed, cantilevered round the cab) + the top landing that joins it
    floor(s, -K, K, -K, K, L); box(s, M.plank, 0, L - .08, 0, 2 * K, .16, 2 * K); floor(s, -LX, -2.2, 3.0, Z2, L); box(s, M.grate, -3.2, L - .05, (3.0 + Z2) / 2, 2.0, .1, Z2 - 3.0);
    for (const [ax, az, bx, bz] of [[K, -K, K, K], [-K, -K, K, -K], [-K, -K, -K, 3.0], [-2.2, K, K, K], [-LX, 3.0, -LX, Z2], [-LX, Z2, -X, Z2], [-LX, 3.0, -K, 3.0], [-2.2, K, -2.2, Z1]]) rail(s, ax, az, bx, bz, L);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) beam(s, M.steel, [sx * HW1, L - .1, sz * HW1], [sx * K, L - .1, sz * K], .12); // catwalk outriggers
    // the cab: weathered board siding to the sill, glass all round (steel mullions), header, pyramid roof, door on the +z side
    const HH = 2.6, door = [-1.6, -.4]; for (const [ax, az, bx, bz] of [[-C, -C, C, -C], [C, -C, C, C], [-C, -C, -C, C], [-C, C, door[0], C], [door[1], C, C, C]]) { wall(s, ax, az, bx, bz, L, L + HH);
      const w = Math.abs(bx - ax), d = Math.abs(bz - az), mx = (ax + bx) / 2, mz = (az + bz) / 2, W = Math.max(w, d); box(s, M.wood, mx, L + .5, mz, (w || .1) + .1, 1, (d || .1) + .1); box(s, M.glass, mx, L + 1.55, mz, w || .04, 1.1, d || .04); box(s, M.wood, mx, L + 2.35, mz, (w || .1) + .1, .5, (d || .1) + .1);
      const nm = Math.max(1, Math.round(W / .9)); for (let k = 0; k <= nm; k++) { const t = k / nm, x = ax + (bx - ax) * t, z = az + (bz - az) * t; box(s, M.steel, x, L + 1.55, z, .05, 1.1, .05); } box(s, M.steel, mx, L + 1.02, mz, (w || .05) + .06, .05, (d || .05) + .06); }
    box(s, M.wood, door[0] - .05, L + 1.3, C, .1, 2.6, .12); box(s, M.wood, door[1] + .05, L + 1.3, C, .1, 2.6, .12); box(s, M.wood, (door[0] + door[1]) / 2, L + 2.25, C, door[1] - door[0], .3, .12); // door frame (open)
    { const g = new THREE.ConeGeometry((C + .55) * Math.SQRT2, 1.7, 4, 1); g.rotateY(Math.PI / 4); g.translate(0, L + HH + .85, 0); (s.geo.get(M.roof) || s.geo.set(M.roof, []).get(M.roof)).push(g); }
    beam(s, M.iron, [0, L + HH + 1.6, 0], [0, L + HH + 2.4, 0], .03); box(s, M.wood, 0, L + .02, 0, 2 * C, .04, 2 * C); // lightning rod, cab floor
    if (kind === 'armory') { // desk with the Tommy gun, a box with the Golden Buffalo
      box(s, M.wood, 1.2, L + .78, -1.7, 1.7, .06, .8); for (const [x, z] of [[.45, -2], [1.95, -2], [.45, -1.4], [1.95, -1.4]]) box(s, M.dark, x, L + .38, z, .07, .76, .07); wall(s, .35, -1.3, 2.05, -1.3, L, L + .8);
      box(s, M.crate, -1.4, L + .3, -1.8, 1.5, .6, .6); wall(s, -2.15, -1.5, -.65, -1.5, L, L + .6);
      s.tommySpot = spot(s, 1.2, L, -.7, 'tommy', 'Take the Tommy gun', 1.5); s.goldSpot = spot(s, -1.4, L, -.9, 'gold', 'Take the Golden Buffalo', 1.5); }
    else { box(s, M.dark, 0, L + .55, -1.9, 3.2, 1.1, .7); wall(s, -1.6, -1.5, 1.6, -1.5, L, L + 1.1); const sg = new THREE.Mesh(new THREE.PlaneGeometry(2.4, .6), new THREE.MeshBasicMaterial({ map: signTex('GUN UPGRADES', '#2a1a0c', '#ffd77a'), toneMapped: false })); sg.position.set(0, L + 1.75, -2.3); s.signs = [sg];
      for (const [x, col] of [[-1, 0xcd7f32], [0, 0xc0c0c0], [1, 0xffd700]]) box(s, new THREE.MeshStandardMaterial({ color: col, metalness: 1, roughness: .3 }), x, L + 1.18, -2.0, .4, .14, .3);
      s.shopSpot = spot(s, 0, L, -.8, 'shop', 'Gun upgrade station', 1.7); }
    const g = finish(s); for (const sg of s.signs || []) g.add(sg);
    const lab = new THREE.Mesh(new THREE.PlaneGeometry(1.8, .45), new THREE.MeshStandardMaterial({ map: signTex(kind === 'armory' ? 'LOOKOUT No.1' : 'LOOKOUT No.2'), roughness: .8 })); lab.position.set(-4.3, 2.75, A); lab.rotation.y = -Math.PI / 2; box(s, M.steel, -4.25, 2.75, A, .06, .5, 2.2); g.add(lab); // sign at the stair foot
    return s; }

  // ---- v42 SALOON FACADE (exterior only; walls, floors and collisions are unchanged) ----
  // Barn-red lap siding all round, a tall stepped false front with a cornice on brackets and a big carved SALOON board, a
  // wraparound upstairs balcony (front + west side) on turned posts with balustrades and a shingled roof, cream window trim
  // with muntins, porch lanterns, a shingled gable roof behind the false front, barrels and a bench on the boardwalk.
  function addGeo(s, mat, g) { (s.geo.get(mat) || s.geo.set(mat, []).get(mat)).push(g); }
  function sidePanel(s, ax, bx, y0, y1, z, holes, depth = .05, alongZ = false) { // flat siding panel on a wall plane, with rectangular holes
    const xs = [ax, bx, ...holes.flatMap(h => [h[0], h[1]])].filter(x => x >= ax && x <= bx).sort((a, b) => a - b);
    for (let k = 0; k < xs.length - 1; k++) { const l = xs[k], r = xs[k + 1]; if (r - l < .01) continue; const open = holes.filter(h => h[0] < (l + r) / 2 && h[1] > (l + r) / 2).sort((a, b) => a[2] - b[2]); let y = y0;
      const put = (ya, yb) => { if (yb - ya < .01) return; if (alongZ) box(s, M.side, z, (ya + yb) / 2, (l + r) / 2, depth, yb - ya, r - l); else box(s, M.side, (l + r) / 2, (ya + yb) / 2, z, r - l, yb - ya, depth); };
      for (const h of open) { if (h[2] > y) put(y, h[2]); y = Math.max(y, h[3]); } put(y, y1); } }
  function winTrim(s, x, y0, y1, w, z) { const t = .14, c = (x0, y, w2, h) => box(s, M.cream, x0, y, z, w2, h, .1);
    c(x, y1 + t / 2, w + 2 * t + .1, t * 1.4); c(x, y0 - t / 2, w + 2 * t + .2, t); c(x - w / 2 - t / 2, (y0 + y1) / 2, t, y1 - y0); c(x + w / 2 + t / 2, (y0 + y1) / 2, t, y1 - y0);
    box(s, M.trim, x, (y0 + y1) / 2, z + .02, .05, y1 - y0, .04); for (const f of [1 / 3, 2 / 3]) box(s, M.trim, x, y0 + (y1 - y0) * f, z + .02, w, .05, .04); }
  function saloonFacade(s, x0, x1, D, door, F, HT, Y2) {
    const mx = (x0 + x1) / 2, top = F + HT, FF = top + 2.7, FC = top + 3.8, Z = -.11;
    const gWin = [x0 + 1.6, x1 - 1.6].filter(x => x < door[0] - .8 || x > door[1] + .8), uWin = [-15.5, -12.5, -9.5, -3.5];
    const holes = [[door[0], door[1], F, F + 2.9], ...gWin.map(x => [x - .7, x + .7, F + 1.1, F + 2.3]), ...uWin.map(x => [x - .6, x + .6, Y2 + .95, Y2 + 2.05])];
    sidePanel(s, x0 - .12, x1 + .12, F - .1, top, Z, holes);                                             // front wall
    sidePanel(s, -.1, D + .1, F - .1, top, x0 - .11, [], .05, true); sidePanel(s, -.1, D + .1, F - .1, top, x1 + .11, [], .05, true); // sides
    box(s, M.side, mx, (F + top) / 2, D + .11, x1 - x0 + .3, top - F + .1, .05);                           // back
    // false front: full width to FF, raised centre to FC, cornice + brackets on both tiers
    box(s, M.side, mx, (top + FF) / 2, Z, x1 - x0 + .3, FF - top, .18); box(s, M.side, mx, (FF + FC) / 2, Z, 7.2, FC - FF, .18);
    for (const [cx, cw, cy] of [[mx, x1 - x0 + .7, FF], [mx, 7.6, FC]]) { box(s, M.trim, cx, cy + .12, Z - .12, cw, .24, .5); box(s, M.trim, cx, cy - .1, Z - .06, cw - .2, .16, .32);
      for (let x = cx - cw / 2 + .5; x <= cx + cw / 2 - .4; x += 1.1) if (cy === FC || Math.abs(x - mx) > 3.7) box(s, M.trim, x, cy - .32, Z - .12, .14, .32, .28); }
    for (const sx of [-1, 1]) { box(s, M.trim, mx + sx * 3.6, (FF + FC) / 2, Z - .03, .26, FC - FF + .2, .24); box(s, M.trim, mx + sx * 3.6, FC + .5, Z - .03, .32, .5, .3); }
    for (const x of [x0 - .1, x1 + .1]) box(s, M.trim, x, (F + FF) / 2, Z - .02, .26, FF - F, .26);         // corner boards
    box(s, M.trim, mx, top - .1, Z - .05, x1 - x0 + .3, .2, .2);
    // carved SALOON board
    const sign = canvasTex(1024, 256, (x, w, h) => { const r = rng(4); for (let i = 0; i < 5; i++) { x.fillStyle = `hsl(${30 + r() * 6},${38 + r() * 8}%,${62 + r() * 8}%)`; x.fillRect(0, i * h / 5, w, h / 5); x.fillStyle = 'rgba(70,40,20,.4)'; x.fillRect(0, (i + 1) * h / 5 - 3, w, 3);
        for (let k = 0; k < 16; k++) { x.strokeStyle = `rgba(110,70,40,${.1 + r() * .15})`; x.beginPath(); const y = i * h / 5 + r() * h / 5; x.moveTo(0, y); x.bezierCurveTo(w * .3, y + 4 - r() * 8, w * .7, y + 4 - r() * 8, w, y); x.stroke(); } }
      x.strokeStyle = '#4a2a14'; x.lineWidth = 14; x.strokeRect(10, 10, w - 20, h - 20); x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = 'bold 178px Rockwell, "Roboto Slab", "Courier New", Georgia, serif';
      x.fillStyle = 'rgba(255,240,210,.55)'; x.fillText('SALOON', w / 2 - 4, h / 2 + 4); x.fillStyle = '#3a1e0c'; x.fillText('SALOON', w / 2 + 5, h / 2 + 13); x.fillStyle = '#6a3a1a'; x.fillText('SALOON', w / 2, h / 2 + 8);
      x.lineWidth = 3; x.strokeStyle = 'rgba(30,14,4,.8)'; x.strokeText('SALOON', w / 2, h / 2 + 8); });
    const SY = (top + FF) / 2 + .1, sg = new THREE.Mesh(new THREE.PlaneGeometry(9, 2.25), new THREE.MeshStandardMaterial({ map: sign, roughness: .75 })); sg.position.set(mx, SY, Z - .2); sg.rotation.y = Math.PI; (s.signs = s.signs || []).push(sg);
    box(s, M.trim, mx, SY, Z - .1, 9.4, 2.6, .12); for (const sx of [-1, 1]) box(s, M.trim, mx + sx * 4.85, SY - 1.25, Z - .25, .18, .5, .3);
    // windows: cream trim + muntins
    for (const x of gWin) winTrim(s, x, F + 1.1, F + 2.3, 1.4, Z - .04); for (const x of uWin) winTrim(s, x, Y2 + .95, Y2 + 2.05, 1.2, Z - .04);
    box(s, M.cream, (door[0] + door[1]) / 2, F + 3.0, Z - .05, door[1] - door[0] + .5, .18, .1); for (const x of door) box(s, M.cream, x + (x === door[0] ? -.08 : .08), F + 1.45, Z - .05, .16, 2.9, .1);
    // wraparound balcony: front (z -2.6..0) and west side (x x0-2.2..x0), deck at Y2, posts from the ground, balustrade, shingled roof
    const BZ = -2.6, BX = x0 - 2.2, DY = Y2, RY = Y2 + 2.95, postH = (y0, y1, x, z) => { box(s, M.trim, x, (y0 + y1) / 2, z, .2, y1 - y0, .2); box(s, M.trim, x, y0 + .15, z, .28, .3, .28); };
    box(s, M.plank, (BX + x1 + .3) / 2, DY - .06, BZ / 2, x1 + .3 - BX, .14, -BZ + .1); box(s, M.plank, (BX + x0) / 2, DY - .06, (BZ + D) / 2, x0 - BX, .14, D - BZ);
    box(s, M.trim, (BX + x1 + .3) / 2, DY - .26, BZ + .08, x1 + .3 - BX, .28, .16); box(s, M.trim, BX + .08, DY - .26, (BZ + D) / 2, .16, .28, D - BZ);
    const posts = []; for (let x = x1 + .15; x > BX; x -= 2.75) posts.push([x, BZ + .15]); posts.push([BX + .15, BZ + .15]); for (let z = BZ + 2.9; z < D; z += 2.75) posts.push([BX + .15, z]); posts.push([BX + .15, D - .1]);
    for (const [x, z] of posts) { const onDeck = x > x0 - .3; postH(onDeck ? F : -2.6, RY, x, z); }
    const rail = (ax, az, bx, bz) => { const L = Math.hypot(bx - ax, bz - az), along = Math.abs(bx - ax) > Math.abs(bz - az); for (const y of [DY + .95, DY + .18]) box(s, M.trim, (ax + bx) / 2, y, (az + bz) / 2, along ? L : .1, .09, along ? .1 : L);
      for (let t = .25; t < L; t += .26) box(s, M.cream, ax + (bx - ax) * t / L, DY + .56, az + (bz - az) * t / L, .05, .74, .05); };
    rail(x1 + .25, BZ + .15, BX + .15, BZ + .15); rail(BX + .15, BZ + .15, BX + .15, D - .1); rail(x1 + .25, BZ + .15, x1 + .25, -.1);
    { const L = -BZ + .5, ang = Math.atan2(.35, L), g = new THREE.PlaneGeometry(x1 + .6 - BX, L / Math.cos(ang)); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (x1 + .6 - BX) / 2.5, uv.getY(i) * L / 2.5);
      g.rotateX(-Math.PI / 2 - ang); g.translate((BX + x1 + .6) / 2, RY + .12, (BZ - .25) / 2); addGeo(s, M.shingle, g); }
    { const L = x0 - BX + .4, ang = Math.atan2(.35, L), g = new THREE.PlaneGeometry(D - BZ + .3, L / Math.cos(ang)); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (D - BZ) / 2.5, uv.getY(i) * L / 2.5);
      g.rotateX(-Math.PI / 2 - ang); g.rotateY(Math.PI / 2); g.translate((BX - .2 + x0) / 2, RY + .12, (BZ + D) / 2); addGeo(s, M.shingle, g); }
    box(s, M.trim, (BX + x1 + .6) / 2, RY - .02, BZ - .12, x1 + .6 - BX, .22, .14); box(s, M.trim, BX - .12, RY - .02, (BZ + D) / 2, .14, .22, D - BZ);
    // v108 ROOFTOP BAR (replaces the gable roof): a flat deck behind the false front, reached from the mezzanine side door,
    // the west balcony and an outside stair along the back wall. Bar counter + shelf, stools, tables under canvas umbrellas,
    // string lights, a sign, potted cacti, parapet rails (colliders on every edge).
    floor(s, BX, x0, BZ, D + 1.2, DY); floor(s, x0, x1 + .3, BZ, -.12, DY); box(s, M.plank, (BX + x0) / 2, DY - .06, D + .6, x0 - BX, .14, 1.2); // balcony is walkable; landing behind the building
    wall(s, BX, BZ, BX, D + 1.25, DY, DY + 1.1); wall(s, BX, BZ, x1 + .3, BZ, DY, DY + 1.1); wall(s, x1 + .3, BZ, x1 + .3, -.12, DY, DY + 1.1); wall(s, BX, D + 1.25, x0, D + 1.25, DY, DY + 1.1); rail(BX + .15, D - .1, BX + .15, D + 1.2); rail(BX + .15, D + 1.2, x0, D + 1.2);
    postH(-2.6, DY, BX + .15, D + 1.15);
    const RT = top + .3, SZ0 = D + .15, SZ1 = D + 1.25, SX0 = x0, SX1 = -10.6; // outside stair: from the landing (DY) at x0 up to the roof (RT) at SX1
    floor(s, SX0, SX1, SZ0, SZ1, DY, RT, 'x'); floor(s, SX1, SX1 + 1.6, D - .2, SZ1, RT); wall(s, SX0, SZ1, SX1 + 1.6, SZ1, DY, RT + 1.1); wall(s, SX1 + 1.6, D, SX1 + 1.6, SZ1, RT, RT + 1.1);
    { const n = 24, run = SX1 - SX0; for (let k = 0; k < n; k++) { const x = SX0 + (k + .5) * run / n, y = DY + (RT - DY) * (k + 1) / n; box(s, M.plank, x, y - .05, (SZ0 + SZ1) / 2, run / n + .04, .1, SZ1 - SZ0); }
      for (const z of [SZ0 + .05, SZ1 - .05]) beam(s, M.trim, [SX0, DY - .15, z], [SX1, RT - .15, z], .08, .28); beam(s, M.trim, [SX0, DY + 1, SZ1], [SX1, RT + 1, SZ1], .07);
      for (let k = 1; k < 12; k++) { const x = SX0 + k * run / 12, y = DY + (RT - DY) * k / 12; box(s, M.cream, x, y + .5, SZ1, .05, 1, .05); }
      for (const t of [.25, .6, .95]) { const x = SX0 + t * run, y = DY + (RT - DY) * t; box(s, M.trim, x, (y - 2.6) / 2, SZ1 - .05, .18, y + 2.6, .18); }
      box(s, M.plank, SX1 + .8, RT - .06, (D - .2 + SZ1) / 2, 1.6, .12, SZ1 - D + .2); box(s, M.trim, SX1 + 1.6, RT - 1.4, SZ1 - .1, .18, 2.8, .18); }
    // the deck + parapet (front edge is the false front)
    floor(s, x0 + .05, x1 - .05, .15, D + .15, RT); box(s, M.plank, mx, RT - .04, D / 2 + .1, x1 - x0, .08, D);
    wall(s, x0, .1, x0, D, RT, RT + 1.1); wall(s, x1, .1, x1, D, RT, RT + 1.1); wall(s, x0, D, SX1, D, RT, RT + 1.1); wall(s, SX1 + 1.6, D, x1, D, RT, RT + 1.1); wall(s, x0, .15, x1, .15, RT, RT + 1.1);
    const para = (ax, az, bx, bz) => { const L = Math.hypot(bx - ax, bz - az), along = Math.abs(bx - ax) > Math.abs(bz - az); box(s, M.side, (ax + bx) / 2, RT + .3, (az + bz) / 2, along ? L : .16, .6, along ? .16 : L); box(s, M.trim, (ax + bx) / 2, RT + .64, (az + bz) / 2, along ? L + .1 : .26, .08, along ? .26 : L + .1);
      for (let t = .3; t < L; t += .3) box(s, M.cream, ax + (bx - ax) * t / L, RT + .86, az + (bz - az) * t / L, .045, .36, .045); box(s, M.trim, (ax + bx) / 2, RT + 1.06, (az + bz) / 2, along ? L : .08, .06, along ? .08 : L); };
    para(x0, .2, x0, D); para(x1, .2, x1, D); para(x0, D, SX1, D); para(SX1 + 1.6, D, x1, D);
    // the bar: counter, foot rail, back shelf with bottles, stools
    const BX0 = -8.6, BX1 = -3.2, BZf = 8.1; box(s, M.dark, (BX0 + BX1) / 2, RT + .55, BZf + .3, BX1 - BX0, 1.1, .6); box(s, M.plank, (BX0 + BX1) / 2, RT + 1.13, BZf + .25, BX1 - BX0 + .2, .06, .8); beam(s, M.brass, [BX0, RT + .2, BZf - .08], [BX1, RT + .2, BZf - .08], .04);
    wall(s, BX0, BZf - .05, BX1, BZf - .05, RT, RT + 1.2); wall(s, BX0, BZf - .05, BX0, BZf + .6, RT, RT + 1.2); wall(s, BX1, BZf - .05, BX1, BZf + .6, RT, RT + 1.2);
    box(s, M.dark, (BX0 + BX1) / 2, RT + 1.2, D - .35, BX1 - BX0, 2.4, .3); for (const y of [1.25, 1.75]) box(s, M.plank, (BX0 + BX1) / 2, RT + y, D - .55, BX1 - BX0 - .2, .05, .3);
    { const bc = [M.brass, M.glass, M.red, M.dark, M.cream]; let k = 0; for (const y of [1.25, 1.75]) for (let x = BX0 + .3; x < BX1 - .2; x += .22) { cyl(s, bc[k++ % 5], x, RT + y + .14, D - .55, .045, .26, 8); } }
    for (let k = 0; k < 5; k++) { const x = BX0 + .6 + k * (BX1 - BX0 - 1.2) / 4; cyl(s, M.dark, x, RT + .35, BZf - .65, .05, .7, 8); cyl(s, M.red, x, RT + .74, BZf - .65, .2, .07, 14); }
    // tables under canvas umbrellas, chairs
    for (const [x, z] of [[-14.2, 3.2], [-13.4, 7.2], [-5.2, 3.4], [-9.6, 2.6]]) { cyl(s, M.dark, x, RT + .74, z, .5, .05); cyl(s, M.dark, x, RT + .37, z, .06, .74, 8); cyl(s, M.trim, x, RT + 1.5, z, .03, 1.5, 6);
      { const g = new THREE.ConeGeometry(1.25, .45, 10, 1, true); g.translate(x, RT + 2.3, z); addGeo(s, M.cream, g); } wall(s, x - .3, z, x + .3, z, RT, RT + .9);
      for (let k = 0; k < 3; k++) { const a = k / 3 * TAU + .5, cx = x + Math.cos(a) * .85, cz = z + Math.sin(a) * .85; box(s, M.dark, cx, RT + .45, cz, .42, .05, .42, -a); box(s, M.dark, cx + Math.cos(a) * .2, RT + .72, cz + Math.sin(a) * .2, .06, .55, .4, -a); } }
    // string lights between corner poles + a mid pole (emissive bulbs; no real lights)
    { const poles = [[x0 + .35, .5], [x1 - .35, .5], [x1 - .35, D - .35], [x0 + .35, D - .35], [mx, D / 2]]; for (const [x, z] of poles) cyl(s, M.trim, x, RT + 1.45, z, .05, 2.9, 8);
      const H2 = RT + 2.8; for (const [a, b] of [[0, 4], [1, 4], [2, 4], [3, 4], [0, 1], [3, 0]]) { const [ax, az] = poles[a], [bx, bz] = poles[b], L = Math.hypot(bx - ax, bz - az), n = Math.max(6, Math.round(L / .6));
        for (let i = 0; i <= n; i++) { const t = i / n, sag = Math.sin(t * Math.PI) * .45; box(s, M.lamp, ax + (bx - ax) * t, H2 - sag - .08, az + (bz - az) * t, .06, .08, .06); } } }
    // sign + cacti in barrels
    { const sg = new THREE.Mesh(new THREE.PlaneGeometry(2.6, .7), new THREE.MeshStandardMaterial({ map: signTex('ROOFTOP BAR', '#5a1a12'), roughness: .8 })); sg.position.set((BX0 + BX1) / 2, RT + 2.75, D - .18); sg.rotation.y = Math.PI; (s.signs = s.signs || []).push(sg); }
    for (const [x, z] of [[x0 + .8, D - .8], [x1 - .8, 1], [x0 + .8, 1]]) { cyl(s, M.crate, x, RT + .3, z, .3, .6, 10); cyl(s, M.dark, x, RT + .9, z, .1, .9, 8); cyl(s, M.dark, x + .14, RT + 1.0, z, .06, .3, 6); }
    s.roofSpot = spot(s, (BX0 + BX1) / 2, RT, BZf - 1.1, 'drink', 'Order at the rooftop bar', 1.8); s.RT = RT; s.sitSpot = spot(s, BX0 + .6, RT, BZf - .65, 'roofsit', 'Sit at the bar and take in the view', 1.1); /* v197 */
    // v112 brass telescope on a tripod at the front-west corner: USE to look out over the range
    { const tx = x0 + 1.6, tz = 1.3; for (let k = 0; k < 3; k++) { const a = k / 3 * TAU; beam(s, M.trim, [tx + Math.cos(a) * .35, RT, tz + Math.sin(a) * .35], [tx, RT + 1.15, tz], .035); } beam(s, M.brass, [tx - .05, RT + 1.2, tz + .3], [tx + .05, RT + 1.38, tz - .45], .09); cyl(s, M.dark, tx + .05, RT + 1.37, tz - .48, .06, .05, 10);
      s.scopeSpot = spot(s, tx + .4, RT, tz + .6, 'telescope', 'Look through the telescope', 1.4); }
    // porch life: lanterns by the door, barrels, a bench
    for (const x of [door[0] - .7, door[1] + .7]) { box(s, M.trim, x, F + 2.3, Z - .25, .08, .08, .4); box(s, M.lamp, x, F + 2.05, Z - .45, .22, .34, .22); box(s, M.trim, x, F + 2.26, Z - .45, .3, .06, .3); }
    for (const [x, z] of [[x0 + .7, -1.6], [x0 + 1.4, -1.9], [x1 - .8, -1.7]]) { cyl(s, M.crate, x, F + .5, z, .38, 1, 12); cyl(s, M.trim, x, F + .18, z, .4, .06, 12); cyl(s, M.trim, x, F + .82, z, .4, .06, 12); }
    box(s, M.plank, -10.5, F + .45, -1.9, 2.4, .1, .5); for (const x of [-11.5, -9.5]) box(s, M.trim, x, F + .22, -1.9, .1, .44, .45);
  }
  // ---- the town: saloon + general store side by side, boardwalk porch, hitching rail ----
  function town(cx, cz, rot) {
    let gMax = -1e9; for (let x = -18; x <= 11; x += 1.5) for (let z = -4; z <= 11; z += 1.5) { const [wx, wz] = [cx + x * Math.cos(rot) + z * Math.sin(rot), cz - x * Math.sin(rot) + z * Math.cos(rot)]; gMax = Math.max(gMax, hAt(wx, wz)); }
    const s = struct(cx, cz, rot, gMax + .02), F = .45, WH = 4.3, Y2 = F + 3.6; s.kind = 'town'; T.town = s; s.F = F; s.Y2 = Y2; // v35: the saloon is bigger (x -17..-1, z 0..10) with an upper floor at Y2
    for (let x = -18; x <= 11; x += 2) for (let z = -3.4; z <= 10.6; z += 2) box(s, M.dark, x, (F - 2.5) / 2, z, .24, 2.5 + F, .24); // stilts down to the ground
    floor(s, -17.2, 10.2, -2.4, 10, F); box(s, M.plank, -3.5, F - .06, 3.8, 27.4, .12, 12.8); // boardwalk + floors
    floor(s, -17.2, 10.2, -3.4, -2.4, 0, F, 'z'); box(s, M.plank, -3.5, F / 2 - .05, -2.9, 27.4, .1, 1);
    for (const [x0, x1, door, name, D, HT] of [[-17, -1, [-7.6, -5.0], 'SALOON', 10, 7.6], [1, 10, [4.7, 6.3], 'GENERAL STORE', 8, WH]]) { const mx = (x0 + x1) / 2, w = x1 - x0, sal = name === 'SALOON';
      for (const [ax, az, bx, bz] of (sal ? [[x0, D, x1, D], [x0, 0, x0, 8.5], [x0, 9.7, x0, D], [x1, 0, x1, D], [x0, 0, door[0], 0], [door[1], 0, x1, 0]] : [[x0, D, x1, D], [x0, 0, x0, D], [x1, 0, x1, D], [x0, 0, door[0], 0], [door[1], 0, x1, 0]])) { wall(s, ax, az, bx, bz, F, F + HT); if(az===0&&bz===0){const holes=[];for(const x of [x0+1.6,x1-1.6])if(x<door[0]-.8||x>door[1]+.8)holes.push([x-.7,x+.7,F+1.1,F+2.3]);if(sal)for(const x of [-15.5,-12.5,-9.5,-3.5])holes.push([x-.6,x+.6,Y2+.95,Y2+2.05]);const cuts=[ax,bx,...holes.flatMap(h=>[Math.max(ax,h[0]),Math.min(bx,h[1])]).filter(x=>x>ax&&x<bx)].sort((a,b)=>a-b);for(let k=0;k<cuts.length-1;k++){const l=cuts[k],r=cuts[k+1];if(r-l<.001)continue;const open=holes.filter(h=>h[0]<(l+r)/2&&h[1]>(l+r)/2).sort((a,b)=>a[2]-b[2]);let y=F;for(const h of open){if(h[2]>y)box(s,M.plank,(l+r)/2,(y+h[2])/2,0,r-l,h[2]-y,.16);y=Math.max(y,h[3]);}if(y<F+HT)box(s,M.plank,(l+r)/2,(y+F+HT)/2,0,r-l,F+HT-y,.16);}}else box(s,M.plank,(ax+bx)/2,F+HT/2,(az+bz)/2,Math.abs(bx-ax)+.16,HT,Math.abs(bz-az)+.16); }
      if (sal) box(s, M.plank, (door[0] + door[1]) / 2, F + 2.9 + (HT - 2.9) / 2, 0, door[1] - door[0] + .2, HT - 2.9, .16); // wall above the door
      if (sal) { /* v108: upstairs side door (mezzanine -> west balcony -> rooftop stair) */ wall(s, x0, 8.5, x0, 9.7, F, Y2); box(s, M.plank, x0, (F + Y2) / 2, 9.1, .16, Y2 - F, 1.2); wall(s, x0, 8.5, x0, 9.7, Y2 + 2.2, F + HT); box(s, M.plank, x0, (Y2 + 2.2 + F + HT) / 2, 9.1, .16, F + HT - Y2 - 2.2, 1.2);
        for (const z of [8.45, 9.75]) box(s, M.cream, x0 - .1, Y2 + 1.1, z, .12, 2.2, .1); box(s, M.cream, x0 - .1, Y2 + 2.25, 9.1, .12, .12, 1.4); }
      box(s, M.roof, mx, F + HT + .15, D / 2, w + .6, .2, D + .6); if (!sal) { box(s, M.plank, mx, F + HT + 1.2, 0, w + .2, 2.4, .2); box(s, M.dark, mx, F + 2.9, -1.3, w + .2, .12, 2.6); // false front, porch roof
      for (const x of [x0 + .2, mx, x1 - .2]) box(s, M.dark, x, F + 1.4, -2.3, .14, 2.9, .14); } else saloonFacade(s, x0, x1, D, door, F, HT, Y2);
      for (const x of [x0 + 1.6, x1 - 1.6]) if (x < door[0] - .8 || x > door[1] + .8) box(s, M.glass, x, F + 1.7, -.02, 1.4, 1.2, .06);
      if (sal) for (const x of [-15.5, -12.5, -9.5, -3.5]) box(s, M.glass, x, Y2 + 1.5, -.02, 1.2, 1.1, .06); // upstairs windows
      if (!sal) for (const k of [0, 1]) box(s, M.dark, door[k] + (k ? -.38 : .38), F + 1.25, -.05, .72, 1.1, .05); // batwing doors (the saloon's swing: src/hrsaloon.js)
      if (sal) continue; const sg = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(w - 1, 7.5), 1.1), new THREE.MeshStandardMaterial({ map: signTex(name, sal ? '#5a1a12' : '#1a2a3a'), roughness: .8 })); sg.position.set(mx, F + HT + 1.2, -.12); sg.rotation.y = Math.PI; (s.signs = s.signs || []).push(sg); }
    // ---- v35 saloon interior: upper floor (mezzanine) over the left third, a stair up along its edge, balcony rail; the back bar with mirror + bottles
    floor(s, -17, -11.5, 0, 10, Y2); box(s, M.plank, -14.25, Y2 - .1, 5, 5.5, .2, 10); for (const z of [1, 3.5, 6, 8.5]) box(s, M.dark, -14.25, Y2 - .32, z, 5.5, .24, .2); // floor + joists
    for (const z of [.25, 2.8]) box(s, M.dark, -11.55, F + (Y2 - F) / 2, z, .22, Y2 - F, .22); // posts
    floor(s, -11.5, -10.4, 2.8, 8.4, F, Y2, 'z'); floor(s, -11.5, -10.4, 8.4, 10, Y2); box(s, M.plank, -10.95, Y2 - .08, 9.2, 1.1, .16, 1.6);
    { const n = 17; for (let k = 0; k < n; k++) { const z = 2.8 + (k + .5) * 5.6 / n, y = F + (Y2 - F) * (k + 1) / n; box(s, M.plank, -10.95, y - .05, z, 1.1, .1, 5.6 / n + .04); }
      for (const x of [-11.5, -10.4]) { const g = new THREE.Vector3(); beam(s, M.dark, [x, F + .1, 2.8], [x, Y2 - .1, 8.4], .08, .3); } }
    wall(s, -10.4, 2.8, -10.4, 6.2, F, Y2 + 1.1); wall(s, -11.5, 2.8, -11.5, 6.2, F, Y2 + 1.1); wall(s, -10.4, 6.2, -10.4, 10, F + 1.95, Y2 + 1.1); wall(s, -11.5, 6.2, -11.5, 8.4, F + 1.95, Y2 + 1.1); /* v72: walk UNDER the high half of the stair (2 m+ headroom) between the two rooms; the sides still stop you falling off */ wall(s, -11.5, 0, -11.5, 2.8, Y2, Y2 + 1.1); // stair sides + balcony rail (solid)
    beam(s, M.dark, [-10.4, F + 1.05, 2.8], [-10.4, Y2 + 1.05, 8.4], .07); beam(s, M.dark, [-10.4, Y2 + 1.05, 8.4], [-10.4, Y2 + 1.05, 10], .07); beam(s, M.dark, [-11.5, Y2 + 1.05, 0], [-11.5, Y2 + 1.05, 2.8], .08);
    for (let z = .3; z <= 2.8; z += .35) box(s, M.dark, -11.5, Y2 + .5, z, .05, 1, .05); for (let z = 8.6; z <= 10; z += .35) box(s, M.dark, -10.4, Y2 + .5, z, .05, 1, .05);
    for (let k = 0; k <= 8; k++) { const z = 2.8 + k * .7, y = F + (Y2 - F) * k / 8; box(s, M.dark, -10.4, y + .55, z, .05, 1.05, .05); }
    // bar: counter with a brass foot rail + top edge, back bar (shelves, bottles, mirror), antlers + skull over it
    box(s, M.dark, -7, F + .55, 5.5, 6, 1.1, .6); wall(s, -10, 5.5, -4, 5.5, F, F + 1.1); box(s, M.brass, -7, F + .2, 5.12, 6, .06, .06); box(s, M.brass, -7, F + 1.12, 5.2, 6.05, .04, .1); for (let x = -9.7; x <= -4.2; x += 1.1) box(s, M.brass, x, F + .1, 5.17, .04, .2, .04);
    box(s, M.dark, -7, F + .5, 9.55, 6.2, 1, .7); box(s, M.mirror, -7, F + 1.95, 9.92, 4.8, 1.3, .04); for (const y of [F + 1.35, F + 2.75, F + 3.2]) box(s, M.dark, -7, y, 9.75, 6.2, .05, .4);
    { const r = rng(7), bc = [M.bGreen, M.bAmber, M.glass, M.bGreen, M.bAmber]; for (const y of [F + 1.38, F + 2.78]) for (let i = 0; i < 22; i++) { const x = -9.9 + i * .27 + r() * .05; if (y < 2 && x > -9.4 && x < -4.6) continue; box(s, bc[(r() * 5) | 0], x, y + .17, 9.75, .08, .3 + r() * .08, .08); }
      for (let i = 0; i < 14; i++) box(s, bc[i % 5], -9.6 + i * .2, F + 1.17, 9.5, .07, .26, .07); }
    box(s, M.bone, -7, F + 4.0, 9.85, .32, .26, .32); beam(s, M.bone, [-7.1, F + 4.08, 9.8], [-7.9, F + 4.5, 9.75], .05); beam(s, M.bone, [-6.9, F + 4.08, 9.8], [-6.1, F + 4.5, 9.75], .05); beam(s, M.bone, [-7.6, F + 4.33, 9.8], [-7.7, F + 4.7, 9.75], .04); beam(s, M.bone, [-6.4, F + 4.33, 9.8], [-6.3, F + 4.7, 9.75], .04); box(s, M.dark, -7, F + 4.05, 9.95, .6, .5, .05);
    // round tables + chairs, a piano, spittoons, the bandits' table (under the upper floor), the dealer's dim corner, a small stage
    const rtable = (x, z, chairs = 4) => { cyl(s, M.dark, x, F + .74, z, .55, .05); cyl(s, M.dark, x, F + .37, z, .07, .74); cyl(s, M.dark, x, F + .02, z, .3, .04); wall(s, x - .3, z, x + .3, z, F, F + .9);
      for (let k = 0; k < chairs; k++) { const a = k / chairs * TAU + .4, cx2 = x + Math.cos(a) * .85, cz2 = z + Math.sin(a) * .85; box(s, M.dark, cx2, F + .45, cz2, .42, .05, .42, -a); box(s, M.dark, cx2 + Math.cos(a) * .2, F + .75, cz2 + Math.sin(a) * .2, .06, .6, .4, -a); for (const [u, v] of [[-.16, -.16], [.16, -.16], [-.16, .16], [.16, .16]]) box(s, M.dark, cx2 + u, F + .22, cz2 + v, .04, .44, .04); } };
    rtable(-4.2, 1.6); /* v108: the table by the piano is gone (it choked the walkway) */ /* -14.2, 6.2: the 3D draw-poker table (src/hrpoker.js) */ rtable(-8.6, 8.1, 0);
    box(s, M.black, -1.75, F + .7, 8.6, .55, 1.4, 1.6); box(s, M.black, -1.75, F + 1.45, 8.6, .6, .1, 1.65); box(s, M.ivory, -2.07, F + .82, 8.6, .12, .04, 1.4); for (let k = 0; k < 10; k++) box(s, M.black, -2.08, F + .85, 7.98 + k * .14, .08, .03, .05);
    cyl(s, M.dark, -2.7, F + .3, 8.6, .2, .6); // piano + stool
    for (const [x, z] of [[-9.9, 4.8], [-4.1, 4.8], [-12.2, 9.5]]) { cyl(s, M.brass, x, F + .12, z, .17, .24); cyl(s, M.brass, x, F + .25, z, .12, .03); }
    box(s, M.plank, -15.4, F + .2, 1.9, 3.2, .4, 2.8); floor(s, -17, -13.8, .5, 3.3, F + .4); wall(s, -13.8, .5, -13.8, 3.3, F, F + .35); box(s, M.red, -16.95, F + 2, 1.9, .06, 3.1, 2.8); // stage + curtain
    box(s, M.dark, -16.3, F + .5, 8.8, .9, 1, 1.6); box(s, M.dark, -16.4, F + 1.1, 9.6, .5, .04, .5); // dealer's crate table in the dark corner
    // upstairs: three slot machines on stools along the left wall (the machines themselves: src/hrsaloon.js), a settee, rail
    for (const z of [3, 5.2, 7.4]) { cyl(s, M.dark, -15.25, Y2 + .35, z, .2, .7); cyl(s, M.red, -15.25, Y2 + .72, z, .23, .06); wall(s, -16.95, z - .5, -16.2, z - .5, Y2, Y2 + 2); wall(s, -16.95, z + .5, -16.2, z + .5, Y2, Y2 + 2); wall(s, -16.2, z - .5, -16.2, z + .5, Y2, Y2 + 1.2); }
    box(s, M.red, -13, Y2 + .3, 9.5, 2, .5, .6); box(s, M.red, -13, Y2 + .7, 9.8, 2, .5, .15);
    // kerosene lamps (2 warm lights, no shadows), light shafts + dust are in src/hrsaloon.js
    for (const [x, y, z] of [[-7, F + 3.2, 3], [-4, F + 3.2, 7], [-14.2, Y2 - .5, 6.2], [-14, Y2 + 2.4, 5]]) { box(s, M.iron, x, y + .45, z, .02, .7, .02); box(s, M.lamp, x, y, z, .16, .24, .16); box(s, M.brass, x, y - .14, z, .22, .04, .22); }
    // wanted posters
    for (const [x, y, z, ry, name] of [[-1.12, F + 1.8, 6.5, -Math.PI / 2, 'BLACK BART'], [-16.95, F + 1.8, 5, Math.PI / 2, 'THE KID'], [-9.2, F + 2, .1, 0, 'DUTCH']]) { const pm = new THREE.Mesh(new THREE.PlaneGeometry(.6, .8), new THREE.MeshStandardMaterial({ map: wantedTex(name), roughness: .95 })); pm.position.set(x, y, z); pm.rotation.y = ry; s.signs.push(pm); }
    const board = new THREE.Mesh(new THREE.CircleGeometry(.23, 40), new THREE.MeshStandardMaterial({ map: dartTex(), roughness: .9 })); board.position.set(-1.12, F + 1.73, 3.5); board.rotation.y = -Math.PI / 2; (s.signs = s.signs || []).push(board);
    box(s, M.dark, 5.5, F + .55, 5.5, 6, 1.1, .6); wall(s, 2.5, 5.5, 8.5, 5.5, F, F + 1.1); for (let i = 0; i < 5; i++) box(s, M.crate, 2.3 + i * 1.3, F + 1.9, 7.6, 1, .5, .6);
    { box(s, M.dark, -9, F + .74, 2.6, 1.1, .06, 1.1); box(s, M.dark, -9, F + .37, 2.6, .12, .74, .12); for (const z of [1.75, 3.45]) { box(s, M.dark, -9, F + .45, z, .45, .05, .45); box(s, M.dark, -9, F + .22, z, .06, .44, .06); } // checkers table + two chairs
      const ckb = new THREE.Mesh(new THREE.PlaneGeometry(.8, .8), new THREE.MeshStandardMaterial({ map: ckTex(), roughness: .7 })); ckb.rotation.x = -Math.PI / 2; ckb.position.set(-9, F + .776, 2.6); s.signs.push(ckb); }
    box(s, M.iron, 8.6, F + .8, 2.4, .05, 1.6, .05);
    box(s, M.dark, -6, .55, -5.2, 6, .1, .12); for (const x of [-9, -3]) box(s, M.dark, x, .5, -5.2, .14, 1.05, .14); wall(s, -9, -5.2, -3, -5.2, -1, 1.05); // hitching rail
    for (const x of [-8.5, 7.5]) box(s, M.lamp, x, F + 2.6, -.25, .12, .2, .12);
    const g = finish(s); for (const sg of s.signs) g.add(sg); T.board = board;
    s.ckSpot = spot(s, -9, F, 1.5, 'checkers', 'Play checkers', 1.3);
    s.pkSpot = spot(s, -14.2, F, 4.75, 'drawpoker', 'Play draw poker for points', 1.4);
    s.drinkSpot = spot(s, -7, F, 4.5, 'drink', 'Order a whiskey', 1.6); s.armSpot = spot(s, -4.2, F, 2.5, 'armwrestle', 'Arm wrestle (bet 50)', 1.3); s.coffeeSpot = spot(s, -9.2, F, 4.5, 'coffee', 'Black coffee (15) — sobers you up', 1.2); s.sarsSpot = spot(s, -4.9, F, 4.5, 'sars', 'Sarsaparilla (10) — +15 health', 1.2); /* v189 */ /* v114 */ s.dartSpot = spot(s, -2.6, F, 3.5, 'darts', 'Play darts', 1.5); s.storeSpot = spot(s, 5.5, F, 4.5, 'store', 'General store', 1.7);
    const [ax, az] = toW(s, -3.5, 3.6), hw = 19, hd = 13.5, wide = Math.abs(Math.sin(rot)) > .5; T.safe.push({ x: ax, z: az, hw: wide ? hd : hw, hd: wide ? hw : hd, town: true });
    T.npcAt = [[toW(s, -7, 6.5), s.y0 + F, rot], [toW(s, 5.5, 6.5), s.y0 + F, rot]]; // bartender, storekeeper (facing the room)
    return s; }
  function wantedTex(name) { return canvasTex(192, 256, (x, w, h) => { x.fillStyle = '#d9c59a'; x.fillRect(0, 0, w, h); x.fillStyle = 'rgba(90,60,20,.25)'; for (let i = 0; i < 40; i++) x.fillRect(Math.random() * w, Math.random() * h, 6, 6);
    x.fillStyle = '#2a1a0c'; x.textAlign = 'center'; x.font = 'bold 34px Georgia,serif'; x.fillText('WANTED', w / 2, 40); x.font = '14px Georgia,serif'; x.fillText('DEAD OR ALIVE', w / 2, 60); x.beginPath(); x.arc(w / 2, 115, 32, 0, TAU); x.fill(); x.fillRect(w / 2 - 45, 145, 90, 40);
    x.fillStyle = '#d9c59a'; x.fillRect(w / 2 - 36, 106, 72, 8); x.fillStyle = '#2a1a0c'; x.font = 'bold 18px Georgia,serif'; x.fillText(name, w / 2, 210); x.font = 'bold 22px Georgia,serif'; x.fillText('$500 REWARD', w / 2, 238); }); }
  function ckTex() { return canvasTex(256, 256, (x, w) => { const q = w / 8; for (let r = 0; r < 8; r++) for (let cc = 0; cc < 8; cc++) { x.fillStyle = (r + cc) % 2 ? '#5b3a1f' : '#e2cc98'; x.fillRect(cc * q, r * q, q, q); if ((r + cc) % 2 && (r < 3 || r > 4)) { x.fillStyle = r < 3 ? '#1d1d1d' : '#c0392b'; x.beginPath(); x.arc(cc * q + q / 2, r * q + q / 2, q * .36, 0, TAU); x.fill(); } } }); }
  function dartTex() { return canvasTex(256, 256, (x, w) => { const c = w / 2, R = c * .98, k = R / 170; x.fillStyle = '#111'; x.beginPath(); x.arc(c, c, R, 0, TAU); x.fill();
    for (let i = 0; i < 20; i++) { const a0 = (i * 18 - 9 - 90) * Math.PI / 180, a1 = a0 + 18 * Math.PI / 180, dark = i % 2 === 0;
      for (const [r0, r1, col] of [[15.9, 99, dark ? '#1a1a1a' : '#efe2c0'], [99, 107, dark ? '#c0281e' : '#1f7a3a'], [107, 162, dark ? '#1a1a1a' : '#efe2c0'], [162, 170, dark ? '#c0281e' : '#1f7a3a']]) { x.fillStyle = col; x.beginPath(); x.arc(c, c, r1 * k, a0, a1); x.arc(c, c, r0 * k, a1, a0, true); x.fill(); } }
    x.fillStyle = '#1f7a3a'; x.beginPath(); x.arc(c, c, 15.9 * k, 0, TAU); x.fill(); x.fillStyle = '#c0281e'; x.beginPath(); x.arc(c, c, 6.35 * k, 0, TAU); x.fill(); }); }

  // ---- interaction ----
  T.nearSpot = () => { if (H.mounted) return null; let best = null, bd = 1e9; for (const o of T.spots) { if (Math.abs(P.pos.y - o.y) > 1.3) continue; const d = Math.hypot(P.pos.x - o.x, P.pos.z - o.z); if (d < o.r && d < bd) { bd = d; best = o; } } return best; };
  T.label = o => !o ? '' : o.kind === 'tommy' && H.guns && H.guns.state.owned.tommy ? '' : o.kind === 'gold' && H.guns && H.guns.state.owned.gold ? '' : o.label;
  // hotfix: every interactable gets an on-screen button (phones had none for the v35 saloon spots); unknown kinds fall back to USE
  T.TL = { roofsit: 'SIT<small>STOOL</small>', coffee: 'COFFEE<small>15</small>', sars: 'SODA<small>10</small>', armwrestle: 'ARM<small>WRESTLE</small>', telescope: 'LOOK<small>TELESCOPE</small>', tommy: 'TAKE<small>TOMMY GUN</small>', gold: 'TAKE<small>GOLD BUFFALO</small>', shop: 'UPGRADES', drink: 'DRINK', darts: 'PLAY<small>DARTS</small>', checkers: 'PLAY<small>CHECKERS</small>', drawpoker: 'DRAW POKER<small>REAL POINTS</small>', store: 'STORE' };
  T.touchLabel = o => !o ? '' : T.TL[o.kind] || (T.label(o) ? 'USE' : '');
  T.touchText = o => T.touchLabel(o).replace(/<small>/g, ' ').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&');
  T.use = () => { const o = T.nearSpot(); if (!o || !T.label(o)) return false; const g = H.guns; if (T.onUse && T.onUse(o)) { sfx.ui && sfx.ui(); return true; }
    if (o.kind === 'tommy') { g.give('tommy'); g.draw('tommy'); msg('Tommy gun — 100-round drum, full auto (4)', 3); if (o.s.tommyMesh) o.s.tommyMesh.visible = false; }
    else if (o.kind === 'gold') { g.give('gold'); g.draw('gold'); msg('The Golden Buffalo — aim, then scroll / pinch / + − to zoom across the map (5)', 4); if (o.s.goldMesh) o.s.goldMesh.visible = false; }
    else if (o.kind === 'shop') openShop('guns'); else if (o.kind === 'store') openShop('store'); else if (o.kind === 'drink') { if (T.town && o === T.town.roofSpot) { const st = H.stats || (H.stats = {}); st.roofDrinks = (st.roofDrinks || 0) + 1; const n = H.night || 0, day = new Date().toDateString(); if (n > .2 && n < .75 && st.toastDay !== day && H.guns) { st.toastDay = day; H.guns.state.score += 150; H.guns.save && H.guns.save(); setTimeout(() => msg('🌅 A sunset toast on the roof  +150', 3), 1600); } } /* v135 */ drink(); } else if (o.kind === 'roofsit') { if (H.roofSit) { H.roofSit = null; } else { H.roofSit = { x: o.x, z: o.z, y: o.y + .35 }; msg('🪑 You settle onto a stool. Move to get up.', 2.2); } } else if (o.kind === 'coffee' || o.kind === 'sars') { const g = H.guns, c2 = o.kind === 'coffee' ? 15 : 10; if (g.pts() < c2) { msg('Not enough points', 1.4); } else { g.state.spent += c2; save(); if (o.kind === 'coffee') { T.drunk = Math.max(0, T.drunk - 3); msg(T.drunk > 0 ? '☕ Black coffee… the room slows down' : '☕ Clear-headed again', 2); } else { const Z = H.zombies; if (Z) Z.state.hp = Math.min(100, Z.state.hp + 15); msg('🥤 Sarsaparilla — sweet and cold  +15 health', 1.8); } } } else if (o.kind === 'armwrestle') { H.arm && H.arm.open(); } else if (o.kind === 'telescope') { H.telescope = !H.telescope; if (H.telescope) { const st = H.stats || (H.stats = {}); st.scoped = (st.scoped || 0) + 1; H.teleSave = { fp: H.fp }; H.fp = true; P.pitch = .02; msg('🔭 Telescope — look around; walk away or USE to stop', 2.5); } else { H.fp = H.teleSave ? H.teleSave.fp : H.fp; } } else if (o.kind === 'darts') openDarts(); else if (o.kind === 'drawpoker') pk.open(); else if (o.kind === 'checkers') ck.open();
    sfx.ui && sfx.ui(); return true; };
  // show the actual gun models on the desk / in the box (each rider takes their own copy)
  T.dressGuns = models => { const s = T.towers.find(t => t.kind === 'armory'); if (!s || s.tommyMesh) return;
    const tm = models.tommy.group.clone(); tm.visible = true; tm.scale.setScalar(1.2); tm.rotation.set(0, Math.PI / 2, Math.PI / 2); tm.position.set(1.2, 16.86, -1.7); s.g.add(tm); s.tommyMesh = tm;
    const gm = models.gold.group.clone(); gm.visible = true; gm.scale.setScalar(1.15); gm.rotation.set(0, Math.PI / 2, Math.PI / 2); gm.position.set(-1.4, 16.64, -1.8); s.g.add(gm); s.goldMesh = gm;
    if (H.guns.state.owned.tommy) tm.visible = false; if (H.guns.state.owned.gold) gm.visible = false; };

  // ---- shops (touch friendly): gun upgrades + guns for sale at tower 2, the jacket at the general store ----
  const $ = id => document.getElementById(id); let shopEl = null;
  function closeUI() { if (shopEl) shopEl.hidden = true; T.ui = null; H.uiOpen = false; }
  function openShop(which) { if (!shopEl) { shopEl = document.createElement('div'); shopEl.id = 'hrShop'; document.body.appendChild(shopEl); shopEl.addEventListener('pointerdown', e => e.stopPropagation());
      shopEl.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; const a = b.dataset.a, w = b.dataset.w, g = H.guns;
        if (a === 'tab') { T.storeTab = b.dataset.t; render(); return; } if (a === 'x') return closeUI(); if (a === 'buy') g.purchase(w); else if (a === 'up') g.upgrade(w); else if (a === 'jacket') buyJacket(); else if(a==='extra'){const item=T.extraStoreItems?.find(i=>i.state.id===b.dataset.id);if(item)(item.state.owned?item.toggle():item.buy());} else if (a === 'wear') { T.wear = !T.wear; save(); c.jacket && c.jacket(T.wear); } render(); }); }
    T.ui = which; H.uiOpen = true; if (document.pointerLockElement) document.exitPointerLock(); shopEl.hidden = false; render(); }
  function render() { if (!shopEl || shopEl.hidden) return; const g = H.guns, S = g.state, pts = g.pts(), TN = ['', 'BRONZE', 'SILVER', 'GOLD'], cls = ['', 'b', 's', 'g'];
    let h = `<button class="x" data-a="x">✕</button>`;
    if (T.ui === 'guns') { h += `<h3>GUN UPGRADE STATION</h3><div class="pt">${pts} points · zombie kills +10 (headshot +15)</div>`;
      for (const w of ['tommy', 'gold']) if (!S.owned[w]) h += `<div class="row"><span class="nm">${({ tommy: 'Tommy gun · 100-round drum', gold: 'Golden Buffalo · huge zoom' })[w]}</span><button data-a="buy" data-w="${w}" ${pts < g.PRICE[w] ? 'disabled' : ''}>BUY ${g.PRICE[w]}</button></div>`;
      for (const w of ['revolver', 'rifle', 'sniper', 'tommy', 'gold', 'm4', 'mp5', 'shotgun']) { if (!S.owned[w]) continue; const t = g.tier(w); h += `<div class="row"><span class="nm">${({ revolver: 'Six-shooter', rifle: 'Lever rifle', sniper: 'Buffalo rifle', tommy: 'Tommy gun', gold: 'Golden Buffalo', m4: 'M4A1 carbine', mp5: 'MP5', shotgun: 'Coach gun' })[w]} ${t ? '· ' + TN[t] : ''}</span>` +
        (t < 3 ? `<button class="${cls[t + 1]}" data-a="up" data-w="${w}" ${pts < g.UP_COST[w][t] ? 'disabled' : ''}>${TN[t + 1]} ${g.UP_COST[w][t]}</button>` : '<span>MAXED</span>') + '</div>'; }
      h += '<div style="opacity:.7;font-size:12px">Each tier: more damage, a bigger magazine, faster reloads and fire rate.</div>'; }
    else { h += `<h3>GENERAL STORE</h3><div class="pt">${pts} points</div>`;
      /* v41: every gun is sold here too */ const GN = { revolver: 'Six-shooter', rifle: 'Lever rifle', sniper: 'Buffalo rifle', tommy: 'Tommy gun · 100-round drum', gold: 'Golden Buffalo · huge zoom', gatling: 'Gatling gun · hand-crank minigun', shotgun: 'Coach gun · double-barrel 12-gauge, 9 pellets (K)' };
      /* v74: one sorted list - NEW gear first, then what you can still buy (cheapest first), then wear/equip toggles, owned guns last */ const R = [], NEW = { canteen: 1, spurs: 1, apples: 1 };
      for (const w of Object.keys(GN)) { if (!(w in S.owned) && w !== 'gatling') continue; if (w === 'gatling' && !g.models.gatling) continue; const own = !!S.owned[w], pr = (g.PRICE && g.PRICE[w]) || 0;
        R.push({ cat: 'guns', o: own ? 3 : 1, p: pr, h: `<div class="row"><span class="nm">🔫 ${GN[w]}</span>` + (own ? '<span>OWNED</span>' : `<button data-a="buy" data-w="${w}" ${pts < pr ? 'disabled' : ''}>BUY ${pr}</button>`) + '</div>' }); }
      R.push({ cat: 'gear', o: T.jacket ? 2 : 1, p: TOWN_PRICES.jacket, h: `<div class="row"><span class="nm">Black windbreaker · HORSE RIDER on the back</span>` + (T.jacket ? `<button data-a="wear">${T.wear ? 'TAKE OFF' : 'WEAR'}</button>` : `<button data-a="jacket" ${pts < TOWN_PRICES.jacket ? 'disabled' : ''}>BUY ${TOWN_PRICES.jacket}</button>`) + '</div>' });
      for (const item of T.extraStoreItems || []) { const i = item.state, name = String(i.name).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])), nw = (NEW[i.id] || /^(camo|breed|hat)-/.test(i.id)) && !i.owned;
        const cat = /^(camo-|dual|m4|mp5|shotgun|tommy|dyn|gold)/.test(i.id) || /🔫|🧨|🎨|🏅/.test(i.name) ? 'guns' : /^(breed-|hname|apples|stable|coat|barn|garden|deed)/.test(i.id) || /🐎|🐴|🍎|Thoroughbred|Endurance|Barding|Coat/.test(i.name) ? 'horse' : /ranch|Ranch|🏚|🥕|🌾/.test(i.id + i.name) ? 'ranch' : 'gear';
        R.push({ cat, o: nw ? 0 : i.owned ? (i.maxed ? 3 : 2) : 1, p: i.price || 0, h: `<div class="row"><span class="nm">${nw ? '<b style="color:#ffd34a">NEW</b> ' : ''}${name}</span><button data-a="extra" data-id="${i.id}" ${i.maxed || (!i.owned && pts < i.price) ? 'disabled' : ''}>${i.label ? i.label : i.maxed ? 'MAXED' : i.owned ? (i.equipped ? 'REMOVE' : 'EQUIP') : 'BUY ' + i.price}</button></div>` }); }
      R.sort((a, b) => a.o - b.o || a.p - b.p); const TABS = [['all', 'All'], ['guns', '🔫 Guns'], ['horse', '🐎 Horse'], ['gear', '🎒 Gear'], ['ranch', '🏠 Ranch']], tab = T.storeTab || 'all';
      h += `<div class="tabs" style="display:flex;gap:4px;flex-wrap:wrap;margin:4px 0 6px;position:sticky;top:34px;z-index:4;background:inherit">${TABS.map(([k, l]) => `<button data-a="tab" data-t="${k}" style="padding:5px 9px;font-size:12px;border-radius:14px;${k === tab ? 'background:#ffd34a;color:#2a1d12' : ''}">${l}</button>`).join('')}</div>`;
      h += R.filter(r => tab === 'all' || (r.cat || 'gear') === tab).map(r => r.h).join(''); } /* v164 store tabs */
    shopEl.innerHTML = h; }
  function buyJacket() { const g = H.guns; if (T.jacket) return; if (g.pts() < TOWN_PRICES.jacket) { msg('Not enough points', 1.5); return; } g.state.spent += TOWN_PRICES.jacket; T.jacket = true; T.wear = true; save(); c.jacket && c.jacket(true); msg('Black HORSE RIDER windbreaker — looking sharp', 3); }
  T.save = () => save();
  function save() { try { localStorage.setItem('hr_v33_town', JSON.stringify({ jacket: !!T.jacket, wear: !!T.wear })); if (H.guns) H.guns.save && H.guns.save(); } catch (_) {} }
  try { const sv = JSON.parse(localStorage.getItem('hr_v33_town') || sessionStorage.getItem('hr_v33_town') || 'null'); if (sv) { T.jacket = !!sv.jacket; T.wear = !!sv.wear; } } catch (_) {}
  addEventListener('keydown', e => { if (e.code === 'Escape' && T.ui) closeUI(); });

  // ---- drinks: the more you drink the worse it gets; it wears off slowly (each drink adds time) ----
  function drink() { const g = H.guns; if (g.pts() < TOWN_PRICES.drink) { msg('A whiskey is ' + TOWN_PRICES.drink + ' points', 1.5); return; } g.state.spent += TOWN_PRICES.drink; save();
    T.drinks++; T.drunk += 1; msg(T.drunk < 2 ? 'Whiskey. Smooth.' : T.drunk < 4 ? 'Another one… the room is moving' : T.drunk < 6 ? 'You are properly drunk' : T.drunk < 8 ? 'You can barely walk straight' : T.drunk < 11 ? 'Everything is spinning… three of everything' : T.drunk < 13 ? 'Barkeep: "Last one, partner."' : 'Too much…', 2); if (sfx.tone && sfx.ctx) sfx.tone('sine', 300, 180, .2, .2); }
  T.tick = dt => { if (T.passT > 0) { T.passT -= dt; T.black = Math.min(1, (T.black || 0) + dt * 1.5); if (T.passT <= 0) wake(); }
    else { T.black = Math.max(0, (T.black || 0) - dt * .5); if (T.drunk >= T.PASS && !H.mounted) passOut(); }
    T.drunk = Math.max(0, T.drunk - dt / 75); // 75 s per drink: three drinks stay with you ~3.75 minutes, it stacks
    ck.tick(dt); pk.tick(dt);
    if (T.drunk > 1.2 && (T.hicT = (T.hicT || 3) - dt) <= 0) { T.hicT = 2 + Math.random() * Math.max(1.5, 9 - T.drunk); T.hic = .25; if (sfx.tone && sfx.ctx) { sfx.tone('square', 520, 260, .06, .06); sfx.tone('sine', 260, 180, .1, .08); } }
    T.hic = Math.max(0, (T.hic || 0) - dt); let bl = $('hrBlack'); if (!bl) { bl = document.createElement('div'); bl.id = 'hrBlack'; bl.style.cssText = 'position:fixed;inset:0;background:#000;pointer-events:none;z-index:39;opacity:0'; document.body.appendChild(bl); } bl.style.opacity = (T.black || 0).toFixed(2);
    if (T.dart || (dEl && !dEl.hidden)) dartTick(dt); for (const W of T.npcs) if (Math.hypot(W.m.position.x - camera.position.x, W.m.position.z - camera.position.z) < 60) W.update(dt, 0); };
  function passOut() { T.passT = 5; T.passes = (T.passes || 0) + 1; msg('You passed out…', 4); if (H.guns) H.guns.holster(); closeUI(); }
  function wake() { const s = T.town; if (s) { const [x, z] = toW(s, -6, -4.2); P.pos.set(x, T.floorAt(x, z, 1e9), z); } T.drunk = 3.2; msg('You wake up outside the saloon. Your head is pounding.', 4); }
  T.npcs = []; T.dressNPC = mk => { if (T.npcs.length || !T.npcAt) return; for (const [[x, z], y, rot] of T.npcAt) { const W = mk(); if (!W) return; W.m.position.set(x, y, z); W.m.rotation.y = rot + Math.PI; scene.add(W.m); W.start && W.start(); T.npcs.push(W); } };
  T.level = () => T.drunk; T.PASS = 14; // 0 sober .. 14+ (passes out; v34 raised from 8)

  // ---- darts: 301 against the bartender (skill varies) or another rider (host-authoritative over the co-op link) ----
  let dEl = null, cv = null, ctx2 = null; const D = { aim: [0, 0], ptr: [0, 0], t: 0, flying: null };
  function openDarts(game) { if (!dEl) { dEl = document.createElement('div'); dEl.id = 'hrDarts'; dEl.innerHTML = '<canvas width="360" height="360"></canvas><div class="sb"></div><div class="bt"><button data-a="ai">VS BARTENDER</button><span class="pv"></span><button data-a="x">EXIT</button></div>'; document.body.appendChild(dEl);
      cv = dEl.querySelector('canvas'); ctx2 = cv.getContext('2d'); const pos = e => { const r = cv.getBoundingClientRect(); return [((e.clientX - r.left) / r.width - .5) * 2 * 200, -((e.clientY - r.top) / r.height - .5) * 2 * 200]; };
      cv.addEventListener('pointermove', e => { D.ptr = pos(e); }); cv.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); D.ptr = pos(e); D.hold = true; });
      cv.addEventListener('pointerup', e => { e.preventDefault(); if (D.hold) throwDart(); D.hold = false; });
      dEl.addEventListener('pointerdown', e => e.stopPropagation()); dEl.querySelector('.bt').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.a === 'x') { if (T.dart && T.dart.who.includes(me())) netOut({ a: 'q' }); closeDarts(); } else if (b.dataset.a === 'ai') netOut({ a: 'ai' }); else if (b.dataset.a === 'pv') netOut({ a: 'ch', to: b.dataset.id }); }); }
    T.ui = 'darts'; H.uiOpen = true; if (document.pointerLockElement) document.exitPointerLock(); dEl.hidden = false; if (game) T.dart = game; dartUI(); }
  function closeDarts() { if (dEl) dEl.hidden = true; T.ui = null; H.uiOpen = false; }
  const me = () => H.me || 'P1', role = () => H.netRole ? H.netRole() : 'solo', isAuth = () => role() !== 'client';
  function sway() { const k = 1 + T.drunk * .9 + T.drunk * T.drunk * .12, t = D.t; return [Math.sin(t * 1.3) * 9 * k + Math.sin(t * 3.1 + 1) * 4 * k, Math.sin(t * 1.7 + .6) * 8 * k + Math.cos(t * 2.6) * 4 * k]; }
  T.dartSway = () => { const s = sway(); return Math.hypot(...s); };
  function throwDart() { const G = T.dart; if (!G || G.win >= 0 || G.who[G.turn] !== me()) return; const [sx, sy] = sway(); const x = D.ptr[0] + sx + (Math.random() - .5) * 8, y = D.ptr[1] + sy + (Math.random() - .5) * 8; netOut({ a: 'th', x: +x.toFixed(1), y: +y.toFixed(1) }); }
  // authority: the host (or a solo player) runs every match
  const games = new Map(); T.games = games;
  const pk = T.pk = H.poker = createPoker({ H, msg, sfx, send: m => c.send && c.send(m), scene, camera, P, mobile, town: () => T.town, toW, walls: T.walls });
  const ck = T.ck = createCheckers({ H, msg, sfx, send: m => c.send && c.send(m), level: () => T.drunk, spot: () => T.town.ckSpot });
  function netOut(m) { if (isAuth()) netIn(m, me()); else c.send && c.send({ t: 'dt', ...m }); }
  function bcast(G) { const st = { t: 'dts', g: G }; if (c.send && role() === 'host') c.send(st); netState(st); }
  function netIn(m, from) { if (!m || !from) return; let G = [...games.values()].find(g => g.who.includes(from) && g.win < 0);
    if (m.a === 'ai') { if (G) games.delete(G.id); G = newGame(from, 'BARKEEP'); G.skill = 14 + Math.random() * 22; games.set(G.id, G); bcast(G); return; }
    if (m.a === 'ch' && typeof m.to === 'string') { if (G) games.delete(G.id); G = newGame(from, m.to.slice(0, 4)); games.set(G.id, G); bcast(G); return; }
    if (!G) return; if (m.a === 'q') { G.win = -2; games.delete(G.id); bcast(G); return; }
    if (m.a === 'th' && G.who[G.turn] === from && Number.isFinite(m.x) && Number.isFinite(m.y)) { const r = dartScore(Math.max(-400, Math.min(400, m.x)), Math.max(-400, Math.min(400, m.y))); G.last = { x: m.x, y: m.y, ...r, p: G.turn }; G.bust = false; applyDart(G, r.pts); bcast(G); if (G.win >= 0) games.delete(G.id); } }
  function netState(m) { const G = m && m.g; if (!G || !Array.isArray(G.who)) return; if (G.who.includes(me())) { if (G.win === -2) { if (T.dart && T.dart.id === G.id) { T.dart = null; msg('Darts: match over', 1.5); } dartUI(); return; } T.dart = G; if (!dEl || dEl.hidden) openDarts(G); dartUI(); if (G.last) D.flying = { ...G.last, t: .35 }; } }
  T.netIn = netIn; T.netState = netState; T.dartSend = netOut;
  function dartTick(dt) { D.t += dt; const G = T.dart; if (isAuth() && G && G.win < 0 && G.who[G.turn] === 'BARKEEP' && games.has(G.id)) { G.aiT = (G.aiT || 0) + dt; if (G.aiT > 1.1) { G.aiT = 0; const [ax, ay] = aiTarget(G.s[G.turn]), gau = () => { let u = 0; for (let i = 0; i < 4; i++) u += Math.random() - .5; return u * 1.2; };
      const x = ax + gau() * G.skill, y = ay + gau() * G.skill, r = dartScore(x, y); G.last = { x, y, ...r, p: G.turn }; G.bust = false; applyDart(G, r.pts); bcast(G); if (G.win >= 0) games.delete(G.id); } }
    if (D.flying) D.flying.t -= dt; drawBoard(); }
  function dartUI() { if (!dEl || dEl.hidden) return; const G = T.dart, sb = dEl.querySelector('.sb'), pv = dEl.querySelector('.pv');
    if (!G) sb.innerHTML = '301 · three darts a turn · finish on exactly 0 (going under busts the turn)'; else { const nm = i => G.who[i] === me() ? 'YOU' : G.who[i]; sb.innerHTML = `${nm(0)} <b>${G.s[0]}</b> · ${nm(1)} <b>${G.s[1]}</b> · ` + (G.win >= 0 ? `<b>${nm(G.win)} WIN${G.who[G.win] === me() ? '!' : 'S'}</b>` : `${nm(G.turn)} to throw (${3 - G.darts} left)${G.bust ? ' · BUST' : ''}${G.last ? ' · last ' + G.last.label : ''}`); }
    const near = (H.netRemotes ? H.netRemotes() : []).filter(r => r.s && T.town && Math.hypot(r.s.x - T.dartSpot().x, r.s.z - T.dartSpot().z) < 12); pv.innerHTML = near.map(r => `<button data-a="pv" data-id="${r.id}">VS ${r.id}</button>`).join(''); }
  T.dartSpot = () => T.town.dartSpot;
  function drawBoard() { if (!ctx2 || dEl.hidden) return; const x = ctx2, W = 360, c0 = W / 2, k = (W / 2) / 200; x.fillStyle = '#2a1a10'; x.fillRect(0, 0, W, W); if (!T.boardImg) T.boardImg = dartTex().image; x.drawImage(T.boardImg, c0 - 170 * k, c0 - 170 * k, 340 * k, 340 * k);
    const nums = ORDER; x.fillStyle = '#f1dfb0'; x.font = 'bold 13px system-ui'; x.textAlign = 'center'; x.textBaseline = 'middle'; nums.forEach((n, i) => { const a = i * 18 * Math.PI / 180; x.fillText(n, c0 + Math.sin(a) * 185 * k, c0 - Math.cos(a) * 185 * k); });
    const G = T.dart; if (G && G.win < 0 && G.who[G.turn] === me()) { const [sx, sy] = sway(), rx = c0 + (D.ptr[0] + sx) * k, ry = c0 - (D.ptr[1] + sy) * k; x.strokeStyle = '#7dff8a'; x.lineWidth = 2; x.beginPath(); x.arc(rx, ry, 9, 0, TAU); x.moveTo(rx - 14, ry); x.lineTo(rx + 14, ry); x.moveTo(rx, ry - 14); x.lineTo(rx, ry + 14); x.stroke(); }
    if (G) for (const l of G.log.slice(-3)) {} if (G && G.last) { const lx = c0 + G.last.x * k, ly = c0 - G.last.y * k; x.fillStyle = '#ffd34a'; x.beginPath(); x.arc(lx, ly, 4, 0, TAU); x.fill(); x.fillStyle = '#fff'; x.font = 'bold 15px system-ui'; x.fillText(G.last.label, lx, ly - 14); } dartUI(); }
  T.extraStoreItems=[];T.registerStoreItem=item=>{if(!item?.state||!/^[-a-z0-9_]+$/.test(item.state.id)||typeof item.buy!=='function'||typeof item.toggle!=='function')throw new TypeError('Invalid store item');if(!T.extraStoreItems.some(i=>i.state.id===item.state.id))T.extraStoreItems.push(item);render();return item;};
  T.buyJacket = buyJacket; T.dartScore = dartScore; T.applyDart = applyDart; T.newGame = newGame; T.toW = toW; T.toL = toL;
  T.openDarts = openDarts; T.openShop = openShop; T.closeUI = () => { closeUI(); closeDarts(); ck.close(); pk.close(); }; T.ckNew = ckNew; T.ckMoves = ckMoves; T.ckApply = ckApply; T.ckAI = ckAI; T.D = D;

  // ---- build: towers at the two trail tops furthest apart, the town on flat meadow ground ----
  T.build = (sites) => { for (const [x, z, k, r] of sites.towers) tower(x, z, k, r || 0); if (sites.town) town(...sites.town); return T; };
  return T;
}

// v42 jacket: a FITTED windbreaker skinned to the rider's own skeleton. The rider's body mesh is copied, every triangle on the
// torso / shoulders / arms (down to the wrists, down to the belt) is kept, pushed out along its normals and re-bound to the same
// skeleton, so it moves and bends with the rider instead of floating as stiff tubes. One atlas texture: the back print
// (HORSE RIDER on charcoal with a gold stripe), the front (zipper, chest badge, pocket seams), plain fabric for sides and sleeves.
let JK = null;
function jacketMats() { if (JK) return JK;
  const c = document.createElement('canvas'); c.width = 1024; c.height = 768; const x = c.getContext('2d'); x.clearRect(0, 0, 1024, 768);
  x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = '900 250px Impact,"Arial Black","Helvetica Neue",sans-serif'; x.lineJoin = 'round';
  for (const [t, y] of [['HORSE', 236], ['RIDER', 530]]) { x.lineWidth = 18; x.strokeStyle = '#0c0d0f'; x.strokeText(t, 512, y); x.fillStyle = '#ffffff'; x.fillText(t, 512, y); }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 16; tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter;
  JK = { mat: new THREE.MeshStandardMaterial({ color: 0x0c0d0f, roughness: .55, metalness: 0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
    print: new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: .35, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4, depthWrite: false }) }; JK.print.defines = { STY_SHARP: '' }; return JK; } // crisp: no painterly blur, unlit white
const JACKET_BONES = ['Spine', 'Spine01', 'Spine02', 'LeftShoulder', 'RightShoulder', 'LeftArm', 'RightArm', 'LeftForeArm', 'RightForeArm', 'neck', 'Hips'];
export function townNight(n) { if (typeof window !== 'undefined' && window.__hrH && window.__hrH.palisade) window.__hrH.palisade.lamps.emissiveIntensity = 1.4 + 3 * n; if (!MATS) return; MATS.lamp.emissiveIntensity = 1.6 + 3.4 * n; if (MATS.lamp.isMeshBasicMaterial) { const k = Math.min(1, n * 1.6); MATS.lamp.color.setRGB(.55 + .45 * k, .5 + .38 * k, .4 + .2 * k); } /* v157: bulbs and lanterns look unlit by day, glow at night */ // v47: lanterns and windows glow after dark
  if (MATS.glass) { if (!MATS.glass.userData.n0) { MATS.glass.userData.n0 = true; MATS.glass.emissive = new THREE.Color(0xffa64a); } MATS.glass.emissiveIntensity = 1.5 * n; } }
export function wearJacket(root, on) { if (!root || !root.userData) return false; if (root.userData.skin) on = false; // v36: Frontier characters wear their own coats
  if (root.userData.jacket) { for (const m of root.userData.jacket) m.visible = !!on; return true; } if (!on) return true;
  let body = null; root.traverse(o => { if (o.isSkinnedMesh && (!body || o.geometry.attributes.position.count > body.geometry.attributes.position.count)) body = o; }); if (!body) return false;
  const sk = body.skeleton, G = body.geometry, pos = G.attributes.position, nor = G.attributes.normal, si = G.attributes.skinIndex, sw = G.attributes.skinWeight; if (!nor || !si || !sw) return false;
  const idx = n => sk.bones.findIndex(b => b.name === n), armB = new Set(['LeftArm', 'RightArm', 'LeftForeArm', 'RightForeArm', 'LeftShoulder', 'RightShoulder'].map(idx)), want = new Set(JACKET_BONES.map(idx).filter(i => i >= 0)), iH = idx('Hips'), iN = idx('neck'), iHand = [idx('LeftHand'), idx('RightHand')];
  const bindPos = i => new THREE.Vector3().setFromMatrixPosition(new THREE.Matrix4().copy(sk.boneInverses[i]).invert());
  const hipY = iH >= 0 ? bindPos(iH).y : -1e9, neckY = iN >= 0 ? bindPos(iN).y : 1e9;
  // per-vertex: share of weight on jacket bones (hips only above the belt, neck only near the collar)
  const n = pos.count, keepV = new Float32Array(n), P = new THREE.Vector3();
  for (let v = 0; v < n; v++) { P.fromBufferAttribute(pos, v); let w = 0, hand = 0;
    for (let k = 0; k < 4; k++) { const b = si.getComponent(v, k), ww = sw.getComponent(v, k); if (iHand.includes(b)) hand += ww; if (!want.has(b)) continue; if (b === iH && P.y < hipY + (neckY - hipY) * .02) continue; if (b === iN && P.y > neckY + (neckY - hipY) * .05) continue; w += ww; }
    keepV[v] = hand > .3 ? 0 : w; }
  const index = G.index ? G.index.array : Array.from({ length: n }, (_, i) => i), tri = [];
  for (let t = 0; t < index.length; t += 3) { const a = index[t], b = index[t + 1], c = index[t + 2]; if (keepV[a] + keepV[b] + keepV[c] > 1.1 && Math.min(keepV[a], keepV[b], keepV[c]) > .15) tri.push(a, b, c); }
  if (tri.length < 60) return false;
  // bounds of the kept torso (bind space) for the print projection
  const armW = v => { let a = 0; for (let k = 0; k < 4; k++) { const b = si.getComponent(v, k); if (['LeftArm', 'RightArm', 'LeftForeArm', 'RightForeArm', 'LeftShoulder', 'RightShoulder'].map(idx).includes(b)) a += sw.getComponent(v, k); } return a; };
  const box = new THREE.Box3(); for (const v of tri) if (armW(v) < .3) box.expandByPoint(P.fromBufferAttribute(pos, v)); const cx = (box.min.x + box.max.x) / 2, W = box.max.x - box.min.x, y0 = Math.max(box.min.y, hipY - .05), H = Math.min(box.max.y, neckY) - y0;
  const used = [...new Set(tri)], remap = new Map(used.map((v, i) => [v, i])), m = used.length, nP = new Float32Array(m * 3), nN = new Float32Array(m * 3), nUV = new Float32Array(m * 2), nSI = new Uint16Array(m * 4), nSW = new Float32Array(m * 4), N = new THREE.Vector3();
  // weld: vertices that share a position push out along the SAME averaged normal, so seams never crack open
  const keyOf = v => { P.fromBufferAttribute(pos, v); return Math.round(P.x * 2000) + ',' + Math.round(P.y * 2000) + ',' + Math.round(P.z * 2000); }, avgN = new Map();
  for (const v of used) { const k = keyOf(v), a = avgN.get(k) || new THREE.Vector3(); a.add(N.fromBufferAttribute(nor, v)); avgN.set(k, a); } for (const a of avgN.values()) a.normalize();
  used.forEach((v, i) => { const wk = keyOf(v); P.fromBufferAttribute(pos, v); N.copy(avgN.get(wk)); let arm = 0; for (let k = 0; k < 4; k++) if (armB.has(si.getComponent(v, k))) arm += sw.getComponent(v, k); const armish = arm > .45, push = armish ? .03 : .045 + .012 * Math.max(0, (P.y - y0) / H - .75);
    nP.set([P.x + N.x * push, P.y + N.y * push, P.z + N.z * push], i * 3); nN.set([N.x, N.y, N.z], i * 3);
    const uu = (P.x - cx) / (W * .95) + .5, vv = .06 + .9 * (P.y - y0) / H; let u, w;
    if (armish) { u = .52; w = .05; } else if (N.z < -.15) { u = Math.min(.98, Math.max(.02, uu)) * .5; w = vv; } else if (N.z > .15) { u = .5 + Math.min(.99, Math.max(.01, uu)) * .5; w = vv; } else { u = .52; w = .05; }
    nUV.set([u, Math.min(.99, Math.max(.01, w))], i * 2); for (let k = 0; k < 4; k++) { nSI[i * 4 + k] = si.getComponent(v, k); nSW[i * 4 + k] = sw.getComponent(v, k); } });
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(nP, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nN, 3)); g.setAttribute('uv', new THREE.BufferAttribute(nUV, 2));
  g.setAttribute('skinIndex', new THREE.BufferAttribute(nSI, 4)); g.setAttribute('skinWeight', new THREE.BufferAttribute(nSW, 4)); g.setIndex(tri.map(v => remap.get(v))); g.computeBoundingSphere();
  const J = jacketMats(), jm = new THREE.SkinnedMesh(g, J.mat); jm.name = 'HR jacket'; jm.castShadow = true; jm.frustumCulled = false;
  jm.position.copy(body.position); jm.quaternion.copy(body.quaternion); jm.scale.copy(body.scale); body.parent.add(jm); jm.bind(sk, body.bindMatrix);
  // white HORSE RIDER on the back: a patch on the upper spine, just outside the shell, facing away from the rider's front
  const parts = [jm]; try { root.updateMatrixWorld(true); const bp = n => { const b = sk.bones.find(o => o.name === n); return b ? b.getWorldPosition(new THREE.Vector3()) : null; };
    const hips = bp('Hips'), neck = bp('neck') || bp('Neck'), la = bp('LeftArm'), ra = bp('RightArm'), sp = sk.bones.find(o => o.name === 'Spine01') || sk.bones.find(o => o.name === 'Spine');
    if (hips && neck && la && ra && sp) { const up = neck.clone().sub(hips).normalize(), rt = ra.clone().sub(la), sw = rt.length(); rt.normalize(); let back = new THREE.Vector3().crossVectors(up, rt).normalize();
      const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(root.getWorldQuaternion(new THREE.Quaternion())); if (back.dot(fwd) > 0) back.negate();
      // depth of the torso along the back direction: furthest shell vertex behind the spine line
      const mid = hips.clone().lerp(neck, .6); let depth = .1; const wp = new THREE.Vector3(); jm.updateMatrixWorld(true);
      for (let i = 0; i < nP.length; i += 9) { wp.set(nP[i], nP[i + 1], nP[i + 2]).applyMatrix4(jm.matrixWorld); const d = wp.clone().sub(mid); if (Math.abs(d.dot(rt)) < sw * .2 && Math.abs(d.dot(up)) < .08) depth = Math.max(depth, d.dot(back)); }
      depth = Math.max(depth, sw * .62); const w = sw * .78, pl = new THREE.Mesh(new THREE.PlaneGeometry(w, w * .75), J.print); pl.position.copy(mid).addScaledVector(back, depth + .02);
      pl.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(rt.clone().negate(), up, back)); pl.renderOrder = 2; sp.attach(pl); parts.push(pl); } } catch (_) {}
  for (const q of parts) q.traverse(o => { o.userData.jacket = true; }); root.userData.jacket = parts; return true; }
