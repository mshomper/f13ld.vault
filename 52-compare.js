/* ============================================================
   F13LD.vault · 52-compare.js
   Up to four pinned designs side by side: geometry, a shared radar, and
   every key metric with a bar. "Best" follows the active domain — under
   Biomedical the lowest stiffness wins, under Aerospace the highest — and
   bars always read "longer is better" for metrics the domain cares about.
   ============================================================ */

function togglePin(d) {
  if (!d) return;
  var i = S.pins.indexOf(d);
  if (i >= 0) S.pins.splice(i, 1);
  else { if (S.pins.length >= 4) { toast('Compare holds four — unpin one first'); return; } S.pins.push(d); }
  pinsChanged();
  toast(S.pins.indexOf(d) >= 0 ? 'Pinned <b>' + esc(displayPreset(d)) + '</b> · ' + S.pins.length + ' of 4' : 'Unpinned <b>' + esc(displayPreset(d)) + '</b>');
}
function pinsChanged() {
  renderTray(); renderInspector(); markViewsDirty(); shareLinkSoon();
  $$('[data-pin]').forEach(function (b) { var d = DB.byId.get(b.dataset.pin), k = S.pins.indexOf(d); b.classList.toggle('on', k >= 0); b.style.color = k >= 0 ? PIN_COLORS[k] : ''; b.style.borderColor = k >= 0 ? PIN_COLORS[k] : ''; });
  if (S.tab === 'compare' && S.drawer) renderCompare();
  if (S.mobile) renderMobile();
}

function compareRadarSVG() {
  var keys = (DOMAIN_DEFAULTS[F.domain] || DOMAIN_DEFAULTS.all).filter(hasMetric).slice(0, 6), W = 300, H = 250, cx = W / 2, cy = 124, R0 = 84;
  var pt = function (i, f) { var a = -Math.PI / 2 + i * 2 * Math.PI / keys.length; return [cx + Math.cos(a) * R0 * f, cy + Math.sin(a) * R0 * f]; };
  var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;max-width:300px;height:auto" role="img" aria-label="Percentile signatures">';
  [0.33, 0.66, 1].forEach(function (f) { s += '<polygon points="' + keys.map(function (k, i) { return pt(i, f).join(','); }).join(' ') + '" fill="none" stroke="rgba(255,255,255,0.08)"/>'; });
  keys.forEach(function (k, i) { var e = pt(i, 1), t = pt(i, 1.2); s += '<line x1="' + cx + '" y1="' + cy + '" x2="' + e[0] + '" y2="' + e[1] + '" stroke="rgba(255,255,255,0.07)"/><text x="' + t[0] + '" y="' + (t[1] + 4) + '" text-anchor="middle" font-family="JetBrains Mono" font-size="12.5" fill="#9a9fb7">' + esc(mShort(k)) + '</text>'; });
  S.pins.forEach(function (p, j) { s += '<polygon points="' + keys.map(function (k, i) { return pt(i, Math.max(0.04, pct(p, k) || 0)).join(','); }).join(' ') + '" fill="' + PIN_COLORS[j] + '" fill-opacity="0.08" stroke="' + PIN_COLORS[j] + '" stroke-width="2" stroke-linejoin="round"/>'; });
  return s + '</svg>';
}
/* the score row shows a rounded rank, so ties are judged on what is shown */
function cmpVal(d, k) { if (k !== '_score') return d[k]; var p = pct(d, '_score'); return p == null ? null : Math.round(p * 100); }
function renderCompare() {
  var el = $('#dCompare'); if (!el) return;
  if (!S.pins.length) { el.innerHTML = '<div class="cmp-empty">' + ic('pin') + '<div>Pin up to four designs — the pin on a card, or <b>P</b> on the selected design — to compare their geometry and metrics side by side.</div></div>'; return; }
  var keys = compareKeys(F.domain).filter(hasMetric), goals = DOMAIN_GOALS[F.domain] || DOMAIN_GOALS.all, best = {}, top = {};
  keys.forEach(function (k) {
    var vs = S.pins.map(function (d) { return cmpVal(d, k); }).filter(isNum); if (!vs.length) return;
    top[k] = Math.max.apply(null, vs.map(Math.abs)) || 1;
    if (goals[k] && S.pins.length > 1) best[k] = goals[k] > 0 ? Math.max.apply(null, vs) : Math.min.apply(null, vs);
  });
  el.innerHTML = '<div class="cmp-wrap"><div class="cmp-side"><div class="lbl">Percentile signature · ' + esc(DOMAIN_SHORT[F.domain]) + '</div>' + compareRadarSVG() +
    '<div class="cmp-leg">' + S.pins.map(function (d, i) { return '<div><i style="background:' + PIN_COLORS[i] + '"></i>' + (i + 1) + ' · ' + esc(displayPreset(d)) + '</div>'; }).join('') + '</div>' +
    '<div class="cmp-note">Lime marks the best of the set for ' + esc(DOMAIN_SHORT[F.domain]) + '. Bars read longer-is-better for the metrics this domain cares about.</div>' +
    '<button class="sbtn" data-act="queue-pins">' + ic('queue') + 'Send all ' + S.pins.length + ' to Queue</button></div>' +
    '<div class="cmp-cols" style="grid-template-columns:repeat(' + S.pins.length + ',minmax(0,1fr))">' + S.pins.map(function (d, i) {
      return '<div class="cmp-col" style="--pc:' + PIN_COLORS[i] + '"><div class="cmp-th"><canvas data-th="' + esc(d._id) + '" width="' + THUMB_W + '" height="' + THUMB_H + '"></canvas></div><div class="cb">' +
        '<div class="nm">' + (i + 1) + ' · ' + esc(displayPreset(d)) + '</div><div class="fm"><i class="dot" style="background:' + (CAT_PALETTES.family[d.family] || '#9a9fb7') + '"></i>' + esc(FAMILY_NAME[d.family] || d.family) + ' · ' + esc(d._id) + '</div>' +
        keys.map(function (k) {
          var v = d[k], r = k === '_score' ? { value: v == null ? '—' : String(Math.round((pct(d, '_score') || 0) * 100)), unit: 'rank' } : resolveValue(v, k), g = goals[k];
          var frac = !isNum(v) ? 0 : g < 0 ? (Math.min.apply(null, S.pins.map(function (p) { return isNum(p[k]) ? Math.abs(p[k]) : Infinity; })) / Math.max(Math.abs(v), 1e-12)) : Math.abs(v) / top[k];
          var isBest = best[k] != null && cmpVal(d, k) === best[k];
          return '<div class="cmp-row' + (isBest ? ' best' : '') + (g ? '' : ' neutral') + '"><span>' + esc(k === '_score' ? domainZLabel() : resolveLabel(k, r.isResolved)) + '</span><b>' + esc(r.value) + (v != null && r.unit ? '<small>' + esc(r.unit) + '</small>' : '') + '</b><div class="cbar"><i style="width:' + (clamp(frac, 0, 1) * 100).toFixed(0) + '%"></i></div></div>';
        }).join('') +
        '<div class="cmp-acts"><button class="mini" data-inspect="' + esc(d._id) + '">Inspect</button><button class="mini" data-mesh="' + esc(d._id) + '">' + ic('mesh') + 'Mesh</button><button class="mini" data-pin="' + esc(d._id) + '">' + gl('x') + 'Unpin</button></div></div></div>';
    }).join('') + '</div></div>';
  paintThumbs(el);
}
