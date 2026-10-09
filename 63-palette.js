/* ============================================================
   F13LD.vault · 63-palette.js
   Command palette (Ctrl K or /): designs, domains, metric filters, colour
   modes, 2D presets and every action, keyboard-first. Plus the keyboard
   shortcuts sheet (?).
   ============================================================ */

var CP = { items: [], idx: 0, open: false, lastFocus: null };
function cpActions() {
  return [
    ['Open filters', 'filters', function () { S.mobile ? openMFilters() : openDrawer('filters'); }, 'F'],
    ['Undo', 'undo', undo, 'Ctrl Z'], ['Redo', 'redo', redo, 'Ctrl Shift Z'],
    ['Clear all filters', 'reset', clearAll, ''],
    ['Reset both views', 'reset', resetViews, 'R'],
    ['Toggle ambient motion', 'alive', function () { setAlive(!S.alive); }, ''],
    ['Results as gallery', 'all', function () { setView('gallery'); }, 'G'], ['Results as table', 'key', function () { setView('table'); }, 'T'],
    ['Brush a 3D region', 'brush', function () { setTool('brush'); }, 'B'],
    ['Drop a target on the 2D plot', 'target', function () { setTool2('target'); }, ''],
    ['Show the Pareto front', 'pareto', function () { setPareto(S.pareto ? null : 'auto'); }, ''],
    ['Show the gap map', 'gap', function () { setGap(!S.gap); }, ''],
    ['Compare pinned designs', 'compare', function () { openDrawer('compare'); }, ''],
    ['Copy a link to this view', 'link', copyViewLink, ''],
    ['Layout A · design space first', 'split', function () { setLayout('a'); }, ''], ['Layout B · gallery first', 'all', function () { setLayout('b'); }, ''],
    ['View 3D only', 'view3d', function () { setHv('3d'); }, ''], ['View 3D and 2D side by side', 'split', function () { setHv('split'); }, ''], ['View 2D only', 'view2d', function () { setHv('2d'); }, ''],
    ['Build target (absolute units)', 'target', function () { openDrawer('target'); }, ''],
    ['Metric key', 'key', function () { openDrawer('key'); }, ''],
    ['Keyboard shortcuts', 'keyboard', showShortcuts, '?']
  ];
}
function cpBuild(q) {
  q = (q || '').trim().toLowerCase(); var out = [];
  function hit(s) { return !q || String(s).toLowerCase().indexOf(q) >= 0; }
  if (q && DB.N) {
    var ds = []; for (var i = 0; i < DB.N && ds.length < 8; i++) { var d = DB.all[i]; if (hit(displayPreset(d) + ' ' + d._id + ' ' + d.family + ' ' + (d.contributor_name || ''))) ds.push(d); }
    ds.forEach(function (d) { out.push({ g: 'Designs', l: displayPreset(d) + ' · ' + d._id, i: 'cell', s: (FAMILY_NAME[d.family] || d.family) + (d._m ? '' : ' · outside filters'), run: function () { select(d, 'hero'); } }); });
  }
  cpActions().forEach(function (a) { if (hit(a[0])) out.push({ g: 'Actions', l: a[0], i: a[1], s: a[3], run: a[2] }); });
  DOMAIN_IDS.forEach(function (k) { if (hit(DOMAIN_SHORT[k]) || hit('domain')) out.push({ g: 'Domains', l: 'Domain · ' + DOMAIN_SHORT[k], i: k, s: domainZLabel(k), run: function () { setDomain(k); } }); });
  (AXIS_PRESETS[F.domain] || AXIS_PRESETS.all).forEach(function (p) { if (hit(p[2]) || hit('preset')) out.push({ g: '2D presets', l: p[2], i: 'presets', s: mShort(p[0]) + ' × ' + mShort(p[1]), run: function () { applyPreset(p[0], p[1]); } }); });
  COLOR_MODE_LIST.forEach(function (m) { if (hit('colour ' + m.label) || hit('color ' + m.label)) out.push({ g: 'Colour', l: 'Colour points by ' + m.label, i: 'orbit', run: function () { setColor(m.id); } }); });
  if (q) pickableMetrics().forEach(function (m) { if (hasMetric(m.key) && (hit(m.label) || hit(mShort(m.key)))) out.push({ g: 'Metrics', l: 'Filter by ' + m.label, i: 'filters', s: DB.log[m.key] ? 'log' : '', run: function () { addRangeKey(m.key); S.mobile ? openMFilters() : openDrawer('filters'); } }); });
  CP.items = out.slice(0, 50); CP.idx = 0; cpDraw();
}
function cpDraw() {
  var g = '', s = '';
  CP.items.forEach(function (it, i) {
    if (it.g !== g) { g = it.g; s += '<div class="cp-g" role="presentation">' + esc(g) + '</div>'; }
    s += '<button class="cp-it' + (i === CP.idx ? ' on' : '') + '" data-cpi="' + i + '" role="option" aria-selected="' + (i === CP.idx) + '"><span class="ico">' + ic(it.i) + '</span><span class="cl">' + esc(it.l) + '</span>' + (it.s ? '<span class="s">' + esc(it.s) + '</span>' : '') + '</button>';
  });
  $('#cpList').innerHTML = s || '<div class="cp-g">Nothing found</div>';
  var on = $('#cpList .cp-it.on'); if (on && on.scrollIntoView) on.scrollIntoView({ block: 'nearest' });
}
function openCP() {
  var cp = $('#cp'), host = S.mobile ? $('#mApp') : document.body; if (cp.parentNode !== host) host.appendChild(cp);
  CP.lastFocus = document.activeElement; CP.open = true;
  cp.classList.add('open'); $('#cpIn').value = ''; cpBuild(''); setTimeout(function () { $('#cpIn').focus(); }, 20);
}
function closeCP() { if (!CP.open) return; CP.open = false; $('#cp').classList.remove('open'); if (CP.lastFocus && CP.lastFocus.focus) CP.lastFocus.focus(); }
function cpRun(i) { var it = CP.items[i]; closeCP(); if (it) it.run(); }

function showShortcuts() {
  var rows = [['Ctrl K or /', 'Command palette'], ['F', 'Open or close filters'], ['Ctrl Z · Ctrl Shift Z', 'Undo · redo'], ['P', 'Pin or unpin the selected design'],
    ['Left · Right', 'Previous · next result'], ['Enter', 'Select the focused card or row'], ['B', 'Brush tool in 3D'], ['G · T', 'Gallery · table'], ['R', 'Reset both views'], ['Esc', 'Close whatever is open'],
    ['3D: drag · Ctrl drag · wheel', 'Orbit · pan · zoom'], ['3D: Shift drag (Alt adds)', 'Brush a region'], ['2D: drag · Ctrl drag · wheel', 'Box ranges · pan · zoom'], ['Double-click a view', 'Reset that view']];
  var el = $('#kbd'); el.innerHTML = '<div class="kbd-box" role="dialog" aria-label="Keyboard shortcuts"><div class="kbd-h">' + ic('keyboard') + '<span>Keyboard and mouse</span><button class="ibtn" data-act="kbd-close" aria-label="Close">' + gl('x') + '</button></div>' +
    '<div class="kbd-grid">' + rows.map(function (r) { return '<span class="k">' + esc(r[0]) + '</span><span>' + esc(r[1]) + '</span>'; }).join('') + '</div></div>';
  el.classList.add('open'); el.querySelector('.ibtn').focus();
}
function closeShortcuts() { $('#kbd').classList.remove('open'); }
