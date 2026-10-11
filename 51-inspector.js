/* ============================================================
   F13LD.vault · 51-inspector.js
   Everything about one design: live geometry, key metrics, the domain
   score broken into its factors, flags, the recipe parameters, where the
   design came from, and every metric.
   ============================================================ */

var TILE_KEYS = ['volume_fraction', '_emax', '_gmean', 'anisotropy', 'pore_size_p50_norm', 'keff_max_norm'];

function tileHTML(d, k) {
  var v = d[k], r = resolveValue(v, k), p = pct(d, k);
  var lab = mShort(k), unit = r.isResolved ? r.unit : (k === 'volume_fraction' ? '%' : (METRIC_MAP[k] && METRIC_MAP[k].unit) || '');
  return '<div class="tile" title="' + esc(resolveLabel(k, r.isResolved)) + '"><div class="k">' + esc(lab) + '</div><div class="v">' + (v == null ? '—' : esc(r.value)) + (v != null && unit ? '<small>' + esc(unit) + '</small>' : '') + '</div>' +
    '<div class="bar"><i style="width:' + (p == null ? 0 : (p * 100).toFixed(0)) + '%"></i></div><div class="pc">' + (p == null ? 'not recorded' : ordinal(Math.round(p * 100)) + ' <span class="pl">percentile</span><span class="ps">pct</span>') + '</div></div>';
}
function radarSVG(d, size) {
  var keys = (DOMAIN_DEFAULTS[F.domain] || DOMAIN_DEFAULTS.all).filter(hasMetric).slice(0, 6); if (keys.length < 3) keys = TILE_KEYS.filter(hasMetric).slice(0, 6);
  var W = size || 150, H = Math.round(W * 0.86), cx = W / 2, cy = H / 2 + 2, R0 = W * 0.29;
  var pt = function (i, f) { var a = -Math.PI / 2 + i * 2 * Math.PI / keys.length; return [cx + Math.cos(a) * R0 * f, cy + Math.sin(a) * R0 * f]; };
  var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Percentile signature">';
  [0.33, 0.66, 1].forEach(function (f) { s += '<polygon points="' + keys.map(function (k, i) { return pt(i, f).join(','); }).join(' ') + '" fill="none" stroke="rgba(255,255,255,0.08)"/>'; });
  keys.forEach(function (k, i) { var e = pt(i, 1), t = pt(i, 1.32), hw = mShort(k).length * 3.7 + 2; t[0] = clamp(t[0], hw, W - hw); s += '<line x1="' + cx + '" y1="' + cy + '" x2="' + e[0] + '" y2="' + e[1] + '" stroke="rgba(255,255,255,0.07)"/><text x="' + t[0] + '" y="' + (t[1] + 4) + '" text-anchor="middle" font-family="JetBrains Mono" font-size="12" fill="#8a90ab">' + esc(mShort(k)) + '</text>'; });
  S.pins.forEach(function (p, j) { if (p === d) return; s += '<polygon points="' + keys.map(function (k, i) { return pt(i, Math.max(0.04, pct(p, k) || 0)).join(','); }).join(' ') + '" fill="none" stroke="' + PIN_COLORS[j] + '" stroke-width="1.2" stroke-dasharray="3 3" opacity=".85"/>'; });
  if (d) s += '<polygon points="' + keys.map(function (k, i) { return pt(i, Math.max(0.04, pct(d, k) || 0)).join(','); }).join(' ') + '" fill="rgba(91,164,238,0.22)" stroke="#5BA4EE" stroke-width="1.6" stroke-linejoin="round"/>';
  return s + '</svg>';
}
function scoreBreakdownHTML(d) {
  var sb = scoreFactors(d, F.domain, domainPop(F.domain)), p = pct(d, '_score');
  return '<div class="isec"><div class="ish">' + ic(DOMAIN_IDS.indexOf(F.domain) >= 0 ? F.domain : 'all') + '<span>' + esc(domainZLabel()) + '</span><b>' + (p == null ? '—' : Math.round(p * 100)) + '</b><em>rank in the Vault</em></div>' +
    '<div class="factors">' + sb.factors.map(function (f) {
      return '<div class="fac"><span class="fl">' + esc(f.label) + '</span><span class="fb"><i style="width:' + (f.v == null ? 0 : (f.v * 100).toFixed(0)) + '%"></i></span><span class="fv">' + (f.act ? '<button class="mini" data-act="' + f.act + '">' + esc(f.txt) + '</button>' : esc(f.txt)) + '</span></div>';
    }).join('') + '</div><div class="fhow">Factors combined by ' + esc(sb.how) + '.' + (d._score == null ? ' This design is missing an input, so it has no score.' : '') + '</div></div>';
}
function noticesHTML(d) {
  var h = '';
  if (!d._m) {
    var fails = failingFilters(d);
    h += '<div class="notice out">' + gl('dot') + '<div><b>Outside your filters.</b> ' + (fails.length ? 'Hidden by ' + fails.map(function (t) { return '<button class="chip-mini" data-untag="' + esc(t.id) + '">' + esc(t.k + ' ' + t.v) + gl('x') + '</button>'; }).join(' ') : '') + '</div></div>';
  }
  if (d._stiff_flag === 'flagged') h += '<div class="notice warn">' + gl('flag') + '<div><b>Stiffness may read high</b>' + (d._flag_reasons ? ' — ' + esc(d._flag_reasons) : '') + '. Sweep\'s fast mode flagged it; verify in F13LD.lab.</div></div>';
  if (d.linear_cap_active) h += '<div class="notice warn">' + gl('flag') + '<div><b>' + esc(d.linear_cap_kind || 'Yield') + ' cap reached</b> at the reference load — compliance metrics are empty for this design.</div></div>';
  /* v0.7.1 — from an aimed run (24-aim.js) */
  var AR = aimRunOf(d);
  if (AR) h += '<div class="notice aim">' + gl('target') + '<div><b>From an aimed run</b> — ' + esc(aimLabel(AR)) + (AR.seedName ? ', seeded from ' + esc(AR.seedName) : '') + ' · ' + AR.hits + ' of ' + AR.designs.length + ' on target. <button class="chip-mini" data-act="show-aim" data-aim="' + esc(AR.id) + '">' + (S.color === 'aim' && S.aimSel === AR.id ? 'Showing this run' : 'Show this run') + '</button></div></div>';
  if (d.solver_validity === 'partial') h += '<div class="notice">' + gl('dot') + '<div><b>Partial load path</b> — only some axes percolate; their stiffness is reported, the others are zero.</div></div>';
  return h;
}
function recipeHTML(d) {
  var L = recipeLines(d);
  return '<div class="isec"><div class="ish">' + ic('cell') + '<span>Recipe</span><button class="mini" data-act="copy-recipe" title="Copy the recipe JSON">' + gl('copy') + 'Copy JSON</button></div>' +
    (L.length ? '<div class="kv">' + L.map(function (r) { return '<span>' + esc(r[0]) + '</span><b>' + esc(r[1]) + '</b>'; }).join('') + '</div>' : '<div class="fhow">No recipe stored with this design.</div>') + '</div>';
}
/* v0.7.0 — Sweep v0.24+ exports the solver as a block of details, older
   exports as one word; Ingest stores either. */
