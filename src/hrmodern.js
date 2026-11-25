// ---------------- v70 modern arms: M4A1-style carbine + MP5-style submachine gun (original procedural models) ----------------
// Units are metres. -Z is forward, +Y up, origin at the trigger. Static parts are merged per material (one draw each);
// the charging / cocking handle (recoil) and the magazine (reload) stay separate so they can move.
import * as THREE from 'three';
import { mergeGeometries } from '../addons/utils/BufferGeometryUtils.js?v=384';

let MM = null;
function modernMats() { if (MM) return MM;
  const grain = (base, n, a, s) => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); x.fillStyle = base; x.fillRect(0, 0, 128, 128); let r = s; const R = () => (r = (r * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < n; i++) { x.fillStyle = `rgba(${R() < .5 ? '255,255,255' : '0,0,0'},${a * R()})`; x.fillRect(R() * 128, R() * 128, 1 + R() * 2, 1 + R() * 2); } const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3); t.colorSpace = THREE.SRGBColorSpace; return t; };
  MM = { anod: new THREE.MeshStandardMaterial({ color: 0x3a3c40, metalness: .5, roughness: .4, map: grain('#e4e4e4', 900, .16, 7) }), // hard-anodised aluminium
    steel: new THREE.MeshStandardMaterial({ color: 0x4a4c50, metalness: .8, roughness: .3 }), // phosphate / blued steel
    poly: new THREE.MeshStandardMaterial({ color: 0x2a2b2d, metalness: .05, roughness: .72, map: grain('#e0e0e0', 1400, .14, 11) }), // textured polymer
    rubber: new THREE.MeshStandardMaterial({ color: 0x1c1c1c, metalness: 0, roughness: .95 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x070707, metalness: .2, roughness: .6 }),
    tan: new THREE.MeshStandardMaterial({ color: 0xb09a72, metalness: .05, roughness: .7, map: grain('#e8e8e8', 900, .14, 3) }),
    brass: new THREE.MeshStandardMaterial({ color: 0xc9a14a, metalness: .85, roughness: .3 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0x9fd0c8, metalness: 0, roughness: .05, transmission: .0, transparent: true, opacity: .22, depthWrite: false }),
    lens: new THREE.MeshStandardMaterial({ color: 0x0a1418, metalness: .9, roughness: .1 }),
    dot: new THREE.MeshBasicMaterial({ color: 0xff2a1a, transparent: true, depthWrite: false, fog: false }) };
  detailize(MM.anod, 'machined', .22, 1); detailize(MM.steel, 'machined', .2, 1); detailize(MM.poly, 'stipple', .3, 1); detailize(MM.tan, 'stipple', .25, 1); detailize(MM.rubber, 'stipple', .35, 1); for (const k of ['anod', 'poly', 'tan']) if (MM[k].map) MM[k].map.repeat.set(1, 1); // v73
  return MM; }
