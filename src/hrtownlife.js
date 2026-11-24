// v56 TOWN LIFE: townsfolk stroll the lanes between the buildings and the palisade, a sheriff keeps the main gate and briefs
// you on your bounty, and a two-horse stagecoach runs a loop between town and the horse pen. All local (no net traffic), all
// asleep when you're far away.
import { mergeStatic } from './hrmerge.js?v=124';
import * as THREE from 'three';
import { makeFrontierCharacter, poseFrontierCharacter } from './hrcharacters.js?v=124';
const FOLK = [
  { sex: 'male', coat: 0x5a4632, top: 0xd8cdb4, hatC: 0x4a3a28, skin: 0x8a5a3c, hair: 0x1a120c },
  { sex: 'female', top: 0xe8dcc6, bodice: 0x2e4a6a, skirt: 0x6a2a3a, skin: 0xf0c6a4, hair: 0x9a5a2a },
  { sex: 'male', coat: 0x2e3a4a, top: 0xeae2d0, hatC: 0x2a2420, skin: 0xd8a882, hair: 0x5a3a20 },
  { sex: 'female', top: 0xf0e6d4, bodice: 0x5a2a20, skirt: 0x2a4a3a, skin: 0x6a4028, hair: 0x140e0a },
  { sex: 'male', coat: 0x6a5a40, top: 0xc8b89a, hatC: 0x8a7050, skin: 0xb07a54, hair: 0x2a1a10 },
  { sex: 'male', coat: 0x3a2a1e, top: 0xd0c4aa, hatC: 0x1a1612, skin: 0x5a3622, hair: 0x0e0a08 },
];
export function createTownLife({ scene, H, P, T, hAt, msg, makeRealHorse, realAnim, PEN, mobile }) {
  const s = T.structs.find(q => q.kind === 'town'); if (!s) return null;
  const CX = -3.5, CZ = 3.6, toW = (x, z) => T.toW(s, x, z), yAt = (x, z) => Math.min(hAt(x, z), s.y0 + .6);
  // lane: a rounded-rect ring halfway between the buildings (19 x 13.5) and the fence (30 x 24)
  const ring = []; { const hx = 24.5, hz = 18.8, r = 4; const C = (cx, cz, a0) => { for (let k = 0; k <= 6; k++) { const a = a0 + k / 6 * Math.PI / 2; ring.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r]); } };
    C(CX + hx - r, CZ + hz - r, 0); C(CX - hx + r, CZ + hz - r, Math.PI / 2); C(CX - hx + r, CZ - hz + r, Math.PI); C(CX + hx - r, CZ - hz + r, Math.PI * 1.5); }
  const segL = ring.map((p, i) => Math.hypot(ring[(i + 1) % ring.length][0] - p[0], ring[(i + 1) % ring.length][1] - p[1])), loop = segL.reduce((a, b) => a + b, 0);
  const at = d => { d = ((d % loop) + loop) % loop; for (let i = 0; i < ring.length; i++) { if (d <= segL[i]) { const a = ring[i], b = ring[(i + 1) % ring.length], k = d / segL[i]; return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]; } d -= segL[i]; } return ring[0]; };
  const folk = FOLK.slice(0, mobile ? 4 : 6).map((o, i) => { const D = makeFrontierCharacter({ kind: 'townsfolk', quality: mobile ? 'low' : 'high', ...o }); scene.add(D.g); try { mergeStatic(D.g); } catch (_) {}
    return { D, d: loop * i / FOLK.length + Math.random() * 6, dir: i % 2 ? 1 : -1, sp: 1.1 + Math.random() * .4, wait: 0 }; });
  // sheriff at the main gate, with a gold star
  const sh = makeFrontierCharacter({ kind: 'sheriff', sex: 'male', quality: mobile ? 'low' : 'high', /* v81: was full detail (111k verts) on phones */ coat: 0x3a2c20, top: 0xe6dcc6, hatC: 0x2a1e14, skin: 0x7a4c30, hair: 0x120c08, bandana: 0x2a2a2a, name: 'Sheriff' });
  { const star = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, .015, 5), new THREE.MeshStandardMaterial({ color: 0xffcf4a, metalness: .6, roughness: .3, emissive: 0x4a3000 })); star.rotation.x = Math.PI / 2; star.position.set(-.1, .18, .14); sh.spine.add(star); }
  const shL = [CX + 5.5, CZ + 21.2], shW = toW(...shL); sh.g.position.set(shW[0], yAt(...shW), shW[1]); sh.g.rotation.y = (s.rot || 0); scene.add(sh.g);
  // v110 rooftop barkeep behind the roof bar counter (wipes the bar, watches you)
  const rk = s.RT ? makeFrontierCharacter({ kind: 'townsfolk', sex: 'male', quality: mobile ? 'low' : 'high', coat: 0x2a2a2e, top: 0xf2ead8, hatC: 0x1a1612, skin: 0xc48c62, hair: 0x2a1a10, bandana: 0x8a1a1a, name: 'Rooftop barkeep' }) : null;
  if (rk) { const w = toW(-5.9, 9.05); rk.g.position.set(w[0], s.y0 + s.RT, w[1]); rk.g.rotation.y = (s.rot || 0) + Math.PI; scene.add(rk.g); try { mergeStatic(rk.g); } catch (_) {} }
  let briefT = 0;
  // stagecoach: a box coach on four spoked wheels, two horses in harness
  const coach = new THREE.Group(), wood = new THREE.MeshStandardMaterial({ color: 0x7a2418, roughness: .7 }), trim = new THREE.MeshStandardMaterial({ color: 0xd8a83a, metalness: .4, roughness: .4 }), dark = new THREE.MeshStandardMaterial({ color: 0x2a1c12, roughness: .8 });
  const bx = (w, h, d, m, x, y, z) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = true; coach.add(b); return b; };
  bx(1.7, 1.4, 2.6, wood, 0, 1.75, 0); bx(1.85, .12, 2.8, dark, 0, 2.5, 0); bx(1.8, .08, 2.7, trim, 0, 1.06, 0); bx(1.2, .5, .9, dark, 0, 1.3, 1.85); for (const sx of [-1, 1]) bx(.02, .6, .7, new THREE.MeshStandardMaterial({ color: 0x1a1410 }), sx * .86, 1.9, 0);
  bx(1.3, .45, 1, dark, 0, 2.78, -.3); const wheels = [];
  for (const [x, z, r] of [[-.95, -.9, .62], [.95, -.9, .62], [-.95, 1.1, .5], [.95, 1.1, .5]]) { const w = new THREE.Mesh(new THREE.TorusGeometry(r, .06, 6, 18), dark); w.rotation.y = Math.PI / 2; w.position.set(x, r, z); coach.add(w); wheels.push([w, r]);
    for (let k = 0; k < 6; k++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(.04, r * 2, .04), trim); sp.rotation.x = k / 6 * Math.PI; w.add(sp); sp.rotation.order = 'YXZ'; sp.rotation.set(0, Math.PI / 2, k / 6 * Math.PI); } }
  const pole = bx(.1, .1, 3.2, dark, 0, .9, 3.4); scene.add(coach);
  const team = []; const hitch = () => { if (team.length || !H.A || !makeRealHorse) return; for (const sx of [-.7, .7]) { const g = makeRealHorse(H.A, sx < 0 ? 1 : 3); scene.add(g); team.push([g, sx]); } }; // horse models load after us: hitch up when they arrive
  // leave by whichever gateway faces the pen, loop round the pen, come back the same side (never through town)
  const gatesOut = [toW(CX, CZ + 33), toW(CX, CZ - 33), toW(CX + 39, CZ), toW(CX - 39, CZ)]; let gateOut = gatesOut[0], gd = 1e9; for (const g of gatesOut) { const d = Math.hypot(g[0] - PEN.x, g[1] - PEN.z); if (d < gd) { gd = d; gateOut = g; } }
  const ux = (PEN.x - gateOut[0]) / (gd || 1), uz = (PEN.z - gateOut[1]) / (gd || 1), nx = -uz, nz = ux;
  const route = [gateOut, [PEN.x - ux * 25 + nx * 30, PEN.z - uz * 25 + nz * 30], [PEN.x + ux * 45 + nx * 18, PEN.z + uz * 45 + nz * 18], [PEN.x + ux * 45 - nx * 18, PEN.z + uz * 45 - nz * 18], [PEN.x - ux * 25 - nx * 30, PEN.z - uz * 25 - nz * 30]];
  let cd = 0, cyaw = 0; const cp = new THREE.Vector3(route[0] ? route[0][0] : 0, 0, route[0] ? route[0][1] : 0);
  const rL = route.map((p, i) => Math.hypot(route[(i + 1) % route.length][0] - p[0], route[(i + 1) % route.length][1] - p[1])), rLoop = rL.reduce((a, b) => a + b, 0) || 1;
  const rAt = d => { d = ((d % rLoop) + rLoop) % rLoop; for (let i = 0; i < route.length; i++) { if (d <= rL[i]) { const a = route[i], b = route[(i + 1) % route.length], k = d / rL[i]; return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]; } d -= rL[i]; } return route[0]; };
  const ctr = toW(CX, CZ), tmp = new THREE.Vector3();
  function update(dt) { const near = Math.hypot(P.pos.x - ctr[0], P.pos.z - ctr[1]) < 170;
    for (const f of folk) { f.D.g.visible = near; if (!near) continue; if (f.wait > 0) { f.wait -= dt; poseFrontierCharacter(f.D, dt, { speed: 0 }); continue; } if (Math.random() < dt * .04) { f.wait = 2 + Math.random() * 5; if (Math.random() < .3) f.dir *= -1; }
      f.d += f.dir * f.sp * dt; const [lx, lz] = at(f.d), [nx, nz] = at(f.d + f.dir * .5), [x, z] = toW(lx, lz), [x2, z2] = toW(nx, nz); f.D.g.position.set(x, yAt(x, z), z); f.D.g.rotation.y = Math.atan2(x2 - x, z2 - z); poseFrontierCharacter(f.D, dt, { speed: f.sp }); }
    if (rk) { const up = near && P.pos.y > s.y0 + s.RT - 3; rk.g.visible = near; if (near) { poseFrontierCharacter(rk, dt, { speed: 0 }); if (up && rk.head) rk.head.rotation.y = Math.max(-.9, Math.min(.9, Math.atan2(P.pos.x - rk.g.position.x, P.pos.z - rk.g.position.z) - rk.g.rotation.y)); if (rk.arms && rk.arms[1]) rk.arms[1][0].rotation.z = Math.sin(H.t * 2.2 || 0) * .25 - .3; } }
    sh.g.visible = near; if (near) { poseFrontierCharacter(sh, dt, { speed: 0 }); const d = Math.hypot(P.pos.x - sh.g.position.x, P.pos.z - sh.g.position.z); briefT = Math.max(0, briefT - dt);
      if (d < 7) { sh.head.rotation.y = Math.max(-.8, Math.min(.8, Math.atan2(P.pos.x - sh.g.position.x, P.pos.z - sh.g.position.z) - sh.g.rotation.y)); }
      if (d < 3.2 && !briefT) { briefT = 25; const j = H.bounty && H.bounty.job; msg(j ? `🤠 Sheriff: "${j.title} — ${j.task}. Pays ${j.pay.toLocaleString()}."` : '🤠 Sheriff: "You\'ve cleaned up this whole territory, Legend."', 5); } }
    if (!route.length) return; hitch(); const coachNear = Math.hypot(P.pos.x - cp.x, P.pos.z - cp.z) < 260; coach.visible = coachNear; for (const [g] of team) g.visible = coachNear;
    const csp = H.coachHalt ? 0 : 7.5; cd += csp * dt; const [x, z] = rAt(cd), [x2, z2] = rAt(cd + 3); cp.set(x, 0, z); const want = Math.atan2(x2 - x, z2 - z); let dy = want - cyaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); cyaw += dy * Math.min(1, dt * 2);
    coach.position.set(x, hAt(x, z), z); coach.rotation.y = cyaw; if (!coachNear) return; for (const [w, r] of wheels) w.rotation.x -= csp * dt / r;
    for (const [g, sx] of team) { tmp.set(sx, 0, 5.4).applyAxisAngle(THREE.Object3D.DEFAULT_UP, cyaw); g.position.set(x + tmp.x, hAt(x + tmp.x, z + tmp.z), z + tmp.z); g.rotation.y = cyaw + Math.PI; realAnim && realAnim(g, dt, csp, false, cd); } }
  return { update, folk, sheriff: sh, coach };
}
