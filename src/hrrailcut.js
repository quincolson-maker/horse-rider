// v378 RAILROAD CUTS: the Mountain Line used to spend over half its length in tunnels. Now the terrain itself is cut away along
// the line: a flat bed for the rails and sloped cut walls (like real railroad cuttings and passes), so the train runs under open
// sky almost everywhere. The line's route is the same one hrtrain.js plans (same waypoints, same Catmull-Rom curve) so the cut
// lands under the rails. Heights: a smoothed, grade-limited profile of the ground along the route; the ground is lowered (never
// raised) to that profile within a corridor, with walls rising at ~37 degrees outside it.
import * as THREE from 'three';

const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export function makeRailCut(base, W = 970) {
  let segs = null, grid = null; const C = 40, HALF = 13, SLOPE = .75;
  const key = (i, j) => i * 100003 + j;
  function build() {
    const WP = [[95, -200], [-200, -470], [-500, -520], [-660, -150], [-560, 330], [-250, 630], [150, 660], [520, 520], [640, 120], [560, -150], [430, -330], [260, -320]];
    const curve = new THREE.CatmullRomCurve3(WP.map(([x, z]) => new THREE.Vector3(Math.max(-W, Math.min(W, x)), 0, Math.max(-W, Math.min(W, z)))), true, 'centripetal', .5);
    const n = Math.round(curve.getLength() / 8), loop = curve.getSpacedPoints(n).slice(0, n).map(v => [v.x, v.z]);
    const g = loop.map(([x, z]) => base(x, z)), N = loop.length; let y = g.slice();
    for (let it = 0; it < 3; it++) { const ny = new Array(N); for (let i = 0; i < N; i++) { let a = 0; for (let k = -10; k <= 10; k++) a += y[(i + k + N) % N]; ny[i] = a / 21; } y = ny; }
    for (let i = 0; i < N; i++) y[i] = Math.min(y[i], g[i] + 2); // never ride far above the ground on the profile (trestles stay where valleys are deep)
    const GR = .12 * 8; for (let pass = 0; pass < 6; pass++) { for (let i = 1; i < N * 2; i++) { const a = (i - 1) % N, b = i % N; y[b] = Math.min(y[b], y[a] + GR); } for (let i = N * 2; i > 0; i--) { const a = i % N, b = (i - 1) % N; y[b] = Math.min(y[b], y[a] + GR); } }
    // the spur to Paradise Cove: from the loop point nearest Summit Junction down to the balloon loop by the beach
    let J = 0, bd = 1e18; loop.forEach(([x, z], k) => { const d = (x - 640) ** 2 + (z - 120) ** 2; if (d < bd) { bd = d; J = k; } });
    const sc = new THREE.CatmullRomCurve3([[loop[J][0], loop[J][1]], [700, 112], [790, 92], [880, 98], [960, 140], [1030, 196], [1075, 218]].map(([x, z]) => new THREE.Vector3(x, 0, z)), false, 'centripetal', .5);
    const ns = Math.round(sc.getLength() / 8), spur = sc.getSpacedPoints(ns).map(v => [v.x, v.z]), yJ = y[J], yC = base(1075, 218) + .3;
    const sy = spur.map((_, k) => yJ + (yC - yJ) * sstep(0, 1, k / ns));
    segs = []; const add = (a, b, ya, yb) => { const gm = Math.max(base(a[0], a[1]), base(b[0], b[1]), base((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)), dep = Math.max(0, gm - Math.min(ya, yb)), R = HALF + 20 + dep / SLOPE; segs.push({ ax: a[0], az: a[1], bx: b[0], bz: b[1], ya, yb, R }); };
    for (let i = 0; i < N; i++) add(loop[i], loop[(i + 1) % N], y[i], y[(i + 1) % N]);
    for (let k = 0; k < ns; k++) add(spur[k], spur[k + 1], sy[k], sy[k + 1]);
    for (let k = 0; k < 24; k++) { const a1 = k / 24 * Math.PI * 2, a2 = (k + 1) / 24 * Math.PI * 2; add([1075 + Math.cos(a1) * 32, 250 + Math.sin(a1) * 32], [1075 + Math.cos(a2) * 32, 250 + Math.sin(a2) * 32], yC, yC); } /* the balloon loop */
    grid = new Map(); for (const s of segs) { const i0 = Math.floor((Math.min(s.ax, s.bx) - s.R) / C), i1 = Math.floor((Math.max(s.ax, s.bx) + s.R) / C), j0 = Math.floor((Math.min(s.az, s.bz) - s.R) / C), j1 = Math.floor((Math.max(s.az, s.bz) + s.R) / C); for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) { const k = key(i, j); let b = grid.get(k); if (!b) grid.set(k, b = []); b.push(s); } }
  }
  let building = false; function info(x, z) { if (!segs) { if (building) return null; building = true; build(); building = false; } const b = grid.get(key(Math.floor(x / C), Math.floor(z / C))); if (!b) return null; let cap = Infinity, dmin = Infinity;
    for (const s of b) { const ex = s.bx - s.ax, ez = s.bz - s.az, L = ex * ex + ez * ez, t = L ? Math.max(0, Math.min(1, ((x - s.ax) * ex + (z - s.az) * ez) / L)) : 0, d = Math.hypot(x - s.ax - ex * t, z - s.az - ez * t); if (d > s.R) continue; dmin = Math.min(dmin, d); const ry = s.ya + (s.yb - s.ya) * t, c = ry - .7 + Math.max(0, d - HALF) * SLOPE; if (c < cap) cap = c; }
    return { cap, d: dmin }; }
  const cut = (x, z, h) => { if (x > 1140) return h; const q = info(x, z); return q && q.cap < h ? q.cap : h; };
  const near = (x, z, r = 9) => { const q = info(x, z); return !!q && q.d < r; };
  return { cut, near };
}
