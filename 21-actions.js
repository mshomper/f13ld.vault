/* ============================================================
   F13LD.vault · 21-actions.js
   The verbs every control calls: select, step, change domain, axes,
   colour, layout. Views are created in 99-init.js (VIEWS).
   ============================================================ */

var VIEWS = { h3: null, p2: null, m3: null, m2: null };
function eachView(fn) { ['h3', 'p2', 'm3', 'm2'].forEach(function (k) { if (VIEWS[k]) fn(VIEWS[k]); }); }
/* v0.9.0 — lime rings around the welcome guide's top designs, drawn in
   rank order so the best sits on top; they grow in over about a second. */
function drawSpot(ctx, now, at) {
  var t = clamp((now - (S.spotT0 || 0)) / 900, 0, 1), e = 1 - Math.pow(1 - t, 3), k = 0;
  ctx.save(); ctx.lineWidth = 1.6;
  S.spot.forEach(function (d) {
    var p = at(d); k++; if (!p || !isFinite(p[0])) return;
    var lag = clamp(e * 1.6 - k / S.spot.size * 0.6, 0, 1);
    ctx.strokeStyle = 'rgba(200,245,66,' + (0.9 * lag).toFixed(3) + ')';
    ctx.beginPath(); ctx.arc(p[0], p[1], 4 + 3.5 * lag, 0, 6.2832); ctx.stroke();
  });
  ctx.restore();
}
function markViewsDirty() { eachView(function (v) { v.dirty = true; }); }

/* Point animation shared by every view: positions ease to their targets
   (axis changes morph), alpha/size follow the filters, a few points twinkle
   in Alive mode, and the first appearance flies in from the centre. */
var _pointsMoving = false, _twT = 0;
function updatePoints(now) {
  var intro = S.introT0, moving = false, N = DB.N;
  if (!intro) return false;
  for (var i = 0; i < N; i++) {
    var d = DB.all[i], h = d._h;
    if (now < intro + h.delay) { moving = true; continue; }
    var k = now < intro + h.delay + 900 ? 0.06 : 0.1;
    var dx = h.tx - h.x, dy = h.ty - h.y, dz = h.tz - h.z, du = h.tu - h.u, dv = h.tv - h.v;
    if (dx * dx + dy * dy + dz * dz + du * du + dv * dv > 1e-8) { h.x += dx * k; h.y += dy * k; h.z += dz * k; h.u += du * k; h.v += dv * k; moving = true; }
    var at = d._m ? 1 : 0.55, st = d._m ? 1 : 0.5;
    if (Math.abs(at - h.a) > 0.002 || Math.abs(st - h.s) > 0.002) { h.a += (at - h.a) * 0.12; h.s += (st - h.s) * 0.12; moving = true; }
    if (h.tw > 0.01) { h.tw *= 0.93; moving = true; } else h.tw = 0;
  }
  if (S.alive && now - _twT > 120 && S.list.length) { _twT = now; S.list[Math.floor(Math.random() * S.list.length)]._h.tw = 1; moving = true; }
  _pointsMoving = moving;
  return moving;
}

