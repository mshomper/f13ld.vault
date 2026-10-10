/* ============================================================
   F13LD.vault · 11-data.js
   Loading the Vault, shaping each row into a design, population stats,
   percentile ranks, the domain compound and scarcity.

   A design is the table row itself plus underscore fields:
     _i index · _id string id · _kappa connectivity class · _sp/_vp solid
     and void percolation per axis · _grid_N · _stiff_flag · _reference
     _emax · _gmean · _perf · _score · _scar · _h view animation state
   ============================================================ */

var DB = { all: [], byId: new Map(), N: 0, stats: {}, sorted: {}, log: {}, families: [], contributors: [], grids: [],
           source: 'vault', loaded: false, error: null, excluded: 0 };

/* ── load ────────────────────────────────────────────────────────────── */
function vaultWantsMock() {
  try { return /[?&#]mock\b/.test(location.search + location.hash); } catch (e) { return false; }
}
function fetchVaultPage(select, from, chunk) {
  var url = SUPABASE_URL + '/rest/v1/' + VAULT_TABLE + '?select=' + select + '&order=created_at.desc&offset=' + from + '&limit=' + chunk;
  return fetch(url, { headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY }, mode: 'cors', cache: 'no-store', credentials: 'omit' })
    .then(function (res) {
      if (res.ok) return res.json();
      return res.text().catch(function () { return ''; }).then(function (body) {
        var err = new Error('HTTP ' + res.status + ' ' + res.statusText + ' — ' + body.slice(0, 160)); err.status = res.status; throw err;
      });
    });
}
function loadVaultRows(onProgress) {
  if (vaultWantsMock()) { DB.source = 'mock'; return Promise.resolve(mockRows(640)); }
  /* Named columns only — never select=*, so contributor_contact is never fetched.
     If the table lacks a listed column, PostgREST names it in the 400 body:
     drop that one column and retry (a few times at most). */
  var cols = VAULT_COLUMNS.slice(), all = [], chunk = 1000, drops = 0;
  function missingColumn(msg) {
    var m = /column\s+"?(?:[\w]+\.)?([\w]+)"?\s+does not exist/i.exec(msg || '');
    return m && cols.indexOf(m[1]) >= 0 ? m[1] : null;
  }
  function page(from) {
    return fetchVaultPage(cols.join(','), from, chunk).catch(function (e) {
      var miss = e.status === 400 ? missingColumn(e.message) : null;
      if (miss && drops < 6) { drops++; console.warn('[F13LD.vault] the table has no "' + miss + '" column — reading without it'); cols = cols.filter(function (c) { return c !== miss; }); return page(from).then(function (r) { return { again: r }; }); }
      if (e.status === 400) throw e;
      return new Promise(function (r) { setTimeout(r, 800); }).then(function () { return fetchVaultPage(cols.join(','), from, chunk); });   /* one retry for mobile blips */
    }).then(function (rows) {
      if (rows && rows.again) return rows.again;   /* the retried page already recursed */
      all = all.concat(rows); if (onProgress) onProgress(all.length);
      return rows.length < chunk ? all : page(from + chunk);
    });
  }
  return page(0).then(function (rows) { rows.forEach(function (r) { delete r.contributor_contact; }); return rows; });
}

/* ── shaping ─────────────────────────────────────────────────────────── */
function classifyConnectivity(d) {
  var ci = d.connect_idx, n;
  if (isNum(ci)) n = clamp(Math.round(ci * 3), 0, 3);
  else n = ((d.ex_norm || 0) > 1e-4) + ((d.ey_norm || 0) > 1e-4) + ((d.ez_norm || 0) > 1e-4);
  return n === 3 ? 'sphere' : n === 2 ? 'disc' : n === 1 ? 'rod' : 'diamond';
}
function shapeDesign(d, i) {
  var ext = d.metrics_extended || {}, num = function (v) { return isNum(v) ? v : null; };
  d._i = i;
  d._id = String(d.id != null ? d.id : (d.content_hash || ('row' + i)));
  d.family = d.family || (d.recipe && d.recipe.family) || 'unknown';
  d._grid_N = (d.recipe && d.recipe.homogenization && d.recipe.homogenization.grid != null) ? d.recipe.homogenization.grid : null;
  d.gyz_norm = num(ext.Gyz_norm); d.gxz_norm = num(ext.Gxz_norm); d.gxy_norm = num(ext.Gxy_norm);
  d._stiff_flag = ext.stiffness_flag === true ? 'flagged' : ext.stiffness_flag === false ? 'clean' : 'not recorded';
  d._flag_reasons = typeof ext.stiffness_flag_reasons === 'string' ? ext.stiffness_flag_reasons : '';
  d._reference = ext.reference === true;
  d._sp = [!!ext.connect_x, !!ext.connect_y, !!ext.connect_z];
  d._vp = [!!ext.perc_x, !!ext.perc_y, !!ext.perc_z];
  d._hasPerc = ('connect_x' in ext) || ('perc_x' in ext);
  d._kappa = classifyConnectivity(d);
  var E = [d.ex_norm, d.ey_norm, d.ez_norm].filter(isNum);
  d._emax = E.length ? Math.max.apply(null, E) : null;
  var G = [d.gyz_norm, d.gxz_norm, d.gxy_norm].filter(isNum);
  d._gmean = G.length ? G.reduce(function (a, b) { return a + b; }, 0) / G.length : null;
  var mag = Math.sqrt((d.ex_norm || 0) * (d.ex_norm || 0) + (d.ey_norm || 0) * (d.ey_norm || 0) + (d.ez_norm || 0) * (d.ez_norm || 0));
  d._perf = isNum(d.volume_fraction) && d.volume_fraction > 0 ? mag / (d.volume_fraction / 100) : null;
  d._beff = isNum(d._emax) && isNum(d.volume_fraction) && d.volume_fraction > 0 ? d._emax / (d.volume_fraction / 100) : null;   /* v0.8.0 (24-aim.js beffOf) */
  d._nexp = null;
  d._score = null; d._scar = null;
  d._h = { x: 0, y: 0, z: 0, tx: 0, ty: 0, tz: 0, u: 0.5, v: 0.5, tu: 0.5, tv: 0.5, a: 0, s: 0, tw: 0, delay: Math.random() * 900 };
  d._m = true;
  return d;
}

function ingestRows(rows) {
  var kept = rows.filter(function (d) { return d.degenerate !== true && d.solver_validity !== 'invalid'; });
  DB.excluded = rows.length - kept.length;
  DB.all = kept.map(shapeDesign);
  DB.N = DB.all.length;
  DB.byId = new Map(DB.all.map(function (d) { return [d._id, d]; }));
  DB.stats = {}; DB.sorted = {}; DB.log = {}; _pctCache = {}; _popCache = {};
  strainCoefficients(); applyLoadValues();   /* v0.6 */
  resetColorCaches(); ensureNexp();          /* v0.8.0 — density exponent at load: an axis and a range filter, not only a colour */
  pickableMetrics().forEach(function (m) { computeStat(m.key); });
  var fam = {}, con = {}, grd = {};
  DB.all.forEach(function (d) {
    fam[d.family] = (fam[d.family] || 0) + 1;
    if (d.contributor_name) con[d.contributor_name] = (con[d.contributor_name] || 0) + 1;
    if (d._grid_N != null) grd[d._grid_N] = (grd[d._grid_N] || 0) + 1;
  });
  DB.families = Object.keys(fam).sort(function (a, b) { var ia = FAMILY_ORDER.indexOf(a), ib = FAMILY_ORDER.indexOf(b); return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib); });
  DB.contributors = Object.keys(con).sort(function (a, b) { return con[b] - con[a]; });
  DB.grids = Object.keys(grd).map(Number).sort(function (a, b) { return a - b; });
  buildAimRuns();   /* v0.7.1 — 24-aim.js (colour caches reset above, before the stats) */
  DB.loaded = true;
}

