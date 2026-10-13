/* ============================================================
   F13LD.vault · 20-filter.js
   The filter engine. One pass over the population per refresh gives:
     · which designs match (d._m) and the sorted result list
     · for every chip, how many designs it would leave ("what-if" counts)
     · for every range slider, the histogram of designs still in play
     · for "Why not?", how many designs each filter alone is excluding
   Each design gets a bitmask of the filters that reject it; counts read
   off the masks, so the cost is O(designs × filters), once per frame at most.
   ============================================================ */

var FX = { dims: [], bit: {}, counts: {}, hist: {}, why: {}, lastMask: null };
var HIST_BINS = 28;

/* Range scale: log for metrics that span decades (DB.log), linear otherwise. */
function rangeScale(k) {
  var st = DB.stats[k] || { min: 0, max: 1 }, lg = !!DB.log[k] && st.min > 0;
  var a = lg ? Math.log(st.min) : st.min, b = lg ? Math.log(st.max) : st.max, span = (b - a) || 1;
  return { lg: lg, min: st.min, max: st.max,
    f: function (v) { return clamp(((lg ? Math.log(Math.max(v, 1e-30)) : v) - a) / span, 0, 1); },
    inv: function (t) { var x = a + clamp(t, 0, 1) * span; return lg ? Math.exp(x) : x; } };
}

function compileFilters() {
  var dims = [], bit = {}, n = 0;
  function add(name) { bit[name] = 1 << n; dims.push(name); n++; }
  ['fam', 'kappa', 'grid', 'flag', 'cflag', 'pois', 'contrib', 'src', 'aim', 'perc', 'region'].forEach(add);
  Object.keys(F.ranges).forEach(function (k) { if (F.ranges[k]) add('r:' + k); });
  F.rangeKeys.forEach(function (k) { if (!bit['r:' + k]) add('r:' + k); });   /* shown sliders get histograms even when open */
  FX.dims = dims; FX.bit = bit;
  return {
    fam: F.fam.length ? new Set(F.fam) : null, kappa: F.kappa.length ? new Set(F.kappa) : null,
    grid: F.grid.length ? new Set(F.grid.map(Number)) : null, flag: F.flag.length ? new Set(F.flag) : null,
    cflag: F.cflag && F.cflag.length ? new Set(F.cflag) : null,   /* v0.11.0 — curvature check */
    pois: F.pois && F.pois.length ? new Set(F.pois) : null,   /* v0.9.0 */
    contrib: F.contrib.length ? new Set(F.contrib) : null,
    src: F.src.length ? new Set(F.src) : null, aim: F.aim.length ? new Set(F.aim) : null,   /* v0.7.1 */
    solid: F.solid.map(function (a) { return 'xyz'.indexOf(a); }), void: F.void.map(function (a) { return 'xyz'.indexOf(a); }),
    region: F.region ? new Set(F.region) : null,
    ranges: Object.keys(F.ranges).filter(function (k) { return F.ranges[k]; }).map(function (k) { return [k, F.ranges[k][0], F.ranges[k][1], bit['r:' + k]]; })
  };
}

function maskOf(d, C) {
  var m = 0, b = FX.bit;
  if (C.fam && !C.fam.has(d.family)) m |= b.fam;
  if (C.kappa && !C.kappa.has(d._kappa)) m |= b.kappa;
  if (C.grid && !C.grid.has(d._grid_N)) m |= b.grid;
  if (C.flag && !C.flag.has(d._stiff_flag)) m |= b.flag;
  if (C.cflag && !C.cflag.has(d._curv_flag)) m |= b.cflag;
  if (C.pois && !C.pois.has(d._pois)) m |= b.pois;
  if (C.contrib && !C.contrib.has(d.contributor_name)) m |= b.contrib;
  if (C.src && !C.src.has(d._aim ? 'aimed' : 'plain')) m |= b.src;
  if (C.aim && !C.aim.has(d._aim || '')) m |= b.aim;
  if (C.solid.length || C.void.length) {
    var bad = false, i;
    for (i = 0; i < C.solid.length; i++) if (!d._sp[C.solid[i]]) bad = true;
    for (i = 0; i < C.void.length; i++) if (!d._vp[C.void[i]]) bad = true;
    if (bad) m |= b.perc;
  }
  if (C.region && !C.region.has(d._id)) m |= b.region;
  for (var r = 0; r < C.ranges.length; r++) { var R = C.ranges[r], v = d[R[0]]; if (!isNum(v) || v < R[1] || v > R[2]) m |= R[3]; }
  return m;
}

