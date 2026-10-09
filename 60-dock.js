/* ============================================================
   F13LD.vault · 60-dock.js
   Dock (filters button, undo/redo, active-filter tags, count, compare
   tray, Open in Mesh), the hero header (view switch, colour, legend),
   the drawer shell, menus and the hover tooltip.
   ============================================================ */

var _inspSoon = debounce(function () { renderInspector(); }, 90);
/* After every filter pass. */
function onFiltersApplied() {
  if (S.pareto) computeFront();
  markViewsDirty();
  renderTags(); updateFilterUI(); renderLegend(); updateHeroSub(); renderTargetBanner();
  if (S.sel) _inspSoon();      /* coalesced: a slider drag doesn't rebuild the inspector every frame */
  var n = filterCount(); $$('.fcount').forEach(function (c) { c.textContent = n; c.classList.toggle('on', n > 0); });
  var sh = $('#mFShow'); if (sh) sh.textContent = 'Show ' + S.cnt.toLocaleString() + ' designs';
  var fb = $('#mFBadge'); if (fb) fb.textContent = S.cnt.toLocaleString() + ' match';
  $$('[data-act="clear-all"]').forEach(function (b) { b.disabled = !n && !F.target; });
}

/* ── dock tags (no scrolling: the ones that do not fit fold into "+n more") ── */
function renderTags() {
  var el = $('#tags'); if (!el) return;
  var T = activeFilterList();
  el.innerHTML = T.length ? T.map(function (t) {
    return '<span class="tag" data-tag="' + esc(t.id) + '"><b>' + esc(t.k) + '</b><span class="tv">' + esc(t.v) + '</span><button class="x" data-untag="' + esc(t.id) + '" title="Remove" aria-label="Remove ' + esc(t.k + ' ' + t.v) + '">' + gl('x') + '</button></span>';
  }).join('') : '<span class="tag hint">No filters — pick a domain, brush the design space or box-drag the 2D plot</span>';
  requestAnimationFrame(function () {
    var kids = Array.prototype.slice.call(el.children).filter(function (k) { return !k.classList.contains('hint'); });
    if (!kids.length || !el.clientWidth) return;
    kids.forEach(function (k) { k.style.display = ''; });
    var W = el.clientWidth, used = 0, hid = 0;
    kids.forEach(function (k, i) { used += k.offsetWidth + 6; if (used > W - 76 && i > 0) { k.style.display = 'none'; hid++; } });
    if (hid) { var m = document.createElement('button'); m.className = 'tag more2'; m.type = 'button'; m.textContent = '+' + hid + ' more'; m.onclick = function () { openDrawer('filters'); }; el.appendChild(m); }
  });
}
function renderTray() {
  var el = $('#tray'); if (!el) return;
  var s = '';
  for (var i = 0; i < 4; i++) { var d = S.pins[i];
    s += d ? '<button class="slot f" data-inspect="' + esc(d._id) + '" title="' + esc(displayPreset(d)) + ' — inspect" style="border-color:' + PIN_COLORS[i] + '"><canvas data-th="' + esc(d._id) + '" width="72" height="72"></canvas><i style="color:' + PIN_COLORS[i] + '">' + (i + 1) + '</i></button>'
           : '<span class="slot" title="Pin a design to compare (P)"></span>'; }
  s += '<button class="cmp" data-act="compare" ' + (S.pins.length < 1 ? 'disabled' : '') + ' title="Compare pinned designs">' + ic('compare') + '<span>Compare</span></button>';
  el.innerHTML = s; paintThumbs(el);
  $$('.ccount').forEach(function (c) { c.textContent = S.pins.length; c.classList.toggle('on', S.pins.length > 0); });
}
function animCount() {
  /* time-based ease (0.6 s) so a slow frame rate never leaves the count trailing */
  if (S.cntShown === S.cnt) { S._cA = null; return; }
  var now = performance.now();
  if (!S._cA || S._cA.to !== S.cnt) S._cA = { from: S.cntShown, to: S.cnt, t0: now };
  var f = Math.min(1, (now - S._cA.t0) / 600), e = 1 - Math.pow(1 - f, 3);
  S.cntShown = f >= 1 ? S.cnt : Math.round(S._cA.from + (S._cA.to - S._cA.from) * e);
  var t = '<b>' + S.cntShown.toLocaleString() + '</b> of ' + DB.N.toLocaleString() + ' match';
  var c = $('#dCount'); if (c) c.innerHTML = t;
  var m = $('#mCount'); if (m) m.innerHTML = '<b>' + S.cntShown.toLocaleString() + '</b> designs';
}
function updateHeroSub() { var e = $('#heroSub'); if (e) e.innerHTML = '<b>' + S.cnt.toLocaleString() + '</b> of ' + DB.N.toLocaleString() + ' lit'; }

