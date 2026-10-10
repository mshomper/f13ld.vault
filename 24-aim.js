/* ============================================================
   F13LD.vault · 24-aim.js   (v0.7.1)
   Aimed runs and four colour modes that add a dimension to the plots.

   Aimed runs: F13LD.sweep v0.28+ records the target a run aimed at in its
   solver block (meta.solver.target — metrics in Vault's column names, the
   seed's Vault ID, the rounds), and Ingest stores that block in `solver`.
   Designs exported together under the same target form one aimed run. Vault
   lists the runs (DB.aimRuns), filters by them (Source), colours by them,
   and in the 2D plot draws where each run was aimed (a ghost target);
   picking a run shows the seed it started from and the path to its cluster.

   Colour modes (30-points-gl.js COLOR_MODE_LIST):
     _nexp   density exponent — n in E ∝ ρⁿ around the design, fitted on its
             nearest same-family neighbours (≈ 1 stretch-, ≈ 2 bending-dominated)
     _beff   bound efficiency — peak stiffness as a share of Voigt's bound at
             that density (E* / Es ÷ solid fraction)
     _pdepth Pareto depth on the current 2D axes (0 = the front)
     _sim    similarity to the selected design across its core metrics
   Top-level code only defines things.
   ============================================================ */

var AIM_COLORS = ['#c8f542', '#5BA4EE', '#E06A6F', '#A974FF', '#EF9F27', '#5DCAA5', '#F4C0D1', '#E8D4A2', '#7FD3F5', '#D4537E'];
var AIM_DIM = '#3a3f55';

/* The solver block of a row, whatever form Ingest stored it in. */
function solverObj(sv) {
  if (sv && typeof sv === 'object') return sv;
  if (typeof sv === 'string' && sv.charAt(0) === '{') { try { return JSON.parse(sv); } catch (e) { return null; } }
  return null;
}
/* The target block of a row (Sweep v0.28+), or null. */
function aimOf(d) {
  var sv = solverObj(d.solver), t = sv && sv.target;
  return t && Array.isArray(t.metrics) && t.metrics.length ? t : null;
}

/* A short id that stays the same across loads (share links, filters). */
function aimId(key) { var h = 5381; for (var i = 0; i < key.length; i++) h = ((h << 5) + h + key.charCodeAt(i)) | 0; return 'a' + (h >>> 0).toString(36); }
/* Group designs into aimed runs. Called after the rows are shaped (11-data.js). */
function buildAimRuns() {
  var runs = [], byKey = {};
  DB.all.forEach(function (d) {
    var t = aimOf(d); d._aim = null;
    if (!t) return;
    var src = t.source || {};
    var key = (src.id || '') + '|' + t.metrics.map(function (m) { return m.key + '=' + m.value; }).join(',') + '|' + String(d.exported_at || '').slice(0, 16);
    var R = byKey[key];
    if (!R) {
      R = byKey[key] = { key: key, id: aimId(key), metrics: t.metrics.filter(function (m) { return m && m.key && isNum(+m.value); }).map(function (m) { return { key: m.key, value: +m.value }; }),
        tol: isNum(t.tol) ? t.tol : 0.05, seedId: src.id != null ? String(src.id) : null, seedName: src.name || null, reason: src.reason || null,
        rounds: Array.isArray(t.rounds) ? t.rounds.length : 0, stopped: t.stopped || null, designs: [], exported: d.exported_at || d.created_at || null };
      runs.push(R);
    }
    R.designs.push(d); d._aim = R.id;
  });
  runs.forEach(function (R, i) {
    R.color = AIM_COLORS[i % AIM_COLORS.length];
    R.seed = R.seedId ? DB.byId.get(R.seedId) || null : null;
  });
  DB.aimRuns = runs;
  DB.aimById = {}; runs.forEach(function (R) { DB.aimById[R.id] = R; });
  aimHits();
}
/* How many of a run's designs are on target — every metric within its tolerance.
   Strain metrics read in real με only with a Build target load; without one they're skipped. */
function aimHits() {
  (DB.aimRuns || []).forEach(function (R) {
    var n = 0;
    R.designs.forEach(function (d) {
      var ok = true, any = false;
      R.metrics.forEach(function (m) {
        var v = d[m.key]; if (!isNum(v)) { if (STRAIN_KEYS.indexOf(m.key) < 0) ok = false; return; }
        any = true; if (Math.abs(m.value) > 1e-12 ? Math.abs(v / m.value - 1) > R.tol : Math.abs(v - m.value) > R.tol) ok = false;
      });
      if (ok && any) n++;
    });
    R.hits = n;
  });
}
function aimRunOf(d) { return d && d._aim && DB.aimById ? DB.aimById[d._aim] : null; }
/* labels at render time: the Build target can change the units */
function aimLabel(R) { return R.metrics.map(function (m) { return mShort(m.key) + ' ' + fmtRangeVal(m.key, m.value); }).join(' · '); }
function aimLegendLabel(R) { return aimLabel(R) + (R.seedName ? ' · from ' + R.seedName : ''); }

/* Pick a run: colour by aimed run, everything else dims, the 2D plot shows
   its seed and path. Same run again (or null) = back to every run. */
