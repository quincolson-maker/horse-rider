// v330 PARADISE COVE - shared constants, the coast heightfield pad and the surf wave model (pure functions, no imports).
// The same wave formula runs in JS (surf physics) and in the ocean's vertex shader (WAVE_GLSL), driven by the wall clock,
// so every rider sees the same sets roll in. Waves travel toward the shore (-x) with crests set at an angle, so each wave
// breaks first at the north end of the cove and the break PEELS south along the beach - you ride the open shoulder ahead of it.
export const BEACH = { SEA: 70, SHORE: 1128, XB: 1180, XS: 1470, XSH: 1340, ZC: 150, C: 6.5, K: .9, T: 12, NW: 6, Z0: -230, Z1: 530 };
const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a + (b - a) * t;
// the shoreline bends out into two headlands at the ends of the cove
export const shoreX = z => BEACH.SHORE + 150 * sstep(300, 430, Math.abs(z - BEACH.ZC)) + 6 * Math.sin(z * .021) + 4 * Math.sin(z * .053);
export const inCove = (x, z) => x > 880 && Math.abs(z - BEACH.ZC) < 640;
// terrain: blend the eastern mountains down into a jungle-backed beach and a sloping seabed (to the horizon inside the cove's arc)
export function beachPad(x, z, h) {
  const open = Math.max(0, x - 1260) * 1.6, wz = 1 - sstep(390 + open, 640 + open, Math.abs(z - BEACH.ZC)), wx = sstep(870, 1050, x), w = wx * wz; if (w <= 0) return h; /* the sea opens out to the horizon offshore */
  const sh = shoreX(z), S = BEACH.SEA; let t;
  if (x >= sh) t = S - Math.min(26, (x - sh) * .06 + Math.max(0, x - sh - 300) * .03);
  else { const d = sh - x; const sand = Math.min(d, 34) * .075; const hill = d > 34 ? Math.pow((d - 34) / 120, 1.45) * 78 : 0; const bumps = d > 50 ? (Math.sin(x * .045 + z * .03) * 6 + Math.sin(z * .07 - x * .02) * 4) * sstep(50, 140, d) : 0; t = S + sand + hill + bumps; }
  const tm = terraceMask(x, z); if (tm > 0 && x < sh - 50) { const st = 3, t2 = S + 3 + (t - S) * .5, q = Math.floor(t2 / st) * st, f = t2 / st - Math.floor(t2 / st), riser = q + st * sstep(.86, 1, f); t = mix(t, riser, tm); } /* v339 rice terraces stepped into the hill */
  return mix(h, t, w);
}
// v339 the rice terraces: a bowl of hillside at the south end of the cove (like Banaue / Batad)
export const terraceMask = (x, z) => sstep(100, 70, Math.hypot((x - 1025) * 1.1, z - (BEACH.ZC - 255)));
export const depthAt = x => Math.max(0, (x - BEACH.SHORE) * .06);
// ---- the surf (eta above sea level), foam 0..1, broken flag of the nearest wave ----
const frac = v => v - Math.floor(v);
export function surfTime(now = Date.now()) { return (now / 1000) % 3600; }
// v352 the swell changes every day (same for everyone): small and clean some days, big sets on others
export const swellOf = (day = Math.floor(Date.now() / 864e5)) => { const h = ((day * 9301 + 49297) % 233280) / 233280; return .72 + h * .7; };
export const SWELL = { m: swellOf() };
export function waveAt(x, z, t, o) {
  const { XB, XS, XSH, ZC, C, K, T, NW } = BEACH; let eta = 0, foam = 0, near = null, nd = 1e9; const k0 = Math.floor(t / T);
  for (let j = 0; j < NW; j++) { const k = k0 - j, age = t - k * T, base = XS - C * age, amp = (.75 + .6 * frac(k * .618034) + (k % 5 === 0 ? .55 : 0)) * SWELL.m;
    const cx = base - (z - ZC) * K, u = x - cx; if (u < -45 || u > 70) continue;
    const s = Math.max(0, Math.min(1, (XSH - cx) / (XSH - XB)));
    if (cx > XB) { const A = amp * (1 + 2.6 * s * s), w = u < 0 ? mix(9, 2.1, s * s) : mix(15, 9, s); eta += A * Math.exp(-(u * u) / (w * w)); if (s > .85 && u > -2.5 && u < 1.2) foam = Math.max(foam, (s - .85) * 5 * (1 - Math.abs(u + .6) / 2)); if (Math.abs(u) < nd) { nd = Math.abs(u); near = { k, cx, u, A, s, broken: false, amp }; } }
    else { const d = XB - cx, A = amp * 3.1 * .4 * Math.max(.12, 1 - d / 55), w = u < 0 ? 2.2 : 10; eta += A * Math.exp(-(u * u) / (w * w)); foam = Math.max(foam, Math.exp(-((u - 3) * (u - 3)) / 40) * Math.min(1, A * 1.6) + (u > 0 && u < 25 ? .35 * Math.max(0, 1 - d / 70) : 0)); if (Math.abs(u) < nd) { nd = Math.abs(u); near = { k, cx, u, A, s: 1, broken: true, amp, d }; } } }
  const sh = shoreX(z), fade = sstep(sh, sh + 9, x); eta *= fade; foam *= sstep(sh - 1, sh + 3, x);
  eta += (.14 * Math.sin(x * .05 + t * .9) * Math.sin(z * .031 - t * .4) + .05 * Math.sin(x * .21 - t * 1.7 + z * .13)) * sstep(sh, sh + 20, x);
  if (o) { o.eta = eta; o.foam = Math.min(1, foam); o.wave = near; } return eta;
}
// where the break is along z for wave k at time t (the peel point): crest x == XB
export function peelZ(k, t) { const { XB, XS, ZC, C, K, T } = BEACH, base = XS - C * (t - k * T); return ZC + (base - XB) / K; }
export const WAVE_GLSL = `
uniform float uT; uniform float uSwell;
float fr(float v){ return v - floor(v); }
vec2 surfWave(vec2 p){ float eta = 0.0, foam = 0.0; float k0 = floor(uT / ${BEACH.T.toFixed(1)});
  for (int j = 0; j < ${BEACH.NW}; j++) { float k = k0 - float(j); float age = uT - k * ${BEACH.T.toFixed(1)}; float base = ${BEACH.XS.toFixed(1)} - ${BEACH.C.toFixed(2)} * age;
    float amp = (.75 + .6 * fr(k * .618034) + (mod(k, 5.0) < .5 ? .55 : 0.0)) * uSwell; float cx = base - (p.y - ${BEACH.ZC.toFixed(1)}) * ${BEACH.K.toFixed(2)}; float u = p.x - cx;
    if (u < -45.0 || u > 70.0) continue; float s = clamp((${BEACH.XSH.toFixed(1)} - cx) / (${(BEACH.XSH - BEACH.XB).toFixed(1)}), 0.0, 1.0);
    if (cx > ${BEACH.XB.toFixed(1)}) { float A = amp * (1.0 + 2.6 * s * s); float w = u < 0.0 ? mix(9.0, 2.1, s * s) : mix(15.0, 9.0, s); eta += A * exp(-(u * u) / (w * w));
      if (s > .85 && u > -2.5 && u < 1.2) foam = max(foam, (s - .85) * 5.0 * (1.0 - abs(u + .6) / 2.0)); }
    else { float d = ${BEACH.XB.toFixed(1)} - cx; float A = amp * 3.1 * .4 * max(.12, 1.0 - d / 55.0); float w = u < 0.0 ? 2.2 : 10.0; eta += A * exp(-(u * u) / (w * w));
      foam = max(foam, exp(-((u - 3.0) * (u - 3.0)) / 40.0) * min(1.0, A * 1.6) + ((u > 0.0 && u < 25.0) ? .35 * max(0.0, 1.0 - d / 70.0) : 0.0)); } }
  float az = abs(p.y - ${BEACH.ZC.toFixed(1)}); float sh = ${BEACH.SHORE.toFixed(1)} + 150.0 * smoothstep(300.0, 430.0, az) + 6.0 * sin(p.y * .021) + 4.0 * sin(p.y * .053);
  eta *= smoothstep(sh, sh + 9.0, p.x); foam *= smoothstep(sh - 1.0, sh + 3.0, p.x);
  eta += (.14 * sin(p.x * .05 + uT * .9) * sin(p.y * .031 - uT * .4) + .05 * sin(p.x * .21 - uT * 1.7 + p.y * .13)) * smoothstep(sh, sh + 20.0, p.x);
  return vec2(eta, min(foam, 1.0)); }
`;