function solverText(sv) {
  if (sv == null || sv === '') return null;
  if (typeof sv === 'string') { try { var j = JSON.parse(sv); if (j && typeof j === 'object') sv = j; else return j == null ? sv : String(j); } catch (e) { return sv; } }
  if (typeof sv !== 'object') return String(sv);
  var parts = [sv.method || 'solver', sv.backend ? String(sv.backend).toUpperCase() : null, sv.version ? 'v' + String(sv.version).replace(/^v/, '') : null].filter(Boolean);
  return parts.join(' · ');
}
function solverTitle(sv) {
  if (typeof sv === 'string') { try { sv = JSON.parse(sv); } catch (e) { return ''; } }
  if (!sv || typeof sv !== 'object') return '';
  var t = [];
  if (sv.gpu_adapter) t.push('GPU: ' + sv.gpu_adapter);
  if (sv.precision_mode) t.push('precision: ' + sv.precision_mode);
  if (sv.gpu_cg_tol) t.push('CG tolerance ' + sv.gpu_cg_tol);
  if (sv.void_ratio) t.push('pores ' + sv.void_ratio + ' of the solid');
  if (sv.resolution_picker) t.push('grid picker ' + sv.resolution_picker + '³');
  return t.join(' · ');
}
/* the target a Sweep v0.28+ run aimed at, when it was one */
function aimedText(sv) {
  if (typeof sv === 'string') { try { sv = JSON.parse(sv); } catch (e) { return null; } }
  var T = sv && sv.target;
  if (!T || !Array.isArray(T.metrics) || !T.metrics.length) return null;
  return T.metrics.filter(function (m) { return m && m.key; }).map(function (m) { return mShort(m.key) + ' ' + (isNum(m.value) ? fmtRangeVal(m.key, m.value) : '?'); }).join(' · ') +
    (T.rounds && T.rounds.length ? ' · ' + T.rounds.length + ' round' + (T.rounds.length > 1 ? 's' : '') : '');
}
function provenanceHTML(d) {
  var date = d.exported_at || d.created_at, mat = d.material && (d.material.label || d.material.key || d.material.name);
  var L = [
    ['contributor', d.contributor_name], ['from', [d.source_tool, d.source_version ? 'v' + d.source_version : null].filter(Boolean).join(' ')],
    ['solver', solverText(d.solver)], ['aimed at', aimedText(d.solver)], ['grid', d._grid_N != null ? 'N = ' + d._grid_N : null], ['validity', d.solver_validity],
    ['converged', d.cg_converged == null ? null : (d.cg_converged ? 'yes' : 'no') + (d.cg_iters ? ' · ' + d.cg_iters + ' iterations' : '')],
    ['material', mat ? mat + (d.e_solid_gpa ? ' · ' + d.e_solid_gpa + ' GPa' : '') : (d.e_solid_gpa ? d.e_solid_gpa + ' GPa' : null)],
    ['cell size', d.cell_size_mm != null ? (+d.cell_size_mm).toFixed(2) + ' mm' : null], ['σ ref', d.sigma_ref_gpa != null ? (+d.sigma_ref_gpa * 1000).toFixed(0) + ' MPa' : null],
    ['date', date ? new Date(date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : null]
  ].filter(function (r) { return r[1] != null && r[1] !== ''; });
  var st = solverTitle(d.solver);
  return '<div class="isec"><div class="ish">' + ic('key') + '<span>Provenance</span></div><div class="kv">' + L.map(function (r) { return '<span>' + esc(r[0]) + '</span><b' + (r[0] === 'solver' && st ? ' title="' + esc(st) + '"' : '') + '>' + esc(r[1]) + '</b>'; }).join('') + '</div>' +
    (d.contributor_notes ? '<div class="fhow">' + esc(d.contributor_notes) + '</div>' : '') + '</div>';
}
function allMetricsHTML(d) {
  var groups = ['Derived', 'Geometry', 'Stiffness', 'Shear', 'Elastic tensor', 'Thermal', 'Compliance', 'Pore', 'Curvature', 'Topology', 'Transport'], by = {};
  metricsAll().forEach(function (m) { (by[m.group] = by[m.group] || []).push(m); });
  var h = '<details class="isec more-m"><summary>' + gl('chev') + 'All metrics</summary>' + groups.filter(function (g) { return by[g]; }).map(function (g) {
    return '<div class="mg">' + esc(g) + '</div><div class="kv">' + by[g].map(function (m) { var v = d[m.key], r = resolveValue(v, m.key);
      return '<span title="' + esc((mGloss(m.key) || {}).def || '') + '">' + esc(resolveLabel(m.key, r.isResolved)) + '</span><b>' + (v == null ? '—' : esc(r.value + (r.unit ? ' ' + r.unit : ''))) + '</b>'; }).join('') + '</div>';
  }).join('') + '</details>';
  var ext = d.metrics_extended;
  if (ext && typeof ext === 'object' && Object.keys(ext).length) {
    h += '<details class="isec more-m"><summary>' + gl('chev') + 'Advanced · per-axis &amp; extended</summary><div class="kv">' + Object.keys(ext).sort().map(function (k) {
      var v = ext[k]; return '<span>' + esc(k) + '</span><b>' + esc(v == null ? '—' : typeof v === 'number' ? fmtNum(v) : String(v)) + '</b>'; }).join('') + '</div></details>';
  }
  return h;
}

function renderInspector() {
  var d = S.sel, vp = $('#iVp'); if (!vp) return;
  $('#iEmpty').style.display = d ? 'none' : 'flex';
  var idx = d ? S.list.indexOf(d) : -1;
  $('#iBadge').innerHTML = d ? '<b>' + esc(d._id) + '</b> · ' + (idx >= 0 ? (idx + 1).toLocaleString() + ' of ' + S.cnt.toLocaleString() : 'outside filters') : 'no selection';
  $('#iName').textContent = d ? displayPreset(d) : '';
  $('#iSub').innerHTML = d ? '<i class="dot" style="background:' + (CAT_PALETTES.family[d.family] || '#9a9fb7') + '"></i>' + esc(FAMILY_NAME[d.family] || d.family) + ' · ' + esc(((d.recipe || {}).geometry || {}).mode || ((d.recipe || {}).geometry || {}).topology || '') + (d.contributor_name ? ' · ' + esc(d.contributor_name) : '') : '';
  var periodic = d && PV_PERIODIC[d.family];
  $('#iCells').style.display = periodic ? '' : 'none';
  $$('#iCells [data-c]').forEach(function (b) { b.classList.toggle('on', +b.dataset.c === IV.cells); });
  $('#iTiles').innerHTML = d ? TILE_KEYS.map(function (k) { return tileHTML(d, k); }).join('') : '';
  $('#iRadar').innerHTML = d ? radarSVG(d, 150) : '';
  /* keep open sections and the scroll position across refreshes of the same design */
  var more = $('#iMore'), sc = more.parentNode, same = more._for === d, openS = same ? $$('details[open] > summary', more).map(function (x) { return x.textContent; }) : [], top = same ? sc.scrollTop : 0;
  more.innerHTML = d ? noticesHTML(d) + scoreBreakdownHTML(d) + recipeHTML(d) + provenanceHTML(d) + allMetricsHTML(d) : ''; more._for = d;
  if (openS.length) $$('details > summary', more).forEach(function (x) { if (openS.indexOf(x.textContent) >= 0) x.parentNode.open = true; });
  sc.scrollTop = top;
  ['#iPin', '#iLink', '#iDl'].forEach(function (s) { $(s).disabled = !d; });
  $('#iPin').classList.toggle('on', !!(d && S.pins.indexOf(d) >= 0));
  $('#iLoading').style.display = d && PREVIEW_FAMILIES[d.family] && !IV.field ? '' : 'none';
}