/* ── selection ───────────────────────────────────────────────────────── */
function nearestOf(d, n) {
  /* nearest in a fixed space (the active domain's default metrics, as
     percentile ranks) so "nearest" does not change when you swap axes */
  var keys = (DOMAIN_DEFAULTS[F.domain] || DOMAIN_DEFAULTS.all).filter(hasMetric), P = keys.map(pctOf), i0 = d._i, out = [];
  for (var j = 0; j < DB.N; j++) {
    if (j === i0) continue; var e = DB.all[j]; if (!e._m) continue;
    var s = 0, c = 0; for (var q = 0; q < P.length; q++) { var a = P[q][i0], b = P[q][j]; if (isNaN(a) || isNaN(b)) continue; s += (a - b) * (a - b); c++; }
    if (c) out.push([e, s / c]);
  }
  out.sort(function (a, b) { return a[1] - b[1]; });
  return out.slice(0, n).map(function (x) { return x[0]; });
}
/* Selection and target pulses run for a few seconds, then the views go idle (no redraw per frame). */
function pulseKick() { S.pulseUntil = performance.now() + 7000; S._pulseDone = false; }
function pulseOn(now) { return now < (S.pulseUntil || 0); }
function pulsePh(now, per) { return pulseOn(now) ? (now % per) / per : 0.999; }
function select(d, src) {
  pulseKick();
  S.sel = d || null;
  S.near = d ? nearestOf(d, 6) : [];
  if (d) {
    if (src !== 'axis') {
      if (S.mobile) { if (VIEWS.m3) VIEWS.m3.focus(d); S.mInsp = true; if (S.snap === 'peek') setSnap('half'); }
      else if (VIEWS.h3 && src !== 'step-quiet') VIEWS.h3.focus(d);
    }
    IV.yaw = 0.72; IV.pitch = -0.48; IV.zoom = 1;
    inspectorLoad(d);
  } else inspectorLoad(null);
  renderInspector();
  $$('.card.sel,.tbl tr.sel').forEach(function (e) { e.classList.remove('sel'); });
  if (d) {
    $$('[data-id="' + d._id + '"]').forEach(function (e) { e.classList.add('sel'); });
    if (src === 'hero' || src === 'plot' || src === 'step') { var el = $('#rBody [data-id="' + d._id + '"]'); if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
  }
  ['#hpQueue', '#hpMesh', '#hpLab', '#dMesh'].forEach(function (s) { var b = $(s); if (b) b.disabled = !d; });
  markViewsDirty(); shareLinkSoon();
  if (S.color === '_sim') { recolor(); renderLegend(); }   /* v0.7.1 — similarity follows the selection */
  if (S.mobile) renderMobile();
}
function step(dir) {
  var L = S.list; if (!L.length) return;
  var i = S.sel ? L.indexOf(S.sel) : -1;
  if (i < 0 && S.shown < L.length && dir > 0) i = -1;
  i = i < 0 ? 0 : (i + dir + L.length) % L.length;
  if (i >= S.shown) { S.shown = Math.ceil((i + 1) / PAGE_SIZE) * PAGE_SIZE; renderLists(); }
  select(L[i], 'step');
}

/* ── domain ─────────────────────────────────────────────────────────── */
function setDomain(dom) {
  if (dom === F.domain) return;
  F.domain = dom;
  var was = { a3: Object.assign({}, S.ax3), a2: Object.assign({}, S.ax2) };
  var moved = applyDomainAxes(dom);   /* v0.8.2 — before domainChanged, so it ranks the new axes */
  domainChanged(false);
  changed('domain · ' + DOMAIN_SHORT[dom], true);
  if (moved && !(typeof WG !== 'undefined' && WG.open)) toast('Axes for <b>' + esc(DOMAIN_SHORT[dom]) + '</b> · ' + esc(mShort(S.ax3.x)) + ' × ' + esc(mShort(S.ax3.y)) + ' (3D) · ' + esc(mShort(S.ax2.x)) + ' × ' + esc(mShort(S.ax2.y)) + ' (2D)',
    { label: 'Keep my axes', icon: 'undo', run: function () { S._domAxesAuto = false; S.ax3 = was.a3; S.ax2 = was.a2; axesMoved(); } });
  if (bioPromptWanted()) setTimeout(openBioPrompt, 250);   /* v0.6 */
}
/* v0.8.2 — a domain sets its own axes, as v0.4 did: 3D X / Y to the domain's
   first two headline metrics (biomedical: its first 2D preset, since P10 and
   P90 rise together), Z back to the domain score, and the 2D plot to the
   domain's first preset. A pair the data can't show (strain with no load)
   falls through to the next preset. Returns whether anything moved. */
function domainAxisPairs(dom) {
  var ok = function (p) { return p && hasMetric(p[0]) && hasMetric(p[1]); };
  var presets = (AXIS_PRESETS[dom] || AXIS_PRESETS.all).filter(ok), p2 = presets[0] || ['volume_fraction', '_emax'];
  var d3 = dom === 'all' ? ['_beff', 'anisotropy'] : dom === 'biomedical' ? p2 : (DOMAIN_DEFAULTS[dom] || []).slice(0, 2);
  if (!ok(d3)) d3 = presets[0] || ['_beff', 'anisotropy'];
  return { a3: { x: d3[0], y: d3[1], z: '_score' }, a2: { x: p2[0], y: p2[1] } };
}
function applyDomainAxes(dom) {
  var p = domainAxisPairs(dom), moved = ['x', 'y', 'z'].some(function (a) { return S.ax3[a] !== p.a3[a]; }) || ['x', 'y'].some(function (a) { return S.ax2[a] !== p.a2[a]; });
  var nexp = [S.ax3.x, S.ax3.y, S.ax3.z, S.ax2.x, S.ax2.y, p.a3.x, p.a3.y, p.a2.x, p.a2.y].indexOf('_nexp') >= 0;
  S.ax3 = p.a3; S.ax2 = p.a2; S._domAxesAuto = true;
  if (moved) { if (nexp) recolor(); VIEWS.p2 && VIEWS.p2.reset(); VIEWS.m2 && VIEWS.m2.reset(); savePrefs(); shareLinkSoon(); }
  return moved;
}
/* Axes changed outside the axis menus (Keep my axes, a load arriving). */
function axesMoved() { recolor(); setAxesTargets3D(); set2DTargets(); renderAxisChips(); savePrefs(); shareLinkSoon(); if (S.sel) select(S.sel, 'axis'); }
function domainChanged(quiet) {
  computeScores(F.domain);
  if (S.color === '_scar') ensureScarcity(F.domain);
  setAxesTargets3D(); set2DTargets(); recolor();
  renderAxisChips(); renderPresets();
  if (S.sel) { S.near = nearestOf(S.sel, 6); renderInspector(); }
  if (!quiet && S.sort.k !== '_target') S.sort = { k: '_score', dir: -1 };
}
/* Range rows were added or removed (slider list must be rebuilt). */
function rangesChanged() { buildRangeRows(); }

/* ── axes, colour, views ────────────────────────────────────────────── */
function setAxis3(a, k) { S._domAxesAuto = false; var was = S.ax3[a]; S.ax3[a] = k; if (was === '_nexp' || k === '_nexp') recolor(); setAxesTargets3D(); renderAxisChips(); savePrefs(); shareLinkSoon(); if (S.sel) select(S.sel, 'axis'); toast('3D ' + a.toUpperCase() + ' axis · <b>' + esc(mLabel(k)) + '</b> (rank)'); }
function setAxis2(a, k, quiet) { if (!quiet) S._domAxesAuto = false; var was = S.ax2[a]; S.ax2[a] = k; if (was === '_nexp' || k === '_nexp') recolor(); set2DTargets(); renderAxisChips(); savePrefs(); shareLinkSoon(); if (!quiet) toast('2D ' + a.toUpperCase() + ' axis · <b>' + esc(mLabel(k)) + '</b>' + (plotScale(k).lg ? ' (log scale)' : '')); }
function setColor(id) { S.color = id; recolor(); renderLegend(); savePrefs(); shareLinkSoon(); }
function setView(v) { S.view = v; savePrefs(); renderResults(); }
function setHv(hv) { S.hv = hv; var h = $('#pHero'); if (h) h.dataset.heroview = hv; $$('#dHv [data-hv]').forEach(function (b) { b.classList.toggle('on', b.dataset.hv === hv); }); savePrefs(); markViewsDirty(); requestAnimationFrame(placeSplits); }
function setLayout(l) { S.layout = l; var a = $('#dApp'); a.classList.toggle('lay-a', l === 'a'); a.classList.toggle('lay-b', l === 'b'); $$('[data-layout]').forEach(function (b) { b.classList.toggle('on', b.dataset.layout === l); }); savePrefs(); loadSplits(); requestAnimationFrame(function () { placeSplits(); renderTags(); markViewsDirty(); }); }
function setAlive(v) { S.alive = v; $$('[data-act="alive"]').forEach(function (b) { b.classList.toggle('on', v); b.setAttribute('aria-pressed', v ? 'true' : 'false'); }); savePrefs(); }
function setTool(t) { S.tool = t; $$('#dTool [data-tool]').forEach(function (b) { b.classList.toggle('on', b.dataset.tool === t); }); if (t === 'brush') toast('Drag a box over the 3D design space — designs inside become a region filter'); }
function setTool2(t) { S.tool2 = t; $$('[data-tool2]').forEach(function (b) { b.classList.toggle('on', b.dataset.tool2 === t); }); if (t === 'target') toast('Click the 2D plot to drop a target — designs rank by closeness'); }
function setPareto(mode) { S.pareto = mode; computeFront(); $$('[data-act="pareto"]').forEach(function (b) { b.classList.toggle('on', !!mode); }); markViewsDirty(); if (mode) toast('Pareto front · <b>' + FRONT.list.filter(function (d) { return d._m; }).length + '</b> designs', { label: 'Filter to them', icon: 'filters', run: filterToFront }); }
function filterToFront() { if (!FRONT.list.length) return; F.region = FRONT.list.filter(function (d) { return d._m; }).map(function (d) { return d._id; }); changed('Pareto front · ' + F.region.length + ' designs', true); }
function setGap(on) { S.gap = on; computeGapGrid(); $$('[data-act="gap"]').forEach(function (b) { b.classList.toggle('on', on); }); markViewsDirty(); if (on) toast('Shaded = designs in the Vault · dashed = holes · click a hole to target it'); }
function applyPreset(x, y) { S._domAxesAuto = false; setAxis2('x', x, true); setAxis2('y', y, true); VIEWS.p2 && VIEWS.p2.reset(); toast('2D axes · <b>' + esc(mLabel(x)) + '</b> × <b>' + esc(mLabel(y)) + '</b>'); }
function clearAll() {
  var keep = F.rangeKeys; F = freshFilters(); F.rangeKeys = keep;
  domainChanged(true); rangesChanged();
  if (S.sort.k === '_target') S.sort = { k: '_score', dir: -1 };
  changed('clear all filters', true);
}
function resetViews() { eachView(function (v) { v.reset(); }); }