function selectAimRun(id) {
  S.aimSel = id && S.aimSel !== id ? id : null;
  if (S.color !== 'aim') { S.color = 'aim'; savePrefs(); }
  recolor(); renderLegend(); markViewsDirty(); shareLinkSoon();
  var R = S.aimSel ? DB.aimById[S.aimSel] : null;
  if (R) toast('Aimed run <b>' + esc(aimLabel(R)) + '</b> · ' + R.hits + ' of ' + R.designs.length + ' on target' + (R.seed ? '' : ' · its seed design isn\'t in this Vault view'));
}

/* ── colour helpers for 30-points-gl.js ─────────────────────────────── */
function aimCatValue(d) { return d._aim || 'none'; }
function aimCatColor(v) {
  if (v === 'none' || !DB.aimById || !DB.aimById[v]) return AIM_DIM;
  if (S.aimSel && v !== S.aimSel) return '#4d5370';
  return DB.aimById[v].color;
}

/* Density exponent: the slope of ln E̅ against ln ρ through the design's
   own design type (23-reach.js trendPeers + reachFit — the same trend the
   seed picker uses). E̅ = the geometric mean of Ex, Ey, Ez: cell stretching
   moves stiffness between the axes but barely changes it (the peak did, and
   scattered the fit). d._nexpWhy says why a design has none. Once per load. */
var _nexpDone = false;
function egeoOf(d) { var a = d.ex_norm, b = d.ey_norm, c = d.ez_norm; return isNum(a) && isNum(b) && isNum(c) && a > 0 && b > 0 && c > 0 ? Math.cbrt(a * b * c) : null; }
function ensureNexp() {
  if (_nexpDone) return; _nexpDone = true;
  _trendIdx = null;
  DB.all.forEach(function (d) { d._egeo = egeoOf(d); });
  DB.all.forEach(function (d) {
    d._nexp = null; d._nexpWhy = '';
    if (!(isNum(d.volume_fraction) && d.volume_fraction > 0)) { d._nexpWhy = 'no volume fraction'; return; }
    if (d._egeo == null) { d._nexpWhy = 'an axis carries no load'; return; }
    var f = trendFit(d, '_egeo');
    if (f) d._nexp = f.b; else d._nexpWhy = _fitWhy;
  });
}
/* Bound efficiency: E* / Es over the solid fraction (Voigt: at most 1). */
function beffOf(d) { return isNum(d._emax) && isNum(d.volume_fraction) && d.volume_fraction > 0 ? d._emax / (d.volume_fraction / 100) : null; }

/* Pareto depth on the current 2D axes, over the designs that match:
   0 = the front, 1 = the front once the first is peeled away, … — the
   2D layering in O(n log n) (sort on x, binary search on each layer's best y). */
function ensurePareto() {
  DB.all.forEach(function (d) { d._pdepth = null; });
  var kx = S.ax2.x, ky = S.ax2.y, dir = paretoDirs();
  var c = S.list.filter(function (d) { return isNum(d[kx]) && isNum(d[ky]); })
    .map(function (d) { return { d: d, x: d[kx] * dir.x, y: d[ky] * dir.y }; });
  c.sort(function (a, b) { return b.x - a.x || b.y - a.y; });
  var best = [];   /* best y in each layer so far, decreasing with depth */
  c.forEach(function (p) {
    var lo = 0, hi = best.length;
    while (lo < hi) { var mid = (lo + hi) >> 1; if (best[mid] >= p.y) lo = mid + 1; else hi = mid; }
    if (lo === best.length) best.push(p.y); else best[lo] = Math.max(best[lo], p.y);
    p.d._pdepth = lo;
  });
  DB.paretoLayers = best.length;
}

/* Similarity to the selected design: distance over z-scored core metrics
   (log for the positive, multi-decade ones), → e^(−distance). */
var SIM_KEYS = ['volume_fraction', '_emax', '_gmean', 'anisotropy', 'stiffness_density_norm', 'pore_size_p50_norm', 'keff_max_norm', 'connect_idx', 'tortuosity_min', 'curvature_uniformity'];
var _simStats = null;
function simVal(d, k) { var v = d[k]; if (!isNum(v)) return null; return DB.log[k] ? (v > 0 ? Math.log(v) : null) : v; }
function ensureSim() {
  if (!_simStats) {
    _simStats = {};
    SIM_KEYS.forEach(function (k) {
      var a = []; DB.all.forEach(function (d) { var v = simVal(d, k); if (v != null) a.push(v); });
      if (a.length < 8) return;
      var m = a.reduce(function (s, v) { return s + v; }, 0) / a.length, q = a.reduce(function (s, v) { return s + (v - m) * (v - m); }, 0) / a.length;
      _simStats[k] = { m: m, s: Math.sqrt(q) || 1 };
    });
  }
  var sel = S.sel;
  DB.all.forEach(function (d) {
    d._sim = null; if (!sel) return;
    var s = 0, n = 0;
    SIM_KEYS.forEach(function (k) {
      var st = _simStats[k]; if (!st) return;
      var a = simVal(d, k), b = simVal(sel, k); if (a == null || b == null) return;
      var z = (a - b) / st.s; s += z * z; n++;
    });
    d._sim = n >= 3 ? Math.exp(-Math.sqrt(s / n)) : null;
  });
}
/* called when the data reloads */
function resetColorCaches() { _nexpDone = false; _simStats = null; _trendIdx = null; }