// collect geometry per material, merge at the end
function kit() { const parts = new Map(), E = new THREE.Euler(), Mx = new THREE.Matrix4(), Q = new THREE.Quaternion(), S1 = new THREE.Vector3(1, 1, 1), P = new THREE.Vector3();
  const add = (geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => { E.set(rx, ry, rz); Q.setFromEuler(E); Mx.compose(P.set(x, y, z), Q, S1); const g = (geo.index ? geo.toNonIndexed() : geo.clone()).applyMatrix4(Mx); for (const k of Object.keys(g.attributes)) if (!['position', 'normal'].includes(k)) g.deleteAttribute(k); if (!g.attributes.normal) g.computeVertexNormals(); { const p = g.attributes.position, n = g.attributes.normal, uv = new Float32Array(p.count * 2), T = 40; for (let i = 0; i < p.count; i++) { const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i)); let u, v; if (ax >= ay && ax >= az) { u = p.getZ(i); v = p.getY(i); } else if (ay >= az) { u = p.getX(i); v = p.getZ(i); } else { u = p.getX(i); v = p.getY(i); } uv[i * 2] = u * T; uv[i * 2 + 1] = v * T; } g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); } /* v73: planar UVs at 40 per metre, so detail maps are the same size on every part */ (parts.get(mat) || parts.set(mat, []).get(mat)).push(g); };
  const box = (w, h, d, mat, x, y, z, rx, ry, rz) => add(new THREE.BoxGeometry(w, h, d), mat, x, y, z, rx, ry, rz);
  const cylZ = (r, len, mat, x, y, z, seg = 18, r2) => add(new THREE.CylinderGeometry(r2 ?? r, r, len, seg).rotateX(Math.PI / 2), mat, x, y, z); // along Z
  const cylX = (r, len, mat, x, y, z, seg = 16) => add(new THREE.CylinderGeometry(r, r, len, seg).rotateZ(Math.PI / 2), mat, x, y, z);
  const cylY = (r, len, mat, x, y, z, seg = 14, rx = 0) => add(new THREE.CylinderGeometry(r, r, len, seg), mat, x, y, z, rx);
  // side profile in (forward, up) extruded across X with a small bevel: pts = [[f, y], ...] where f = -z
  const prof = (pts, depth, mat, x = 0, bevel = .0015) => { const s = new THREE.Shape(); pts.forEach(([f, y], i) => i ? s.lineTo(f, y) : s.moveTo(f, y)); s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: depth - bevel * 2, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 6 }); g.translate(0, 0, -(depth - bevel * 2) / 2); g.rotateY(Math.PI / 2); add(g, mat, x, 0, 0); };
  const rail = (len, x, y, z, rz = 0, mat) => { const M = modernMats(); // picatinny: base + 1913-style cross slots
    add(new THREE.BoxGeometry(.021, .006, len), mat || M.anod, x, y, z, 0, 0, rz); const n = Math.floor(len / .01); for (let i = 0; i < n; i++) add(new THREE.BoxGeometry(.021, .0035, .0052), mat || M.anod, x + Math.sin(-rz) * .0045, y + Math.cos(rz) * .0045, z - len / 2 + .005 + i * .01, 0, 0, rz); };
  const done = name => { const g = new THREE.Group(); g.name = name; for (const [m, gs] of parts) { const me = new THREE.Mesh(mergeGeometries(gs), m); me.castShadow = true; g.add(me); } return g; };
  return { add, box, cylZ, cylX, cylY, prof, rail, done }; }
// engraved markings: light text on a transparent plane, stuck to a flat face
function decal(lines, w, h, x, y, z, ry) { const c = document.createElement('canvas'); c.width = 512; c.height = Math.round(512 * h / w); const q = c.getContext('2d'); q.fillStyle = 'rgba(205,205,200,.82)'; const fs = c.height / (lines.length + .6);
  q.font = `600 ${fs * .72}px "Courier New",monospace`; q.textBaseline = 'middle'; lines.forEach((t, i) => q.fillText(t, 8, fs * (i + .8))); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, transparent: true, depthWrite: false, roughness: .6, metalness: .3, polygonOffset: true, polygonOffsetFactor: -3 })); m.position.set(x, y, z); m.rotation.y = ry; m.renderOrder = 3; return m; }
// a curved box magazine (STANAG / MP5 style): stacked slices bent along an arc
function curvedMag(M, w, d, len, bend, slices = 10, ribs = true) { const g = new THREE.Group(), body = [], A = new THREE.Matrix4(), Q = new THREE.Quaternion(), V = new THREE.Vector3(), S = new THREE.Vector3(1, 1, 1), E = new THREE.Euler();
  for (let i = 0; i < slices; i++) { const t0 = i / slices, a = bend * (t0 + .5 / slices), y = -len * (t0 + .5 / slices), f = Math.sin(bend * t0) * len * .35 * (t0 + .3); const s = new THREE.BoxGeometry(w, len / slices * 1.06, d);
    E.set(a, 0, 0); Q.setFromEuler(E); A.compose(V.set(0, y, -f), Q, S); body.push(s.toNonIndexed().applyMatrix4(A)); if (ribs && i % 3 === 1) { const r = new THREE.BoxGeometry(w + .003, .004, d * .8); body.push(r.toNonIndexed().applyMatrix4(A)); } }
  const mesh = new THREE.Mesh(mergeGeometries(body), M.poly); mesh.castShadow = true; g.add(mesh);
  const lip = new THREE.Mesh(new THREE.BoxGeometry(w * .8, .006, d * .7), M.brass); lip.position.set(0, -.002, 0); g.add(lip); // top round showing
  const bp = new THREE.Mesh(new THREE.BoxGeometry(w + .004, .01, d + .006), M.poly); const fe = bend, fy = -len, ff = Math.sin(bend) * len * .35 * 1.3; bp.position.set(0, fy - .002, -ff); bp.rotation.x = fe; bp.castShadow = true; g.add(bp); return g; }