function runFilters() {
  var C = compileFilters(), b = FX.bit, N = DB.N;
  var counts = { fam: {}, kappa: {}, grid: {}, flag: {}, cflag: {}, pois: {}, contrib: {}, src: {}, aim: {} }, hist = {}, why = {}, list = [];
  var hk = F.rangeKeys.slice(); Object.keys(F.ranges).forEach(function (k) { if (F.ranges[k] && hk.indexOf(k) < 0) hk.push(k); });
  var hs = {}; hk.forEach(function (k) { hs[k] = rangeScale(k); hist[k] = { all: new Uint32Array(HIST_BINS), on: new Uint32Array(HIST_BINS) }; });
  FX.dims.forEach(function (n) { why[n] = 0; });
  for (var i = 0; i < N; i++) {
    var d = DB.all[i], m = maskOf(d, C);
    d._mask = m;
    d._m = m === 0;
    if (d._m) list.push(d);
    if ((m & ~b.fam) === 0) counts.fam[d.family] = (counts.fam[d.family] || 0) + 1;
    if ((m & ~b.kappa) === 0) counts.kappa[d._kappa] = (counts.kappa[d._kappa] || 0) + 1;
    if ((m & ~b.grid) === 0 && d._grid_N != null) counts.grid[d._grid_N] = (counts.grid[d._grid_N] || 0) + 1;
    if ((m & ~b.flag) === 0) counts.flag[d._stiff_flag] = (counts.flag[d._stiff_flag] || 0) + 1;
    if ((m & ~b.cflag) === 0) counts.cflag[d._curv_flag] = (counts.cflag[d._curv_flag] || 0) + 1;
    if ((m & ~b.pois) === 0) counts.pois[d._pois] = (counts.pois[d._pois] || 0) + 1;
    if ((m & ~b.contrib) === 0 && d.contributor_name) counts.contrib[d.contributor_name] = (counts.contrib[d.contributor_name] || 0) + 1;
    if ((m & ~b.src) === 0) { var sk = d._aim ? 'aimed' : 'plain'; counts.src[sk] = (counts.src[sk] || 0) + 1; }
    if ((m & ~b.aim) === 0 && d._aim) counts.aim[d._aim] = (counts.aim[d._aim] || 0) + 1;
    for (var h = 0; h < hk.length; h++) {
      var k = hk[h], v = d[k]; if (!isNum(v)) continue;
      var bin = Math.min(HIST_BINS - 1, Math.floor(hs[k].f(v) * HIST_BINS));
      hist[k].all[bin]++;
      if ((m & ~(b['r:' + k] || 0)) === 0) hist[k].on[bin]++;
    }
    if (m && (m & (m - 1)) === 0) { for (var q = 0; q < FX.dims.length; q++) if (m === b[FX.dims[q]]) { why[FX.dims[q]]++; break; } }
  }
  FX.counts = counts; FX.hist = hist; FX.why = why;
  sortList(list);
  S.list = list; S.cnt = list.length;
}

/* Sort: by the chosen metric, or by closeness to the target when one is set. */
function sortList(list) {
  var k = S.sort.k, dir = S.sort.dir;
  if (k === '_target') { if (F.target) { list.sort(function (a, b) { return a._tdist - b._tdist; }); return; } k = '_score'; dir = -1; }
  if (k === '_name') { list.sort(function (a, b) { return displayPreset(a).localeCompare(displayPreset(b)) * dir || a._i - b._i; }); return; }
  var pr = pctOf(k);
  list.sort(function (a, b) {
    var va = a[k], vb = b[k], na = !isNum(va), nb = !isNum(vb);
    if (na || nb) return na === nb ? a._i - b._i : (na ? 1 : -1);
    return va === vb ? (pr[a._i] - pr[b._i]) * dir : (va - vb) * dir;
  });
}

