// v44 STABLE UPGRADES (sold at the general store): three tracks, three tiers each, for every horse you ride.
//   Thoroughbred: faster canter / gallop / sprint.   Endurance: the stamina bar drains slower.   Barding: the dead hurt your horse less.
const TRACKS = {
  speed: { icon: '🐎', name: 'Thoroughbred', what: 'top speed', tiers: [[1500, 1.06], [4000, 1.12], [9000, 1.18]], fmt: v => '+' + Math.round((v - 1) * 100) + '% speed' },
  stam: { icon: '💨', name: 'Endurance', what: 'stamina', tiers: [[1000, .78], [3000, .6], [7000, .42]], fmt: v => Math.round((1 - v) * 100) + '% less tiring' },
  armor: { icon: '🛡️', name: 'Barding', what: 'horse armor', tiers: [[1500, .75], [4000, .55], [8000, .38]], fmt: v => Math.round((1 - v) * 100) + '% less damage' },
};
export function createStable({ H, msg, sfx }) {
  let lv = { speed: 0, stam: 0, armor: 0 }; try { Object.assign(lv, JSON.parse(localStorage.getItem('hr_stable') || '{}')); } catch (_) {}
  const save = () => { try { localStorage.setItem('hr_stable', JSON.stringify(lv)); } catch (_) {} };
  const val = (k, def) => lv[k] > 0 ? TRACKS[k].tiers[lv[k] - 1][1] : def;
  const apply = () => { H.horseArmor = val('armor', 1); };
  const items = Object.entries(TRACKS).map(([k, T]) => ({
    state: { id: 'stable-' + k, get name() { const n = lv[k]; const nx = T.tiers[n]; return `${T.icon} ${T.name} ${'★'.repeat(n)}${'☆'.repeat(3 - n)} · ` + (nx ? `next: ${T.fmt(nx[1])}` : `maxed: ${T.fmt(T.tiers[2][1])}`); },
      get price() { const nx = T.tiers[lv[k]]; return nx ? nx[0] : 0; }, owned: false, get maxed() { return lv[k] >= 3; }, equipped: false },
    buy() { const nx = T.tiers[lv[k]], g = H.guns; if (!nx) { msg(`${T.name} is maxed out`, 1.5); return; } if (!g || g.pts() < nx[0]) { msg('Not enough points', 1.5); return; }
      g.state.spent += nx[0]; g.save && g.save(); lv[k]++; save(); apply(); msg(`${T.icon} ${T.name} ${'★'.repeat(lv[k])} — ${T.fmt(nx[1])} for every horse you ride`, 3);
      if (sfx && sfx.ctx && sfx.tone) [523, 659, 784].forEach((f, i) => setTimeout(() => sfx.tone('triangle', f, f, .16, .16), i * 90)); },
    toggle() { this.buy(); } }));
  apply();
  return { items, spd: () => val('speed', 1), drain: () => val('stam', 1), armor: () => val('armor', 1), levels: lv };
}