// v88: 200-round twin-drum magazine (C-Mag style): short feed tower, two drums either side, ribbed end caps, smoked windows showing brass
function twinDrum(M) { const g = new THREE.Group(), parts = [], A = new THREE.Matrix4(), Q = new THREE.Quaternion(), V = new THREE.Vector3(), S1 = new THREE.Vector3(1, 1, 1), E = new THREE.Euler(), put = (geo, x, y, z, rx = 0, ry = 0, rz = 0) => { E.set(rx, ry, rz); Q.setFromEuler(E); A.compose(V.set(x, y, z), Q, S1); parts.push(geo.toNonIndexed().applyMatrix4(A)); };
  const R = .052, T = .044, DX = .047, DY = -.105, DZ = -.012, H2 = Math.PI / 2;
  put(new THREE.BoxGeometry(.022, .06, .058), 0, -.03, 0); // feed tower in the magwell
  put(new THREE.BoxGeometry(.05, .03, .06), 0, -.07, -.004); // tower shoulder
  put(new THREE.BoxGeometry(.046, .05, .05), 0, DY, DZ); // centre spine joining the drums
  for (const sx of [-1, 1]) { const x = sx * DX;
    put(new THREE.CylinderGeometry(R, R, T, 32), x, DY, DZ, 0, 0, H2); // drum shell
    for (const e of [-1, 1]) { put(new THREE.CylinderGeometry(R + .002, R + .002, .006, 32), x + e * (T / 2 - .002), DY, DZ, 0, 0, H2); // rolled rim
      for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; put(new THREE.BoxGeometry(.003, .006, .012), x + e * (T / 2 + .001), DY + Math.sin(a) * (R - .012), DZ + Math.cos(a) * (R - .012), a, 0, 0); } } // end-cap ribs
    for (let i = 0; i < 3; i++) put(new THREE.TorusGeometry(R + .0015, .0018, 6, 36), x - T / 3 + i * T / 3, DY, DZ, 0, H2, 0); } // shell bands
  const shell = new THREE.Mesh(mergeGeometries(parts), M.poly); shell.castShadow = true; g.add(shell);
  // winding keys + smoked windows showing the rounds
  const key = new THREE.CylinderGeometry(.013, .013, .012, 6), win = new THREE.CircleGeometry(R * .62, 28), rnd = new THREE.CylinderGeometry(.0042, .0042, .004, 8);
  const smoke = new THREE.MeshPhysicalMaterial({ color: 0x2a2a2a, roughness: .12, transparent: true, opacity: .55, depthWrite: false });
  for (const sx of [-1, 1]) { const x = sx * DX, fx = x + sx * (T / 2 + .004);
    const k = new THREE.Mesh(key, M.steel); k.rotation.z = H2; k.position.set(fx + sx * .004, DY, DZ); g.add(k);
    const rr = []; for (let ring = 0; ring < 2; ring++) for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2 + ring * .2, rad = R * (.5 - ring * .17); E.set(0, 0, H2); Q.setFromEuler(E); A.compose(V.set(fx - sx * .003, DY + Math.sin(a) * rad, DZ + Math.cos(a) * rad), Q, S1); rr.push(rnd.clone().toNonIndexed().applyMatrix4(A)); }
    g.add(new THREE.Mesh(mergeGeometries(rr), M.brass));
    const w = new THREE.Mesh(win, smoke); w.rotation.y = sx * H2; w.position.set(fx, DY, DZ); w.renderOrder = 3; g.add(w); }
  return g; }