/* Active filters as readable entries — dock tags, "Why not?", the drawer. */
function activeFilterList() {
  var T = [];
  if (F.domain !== 'all') T.push({ id: 'domain', dim: null, k: 'Domain', v: DOMAIN_SHORT[F.domain] });
  F.fam.forEach(function (f) { T.push({ id: 'fam:' + f, dim: 'fam', k: 'Family', v: FAMILY_NAME[f] || f }); });
  F.kappa.forEach(function (k) { var c = KAPPA_CLASSES.filter(function (x) { return x.key === k; })[0]; T.push({ id: 'kappa:' + k, dim: 'kappa', k: 'Connect', v: c ? c.label : k }); });
  F.grid.forEach(function (g) { T.push({ id: 'grid:' + g, dim: 'grid', k: 'Grid', v: 'N = ' + g }); });
  F.flag.forEach(function (f) { T.push({ id: 'flag:' + f, dim: 'flag', k: 'Flag', v: (FLAG_VALUES.filter(function (x) { return x[0] === f; })[0] || [0, f])[1] }); });
  (F.cflag || []).forEach(function (f) { T.push({ id: 'cflag:' + f, dim: 'cflag', k: 'Curvature', v: (CFLAG_VALUES.filter(function (x) { return x[0] === f; })[0] || [0, f])[1] }); });
  (F.pois || []).forEach(function (f) { T.push({ id: 'pois:' + f, dim: 'pois', k: 'Poisson', v: (POIS_VALUES.filter(function (x) { return x[0] === f; })[0] || [0, f])[1] }); });
  if (F.solid.length) T.push({ id: 'solid', dim: 'perc', k: 'Solid perc', v: F.solid.join(' ').toUpperCase() });
  if (F.void.length) T.push({ id: 'void', dim: 'perc', k: 'Void perc', v: F.void.join(' ').toUpperCase() });
  Object.keys(F.ranges).forEach(function (k) { var r = F.ranges[k]; if (r) T.push({ id: 'range:' + k, dim: 'r:' + k, k: mShort(k), v: fmtRangeVal(k, r[0]) + ' – ' + fmtRangeVal(k, r[1]) }); });
  F.contrib.forEach(function (c) { T.push({ id: 'contrib:' + c, dim: 'contrib', k: 'By', v: c }); });
  F.src.forEach(function (s) { T.push({ id: 'src:' + s, dim: 'src', k: 'Source', v: s === 'aimed' ? 'Aimed runs' : 'Ordinary sweeps' }); });
  F.aim.forEach(function (a) { var R = DB.aimById && DB.aimById[a]; T.push({ id: 'aim:' + a, dim: 'aim', k: 'Aimed', v: R ? aimLabel(R) : a }); });
  if (F.region) T.push({ id: 'region', dim: 'region', k: 'Region', v: F.region.length + ' designs' });
  if (F.target) T.push({ id: 'target', dim: null, k: 'Target', v: mShort(F.target.kx) + ' ' + fmtRangeVal(F.target.kx, F.target.x) + ' · ' + mShort(F.target.ky) + ' ' + fmtRangeVal(F.target.ky, F.target.y) });
  return T;
}
function fmtRangeVal(k, v) { var r = resolveValue(v, k); return r.isResolved ? r.value + ' ' + r.unit : (k === 'volume_fraction' ? v.toFixed(1) + '%' : fmtNum(v)); }
function filterCount() { return activeFilterList().filter(function (t) { return t.id !== 'target'; }).length; }

/* Remove one filter by its tag id. */
function removeFilter(id) {
  var p = id.split(':'), dim = p[0], v = p.slice(1).join(':');
  if (dim === 'domain') { setDomain('all'); return; }
  if (dim === 'fam' || dim === 'kappa' || dim === 'flag' || dim === 'cflag' || dim === 'pois' || dim === 'contrib' || dim === 'src' || dim === 'aim') F[dim] = F[dim].filter(function (x) { return x !== v; });
  else if (dim === 'grid') F.grid = F.grid.filter(function (x) { return String(x) !== v; });
  else if (dim === 'solid' || dim === 'void') F[dim] = [];
  else if (dim === 'range') { delete F.ranges[v]; }
  else if (dim === 'region') F.region = null;
  else if (dim === 'target') F.target = null;
  changed('remove ' + dim, false);
}

/* Why not? — filters ranked by how many designs each one alone is holding back. */
function whyNotList() {
  return activeFilterList().filter(function (t) { return t.dim && FX.why[t.dim] > 0; })
    .map(function (t) { return { tag: t, n: FX.why[t.dim] }; })
    .sort(function (a, b) { return b.n - a.n; });
}
/* For one design outside the filters: the filters it fails. */
function failingFilters(d) {
  if (!d || !d._mask) return [];
  return activeFilterList().filter(function (t) { return t.dim && (d._mask & FX.bit[t.dim]); });
}

/* Refresh is scheduled, never run inline: many changes in one frame cost one pass. */
var _refreshWanted = false, _listsWanted = false;
function requestRefresh(listsLater) { _refreshWanted = true; _listsWanted = _listsWanted || !listsLater; if (listsLater) scheduleLists(); }
var scheduleLists = debounce(function () { _listsWanted = true; }, 140);
function refreshNow() {
  if (!_refreshWanted && !_listsWanted) return;
  if (_refreshWanted) {
    _refreshWanted = false;
    if (F.target) computeTargetDistances();
    runFilters();
    onFiltersApplied();          /* views, dock, drawer, legend (60-dock.js) */
  }
  if (_listsWanted) { _listsWanted = false; renderLists(); }
}
