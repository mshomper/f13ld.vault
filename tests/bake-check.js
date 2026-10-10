/* node tests/bake-check.js [N] — bakes every fixture recipe through geom/ (as the worker does) and times it. */
const fs = require('fs'), vm = require('vm'), path = require('path');
const ctx = { console, Math, Float32Array, Uint8Array, Int32Array, Float64Array, Array, Object, JSON, isFinite, Number };
vm.createContext(ctx);
['tpms', 'noise', 'grain', 'beam', 'foam', 'wave', 'voxels', 'recipe', 'design'].forEach(f =>
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'geom', f + '.js'), 'utf8'), ctx, { filename: f + '.js' }));
const N = +(process.argv[2] || 32), fx = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'recipes.json'), 'utf8'));
let bad = 0;
for (const k of Object.keys(fx)) {
  if (k[0] === '_') continue;
  ctx.__r = fx[k].recipe; ctx.__N = N;
  const t = Date.now();
  try {
    const b = vm.runInContext('bakePreviewField(__r, __N)', ctx);
    let solid = 0; for (const v of b.data) if (v > 0) solid++;
    console.log(k.padEnd(30), b.family.padEnd(6), ('vf~' + (100 * solid / b.data.length).toFixed(1) + '%').padEnd(10), 'lip ' + b.lip.toFixed(2).padEnd(8), (Date.now() - t) + ' ms');
  } catch (e) { bad++; console.log(k.padEnd(30), 'ERROR', e.message); }
}
process.exit(bad ? 1 : 0);