// ---------------- M4A1-style carbine ----------------
export function buildM4() { const M = modernMats(), K = kit(), BY = .035;
  // lower receiver: trigger housing + flared magwell + rear takedown lug
  K.prof([[-.075, .02], [.12, .02], [.12, -.012], [.108, -.018], [.108, -.072], [.036, -.074], [.032, -.02], [-.02, -.02], [-.046, -.04], [-.075, -.04]], .026, M.anod);
  K.box(.03, .006, .07, M.anod, 0, -.072, -.072); // magwell flare
  K.box(.004, .012, .05, M.dark, .0135, -.03, -.075); K.box(.004, .012, .05, M.dark, -.0135, -.03, -.075); // magwell panel lines
  K.cylX(.0048, .03, M.steel, 0, .008, .112); K.cylX(.0048, .03, M.steel, 0, .008, -.06); // takedown pins
  K.cylX(.0062, .006, M.steel, -.016, -.004, -.018); K.box(.003, .004, .016, M.steel, -.019, -.004, -.026); // selector + lever
  K.cylX(.0055, .005, M.steel, .015, -.016, -.03); // mag release button
  K.box(.003, .022, .003, M.steel, 0, -.03, .0); // trigger
  K.add(new THREE.TorusGeometry(.019, .0028, 6, 16, Math.PI).rotateY(Math.PI / 2), M.anod, 0, -.026, .008, Math.PI, 0, 0); // trigger guard
  // pistol grip (A2 style with the finger swell)
  K.prof([[.012, -.018], [-.018, -.018], [-.044, -.105], [-.032, -.118], [-.004, -.112], [.004, -.07], [.0, -.06], [.006, -.04]], .028, M.poly);
  for (let i = 0; i < 5; i++) K.box(.03, .0022, .004, M.poly, 0, -.05 - i * .012, .028 + i * .0055, -.32);
  // upper receiver + flat-top rail + forward assist + ejection port + brass deflector
  K.prof([[-.08, .02], [.128, .02], [.128, .052], [.118, .058], [-.072, .058], [-.08, .05]], .028, M.anod);
  K.rail(.2, 0, .061, -.025);
  K.box(.006, .014, .05, M.dark, .0142, .036, -.035); K.box(.002, .016, .052, M.anod, .0158, .036, -.035); // ejection port + dust cover
  K.box(.012, .012, .012, M.anod, .016, .036, .005); // brass deflector
  K.cylZ(.0065, .03, M.steel, .021, .046, .035, 12); K.cylZ(.0085, .006, M.steel, .021, .046, .05, 12); // forward assist
  // buffer tube + collapsible stock (six-position, cheek riser)
  K.cylZ(.0145, .19, M.anod, 0, .02, .17, 20); // tube from z .075 back to .265
  K.cylZ(.0175, .012, M.anod, 0, .02, .08, 20); // castle nut
  K.prof([[-.17, .046], [-.3, .052], [-.312, .044], [-.312, -.068], [-.3, -.075], [-.282, -.075], [-.25, -.02], [-.17, .0]], .038, M.poly);
  K.box(.042, .006, .1, M.poly, 0, .047, .235); K.box(.044, .135, .012, M.rubber, 0, -.012, .315); // cheek riser + butt pad
  for (let i = 0; i < 6; i++) K.box(.002, .004, .006, M.dark, -.0146, .028, .14 + i * .018); // position holes
  // quad-rail handguard + rail covers
  const HZ0 = -.13, HL = .19, HZ = HZ0 - HL / 2;
  K.box(.034, .034, HL, M.anod, 0, BY, HZ); for (const [rz, dx, dy] of [[0, 0, .02], [Math.PI, 0, -.02], [-Math.PI / 2, .02, 0], [Math.PI / 2, -.02, 0]]) K.rail(HL - .01, dx, BY + dy, HZ, rz);
  K.cylZ(.0215, .016, M.steel, 0, BY, HZ0 + .005, 22); // delta ring
  for (let i = 0; i < 3; i++) K.box(.036, .036, .003, M.dark, 0, BY, HZ0 - .03 - i * .06); // rail gaps
  // barrel, A-frame front sight, birdcage flash hider
  K.cylZ(.0074, .17, M.steel, 0, BY, -.405, 16); K.cylZ(.0095, .012, M.steel, 0, BY, -.33, 16);
  K.prof([[.328, BY + .006], [.348, BY + .006], [.342, BY + .052], [.334, BY + .052]], .009, M.steel); K.box(.0022, .016, .0022, M.steel, 0, BY + .06, -.338); // front sight post
  K.add(new THREE.TorusGeometry(.009, .0028, 6, 14).rotateX(0), M.steel, 0, BY + .055, -.338, 0, Math.PI / 2, 0); // post ears
  K.cylZ(.0105, .05, M.steel, 0, BY, -.515, 16); for (let i = 0; i < 4; i++) K.box(.0035, .0035, .028, M.dark, Math.cos(i * 1.57 + .78) * .0098, BY + Math.sin(i * 1.57 + .78) * .0098, -.512);
  K.add(new THREE.CircleGeometry(.0058, 12), M.dark, 0, BY, -.5405, 0, Math.PI, 0);
  // holographic sight (generic): base, hood, two windows, battery cap + buttons; red reticle ring
  K.box(.03, .008, .07, M.anod, 0, .068, -.05); K.box(.034, .03, .006, M.anod, 0, .09, -.017); K.box(.034, .03, .006, M.anod, 0, .09, -.083);
  K.box(.004, .036, .07, M.anod, .0165, .093, -.05); K.box(.004, .036, .07, M.anod, -.0165, .093, -.05); K.box(.034, .004, .072, M.anod, 0, .112, -.05);
  K.cylX(.007, .014, M.anod, .023, .074, -.035); K.box(.005, .006, .006, M.rubber, -.018, .075, -.03); K.box(.005, .006, .006, M.rubber, -.018, .075, -.045);
  // vertical fore grip + laser / illuminator box (tan) on the right rail
  K.cylY(.0125, .07, M.poly, 0, BY - .058, -.24, 14); K.box(.02, .01, .03, M.poly, 0, BY - .024, -.24);
  K.box(.024, .028, .06, M.tan, .034, BY + .002, -.25); K.cylZ(.006, .004, M.lens, .034, BY + .006, -.282); K.cylZ(.0045, .004, M.lens, .034, BY - .006, -.282);
  // sling loops
  K.add(new THREE.TorusGeometry(.009, .002, 5, 12), M.steel, -.02, .02, .09, 0, Math.PI / 2, 0); K.add(new THREE.TorusGeometry(.009, .002, 5, 12), M.steel, -.022, BY, -.15, 0, Math.PI / 2, 0);
  // v73 detail: folding rear sight, flip-to-side magnifier, bolt catch, dust-cover hinge, rail ladder covers, handguard screws, stock latch
  K.box(.018, .01, .028, M.anod, 0, .07, .058); K.add(new THREE.TorusGeometry(.0045, .0016, 6, 14), M.anod, 0, .078, .052, Math.PI / 2 - .2, 0, 0); // BUIS folded
  K.box(.016, .012, .032, M.anod, 0, .07, .018); K.box(.012, .03, .012, M.anod, -.016, .085, .018, 0, 0, .7); // magnifier mount + flip arm
  K.cylZ(.0165, .085, M.anod, -.034, .1, .02, 22); K.cylZ(.0185, .012, M.rubber, -.034, .1, .065, 22); K.cylZ(.0175, .006, M.anod, -.034, .1, -.022, 22); K.cylX(.0045, .008, M.anod, -.034, .1 + .018, .03, 10); // magnifier tube, eyecup, objective ring, diopter
  K.box(.004, .018, .012, M.steel, -.0148, .004, -.035); K.box(.004, .008, .02, M.steel, -.0148, .018, -.038); // bolt catch paddle
  K.cylZ(.0016, .054, M.steel, .0164, .027, -.035, 8); // dust cover hinge
  for (const sd of [-1, 1]) for (let i = 0; i < 8; i++) K.box(.004, .022, .012, M.rubber, sd * .0245, BY, HZ0 - .022 - i * .02); // ladder rail covers
  for (const sd of [-1, 1]) for (const z of [HZ0 - .01, HZ0 - HL + .01]) K.cylX(.0028, .003, M.steel, sd * .0185, BY - .012, z, 8); // handguard screws
  K.box(.01, .006, .03, M.poly, 0, -.006, .205); K.box(.026, .004, .016, M.poly, 0, .05, .3); // stock latch lever + sling slot bar
  K.cylZ(.0115, .006, M.steel, 0, BY, -.338, 16); K.box(.003, .018, .004, M.steel, 0, BY - .016, -.338); // gas block / FSB band, bayonet lug
  const g = K.done('M4A1 carbine');
  g.add(decal(['SAFE', '', 'SEMI', '', 'AUTO'], .016, .03, -.0136, -.002, -.03, -Math.PI / 2)); g.add(decal(['M4A1 CARBINE', 'CAL 5.56 MM', 'SER 0711-52'], .055, .024, -.0137, -.02, -.07, -Math.PI / 2)); g.add(decal(['5.56 NATO'], .03, .007, .0145, .045, .06, Math.PI / 2));
  // glass + reticle (separate: transparent / unlit)
  for (const z of [-.019, -.081]) { const gl = new THREE.Mesh(new THREE.PlaneGeometry(.028, .026), M.glass); gl.position.set(0, .093, z); gl.renderOrder = 4; g.add(gl); }
  const ret = new THREE.Mesh(new THREE.RingGeometry(.0034, .0042, 24), M.dot); ret.position.set(0, .093, -.08); ret.rotation.y = Math.PI; const rd = new THREE.Mesh(new THREE.CircleGeometry(.0007, 8), M.dot); rd.position.set(0, .093, -.0801); rd.rotation.y = Math.PI; g.add(ret, rd); ret.renderOrder = rd.renderOrder = 5;
  const bolt = new THREE.Group(); { const ch = new THREE.Mesh(new THREE.BoxGeometry(.008, .006, .05), M.anod); ch.position.set(0, .0, 0); const t = new THREE.Mesh(new THREE.BoxGeometry(.036, .006, .008), M.anod); t.position.set(0, 0, .026); bolt.add(ch, t); } bolt.position.set(0, .056, .098); g.add(bolt); // charging handle
  const mag = twinDrum(M); mag.position.set(0, -.015, -.072); g.add(mag); // v88: 200-round twin drum
  g.traverse(o => { if (o.isMesh && o.material !== M.glass && o.material !== M.dot) o.castShadow = true; });
  return { group: g, muzzle: new THREE.Vector3(0, BY, -.545), ejectionPort: new THREE.Vector3(.018, .036, -.035), bolt, mag, kind: 'm4', boltZ: .12 }; }

