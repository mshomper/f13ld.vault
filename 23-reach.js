/* ============================================================
   F13LD.vault · 23-reach.js   (v0.7.0)
   Aiming F13LD.sweep at a 2D target — usually a white space in the plot.

   Which design to hand Sweep: the one whose density trend runs closest to
   the target, not simply the nearest dot. Density moves almost every
   metric along a power law (E ∝ ρⁿ and its relatives), and Sweep moves
   density well; a design whose trend line passes through the target can get
   there by density alone, while the nearest dot might need its shape to
   change. For each candidate the trend comes from the Vault's own designs of
   the same family around it (a straight line through log metric against
   log volume fraction). Flagged designs ("stiffness may read high") are
   skipped, since their place in the plot may be wrong. Without enough
   designs to fit a trend it falls back to the nearest unflagged design.

   Sweep is also handed the ranges to start from: a density window centred
   on the density the trend predicts, a Spread sized to how far off the
   trend the target sits (Explore when density alone can't reach it), the
   cell size, and the target itself — the link format is F13LD.sweep's
   13-target.js. Everything stays editable in Sweep, which waits for Run.

   Physics: Voigt's bound — no solid / void structure beats the same solid
   fraction of fully dense material along an axis. A target past it is
   warned about (here and in Sweep), never blocked.
   Top-level code only defines things.
   ============================================================ */

/* Families F13LD.sweep can sweep (its SWEEP_FAMILY_LIST, v0.28.0). */
var SWEEP_FAMILIES_OK = ['tpms', 'noise', 'grain', 'beam', 'foam'];

/* Metrics Sweep can aim at (its 13-target.js TGT_METRICS — same names). */
var SWEEP_TARGET_KEYS = ['volume_fraction', '_emax', 'ex_norm', 'ey_norm', 'ez_norm', 'stiffness_density_norm', '_perf',
  '_gmean', 'gyz_norm', 'gxz_norm', 'gxy_norm', 'keff_max_norm', 'keff_avg_norm', 'keff_x_norm', 'keff_y_norm', 'keff_z_norm',
  'thermal_anisotropy', 'microstrain_avg_per_gpa', 'microstrain_x_per_gpa', 'microstrain_y_per_gpa', 'microstrain_z_per_gpa',
  'anisotropy', 'directionality', 'ortho_contrast', 'aniso_efficiency', 'connect_idx', 'perc_idx',
  'pore_size_p50_norm', 'pore_size_p10_norm', 'pore_size_p90_norm', 'pore_size_norm', 'throat_size_norm', 'throat_ratio',
  'tortuosity_min', 'tortuosity_avg', 'd_eff_max_norm', 'd_eff_avg_norm', 'curvature_uniformity', 'genus_per_cell'];
function sweepCanAim(k) { return SWEEP_TARGET_KEYS.indexOf(k) >= 0; }

/* Voigt bounds as a function of the solid fraction p (0–1), same as Sweep's.
   strain: microstrain is 1000 / (E / Es) × σ / Es, so it can't go below the
   bound on E. */
