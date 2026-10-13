/* ============================================================
   F13LD.vault · 25-variables.js  (v0.10.0)
   The user's own variables: formulas over Vault's metrics, computed for
   every design and registered as metrics ("My variables"), so they work on
   every axis, colour, sort, range filter, the correlation map and Compare.

   A formula is text over metric KEYS in brackets — "[_emax] / ([volume_fraction] / 100) ^ 2".
   It is tokenized and parsed into a tree and evaluated in one pass over the
   loaded designs. There is no eval: formulas from share links and files are
   only ever data.

   Saved per browser (LS_VARS). A share link carries the definitions of the
   variables its view uses; opening it adds them for that view and offers to
   keep them. Domain score and scarcity are not inputs (they change with the
   domain, so a variable built on them would change meaning silently).
   ============================================================ */

var LS_VARS = 'f13ld.vault.variables.v1';
var VAR_MAX = 24;
var VARS = [];                 /* { k, label, short, f, scale: auto|lin|log, better: 1|-1|0, linkOnly } */
var VAR_NOT_INPUT = { _score: 1, _scar: 1 };
var VAR_FN = { abs: 1, sqrt: 1, log10: 1, ln: 1, rank: 1, scale: 1, min: -1, max: -1, mean: -1 };   /* 1 = one input, -1 = two or more */
var VAR_FN_INFO = [['abs', 'Size, ignoring sign'], ['sqrt', 'Square root'], ['log10', 'Log, base 10'], ['ln', 'Natural log'],
  ['min', 'Smallest of several'], ['max', 'Largest of several'], ['mean', 'Average of several'],
  ['rank', '0–1 rank across the Vault'], ['scale', '0–1 between the Vault’s min and max']];
/* v0.10.1 — a template input the loaded designs don't have falls back to the
   first of these that they do (older Sweep runs have no specific surface or
   shear); a template with an input that has no fallback is hidden. */
var VAR_ALTS = { _sv: ['surface_complexity'], _gmean: ['gxy_norm', 'gyz_norm', 'gxz_norm'], keff_avg_norm: ['keff_max_norm'], _emax: ['ex_norm'] };
function varTemplateFormula(t) {
  var ok = true;
  var f = t.f.replace(/\[([^\]]+)\]/g, function (all, k) {
    var c = [k].concat(VAR_ALTS[k] || []).filter(hasMetric)[0];
    if (!c) { ok = false; return all; }
    return '[' + c + ']';
  });
  return ok ? f : null;
}
var VAR_TEMPLATES = [
  { n: 'Ratio', f: '[_gmean] / [_emax]', name: 'Shear to stiffness' },
  { n: 'Per material', f: '[_sv] / ([volume_fraction] / 100)', name: 'Surface per material' },
  { n: 'Density-scaled', f: '[_emax] / ([volume_fraction] / 100) ^ 2', name: 'Stiffness past ρ²' },
  { n: 'Weakest axis', f: 'min([ex_norm], [ey_norm], [ez_norm]) / ([volume_fraction] / 100)', name: 'Weakest-axis efficiency' },
  { n: 'Rank blend', f: '0.6 * rank([_sv]) + 0.4 * rank([keff_avg_norm])', name: 'Surface and conduction' },
  { n: 'Distance to target', f: 'abs([pore_size_norm] - 0.45)', name: 'Pore off target' }
];

function varByKey(k) { for (var i = 0; i < VARS.length; i++) if (VARS[i].k === k) return VARS[i]; return null; }
function isVarKey(k) { return !!varByKey(k); }
function varNewKey() { var k; do { k = '_u' + Math.random().toString(36).slice(2, 8); } while (METRIC_MAP[k]); return k; }

