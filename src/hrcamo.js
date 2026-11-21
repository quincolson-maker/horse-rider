// v88: gun camo skins, bought at the general store with game points.
// One camo is worn at a time and it paints every gun you own. It is mapped triplanar in each part's own space, so it
// wraps any gun regardless of its UVs. Brass, glass, sights and lights are left alone.
import * as THREE from 'three';

const CAMOS = [
  { id: 'woodland', name: 'Woodland', price: 1500, cols: ['#4b5a32', '#2c3320', '#6b5a3a', '#161a12'], kind: 'blob' },
  { id: 'desert', name: 'Desert tan', price: 1500, cols: ['#c2a676', '#a3865a', '#d9c39a', '#7d6845'], kind: 'blob' },
  { id: 'digital', name: 'Digital urban', price: 2000, cols: ['#8a8d90', '#5c5f63', '#b4b6b8', '#33363a'], kind: 'pixel' },
  { id: 'arctic', name: 'Arctic', price: 2000, cols: ['#e8ecef', '#b9c2c9', '#ffffff', '#7f8a93'], kind: 'blob' },
  { id: 'tiger', name: 'Tiger stripe', price: 2500, cols: ['#5f6b3a', '#1c1f14', '#8a7a48', '#2e3a1e'], kind: 'stripe' },
  { id: 'bloodmoon', name: 'Blood moon', price: 3000, cols: ['#6e0f12', '#1a0607', '#a3161b', '#3a0a0c'], kind: 'stripe' },
  { id: 'cobalt', name: 'Cobalt', price: 3000, cols: ['#1d3f8a', '#0b1a3d', '#3d6fd1', '#132a5e'], kind: 'pixel' },
  { id: 'gilded', name: 'Gilded', price: 6000, cols: ['#c9a14a', '#8a6a24', '#f0d27a', '#5a4416'], kind: 'blob', metal: true },
];

function camoTex(c) { const N = 256, cv = document.createElement('canvas'); cv.width = cv.height = N; const x = cv.getContext('2d'); let seed = c.id.length * 977 + c.price;
  const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  x.fillStyle = c.cols[0]; x.fillRect(0, 0, N, N);
  const wrap = f => { for (const dx of [-N, 0, N]) for (const dy of [-N, 0, N]) { x.save(); x.translate(dx, dy); f(); x.restore(); } }; // tileable
  if (c.kind === 'pixel') { const P = 8; for (let k = 1; k < 4; k++) for (let i = 0; i < 70; i++) { const px = Math.floor(r() * N / P) * P, py = Math.floor(r() * N / P) * P; x.fillStyle = c.cols[k]; for (let j = 0; j < 7; j++) x.fillRect((px + Math.floor(r() * 4) * P) % N, (py + Math.floor(r() * 3) * P) % N, P, P); } }
  else if (c.kind === 'stripe') { for (let k = 1; k < 4; k++) for (let i = 0; i < 16; i++) { const y0 = r() * N, th = 4 + r() * 10, ph = r() * 6; x.fillStyle = c.cols[k];
      wrap(() => { x.beginPath(); x.moveTo(0, y0); for (let t = 0; t <= N; t += 8) x.lineTo(t, y0 + Math.sin(t / 30 + ph) * 12); for (let t = N; t >= 0; t -= 8) x.lineTo(t, y0 + th * (.4 + .6 * Math.abs(Math.sin(t / 22 + ph))) + Math.sin(t / 30 + ph) * 12); x.fill(); }); } }
  else { for (let k = 1; k < 4; k++) for (let i = 0; i < 16; i++) { const cx = r() * N, cy = r() * N, rad = 12 + r() * 24; x.fillStyle = c.cols[k];
      wrap(() => { x.beginPath(); for (let a = 0; a < 6.3; a += .45) { const rr = rad * (.6 + r() * .55); x.lineTo(cx + Math.cos(a) * rr * 1.4, cy + Math.sin(a) * rr); } x.closePath(); x.fill(); }); } }
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.NoColorSpace; t.generateMipmaps = true; t.anisotropy = 4; return t; }