// ---------------- MP5-style submachine gun ----------------
export function buildMP5() { const M = modernMats(), K = kit(), BY = .03;
  // stamped receiver tube with the HK-style top ridge and side flutes
  K.cylZ(.021, .32, M.steel, 0, BY + .004, -.045, 24); K.box(.03, .012, .3, M.steel, 0, BY + .022, -.045); K.box(.026, .006, .26, M.steel, 0, BY + .03, -.05);
  for (const x of [-.0205, .0205]) K.box(.002, .006, .22, M.dark, x, BY + .0, -.05); // flutes
  K.box(.006, .014, .045, M.dark, .0205, BY + .01, -.02); // ejection port
  // cocking tube over the barrel + angled cocking handle (left)
  K.cylZ(.0095, .25, M.steel, 0, BY + .03, -.3 + .125 - .0, 16); // from -.05 forward to -.3
  // front sight: hooded post on a ring over the cocking tube
  K.add(new THREE.TorusGeometry(.012, .003, 6, 18), M.steel, 0, BY + .062, -.29); K.box(.008, .02, .012, M.steel, 0, BY + .045, -.29); K.box(.002, .012, .002, M.steel, 0, BY + .059, -.29);
  // rear diopter drum
  K.add(new THREE.TorusGeometry(.0088, .0045, 8, 20), M.steel, 0, BY + .058, .085); K.box(.022, .02, .016, M.steel, 0, BY + .037, .085); // diopter: you look through the ring
  K.box(.002, .006, .002, M.steel, 0, BY + .05, .085);
  // barrel + 3-lug tip
  K.cylZ(.0078, .13, M.steel, 0, BY, -.265, 16); for (let i = 0; i < 3; i++) K.box(.004, .004, .016, M.steel, Math.cos(i * 2.09) * .0082, BY + Math.sin(i * 2.09) * .0082, -.31);
  K.add(new THREE.CircleGeometry(.005, 12), M.dark, 0, BY, -.3305, 0, Math.PI, 0);
  // slim polymer handguard
  { const hg = new THREE.CylinderGeometry(.019, .021, .14, 20).rotateX(Math.PI / 2); hg.scale(1, 1.15, 1); K.add(hg, M.poly, 0, BY - .004, -.19); for (let i = 0; i < 6; i++) K.box(.042, .0025, .006, M.poly, 0, BY - .02, -.14 - i * .018); }
  // magwell + paddle release
  K.box(.026, .03, .05, M.steel, 0, BY - .03, -.085); K.box(.012, .004, .016, M.steel, 0, BY - .046, -.054);
  // polymer trigger group with ergonomic grip + ambidextrous selector
  K.prof([[-.02, BY - .018], [.08, BY - .018], [.08, BY - .036], [.03, BY - .04], [.016, BY - .05], [.0, BY - .05], [-.02, BY - .036]], .03, M.poly);
  K.prof([[.012, BY - .04], [-.016, BY - .04], [-.04, BY - .132], [-.026, BY - .142], [.004, BY - .134], [.01, BY - .09], [.004, BY - .075], [.012, BY - .06]], .03, M.poly);
  for (let i = 0; i < 5; i++) K.box(.032, .0022, .005, M.poly, 0, BY - .068 - i * .013, .024 + i * .005, -.3);
  K.add(new THREE.TorusGeometry(.017, .0028, 6, 16, Math.PI).rotateY(Math.PI / 2), M.poly, 0, BY - .04, .006, Math.PI, 0, 0); K.box(.003, .02, .003, M.steel, 0, BY - .046, .0);
  for (const x of [-.017, .017]) { K.cylX(.0055, .004, M.steel, x, BY - .028, -.012); K.box(.002, .004, .014, M.steel, x * 1.1, BY - .028, -.02); }
  K.cylX(.004, .034, M.steel, 0, BY - .026, .06); K.cylX(.004, .034, M.steel, 0, BY - .002, .1); // push pins
  // retractable stock: two struts + rubber butt plate
  for (const x of [-.017, .017]) K.cylZ(.0042, .19, M.steel, x, BY + .012, .2, 10); K.box(.04, .014, .02, M.steel, 0, BY + .012, .113);
  K.prof([[-.284, BY + .045], [-.302, BY + .045], [-.304, BY - .09], [-.286, BY - .094], [-.282, BY - .02]], .042, M.steel); K.box(.046, .14, .01, M.rubber, 0, BY - .023, .308);
  // sling loop
  K.add(new THREE.TorusGeometry(.008, .002, 5, 12), M.steel, -.022, BY, .1, 0, Math.PI / 2, 0);
  // v73 detail: weapon-light forend (bezel, lens, pressure pads), receiver spot welds, cocking-tube slot, sling hooks
  K.cylZ(.0245, .03, M.poly, 0, BY - .004, -.265, 22); K.cylZ(.0215, .004, M.steel, 0, BY - .004, -.2815, 22); K.cylZ(.0185, .003, M.lens, 0, BY - .004, -.2832, 22); // light head
  for (const sd of [-1, 1]) K.box(.006, .022, .05, M.rubber, sd * .023, BY - .006, -.2); // pressure pads
  for (const sd of [-1, 1]) for (let i = 0; i < 6; i++) K.cylX(.0022, .002, M.steel, sd * .0212, BY + .014, -.17 + i * .045, 8); // spot welds
  K.box(.0025, .006, .09, M.dark, -.0095, BY + .03, -.2); // cocking handle slot
  K.add(new THREE.TorusGeometry(.007, .0018, 5, 12), M.steel, .022, BY + .01, -.12, 0, Math.PI / 2, 0); // front sling hook
  const g = K.done('MP5 submachine gun');
  g.add(decal(['S', '', 'E', '', 'F'], .01, .034, -.0152, BY - .03, -.008, -Math.PI / 2)); g.add(decal(['MP5   CAL 9MM x19', 'SER 52-0711'], .07, .016, -.0215, BY + .006, -.04, -Math.PI / 2));
  const bolt = new THREE.Group(); { const arm = new THREE.Mesh(new THREE.BoxGeometry(.006, .006, .026), M.steel); arm.rotation.y = -.5; arm.position.set(-.008, 0, 0); const kn = new THREE.Mesh(new THREE.CylinderGeometry(.006, .006, .016, 12).rotateZ(Math.PI / 2), M.poly); kn.position.set(-.02, 0, -.006); bolt.add(arm, kn); } bolt.position.set(-.01, BY + .03, -.27); g.add(bolt);
  const mag = curvedMag(M, .02, .036, .18, .42, 12); mag.position.set(0, BY - .042, -.088); g.add(mag);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return { group: g, muzzle: new THREE.Vector3(0, BY, -.334), ejectionPort: new THREE.Vector3(.022, BY + .01, -.02), bolt, mag, kind: 'mp5', boltZ: -.27 }; }