var REACH_NU = 0.3;
function reachBound(k) {
  var shear = function (p) { return p / (2 * (1 + REACH_NU)); }, lin = function (p) { return p; }, kk = function (p) { return p + (1 - p) * 0.001; };
  var strainMin = function (p) { return hasLoad() ? 1000 / p * globalInputs.ref_stress_mpa / globalInputs.modulus_gpa : null; };
  var B = {
    _emax: ['max', lin], ex_norm: ['max', lin], ey_norm: ['max', lin], ez_norm: ['max', lin],
    stiffness_density_norm: ['max', function () { return 1; }], _perf: ['max', function () { return Math.sqrt(3); }],
    _gmean: ['max', shear], gyz_norm: ['max', shear], gxz_norm: ['max', shear], gxy_norm: ['max', shear],
    keff_max_norm: ['max', kk], keff_avg_norm: ['max', kk], keff_x_norm: ['max', kk], keff_y_norm: ['max', kk], keff_z_norm: ['max', kk],
    d_eff_max_norm: ['max', function (p) { return 1 - p; }], d_eff_avg_norm: ['max', function (p) { return 1 - p; }],
    tortuosity_min: ['min', function () { return 1; }], tortuosity_avg: ['min', function () { return 1; }],
    microstrain_avg_per_gpa: ['min', strainMin], microstrain_x_per_gpa: ['min', strainMin], microstrain_y_per_gpa: ['min', strainMin], microstrain_z_per_gpa: ['min', strainMin]
  };
  return B[k] ? { kind: B[k][0], f: B[k][1] } : null;
}
/* Plain-language warnings for a target {kx, ky, x, y}; [] when reachable. */
function reachPhysics(T) {
  var out = [], vf = T.kx === 'volume_fraction' ? T.x : T.ky === 'volume_fraction' ? T.y : null;
  [[T.kx, T.x], [T.ky, T.y]].forEach(function (a) {
    var k = a[0], t = a[1], b = reachBound(k);
    if (!b || !isNum(t)) return;
    if (vf != null) {
      var lim = b.f(vf / 100); if (lim == null) return;
      if (b.kind === 'max' ? t > lim : t < lim) out.push(mLabel(k) + ' ' + fmtRangeVal(k, t) + ' is past the theoretical ' + (b.kind === 'max' ? 'maximum' : 'minimum') + ' at ' + fmtRangeVal('volume_fraction', vf) + ' solid (' + fmtRangeVal(k, lim) + ')');
      return;
    }
    var okAt = function (p) { var v = b.f(p); return v == null ? true : b.kind === 'max' ? v >= t : v <= t; };
    var okLo = okAt(1e-4), okHi = okAt(1);
    if (!okLo && !okHi) { out.push(mLabel(k) + ' ' + fmtRangeVal(k, t) + ' is past the theoretical limit at any density'); return; }
    if (okLo && okHi) return;
    /* a bound that rises with density admits t from some φ up; one that falls (diffusivity) up to some φ */
    var lo = 1e-4, hi = 1;
    for (var i = 0; i < 50; i++) { var mid = (lo + hi) / 2; if (okAt(mid) === okHi) hi = mid; else lo = mid; }
    if (okHi && hi > 0.75) out.push(mLabel(k) + ' ' + fmtRangeVal(k, t) + ' needs at least ' + Math.round(hi * 100) + ' % solid');
    if (!okHi && lo < 0.03) out.push(mLabel(k) + ' ' + fmtRangeVal(k, t) + ' needs at most ' + (lo * 100).toFixed(1) + ' % solid');
  });
  return out;
}

/* v0.7.1 — the designs to fit a density trend on around d: its own design
   type (family + topology + preset — the lineage a sweep varies), nearest
   in density, widening to family + topology, then family, when the type has
   too few. Neighbours picked in the plot's two dimensions mix design types
   whose curves run parallel, and flatten the slope (regression dilution). */
function trendKey(d, lvl) {
  var g = (d.recipe && d.recipe.geometry) || {}, topo = String(g.mode || g.topology || '').replace(/^(grain|noise)-/, '');
  var pre = (d.recipe && d.recipe.surface && (d.recipe.surface.preset || d.recipe.surface.type)) || d.preset || '';
  return lvl === 0 ? d.family + '|' + topo + '|' + pre : lvl === 1 ? d.family + '|' + topo : d.family;
}
var _trendIdx = null;
function trendIndex() {
  if (_trendIdx && _trendIdx.n === DB.N) return _trendIdx;
  var idx = { n: DB.N, g: [{}, {}, {}] };
  DB.all.forEach(function (d) {
    if (!(isNum(d.volume_fraction) && d.volume_fraction > 0) || d._stiff_flag === 'flagged') return;
    for (var l = 0; l < 3; l++) { var k = trendKey(d, l); (idx.g[l][k] = idx.g[l][k] || []).push(d); }
  });
  return (_trendIdx = idx);
}
function trendPeers(d, k) {
  k = k || 30;
  var idx = trendIndex(), lv = Math.log(d.volume_fraction / 100);
  for (var l = 0; l < 3; l++) {
    var g = idx.g[l][trendKey(d, l)] || [];
    if (g.length >= 8 || l === 2) {
      return g.map(function (o) { return { o: o, r: Math.abs(Math.log(o.volume_fraction / 100) - lv) }; })
        .sort(function (a, b) { return a.r - b.r; }).slice(0, k).map(function (e) { return e.o; });
    }
  }
  return [];
}

