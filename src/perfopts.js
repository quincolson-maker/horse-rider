// v42u: performance switches. Each extra is OFF by default (max smoothness); Settings > Performance turns any back on (reloads).
export const PERF_ITEMS = [
  ['shadows', '🌑 Sun shadows'],
  ['ao', '🌫️ Corner shading (AO)'],
  ['bloom', '✨ Glow / bloom'],
  ['farMtn', '🏔️ Far mountain range'],
  ['flora', '🌵 Full cacti, brush & trees'],
  ['chaos', '🧟 Full Max Chaos horde'],
  ['fx', '💨 Mist, rainbow, embers & dust'],
  ['grade', '🎨 Color filter'],
  ['lod', '🧍 Detailed far characters'],
  ['voice', '🎙️ Voice chat'],
];
let saved = {};
try { saved = JSON.parse(localStorage.getItem('hr_perf') || '{}') || {}; } catch (_) {}
export const PERF = Object.fromEntries(PERF_ITEMS.map(([k]) => [k, saved[k] === true]));
export function setPerf(k, on) { PERF[k] = !!on; try { localStorage.setItem('hr_perf', JSON.stringify(PERF)); } catch (_) {} }
