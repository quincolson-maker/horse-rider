// v107 production build: one minified, tree-shaken bundle (game + three.js) instead of ~80 separate module requests.
// Strips the ?v= cache-busting from import paths (the bundle itself is cache-busted from index.html).
import { build } from '/opt/npm-tools/node_modules/esbuild/lib/main.js';
import path from 'path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const strip = { name: 'strip-v', setup(b) {
  b.onResolve({ filter: /^three$/ }, () => ({ path: path.join(root, 'three.module.js') }));
  b.onResolve({ filter: /\?v=/ }, a => ({ path: path.resolve(a.resolveDir, a.path.replace(/\?v=[^'"]*$/, '')) })); } };
const r = await build({ entryPoints: [path.join(root, 'main.js')], bundle: true, minify: true, format: 'esm', target: ['es2020'], outfile: path.join(root, 'app.min.js'), plugins: [strip], legalComments: 'eof', metafile: true, logLevel: 'warning' });
const out = r.metafile.outputs[Object.keys(r.metafile.outputs).find(k => k.endsWith('app.min.js'))];
console.log('app.min.js', (out.bytes / 1024).toFixed(0) + ' KB from', Object.keys(r.metafile.inputs).length, 'modules');