/* ── hero header: colour + legend (legend items isolate on click) ─────── */
function renderLegend() {
  var mode = COLOR_MODE_LIST.filter(function (m) { return m.id === S.color; })[0] || COLOR_MODE_LIST[0];
  $$('.colorName').forEach(function (e) { e.textContent = mode.label; });
  var el = $('#legend'); if (!el) return;
  if (mode.type === 'cont') {
    el.innerHTML = '<span class="lg-l">low</span><span class="lg-grad"></span><span class="lg-l">high</span>';
    return;
  }
  var counts = {};
  S.list.forEach(function (d) { var v = catValue(d, mode.id); counts[v] = (counts[v] || 0) + 1; });
  var keys = mode.id === 'family' ? DB.families : Object.keys(counts).sort(function (a, b) { return (counts[b] || 0) - (counts[a] || 0); });
  el.innerHTML = keys.map(function (v) {
    var on = mode.id === 'family' && F.fam.indexOf(v) >= 0, lbl = mode.id === 'family' ? (FAMILY_NAME[v] || v) : mode.id === 'kappa' ? (KAPPA_CLASSES.filter(function (c) { return c.key === v; })[0] || { label: v }).label : v;
    return '<button class="lg-it' + (on ? ' on' : '') + '" data-legend="' + esc(v) + '" title="' + (mode.id === 'family' ? 'Click to show only this family · Shift-click to add' : esc(lbl)) + '"><i class="dot" style="background:' + catColor(mode.id, v) + '"></i>' + esc(lbl) + '<span class="n">' + (counts[v] || 0) + '</span></button>';
  }).join('');
  requestAnimationFrame(function () {
    var kids = Array.prototype.slice.call(el.children); if (!el.clientWidth) return;
    kids.forEach(function (k) { k.style.display = ''; });
    var W = el.clientWidth, used = 0, hid = 0;
    kids.forEach(function (k) { used += k.offsetWidth + 4; if (hid || used > W - 44) { k.style.display = 'none'; hid++; } });
    if (hid) { var m = document.createElement('button'); m.className = 'lg-more'; m.dataset.act = 'legend-more'; m.dataset.menu = ''; m.title = 'Show all ' + kids.length;
      m.textContent = '+' + hid; el.appendChild(m); }
  });
}
function legendClick(v, add) {
  if (S.color !== 'family') return;
  if (add) { if (F.fam.indexOf(v) >= 0) F.fam = F.fam.filter(function (x) { return x !== v; }); else F.fam.push(v); }
  else F.fam = (F.fam.length === 1 && F.fam[0] === v) ? [] : [v];
  changed(F.fam.length ? 'family · ' + F.fam.map(function (f) { return FAMILY_NAME[f] || f; }).join(', ') : 'all families', false);
}

