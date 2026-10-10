/* ============================================================
   F13LD.vault · 50-results.js
   Results: a gallery of geometry cards or a sortable table. Re-rendering
   after a filter change keeps the scroll position and how many are shown;
   only cards appearing for the first time animate in.
   ============================================================ */

var PIN_COLORS = ['#5BA4EE', '#c8f542', '#1D9E75', '#b598d4'];
var _seenCards = new Set();

function cardMetrics() {
  var ks = [];
  Object.keys(F.ranges).forEach(function (k) { if (F.ranges[k] && ks.indexOf(k) < 0) ks.push(k); });
  (DOMAIN_DEFAULTS[F.domain] || DOMAIN_DEFAULTS.all).forEach(function (k) { if (ks.indexOf(k) < 0) ks.push(k); });
  return ks.filter(hasMetric).slice(0, 3);
}
/* Ring: closeness to the target when one is set, otherwise the domain score rank. */
function ringValue(d) { var t = targetCloseness(d); if (t != null) return { v: t, tag: 'near' }; var p = pct(d, '_score'); return { v: p, tag: 'score' }; }
function ringSVG(d, big) {
  var rv = ringValue(d), sc = rv.v == null ? null : Math.round(rv.v * 100), r = 12, c = 2 * Math.PI * r, f = sc == null ? 0 : sc / 100;
  var col = sc == null ? '#5f6582' : sc >= 80 ? '#c8f542' : sc >= 50 ? '#5BA4EE' : '#7a809c';
  return '<svg class="ring' + (big ? ' big' : '') + '" viewBox="0 0 32 32" aria-label="' + (rv.tag === 'near' ? 'closeness to target ' : 'domain score rank ') + (sc == null ? 'not available' : sc) + '"><circle cx="16" cy="16" r="' + r + '" fill="rgba(8,10,16,0.78)" stroke="rgba(255,255,255,0.1)" stroke-width="2.5"/>' +
    '<circle cx="16" cy="16" r="' + r + '" fill="none" stroke="' + col + '" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="' + (c * f).toFixed(1) + ' ' + c.toFixed(1) + '" transform="rotate(-90 16 16)"/>' +
    '<text x="16" y="20" text-anchor="middle">' + (sc == null ? '–' : sc) + '</text></svg>';
}
function mrow(k, d) {
  var p = pct(d, k), r = resolveValue(d[k], k);
  return '<span title="' + esc(mLabel(k)) + '">' + esc(mShort(k)) + '</span><span class="b"><i style="width:' + (p == null ? 0 : (p * 100).toFixed(0)) + '%"></i></span><span class="n">' + (d[k] == null ? '—' : esc(r.value)) + '</span>';
}
function cardHTML(d, opts) {
  opts = opts || {};
  var pin = S.pins.indexOf(d), isNew = !_seenCards.has(d._id); _seenCards.add(d._id);
  var mk = opts.small ? [] : cardMetrics();
  return '<div class="card' + (S.sel === d ? ' sel' : '') + (isNew ? ' new' : '') + (d._m ? '' : ' out') + '" data-id="' + esc(d._id) + '" tabindex="0" role="button" aria-label="' + esc(displayPreset(d) + ', ' + (FAMILY_NAME[d.family] || d.family)) + '">' +
    '<div class="th"><canvas data-th="' + esc(d._id) + '" width="' + THUMB_W + '" height="' + THUMB_H + '"></canvas><div class="shim"></div>' + ringSVG(d) +
    '<button class="cpin' + (pin >= 0 ? ' on' : '') + '" data-pin="' + esc(d._id) + '" title="' + (pin >= 0 ? 'Unpin' : 'Pin to compare') + ' (P)" aria-label="Pin to compare"' + (pin >= 0 ? ' style="color:' + PIN_COLORS[pin] + ';border-color:' + PIN_COLORS[pin] + '"' : '') + '>' + gl('pin') + '</button>' +
    (d._stiff_flag === 'flagged' ? '<span class="cflag" title="Stiffness may read high' + (d._flag_reasons ? ' — ' + esc(d._flag_reasons) : '') + '">' + gl('flag') + 'flag</span>' : '') + '</div>' +
    '<div class="cb"><div class="nm">' + esc(displayPreset(d)) + '</div><div class="fm"><i class="dot" style="background:' + (CAT_PALETTES.family[d.family] || '#9a9fb7') + '"></i>' + esc(FAMILY_NAME[d.family] || d.family) + (opts.small ? '' : '<span class="cid">' + esc(d._id) + '</span>') + '</div>' +
    (mk.length ? '<div class="mt">' + mk.map(function (k) { return mrow(k, d); }).join('') + '</div>' : '') + '</div></div>';
}