/* ln(value) against ln(volume fraction) through a set of designs → {a, b, r2} or null. */
function reachFit(list, k) {
  var xs = [], ys = [];
  for (var i = 0; i < list.length; i++) {
    var d = list[i], v = d[k], vf = d.volume_fraction;
    if (isNum(v) && v > 0 && isNum(vf) && vf > 0) { xs.push(Math.log(vf / 100)); ys.push(Math.log(v)); }
  }
  var n = xs.length;
  if (n < 6) return null;
  var mx = 0, my = 0, j;
  for (j = 0; j < n; j++) { mx += xs[j]; my += ys[j]; }
  mx /= n; my /= n;
  var sxx = 0, sxy = 0, syy = 0;
  for (j = 0; j < n; j++) { var dx = xs[j] - mx, dy = ys[j] - my; sxx += dx * dx; sxy += dx * dy; syy += dy * dy; }
  if (sxx / n < 0.0004) return null;
  var b = sxy / sxx;
  return { a: my - b * mx, b: b, r2: syy > 0 ? sxy * sxy / (sxx * syy) : 1, n: n };
}
function reachRelErr(v, t) { if (!isNum(v) || !isNum(t)) return Infinity; return Math.abs(t) < 1e-12 ? Math.abs(v - t) : Math.abs(v / t - 1); }

/* The seed for a target T = {kx, ky, x, y}:
   → { d, phi (solid fraction the trend predicts), residual (worst metric's
       relative error there), dphi, reason: 'reach' | 'nearest', slopes }
   or null when nothing qualifies. */