/* min / max / sorted values, and whether the metric reads better on a log axis */
function computeStat(k) {
  var vals = [];
  for (var i = 0; i < DB.N; i++) { var v = DB.all[i][k]; if (isNum(v)) vals.push(v); }
  if (!vals.length) { delete DB.stats[k]; delete DB.sorted[k]; DB.log[k] = false; return; }
  vals.sort(function (a, b) { return a - b; });
  DB.sorted[k] = vals;
  DB.stats[k] = { min: vals[0], max: vals[vals.length - 1], n: vals.length };
  var lo = vals[Math.floor(vals.length * 0.02)], hi = vals[Math.ceil(vals.length * 0.98) - 1];
  DB.log[k] = k !== 'volume_fraction' && vals[0] > 0 && hi / Math.max(lo, 1e-12) >= 40;
}
function hasMetric(k) { return !!DB.stats[k]; }

/* ── strain (v0.6) ───────────────────────────────────────────────────────
   Sweep stores microstrain_*_per_gpa = 1e6 / (E* · Es_ref): strain per GPa
   of stress for the solid modulus IT assumed (100 GPa unless told), capped
   at 1e6. Vault instead keeps a coefficient c = 1000 / E* — microstrain per
   MPa of stress per GPa of solid modulus — so real strain under the user's
   load is  με = c · σ[MPa] / Es[GPa],  whatever Es Sweep used.
   c comes from E* when E* is precise (≥ 0.01, or an export that records
   Es_ref_GPa); otherwise from Sweep's stored strain (unrounded E), using
   Es_ref from the row, or estimated from the rows where both are good. */
