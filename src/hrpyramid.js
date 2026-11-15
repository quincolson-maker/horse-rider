// v46 THE HOLLOW SUN, rebuilt outside: a stepped sun pyramid wrapped around the old halls (which are untouched: same
// floors, colliders, doors and puzzles). Everything here is a hollow SHELL: perimeter risers + tread rings + a top cap, so
// nothing intrudes into the halls. The front is one sheer carved wall (the seal sits at its foot) with a hole for the
// corridor; the sides and back step down in five terraces to the ground. Built into the shared static batch (one draw per
// material), plus a handful of animated brazier flames and the big gold sun disc glow.
import * as THREE from 'three';
export const PYR = { IU: 27, IV0: -77, FRONT: -3, WALL: 3.2, HOLE: 7.4, HOLE_H: 14.6,
  tiers: [[12, 4], [9, 8], [6, 12], [3, 16], [.6, 19.6]], top: { u: 19, v0: -69, v1: -12, h: 23 } };
// ground envelope (distance outside the interior rect -> height) that stays under every tread
export function pyramidEnvelope(ds) { const P = [[12, 0], [9, 4], [6, 8], [3, 12], [.6, 16], [0, 18.5]]; if (ds >= 12) return -1e9; if (ds <= 0) return 18.5;
  for (let i = 0; i < P.length - 1; i++) { const [d0, h0] = P[i], [d1, h1] = P[i + 1]; if (ds <= d0 && ds >= d1) return h0 + (h1 - h0) * (d0 - ds) / (d0 - d1); } return 0; }
let FLAME = null;
function flameTex() { if (FLAME) return FLAME; const c = document.createElement('canvas'); c.width = 64; c.height = 128; const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 92, 2, 32, 80, 60); gr.addColorStop(0, 'rgba(255,250,210,1)'); gr.addColorStop(.25, 'rgba(255,200,80,.95)'); gr.addColorStop(.55, 'rgba(255,110,20,.55)'); gr.addColorStop(1, 'rgba(160,30,0,0)');
  g.fillStyle = gr; g.beginPath(); g.moveTo(32, 2); g.bezierCurveTo(58, 50, 60, 100, 32, 126); g.bezierCurveTo(4, 100, 6, 50, 32, 2); g.fill(); FLAME = new THREE.CanvasTexture(c); FLAME.colorSpace = THREE.SRGBColorSpace; return FLAME; }