/* ── axis chips (3D) and presets (2D) ───────────────────────────────── */
function renderAxisChips() {
  var el = $('#dAxes'); if (!el) return;
  el.innerHTML = '<span class="ax-rank" title="The 3D axes are percentile ranks within the population: low = bottom of the Vault, high = top. The 2D plot shows real values.">ranked</span>' +
    ['x', 'y', 'z'].map(function (a) { return '<button class="axchip" data-axis3="' + a + '" title="' + esc(mLabel(S.ax3[a])) + ' — pick the 3D ' + a.toUpperCase() + ' metric (ranked)"><i>' + a.toUpperCase() + '</i><span class="axl">' + esc(mLabel(S.ax3[a])) + '</span>' + gl('chev') + '</button>'; }).join('');
  eachView(function (v) { v.axKey = ''; v.dirty = true; });
}
function renderPresets() { /* menu content is built on open; nothing persistent */ }

/* ── menus ──────────────────────────────────────────────────────────── */
var _menu = null;
function openMenu(anchor, html, opts) {
  /* a submenu opened from inside a menu anchors to that menu's own button — the item is about to go */
  if (anchor && anchor.closest && anchor.closest('.menu')) anchor = (_menu && _menu._anchor && _menu._anchor.isConnected) ? _menu._anchor : ($('[data-act="m-menu"]') || anchor);
  closeMenu();
  var m = document.createElement('div'); m.className = 'menu open'; m.setAttribute('role', 'menu'); m.innerHTML = html;
  var host = (opts && opts.host) || document.body; host.appendChild(m);
  var r = anchor.getBoundingClientRect(), hr = host === document.body ? { left: 0, top: 0, width: innerWidth, height: innerHeight } : host.getBoundingClientRect();
  var k = host === document.body ? 1 : (hr.width / host.offsetWidth) || 1;
  var mw = m.offsetWidth, mh = m.offsetHeight, left = (r.left - hr.left) / k, top = (r.bottom - hr.top) / k + 4;
  if (opts && opts.up) top = (r.top - hr.top) / k - mh - 4;
  if (top + mh > hr.height / k - 6) top = Math.max(6, (r.top - hr.top) / k - mh - 4);
  if (top < 6) top = 6;
  m.style.left = clamp(left, 6, Math.max(6, hr.width / k - mw - 6)) + 'px'; m.style.top = top + 'px';
  if (host === document.body) m.style.position = 'fixed';
  _menu = m; m._anchor = anchor;
  var first = m.querySelector('button'); if (first && opts && opts.focus) first.focus();
  return m;
}
function closeMenu() { if (_menu) { _menu.remove(); _menu = null; } }
function metricMenuHTML(attr, axis, current, extra) {
  var groups = {}, order = [];
  pickableMetrics().forEach(function (m) { if (!hasMetric(m.key)) return; if (!groups[m.group]) { groups[m.group] = []; order.push(m.group); } groups[m.group].push(m); });
  return '<div class="mh">' + esc(extra || (axis.toUpperCase() + ' axis')) + '</div><div class="msearch"><input placeholder="Search metrics" data-msearch autocomplete="off" spellcheck="false"></div><div class="mlist">' + order.map(function (g) {
    return '<div class="mg">' + esc(g) + '</div>' + groups[g].map(function (m) { return '<button role="menuitem" data-' + attr + '="' + axis + ':' + m.key + '" class="' + (current === m.key ? 'on' : '') + '" data-label="' + esc(mLabel(m.key).toLowerCase()) + '">' + esc(mLabel(m.key)) + (DB.log[m.key] ? '<em>log</em>' : '') + '</button>'; }).join('');
  }).join('') + '</div>';
}