var STRAIN_KEYS = ['microstrain_x_per_gpa', 'microstrain_y_per_gpa', 'microstrain_z_per_gpa', 'microstrain_avg_per_gpa', 'u_compliance'];
function strainCoefficients() {
  var est = [], AX = ['x', 'y', 'z'];
  DB.all.forEach(function (d) {
    var ext = d.metrics_extended || {};
    d._msS = AX.map(function (a) { return d['microstrain_' + a + '_per_gpa']; }).concat([d.microstrain_avg_per_gpa]);
    d._En = [d.ex_norm, d.ey_norm, d.ez_norm];
    d._EsRef = isNum(ext.Es_ref_GPa) ? ext.Es_ref_GPa : isNum(d.Es_ref_GPa) ? d.Es_ref_GPa : null;
    for (var i = 0; i < 3; i++) { var st = d._msS[i], e = d._En[i]; if (isNum(st) && st > 0 && st < 999999 && isNum(e) && e >= 0.01) est.push(1e6 / (st * e)); }
  });
  est.sort(function (a, b) { return a - b; });
  DB.esRefGuess = est.length ? est[est.length >> 1] : 100;
  DB.all.forEach(function (d) {
    var es = d._EsRef != null ? d._EsRef : DB.esRefGuess, exact = d._EsRef != null;
    var c = [0, 1, 2].map(function (i) {
      var e = d._En[i], st = d._msS[i];
      if (isNum(e) && e > 0 && (exact || e >= 0.01)) return 1000 / e;
      if (isNum(st) && st > 0 && st < 999999) return st * es / 1000;
      return isNum(e) && e > 0 ? 1000 / e : null;
    });
    var ok = c.filter(isNum), avg = ok.length ? ok.reduce(function (a, b) { return a + b; }, 0) / ok.length : (isNum(d._msS[3]) && d._msS[3] < 999999 ? d._msS[3] * es / 1000 : null);
    d._msc = c.concat([avg]);
  });
}
/* Real strain (με) and strain energy (kJ/m³) under the Build target load;
   empty without a load, so every list, axis and slider hides them. */
