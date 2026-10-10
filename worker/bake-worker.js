/* ============================================================
   F13LD.vault · worker/bake-worker.js
   Builds a design's preview field off the page:
     { type:'bake', key, recipe, N }  →  { type:'baked', key, N, data, lip, family, half }
                                      or { type:'bake_error', key, message }
   ============================================================ */
importScripts('../geom/tpms.js', '../geom/noise.js', '../geom/grain.js', '../geom/beam.js',
              '../geom/foam.js', '../geom/voxels.js', '../geom/recipe.js', '../geom/design.js');

self.addEventListener('message', function (e) {
  var m = e.data;
  if (!m || m.type !== 'bake') return;
  try {
    var b = bakePreviewField(m.recipe, m.N);
    self.postMessage({ type: 'baked', key: m.key, N: b.N, data: b.data, lip: b.lip, family: b.family, half: b.half }, [b.data.buffer]);
  } catch (err) {
    self.postMessage({ type: 'bake_error', key: m.key, message: (err && err.message) || String(err) });
  }
});
