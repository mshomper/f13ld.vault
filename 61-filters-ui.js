/* ============================================================
   F13LD.vault · 61-filters-ui.js
   The Filters pane. One builder serves the desktop drawer and the phone's
   full-screen filters; updateFilterUI() refreshes counts, histograms and
   slider positions in place (nothing is rebuilt while you drag).
   ============================================================ */

function filtersHTML(prefix) {
  var dom = '<div class="doms">' + DOMAIN_IDS.map(function (k) {
    return '<button class="dom" data-dom="' + k + '" title="' + esc((Z_COMPOUND_GLOSSARY[k] || {}).def || '') + '"><span class="ico">' + ic(k) + '</span><span class="dt"><b>' + esc(DOMAIN_SHORT[k]) + '</b><em>' + esc(domainZLabel(k)) + '</em></span></button>';
  }).join('') + '</div>';
  var fam = '<div class="chips">' + DB.families.map(function (f) { return '<button class="chip" data-chip="fam:' + f + '"><i class="dot" style="background:' + (CAT_PALETTES.family[f] || '#9a9fb7') + '"></i>' + esc(FAMILY_NAME[f] || f) + '<span class="n"></span></button>'; }).join('') + '</div>';
  var kap = '<div class="chips">' + KAPPA_CLASSES.map(function (c) { return '<button class="chip" data-chip="kappa:' + c.key + '" title="' + esc(c.desc) + '">' + esc(c.label) + '<span class="n"></span></button>'; }).join('') + '</div>';
  var grid = DB.grids.length ? '<div class="lbl">Solver grid</div><div class="chips">' + DB.grids.map(function (g) { return '<button class="chip" data-chip="grid:' + g + '">N = ' + g + '<span class="n"></span></button>'; }).join('') + '</div>' : '';
  var flag = '<div class="chips">' + FLAG_VALUES.map(function (f) { return '<button class="chip" data-chip="flag:' + f[0] + '">' + (f[0] === 'flagged' ? gl('flag') : '') + esc(f[1]) + '<span class="n"></span></button>'; }).join('') + '</div>';
  var pois = '<div class="chips">' + POIS_VALUES.map(function (f) { return '<button class="chip" data-chip="pois:' + f[0] + '">' + esc(f[1]) + '<span class="n"></span></button>'; }).join('') + '</div>';   /* v0.9.0 */
  var perc = ['solid', 'void'].map(function (t) {
    return '<div class="perc"><span class="pl">' + (t === 'solid' ? 'Solid' : 'Void') + '</span>' + ['x', 'y', 'z'].map(function (a) { return '<button class="ax" data-perc="' + t + ':' + a + '" aria-pressed="false" title="' + (t === 'solid' ? 'Solid must carry load along ' : 'Pores must connect along ') + a.toUpperCase() + '">' + a.toUpperCase() + '</button>'; }).join('') + '<span class="pd">' + (t === 'solid' ? 'load path' : 'fluid path') + '</span></div>';
  }).join('');
  var con = '<div class="csearch"><span class="gl-wrap">' + gl('search') + '</span><input data-csearch placeholder="Find a contributor" autocomplete="off" spellcheck="false"></div><div class="chips contribs">' +
    DB.contributors.map(function (c, i) { return '<button class="chip" data-chip="contrib:' + esc(c) + '"' + (i >= 10 ? ' data-extra="1"' : '') + '>' + esc(c) + '<span class="n"></span></button>'; }).join('') + '</div>';
  /* v0.7.1 — where designs came from: aimed runs (24-aim.js) */
  var runs = DB.aimRuns || [];
  var src = runs.length ? '<div class="lbl">Source <span class="lbl-n">aimed = a Sweep run aimed at a target</span></div><div class="chips">' +
    '<button class="chip" data-chip="src:aimed">' + gl('target') + 'Aimed runs<span class="n"></span></button><button class="chip" data-chip="src:plain">Ordinary sweeps<span class="n"></span></button></div>' +
    '<div class="chips aims">' + runs.map(function (R) { return '<button class="chip" data-chip="aim:' + esc(R.id) + '" title="' + esc(aimLegendLabel(R) + ' · ' + R.hits + ' of ' + R.designs.length + ' on target') + '"><i class="dot" style="background:' + R.color + '"></i>' + esc(aimLabel(R)) + '<span class="n"></span></button>'; }).join('') + '</div>' : '';
  var add = '<div class="addm"><span class="gl-wrap">' + gl('search') + '</span><input data-addin placeholder="Add a metric filter" autocomplete="off" spellcheck="false"><div class="addm-list" data-addlist></div></div>';
  return '<div class="dr-cols">' +
    '<section class="dr-col" data-sec="domain"><div class="dr-h"><span class="ico">' + ic('target') + '</span>Domain<span>re-ranks everything</span></div>' + dom + '</section>' +
    '<section class="dr-col"><div class="dr-h"><span class="ico">' + ic('cell') + '</span>Population</div><div class="lbl">Family</div>' + fam + '<div class="lbl">Connectivity</div>' + kap + grid + '<div class="lbl">Stiffness flag <span class="lbl-n">flagged designs are never hidden unless you choose</span></div>' + flag + '<div class="lbl">Poisson’s ratio <span class="lbl-n">from the full stiffness matrix</span></div>' + pois + '</section>' +
    '<section class="dr-col"><div class="dr-h"><span class="ico">' + ic('orbit') + '</span>Percolation</div>' + perc + '<div class="lbl">Contributor</div>' + con + src + '<div data-region></div></section>' +
    '<section class="dr-col"><div class="dr-h"><span class="ico">' + ic('filters') + '</span>Ranges<span>bars = designs still in play</span></div><div data-ranges></div>' + add + '</section>' +
  '</div>';
}
function rangeRowHTML(k) {
  var sc = rangeScale(k);
  return '<div class="rng" data-key="' + k + '"><div class="rh"><span class="rl" title="' + esc((mGloss(k) || {}).def || '') + '">' + esc(mLabel(k)) + (sc.lg ? '<em>log</em>' : '') + '</span><span class="rv" data-rv="' + k + '"></span><button class="rx" data-rmrange="' + k + '" title="Remove this slider" aria-label="Remove ' + esc(mLabel(k)) + '">' + gl('x') + '</button></div>' +
    '<div class="rhist" data-hist="' + k + '"></div>' +
    '<div class="rtrack" data-track="' + k + '"><div class="rfill"></div>' +
    '<div class="rth" data-thumb="0" role="slider" tabindex="0" aria-label="' + esc(mLabel(k)) + ' minimum"></div><div class="rth" data-thumb="1" role="slider" tabindex="0" aria-label="' + esc(mLabel(k)) + ' maximum"></div></div></div>';
}
function buildFilters() {
  ['#dFilters', '#mFB'].forEach(function (s) { var e = $(s); if (e) e.innerHTML = filtersHTML(s); });
  buildRangeRows();
}
function buildRangeRows() {
  F.rangeKeys = F.rangeKeys.filter(hasMetric).slice(0, 18);
  Object.keys(F.ranges).forEach(function (k) { if (F.ranges[k] && F.rangeKeys.indexOf(k) < 0 && hasMetric(k)) F.rangeKeys.push(k); });
  $$('[data-ranges]').forEach(function (r) { r.innerHTML = F.rangeKeys.map(rangeRowHTML).join(''); });
  renderAddList('');
  updateFilterUI();
}
function histSVG(k) {
  var h = FX.hist[k]; if (!h) return '';
  var r = F.ranges[k], sc = rangeScale(k), top = Math.max.apply(null, Array.prototype.slice.call(h.all).concat([1])), bw = 200 / HIST_BINS, s = '<svg viewBox="0 0 200 32" preserveAspectRatio="none" aria-hidden="true">';
  for (var i = 0; i < HIST_BINS; i++) {
    var lo = sc.inv(i / HIST_BINS), hi = sc.inv((i + 1) / HIST_BINS), inR = !r || (hi >= r[0] && lo <= r[1]);
    var h1 = h.all[i] / top * 30, h2 = h.on[i] / top * 30;
    s += '<rect x="' + (i * bw + 0.6) + '" y="' + (32 - h1) + '" width="' + (bw - 1.2) + '" height="' + h1 + '" fill="rgba(255,255,255,0.06)"/>';
    s += '<rect x="' + (i * bw + 0.6) + '" y="' + (32 - h2) + '" width="' + (bw - 1.2) + '" height="' + h2 + '" fill="' + (inR ? '#5BA4EE' : 'rgba(91,164,238,0.22)') + '"/>';
  }
  return s + '</svg>';
}
function updateFilterUI() {
  $$('[data-dom]').forEach(function (b) { b.classList.toggle('on', b.dataset.dom === F.domain); b.setAttribute('aria-pressed', b.dataset.dom === F.domain ? 'true' : 'false'); });
  $$('[data-chip]').forEach(function (b) {
    var p = b.dataset.chip.split(':'), dim = p[0], v = p.slice(1).join(':'), set = F[dim] || [];
    var on = dim === 'grid' ? set.map(String).indexOf(v) >= 0 : set.indexOf(v) >= 0;
    var n = (FX.counts[dim] || {})[v] || 0;
    b.classList.toggle('on', on); b.classList.toggle('zero', n === 0 && !on); b.setAttribute('aria-pressed', on ? 'true' : 'false');
    var c = b.querySelector('.n'); if (c) c.textContent = n.toLocaleString();
  });
  $$('[data-perc]').forEach(function (b) { var p = b.dataset.perc.split(':'), on = F[p[0]].indexOf(p[1]) >= 0; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
  $$('[data-hist]').forEach(function (h) { h.innerHTML = histSVG(h.dataset.hist); });
  $$('[data-track]').forEach(function (t) {
    var k = t.dataset.track, sc = rangeScale(k), r = F.ranges[k] || [sc.min, sc.max], a = sc.f(r[0]) * 100, b = sc.f(r[1]) * 100;
    t.querySelector('.rfill').style.cssText = 'left:' + a + '%;width:' + Math.max(0, b - a) + '%';
    var t0 = t.querySelector('[data-thumb="0"]'), t1 = t.querySelector('[data-thumb="1"]');
    t0.style.left = a + '%'; t1.style.left = b + '%';
    t0.setAttribute('aria-valuetext', fmtRangeVal(k, r[0])); t1.setAttribute('aria-valuetext', fmtRangeVal(k, r[1]));
  });
  $$('[data-rv]').forEach(function (e) { var k = e.dataset.rv, r = F.ranges[k]; e.textContent = r ? fmtRangeVal(k, r[0]) + ' – ' + fmtRangeVal(k, r[1]) : 'any'; e.classList.toggle('set', !!r); });
  $$('[data-region]').forEach(function (e) {
    e.innerHTML = F.region ? '<div class="lbl">Region</div><div class="region-row">' + ic('brush') + '<span><b>' + F.region.length + ' designs</b> from a brushed box or the Pareto front</span><button class="mini" data-untag="region">' + gl('x') + 'Clear</button></div>' : '';
  });
}
function renderAddList(q) {
  q = (q || '').trim().toLowerCase();
  var have = F.rangeKeys, opts = pickableMetrics().filter(function (m) { return hasMetric(m.key) && have.indexOf(m.key) < 0 && (!q || m.label.toLowerCase().indexOf(q) >= 0 || mShort(m.key).toLowerCase().indexOf(q) >= 0); });
  if (!q) { var pref = (DOMAIN_DEFAULTS[F.domain] || []).concat(['_emax', '_gmean', 'anisotropy']); opts.sort(function (a, b) { var ia = pref.indexOf(a.key), ib = pref.indexOf(b.key); return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib); }); }
  $$('[data-addlist]').forEach(function (l) { l.innerHTML = opts.slice(0, q ? 14 : 6).map(function (m) { return '<button data-addm="' + m.key + '" title="' + esc((mGloss(m.key) || {}).def || '') + '">' + gl('plus') + esc(m.label) + '</button>'; }).join(''); });
}
function filterContribs(input) {
  var q = input.value.trim().toLowerCase(), box = input.closest('.dr-col').querySelector('.contribs');
  $$('[data-chip^="contrib:"]', box).forEach(function (b) { var name = b.dataset.chip.slice(8).toLowerCase(); b.style.display = (q ? name.indexOf(q) >= 0 : !b.dataset.extra || F.contrib.indexOf(b.dataset.chip.slice(8)) >= 0) ? '' : 'none'; });
}

/* ── chip / tile clicks ─────────────────────────────────────────────── */
function toggleChip(spec) {
  var p = spec.split(':'), dim = p[0], v = p.slice(1).join(':');
  if (dim === 'grid') { var nv = Number(v), i = F.grid.indexOf(nv); if (i >= 0) F.grid.splice(i, 1); else F.grid.push(nv); }
  else { var arr = F[dim], j = arr.indexOf(v); if (j >= 0) arr.splice(j, 1); else arr.push(v); }
  changed(dim + ' filter', false);
}
function togglePerc(spec) { var p = spec.split(':'), arr = F[p[0]], i = arr.indexOf(p[1]); if (i >= 0) arr.splice(i, 1); else arr.push(p[1]); arr.sort(); changed(p[0] + ' percolation', false); }

/* ── range sliders: drag, keyboard ──────────────────────────────────── */
var _rDrag = null;
function rangeFromPointer(k, track, clientX) { var sc = rangeScale(k), rc = track.getBoundingClientRect(); return sc.inv(clamp((clientX - rc.left) / (rc.width || 1), 0, 1)); }
function setRange(k, lo, hi) {
  var sc = rangeScale(k), eps = 0.002;
  if (lo > hi) { var t = lo; lo = hi; hi = t; }
  F.ranges[k] = (sc.f(lo) <= eps && sc.f(hi) >= 1 - eps) ? null : [Math.max(sc.min, lo), Math.min(sc.max, hi)];
  if (!F.ranges[k]) delete F.ranges[k];
  requestRefresh(true);
}
document.addEventListener('pointerdown', function (e) {
  var tr = e.target.closest && e.target.closest('[data-track]'); if (!tr) return;
  e.preventDefault();
  var k = tr.dataset.track, sc = rangeScale(k), r = F.ranges[k] || [sc.min, sc.max], v = rangeFromPointer(k, tr, e.clientX);
  var which = e.target.dataset.thumb != null ? +e.target.dataset.thumb : (Math.abs(sc.f(v) - sc.f(r[0])) < Math.abs(sc.f(v) - sc.f(r[1])) ? 0 : 1);
  _rDrag = { k: k, tr: tr, which: which, id: e.pointerId };
  try { tr.setPointerCapture(e.pointerId); } catch (x) { /* synthetic */ }
  moveRange(e.clientX);
});
document.addEventListener('pointermove', function (e) { if (_rDrag && e.pointerId === _rDrag.id) moveRange(e.clientX); });
/* end (or a cancelled touch) commits once, so the change always lands in undo history */
function _rEnd(e) { if (_rDrag && (e.pointerId === _rDrag.id || e.pointerId == null)) { var k = _rDrag.k; _rDrag = null; changed('range · ' + mShort(k), false); } }
document.addEventListener('pointerup', _rEnd); document.addEventListener('pointercancel', _rEnd);
function moveRange(cx) {
  var g = _rDrag, sc = rangeScale(g.k), r = (F.ranges[g.k] || [sc.min, sc.max]).slice(), v = rangeFromPointer(g.k, g.tr, cx);
  r[g.which] = v; if (r[0] > r[1]) { r.reverse(); g.which = 1 - g.which; }
  setRange(g.k, r[0], r[1]);
}
var _rangeKeyCommit = debounce(function (k) { changed('range · ' + mShort(k), false); }, 500);
document.addEventListener('keydown', function (e) {
  var th = e.target.closest && e.target.closest('.rth'); if (!th) return;
  var dir = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1, PageDown: -10, PageUp: 10 }[e.key]; if (!dir) return;
  e.preventDefault();
  var tr = th.closest('[data-track]'), k = tr.dataset.track, sc = rangeScale(k), r = (F.ranges[k] || [sc.min, sc.max]).slice(), w = +th.dataset.thumb;
  r[w] = sc.inv(clamp(sc.f(r[w]) + dir * (e.shiftKey ? 0.1 : 0.01), 0, 1));
  setRange(k, r[0], r[1]); _rangeKeyCommit(k);
});