function applyLoadValues() {
  var on = hasLoad(), sig = globalInputs.ref_stress_mpa, Es = globalInputs.modulus_gpa;
  DB.all.forEach(function (d) {
    var c = d._msc || [null, null, null, null], k = on ? sig / Es : 0;
    d.microstrain_x_per_gpa = on && isNum(c[0]) ? c[0] * k : null;
    d.microstrain_y_per_gpa = on && isNum(c[1]) ? c[1] * k : null;
    d.microstrain_z_per_gpa = on && isNum(c[2]) ? c[2] * k : null;
    d.microstrain_avg_per_gpa = on && isNum(c[3]) ? c[3] * k : null;
    /* U = σ²/(2E): c/2e6 · σ²/Es MPa → × 1000 kJ/m³ */
    d.u_compliance = on && isNum(c[3]) ? c[3] / 2e6 * sig * sig / Es * 1000 : null;
  });
}
/* After the load, material or window changes: real values, stats, ranks, scores. */
function loadChanged() {
  if (!DB.N) return;
  applyLoadValues();
  STRAIN_KEYS.forEach(function (k) { computeStat(k); delete _pctCache[k]; delete _popCache[k]; });
  if (!hasLoad()) {   /* strain went away: drop anything that pointed at it */
    STRAIN_KEYS.forEach(function (k) { delete F.ranges[k]; });
    F.rangeKeys = F.rangeKeys.filter(function (k) { return STRAIN_KEYS.indexOf(k) < 0; });
    ['x', 'y'].forEach(function (a) { if (STRAIN_KEYS.indexOf(S.ax2[a]) >= 0) S.ax2[a] = { x: 'volume_fraction', y: '_emax' }[a]; });
    ['x', 'y', 'z'].forEach(function (a) { if (STRAIN_KEYS.indexOf(S.ax3[a]) >= 0) S.ax3[a] = { x: '_perf', y: 'anisotropy', z: '_score' }[a]; });
    if (STRAIN_KEYS.indexOf(S.sort.k) >= 0) S.sort = { k: '_score', dir: -1 };
  }
  computeScores(F.domain);
  aimHits();   /* v0.7.1 — strain targets count only with a load */
}

/* Percentile rank 0..1 of every design for metric k (NaN where missing).
   Ties break on stiffness efficiency, then row order, so a heavily tied
   metric (κ, flags) still spreads into a cloud rather than a sheet. */
var _pctCache = {};
function pctOf(k) {
  if (_pctCache[k]) return _pctCache[k];
  var out = new Float32Array(DB.N).fill(NaN), idx = [];
  for (var i = 0; i < DB.N; i++) if (isNum(DB.all[i][k])) idx.push(i);
  idx.sort(function (a, b) {
    var va = DB.all[a][k], vb = DB.all[b][k]; if (va !== vb) return va - vb;
    var pa = DB.all[a]._perf || 0, pb = DB.all[b]._perf || 0; if (pa !== pb) return pa - pb;
    return a - b;
  });
  var n = Math.max(1, idx.length - 1);
  idx.forEach(function (ix, r) { out[ix] = r / n; });
  return (_pctCache[k] = out);
}
function pct(d, k) { var v = pctOf(k)[d._i]; return isNaN(v) ? null : v; }

/* v0.4 popStats: min–max normalised (rank for displayMode 'rank') with .get(d) */
var _popCache = {};
function popNorm(k) {
  if (_popCache[k]) return _popCache[k];
  var meta = METRIC_MAP[k], st = DB.stats[k], p;
  if (meta && meta.displayMode === 'rank') { var pr = pctOf(k); p = { get: function (d) { var v = pr[d._i]; return isNaN(v) ? null : v; } }; }
  else p = { get: function (d) { var v = d[k]; if (!isNum(v) || !st) return null; return st.max > st.min ? clamp((v - st.min) / (st.max - st.min), 0, 1) : 0; } };
  return (_popCache[k] = p);
}
function domainPop(dom) {
  var z = DOMAIN_Z_COMPOUND[dom] || DOMAIN_Z_COMPOUND.all, pop = {};
  (z.needs || []).concat(['ortho_contrast', 'directionality', 'tortuosity_min', 'throat_ratio', 'pore_size_p50_norm', 'microstrain_avg_per_gpa', 'thermal_anisotropy', 'surface_complexity'])
    .forEach(function (k) { pop[k] = popNorm(k); });
  return pop;
}