// ---------------- v73 surface detail: procedural normal + roughness maps (shared by every gun and the kit) ----------------
// height fields drawn on a canvas, turned into tangent-space normals with a Sobel pass; repeat-wrapped
const DT = {};
function heightToNormal(h, w, strength) { const c = document.createElement('canvas'); c.width = c.height = w; const x = c.getContext('2d'), out = x.createImageData(w, w), H = (i, j) => h[((j + w) % w) * w + ((i + w) % w)];
  for (let j = 0; j < w; j++) for (let i = 0; i < w; i++) { const dx = (H(i + 1, j - 1) + 2 * H(i + 1, j) + H(i + 1, j + 1)) - (H(i - 1, j - 1) + 2 * H(i - 1, j) + H(i - 1, j + 1)), dy = (H(i - 1, j + 1) + 2 * H(i, j + 1) + H(i + 1, j + 1)) - (H(i - 1, j - 1) + 2 * H(i, j - 1) + H(i + 1, j - 1));
    let nx = -dx * strength, ny = -dy * strength, nz = 1; const l = Math.hypot(nx, ny, nz); const k = (j * w + i) * 4; out.data[k] = (nx / l * .5 + .5) * 255; out.data[k + 1] = (ny / l * .5 + .5) * 255; out.data[k + 2] = (nz / l * .5 + .5) * 255; out.data[k + 3] = 255; }
  x.putImageData(out, 0, 0); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t; }
