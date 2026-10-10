/* ============================================================
   F13LD.vault · geom/design.js
   A stored recipe → the margin function the preview raymarches.

   The geometry files beside this one (tpms, noise, grain, beam, foam,
   voxels, recipe) are F13LD.sweep's geom/ folder copied unchanged, so a
   Vault thumbnail is built by the same code that Sweep solved and Mesh
   prints. Refresh them from F13LD.sweep, never edit them here.

   designGeometry / designMarginFn mirror F13LD.sweep 40-design.js;
   recipeCellScale / recipeCellAspect mirror its preview box sizing.
   Loaded by worker/bake-worker.js only (no DOM).
   ============================================================ */

var VAULT_KERNELS = { tpms: TpmsKernel, noise: NoiseKernel, grain: GrainKernel, beam: BeamKernel, foam: FoamKernel };
var KERNELS = VAULT_KERNELS;   /* geom/recipe.js looks families up by this name */

function designGeometry(recipe) {
  var info = labRecipeInfo(recipe);
  if (!VAULT_KERNELS[info.family]) throw new Error('no preview geometry for family "' + info.family + '" yet');
  var built = labRecipeFromJson(recipe, null, info);
  if (!built.recipe) throw new Error(built.recipeNote || 'recipe could not be read');
  var r = built.recipe;
  var params = VAULT_KERNELS[r.family].parseRecipe(r);
  var a = resolveBuildArgs(r);
  if (r.family === 'beam') params.inX = params.inY = params.inZ = 1 / Math.PI;
  return { family: r.family, params: params, mode: a.mode, offset: a.offset, wt: a.wt,
           nWeights: a.nWeights, pipeR: a.pipeR, phaseShift: a.phaseShift };
}

/* Continuous margin (solid ⟺ m > 0) over solver space [-π, π]³. */
function designMarginFn(geo) {
  return buildVoxelMargin(geo.family, geo.params, geo.offset, 1, geo.mode, geo.wt, geo.nWeights, geo.pipeR, geo.phaseShift, true).fn;
}

function recipeCellScale(recipe, family) {
  var g = recipe.geometry || {};
  if (family === 'tpms') {
    var d = g.cell_scale != null ? g.cell_scale : 1;
    return [g.cell_scale_x != null ? g.cell_scale_x : d, g.cell_scale_y != null ? g.cell_scale_y : d, g.cell_scale_z != null ? g.cell_scale_z : d];
  }
  if (family === 'beam') {
    if (Array.isArray(g.scale_xyz)) return g.scale_xyz.slice();
    var c = g.cell != null ? g.cell : 1.5;
    return [c, c, c];
  }
  return [1, 1, 1];
}

/* Physical edge lengths of one cell, relative (largest = 1), for the preview box. */
function recipeCellAspect(recipe, family) {
  var s = recipeCellScale(recipe, family);
  var e = family === 'tpms' ? s.map(function (v) { return 1 / v; }) : s;
  var m = Math.max(e[0], e[1], e[2]) || 1;
  return e.map(function (v) { return v / m; });
}

/* The margin at N³ voxel centres (x fastest — texImage3D order) plus the
   largest finite-difference slope per unit of the [-1,1] box, which the
   raymarcher divides by so it never over-steps a field that is not a
   true distance. Same as F13LD.sweep bakePreviewField. */
function bakePreviewField(recipe, N) {
  var geo = designGeometry(recipe);
  var m = designMarginFn(geo);
  var L = Math.PI, step = (2 * L) / N;
  var data = new Float32Array(N * N * N);
  for (var iz = 0; iz < N; iz++) {
    var z = -L + (iz + 0.5) * step;
    for (var iy = 0; iy < N; iy++) {
      var y = -L + (iy + 0.5) * step;
      for (var ix = 0; ix < N; ix++) data[(iz * N + iy) * N + ix] = m(-L + (ix + 0.5) * step, y, z);
    }
  }
  var g = 0, h = 2 / N;
  for (var kz = 0; kz < N - 1; kz++) for (var ky = 0; ky < N - 1; ky++) for (var kx = 0; kx < N - 1; kx++) {
    var id = (kz * N + ky) * N + kx, v = data[id];
    var dx = Math.abs(data[id + 1] - v), dy = Math.abs(data[id + N] - v), dz = Math.abs(data[id + N * N] - v);
    var sl = Math.sqrt(dx * dx + dy * dy + dz * dz) / h;
    if (sl > g && isFinite(sl)) g = sl;
  }
  return { N: N, data: data, lip: g > 0 ? g : 1, family: geo.family, half: recipeCellAspect(recipe, geo.family) };
}