var TABLE_COLS = [
  { k: null, l: '', cls: 'c-th' },
  { k: '_name', l: 'Design', cls: 'c-nm' },
  { k: '_score', l: 'Score', cls: '' },
  { k: 'volume_fraction', l: 'VF', cls: '' },
  { k: '_emax', l: 'E*', cls: '' },
  { k: 'stiffness_density_norm', l: 'E/ρ', cls: 'col-opt' },
  { k: '_gmean', l: 'G*', cls: 'col-opt' },
  { k: 'anisotropy', l: 'Aniso', cls: '' },
  { k: 'pore_size_p50_norm', l: 'P50', cls: '' },
  { k: 'keff_max_norm', l: 'k max', cls: 'col-opt2' }
];
function tableHTML(L) {
  return '<table class="tbl"><thead><tr>' + TABLE_COLS.map(function (c) {
    var on = c.k && S.sort.k === c.k;
    return '<th class="' + c.cls + (on ? ' on' : '') + '"' + (c.k ? ' data-sortk="' + c.k + '" tabindex="0" data-tipk="' + c.k + '"' : '') + '>' + esc(c.l) + (on ? gl(S.sort.dir > 0 ? 'up' : 'dn') : '') + '</th>';
  }).join('') + '</tr></thead><tbody>' + L.map(function (d) {
    return '<tr data-id="' + esc(d._id) + '" class="' + (S.sel === d ? 'sel' : '') + '" tabindex="0"><td class="c-th"><canvas data-th="' + esc(d._id) + '" width="80" height="60"></canvas></td>' +
      '<td class="c-nm"><i class="dot" style="background:' + (CAT_PALETTES.family[d.family] || '#9a9fb7') + '"></i>' + esc(displayPreset(d)) + ' <span class="dim">' + esc(d._id) + '</span>' + (d._stiff_flag === 'flagged' ? ' <span class="tflag" title="Stiffness may read high">' + gl('flag') + '</span>' : '') + '</td>' +
      TABLE_COLS.slice(2).map(function (c) { var v = d[c.k], r = c.k === '_score' ? { value: v == null ? '—' : String(Math.round((pct(d, '_score') || 0) * 100)) } : resolveValue(v, c.k); return '<td class="' + c.cls + '">' + (v == null ? '—' : esc(r.value)) + '</td>'; }).join('') + '</tr>';
  }).join('') + '</tbody></table>';
}

function renderResults() {
  var body = $('#rBody'); if (!body || S.mobile) return;
  var st = body.scrollTop;
  $('#rBadge').innerHTML = '<b>' + S.cnt.toLocaleString() + '</b> of ' + DB.N.toLocaleString() + (F.target ? (S.mobile ? ' · ranked by closeness to the target' : '') : F.domain !== 'all' ? ' · ' + esc(DOMAIN_SHORT[F.domain]) : '');
  if (!S.cnt) { body.innerHTML = '<div class="gal">' + emptyStateHTML() + '</div>'; return; }
  var L = S.list.slice(0, S.shown), more = S.cnt - L.length;
  var moreBtn = more > 0 ? '<button class="more" data-act="more">Show ' + Math.min(PAGE_SIZE, more) + ' more · ' + more.toLocaleString() + ' left</button>' : '';
  body.innerHTML = S.view === 'gallery' ? '<div class="gal">' + L.map(function (d) { return cardHTML(d); }).join('') + moreBtn + '</div>'
                                         : tableHTML(L) + (moreBtn ? '<div class="gal" style="margin-top:10px">' + moreBtn + '</div>' : '');
  body.scrollTop = st;
  observeThumbs(body);
  $$('#rView [data-view]').forEach(function (b) { b.classList.toggle('on', b.dataset.view === S.view); });
}
/* No matches → which single change would bring the most back. */
function emptyStateHTML() {
  var w = whyNotList().slice(0, 4);
  return '<div class="empty"><div class="et">No designs match.</div>' + (w.length ? '<div class="es">Each of these alone is holding designs back:</div><div class="why">' +
    w.map(function (x) { return '<button class="whyb" data-untag="' + esc(x.tag.id) + '">' + gl('x') + 'Remove <b>' + esc(x.tag.k) + ' ' + esc(x.tag.v) + '</b> <span>+' + x.n + '</span></button>'; }).join('') + '</div>'
    : '<div class="es">Loosen a filter — the dimmed points show what you are excluding.</div>') + '</div>';
}
function renderLists() { if (S.mobile) renderMobile(); else renderResults(); }