/* The active domain's compound for every design, then its rank. */
function computeScores(dom) {
  var z = DOMAIN_Z_COMPOUND[dom] || DOMAIN_Z_COMPOUND.all, pop = domainPop(dom);
  for (var i = 0; i < DB.N; i++) { var d = DB.all[i], v = z.compute(d, pop); d._score = isNum(v) ? v : null; d._scar = null; }
  delete _pctCache._score; delete _pctCache._scar; computeStat('_score');
  DB._scarFor = null;
}
/* Scarcity: mean distance to the 5 nearest designs in the domain's compound
   inputs (v0.4). O(N²), so it runs only when it is shown. */
function ensureScarcity(dom) {
  if (DB._scarFor === dom) return;
  var z = DOMAIN_Z_COMPOUND[dom] || DOMAIN_Z_COMPOUND.all, pop = domainPop(dom), vecs = [], who = [];
  DB.all.forEach(function (d) { var v = z.vector ? z.vector(d, pop) : null; d._scar = null; if (v && v.every(isNum)) { vecs.push(v); who.push(d); } });
  var K = Math.min(5, Math.max(1, vecs.length - 1)), raw = new Float64Array(vecs.length), best = new Float64Array(K);
  for (var a = 0; a < vecs.length; a++) {
    best.fill(Infinity);
    for (var b = 0; b < vecs.length; b++) {
      if (a === b) continue;
      var s = 0, va = vecs[a], vb = vecs[b];
      for (var j = 0; j < va.length; j++) { var t = vb[j] - va[j]; s += t * t; }
      if (s < best[K - 1]) { var p = K - 1; while (p > 0 && best[p - 1] > s) { best[p] = best[p - 1]; p--; } best[p] = s; }
    }
    var sum = 0, c = 0; for (var q = 0; q < K; q++) if (isFinite(best[q])) { sum += Math.sqrt(best[q]); c++; }
    raw[a] = c ? sum / c : 0;
  }
  var mn = Infinity, mx = -Infinity; raw.forEach(function (v) { if (v < mn) mn = v; if (v > mx) mx = v; });
  who.forEach(function (d, k) { d._scar = mx > mn ? (raw[k] - mn) / (mx - mn) : 0; });
  delete _pctCache._scar; computeStat('_scar'); DB._scarFor = dom;
}

/* Value of metric k on d as the UI should treat it (handles derived keys). */
function val(d, k) { var v = d[k]; return isNum(v) ? v : null; }