export function buildPyramid({ group, BATCH, box, slab, cylinder, cone, torus, stone, gold, emit, dark, R, high }) {
  const { IU, IV0, FRONT, WALL, HOLE, HOLE_H, tiers, top } = PYR, T = .9; // riser / tread thickness
  const moss = R.m(new THREE.MeshStandardMaterial({ color: 0x4f6b2c, roughness: .95 })), vine = R.m(new THREE.MeshStandardMaterial({ color: 0x3e5a24, roughness: .9 }));
  const trim = R.m(new THREE.MeshStandardMaterial({ color: 0x8a5a2e, roughness: .8 }));
  let seed = 4242; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const B = (x0, x1, y0, y1, z0, z1, m = stone, g = box) => { if (x1 - x0 < .01 || y1 - y0 < .01 || z1 - z0 < .01) return; BATCH.add(g, m, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0); };
  const fires = [];
  const brazier = (x, y, z, s = 1) => { BATCH.add(cylinder, dark, x, y + .35 * s, z, .55 * s, .7 * s, .55 * s); BATCH.add(cylinder, gold, x, y + .78 * s, z, .75 * s, .16 * s, .75 * s); BATCH.add(cylinder, dark, x, y + .05 * s, z, .7 * s, .1 * s, .7 * s); fires.push([x, y + .85 * s, z, s]); };
  let prevH = -6;
  tiers.forEach(([m, h], k) => { const u = IU + m, v0 = IV0 - m, nx = tiers[k + 1] ? IU + tiers[k + 1][0] : top.u, nv0 = tiers[k + 1] ? IV0 - tiers[k + 1][0] : top.v0;
    const y0 = k ? prevH - T : -6; // risers start just below the tread they stand on, so no seam shows
    // side + back risers (the stepped faces)
    B(-u, -u + WALL, y0, h, v0, FRONT); B(u - WALL, u, y0, h, v0, FRONT); B(-u, u, y0, h, v0, v0 + WALL);
    // front: one sheer wall, holed for the corridor below HOLE_H
    const fz0 = FRONT - WALL, fz1 = FRONT - k * .04; // stacked bands step back a hair (no coplanar faces)
    if (y0 < HOLE_H) { B(-u, -HOLE, y0, Math.min(h, HOLE_H), fz0, fz1); B(HOLE, u, y0, Math.min(h, HOLE_H), fz0, fz1); if (h > HOLE_H) B(-u, u, HOLE_H, h, fz0, fz1); }
    else B(-u, u, y0, h, fz0, fz1);
    // tread ring (top of this terrace, between this riser and the next one in)
    const ty = h - T; B(-u, -nx + .01, ty, h, v0, FRONT); B(nx - .01, u, ty, h, v0, FRONT); B(-nx, nx, ty, h, v0, nv0 + .01);
    if (k === tiers.length - 1) B(-nx, nx, ty, h, top.v1 - .01, FRONT - WALL + .01); // front strip between the wall and the top block
    // cornice: a darker carved ledge on every terrace lip
    B(-u - .25, u + .25, h - .02, h + .28, v0 - .25, v0 + .5, trim); B(-u - .25, -u + .5, h - .02, h + .28, v0, FRONT); B(u - .5, u + .25, h - .02, h + .28, v0, FRONT);
    // moss + vines spilling over the lips
    for (let i = 0; i < (high ? 10 : 5); i++) { const side = rnd() < .5 ? -1 : 1, along = v0 + rnd() * (FRONT - v0), w = .6 + rnd() * 1.6;
      B(side * u - (side > 0 ? .1 : -.1) - .05, side * u + .05 * side + (side > 0 ? .25 : -.25), h - .1, h + .06, along - w, along + w, moss);
      const L = 1.5 + rnd() * (h - prevH - .5); for (let j = 0; j < 3; j++) { const vz = along + (j - 1) * .35; BATCH.add(box, vine, side * (u + .14), h - L / 2, vz, .08, L * (.6 + .4 * rnd()), .12); } }
    // braziers on every terrace corner facing the approach
    if (k < tiers.length) for (const s of [-1, 1]) brazier(s * (u - 1.2), h, FRONT - 1.6, 1);
    prevH = h; });
  // stone plaza in front of the wall, with a broad flight of steps down to the approach
  B(-41, 41, -1.2, .3, FRONT, 12.5); for (let i = 0; i < 4; i++) B(-30 + i * 1.5, 30 - i * 1.5, -1.2 - i * .3, -.26 - i * .3, 12.5 + i * .9, 13.4 + i * .9);
  for (const s of [-1, 1]) for (const x of [14, 24, 34]) { B(s * x - 1, s * x + 1, 0, 1.1, 9.6, 11.6); brazier(s * x, 1.1, 10.6, 1.1); }
  // the crown: top block, its stair, and a small sun shrine
  { const { u, v0, v1, h } = top, y0 = tiers[tiers.length - 1][1] - T; B(-u, u, y0, h, v0, v1); B(-u - .25, u + .25, h - .02, h + .3, v1 - .5, v1 + .25, trim);
    for (let i = 0; i < 6; i++) B(-4, 4, y0 + i * (h - y0) / 6, y0 + (i + 1) * (h - y0) / 6, v1, v1 + 3 - i * .5); // steps up to the shrine
    const sz = -26; B(-6, 6, h, h + .8, sz - 5, sz + 5); for (const x of [-4.6, -1.6, 1.6, 4.6]) BATCH.add(cylinder, stone, x, h + 3.2, sz + 3.6, .55, 4.8, .55); B(-5, 5, h + .8, h + 5.6, sz - 4.6, sz + 2.4);
    B(-6.4, 6.4, h + 5.6, h + 6.4, sz - 5, sz + 4.6, trim); BATCH.add(cone, stone, 0, h + 8.2, sz, 7.4, 3.6, 7.4, 0, Math.PI / 4); brazier(-5.2, h + .8, sz + 4.2, 1.2); brazier(5.2, h + .8, sz + 4.2, 1.2); }
  // carved frieze bands across the front wall (above the seal) + sun disc
  for (let row = 0; row < 3; row++) { const y = 15.2 + row * 1.35; for (let x = -26; x <= 26; x += 2.2) { if (Math.abs(x) < 1.2 && row > 0) continue; B(x - .8, x + .8, y, y + .9, FRONT - .02, FRONT + .14 + (row === 1 ? .1 : 0), (row + Math.round(x / 2.2)) % 2 ? stone : trim); } }
  const disc = new THREE.Group(); disc.position.set(0, 21.4, FRONT + .5); group.add(disc);
  { const R2 = 3.4; BATCH.add(cylinder, gold, 0, 21.4, FRONT + .35, R2, .5, R2, Math.PI / 2); BATCH.add(cylinder, emit, 0, 21.4, FRONT + .62, R2 * .62, .1, R2 * .62, Math.PI / 2);
    for (let j = 0; j < 16; j++) { const a = j / 16 * Math.PI * 2, L = j % 2 ? 1.4 : 2.3; BATCH.add(box, gold, Math.cos(a) * (R2 + L / 2), 21.4 + Math.sin(a) * (R2 + L / 2), FRONT + .4, .32, L, .3, 0, 0, a - Math.PI / 2); } }
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameTex(), color: 0xffc860, transparent: true, opacity: .0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,230,150,.9)'); gr.addColorStop(.45, 'rgba(255,190,70,.35)'); gr.addColorStop(1, 'rgba(255,150,30,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); halo.material.map = new THREE.CanvasTexture(c); halo.material.map.colorSpace = THREE.SRGBColorSpace; }
  halo.scale.set(16, 16, 1); disc.add(halo);
  // flames: one Points cloud (sprite flames, flickering in a tiny shader-free update)
  const fg = new THREE.BufferGeometry(), fp = new Float32Array(fires.length * 3); fires.forEach((f, i) => fp.set([f[0], f[1] + .45 * f[3], f[2]], i * 3)); fg.setAttribute('position', new THREE.BufferAttribute(fp, 3));
  const fm = new THREE.PointsMaterial({ map: flameTex(), size: 2.1, sizeAttenuation: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffd8a0 });
  const flames = new THREE.Points(fg, fm); flames.frustumCulled = false; group.add(flames);
  return { update(t) { fm.size = 1.9 + .35 * Math.sin(t * 11.3) + .2 * Math.sin(t * 17.1); fm.opacity = .85 + .15 * Math.sin(t * 7.7); halo.material.opacity = .55 + .12 * Math.sin(t * 1.3); } };
}