/* ── drawer ─────────────────────────────────────────────────────────── */
function openDrawer(tab) { if (tab) setTab(tab); S.drawer = true; $('#drawer').classList.add('open'); $('#drawer').setAttribute('aria-hidden', 'false'); $('#fBtn').classList.add('on'); $('#fBtn').setAttribute('aria-expanded', 'true'); $('#drawer').inert = false; }
function closeDrawer() { S.drawer = false; $('#drawer').classList.remove('open'); $('#drawer').setAttribute('aria-hidden', 'true'); $('#fBtn').classList.remove('on'); $('#fBtn').setAttribute('aria-expanded', 'false'); $('#drawer').inert = true; }
function setTab(t) {
  S.tab = t;
  $$('.dr-tab').forEach(function (b) { b.classList.toggle('on', b.dataset.tab === t); b.setAttribute('aria-selected', b.dataset.tab === t ? 'true' : 'false'); });
  $$('.dr-pane').forEach(function (p) { p.classList.toggle('on', p.dataset.pane === t); });
  if (t === 'compare') renderCompare();
  if (t === 'target') renderTargetPane();
}

/* ── tooltip ─────────────────────────────────────────────────────────── */
function showTip(d, x, y, panel) {
  var t = $('#tip'); if (!t) return;
  if (!d || !panel) { t.classList.remove('on'); return; }
  if (t.parentNode !== panel) panel.appendChild(t);
  if (t.dataset.id !== d._id) {
    t.dataset.id = d._id;
    var fails = d._m ? [] : failingFilters(d), k = cardMetrics();
    t.innerHTML = '<canvas data-th="' + esc(d._id) + '" width="168" height="126"></canvas><div class="tb"><div class="tn">' + esc(displayPreset(d)) + '</div><div class="tf">' + esc(FAMILY_NAME[d.family] || d.family) + ' · ' + esc(d._id) + '</div>' +
      '<div class="tm">' + k.map(function (key) { var r = resolveValue(d[key], key); return esc(mShort(key)) + ' <b>' + esc(d[key] == null ? '—' : r.value + (r.isResolved ? ' ' + r.unit : '')) + '</b>'; }).join('<br>') + '</div>' +
      (fails.length ? '<div class="tw">Hidden by ' + fails.map(function (f) { return esc(f.k + ' ' + f.v); }).join(', ') + '</div>' : '') + '</div>';
    paintThumbs(t);
  }
  t.classList.add('on');
  var W = panel.clientWidth, H = panel.clientHeight, tw = t.offsetWidth, th = t.offsetHeight;
  t.style.left = clamp(x + 18, 8, W - tw - 8) + 'px'; t.style.top = clamp(y - th / 2, 8, H - th - 8) + 'px';
}

/* ── target banner: nothing near the target → explore around the nearest in Sweep ── */
function renderTargetBanner() {
  $$('.t-banner').forEach(function (b) { b.remove(); });
  if (!F.target) return;
  /* desktop: inline in the results header, so it never covers the plot */
  var host = S.mobile ? $('#mHeroWrap') : $('#pRes .ph'); if (!host) return;
  var near = S.list.filter(function (d) { return isFinite(d._tdist); })[0];
  var far = !near || near._tdist > TARGET_FAR;
  var b = document.createElement('div'); b.className = 't-banner' + (far ? ' far' : '');
  b.innerHTML = ic('target') + '<div class="tbx"><b>' + (far ? 'Nothing in the Vault near this target' : 'Ranked by closeness to the target') + '</b><span>' +
    (near ? (far ? 'Nearest is ' + esc(displayPreset(near)) + ' · ' + Math.round((targetCloseness(near) || 0) * 100) + '% close' : esc(S.list.filter(function (d) { return targetCloseness(d) > 0.8; }).length) + ' designs are within 80%') : 'No design has both values') + '</span></div>' +
    (near && far ? '<button class="sbtn" data-sweep="' + esc(near._id) + '">' + ic('sweep') + 'Explore around it in Sweep</button>' : '') +
    (near && !far ? '<button class="mini" data-inspect="' + esc(near._id) + '">Inspect closest</button>' : '') +
    '<button class="x" data-untag="target" title="Clear the target" aria-label="Clear the target">' + gl('x') + '</button>';
  if (S.mobile) host.appendChild(b); else { b.classList.add('inline'); host.insertBefore(b, host.querySelector('.hsp')); }
}