/* ── formula text ──────────────────────────────────────────────────── */
function varTokenize(s) {
  var out = [], i = 0; s = String(s || '');
  while (i < s.length) {
    var c = s[i];
    if (/\s/.test(c)) { i++; continue; }
    if (c === '[') { var j = s.indexOf(']', i); if (j < 0) { out.push({ t: 'bad', v: s.slice(i), why: 'A metric is missing its closing bracket' }); break; } out.push({ t: 'm', v: s.slice(i + 1, j) }); i = j + 1; continue; }
    if (/[0-9.]/.test(c)) { var m = /^[0-9]*\.?[0-9]+(e[-+]?[0-9]+)?/i.exec(s.slice(i)); if (!m) { out.push({ t: 'bad', v: c, why: 'Not a number' }); i++; continue; } out.push({ t: 'n', v: m[0] }); i += m[0].length; continue; }
    if (/[a-z]/i.test(c)) { var w = /^[a-z0-9]+/i.exec(s.slice(i))[0]; out.push(VAR_FN[w] ? { t: 'fn', v: w } : { t: 'bad', v: w, why: 'Unknown word “' + w + '”' }); i += w.length; continue; }
    if ('+-*/^'.indexOf(c) >= 0) { out.push({ t: 'op', v: c }); i++; continue; }
    if ('(),'.indexOf(c) >= 0) { out.push({ t: 'p', v: c }); i++; continue; }
    out.push({ t: 'bad', v: c, why: 'Unknown symbol “' + c + '”' }); i++;
  }
  return out;
}
function varUntok(t) { return t.map(function (x) { return x.t === 'm' ? '[' + x.v + ']' : x.v; }).join(' ').replace(/\( /g, '(').replace(/ \)/g, ')').replace(/ ,/g, ','); }
function varIsStart(t) { return !!t && (t.t === 'm' || t.t === 'n' || t.t === 'fn' || (t.t === 'p' && t.v === '(')); }
function varIsEnd(t) { return !!t && (t.t === 'm' || t.t === 'n' || (t.t === 'p' && t.v === ')')); }
/* Metrics a formula may use: every metric with data except domain score and scarcity; other variables too. */
function varInputOK(k) { return !!METRIC_MAP[k] && !VAR_NOT_INPUT[k] && (hasMetric(k) || isVarKey(k)); }
function varTokLabel(t) { return t.t === 'p' ? 'the bracket' : t.t === 'm' ? mShort(t.v) : t.v; }

/* Parse into a tree. Throws { message, tok } with tok = the token(s) to outline. */
function varParse(toks, selfKey) {
  var i = 0;
  function pk() { return toks[i]; }
  function err(msg, tok) { var e = new Error(msg); e.tok = tok; throw e; }
  function adj(inList) { var a = toks[i - 1], b = toks[i]; if (varIsEnd(a) && varIsStart(b)) err((inList ? 'Add a comma or an operator between ' : 'Add an operator between ') + varTokLabel(a) + ' and ' + varTokLabel(b), [a, b]); }
  function expr() { var a = term(); while (pk() && pk().t === 'op' && (pk().v === '+' || pk().v === '-')) { var o = toks[i++].v; a = { op: o, a: a, b: term() }; } return a; }
  function term() { var a = power(); while (pk() && pk().t === 'op' && (pk().v === '*' || pk().v === '/')) { var o = toks[i++].v; a = { op: o, a: a, b: power() }; } return a; }
  function power() { var a = unary(); if (pk() && pk().t === 'op' && pk().v === '^') { i++; a = { op: '^', a: a, b: power() }; } return a; }
  function unary() { if (pk() && pk().t === 'op' && pk().v === '-') { i++; return { op: 'neg', a: unary() }; } return atom(); }
  function atom() {
    var t = toks[i++];
    if (!t) err('Ends too soon — add a metric or a number');
    if (t.t === 'bad') err(t.why, t);
    if (t.t === 'n') return { num: +t.v };
    if (t.t === 'm') {
      if (selfKey && (t.v === selfKey || varUses(t.v, selfKey))) err('A variable cannot use itself', t);
      if (VAR_NOT_INPUT[t.v]) err(mLabel(t.v) + ' changes with the domain, so it can’t go in a variable', t);
      if (!varInputOK(t.v)) err(METRIC_MAP[t.v] ? '“' + mShort(t.v) + '” has no values in the Vault yet' : '“' + t.v + '” is not a metric', t);
      return { key: t.v };
    }
    if (t.t === 'fn') {
      if (!pk() || pk().v !== '(') err(t.v + ' needs brackets after it', t); i++;
      var args = [expr()]; while (pk() && pk().v === ',') { i++; args.push(expr()); }
      adj(VAR_FN[t.v] === -1);
      if (!pk() || pk().v !== ')') err('A bracket after ' + t.v + ' is not closed', t); i++;
      if (VAR_FN[t.v] === 1 && args.length !== 1) err(t.v + ' takes one input', t);
      if (VAR_FN[t.v] === -1 && args.length < 2) err(t.v + ' takes two or more inputs, separated by commas', t);
      return { fn: t.v, args: args };
    }
    if (t.v === '(') { var e = expr(); adj(false); if (!pk() || pk().v !== ')') err('A bracket is not closed', t); i++; return e; }
    err('Unexpected “' + ({ '*': '×', '/': '÷', '-': '−' }[t.v] || t.v) + '”', t);
  }
  if (!toks.length) err('');
  var tree = expr();
  if (i < toks.length) { adj(false); err('Unexpected “' + toks[i].v + '”', toks[i]); }
  return tree;
}
/* Does variable a use variable b, directly or through others? */
function varUses(a, b, seen) {
  var v = varByKey(a); if (!v) return false; seen = seen || {}; if (seen[a]) return false; seen[a] = 1;
  return varRefs(v.f).some(function (k) { return k === b || varUses(k, b, seen); });
}
function varRefs(f) { var out = [], re = /\[([^\]]+)\]/g, m; while ((m = re.exec(f))) if (out.indexOf(m[1]) < 0) out.push(m[1]); return out; }

