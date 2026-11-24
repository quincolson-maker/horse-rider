// v43 BOUNTY BOARD — a chain of jobs that walks a rider through everything the frontier has, one at a time,
// with a rank that climbs from Greenhorn to Legend. Purely local (each rider has their own board), saved in localStorage.
// Hooks are read-only peeks at the other systems, so nothing else has to know the board exists.
const KEY = 'hr_bounty';
const RANKS = [[0, 'Greenhorn'], [2, 'Drifter'], [4, 'Gunslinger'], [6, 'Deputy'], [8, 'Marshal'], [10, 'Sheriff'], [14, 'Marshal of the Frontier'], [18, 'Living Legend'], [21, 'Legend of the West'], [28, 'Frontier Icon'], [36, 'Myth of the West'], [46, 'Eternal Legend']]; // v198 more ranks for the bigger board
export function createBounty({ H, P, T, msg, sfx, PEN }) {
  let S = { i: 0, base: {}, prog: {}, done: [] }; try { const v = JSON.parse(localStorage.getItem(KEY) || 'null'); if (v && Number.isInteger(v.i)) S = Object.assign(S, v); } catch (_) {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (_) {} };
  if (!H.stats) try { H.stats = JSON.parse(localStorage.getItem('hr_stats') || '{}') || {}; } catch (_) { H.stats = {}; }
  const G = () => H.guns && H.guns.state, kills = () => (G() && G().kills) || 0;
  const tw = () => (T && T.towers) || [];
  const nearTower = () => { let b = null, bd = 1e9; for (const t of tw()) { const d = Math.hypot(t.cx - P.pos.x, t.cz - P.pos.z); if (d < bd) { bd = d; b = t; } } return b; };
  const inCab = () => tw().some(t => { const [x, z] = T.toL(t, P.pos.x, P.pos.z); return Math.abs(x) < 3.5 && Math.abs(z) < 3.5 && P.pos.y > t.y0 + 15; });
  const place = k => { const pl = H.places || {}; return pl[k] ? [pl[k].x, pl[k].z] : null; };
  const killsSince = (id, n) => ({ p: () => Math.min(1, (kills() - (S.base[id] ?? kills())) / n), t: () => `${Math.max(0, Math.min(n, kills() - (S.base[id] ?? kills())))} / ${n}`, start: () => { S.base[id] = kills(); } });
  // [id, title, task, reward, progress 0..1, target for the compass, optional progress text, on-start]
  const JOBS = [
    { id: 'saddle', title: 'Saddle Up', task: 'Ride 300 m on horseback', pay: 150, p: () => Math.min(1, (S.prog.ride || 0) / 300), txt: () => `${Math.round(Math.min(300, S.prog.ride || 0))} / 300 m`, to: () => H.mounted || !PEN ? null : [PEN.x, PEN.z] },
    { id: 'whiskey', title: 'Wet Your Whistle', task: 'Order a whiskey at the saloon', pay: 100, p: () => (S.prog.drinks || 0) > 0 ? 1 : 0, to: () => H.places && H.places.town },
    { id: 'pest', title: 'Pest Control', task: 'Drop 25 zombies', pay: 400, ...killsSince('pest', 25) },
    { id: 'lookout', title: 'Eyes on the Range', task: 'Climb into the cab of a lookout tower', pay: 400, p: () => inCab() ? 1 : 0, to: () => { const t = nearTower(); return t ? [t.cx, t.cz] : null; } },
    { id: 'prospector', title: 'Prospector', task: 'Find 5 glinting gold nuggets out on the range', pay: 300, p: () => Math.min(1, ((H.nuggets && H.nuggets.found) || 0) / 5), txt: () => `${Math.min(5, (H.nuggets && H.nuggets.found) || 0)} / 5`, to: () => { const s = H.nuggets && H.nuggets.nearest(); return s ? [s.x, s.z] : null; } },
    { id: 'derby', title: 'Derby Day', task: 'Ride through the start gate by the pen and finish the Derby', pay: 400, p: () => ((H.stats && H.stats.races) || 0) > 0 ? 1 : 0, to: () => H.raceNext || H.raceStart || null },
    { id: 'home', title: 'Homesteader', task: 'Buy the Ranch Deed at the General Store and visit your ranch', pay: 1000, p: () => H.ranchPos && Math.hypot(P.pos.x - H.ranchPos[0], P.pos.z - H.ranchPos[1]) < 25 ? 1 : 0, to: () => H.ranchPos || (H.places && H.places.town) },
    { id: 'thumb', title: 'Green Thumb', task: 'Build a Garden at your ranch (store) and bring in a harvest', pay: 800, p: () => ((H.stats && H.stats.harvests) || 0) > 0 ? 1 : 0, to: () => H.ranchPos || null },
    { id: 'falls', title: 'Behind the Falls', task: 'Find the outlaw hideout hidden behind a waterfall', pay: 400, p: () => H.cave && H.cave.underP ? 1 : 0, to: () => place('cave') },
    { id: 'justice', title: 'Outlaw Justice', task: 'Clear Bandit Falls of every outlaw (shoot first to start it)', pay: 1500, p: () => H.cave && H.cave.state.phase >= 2 ? 1 : H.cave && H.cave.state.phase === 1 ? .5 : 0, to: () => place('cave') },
    { id: 'diablo', title: 'El Diablo', task: 'Take down El Diablo, the outlaw boss deep in Bandit Falls', pay: 2500, p: () => ((H.stats && H.stats.diablo) || 0) > 0 ? 1 : 0, to: () => place('cave') },
    { id: 'crank', title: 'Crank It', task: 'Claim the hand-crank Gatling from the vault chest', pay: 1000, p: () => G() && G().owned.gatling ? 1 : 0, to: () => place('cave') },
    { id: 'seal', title: 'Sunseeker', task: 'Push open the seal of the Hollow Sun temple', pay: 500, p: () => H.temple && H.temple.temple.doors[0].target > 0 ? 1 : 0, to: () => place('temple') },
    { id: 'sun', title: 'Keeper of the Sun', task: 'Solve the three seals and claim the Sun Pyramid', pay: 5000, p: () => H.temple && H.temple.claims.sun ? 1 : 0, txt: () => { const st = H.temple && H.temple.temple.state; return st ? `${['mirror', 'glyph', 'weight'].filter(k => st[k]).length} / 3 seals` : ''; }, to: () => place('temple') },
    { id: 'hulk', title: 'Boss Hunter', task: 'Kill the Hulking Dead (he comes every 3rd wave)', pay: 1500, p: () => ((H.stats && H.stats.hulk) || 0) > 0 ? 1 : 0 },
    { id: 'nightrider', title: 'Night Rider', task: 'Drop 20 zombies after dark', pay: 800, p: () => Math.min(1, ((H.stats && H.stats.nightKills) || 0) / 20), txt: () => `${Math.min(20, (H.stats && H.stats.nightKills) || 0)} / 20` + ((H.night || 0) > .5 ? '' : ' · waits for night') },
    { id: 'speedy', title: 'Fast Horse', task: 'Finish the Derby in under 90 seconds', pay: 1000, p: () => (H.stats && H.stats.raceBest || 999) < 90 ? 1 : 0, txt: () => H.stats && H.stats.raceBest ? 'best ' + H.stats.raceBest.toFixed(1) + 's' : '', to: () => H.raceNext || H.raceStart || null },
    { id: 'rival', title: 'Head to Head', task: 'Win a Derby against a buddy (multiplayer)', pay: 800, p: () => ((H.stats && H.stats.raceWins) || 0) > 0 ? 1 : 0, to: () => H.raceStart || null },
    { id: 'shotgun', title: 'Shotgun Rider', task: 'Save the stagecoach from a robbery', pay: 1000, p: () => ((H.stats && H.stats.robberies) || 0) > 0 ? 1 : 0, txt: () => H.robPos ? 'robbery in progress!' : 'waits for a robbery', to: () => H.robPos },
    { id: 'hunter', title: 'Bounty Hunter', task: 'Bring in the outlaw on today\'s wanted poster (by the sheriff)', pay: 1500, p: () => ((H.stats && H.stats.wanted) || 0) > 0 ? 1 : 0, to: () => H.wantedPos },
    { id: 'whisper', title: 'Horse Whisperer', task: 'Tame a wild mustang (walk up slowly on foot, stay close)', pay: 1200, p: () => ((H.stats && H.stats.tamed) || 0) > 0 ? 1 : 0, to: () => H.mustangHome || null },
    { id: 'hunt', title: 'Supper Time', task: 'Hunt 3 deer out on the range', pay: 400, p: () => Math.min(1, ((H.stats && H.stats.deer) || 0) / 3), txt: () => `${Math.min(3, (H.stats && H.stats.deer) || 0)} / 3` },
    { id: 'heist', title: 'The Great Train Robbery', task: 'Gallop beside the EXPRESS car to board it, drop the guards, take the strongbox', pay: 2000, p: () => ((H.stats && H.stats.heists) || 0) > 0 ? 1 : 0, to: () => H.trainPos || null },
    { id: 'fishin', title: "Gone Fishin'", task: 'Catch 5 fish from the dock at Bandit Falls pool', pay: 400, p: () => Math.min(1, ((H.stats && H.stats.fish) || 0) / 5), txt: () => `${Math.min(5, (H.stats && H.stats.fish) || 0)} / 5`, to: () => H.fishSpot || null },
    { id: 'golden', title: 'The Golden Trout', task: 'Land the legendary Golden Trout (3% of bites)', pay: 1500, p: () => ((H.stats && H.stats.golden) || 0) > 0 ? 1 : 0, to: () => H.fishSpot || null },
    { id: 'ghost', title: 'Ghost Buster', task: 'Banish the Ghost Rider (he rides once a night)', pay: 1500, p: () => ((H.stats && H.stats.ghost) || 0) > 0 ? 1 : 0, txt: () => (H.night || 0) > .5 ? '' : 'waits for night', to: () => H.ghostPos },
    { id: 'lamps', title: 'Lamplighter', task: 'Collect all 8 night lanterns around town', pay: 800, p: () => ((H.stats && H.stats.lanternSets) || 0) > 0 ? 1 : 0, txt: () => (H.night || 0) > .5 ? '' : 'waits for night', to: () => H.lanternNear },
    { id: 'boom', title: 'Powder Monkey', task: 'Blow up 15 zombies with dynamite', pay: 700, p: () => Math.min(1, ((H.stats && H.stats.dynKills) || 0) / 15), txt: () => `${Math.min(15, (H.stats && H.stats.dynKills) || 0)} / 15` },
    { id: 'buddy', title: 'Saddle Pals', task: 'Ride double behind a buddy (multiplayer)', pay: 300, p: () => ((H.stats && H.stats.doubles) || 0) > 0 ? 1 : 0 },
    { id: 'gate', title: 'Hold the Gate', task: 'Repel a night raid on a town gate (they come once a night)', pay: 2000, p: () => ((H.stats && H.stats.raids) || 0) > 0 ? 1 : 0, txt: () => H.raid && H.raid.on ? 'RAID ON — defend the gate!' : (H.night || 0) > .5 ? 'stay near town tonight' : 'waits for night' }, // v98
    { id: 'wrangler', title: 'Wrangler', task: 'Rope 5 zombies with the lasso (store, then T / 🪢)', pay: 600, p: () => Math.min(1, ((H.stats && H.stats.lassos) || 0) / 5), txt: () => `${Math.min(5, (H.stats && H.stats.lassos) || 0)} / 5` },
    { id: 'buckshot', title: 'Buckshot', task: 'Drop 25 zombies with the coach gun', pay: 800, p: () => Math.min(1, ((H.stats && H.stats.k_shotgun) || 0) / 25), txt: () => `${Math.min(25, (H.stats && H.stats.k_shotgun) || 0)} / 25` },
    { id: 'tinstar', title: 'Tin Star', task: 'Headshot an armored lawman zombie (they come from wave 4)', pay: 700, p: () => ((H.stats && H.stats.zh_lawman) || 0) > 0 ? 1 : 0 },
    { id: 'popper', title: 'Pop Goes the Bloater', task: 'Burst a bloater from a safe distance', pay: 500, p: () => ((H.stats && H.stats.zk_bloater) || 0) > 0 ? 1 : 0 },
    { id: 'trader', title: 'Horse Trader', task: 'Trade up to a new horse breed at the General Store', pay: 600, p: () => H.breed && H.breed.breed().id !== 'mustang' ? 1 : 0 },
    { id: 'revue', title: 'Opening Night', task: 'Put on the Full Revue in the saloon', pay: 400, p: () => ((H.stats && H.stats.revues) || 0) > 0 ? 1 : 0, to: () => H.places && H.places.town },
    { id: 'roofbar', title: 'Drinks on the Roof', task: 'Climb to the saloon rooftop bar (upstairs side door, outside stair) and order a drink', pay: 400, p: () => ((H.stats && H.stats.roofDrinks) || 0) > 0 ? 1 : 0, to: () => H.places && H.places.town }, // v117
    { id: 'spyglass', title: 'Lookout', task: 'Use the brass telescope on the saloon roof', pay: 250, p: () => ((H.stats && H.stats.scoped) || 0) > 0 ? 1 : 0, to: () => H.places && H.places.town },
    { id: 'armwrestle', title: 'Iron Grip', task: 'Win 3 arm-wrestling matches at the saloon front table', pay: 600, p: () => Math.min(1, ((H.stats && H.stats.armWins) || 0) / 3), txt: () => `${Math.min(3, ((H.stats && H.stats.armWins) || 0))} / 3` },
    { id: 'coyotes', title: 'Varmint Control', task: 'Put down 5 undead coyotes (they run in at night)', pay: 700, p: () => Math.min(1, ((H.stats && H.stats.zk_coyote) || 0) / 5), txt: () => `${Math.min(5, ((H.stats && H.stats.zk_coyote) || 0))} / 5` },
    { id: 'cookout', title: 'Cookout', task: 'Hunt a deer, then cook the venison at your camp fire (Camp kit)', pay: 500, p: () => ((H.stats && H.stats.cooked) || 0) > 0 ? 1 : 0, to: () => H.campPos || null },
    { id: 'panner', title: 'Gold Fever', task: 'Strike gold 3 times panning on the falls shore', pay: 500, p: () => Math.min(1, ((H.stats && H.stats.panned) || 0) / 3), txt: () => `${Math.min(3, ((H.stats && H.stats.panned) || 0))} / 3`, to: () => H.fishSpot || null },
    { id: 'safecracker', title: 'Safecracker', task: 'Crack the General Store safe after dark (back room) and survive the posse', pay: 800, p: () => ((H.stats && H.stats.safes) || 0) > 0 ? 1 : 0, txt: () => (H.night || 0) > .5 ? 'the store is dark' : 'waits for night', to: () => H.places && H.places.town }, // v137
    { id: 'sunset', title: 'Sunset Toast', task: 'Have a drink at the rooftop bar at dusk', pay: 300, p: () => H.stats && H.stats.toastDay ? 1 : 0, to: () => H.places && H.places.town },
    { id: 'shrieker', title: 'Hush Now', task: 'Drop a screamer before it frenzies the horde (wave 3+)', pay: 600, p: () => ((H.stats && H.stats.zk_screamer) || 0) > 0 ? 1 : 0 },
    { id: 'xmarks', title: 'X Marks the Spot', task: 'Dig up buried treasure (treasure map from the store, or fishing)', pay: 600, p: () => ((H.stats && H.stats.treasures) || 0) > 0 ? 1 : 0, to: () => H.treasurePos || null }, // v155
    { id: 'scavenger', title: 'Scavenger', task: 'Pick up 15 things the dead drop (gold teeth, pouches, apples)', pay: 500, p: () => Math.min(1, ((H.stats && H.stats.loot) || 0) / 15), txt: () => `${Math.min(15, (H.stats && H.stats.loot) || 0)} / 15` },
    { id: 'torchlight', title: 'Fire Brigade', task: 'Put out 5 torch-bearer zombies (they come at night)', pay: 600, p: () => Math.min(1, ((H.stats && H.stats.zk_torch) || 0) / 5), txt: () => `${Math.min(5, (H.stats && H.stats.zk_torch) || 0)} / 5` },
    { id: 'sermon', title: 'End of the Sermon', task: 'Put down THE PREACHER (he rises every 6th wave)', pay: 3000, p: () => ((H.stats && H.stats.preacher) || 0) > 0 ? 1 : 0 }, // v161
    { id: 'boothill', title: 'Boot Hill', task: 'Pay your respects at the big cross in the cemetery west of town', pay: 300, p: () => ((H.stats && H.stats.respects) || 0) > 0 ? 1 : 0, to: () => H.bootHill || null }, // v176
    { id: 'highnoon', title: 'High Noon', task: 'Win a duel at the post in the town square', pay: 500, p: () => ((H.stats && H.stats.duels) || 0) > 0 ? 1 : 0, to: () => H.places && H.places.town }, // v187
    { id: 'allaboard', title: 'All Aboard', task: 'Visit all six stations of the Mountain Line', pay: 800, p: () => Math.min(1, ((H.stats && H.stats.stVis) || []).length / 6), txt: () => `${((H.stats && H.stats.stVis) || []).length} / 6` },
    { id: 'miners', title: 'Fire in the Hole', task: 'Put down 5 dynamite miners (wave 3+) — keep your distance', pay: 900, p: () => Math.min(1, ((H.stats && H.stats.zk_miner) || 0) / 5), txt: () => `${Math.min(5, ((H.stats && H.stats.zk_miner) || 0))} / 5` }, /* v219 */
    { id: 'undertaker', title: 'Bury the Undertaker', task: 'Put down The Undertaker (every 9th wave)', pay: 2500, p: () => ((H.stats && H.stats.undertaker) || 0) > 0 ? 1 : 0 },
    { id: 'devil', title: 'Ride the Whirlwind', task: 'Get caught in a dust devil out on the range', pay: 300, p: () => ((H.stats && H.stats.devils) || 0) > 0 ? 1 : 0 },
    { id: 'ctvisit', title: 'Gold Mountain Errand', task: 'Ride to Chinatown and have tea at the tea house', pay: 400, p: () => ((H.stats && H.stats.ctTea) || 0) > 0 ? 1 : 0 }, /* v223 */
    { id: 'ctroof', title: 'Rooftop Lookout', task: 'Climb to the roof of 3 Chinatown buildings', pay: 600, p: () => Math.min(1, ((H.stats && H.stats.ctRoofs) || []).length / 3), txt: () => `${Math.min(3, ((H.stats && H.stats.ctRoofs) || []).length)} / 3` },
    { id: 'ctfire', title: 'Firecracker Night', task: 'Set off firecrackers in Chinatown after dark', pay: 500, p: () => ((H.stats && H.stats.ctFireNight) || 0) > 0 ? 1 : 0 },
    { id: 'ctriddle', title: 'Riddles by Lantern Light', task: 'Solve 3 lantern riddles in Chinatown', pay: 500, p: () => Math.min(1, ((H.stats && H.stats.ctRiddles) || 0) / 3), txt: () => `${Math.min(3, ((H.stats && H.stats.ctRiddles) || 0))} / 3` }, /* v241 */
    { id: 'ctstage', title: 'Stage Passenger', task: 'Ride the stage line between town and Chinatown', pay: 200, p: () => ((H.stats && H.stats.ctStage) || 0) > 0 ? 1 : 0 },
    { id: 'ctrun', title: 'Over the Tiles', task: 'Finish the Chinatown rooftop run', pay: 700, p: () => ((H.stats && H.stats.ctRuns) || 0) > 0 ? 1 : 0 },
    { id: 'ctparcel', title: 'Special Delivery', task: 'Carry a parcel from the saloon signpost to Chinatown\'s goods store in time', pay: 300, p: () => ((H.stats && H.stats.ctParcels) || 0) > 0 ? 1 : 0 }, /* v254 */
    { id: 'ctlion', title: 'Follow the Drums', task: 'Catch a lion dance in Chinatown (it comes 3 minutes after each dragon)', pay: 400, p: () => ((H.stats && H.stats.ctLion) || 0) > 0 ? 1 : 0 }, /* v262 */
    { id: 'cterrand', title: 'The Herbalist\'s Errand', task: 'Bring three wild ginseng roots to the Chinatown herbalist', pay: 300, p: () => ((H.stats && H.stats.ctErrands) || 0) > 0 ? 1 : 0 }, /* v274 */
    { id: 'ctwish', title: 'Make a Wish', task: 'Toss a coin into the bronze urn at Chinatown\'s crossing', pay: 150, p: () => ((H.stats && H.stats.ctWishes) || 0) > 0 ? 1 : 0 }, /* v288 */
    { id: 'cttiles', title: 'Sharp Eyes', task: 'Clear the tile-matching table at a tea house', pay: 300, p: () => ((H.stats && H.stats.ctTileWins) || 0) > 0 ? 1 : 0 },
    { id: 'slayer', title: 'Slayer', task: 'Drop 150 zombies', pay: 3000, ...killsSince('slayer', 150) },
    { id: 'legend', title: 'Legend of the West', task: 'Drop 500 zombies', pay: 10000, ...killsSince('legend', 500) },
  ];
  const rank = () => { let r = RANKS[0][1]; for (const [n, name] of RANKS) if (S.done.length >= n) r = name; return r; };
  const job = () => JOBS.find(j => !S.done.includes(j.id)) || null; // by id: new jobs can be slotted in without breaking saved boards
  // ---- HUD card (tap to fold) ----
  const st = document.createElement('style');
  st.textContent = `#hrBounty{position:fixed;right:12px;top:96px;z-index:30;width:230px;max-width:46vw;font:600 11px/1.3 system-ui,sans-serif;color:#fff;background:linear-gradient(180deg,rgba(26,18,8,.82),rgba(14,10,4,.72));border:1.5px solid #e2b24a;border-radius:10px;padding:6px 9px 7px;box-shadow:0 3px 10px rgba(0,0,0,.45);cursor:pointer;user-select:none;-webkit-user-select:none}
#hrBounty .bh{display:flex;justify-content:space-between;gap:6px;color:#ffd77a;font:800 9.5px/1.2 system-ui,sans-serif;letter-spacing:.08em;text-transform:uppercase}#hrBounty .bt{font:900 13px/1.2 system-ui,sans-serif;margin-top:3px;letter-spacing:.02em}
#hrBounty .bk{opacity:.86;margin-top:1px}#hrBounty .bb{height:4px;border-radius:3px;background:rgba(255,255,255,.18);margin-top:5px;overflow:hidden}#hrBounty .bb i{display:block;height:100%;width:0;background:linear-gradient(90deg,#ffb020,#ffe27a);transition:width .3s}
#hrBounty .bp{display:flex;justify-content:space-between;margin-top:3px;font-size:10px;opacity:.9}#hrBounty.fold .bk,#hrBounty.fold .bb,#hrBounty.fold .bp{display:none}
#hrBounty.pop{animation:hrBp .9s ease-out}@keyframes hrBp{0%{transform:scale(1.12);box-shadow:0 0 26px #ffd23a}100%{transform:scale(1)}}
body.touch #hrBounty{top:calc(max(8px,env(safe-area-inset-top)) + 30px);right:calc(max(8px,env(safe-area-inset-right)) + 2px);width:200px;font-size:10px;padding:5px 8px 6px}body.touch #hrBounty .bt{font-size:12px}
#hrBountyWin{position:fixed;left:50%;top:24%;transform:translateX(-50%);z-index:70;pointer-events:none;text-align:center;color:#fff;font:900 30px/1.1 system-ui,sans-serif;letter-spacing:.04em;text-shadow:0 3px 0 #7a4a00,0 0 18px rgba(255,190,40,.8);opacity:0}
#hrBountyWin small{display:block;font:800 13px/1.4 system-ui,sans-serif;color:#ffe08a;letter-spacing:.18em;text-shadow:0 2px 3px #000}#hrBountyWin.on{animation:hrBw 3.2s ease-out}
@keyframes hrBw{0%{opacity:0;transform:translateX(-50%) scale(.6)}10%{opacity:1;transform:translateX(-50%) scale(1.08)}18%{transform:translateX(-50%) scale(1)}80%{opacity:1}100%{opacity:0;transform:translateX(-50%) translateY(-14px)}}
.hr-ui-open #hrBounty,body.hr-scoped #hrBounty{display:none}`;
  document.head.appendChild(st);
  const el = document.createElement('div'); el.id = 'hrBounty'; el.innerHTML = '<div class="bh"><span>★ Bounty</span><span class="rk"></span></div><div class="bt"></div><div class="bk"></div><div class="bb"><i></i></div><div class="bp"><span class="pt"></span><span class="pay"></span></div>'; document.body.appendChild(el);
  try { if (localStorage.getItem('hr_bfold') === '1') el.classList.add('fold'); } catch (_) {}
  const stop = e => e.stopPropagation(); el.addEventListener('pointerdown', stop); el.addEventListener('touchstart', stop, { passive: true });
  el.addEventListener('click', e => { e.stopPropagation(); el.classList.toggle('fold'); try { localStorage.setItem('hr_bfold', el.classList.contains('fold') ? '1' : '0'); } catch (_) {} });
  { let pref = null; try { pref = localStorage.getItem('hr_bfold'); } catch (_) {} // v74: on phones the card tucks itself away 7 s after a new job shows (until you choose by tapping)
    if (pref === null && matchMedia('(pointer: coarse)').matches) { let t = 0, last = ''; el.addEventListener('click', () => { pref = 'set'; clearTimeout(t); }); const bt = el.querySelector('.bt');
      new MutationObserver(() => { if (pref) return; const now = bt.textContent; if (now === last) return; last = now; el.classList.remove('fold'); clearTimeout(t); t = setTimeout(() => { if (!pref) el.classList.add('fold'); }, 7000); }).observe(bt, { childList: true, characterData: true, subtree: true }); } }
  const win = document.createElement('div'); win.id = 'hrBountyWin'; document.body.appendChild(win);
  const $ = q => el.querySelector(q);
  function fanfare() { const t = (...a) => sfx && sfx.ctx && sfx.tone && sfx.tone(...a); [[784, 0], [988, 110], [1175, 220], [1568, 360]].forEach(([f, d]) => setTimeout(() => t('triangle', f, f, d === 360 ? .5 : .14, .2), d)); setTimeout(() => t('sine', 392, 392, .6, .12), 360); }
  function startJob() { const j = job(); if (j && j.start && S.base[j.id] === undefined) j.start(); save(); }
  function complete(j) { S.done.push(j.id); const g = G(); if (g) { g.score += j.pay; H.guns.save && H.guns.save(); } H.lb && H.lb.add(j.pay);
    const before = rank(); S.i = JOBS.findIndex(q => !S.done.includes(q.id)); startJob(); const after = rank(); if (after !== before && H.guns) { const ri = RANKS.findIndex(r => r[1] === after), bonus = 500 * Math.max(1, ri); H.guns.state.score += bonus; H.guns.save && H.guns.save(); setTimeout(() => msg(`⭐ Promoted to ${after}!  +${bonus} rank bonus`, 4), 2500); } /* v153 */
    win.innerHTML = `BOUNTY COMPLETE<small>${j.title.toUpperCase()} · +${j.pay.toLocaleString()} PTS${after !== before ? ' · RANK UP: ' + after.toUpperCase() : ''}</small>`; win.className = ''; void win.offsetWidth; win.className = 'on';
    el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); fanfare(); }
  startJob();
  let lastX = P.pos.x, lastZ = P.pos.z, lastDrinks = T ? T.drinks || 0 : 0, uiT = 0, doneT = 0;
  function update(dt) { const j = job();
    // passive trackers
    const step = Math.hypot(P.pos.x - lastX, P.pos.z - lastZ); if (H.mounted && step < 30) S.prog.ride = (S.prog.ride || 0) + step; lastX = P.pos.x; lastZ = P.pos.z;
    if (T && (T.drinks || 0) > lastDrinks) S.prog.drinks = (S.prog.drinks || 0) + 1; lastDrinks = T ? T.drinks || 0 : 0;
    H.bountyTarget = j && j.to ? j.to() : null;
    if (j && j.p() >= 1) { doneT += dt; if (doneT > .4) { doneT = 0; complete(j); } } else doneT = 0;
    if ((uiT -= dt) > 0) return; uiT = .25; const jj = job(), n = S.done.length;
    $('.rk').textContent = rank() + ' · ' + n + '/' + JOBS.length;
    if (!jj) { $('.bt').textContent = 'All bounties claimed'; $('.bk').textContent = 'You are a Legend of the West. Keep riding.'; $('.bb i').style.width = '100%'; $('.pt').textContent = ''; $('.pay').textContent = ''; return; }
    const pr = Math.max(0, Math.min(1, jj.p())); $('.bt').textContent = jj.title; $('.bk').textContent = jj.task; $('.bb i').style.width = (pr * 100).toFixed(0) + '%';
    $('.pt').textContent = jj.txt ? jj.txt() : pr >= 1 ? 'Done!' : ''; $('.pay').textContent = '+' + jj.pay.toLocaleString() + ' pts';
    if (Math.random() < .02) save(); }
  return { update, rank, get job() { return job(); }, jobs: JOBS, state: S, save, reset() { S = { i: 0, base: {}, prog: {}, done: [] }; startJob(); save(); } };
}