const skip = m => !m || !m.isMeshStandardMaterial || m.transparent || (m.emissive && m.emissiveIntensity > 0 && m.emissive.getHex() !== 0) ||
  (m.metalness >= .85 && m.color && m.color.r - m.color.b > .25); // brass / gold trim stays

export function createCamo({ guns, msg }) {
  const LS = 'hr_camo'; let st = (() => { try { return JSON.parse(localStorage.getItem(LS) || '{}') || {}; } catch (_) { return {}; } })();
  st.owned = st.owned || []; const save = () => { try { localStorage.setItem(LS, JSON.stringify(st)); } catch (_) {} };
  const texes = {}, cache = new Map(); // `${origUuid}|${camoId}` -> painted material
  function painted(orig, c) { const key = orig.uuid + '|' + c.id; let m = cache.get(key); if (m) return m;
    m = orig.clone(); const tex = texes[c.id] || (texes[c.id] = camoTex(c)); const prev = orig.onBeforeCompile;
    m.map = null; m.color = new THREE.Color(1, 1, 1); if (m.clearcoat !== undefined) m.clearcoat = c.metal ? .5 : .15;
    m.metalness = c.metal ? .9 : Math.min(orig.metalness, .2); m.roughness = c.metal ? .28 : Math.max(orig.roughness, .5);
    m.onBeforeCompile = (sh, r) => { if (prev) prev.call(m, sh, r); sh.uniforms.uCamo = { value: tex };
      sh.vertexShader = 'varying vec3 vCamoP;\nvarying vec3 vCamoN;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvCamoP = position; vCamoN = normal;');
      sh.fragmentShader = 'varying vec3 vCamoP;\nvarying vec3 vCamoN;\nuniform sampler2D uCamo;\n' + sh.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\n' +
        '{ vec3 bw = pow(abs(normalize(vCamoN)), vec3(4.0)); bw /= (bw.x + bw.y + bw.z + 1e-4); vec3 p = vCamoP * 15.0;\n' +
        '  vec3 cc = texture2D(uCamo, p.zy).rgb * bw.x + texture2D(uCamo, p.xz).rgb * bw.y + texture2D(uCamo, p.xy).rgb * bw.z;\n' +
        '  diffuseColor.rgb = pow(cc, vec3(2.2)); }'); };
    m.customProgramCacheKey = () => 'camo-' + c.id + (prev ? '-' + (orig.customProgramCacheKey ? orig.customProgramCacheKey() : 'p') : '');
    cache.set(key, m); return m; }
  function paint(group, c) { group.traverse(o => { if (!o.isMesh) return; const ud = o.userData;
      if (ud.camoOrig === undefined) { if (Array.isArray(o.material) || skip(o.material)) { ud.camoOrig = null; return; } ud.camoOrig = o.material; }
      if (!ud.camoOrig) return; o.material = c ? painted(ud.camoOrig, c) : ud.camoOrig; }); }
  const cur = () => CAMOS.find(c => c.id === st.on && st.owned.includes(c.id)) || null;
  function apply() { const c = cur(); for (const m of Object.values(guns.models || {})) if (m && m.group) paint(m.group, c); }
  apply(); setInterval(() => { const w = guns.state.weapon, m = w && guns.models[w]; if (m && cur()) paint(m.group, cur()); }, 1500); // late-loaded parts

  const items = CAMOS.map(c => ({ state: { id: 'camo-' + c.id, name: `🎨 Gun camo · ${c.name} (paints all your guns)`, price: c.price,
      get owned() { return st.owned.includes(c.id); }, get equipped() { return st.on === c.id; }, maxed: false, get label() { return st.owned.includes(c.id) ? (st.on === c.id ? 'REMOVE' : 'EQUIP') : ''; } },
    buy() { if (guns.pts() < c.price) { msg('Not enough points', 1.5); return; } guns.state.spent = (guns.state.spent || 0) + c.price; guns.save(); st.owned.push(c.id); st.on = c.id; save(); apply(); msg(`${c.name} camo on — every gun you own is painted`, 3); },
    toggle() { st.on = st.on === c.id ? null : c.id; save(); apply(); msg(st.on ? c.name + ' camo on' : 'Camo off — factory finish', 1.4); } }));
  return { items, apply, list: CAMOS, state: st };
}
