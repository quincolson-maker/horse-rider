// v220 CHINATOWN: a walled-off district of four square blocks on the flat south of the pen, built on a stone platform the
// trail runs straight through. Sixteen two-storey shophouses (brick and plaster fronts, carved balconies, green glazed eaves,
// vertical signboards), each fully walkable: a shop floor with its own fittings, an inside stair to the upper rooms, a second
// stair up through a roof hatch to a parapeted roof deck (some with a rooftop pavilion). Paifang gates on the trail, lantern
// strings over the streets, a joss house, a theatre, a tea house and more - with things to do inside.
// Everything is built as boxes in each building's local frame and merged per material over the whole district (a dozen draw
// calls), distance-culled, and registered with the town's walk / wall system (floors + height-aware walls).
import * as THREE from 'three';
import { mergeGeometries } from '../addons/utils/BufferGeometryUtils.js?v=237';
import { makeFrontierCharacter, poseFrontierCharacter } from './hrcharacters.js?v=237';
import { mergeStatic } from './hrmerge.js?v=237';

export const CT = { x: -22, z: 92, hw: 40, hd: 40 }; // footprint (also keeps trees and rocks out)
export const ctAvoid = (x, z) => Math.abs(x - CT.x) < CT.hw + 4 && Math.abs(z - CT.z) < CT.hd + 10;

