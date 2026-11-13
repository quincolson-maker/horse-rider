// v40: some static hosts refuse binary .glb files. When a .glb request does not come back as a real glTF binary, this shim
// loads "<url>.txt" (the same file, base64) instead and hands the loader the decoded bytes. On normal hosts it does nothing.
const _fetch = window.fetch.bind(window);
const isGlb = b => b.byteLength > 12 && new Uint8Array(b, 0, 4).join() === '103,108,84,70'; // "glTF"
window.fetch = async function (input, init) {
  const url = typeof input === 'string' ? input : input && input.url || '';
  if (!/\.glb(\?|$)/.test(url)) return _fetch(input, init);
  try { const r = await _fetch(input, init); if (r.ok) { const b = await r.arrayBuffer(); if (isGlb(b)) return new Response(b, { status: 200, headers: { 'Content-Type': 'model/gltf-binary' } }); } } catch (_) {}
  const t = await _fetch(url.replace(/\?.*$/, '') + '.txt'); if (!t.ok) return t;
  const s = atob((await t.text()).trim()), u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i);
  return new Response(u.buffer, { status: 200, headers: { 'Content-Type': 'model/gltf-binary' } });
};