/* Evaluate a tree over DB.all → Float64Array, NaN where a design has no value. */
function varCol(k) { var a = new Float64Array(DB.N); for (var i = 0; i < DB.N; i++) { var v = DB.all[i][k]; a[i] = isNum(v) ? v : NaN; } return a; }
function varEval(n) {
  var N = DB.N, o = new Float64Array(N), i;
  if (n.num != null) { o.fill(n.num); return o; }
  if (n.key) return varCol(n.key);
  if (n.op === 'neg') { var a0 = varEval(n.a); for (i = 0; i < N; i++) o[i] = -a0[i]; return o; }
  if (n.op) {
    var a = varEval(n.a), b = varEval(n.b);
    for (i = 0; i < N; i++) { var x = a[i], y = b[i]; o[i] = n.op === '+' ? x + y : n.op === '-' ? x - y : n.op === '*' ? x * y : n.op === '/' ? (y === 0 ? NaN : x / y) : Math.pow(x, y); }
    return o;
  }
  var A = n.args.map(varEval), f = n.fn, v;
  if (f === 'rank' || f === 'scale') {
    var src = A[0], idx = []; for (i = 0; i < N; i++) if (isFinite(src[i])) idx.push(i); o.fill(NaN);
    if (f === 'rank') { idx.sort(function (p, q) { return src[p] - src[q]; }); idx.forEach(function (ix, r) { o[ix] = idx.length > 1 ? r / (idx.length - 1) : 0.5; }); return o; }
    var lo = Infinity, hi = -Infinity; idx.forEach(function (ix) { if (src[ix] < lo) lo = src[ix]; if (src[ix] > hi) hi = src[ix]; });
    idx.forEach(function (ix) { o[ix] = hi > lo ? (src[ix] - lo) / (hi - lo) : 0; }); return o;
  }
  for (i = 0; i < N; i++) {
    var x0 = A[0][i];
    if (f === 'abs') v = Math.abs(x0); else if (f === 'sqrt') v = x0 < 0 ? NaN : Math.sqrt(x0);
    else if (f === 'log10') v = x0 <= 0 ? NaN : Math.log10(x0); else if (f === 'ln') v = x0 <= 0 ? NaN : Math.log(x0);
    else { var xs = A.map(function (c) { return c[i]; }); v = f === 'min' ? Math.min.apply(null, xs) : f === 'max' ? Math.max.apply(null, xs) : xs.reduce(function (s, q) { return s + q; }, 0) / xs.length; }
    o[i] = v;
  }
  for (i = 0; i < N; i++) if (!isFinite(o[i])) o[i] = NaN;
  return o;
}
/* Formula → { vals } or { err, tok, toks }. */
function varCompile(f, selfKey) {
  var toks = varTokenize(f);
  try { var tree = varParse(toks, selfKey); var vals = varEval(tree); for (var i = 0; i < vals.length; i++) if (!isFinite(vals[i])) vals[i] = NaN; return { vals: vals, toks: toks }; }
  catch (e) { return { err: e.message, tok: e.tok, toks: toks }; }
}
/* "E* ÷ (VF ÷ 100) ^ 2" — the formula as people read it. */
function varPretty(f) {
  return varTokenize(f).map(function (t) { return t.t === 'm' ? mShort(t.v) : t.t === 'op' ? ({ '*': '×', '/': '÷', '-': '−' }[t.v] || t.v) : t.v; })
    .join(' ').replace(/\( /g, '(').replace(/ \)/g, ')').replace(/ ,/g, ',').replace(/(abs|sqrt|log10|ln|min|max|mean|rank|scale) \(/g, '$1(');
}

/* ── registry ──────────────────────────────────────────────────────── */
function varMeta(v) { return { group: 'My variables', key: v.k, label: v.label, short: v.short, unit: '', user: true }; }
function varRegisterAll() {
  USER_METRICS.forEach(function (m) { if (!varByKey(m.key)) delete METRIC_MAP[m.key]; });
  USER_METRICS.length = 0;
  VARS.forEach(function (v) { var m = varMeta(v); USER_METRICS.push(m); METRIC_MAP[v.k] = m; });
}
function varGloss(k) {
  var v = varByKey(k); if (!v) return null;
  return { def: 'Your variable: ' + varPretty(v.f) + '.', interp: (v.linkOnly ? 'Came with a shared link — keep it from My variables.' : 'Saved in this browser.') + (v.better ? ' ' + (v.better > 0 ? 'Higher' : 'Lower') + ' is better.' : '') };
}
function varShortTaken(s, except) {
  var hit = false; metricsAll().forEach(function (m) { if (m.key !== except && mShort(m.key).toLowerCase() === s.toLowerCase()) hit = true; }); return hit;
}
function varAutoShort(name, except) {
  var w = String(name).split(/\s+/).filter(function (x) { return /^[a-z0-9]/i.test(x); });   /* initials of the words that start with a letter or digit */
  var s = (w.length > 1 ? w.map(function (x) { return x[0].toUpperCase(); }).join('').slice(0, 5) : String(name).slice(0, 8)) || 'Var', b = s, i = 2;
  while (varShortTaken(s, except)) s = b + i++;
  return s;
}

/* Compute every variable for every design (order follows dependencies). */
function computeVars() {
  if (!DB.N) return;
  var done = {}, left = VARS.slice(), guard = 0;
  while (left.length && guard++ < VARS.length + 2) {
    left = left.filter(function (v) {
      var deps = varRefs(v.f).filter(isVarKey);
      if (deps.some(function (k) { return !done[k]; })) return true;
      var r = varCompile(v.f, v.k);
      for (var i = 0; i < DB.N; i++) DB.all[i][v.k] = r.vals && isFinite(r.vals[i]) ? r.vals[i] : null;
      v.err = r.err || null; done[v.k] = 1;
      computeStat(v.k); delete _pctCache[v.k]; delete _popCache[v.k];
      var st = DB.stats[v.k];
      if (v.scale === 'lin') DB.log[v.k] = false; else if (v.scale === 'log') DB.log[v.k] = !!(st && st.min > 0);
      return false;
    });
  }
}
/* Anything in the view that points at a variable with no values falls back to the defaults. */
function varSanitizeView() {
  function gone(k) { return isVarKey(k) && !hasMetric(k) || (/^_u/.test(k) && !METRIC_MAP[k]); }
  ['x', 'y', 'z'].forEach(function (a) { if (gone(S.ax3[a])) S.ax3[a] = { x: '_beff', y: 'anisotropy', z: '_score' }[a]; });
  ['x', 'y'].forEach(function (a) { if (gone(S.ax2[a])) S.ax2[a] = { x: 'volume_fraction', y: '_emax' }[a]; });
  if (gone(S.color)) S.color = 'family';
  if (S.sort && gone(S.sort.k)) S.sort = { k: '_score', dir: -1 };
  varSanitizeF(F);
}
function varSanitizeF(f) {
  Object.keys(f.ranges || {}).forEach(function (k) { if (!METRIC_MAP[k] || (isVarKey(k) && !hasMetric(k))) delete f.ranges[k]; });
  f.rangeKeys = (f.rangeKeys || []).filter(function (k) { return !!METRIC_MAP[k] && !(isVarKey(k) && !hasMetric(k)); });
}

/* ── storage ───────────────────────────────────────────────────────── */
function varsStore() {
  Store.set(LS_VARS, VARS.filter(function (v) { return !v.linkOnly; }).map(function (v) { return { k: v.k, label: v.label, short: v.short, f: v.f, scale: v.scale, better: v.better }; }));
}
function varClean(o) {
  if (!o || typeof o.f !== 'string' || typeof o.label !== 'string') return null;
  var k = /^_u[a-z0-9]{2,12}$/.test(o.k || '') && !(METRIC_MAP[o.k] && !METRIC_MAP[o.k].user) ? o.k : varNewKey();
  return { k: k, label: o.label.trim().slice(0, 40) || 'My variable', short: String(o.short || '').trim().slice(0, 10), f: varUntok(varTokenize(o.f).slice(0, 200)),
    scale: ['auto', 'lin', 'log'].indexOf(o.scale) >= 0 ? o.scale : 'auto', better: o.better === 1 || o.better === -1 ? o.better : 0 };
}
function varsLoad() {
  var a = Store.get(LS_VARS, []);
  if (Array.isArray(a)) a.slice(0, VAR_MAX).forEach(function (o) { var v = varClean(o); if (v && !varByKey(v.k)) VARS.push(v); });
  VARS.forEach(function (v) { if (!v.short) v.short = varAutoShort(v.label, v.k); });
  varRegisterAll();
}
varsLoad();

/* Add, update, delete — each recomputes and refreshes whatever shows a metric. */
function varSaveDef(def, editKey) {
  var v = editKey ? varByKey(editKey) : null;
  if (!v) { if (VARS.filter(function (x) { return !x.linkOnly; }).length >= VAR_MAX) return { err: 'You have ' + VAR_MAX + ' variables — delete one first' }; v = { k: varNewKey() }; VARS.push(v); }
  v.label = def.label; v.f = def.f; v.scale = def.scale; v.better = def.better; v.linkOnly = false;
  v.short = def.short && !varShortTaken(def.short, v.k) ? def.short : (def.short ? varAutoShort(def.short, v.k) : varAutoShort(def.label, v.k));
  varRegisterAll(); computeVars(); varsStore(); varsChanged();
  return { v: v };
}
function varDelete(k) {
  var v = varByKey(k); if (!v) return { err: 'Not found' };
  var dep = VARS.filter(function (x) { return x !== v && varRefs(x.f).indexOf(k) >= 0; });
  if (dep.length) return { err: '“' + dep[0].label + '” uses this variable — change that one first' };
  VARS.splice(VARS.indexOf(v), 1);
  DB.all.forEach(function (d) { delete d[k]; });
  delete DB.stats[k]; delete DB.sorted[k]; delete DB.log[k]; delete _pctCache[k]; delete _popCache[k];
  var had = !!F.ranges[k] || F.rangeKeys.indexOf(k) >= 0;
  varRegisterAll(); varSanitizeView(); varsStore();
  if (had) changed('remove ' + v.label, false);
  varsChanged();
  return { v: v };
}
/* After any variable change: every view, menu and list that shows a metric. */
function varsChanged() {
  if (!DB.loaded) return;
  varSanitizeView();
  markViewsDirty(); setAxesTargets3D(); set2DTargets(); recolor(); renderAxisChips(); renderLegend();
  if (typeof buildKeyPane === 'function') buildKeyPane();
  if (typeof buildRangeRows === 'function') buildRangeRows();
  if (typeof renderAddList === 'function') renderAddList('');
  if (S.drawer && S.tab === 'compare') renderCompare();
  savePrefs(); shareLinkSoon(); requestRefresh();
  if (S.sel) renderInspector();
}

/* ── share links ───────────────────────────────────────────────────── */
/* The definitions a view needs: variables on its axes, colour, sort and filters, and what they use. */
function varsForView() {
  var keys = [S.ax3.x, S.ax3.y, S.ax3.z, S.ax2.x, S.ax2.y, S.color, S.sort && S.sort.k].concat(F.rangeKeys, Object.keys(F.ranges)), out = [];
  function add(k) { var v = varByKey(k); if (!v || out.indexOf(v) >= 0) return; varRefs(v.f).forEach(add); out.push(v); }
  keys.forEach(add);
  return out.map(function (v) { return { k: v.k, l: v.label, s: v.short, f: v.f, sc: v.scale, b: v.better }; });
}
/* Read the definitions from a link (before its axes and filters are applied).
   Returns a key map: link key → local key. */
function varsFromLink(list) {
  var map = {}, added = [];
  (Array.isArray(list) ? list : []).slice(0, VAR_MAX).forEach(function (o) {
    if (!o || typeof o.f !== 'string') return;
    var f = varUntok(varTokenize(o.f).map(function (t) { if (t.t === 'm' && map[t.v]) t.v = map[t.v]; return t; }));
    var same = VARS.filter(function (v) { return v.f === f; })[0];
    if (same) { map[o.k] = same.k; return; }
    var v = varClean({ k: varByKey(o.k) ? null : o.k, label: String(o.l || 'Shared variable'), short: o.s, f: f, scale: o.sc, better: o.b });
    if (!v) return;
    v.linkOnly = true; if (!v.short || varShortTaken(v.short, v.k)) v.short = varAutoShort(v.label, v.k);
    VARS.push(v); added.push(v); map[o.k] = v.k;
  });
  if (added.length) { varRegisterAll(); computeVars(); }
  return { map: map, added: added };
}
function varsKeepLinked() {
  VARS.forEach(function (v) { v.linkOnly = false; }); varsStore();
  toast('Kept in My variables'); if (typeof renderVarsPane === 'function') renderVarsPane();
}