/* ── synthetic data (?mock) ──────────────────────────────────────────── */
function mockRows(n) {
  var R = (function (a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; })(1307);
  var keys = Object.keys(MOCK_RECIPES).filter(function (k) { return k.indexOf('reactiondiff') < 0 && k.indexOf('thermal-fine') < 0 && k.indexOf('biomed') < 0; });
  var who = ['mshomper', 'lattice-lab', 'kwong', 'r.ortega', 'am-group', 'jlee', 'tmb-studio'], rows = [];
  function jit(v, a, lo, hi) { return clamp(v + (R() * 2 - 1) * a, lo, hi); }
  for (var i = 0; i < n; i++) {
    var waveKeys = keys.filter(function (k) { return k.indexOf('wave-') === 0; });
    var key = i < n - 12 ? keys[Math.floor(R() * keys.length)] : (i % 2 && waveKeys.length ? waveKeys[Math.floor(R() * waveKeys.length)] : 'bundle');
    var recipe, fam;
    if (key === 'bundle') { fam = 'bundle'; recipe = { family: 'bundle', surface: { structure: 'helix', topology: 'sheet', iso_offset: 0.05 } }; }
    else {
      recipe = JSON.parse(JSON.stringify(MOCK_RECIPES[key])); fam = recipe.family; var g = recipe.geometry = recipe.geometry || {};
      if (fam === 'tpms') { if (g.mode === 'solid') g.offset = jit(g.offset || 0, 0.5, -0.9, 0.9); else g.wallThickness = jit(g.wallThickness || 0.3, 0.15, 0.12, 0.6); g.cell_scale = +(jit(1.1, 0.35, 0.75, 1.6)).toFixed(2); }
      else if (fam === 'noise') { var sf = recipe.surface; if (sf.half_width != null) sf.half_width = jit(sf.half_width, 0.06, 0.06, 0.3); if (sf.center != null) sf.center = jit(sf.center, 0.12, -0.4, 0.5); sf.seed = 1 + Math.floor(R() * 50); }
      else if (fam === 'grain') { if (g.half_width) g.half_width = jit(g.half_width, 0.07, 0.08, 0.3); g.center = jit(g.center || 0, 0.1, -0.3, 0.3); recipe.field.rng_seed = 1 + Math.floor(R() * 99); }
      else if (fam === 'beam') { g.radius = jit(g.radius || 0.1, 0.05, 0.05, 0.2); var c = jit(1, 0.25, 0.75, 1.4); if (R() < 0.35) g.scale_xyz = [c, c, +(jit(1, 0.4, 0.6, 1.6)).toFixed(2)]; }
      else if (fam === 'foam') { if (g.mode === 'wet') g.border = jit(g.border || 0.45, 0.12, 0.25, 0.6); else g.thickness = jit(g.thickness || 0.1, 0.05, 0.05, 0.22); }
      else if (fam === 'wave') { var fw = recipe.field; delete recipe.geometry; if (fw.mode === 'sheet') fw.thickness = +jit(fw.thickness || 0.25, 0.1, 0.1, 0.6).toFixed(3); else fw.iso = +jit(fw.iso || 0, 0.3, -0.8, 0.8).toFixed(3); }   /* v0.8.0: real F13LD.wave recipes */
    }
    var sheet = /sheet|shell|pi-tpms|half/.test(JSON.stringify(recipe.geometry || {}).toLowerCase()) || fam === 'noise' || (fam === 'wave' && recipe.field.mode === 'sheet');
    var vf = 8 + Math.pow(R(), 0.9) * 46, v = vf / 100;
    var nE = sheet ? 1.25 + R() * 0.2 : fam === 'beam' ? 1.75 + R() * 0.3 : fam === 'foam' ? 1.95 + R() * 0.2 : 1.6 + R() * 0.3;
    var base = (fam === 'beam' ? 0.6 : 0.78 + R() * 0.2) * Math.pow(v, nE);
    var st = fam === 'grain' ? [0.5 + R() * 0.6, 0.5 + R() * 0.6, 0.5 + R() * 0.6] : fam === 'noise' ? [0.8 + R() * 0.4, 0.8 + R() * 0.4, 0.8 + R() * 0.4] : [0.93 + R() * 0.14, 0.93 + R() * 0.14, 0.93 + R() * 0.14];
    var ms = (st[0] + st[1] + st[2]) / 3, E = st.map(function (s) { return base * Math.pow(s / ms, 1.7); });
    var emx = Math.max.apply(null, E), emn = Math.min.apply(null, E), esum = E[0] + E[1] + E[2], emean = esum / 3;
    var kap = fam === 'grain' && R() < 0.15 ? 0.67 : (fam === 'noise' && R() < 0.08 ? 0.33 : 1);
    var pore = Math.pow(1 - v, 0.6) * (0.24 + R() * 0.24), cell = +(3 + R() * 3).toFixed(1);
    var kx = E.map(function (e) { return clamp(v * (0.45 + R() * 0.35) * (e / emean), 0.005, 0.95); });
    var mu = Math.min(1e6, (1e4 / E[0] + 1e4 / E[1] + 1e4 / E[2]) / 3);
    var flag = R() < (v < 0.18 ? 0.24 : 0.06);
    rows.push({
      id: 1040 + i, created_at: new Date(Date.UTC(2026, 9, 1 + Math.floor(R() * 9), Math.floor(R() * 24))).toISOString(),
      content_hash: 'mock' + i, schema_version: '0.27.1', family: fam, source_tool: 'f13ld.sweep', source_version: '0.27.1', exported_at: new Date(Date.UTC(2026, 9, 1 + Math.floor(R() * 8))).toISOString(),
      preset: (recipe.surface && recipe.surface.preset) || null, solver: 'gpu-fft', contributor_name: who[Math.min(6, Math.floor(Math.pow(R(), 1.6) * 7))], contributor_notes: null,
      domain: 'all', material: { key: 'ti6al4v', E_GPa: 110 }, e_solid_gpa: 110, sigma_ref_gpa: 0.01, cell_size_mm: cell,
      volume_fraction: +vf.toFixed(2), connect_idx: kap, perc_idx: R() < 0.92 ? 1 : 0.67, stiff_axis: 'XYZ'[E.indexOf(emx)],
      anisotropy: emx / emn, directionality: emx / esum, ortho_contrast: Math.sqrt(E.reduce(function (s, e) { return s + (e - emean) * (e - emean); }, 0) / 3) / emean,
      aniso_efficiency: (emx / emn) / v, surface_complexity: (sheet ? 2.4 : 1.4) + v * 3 + R() * 1.6,
      ex_norm: E[0], ey_norm: E[1], ez_norm: E[2], stiffness_density_norm: emean / v,
      keff_x_norm: kx[0], keff_y_norm: kx[1], keff_z_norm: kx[2], keff_max_norm: Math.max.apply(null, kx), keff_avg_norm: (kx[0] + kx[1] + kx[2]) / 3, thermal_anisotropy: Math.max.apply(null, kx) / Math.min.apply(null, kx),
      /* Sweep's stored form: 1e6 / (E* · 100 GPa), capped at 1e6 */
      microstrain_x_per_gpa: Math.min(1e6, 1e4 / E[0]), microstrain_y_per_gpa: Math.min(1e6, 1e4 / E[1]), microstrain_z_per_gpa: Math.min(1e6, 1e4 / E[2]), microstrain_avg_per_gpa: mu, u_compliance: mu / 2e6,
      pore_size_norm: pore * 1.05, pore_size_p10_norm: pore * 0.55, pore_size_p50_norm: pore, pore_size_p90_norm: pore * 1.5, pore_size_cv: 0.15 + R() * 0.5,
      throat_size_norm: pore * (0.35 + R() * 0.3), throat_ratio: 0.3 + R() * 0.5,
      h_mean: (sheet ? 0 : 0.4) + (R() - 0.5) * 0.3, h_mean_abs: 0.2 + R() * 0.8, h_std: 0.1 + R() * 0.6, k_gauss_mean: -(0.1 + R() * 0.8), curvature_uniformity: (sheet ? 0.55 : 0.3) + R() * 0.35, mih: 1 + R() * 6, genus_per_cell: 2 + R() * 20,
      tortuosity_min: 1.05 + R() * 0.6, tortuosity_avg: 1.2 + R() * 0.8, d_eff_max_norm: (1 - v) * (0.4 + R() * 0.4), d_eff_avg_norm: (1 - v) * (0.3 + R() * 0.35),
      linear_cap_active: false, linear_cap_kind: null, degenerate: false, solver_validity: 'valid', cg_iters: 40 + Math.floor(R() * 200), cg_converged: true,
      metrics_extended: { connect_x: kap >= 0.33, connect_y: kap >= 0.67, connect_z: kap >= 0.99, perc_x: true, perc_y: true, perc_z: R() < 0.9,
        Gyz_norm: base * (0.28 + R() * 0.12), Gxz_norm: base * (0.28 + R() * 0.12), Gxy_norm: base * (0.28 + R() * 0.12),
        stiffness_flag: flag, stiffness_flag_reasons: flag ? 'pore-limited ' + 'XYZ'[Math.floor(R() * 3)] : '', reference: i % 97 === 0 },
      recipe: Object.assign(recipe, { homogenization: { grid: R() < 0.7 ? 64 : 32 } })
    });
  }
  mockAimedRuns(rows, R);
  return rows;
}
/* v0.7.1 — two aimed runs in the sample data, as F13LD.sweep v0.28 exports them */
function mockAimedRuns(rows, R) {
  var tp = rows.filter(function (r) { return r.family === 'tpms'; });
  if (tp.length < 60) return;
  function setE(r, target) {
    var E = [r.ex_norm, r.ey_norm, r.ez_norm], f = target / Math.max.apply(null, E), v = r.volume_fraction / 100;
    r.ex_norm *= f; r.ey_norm *= f; r.ez_norm *= f; E = [r.ex_norm, r.ey_norm, r.ez_norm];
    r.stiffness_density_norm = (E[0] + E[1] + E[2]) / 3 / v;
    r.microstrain_x_per_gpa = Math.min(1e6, 1e4 / E[0]); r.microstrain_y_per_gpa = Math.min(1e6, 1e4 / E[1]); r.microstrain_z_per_gpa = Math.min(1e6, 1e4 / E[2]);
    r.microstrain_avg_per_gpa = (r.microstrain_x_per_gpa + r.microstrain_y_per_gpa + r.microstrain_z_per_gpa) / 3;
  }
  function run(list, seed, metrics, when, apply) {
    var at = new Date(Date.UTC(2026, 9, 10, 9, 0)).toISOString();
    list.forEach(function (r) {
      apply(r);
      r.exported_at = at; r.created_at = when; r.source_version = '0.28.0'; r.contributor_name = 'mshomper';
      r.solver = { method: 'FFT-CG', version: 'lab-0.24.0+sweep', backend: 'gpu', precision_mode: 'rigorous', resolution_picker: 32,
        target: { metrics: metrics, tol: 0.05, round: 'final', cancelled: false, stopped: 'on-target',
          source: { tool: 'f13ld.vault', id: String(seed.id), name: 'Gyroid sheet', reason: 'reach' },
          rounds: [{ k: 1, best: 0.21 }, { k: 2, best: 0.09 }, { k: 3, best: 0.04 }] } };
    });
  }
  var a = tp.slice(0, 25), sa = tp[30], b = tp.slice(31, 51), sb = tp[55];
  run(a, sa, [{ key: 'volume_fraction', value: 17 }, { key: '_emax', value: 0.056 }], new Date(Date.UTC(2026, 9, 10, 9, 5)).toISOString(), function (r) {
    r.volume_fraction = +(17 + (R() * 2 - 1) * 0.9).toFixed(2); setE(r, 0.056 * (1 + (R() * 2 - 1) * 0.07));
  });
  sa.volume_fraction = 24; setE(sa, 0.09);
  run(b, sb, [{ key: 'volume_fraction', value: 40 }, { key: 'keff_max_norm', value: 0.3 }], new Date(Date.UTC(2026, 9, 10, 9, 20)).toISOString(), function (r) {
    r.volume_fraction = +(40 + (R() * 2 - 1) * 2).toFixed(2);
    var k = [r.keff_x_norm, r.keff_y_norm, r.keff_z_norm], f = 0.3 * (1 + (R() * 2 - 1) * 0.1) / Math.max.apply(null, k);
    r.keff_x_norm *= f; r.keff_y_norm *= f; r.keff_z_norm *= f; k = [r.keff_x_norm, r.keff_y_norm, r.keff_z_norm];
    r.keff_max_norm = Math.max.apply(null, k); r.keff_avg_norm = (k[0] + k[1] + k[2]) / 3;
  });
}