function tex(w, h, draw, rep = true) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; if (rep) t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t; }
const rnd = (() => { let s = 7331; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();

// the businesses: Chinese name (traditional), English plaque, interior kind, facade colour
const SHOPS = [
  ['茶樓', 'TEA HOUSE', 'tea', 0x2f5d50], ['藥材行', 'HERBALIST', 'herb', 0x7a2a1e], ['雜貨', 'GENERAL GOODS', 'goods', 0x8a6a3a], ['餅家', 'BAKERY', 'bakery', 0xb8862e],
  ['麵館', 'NOODLE HOUSE', 'noodle', 0x9a3324], ['會館', 'ASSOCIATION HALL', 'hall', 0x3d4f6b], ['廟', 'JOSS HOUSE', 'temple', 0xa3201a], ['炮竹', 'FIREWORKS', 'fire', 0xc0392b],
  ['裁縫', 'TAILOR', 'tailor', 0x52606d], ['金舖', 'GOLDSMITH', 'gold', 0x6b4a2a], ['書局', 'BOOKSELLER', 'books', 0x40573c], ['戲院', 'THEATRE', 'theatre', 0x6e1f2a],
  ['酒家', 'RESTAURANT', 'noodle', 0x8c2f1f], ['醫館', 'DOCTOR', 'herb', 0x456a74], ['印務', 'PRINT SHOP', 'books', 0x5d4b3a], ['米舖', 'RICE MERCHANT', 'goods', 0x7d6a45]];

export function createChinatown({ scene, H, P, T, hAt, msg, sfx, mobile, fx }) {
  const { x: CX, z: CZ } = CT;
  // ---------- materials ----------
  const brickT = tex(256, 256, (x, w, h) => { x.fillStyle = '#5a2a1e'; x.fillRect(0, 0, w, h); for (let r = 0; r < 16; r++) for (let c = 0; c < 8; c++) { const o = r % 2 ? 16 : 0; x.fillStyle = `hsl(${8 + rnd() * 10},${38 + rnd() * 14}%,${27 + rnd() * 12}%)`; x.fillRect(c * 32 + o + 1, r * 16 + 1, 30, 14); } });
  const woodT = tex(256, 256, (x, w, h) => { for (let i = 0; i < 8; i++) { x.fillStyle = `hsl(25,${32 + rnd() * 10}%,${18 + rnd() * 9}%)`; x.fillRect(0, i * 32, w, 31); x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(0, i * 32 + 31, w, 1); } for (let k = 0; k < 300; k++) { x.fillStyle = 'rgba(0,0,0,.08)'; x.fillRect(rnd() * w, rnd() * h, 20 + rnd() * 40, 1); } });
  const tileT = tex(128, 128, (x, w, h) => { x.fillStyle = '#1f5a3c'; x.fillRect(0, 0, w, h); for (let i = 0; i < 8; i++) { const g = x.createLinearGradient(i * 16, 0, i * 16 + 16, 0); g.addColorStop(0, '#174a30'); g.addColorStop(.5, '#3f9a68'); g.addColorStop(1, '#174a30'); x.fillStyle = g; x.fillRect(i * 16, 0, 16, h); } for (let j = 0; j < 8; j++) { x.fillStyle = 'rgba(0,0,0,.3)'; x.fillRect(0, j * 16 + 14, w, 2); } });
  const stoneT = tex(256, 256, (x, w, h) => { x.fillStyle = '#77736b'; x.fillRect(0, 0, w, h); for (let r = 0; r < 8; r++) for (let c = 0; c < 4; c++) { const o = r % 2 ? 32 : 0; x.fillStyle = `hsl(35,${6 + rnd() * 6}%,${40 + rnd() * 14}%)`; x.fillRect(c * 64 + o + 2, r * 32 + 2, 60, 28); } });
  const cobT = tex(256, 256, (x, w, h) => { x.fillStyle = '#4a4640'; x.fillRect(0, 0, w, h); for (let i = 0; i < 260; i++) { const r = 5 + rnd() * 7; x.fillStyle = `hsl(30,${5 + rnd() * 8}%,${34 + rnd() * 18}%)`; x.beginPath(); x.ellipse(rnd() * w, rnd() * h, r, r * .8, rnd() * 3, 0, 7); x.fill(); } });
  const plankT = tex(256, 256, (x, w, h) => { for (let i = 0; i < 16; i++) { x.fillStyle = `hsl(28,${35 + rnd() * 10}%,${30 + rnd() * 10}%)`; x.fillRect(0, i * 16, w, 15); x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(0, i * 16 + 15, w, 1); } });
  const std = (o) => new THREE.MeshStandardMaterial(Object.assign({ roughness: .9 }, o));
  const M = {
    brick: std({ map: brickT }), wood: std({ map: woodT }), plank: std({ map: plankT, roughness: .8 }), tile: std({ map: tileT, roughness: .45, metalness: .1 }), stone: std({ map: stoneT }), cobble: std({ map: cobT, roughness: 1 }),
    red: std({ color: 0xa3201a, roughness: .5 }), gold: std({ color: 0xd4a640, roughness: .35, metalness: .6 }), dark: std({ color: 0x2a211b }), cream: std({ color: 0xe6dcc4 }), white: std({ color: 0xd8d2c4 }),
    glass: std({ color: 0x2a2620, emissive: 0xffc070, emissiveIntensity: .3, roughness: .2 }), lamp: new THREE.MeshStandardMaterial({ color: 0xc8281e, emissive: 0xff3a1a, emissiveIntensity: .6, roughness: .6 }),
    paper: std({ color: 0xf0e2c0, emissive: 0xffd890, emissiveIntensity: .2 }), green: std({ color: 0x2f5d50 }), black: std({ color: 0x15120f, roughness: .6 }), jade: std({ color: 0x5c9a7c, roughness: .4 }) };
  /* v236: every painted colour shares ONE vertex-coloured material (was one material per colour - 16 fewer draw calls) */
  M.facade = std({ vertexColors: true, roughness: .85 }); const facade = new Map(); const fmat = col => facade.get(col) || facade.set(col, { isFacade: true, col: new THREE.Color(col) }).get(col);
  // signboards: one atlas (16 vertical boards + plaques)
  const ATW = 1024, ATH = 1024, atlas = tex(ATW, ATH, (x) => { x.fillStyle = '#000'; x.fillRect(0, 0, ATW, ATH);
    SHOPS.forEach(([cn, en], i) => { const cx = (i % 8) * 128, cy = Math.floor(i / 8) * 400; // vertical board 128 x 400
      x.fillStyle = i % 3 === 0 ? '#1d1a16' : i % 3 === 1 ? '#7a1c14' : '#163a2a'; x.fillRect(cx + 4, cy + 4, 120, 392); x.strokeStyle = '#d4a640'; x.lineWidth = 6; x.strokeRect(cx + 10, cy + 10, 108, 380);
      x.fillStyle = '#e8c060'; x.textAlign = 'center'; const n = [...cn].length, fs = n >= 3 ? 92 : 108; x.font = `900 ${fs}px "Noto Serif TC","Songti TC","PMingLiU","SimSun",serif`; [...cn].forEach((ch, k) => x.fillText(ch, cx + 64, cy + 30 + (k + 1) * (360 / Math.max(2, n)) - (360 / Math.max(2, n) - fs) / 2));
      // english plaque 256 x 56 below
      const px = (i % 4) * 256, py = 800 + Math.floor(i / 4) * 56; x.fillStyle = '#efe4c8'; x.fillRect(px + 2, py + 2, 252, 52); x.strokeStyle = '#3a2414'; x.lineWidth = 4; x.strokeRect(px + 6, py + 6, 244, 44); x.fillStyle = '#3a2414'; x.font = 'bold 26px Georgia,serif'; x.fillText(en, px + 128, py + 38); });
  }, false);
  // gate plaque as its own small texture
  const gateT = tex(512, 160, (x, w, h) => { x.fillStyle = '#1d3a2c'; x.fillRect(0, 0, w, h); x.strokeStyle = '#d4a640'; x.lineWidth = 10; x.strokeRect(10, 10, w - 20, h - 20); x.fillStyle = '#e8c060'; x.textAlign = 'center'; x.font = '900 108px "Noto Serif TC","Songti TC","PMingLiU","SimSun",serif'; x.fillText('唐人街', w / 2, 122); }, false);
  const signM = new THREE.MeshStandardMaterial({ map: atlas, roughness: .6, emissive: 0xffffff, emissiveMap: atlas, emissiveIntensity: .05 });
  const gateM = new THREE.MeshStandardMaterial({ map: gateT, roughness: .5, emissive: 0xffffff, emissiveMap: gateT, emissiveIntensity: .08 });

  // ---------- builders ----------
  const GEO = new Map(), GEOI = new Map(); let INQ = null; /* v231: interiors go into per-block groups that are culled when you're not near the block */
  const push = (mat, g) => { if (mat.isFacade) { const n = g.attributes.position.count, c = new Float32Array(n * 3); for (let i = 0; i < n; i++) { c[i * 3] = mat.col.r; c[i * 3 + 1] = mat.col.g; c[i * 3 + 2] = mat.col.b; } g.setAttribute('color', new THREE.BufferAttribute(c, 3)); mat = M.facade; } const G = INQ ? (GEOI.get(INQ) || GEOI.set(INQ, new Map()).get(INQ)) : GEO; (G.get(mat) || G.set(mat, []).get(mat)).push(g); };
  const mkS = (cx, cz, rot, y0, name) => { const s = { cx, cz, rot, y0, c: Math.cos(rot), s: Math.sin(rot), floors: [], R: 0, geo: new Map(), kind: 'chinatown', name }; T.structs.push(s); return s; };
  const toW = (s, x, z) => [s.cx + x * s.c + z * s.s, s.cz - x * s.s + z * s.c];
  const floor = (s, x0, x1, z0, z1, ya, yb = ya, axis = 'x') => { s.floors.push({ x0, x1, z0, z1, ya, yb, axis }); s.R = Math.max(s.R, Math.hypot(Math.max(Math.abs(x0), Math.abs(x1)), Math.max(Math.abs(z0), Math.abs(z1))) + 2); };
  const wall = (s, ax, az, bx, bz, ya, yb) => { const [wx, wz] = toW(s, ax, az), [vx, vz] = toW(s, bx, bz); T.walls.push([wx, wz, vx, vz, s.y0 + ya, s.y0 + yb]); };
  const xf = (s, g) => { g.rotateY(s.rot); g.translate(s.cx, s.y0, s.cz); return g; };
  const box = (s, mat, x, y, z, w, h, d, ry = 0) => { if (w <= 0 || h <= 0 || d <= 0) return; const g = new THREE.BoxGeometry(w, h, d); if (ry) g.rotateY(ry); g.translate(x, y, z); if (mat.map && mat !== signM) { const uv = g.attributes.uv, n = g.attributes.normal; for (let i = 0; i < uv.count; i++) { const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)); const su = ay > .5 ? w : ax > .5 ? d : w, sv = ay > .5 ? d : h; uv.setXY(i, uv.getX(i) * su / 2, uv.getY(i) * sv / 2); } } push(mat, xf(s, g)); };
  const cyl = (s, mat, x, y, z, r, h, n = 10, r2 = r) => { const g = new THREE.CylinderGeometry(r2, r, h, n); g.translate(x, y, z); push(mat, xf(s, g)); };
  const sph = (s, mat, x, y, z, r, sy = 1) => { const g = new THREE.SphereGeometry(r, 10, 7); g.scale(1, sy, 1); g.translate(x, y, z); push(mat, xf(s, g)); };
  const cone = (s, mat, x, y, z, r, h, n = 4, rot = Math.PI / 4) => { const g = new THREE.ConeGeometry(r, h, n); g.rotateY(rot); g.translate(x, y, z); push(mat, xf(s, g)); };
  const plane = (s, mat, x, y, z, w, h, ry, u0, v0, u1, v1) => { const g = new THREE.PlaneGeometry(w, h); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, u0 + (u1 - u0) * uv.getX(i), v0 + (v1 - v0) * uv.getY(i)); g.rotateY(ry); g.translate(x, y, z); push(mat, xf(s, g)); };
  const spots = []; const spot = (s, x, y, z, kind, label, r = 1.7, extra) => { const [wx, wz] = toW(s, x, z), o = Object.assign({ x: wx, z: wz, y: s.y0 + y, kind, label, r, s, ct: true }, extra || {}); T.spots.push(o); spots.push(o); return o; };
  // an upturned eave: a long sloped tile slab with curled ends
  function eave(s, x0, x1, z, y, depth, mat = M.tile) { const L = x1 - x0, mx = (x0 + x1) / 2; const g = new THREE.BoxGeometry(L, .12, depth); g.rotateX(.42); g.translate(mx, y, z - depth / 2 * .9); push(mat, xf(s, g)); box(s, M.red, mx, y - .32, z - .04, L, .14, .14); for (const ex of [x0, x1]) { const t = new THREE.ConeGeometry(.12, .7, 5); t.rotateZ(ex < mx ? .9 : -.9); t.translate(ex + (ex < mx ? -.15 : .15), y + .18, z - depth * .85); push(mat, xf(s, t)); } box(s, M.tile, mx, y + .2, z - .05, L + .2, .16, .22); }

  // ---------- the platform, streets, ring lane ----------
  let y0 = -1e9, ymin = 1e9; for (let i = -CT.hw; i <= CT.hw; i += 4) for (let j = -CT.hd; j <= CT.hd; j += 4) { const h = hAt(CX + i, CZ + j); y0 = Math.max(y0, h); ymin = Math.min(ymin, h); } y0 += .12;
  const D = mkS(CX, CZ, 0, y0, 'district'), E = 36.5;
  floor(D, -E, E, -E, E, 0); box(D, M.cobble, 0, -.15, 0, 2 * E, .3, 2 * E); // street surface
  { const depth = y0 - ymin + .6; for (const [x, z, w, d] of [[0, -E - .3, 2 * E + .6, .6], [0, E + .3, 2 * E + .6, .6], [-E - .3, 0, .6, 2 * E], [E + .3, 0, .6, 2 * E]]) box(D, M.stone, x, -depth / 2, z, w, depth, d); }
  // low boundary wall with gaps for the gates (north / south on the trail, east / west on the cross street)
  for (const sd of [-1, 1]) { for (const [a, b] of [[-E, -5], [5, E]]) { box(D, M.stone, (a + b) / 2, .45, sd * (E + .3), b - a, .9, .5); wall(D, a, sd * (E + .3), b, sd * (E + .3), -2, .9); box(D, M.stone, sd * (E + .3), .45, (a + b) / 2, .5, .9, b - a); wall(D, sd * (E + .3), a, sd * (E + .3), b, -2, .9); } }
  // ramps down to the land at the four gates (low end follows the terrain)
  for (const [dx, dz] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) { const far = E + 8, gx = dx * far, gz = dz * far, gy = hAt(CX + gx, CZ + gz) - y0;
    if (dz) { const z0 = dz > 0 ? E : -far, z1 = dz > 0 ? far : -E; floor(D, -4.5, 4.5, z0, z1, dz > 0 ? 0 : gy, dz > 0 ? gy : 0, 'z'); const g = new THREE.BoxGeometry(9, .3, 8); g.translate(0, -.15, 0); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const zz = p.getZ(i), t = (zz + 4) / 8, k = dz > 0 ? t : 1 - t; p.setY(i, p.getY(i) + gy * k); } g.translate(0, 0, dz * (E + 4)); push(M.stone, xf(D, g)); }
    else { const x0 = dx > 0 ? E : -far, x1 = dx > 0 ? far : -E; floor(D, x0, x1, -4.5, 4.5, dx > 0 ? 0 : gy, dx > 0 ? gy : 0, 'x'); const g = new THREE.BoxGeometry(8, .3, 9); g.translate(0, -.15, 0); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const xx = p.getX(i), t = (xx + 4) / 8, k = dx > 0 ? t : 1 - t; p.setY(i, p.getY(i) + gy * k); } g.translate(dx * (E + 4), 0, 0); push(M.stone, xf(D, g)); } }
  // raised sidewalks (visual curbs) along the avenue and the cross street
  for (const sd of [-1, 1]) { box(D, M.stone, sd * 5.5, .08, 0, 2, .16, 2 * E - 1); box(D, M.stone, 0, .08, sd * 5.5, 2 * E - 1, .16, 2, 0); floor(D, sd * 5.5 - 1, sd * 5.5 + 1, -E + .5, E - .5, .16); floor(D, -E + .5, E - .5, sd * 5.5 - 1, sd * 5.5 + 1, .16); }

  // ---------- paifang gates ----------
  function gate(px, pz, ry) { const s = mkS(CX + px, CZ + pz, ry, y0, 'gate'); for (const sx of [-4.6, 4.6]) { cyl(s, M.red, sx, 3.6, 0, .32, 7.2, 12); box(s, M.stone, sx, .4, 0, 1.1, .8, 1.1); wall(s, sx - .4, 0, sx + .4, 0, -1, 7); wall(s, sx, -.4, sx, .4, -1, 7); }
    for (const sx of [-7.4, 7.4]) { cyl(s, M.red, sx, 2.6, 0, .26, 5.2, 12); box(s, M.stone, sx, .35, 0, .9, .7, .9); }
    box(s, M.red, 0, 6.2, 0, 10.4, .5, .5); box(s, M.gold, 0, 6.5, 0, 10.6, .1, .55); box(s, M.red, 0, 7.4, 0, 9.8, .4, .45); plane(s, gateM, 0, 6.9, -.27, 3.2, 1.0, Math.PI, 0, 0, 1, 1); plane(s, gateM, 0, 6.9, .27, 3.2, 1.0, 0, 0, 0, 1, 1);
    for (const [y, L, d] of [[8.1, 12.4, 2.6], [5.3, 17.6, 1.8]]) { const g = new THREE.BoxGeometry(L, .16, d); g.translate(0, y, 0); push(M.tile, xf(s, g)); const r2 = new THREE.CylinderGeometry(.18, .18, L + .3, 8); r2.rotateZ(Math.PI / 2); r2.translate(0, y + .2, 0); push(M.tile, xf(s, r2)); for (const ex of [-L / 2, L / 2]) for (const ez of [-d / 2, d / 2]) { const t = new THREE.ConeGeometry(.16, .8, 5); t.rotateZ(ex < 0 ? .8 : -.8); t.translate(ex + (ex < 0 ? -.2 : .2), y + .3, ez); push(M.tile, xf(s, t)); } }
    box(s, M.red, 0, 4.9, 0, 15.2, .35, .4); for (const sx of [-6.0, 6.0]) { box(s, M.cream, sx, 4.4, 0, 2.6, .9, .25); }
    for (const sx of [-6.2, 6.2]) { const lx = sx; sph(s, M.lamp, lx, 4.2, -.6, .32, 1.3); sph(s, M.lamp, lx, 4.2, .6, .32, 1.3); }
    // guardian lions (stylised stone)
    for (const sx of [-3.4, 3.4]) { box(s, M.stone, sx, .45, -1.6, 1.0, .9, 1.0); sph(s, M.stone, sx, 1.25, -1.6, .42, 1.1); sph(s, M.stone, sx, 1.75, -1.75, .34); box(s, M.stone, sx, 1.62, -2.0, .3, .2, .2); wall(s, sx - .5, -2.1, sx + .5, -2.1, -1, 2); wall(s, sx - .5, -1.1, sx + .5, -1.1, -1, 2); wall(s, sx - .5, -2.1, sx - .5, -1.1, -1, 2); wall(s, sx + .5, -2.1, sx + .5, -1.1, -1, 2); } }
  gate(0, -E - .3, Math.PI); gate(0, E + .3, 0); gate(E + .3, 0, Math.PI / 2); gate(-E - .3, 0, -Math.PI / 2); /* v225: east and west gates on the cross street */

  // ---------- shophouses ----------
  const W = 11.5, DP = 10, F0 = .3, F1 = F0 + 3.5, RF = F1 + 3.4;
  const lots = []; for (const qx of [-1, 1]) for (const qz of [-1, 1]) for (const [za, zb] of [[5.25, 16.75], [18.25, 29.75]]) { const z0 = qz > 0 ? za : -zb, z1 = qz > 0 ? zb : -za;
      lots.push({ fx: qx > 0 ? -1 : 1, front: qx * 6.5, z0, z1, ave: true }); lots.push({ fx: qx > 0 ? 1 : -1, front: qx * 28.5, z0, z1, ave: false }); }
  const built = [];
  lots.forEach((L, i) => { const sh = SHOPS[i % SHOPS.length], rot = L.fx < 0 ? Math.PI / 2 : -Math.PI / 2, oz = L.fx < 0 ? L.z1 : L.z0, s = mkS(CX + L.front, CZ + oz, rot, y0, sh[1]); s.shop = sh; s.idx = i; built.push(s); });
  // v225 rooftop bridges: wherever a neighbour's roof is across the gap, the parapet opens and a plank bridge crosses (run a whole block over the rooftops)
  const inFoot = (b, x, z) => { const [lx, lz] = T.toL(b, x, z); return lx > .2 && lx < W - .2 && lz > .2 && lz < DP - .2; };
  const OPEN = { x0: [-2.4, 1.2], xW: [W + 2.4, 1.2], zD: [W / 2, DP + 2.6] };
  for (const b of built) { b.open = {}; for (const k in OPEN) { const [wx, wz] = toW(b, OPEN[k][0], OPEN[k][1]); const nb = built.find(o => o !== b && inFoot(o, wx, wz)); if (nb) b.open[k] = nb; } }
  built.forEach(s => { const [bx, bz] = toW(s, W / 2, DP / 2); s.q = (bx > CX ? 'E' : 'W') + (bz > CZ ? 'S' : 'N'); s.qc = [CX + Math.sign(bx - CX) * 17.5, CZ + Math.sign(bz - CZ) * 17.5]; house(s, s.shop, s.idx, true); });

  function house(s, sh, idx, ave) { const [cn, en, kind, col] = sh, fm = idx % 3 === 0 ? M.brick : fmat(col), tall = kind === 'hall' || kind === 'theatre' || kind === 'temple';
    const mid = W / 2, dw = kind === 'theatre' ? 1.3 : .85, top = tall ? RF + 1.6 : RF;
    // plinth + floors
    box(s, M.stone, mid, F0 / 2, DP / 2, W, F0, DP); floor(s, 0, W, 0, DP, F0); box(s, M.plank, mid, F0 + .01, DP / 2, W - .5, .02, DP - .5);
    // ---- outer walls (visual) ----
    // sides + back: full height to the parapet
    const OA = .6, OB = 1.8, BA = mid - .6, BB = mid + .6, pt = top + 1 - RF;
    box(s, fm, .12, RF / 2, DP / 2, .24, RF, DP); box(s, fm, W - .12, RF / 2, DP / 2, .24, RF, DP); box(s, fm, mid, RF / 2, DP - .12, W, RF, .24);
    wall(s, 0, 0, 0, DP, -1, RF); wall(s, W, 0, W, DP, -1, RF); wall(s, 0, DP, W, DP, -1, RF);
    for (const [k, x] of [['x0', .12], ['xW', W - .12]]) { const segs = s.open[k] ? [[0, OA], [OB, DP]] : [[0, DP]]; for (const [a, b] of segs) { box(s, fm, x, RF + pt / 2, (a + b) / 2, .24, pt, b - a); wall(s, x < 1 ? 0 : W, a, x < 1 ? 0 : W, b, RF, top + 1); } }
    { const segs = s.open.zD ? [[0, BA], [BB, W]] : [[0, W]]; for (const [a, b] of segs) { box(s, fm, (a + b) / 2, RF + pt / 2, DP - .12, b - a, pt, .24); wall(s, a, DP, b, DP, RF, top + 1); } }
    // bridges (built once per pair, from the lower index): planks, rope rails, rail colliders
    for (const k of ['x0', 'xW', 'zD']) { const nb = s.open[k]; if (!nb) continue; if (built.indexOf(nb) < built.indexOf(s) && nb.open && Object.values(nb.open).includes(s)) continue;
      const L2 = k === 'zD' ? 2.3 : 1.8; if (k === 'zD') { floor(s, BA, BB, DP, DP + L2, RF); box(s, M.plank, mid, RF - .05, DP + L2 / 2, 1.2, .1, L2 + .4); for (const x of [BA, BB]) { wall(s, x, DP, x, DP + L2, RF, RF + 1); box(s, M.red, x, RF + .95, DP + L2 / 2, .05, .05, L2 + .4); box(s, M.red, x, RF + .5, DP + L2 / 2, .04, .04, L2 + .4); } for (const z of [DP, DP + L2]) for (const x of [BA, BB]) box(s, M.red, x, RF + .5, z, .08, 1.0, .08); }
      else { const sx = k === 'xW' ? 1 : -1, x0 = k === 'xW' ? W : -L2, x1 = k === 'xW' ? W + L2 : 0; floor(s, x0, x1, OA, OB, RF); box(s, M.plank, (x0 + x1) / 2, RF - .05, (OA + OB) / 2, L2 + .4, .1, OB - OA); for (const z of [OA, OB]) { wall(s, x0, z, x1, z, RF, RF + 1); box(s, M.red, (x0 + x1) / 2, RF + .95, z, L2 + .4, .05, .05); box(s, M.red, (x0 + x1) / 2, RF + .5, z, L2 + .4, .04, .04); } } }
    // front, ground floor: piers, shop windows, door
    const win = [[.6, mid - dw - .35], [mid + dw + .35, W - .6]];
    box(s, fm, .3, (F0 + F1) / 2, .12, .6, F1 - F0, .24); box(s, fm, W - .3, (F0 + F1) / 2, .12, .6, F1 - F0, .24);
    for (const [a, b] of win) { box(s, M.wood, (a + b) / 2, F0 + .45, .12, b - a, .9, .3); box(s, M.glass, (a + b) / 2, F0 + 1.75, .12, b - a, 1.7, .08); box(s, M.wood, (a + b) / 2, F0 + 2.6, .1, b - a + .1, .1, .34); for (let k = 1; k < 3; k++) box(s, M.wood, a + (b - a) * k / 3, F0 + 1.75, .1, .06, 1.7, .12); }
    box(s, fm, mid - dw - .175, (F0 + F1) / 2, .12, .35, F1 - F0, .24); box(s, fm, mid + dw + .175, (F0 + F1) / 2, .12, .35, F1 - F0, .24);
    box(s, fm, mid, (F0 + 2.65 + F1) / 2, .12, W, F1 - F0 - 2.65, .24); box(s, M.red, mid, F0 + 2.62, .08, 2 * dw + .3, .14, .3); // door lintel
    wall(s, 0, 0, mid - dw, 0, -1, F1); wall(s, mid + dw, 0, W, 0, -1, F1);
    // ---- upper floor: balcony, doors, windows ----
    const bd = 1.6; floor(s, .3, W - .3, -bd, 0, F1); box(s, M.plank, mid, F1 - .08, -bd / 2, W - .6, .16, bd); box(s, M.red, mid, F1 - .25, -bd + .05, W - .6, .2, .1);
    for (const px of [.45, mid, W - .45]) { cyl(s, M.red, px, (F0 + F1) / 2, -bd + .12, .1, F1 - F0, 8); }
    // carved railing: top + bottom rails and lattice
    box(s, M.red, mid, F1 + 1.0, -bd + .06, W - .6, .08, .12); box(s, M.red, mid, F1 + .18, -bd + .06, W - .6, .08, .12); for (let k = 0; k <= 22; k++) { const x = .4 + (W - .8) * k / 22; box(s, k % 2 ? M.gold : M.red, x, F1 + .6, -bd + .06, .05, .8, .05); }
    for (const sx of [.32, W - .32]) { box(s, M.red, sx, F1 + .6, -bd / 2, .08, .9, bd); wall(s, sx, -bd, sx, 0, F1 - .5, F1 + 1.05); }
    wall(s, .3, -bd, W - .3, -bd, F1 - .5, F1 + 1.05);
    // upper front wall with a centre balcony door and two tall windows
    const bdw = .65; box(s, fm, mid, RF - .35, .12, W, .7, .24); box(s, fm, (mid - bdw) / 2, F1 + .2, .12, mid - bdw, .4, .24); box(s, fm, (W + mid + bdw) / 2, F1 + .2, .12, W - mid - bdw, .4, .24);
    for (const [a, b] of [[0, 1.2], [3.6, mid - bdw], [mid + bdw, W - 3.6], [W - 1.2, W]]) box(s, fm, (a + b) / 2, (F1 + .4 + RF - .7) / 2, .12, b - a, RF - .7 - F1 - .4, .24);
    for (const [a, b] of [[1.2, 3.6], [W - 3.6, W - 1.2]]) { box(s, M.glass, (a + b) / 2, (F1 + .4 + RF - .7) / 2, .12, b - a, RF - .7 - F1 - .4, .08); box(s, M.green, a - .08, (F1 + .4 + RF - .7) / 2, -.02, .16, RF - .7 - F1 - .4, .06); box(s, M.green, b + .08, (F1 + .4 + RF - .7) / 2, -.02, .16, RF - .7 - F1 - .4, .06); }
    wall(s, 0, 0, mid - bdw, 0, F1, RF); wall(s, mid + bdw, 0, W, 0, F1, RF);
    // pent eave over the balcony
    eave(s, -.1, W + .1, -bd + .1, RF - .45, 1.0);
    // ---- the parapet / false front ----
    box(s, fm, mid, top + .5, .12, W, 1.0 + (top - RF), .3); if (tall) { box(s, fm, mid, (RF + top) / 2, .12, W, top - RF, .24); }
    box(s, M.tile, mid, top + 1.08, .1, W + .3, .16, .7); for (const ex of [-.1, W + .1]) { const t = new THREE.ConeGeometry(.14, .9, 5); t.rotateZ(ex < 1 ? .9 : -.9); t.translate(ex + (ex < 1 ? -.2 : .2), top + 1.3, .1); push(M.tile, xf(s, t)); }
    if (idx % 4 === 1 || tall) { cone(s, M.tile, mid, top + 1.65, .1, 1.1, .9); sph(s, M.gold, mid, top + 2.15, .1, .16); }
    // signboards: a vertical board beside the door (both faces), an English plaque over the door
    const ai = SHOPS.indexOf(sh), u0 = (ai % 8) * 128 / ATW, v1 = 1 - Math.floor(ai / 8) * 400 / ATH, v0 = v1 - 400 / ATH, u1 = u0 + 128 / ATW;
    for (const sx of [mid - dw - .9]) { plane(s, signM, sx - .025, F0 + 2.3, -.5, .62, 1.95, -Math.PI / 2, u0, v0, u1, v1); plane(s, signM, sx + .025, F0 + 2.3, -.5, .62, 1.95, Math.PI / 2, u0, v0, u1, v1); box(s, M.dark, sx, F0 + 2.3, -.5, .04, 2.0, .66); box(s, M.dark, sx, F0 + 3.33, -.25, .05, .05, .55); }
    const pu0 = (ai % 4) * 256 / ATW, pv1 = 1 - (800 + Math.floor(ai / 4) * 56) / ATH, pv0 = pv1 - 56 / ATH; plane(s, signM, mid, F0 + 3.05, -.02, 3.2, .7, Math.PI, pu0, pv0, pu0 + 256 / ATW, pv1);
    plane(s, signM, mid, RF + .45, -.04, .62 * 1.4, 1.95 * .5, Math.PI, u0, v0 + (v1 - v0) * .5, u1, v1); // a second board on the parapet (top half of the characters)
    // lanterns on the balcony
    for (const lx of [1.5, W - 1.5]) { box(s, M.black, lx, RF - .9, -bd + .25, .03, .4, .03); sph(s, M.lamp, lx, RF - 1.35, -bd + .25, .28, 1.3); box(s, M.gold, lx, RF - 1.02, -bd + .25, .2, .06, .2); box(s, M.gold, lx, RF - 1.7, -bd + .25, .16, .06, .16); }
    // ---- stairs ----
    const sx0 = W - 1.35, sx1 = W - .2, zs0 = DP - 7.2, zs1 = DP - 1.5; // ground -> upper (right side)
    floor(s, sx0, sx1, zs0, zs1, F0, F1, 'z'); INQ = s.q; steps(s, sx0, sx1, zs0, zs1, F0, F1); INQ = null;
    floor(s, .2, sx0, 0, DP, F1); floor(s, sx0, W, zs1, DP, F1); floor(s, sx0, W, 0, zs0, F1);
    INQ = s.q; slab(s, F1, [[0, sx0, 0, DP], [sx0, W, zs1, DP], [sx0, W, 0, zs0]]); INQ = null;
    wall(s, sx0, zs0, sx0, zs1, F0 + 1.1, F1 + 1.0); wall(s, sx0, zs0, W, zs0, F1, F1 + 1.0); rail(s, sx0, zs0, sx0, zs1, F1); rail(s, sx0, zs0, W - .2, zs0, F1);
    const tx0 = .2, tx1 = 1.35; // upper -> roof (left side)
    floor(s, tx0, tx1, zs0, zs1, F1, RF, 'z'); INQ = s.q; steps(s, tx0, tx1, zs0, zs1, F1, RF); INQ = null;
    floor(s, tx1, W, 0, DP, RF); floor(s, 0, tx1, zs1, DP, RF); floor(s, 0, tx1, 0, zs0, RF);
    slab(s, RF, [[tx1, W, 0, DP], [0, tx1, zs1, DP], [0, tx1, 0, zs0]]);
    wall(s, tx1, zs0, tx1, zs1, F1 + 1.1, RF + 1.0); wall(s, 0, zs0, tx1, zs0, RF, RF + 1.0); rail(s, tx1, zs0, tx1, zs1, RF); rail(s, .2, zs0, tx1, zs0, RF);
    // roof hatch housing (a little stair head with a tiled cap) so the opening reads from the street
    box(s, M.tile, tx1 / 2 + .1, RF + 2.3, zs1 - 1.2, tx1 + .5, .12, 3.0); for (const pz of [zs1 - 2.6, zs1 + .2]) box(s, M.wood, tx1 + .05, RF + 1.15, pz, .1, 2.3, .1);
    // parapets on the other three roof edges
    wall(s, 0, 0, W, 0, RF, RF + 1);
    // v228 dressing: paper lanterns inside the shop (glow at night), flower pots along the balcony, painted banners on open side walls
    for (const lz of [2.4, 6.4]) { box(s, M.black, mid - 1.5, F1 - .25, lz, .02, .5, .02); sph(s, M.paper, mid - 1.5, F1 - .75, lz, .3, 1.25); box(s, M.red, mid - 1.5, F1 - .43, lz, .22, .05, .22); }
    for (let k = 0; k < 4; k++) { const px = 1.6 + k * (W - 3.2) / 3; if (Math.abs(px - mid) < 1) continue; cyl(s, M.red, px, F1 + .17, -bd + .35, .17, .3, 8, .13); sph(s, k % 2 ? M.jade : M.green, px, F1 + .43, -bd + .35, .22, .8); sph(s, M.lamp, px + .08, F1 + .55, -bd + .3, .05); }
    for (const [k, x, ry] of [['x0', -.02, -Math.PI / 2], ['xW', W + .02, Math.PI / 2]]) { if (s.open[k]) continue; plane(s, signM, x, F0 + 3.6, DP * .45, 1.4, 4.4, ry, u0, v0, u1, v1); box(s, M.gold, x, F0 + 5.85, DP * .45, .04, .08, 1.5); box(s, M.gold, x, F0 + 1.35, DP * .45, .04, .08, 1.5); }
    // ---- interior fittings by kind ----
    INQ = s.q; interior(s, kind, mid);
    // upper floor: a room with a bed, table, and a window seat
    box(s, M.wood, 3.0, F1 + .3, DP - 1.4, 2.0, .45, 1.0); box(s, M.cream, 3.0, F1 + .55, DP - 1.4, 1.9, .1, .95); box(s, M.wood, mid, F1 + .4, DP / 2, 1.2, .8, .8); box(s, M.wood, mid - .9, F1 + .25, DP / 2, .4, .5, .4); box(s, M.wood, mid + .9, F1 + .25, DP / 2, .4, .5, .4);
    spot(s, 3.0, F1, DP - 2.4, 'ct_bed', '🛏️ Rest a while upstairs (heal)', 1.4);     sph(s, M.paper, mid, RF - .5, DP / 2, .28, 1.2); box(s, M.wood, 5.6, F1 + 1.0, DP - .4, 2.2, 2.0, .5); // paper lantern + cabinet
    INQ = null;
    // roof dressing: a water tank or a pavilion, potted plants
    if (idx % 3 === 0) { cyl(s, M.wood, W - 2.4, RF + 1.0, DP - 2.4, 1.0, 1.6, 14); for (const k of [.4, 1.6]) cyl(s, M.black, W - 2.4, RF + .2 + k, DP - 2.4, 1.02, .06, 14); wall(s, W - 3.4, DP - 3.4, W - 1.4, DP - 3.4, RF, RF + 1.8); wall(s, W - 3.4, DP - 3.4, W - 3.4, DP - 1.4, RF, RF + 1.8); }
    else if (idx % 3 === 1) { const px = mid + 1.5, pz = DP / 2; for (const [dx, dz] of [[-1.4, -1.4], [1.4, -1.4], [-1.4, 1.4], [1.4, 1.4]]) cyl(s, M.red, px + dx, RF + 1.3, pz + dz, .09, 2.6, 8); cone(s, M.tile, px, RF + 3.25, pz, 2.6, 1.4); sph(s, M.gold, px, RF + 4.05, pz, .14); for (const [dx, dz] of [[-1.85, -1.85], [1.85, -1.85], [-1.85, 1.85], [1.85, 1.85]]) { const t = new THREE.ConeGeometry(.1, .6, 5); t.rotateX(dz < 0 ? -.9 : .9); t.translate(px + dx, RF + 2.65, pz + dz); push(M.tile, xf(s, t)); }
      box(s, M.wood, px, RF + .25, pz + .9, 2.0, .1, .5); box(s, M.wood, px, RF + .12, pz + .9, .1, .24, .4); spot(s, px, RF, pz, 'ct_view', '🏮 Take in the view from the pavilion', 2); }
    for (const [x, z] of [[W - .9, 2.4], [3.5, 2.4]]) { cyl(s, M.red, x, RF + .25, z, .28, .5, 10, .22); sph(s, M.green, x, RF + .75, z, .42, .9); }
    // shop spot (by the counter) + upstairs window
    s.useSpot = shopSpot(s, kind, en, mid);
  }
  function steps(s, x0, x1, z0, z1, ya, yb) { const n = Math.round((yb - ya) / .2), dz = (z1 - z0) / n, dy = (yb - ya) / n; for (let k = 0; k < n; k++) box(s, M.plank, (x0 + x1) / 2, ya + dy * (k + .5), z0 + dz * (k + .5), x1 - x0, dy, dz + .02); box(s, M.wood, (x0 + x1) / 2, (ya + yb) / 2 - .35, (z0 + z1) / 2, x1 - x0 - .1, .2, Math.hypot(z1 - z0, yb - ya)); }
  function rail(s, ax, az, bx, bz, y) { const L = Math.hypot(bx - ax, bz - az), ry = Math.atan2(bx - ax, bz - az); const g = new THREE.BoxGeometry(.06, .06, L); g.rotateY(ry); g.translate((ax + bx) / 2, y + .95, (az + bz) / 2); push(M.red, xf(s, g)); const n = Math.max(2, Math.round(L / .6)); for (let k = 0; k <= n; k++) box(s, M.red, ax + (bx - ax) * k / n, y + .48, az + (bz - az) * k / n, .05, .95, .05); }
  function slab(s, y, rects) { for (const [x0, x1, z0, z1] of rects) { box(s, M.plank, (x0 + x1) / 2, y - .1, (z0 + z1) / 2, x1 - x0, .2, z1 - z0); } }
  function interior(s, kind, mid) { const c = (x, z, w, d, h = 1.0, m = M.wood) => box(s, m, x, F0 + h / 2, z, w, h, d), shelf = (x, z, w) => { box(s, M.wood, x, F0 + 1.3, z, w, 2.6, .4); for (let k = 0; k < 4; k++) box(s, M.dark, x, F0 + .4 + k * .6, z - .05, w - .1, .04, .36); };
    if (kind === 'tea' || kind === 'noodle') { for (const [tx, tz] of [[2.5, 3], [mid + .5, 3], [2.5, 6.2], [mid + .5, 6.2]]) { cyl(s, M.wood, tx, F0 + .75, tz, .55, .06, 14); cyl(s, M.wood, tx, F0 + .38, tz, .08, .72, 6); for (const a of [0, 1.6, 3.2, 4.7]) cyl(s, M.red, tx + Math.cos(a) * .85, F0 + .25, tz + Math.sin(a) * .85, .18, .5, 8); sph(s, M.white, tx, F0 + .85, tz, .09, .8); } c(2.4, DP - .9, 3.2, .7, 1.05); shelf(2.4, DP - .35, 3.2); }
    else if (kind === 'herb') { c(mid - 1, 2.4, 4.6, .7, 1.05); for (let r = 0; r < 2; r++) { box(s, M.wood, 1.4 + r * 3.4, F0 + 1.3, DP - .4, 3.2, 2.6, .5); for (let i = 0; i < 6; i++) for (let j = 0; j < 7; j++) box(s, M.gold, .4 + r * 3.4 + i * .5, F0 + .25 + j * .34, DP - .66, .06, .06, .04); } for (let k = 0; k < 5; k++) cyl(s, M.cream, 1.2 + k * .5, F0 + 1.2, 2.4, .12, .3, 8); }
    else if (kind === 'goods' || kind === 'gold' || kind === 'tailor' || kind === 'books') { c(mid - 1, 2.6, 4.8, .7, 1.05, kind === 'gold' ? M.dark : M.wood); for (const [x, w] of [[1.8, 3.2], [5.6, 3.2]]) shelf(x, DP - .35, w); shelf(.45, 5.5, .5); for (let k = 0; k < 10; k++) box(s, k % 2 ? M.red : M.cream, .8 + (k % 5) * .55, F0 + 1.05 + Math.floor(k / 5) * .6, DP - .55, .4, .4, .25);
      if (kind === 'goods') for (let k = 0; k < 6; k++) cyl(s, M.wood, 1.2 + k * .75, F0 + .45, 5.6, .3, .9, 10); if (kind === 'tailor') for (let k = 0; k < 5; k++) box(s, [M.red, M.jade, M.gold, M.cream, M.green][k], 1 + k * .9, F0 + 1.3, 5.2, .6, 1.6, .08); if (kind === 'gold') { box(s, M.glass, mid - 1, F0 + 1.25, 2.6, 4.6, .35, .6); } }
    else if (kind === 'bakery') { c(mid - 1, 2.4, 4.6, .7, 1.05); for (let k = 0; k < 8; k++) cyl(s, M.gold, mid - 3 + k * .55, F0 + 1.12, 2.4, .16, .08, 10); box(s, M.stone, 2, F0 + .9, DP - 1, 2.4, 1.8, 1.4); box(s, M.dark, 2, F0 + .8, DP - 1.72, .9, .6, .05); }
    else if (kind === 'fire') { c(mid - 1, 2.4, 4.6, .7, 1.05, M.red); for (let k = 0; k < 14; k++) cyl(s, M.red, .9 + (k % 7) * .7, F0 + 1.1 + Math.floor(k / 7) * .5, DP - .6, .08, .4, 8); shelf(3, DP - .35, 4.5); }
    else if (kind === 'hall') { for (let r = 0; r < 3; r++) for (let k = 0; k < 4; k++) box(s, M.wood, 1.6 + k * 1.6, F0 + .25, 3 + r * 1.6, 1.2, .5, .4); box(s, M.red, mid, F0 + .4, DP - 1, 4, .8, 1.2); box(s, M.gold, mid, F0 + 2.0, DP - .3, 3, 1.4, .06); }
    else if (kind === 'temple') { box(s, M.red, mid, F0 + .55, DP - 1.4, 4.4, 1.1, 1.4); box(s, M.gold, mid, F0 + 1.15, DP - 1.4, 4.5, .08, 1.45); cyl(s, M.gold, mid, F0 + 1.35, DP - 1.6, .28, .32, 12); for (const sx of [-1.4, 1.4]) { cyl(s, M.red, mid + sx, F0 + 1.5, DP - 1.8, .06, .7, 6); sph(s, M.lamp, mid + sx, F0 + 2.0, DP - 1.8, .1); } box(s, M.gold, mid, F0 + 2.6, DP - .3, 4, 2, .08); for (let k = 0; k < 4; k++) sph(s, M.lamp, 1.5 + k * 2.8, F0 + 2.9, 3, .32, 1.3); }
    else if (kind === 'theatre') { box(s, M.plank, (W - 1.6 + .6) / 2, F0 + .5, DP - 2, W - 2.2, 1.0, 3.2); floor(s, .6, W - 1.6, DP - 3.6, DP - .4, F0 + 1.0); box(s, M.red, mid, F0 + 2.8, DP - .5, W - 1.2, 3.6, .08); for (const sx of [.9, W - .9]) box(s, M.red, sx, F0 + 2.4, DP - 3.5, .5, 3.0, .2); for (let r = 0; r < 3; r++) box(s, M.wood, mid, F0 + .25, 1.6 + r * 1.3, W - 3, .5, .5); }
  }
  function shopSpot(s, kind, en, mid) { const z = kind === 'theatre' ? 3 : /tea|noodle|hall|temple/.test(kind) ? 3.6 : 1.4, lab = { tea: '🍵 Sit for jasmine tea (20 pts · full heal)', noodle: '🍜 A bowl of noodles (30 pts · heal + well fed 2 min)', herb: '🌿 Ginseng tonic (150 pts · fast regen 3 min)', goods: '📦 Restock ammo (120 pts · fills every gun)', bakery: '🥮 Egg tarts and buns (15 pts · heal 40)', fire: (H.night || 0) > .5 ? '🎆 Fireworks show over Chinatown (400 pts) · firecrackers by day' : '🧨 Set off a string of firecrackers (50 pts)', hall: '🔔 Strike the hall gong', temple: '🕯️ Light incense (a blessing once a day)', tailor: '🧵 Look over the silks', gold: '💍 Look over the jade and gold', books: '📚 Browse the books', theatre: '🎭 Watch the opera (once a day · +100)' }[kind];
    return spot(s, mid - 1, F0, z, 'ct_' + kind, lab, 1.9, { shopName: en }); }

  // ---------- lantern strings over the streets (one instanced mesh) ----------
  const LP = []; for (let z = -32; z <= 32; z += 6.4) { for (let k = 0; k < 7; k++) LP.push([-4 + k * 8 / 6, 7.2 - Math.sin(k / 6 * Math.PI) * .7, z]); }
  for (let x = -26; x <= 26; x += 6.5) { if (Math.abs(x) < 6) continue; for (let k = 0; k < 7; k++) LP.push([x, 7.2 - Math.sin(k / 6 * Math.PI) * .7, -4 + k * 8 / 6]); }
  const LI = new THREE.InstancedMesh(new THREE.SphereGeometry(.24, 10, 7).scale(1, 1.3, 1), M.lamp, LP.length); { const m4 = new THREE.Matrix4(); LP.forEach((p, i) => { m4.makeTranslation(CX + p[0], y0 + p[1], CZ + p[2]); LI.setMatrixAt(i, m4); }); } LI.name = 'chinatown lanterns'; scene.add(LI);
  // the wires
  for (let z = -32; z <= 32; z += 6.4) box(D, M.black, 0, 7.5, z, 9, .02, .02); for (let x = -26; x <= 26; x += 6.5) if (Math.abs(x) >= 6) box(D, M.black, x, 7.5, 0, .02, .02, 9);
  // street lamps + barrels + benches + a central bronze incense urn at the crossing
  for (const [x, z] of [[-4.2, -12], [4.2, 12], [-4.2, 24], [4.2, -24], [12, -4.2], [-12, 4.2], [24, 4.2], [-24, -4.2]]) { cyl(D, M.black, x, 2.2, z, .08, 4.4, 8); sph(D, M.paper, x, 4.6, z, .32, 1.2); box(D, M.black, x, 4.15, z, .3, .06, .3); wall(D, x - .15, z, x + .15, z, -1, 4); }
  cyl(D, M.stone, 0, .35, 0, 1.6, .7, 20); cyl(D, M.gold, 0, 1.1, 0, .9, .9, 16, .65); for (const a of [0, 2.1, 4.2]) cyl(D, M.gold, Math.cos(a) * .7, .75, Math.sin(a) * .7, .08, .6, 6); for (let k = 0; k < 3; k++) cyl(D, M.red, -.2 + k * .2, 1.85, 0, .015, .6, 4);
  for (let k = 0; k < 12; k++) wall(D, Math.cos(k / 12 * 6.283) * 1.65, Math.sin(k / 12 * 6.283) * 1.65, Math.cos((k + 1) / 12 * 6.283) * 1.65, Math.sin((k + 1) / 12 * 6.283) * 1.65, -1, 1.2);
  spot(D, 0, 0, 0, 'ct_urn', '🕯️ Burn a joss stick at the urn', 2.6);
  // v230 horse troughs + hitching rails inside the north and south gates (ride up, stop: your horse drinks)
  const troughs = []; for (const sz of [-1, 1]) { const tz = sz * (E - 4.5); box(D, M.wood, 8, .35, tz, 2.6, .6, .8); box(D, fmat(0x3a6a7a), 8, .62, tz, 2.4, .04, .6); for (const dx of [-1.2, 1.2]) box(D, M.wood, 8 + dx, .2, tz, .12, .4, .9); wall(D, 6.7, tz - .4, 9.3, tz - .4, -1, .7); wall(D, 6.7, tz + .4, 9.3, tz + .4, -1, .7); troughs.push([CX + 8, CZ + tz]);
    for (const dx of [-1.6, 1.6]) box(D, M.wood, -8 + dx, .55, tz, .14, 1.1, .14); box(D, M.wood, -8, 1.05, tz, 3.4, .1, .1); }
  // v237 corner gardens: a moon-gate wall, a pine, a stone bench (sit to heal) and a koi pond in each corner of the ring lane
  const koi = []; for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const gx = sx * 33.2, gz = sz * 33.2;
    // moon gate: a wall segment with a round opening facing the lane
    const ring = new THREE.TorusGeometry(1.25, .22, 8, 24); ring.translate(0, 1.6, 0); ring.rotateY(sx * sz > 0 ? Math.PI / 4 : -Math.PI / 4); ring.translate(gx - sx * 1.6, 0, gz - sz * 1.6); push(M.cream, xf(D, ring)); box(D, M.tile, gx - sx * 1.6, 3.05, gz - sz * 1.6, 3.4, .18, .5, sx * sz > 0 ? Math.PI / 4 : -Math.PI / 4);
    cyl(D, M.dark, gx + sx * .6, 1.0, gz - sz * .9, .12, 2.0, 6); cone(D, fmat(0x2e5a34), gx + sx * .6, 2.3, gz - sz * .9, .9, .7, 7, 0); cone(D, fmat(0x2e5a34), gx + sx * .9, 1.8, gz - sz * .6, .7, .5, 7, 0);
    box(D, M.stone, gx - sx * .3, .25, gz + sz * 1.2, 1.6, .5, .5); spot(D, gx - sx * .3, 0, gz + sz * 1.2, 'ct_bench', '🪨 Sit by the koi pond (heal)', 1.4);
    cyl(D, M.stone, gx + sx * .8, .12, gz + sz * .6, 1.1, .24, 18); cyl(D, fmat(0x2a5a6a), gx + sx * .8, .235, gz + sz * .6, 1.0, .04, 18); koi.push([CX + gx + sx * .8, CZ + gz + sz * .6]);
    for (let k = 0; k < 10; k++) wall(D, gx + sx * .8 + Math.cos(k / 10 * 6.283) * 1.1, gz + sz * .6 + Math.sin(k / 10 * 6.283) * 1.1, gx + sx * .8 + Math.cos((k + 1) / 10 * 6.283) * 1.1, gz + sz * .6 + Math.sin((k + 1) / 10 * 6.283) * 1.1, -1, .3); }
  const KF = new THREE.InstancedMesh(new THREE.ConeGeometry(.06, .26, 5).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xff7a2a, roughness: .5 }), koi.length * 3); KF.name = 'koi'; scene.add(KF); { const c = new THREE.Color(); for (let i = 0; i < koi.length * 3; i++) KF.setColorAt(i, c.set([0xff7a2a, 0xffffff, 0xffb040][i % 3])); }
  // v229 lantern riddles: a frame of paper lanterns by the crossing, each with a riddle on its tassel
  { const rx = -7.5, rz = -7.5; for (const dx of [-1.2, 1.2]) cyl(D, M.red, rx + dx, 1.4, rz, .06, 2.8, 8); box(D, M.red, rx, 2.8, rz, 2.8, .12, .12); for (let k = 0; k < 4; k++) { sph(D, M.lamp, rx - 1.0 + k * .66, 2.35, rz, .22, 1.3); box(D, M.gold, rx - 1.0 + k * .66, 1.95, rz, .03, .3, .03); box(D, M.paper, rx - 1.0 + k * .66, 1.72, rz, .12, .2, .01); }
    spot(D, rx, 0, rz - .9, 'ct_riddle', '🏮 Lantern riddles (guess right for points)', 2); }
  // v224 night market: food stalls along the cross street (steam rises after dark)
  const STALL = [['🍢 Skewers off the grill (10 pts)', 0xc0392b], ['🥟 Steamed dumplings (10 pts)', 0xe6dcc4], ['🍠 Roast sweet potato (10 pts)', 0x8a5a2a], ['🍵 Almond tea (10 pts)', 0x2f5d50], ['🥮 Sesame balls (10 pts)', 0xb8862e], ['🍜 Wonton soup (10 pts)', 0x9a3324]], stalls = [];
  STALL.forEach(([lab, col], i) => { const x = (i < 3 ? -1 : 1) * (10 + (i % 3) * 7), z = 3.0, cm = fmat(col); box(D, M.wood, x, .5, z, 2.2, 1.0, 1.1); box(D, M.plank, x, 1.03, z, 2.3, .06, 1.2); for (const [dx, dz] of [[-1.05, -.5], [1.05, -.5], [-1.05, .5], [1.05, .5]]) box(D, M.wood, x + dx, 1.2, z + dz, .07, 2.4, .07);
    const g = new THREE.BoxGeometry(2.6, .08, 1.7); g.rotateX(-.25); g.translate(x, 2.45, z - .1); push(cm, xf(D, g)); box(D, M.red, x, 2.25, z - .9, 2.6, .25, .04); sph(D, M.lamp, x - 1.05, 2.05, z - .5, .16, 1.3); sph(D, M.lamp, x + 1.05, 2.05, z - .5, .16, 1.3);
    if (i % 2) { cyl(D, M.wood, x - .4, 1.25, z, .3, .3, 12); cyl(D, M.wood, x - .4, 1.5, z, .3, .2, 12); } else { box(D, M.dark, x - .3, 1.12, z, 1.0, .1, .5); }
    wall(D, x - 1.1, z - .55, x + 1.1, z - .55, -1, 1.1); wall(D, x - 1.1, z + .55, x + 1.1, z + .55, -1, 1.1); wall(D, x - 1.1, z - .55, x - 1.1, z + .55, -1, 1.1); wall(D, x + 1.1, z - .55, x + 1.1, z + .55, -1, 1.1);
    const o = spot(D, x, 0, z - 1.4, 'ct_stall', lab, 1.5, { food: lab.replace(/ \(10 pts\)/, '') }); stalls.push([CX + x, CZ + z]); });


  // ---------- merge ----------
  const root = new THREE.Group(); root.name = 'chinatown'; for (const [m, gs] of GEO) { const me = new THREE.Mesh(mergeGeometries(gs), m); me.castShadow = !mobile && m !== M.glass && m !== M.lamp; me.receiveShadow = true; me.matrixAutoUpdate = false; root.add(me); gs.forEach(g => g.dispose()); } GEO.clear(); scene.add(root);
  for (const [q, G] of GEOI) { const g = new THREE.Group(); g.name = 'chinatown interiors ' + q; for (const [m, gs] of G) { const me = new THREE.Mesh(mergeGeometries(gs), m); me.receiveShadow = true; me.castShadow = false; me.matrixAutoUpdate = false; g.add(me); gs.forEach(x => x.dispose()); } scene.add(g); const b = built.find(o => o.q === q); if (H.cullAdd && b) H.cullAdd(g, 38, { x: b.qc[0], z: b.qc[1] }); } GEOI.clear();
  if (H.cullAdd) { H.cullAdd(root, 320, { x: CX, z: CZ }); H.cullAdd(LI, 260, { x: CX, z: CZ }); }
  (H.safeRects || (H.safeRects = [])).push({ x: CX, z: CZ, hw: E + 2, hd: E + 10, name: 'CHINATOWN', label: '🛡 NO ZOMBIES · CHINATOWN' });

  // ---------- things to do ----------
  const st = () => H.stats || (H.stats = {}); const day = () => Math.floor(Date.now() / 864e5);
  const pay = n => { const g = H.guns; if (!g || g.state.score < n) { msg(`You need ${n} pts`, 1.6); return false; } g.state.score -= n; g.save && g.save(); return true; };
  const earn = n => { const g = H.guns; if (g) { g.state.score += n; g.save && g.save(); } };
  const heal = n => { const Z = H.zombies; if (Z && Z.state) Z.state.hp = Math.min(100, (Z.state.hp || 0) + n); };
  let fedT = 0, tonicT = 0, crackers = null;
  const prevUse = T.onUse; T.onUse = o => { if (!o || !o.ct) return prevUse ? prevUse(o) : false; const k = o.kind.slice(3), S = st();
    if (k === 'tea') { if (pay(20)) { heal(100); msg('🍵 Jasmine tea, a quiet table - you feel whole again', 2.5); S.ctTea = (S.ctTea || 0) + 1; } }
    else if (k === 'noodle') { if (pay(30)) { heal(60); fedT = 120; msg('🍜 Hot noodles - well fed for 2 minutes (double regen)', 2.5); S.ctFood = (S.ctFood || 0) + 1; } }
    else if (k === 'bakery') { if (pay(15)) { heal(40); msg('🥮 Warm egg tarts and a pork bun', 2); S.ctFood = (S.ctFood || 0) + 1; } }
    else if (k === 'herb') { if (pay(150)) { tonicT = 180; heal(30); msg('🌿 Ginseng tonic - fast regen for 3 minutes', 2.5); } }
    else if (k === 'goods') { const g = H.guns; if (g && g.state && g.state.ammo && pay(120)) { for (const w of Object.keys(g.state.ammo)) { try { const mx = g.maxAmmo(w); if (mx > g.state.ammo[w]) g.state.ammo[w] = mx; } catch (_) {} } g.syncUI && g.syncUI(); g.save && g.save(); msg('📦 Every gun topped up', 2); } }
    else if (k === 'fire' && (H.night || 0) > .5 && H.fireworksNow) { if (pay(400)) { H.fireworksNow([CX, CZ]); S.ctShow = (S.ctShow || 0) + 1; S.ctFireNight = (S.ctFireNight || 0) + 1; msg('🎆 Look up!', 2); } }
    else if (k === 'fire') { if (pay(50)) { crackers = { t: 0, n: 0, x: P.pos.x + Math.sin(P.yaw || 0) * -2, z: P.pos.z + Math.cos(P.yaw || 0) * -2 }; S.ctFire = (S.ctFire || 0) + 1; if ((H.night || 0) > .5) S.ctFireNight = (S.ctFireNight || 0) + 1; msg('🧨 Stand back!', 1.5); } }
    else if (k === 'hall' || k === 'urn') { if (sfx.tone && sfx.ctx) { if (k === 'hall') { sfx.tone('sine', 110, 104, .5, 3.5); sfx.tone('triangle', 220, 208, .2, 2.5); sfx.tone('sine', 331, 320, .1, 2); } else sfx.tone('sine', 880, 870, .05, 1.2); } if (k === 'urn') msg('🕯️ A thin line of fragrant smoke curls up', 2); if (k === 'hall') { S.ctGong = (S.ctGong || 0) + 1; if (S.ctRed !== day()) { S.ctRed = day(); earn(88); msg('🧧 The elders hand you a red envelope for luck  +88', 3); } else msg('🔔 The gong rolls down the street', 2); } if (k === 'urn' && fx && fx.smoke) for (let i = 0; i < 10; i++) fx.smoke.emit(o.x, o.y + 2, o.z, 0, .5 + Math.random() * .3, 0, .8, .8, .78, .5, 2.2, 1.6, -.01, .1); }
    else if (k === 'temple') { if (S.ctIncense === day()) msg('🕯️ The incense from this morning still burns', 2); else { S.ctIncense = day(); earn(250); heal(100); msg('🕯️ You light incense at the altar - a blessing: +250 and fully healed', 3); } }
    else if (k === 'theatre') { if (S.ctOpera === day()) msg('🎭 Tonight\'s performance is over - come back tomorrow', 2); else { S.ctOpera = day(); earn(100); msg('🎭 Gongs, cymbals and a soaring voice - the crowd roars (+100)', 3); if (sfx.tone && sfx.ctx) [523, 587, 659, 784, 659, 587, 523, 440].forEach((f, i) => setTimeout(() => { sfx.tone('triangle', f, f, .08, .3); if (i % 2 === 0) sfx.nz && sfx.nz('highpass', 5000, .7, .1, .25); }, i * 260)); } }
    else if (k === 'bed') { heal(100); msg('🛏️ You stretch out for a while - rested and healed', 2.2); S.ctRest = (S.ctRest || 0) + 1; }
    else if (k === 'stall') { if (pay(10)) { heal(30); msg(o.food || '🍢 Skewers off the grill', 1.8); S.ctFood = (S.ctFood || 0) + 1; } }
    else if (k === 'riddle') { riddle(); }
    else if (k === 'bench') { heal(60); msg('🪨 You sit by the pond a while - the koi drift past', 2.2); S.ctBench = 1; }
    else if (k === 'view') { msg('🏮 Lanterns, tiled eaves and the range beyond', 2); S.ctView = 1; }
    else msg('Fine work - but nothing you need today', 1.6);
    if (o.shopName) { const v = new Set(S.ctShops || []); v.add(o.shopName); S.ctShops = [...v]; }
    return true; };

  // ---------- v221 people: shoppers stroll the sidewalks, shopkeepers mind their counters ----------
  const LOOK = [[0x2c3a4a, 0xe8e0cc, 'male'], [0x4a2a2a, 0xece4d0, 'female'], [0x2e3e34, 0xe0d6c0, 'male'], [0x3a3448, 0xeee6d4, 'female'], [0x5a4630, 0xe6dccc, 'male'], [0x283238, 0xf0e8d8, 'male'], [0x4a3a2a, 0xe8dcc8, 'female']];
  const SKIN = [0xe0b48c, 0xd4a27a, 0xc8946c, 0xb88460, 0xe8c09a], HAIR = [0x14100c, 0x1c1410, 0x2a1e14];
  const people = [], mkP = (i, name) => { const [coat, top, sex] = LOOK[i % LOOK.length]; const D = makeFrontierCharacter({ kind: 'townsfolk', sex, quality: mobile ? 'low' : 'high', coat, top, bodice: coat, hatC: [0x1a1612, 0x2a221a, 0x3a2e22][i % 3], skin: SKIN[i % SKIN.length], hair: HAIR[i % HAIR.length], bandana: coat, name }); scene.add(D.g); try { mergeStatic(D.g); } catch (_) {} return D; };
  const WP = []; for (const sx of [-5.6, 5.6]) for (let z = -30; z <= 30; z += 6) WP.push([sx, z]); for (const sz of [-5.6, 5.6]) for (let x = -30; x <= 30; x += 6) if (Math.abs(x) > 7) WP.push([x, sz]);
  const NW = mobile ? 4 : 7; for (let i = 0; i < NW; i++) { const D = mkP(i, 'Shopper'), w = WP[(i * 7) % WP.length]; if (i % 3 === 1) { const pr = new THREE.Group(), cn = new THREE.Mesh(new THREE.ConeGeometry(.62, .28, 16, 1, true), new THREE.MeshStandardMaterial({ color: [0xc0392b, 0xe8c070, 0x2f5d50][i % 3], side: THREE.DoubleSide, roughness: .7 })), st2 = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, 1.0, 4), M.dark); cn.position.y = .5; pr.add(cn, st2); pr.position.set(.22, 1.55, .05); D.g.add(pr); } /* v232 paper parasols */ people.push({ D, x: w[0], z: w[1], tg: null, sp: 1 + Math.random() * .4, wait: Math.random() * 3 }); }
  const keepers = built.filter(b => /tea|herb|bakery|noodle|goods/.test(b.shop[2])).slice(0, mobile ? 3 : 6).map((b, i) => { const D = mkP(i + 3, 'Shopkeeper'), [wx, wz] = /tea|noodle/.test(b.shop[2]) ? toW(b, 2.4, 8.1) : toW(b, W / 2 - 1, 3.4); D.g.position.set(wx, y0 + F0, wz); D.g.rotation.y = b.rot + Math.PI; return { D, b }; });
  function peopleTick(dt, me) { const close = Math.hypot(me.x - CX, me.z - CZ) < 110; for (const p of people) p.D.g.visible = close; for (const k of keepers) k.D.g.visible = close; if (!close) return;
    for (const p of people) { if (p.wait > 0) { p.wait -= dt; poseFrontierCharacter(p.D, dt, { speed: 0 }); } else { if (!p.tg) { const opts = WP.filter(w => { const d = Math.hypot(w[0] - p.x, w[1] - p.z); return d > 3 && d < 7; }); p.tg = opts[(Math.random() * opts.length) | 0] || WP[(Math.random() * WP.length) | 0]; }
        const dx = p.tg[0] - p.x, dz = p.tg[1] - p.z, d = Math.hypot(dx, dz); if (d < .3) { p.tg = null; if (Math.random() < .35) p.wait = 2 + Math.random() * 5; } else { const st2 = Math.min(d, p.sp * dt); p.x += dx / d * st2; p.z += dz / d * st2; p.D.g.rotation.y = Math.atan2(dx, dz); }
        const pm = me, ddx = CX + p.x - pm.x, ddz = CZ + p.z - pm.z, dd = Math.hypot(ddx, ddz); if (dd < 1.1 && dd > .01) { p.x += ddx / dd * (1.1 - dd); p.z += ddz / dd * (1.1 - dd); } /* step aside for you */
        poseFrontierCharacter(p.D, dt, { speed: p.wait > 0 ? 0 : p.sp }); }
      p.D.g.position.set(CX + p.x, T.floorAt(CX + p.x, CZ + p.z, y0 + .5), CZ + p.z); }
    for (const k of keepers) { poseFrontierCharacter(k.D, dt, { speed: 0 }); const d = Math.hypot(me.x - k.D.g.position.x, me.z - k.D.g.position.z); if (d < 3.2 && Math.abs(me.y - k.D.g.position.y) < 1.5 && (!k.hi || t - k.hi > 90)) { k.hi = t; msg(['歡迎光臨 - welcome, come in!', 'Good day! Take a look around.', 'Welcome, friend - fresh stock today.', 'Ah, a rider! Welcome.'][(Math.random() * 4) | 0], 2.2); } } }

  // ---------- v222 the dragon dance: a long red-and-gold dragon on poles snakes down the avenue to drums and cymbals
  // (every ~8 minutes while you're near, and whenever someone strikes the association hall gong - 3 min cooldown) ----------
  const DR = (() => { const g = new THREE.Group(); g.name = 'dragon'; g.visible = false; scene.add(g); const NS = 12, segs = [];
    const red = new THREE.MeshStandardMaterial({ color: 0xc81e1e, roughness: .5, emissive: 0x400000 }), gold = new THREE.MeshStandardMaterial({ color: 0xe8b23a, metalness: .5, roughness: .35, emissive: 0x302000 }), pole = new THREE.MeshStandardMaterial({ color: 0x3a2a1a });
    const head = new THREE.Group(); { const hb = new THREE.Mesh(new THREE.BoxGeometry(.9, .7, 1.2), red); head.add(hb); const jaw = new THREE.Mesh(new THREE.BoxGeometry(.8, .18, .9), gold); jaw.position.set(0, -.42, .3); head.add(jaw); for (const sx of [-.3, .3]) { const e = new THREE.Mesh(new THREE.SphereGeometry(.13, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff })); e.position.set(sx, .2, .58); head.add(e); const hn = new THREE.Mesh(new THREE.ConeGeometry(.08, .7, 6), gold); hn.position.set(sx, .55, -.3); hn.rotation.x = -.7; head.add(hn); const wh = new THREE.Mesh(new THREE.CylinderGeometry(.02, .02, 1.1, 4), gold); wh.position.set(sx * 1.6, -.1, .6); wh.rotation.z = sx > 0 ? 1.2 : -1.2; head.add(wh); } const mane = new THREE.Mesh(new THREE.ConeGeometry(.5, .6, 8), gold); mane.position.set(0, .3, -.6); mane.rotation.x = -1.4; head.add(mane); } g.add(head);
    for (let i = 0; i < NS; i++) { const sg = new THREE.Group(), body = new THREE.Mesh(new THREE.SphereGeometry(.42, 12, 8), i % 2 ? gold : red); body.scale.set(1, .9, 1.5); sg.add(body); const fin = new THREE.Mesh(new THREE.ConeGeometry(.15, .45, 4), gold); fin.position.y = .45; sg.add(fin); const pl = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, 2.2, 5), pole); pl.position.y = -1.3; sg.add(pl); g.add(sg); segs.push(sg); }
    const hp = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, 2.2, 5), pole); hp.position.y = -1.4; head.add(hp);
    // dancers under the poles: simple dark-trousered legs pairs
    const legM = new THREE.MeshStandardMaterial({ color: 0x1a1a22 }), legs = []; for (let i = 0; i <= NS; i += 2) { const lg = new THREE.Mesh(new THREE.BoxGeometry(.35, .9, .25), legM); g.add(lg); legs.push([lg, i]); }
    return { g, head, segs, legs, NS, on: false, t: 0, cool: 90 + Math.random() * 120, gcool: 0 }; })();
  const startDragon = why => { if (DR.on) return; DR.on = true; DR.t = 0; DR.g.visible = true; msg(why || '🐉 The dragon dance comes down the avenue!', 3); const S = st(); S.ctDragon = (S.ctDragon || 0) + 1; };
  function dragonTick(dt, me) { const near = Math.hypot(me.x - CX, me.z - CZ) < 120; if (DR.gcool > 0) DR.gcool -= dt; if (!DR.on) { DR.cool -= dt; if (DR.cool <= 0 && near) { DR.cool = 480; startDragon(); } return; }
    DR.t += dt; const sp = 2.2, z0 = -E + 2 + DR.t * sp, path = d => { const z = z0 - d; return [Math.sin(z * .35 + DR.t * .8) * 2.2, z]; };
    const place = (o, d, bob) => { const [x, z] = path(d), [x2, z2] = path(d + .6); o.position.set(CX + x, y0 + 2.2 + Math.sin(DR.t * 4 - d * .9) * .45 * bob, CZ + z); o.rotation.y = Math.atan2(x - x2, z - z2); };
    place(DR.head, 0, 1); DR.segs.forEach((sg, i) => place(sg, (i + 1) * .95, 1)); for (const [lg, i] of DR.legs) { const [x, z] = path(i * .95); lg.position.set(CX + x + Math.sin(DR.t * 9 + i) * .1, y0 + .45, CZ + z); }
    if (sfx.tone && sfx.ctx && near) { DR.beat = (DR.beat || 0) - dt; if (DR.beat <= 0) { DR.beat = .42; DR.b = (DR.b || 0) + 1; sfx.tone('sine', 95, 60, .35, .18); if (DR.b % 4 === 3) sfx.nz && sfx.nz('highpass', 4500, .6, .14, .35); if (DR.b % 8 === 7) sfx.tone('sine', 140, 132, .15, 1.2); } }
    { const hx = DR.head.position.x, hz = DR.head.position.z; DR.tot = (DR.tot || 0) + dt; if (Math.hypot(me.x - hx, me.z - hz) < 14) DR.fol = (DR.fol || 0) + dt; }
    if (z0 - DR.NS * .95 > E + 6) { DR.on = false; DR.g.visible = false; if (DR.tot > 10 && DR.fol / DR.tot > .7) { earn(120); msg('🐉 You followed the dragon all the way - good fortune +120', 3); } DR.tot = DR.fol = 0; } }
  const prevUse2 = T.onUse; T.onUse = o => { if (o && o.kind === 'ct_hall' && !DR.on && DR.gcool <= 0) { DR.gcool = 180; setTimeout(() => startDragon('🐉 The gong calls out the dragon!'), 1500); } return prevUse2 ? prevUse2(o) : false; };

  const RID = [['What has keys but can\'t open a lock?', 'A piano', 'A jailer', 'A map'], ['What gets wetter the more it dries?', 'A towel', 'A river', 'A sponge cake'], ['What has a face and two hands but no arms or legs?', 'A clock', 'A scarecrow', 'A playing card'],
    ['What has a neck but no head?', 'A bottle', 'A shirt collar', 'A guitar case'], ['The more you take, the more you leave behind. What are they?', 'Footsteps', 'Coins', 'Photographs'], ['What travels the world but stays in a corner?', 'A stamp', 'The moon', 'A spider'],
    ['What has many teeth but cannot bite?', 'A comb', 'A saw', 'A crocodile skull'], ['What runs but never walks, has a mouth but never talks?', 'A river', 'A clock', 'A train'], ['What belongs to you, but others use it more than you?', 'Your name', 'Your horse', 'Your hat'],
    ['What can you catch but not throw?', 'A cold', 'A fish', 'A train'], ['What has an eye but cannot see?', 'A needle', 'A storm', 'A potato'], ['What goes up but never comes down?', 'Your age', 'Smoke', 'A kite'],
    ['What is full of holes but still holds water?', 'A sponge', 'A net', 'A sieve'], ['What has a head and a tail but no body?', 'A coin', 'A comet', 'A snake'], ['What comes once in a minute, twice in a moment, but never in a thousand years?', 'The letter M', 'A heartbeat', 'A blink']];
  let rEl = null; function riddle() { const S = st(), d = day(); if (S.ctRidDay !== d) { S.ctRidDay = d; S.ctRidN = 0; } if ((S.ctRidN || 0) >= 5) { msg('🏮 You\'ve read every lantern tonight - new riddles tomorrow', 2.2); return; }
    const q = RID[(d * 7 + (S.ctRidN || 0) * 5) % RID.length], opts = [q[1], q[2], q[3]].sort(() => Math.random() - .5);
    if (!rEl) { rEl = document.createElement('div'); rEl.id = 'ctRiddle'; rEl.style.cssText = 'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:80;background:#2a120e;border:3px solid #d4a640;border-radius:14px;color:#f6e6c0;font:600 16px Georgia,serif;padding:16px 18px;max-width:min(92vw,420px);text-align:center;box-shadow:0 8px 30px #000a'; document.body.appendChild(rEl); }
    rEl.innerHTML = `<div style="font:900 13px system-ui;letter-spacing:.1em;color:#e8b23a;margin-bottom:6px">🏮 LANTERN RIDDLE ${(S.ctRidN || 0) + 1} / 5</div><div style="margin-bottom:12px">${q[0]}</div>` + opts.map(o => `<button data-a="${o}" style="display:block;width:100%;margin:6px 0;padding:10px;border-radius:10px;border:2px solid #d4a640;background:#7a1c14;color:#fff3d6;font:700 15px system-ui">${o}</button>`).join('');
    rEl.hidden = false; H.uiOpen = true; try { document.exitPointerLock && document.exitPointerLock(); } catch (_) {} for (const b of rEl.querySelectorAll('button')) b.onclick = () => { const ok = b.dataset.a === q[1]; S.ctRidN = (S.ctRidN || 0) + 1; rEl.hidden = true; H.uiOpen = false; S.ctRidDone = 1; if (ok) { earn(150); S.ctRiddles = (S.ctRiddles || 0) + 1; msg('🏮 Correct! +150', 2); sfx.tone && sfx.ctx && [784, 988, 1175].forEach((f, i) => setTimeout(() => sfx.tone('triangle', f, f, .06, .3), i * 110)); } else msg('🏮 Not quite - it was "' + q[1] + '"', 2.5); }; }

  // ---------- v233 ROOFTOP RUN: race the loop of four roofs in the north-east block (over the plank bridges) against the clock ----------
  const RUN = (() => { const blk = built.filter(b => b.q === built[0].q); if (blk.length < 4) return null; const qc = blk[0].qc; const cps = blk.map(b => { const [x, z] = toW(b, W / 2 + 1, DP / 2 - 1); return [x, z, Math.atan2(x - qc[0], z - qc[1])]; }).sort((a, b) => a[2] - b[2]);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.1, .09, 8, 28), new THREE.MeshBasicMaterial({ color: 0xffc040, transparent: true, opacity: .9 })); ring.visible = false; scene.add(ring);
    const b0 = blk.find(b => { const [x, z] = toW(b, W / 2 + 1, DP / 2 - 1); return Math.hypot(x - cps[0][0], z - cps[0][1]) < .1; }), sp = spot(b0, W / 2 + 1, RF, DP / 2 - 1, 'ct_run', '🏮 Rooftop run - race the four roofs', 1.6);
    return { cps, ring, sp, on: false, i: 0, t: 0, lap: 0 }; })();
  function runTick(dt, me) { if (!RUN || !RUN.on) return; RUN.t += dt; const c = RUN.cps[RUN.i % 4]; RUN.ring.visible = true; RUN.ring.position.set(c[0], y0 + RF + 1.2, c[1]); RUN.ring.rotation.y += dt * 2;
    if (H.mounted || RUN.t > 120) { RUN.on = false; RUN.ring.visible = false; msg('🏮 Rooftop run abandoned', 1.6); return; }
    if (Math.hypot(me.x - c[0], me.z - c[1]) < 1.8 && me.y > y0 + RF - .5) { RUN.i++; sfx.tone && sfx.ctx && sfx.tone('triangle', 660 + RUN.i * 110, 660 + RUN.i * 110, .06, .2);
      if (RUN.i > 4) { RUN.on = false; RUN.ring.visible = false; const S = st(), tm = +RUN.t.toFixed(1), best = S.ctRunBest || 0; if (!best) { earn(300); msg(`🏮 Rooftop run: ${tm} s - first finish +300`, 3); } else if (tm < best) { earn(150); msg(`🏮 NEW RECORD ${tm} s (was ${best} s) +150`, 3); } else msg(`🏮 Rooftop run: ${tm} s (best ${best} s)`, 2.5); if (!best || tm < best) S.ctRunBest = tm; S.ctRuns = (S.ctRuns || 0) + 1; }
      else msg(`🏮 Roof ${RUN.i} of 4`, .9); } }
  const prevUse3 = T.onUse; T.onUse = o => { if (RUN && o === RUN.sp) { RUN.on = true; RUN.i = 1; RUN.t = 0; msg('🏮 GO! Run the loop of roofs and back here', 2); return true; } return prevUse3 ? prevUse3(o) : false; };

  // ---------- v235 STAGE LINE: signposts at the saloon and inside Chinatown's north gate - pay 40 pts and the stage carries you (and your horse) across ----------
  const STG = (() => { const ts = T.town; if (!ts || !T.toW) return null; const [tx, tz] = T.toW(ts, -9, -12), ty = T.floorAt(tx, tz, 1e9), cx = CX - 7.5, cz = CZ - E + 2;
    const post = (x, y, z, txt) => { const g = new THREE.Group(); g.position.set(x, y, z); const p = new THREE.Mesh(new THREE.CylinderGeometry(.07, .07, 2.4, 6), M.wood); p.position.y = 1.2; g.add(p); const bt = tex(256, 64, (c, w, h) => { c.fillStyle = '#e8d6a8'; c.fillRect(0, 0, w, h); c.fillStyle = '#3a2414'; c.font = 'bold 30px Georgia,serif'; c.textAlign = 'center'; c.fillText(txt, w / 2, 42); }, false); const bd = new THREE.Mesh(new THREE.BoxGeometry(1.5, .38, .05), [M.wood, M.wood, M.wood, M.wood, new THREE.MeshStandardMaterial({ map: bt }), new THREE.MeshStandardMaterial({ map: bt })]); bd.position.y = 2.05; g.add(bd); scene.add(g); return g; };
    post(tx, ty, tz, 'CHINATOWN ➜'); post(cx, y0, cz, '➜ TOWN');
    const a = { x: tx, z: tz, y: ty, kind: 'ct_stage', label: '🐎 Take the stage to Chinatown (40 pts)', r: 2.2, ct: true, to: [CX - 3, CZ - E + 4] }, b = { x: cx, z: cz, y: y0, kind: 'ct_stage', label: '🐎 Take the stage to town (40 pts)', r: 2.2, ct: true, to: [tx + 2, tz] }; T.spots.push(a, b); return [a, b]; })();
  const prevUse4 = T.onUse; T.onUse = o => { if (STG && STG.includes(o)) { if (pay(40)) { const [x, z] = o.to, y = T.floorAt(x, z, 1e9) + .05; if (H.mounted) { H.mounted.pos.set(x, y, z); H.speed = 0; } else P.pos.set(x, y, z); H.vy = 0; msg('🐎 The stage rattles off... and you\'re there', 2.2); const S = st(); S.ctStage = (S.ctStage || 0) + 1; if (sfx.nz && sfx.ctx) sfx.nz('lowpass', 500, 1, .2, .6); } return true; } return prevUse4 ? prevUse4(o) : false; };

  // ---------- per frame ----------
  let welcome = false, nightK = -1, t = 0, roofT = 0, steamT = 0, musT = 2, musI = 3;
  function update(dt) { t += dt; const me = H.mounted ? H.mounted.pos : P.pos, inside = Math.abs(me.x - CX) < E && Math.abs(me.z - CZ) < E; peopleTick(dt, me); dragonTick(dt, me); runTick(dt, me); if (inside && (roofT -= dt) <= 0) { roofT = .5; for (const b of built) { if (me.y < b.y0 + RF - .3) break; const [lx, lz] = T.toL ? T.toL(b, me.x, me.z) : [0, 0]; if (lx > 0 && lx < W && lz > 0 && lz < DP && me.y > b.y0 + RF - .3) { const S = st(), v = new Set(S.ctRoofs || []); if (!v.has(b.name + b.cx.toFixed(0) + b.cz.toFixed(0))) { v.add(b.name + b.cx.toFixed(0) + b.cz.toFixed(0)); S.ctRoofs = [...v]; msg(`🏯 Rooftop ${v.size} of ${built.length}`, 1.6); } } } }
    if (inside && !welcome) { welcome = true; msg('🏮 Chinatown - 唐人街', 3); const S = st(); if (!S.ctVisit) { S.ctVisit = 1; earn(200); setTimeout(() => msg('First visit to Chinatown  +200', 2.5), 2000); } } else if (!inside && Math.hypot(me.x - CX, me.z - CZ) > 90) welcome = false;
    if (nightK > .6 && (H.night || 0) <= .6 && Math.hypot(me.x - CX, me.z - CZ) < 200 && sfx.tone && sfx.ctx) { [0, 2.6, 5.2].forEach(d => setTimeout(() => { sfx.tone('sine', 82, 80, .35, 4); sfx.tone('sine', 164, 160, .12, 3); }, d * 1000)); msg('🔔 The temple bell greets the dawn over Chinatown', 2.5); } /* v234 */
    const n = H.night || 0; if (Math.abs(n - nightK) > .02) { nightK = n; M.lamp.emissiveIntensity = .5 + 3.2 * n; M.paper.emissiveIntensity = .15 + 2.2 * n; M.glass.emissiveIntensity = .06 + 1.2 * n; signM.emissiveIntensity = .05 + .35 * n; gateM.emissiveIntensity = .08 + .4 * n; } { const nt = n > .5; if (nt !== update.nt) { update.nt = nt; for (const o of spots) if (o.kind === 'ct_fire') o.label = nt ? '🎆 Fireworks show over Chinatown (400 pts)' : '🧨 Set off a string of firecrackers (50 pts)'; } }
    if (n > .45 && fx && fx.smoke && Math.hypot(me.x - CX, me.z - CZ) < 70 && (steamT -= dt) <= 0) { steamT = .35; const q = stalls[(Math.random() * stalls.length) | 0]; fx.smoke.emit(q[0] + (Math.random() - .5) * .6, y0 + 1.5, q[1], 0, .6 + Math.random() * .4, 0, .92, .92, .9, .35, 1.6, 1.3, -.01, .15); }
    if (inside && sfx.tone && sfx.ctx && !(DR.on) && (musT -= dt) <= 0) { const PEN = [392, 440, 523, 587, 659, 784, 880]; musT = [.45, .45, .9, .45, 1.35][(Math.random() * 5) | 0]; musI = Math.max(0, Math.min(PEN.length - 1, musI + [-2, -1, -1, 1, 1, 2, 0][(Math.random() * 7) | 0])); const f = PEN[musI]; sfx.tone('triangle', f, f * .995, .028, musT * 1.4); if (Math.random() < .25) sfx.tone('sine', f / 2, f / 2, .02, 1.2); } /* v227 a quiet pentatonic street melody */
    { const hm = H.mounted; if (hm) for (const q of troughs) if (Math.hypot(hm.pos.x - q[0], hm.pos.z - q[1]) < 2.8 && Math.abs(H.speed || 0) < 1) { H.stam = Math.min(100, (H.stam || 0) + 30 * dt); if (hm.hp != null) hm.hp = Math.min(100, hm.hp + 10 * dt); if (!hm.ctDrink || t - hm.ctDrink > 20) { hm.ctDrink = t; msg('🐴 Your horse drinks deep', 1.6); } } }
    if (Math.hypot(me.x - CX, me.z - CZ) < 80) { const m4 = KF.userData.m || (KF.userData.m = new THREE.Matrix4()), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1); koi.forEach((p, j) => { for (let k = 0; k < 3; k++) { const a = t * (.4 + k * .13) * (k % 2 ? -1 : 1) + k * 2.1 + j, r = .35 + k * .18; e.set(0, a + (k % 2 ? 0 : Math.PI), 0); q.setFromEuler(e); m4.compose(v.set(p[0] + Math.cos(a) * r, y0 + .262, p[1] + Math.sin(a) * r), q, one); KF.setMatrixAt(j * 3 + k, m4); } }); KF.instanceMatrix.needsUpdate = true; }
    if (fedT > 0) { fedT -= dt; heal(dt * 1.5); } if (tonicT > 0) { tonicT -= dt; heal(dt * 3); }
    if (crackers) { crackers.t -= dt; if (crackers.t <= 0) { crackers.t = .07 + Math.random() * .08; crackers.n++; const x = crackers.x + (Math.random() - .5) * 1.2, z = crackers.z + (Math.random() - .5) * 1.2, y = (H.town ? H.town.floorAt(x, z, me.y + 1) : hAt(x, z)) + .1;
      if (sfx.nz && sfx.ctx) sfx.nz('highpass', 1800 + Math.random() * 1500, .8, .22, .05); if (fx && fx.smoke) fx.smoke.emit(x, y, z, (Math.random() - .5) * 2, 1 + Math.random(), (Math.random() - .5) * 2, .85, .8, .75, .5, .9, .7, -.02, .3); if (fx && fx.spark) fx.spark(x, y + .1, z); if (crackers.n > 40) crackers = null; } } }
  const info = { x: CX, z: CZ, y: y0, size: 2 * E, buildings: built.length, spots: spots.length };
  H.places && (H.places.chinatown = { x: CX, z: CZ });
  return { update, info, structs: built, root, dragon: () => startDragon() };
}