function field(w, f) { const h = new Float32Array(w * w); let s = 7; const r = () => (s = (s * 16807) % 2147483647) / 2147483647; f(h, w, r); return h; }
function roughTex(w, f) { const c = document.createElement('canvas'); c.width = c.height = w; const x = c.getContext('2d'); f(x, w); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; }
export function detailTex(kind) { if (DT[kind]) return DT[kind]; const W = 256; let n, r;
  if (kind === 'machined') { n = heightToNormal(field(W, (h, w, r) => { for (let j = 0; j < w; j++) { const row = r() * .5; for (let i = 0; i < w; i++) h[j * w + i] = row + Math.sin(j * .9) * .15 + r() * .08; } }), W, 1.2); // fine lathe / mill lines
    r = roughTex(W, (x, w) => { x.fillStyle = '#7a7a7a'; x.fillRect(0, 0, w, w); let s = 3; const R = () => (s = (s * 16807) % 2147483647) / 2147483647; for (let i = 0; i < 260; i++) { x.fillStyle = `rgba(${R() < .6 ? '20,20,20' : '230,230,230'},${.12 + R() * .2})`; x.beginPath(); x.ellipse(R() * w, R() * w, 2 + R() * 14, 1 + R() * 4, R() * 3, 0, 6.3); x.fill(); } }); } // wear: polished rubs + dull patches
  else if (kind === 'stipple') { n = heightToNormal(field(W, (h, w, r) => { for (let k = 0; k < 2600; k++) { const cx = r() * w, cy = r() * w, rad = 1 + r() * 2.2; for (let j = -3; j <= 3; j++) for (let i = -3; i <= 3; i++) { const d = Math.hypot(i, j); if (d < rad) h[(((cy + j) | 0 + w) % w) * w + (((cx + i) | 0 + w) % w)] += (1 - d / rad) * .6; } } }), W, 2.2);
    r = roughTex(W, (x, w) => { x.fillStyle = '#c8c8c8'; x.fillRect(0, 0, w, w); }); }
  else if (kind === 'grain') { n = heightToNormal(field(W, (h, w, r) => { const ph = []; for (let k = 0; k < 9; k++) ph.push([r() * 6, .02 + r() * .05, r() * .4]); for (let j = 0; j < w; j++) for (let i = 0; i < w; i++) { let v = 0; for (const [p, f, a] of ph) v += Math.sin(j * f * 6 + Math.sin(i * f * .7 + p) * 3 + p) * a; h[j * w + i] = v + r() * .05; } }), W, 1.6);
    r = roughTex(W, (x, w) => { x.fillStyle = '#6a6a6a'; x.fillRect(0, 0, w, w); for (let j = 0; j < w; j += 3) { x.fillStyle = `rgba(255,255,255,${.04 + (j % 7) * .01})`; x.fillRect(0, j, w, 1); } }); }
  else if (kind === 'fabric') { n = heightToNormal(field(W, (h, w, r) => { for (let j = 0; j < w; j++) for (let i = 0; i < w; i++) h[j * w + i] = (Math.sin(i * 1.6) * .5 + .5) * (j % 4 < 2 ? 1 : .4) + (Math.sin(j * 1.6) * .5 + .5) * (i % 4 < 2 ? .4 : 1) + r() * .1; }), W, .9); r = null; }
  return (DT[kind] = { n, r }); }
// add detail to an existing material (normal + optional roughness map), keeping its colour/map
export function detailize(m, kind, scale = .35, rep = 4) { if (!m || !m.isMeshStandardMaterial || m.userData.detail) return m; const d = detailTex(kind); m.normalMap = d.n; m.normalScale = new THREE.Vector2(scale, scale); if (d.r && !m.roughnessMap) m.roughnessMap = d.r;
  for (const t of [m.normalMap, m.roughnessMap]) if (t) t.repeat.set(rep, rep); m.userData.detail = kind; m.needsUpdate = true; return m; }