function reachSeed(T, pool) {
  pool = pool || S.list;
  var keys = [T.kx, T.ky], tv = [T.x, T.y];
  var ok = function (d) { return d && d.recipe && SWEEP_FAMILIES_OK.indexOf(d.family) >= 0 && isNum(d[T.kx]) && isNum(d[T.ky]) && isNum(d.volume_fraction) && d.volume_fraction > 0; };
  var cands = pool.filter(function (d) { return ok(d) && d._stiff_flag !== 'flagged'; });
  if (!cands.length) cands = pool.filter(ok);   /* every one flagged: use them anyway */
  if (!cands.length) return null;
  /* nearest on the plot first; only those can win in practice, and it keeps this fast */
  var sx = plotScale(T.kx), sy = plotScale(T.ky), tx = sx.f(T.x), ty = sy.f(T.y);
  cands.forEach(function (d) { d._rd = Math.hypot(sx.f(d[T.kx]) - tx, sy.f(d[T.ky]) - ty); });
  cands.sort(function (a, b) { return a._rd - b._rd; });
  var nearest = cands[0], top = cands.slice(0, 80);
  /* each family's density span, worked out once; the trend around each
     candidate comes from its own design type (trendPeers) */
  var byFam = {};
  DB.all.forEach(function (d) { if (ok(d)) (byFam[d.family] = byFam[d.family] || []).push(d); });
  Object.keys(byFam).forEach(function (f) {
    var all = byFam[f], clean = all.filter(function (o) { return o._stiff_flag !== 'flagged'; });
    var use = clean.length >= 12 ? clean : all, lo = Infinity, hi = -Infinity;
    use.forEach(function (o) { var p = o.volume_fraction / 100; if (p < lo) lo = p; if (p > hi) hi = p; });
    byFam[f] = { lo: lo, hi: hi };
  });
  var best = null;
  top.forEach(function (d) {
    var F0 = byFam[d.family];
    if (!F0) return;
    var local = trendPeers(d, 30);
    var fits = keys.map(function (k) { var f = reachFit(local, k); return f && Math.abs(f.b) >= 0.05 && f.r2 >= 0.3 ? f : null; });
    if (!fits[0] && !fits[1]) return;
    /* slide along the design's own trend, v(p) = v_d (p / p_d)^b, to the
       density whose worst metric is closest (the measure Sweep ranks by) */
    var lp0 = Math.log(d.volume_fraction / 100);
    var a0 = Math.log(Math.max(0.005, F0.lo * 0.7)), a1 = Math.log(Math.min(0.9, F0.hi * 1.3));
    var worst = function (lp) {
      var w = 0;
      keys.forEach(function (k, i) { var f = fits[i], v = f && d[k] > 0 ? d[k] * Math.exp(f.b * (lp - lp0)) : d[k]; w = Math.max(w, reachRelErr(v, tv[i])); });
      return w;
    };
    /* a small charge for each step of density, so a near-tie keeps the design's own */
    var lp = lp0, res = worst(lp0), score = res;
    if (a1 > a0) for (var gi = 0; gi <= 120; gi++) {
      var q = a0 + (a1 - a0) * gi / 120, wq = worst(q), sq = wq + 0.1 * Math.abs(q - lp0);
      if (sq < score - 1e-12) { score = sq; res = wq; lp = q; }
    }
    if (!best || score < best.score) best = { d: d, phi: Math.exp(lp), residual: res, dphi: lp - lp0, score: score, slopes: fits.map(function (f) { return f ? +f.b.toFixed(3) : null; }) };
  });
  var nearRes = Math.max(reachRelErr(nearest[T.kx], T.x), reachRelErr(nearest[T.ky], T.y));
  /* reachability has to beat simply taking the nearest design */
  if (best && best.score < nearRes) return { d: best.d, phi: best.phi, residual: best.residual, dphi: best.dphi, reason: 'reach', slopes: best.slopes };
  return { d: nearest, phi: nearest.volume_fraction / 100, residual: nearRes, dphi: 0, reason: 'nearest', slopes: null };
}

/* The #t= part of the link: the target and the ranges to start from. */
function reachPayload(T, seed) {
  var metrics = [];
  [[T.kx, T.x], [T.ky, T.y]].forEach(function (a) {
    if (!sweepCanAim(a[0]) || !isNum(a[1])) return;
    var m = { key: a[0], value: +(+a[1]).toPrecision(5) };
    if (STRAIN_KEYS.indexOf(a[0]) >= 0) { if (!hasLoad()) return; m.scale = +(globalInputs.ref_stress_mpa / globalInputs.modulus_gpa).toPrecision(6); }
    metrics.push(m);
  });
  if (!metrics.length) return null;
  var r = seed.residual;
  var spread = r <= 0.05 ? 0.10 : r <= 0.15 ? 0.15 : r <= 0.35 ? 0.25 : 0.35;
  var phi = seed.phi, lo = Math.max(0.5, phi * (1 - spread) * 100), hi = Math.min(90, phi * (1 + spread) * 100);
  var d = seed.d;
  return {
    v: 1, metrics: metrics, tol: 0.05,
    seed: { id: d._id, name: displayPreset(d), family: d.family, reason: seed.reason, residual: isFinite(r) ? +r.toFixed(4) : null },
    density: { lo: +lo.toFixed(1), hi: +hi.toFixed(1), predicted: +(phi * 100).toFixed(1) },
    spread: spread, variation: r > 0.35 ? 'explore' : 'neighbourhood',
    cell_size_mm: isNum(d.cell_size_mm) ? d.cell_size_mm : null
  };
}
