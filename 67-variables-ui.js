/* ============================================================
   F13LD.vault · 67-variables-ui.js  (v0.10.0)
   The variable builder: the drawer's Variables tab on desktop, a full-height
   sheet on the phone. Templates · formula bar (chips; tap to swap a metric or
   change a number; operators, functions, numbers; commas fill themselves in
   inside min / max / mean) · shape preview (spread ridge, dot cloud with a
   median trend, top three) · duplicate check (a formula that moves in
   lockstep with a metric already in the menu says so) · My variables (edit,
   duplicate, delete, export, import). "New variable…" opens it from every
   metric menu and remembers where it came from, so Save puts the variable
   straight onto that axis, colour, sort or filter.
   ============================================================ */

var VB = { f: '', label: '', short: '', scale: 'auto', better: 0, edit: null, target: null, xk: 'volume_fraction', last: null, tpl: -1, dup: null, err: '' };

function vbHost() { return S.mobile ? $('#varBody') : $('#dVars'); }
function openVarBuilder(o) {
  o = o || {};
  if (o.edit) vbStartEdit(o.edit, true);
  if ('target' in o) VB.target = o.target || null;
  if (S.mobile) { $('#varDlg').classList.add('open'); renderVarsPane(); }
  else { if (S.drawer && S.tab === 'vars') renderVarsPane(); else openDrawer('vars'); }
  if (typeof tourEvent === 'function') tourEvent('newvar');
}
function closeVarDlg() { $('#varDlg').classList.remove('open'); closeMenu(); }

/* Menu entries shared by the axis, colour and sort menus. */
function varNewItemHTML(tag) { return '<button class="m-newvar" data-newvar="' + esc(tag) + '">' + gl('plus') + '<span>New variable…</span></button>'; }
function varMenuGroupHTML(kind, cur) {
  var vs = VARS.filter(function (v) { return hasMetric(v.k); });
  return '<div class="mg">My variables</div>' + varNewItemHTML(kind + ':') + vs.map(function (v) {
    return kind === 'color' ? '<button data-color="' + v.k + '" class="' + (cur === v.k ? 'on' : '') + '">' + esc(v.label) + '</button>'
      : '<button data-sort="' + v.k + ':' + (v.better < 0 ? 1 : -1) + '" class="' + (cur === v.k ? 'on' : '') + '">' + esc(v.label) + '<em>' + (v.better < 0 ? 'lowest first' : 'highest first') + '</em></button>';
  }).join('');
}
function vbTargetText(t) {
  if (!t) return '';
  if (t.attr === 'setax2') return 'Saves onto the 2D ' + t.axis.toUpperCase() + ' axis';
  if (t.attr === 'setax3') return 'Saves onto the 3D ' + t.axis.toUpperCase() + ' axis';
  if (t.attr === 'color') return 'Saves as the point colour';
  if (t.attr === 'sort') return 'Saves as the sort';
  if (t.attr === 'range') return 'Saves as a range filter';
  return '';
}

/* ── the pane ──────────────────────────────────────────────────────── */
function renderVarsPane() {
  var h = vbHost(); if (!h || !DB.loaded) return;
  var other = S.mobile ? $('#dVars') : $('#varBody'); if (other) other.innerHTML = '';   /* one builder in the page at a time */
  var ed = VB.edit && varByKey(VB.edit);
  var seg = function (id, opts, cur) { return '<div class="seg vb-seg" data-vbseg="' + id + '">' + opts.map(function (o) { return '<button data-v="' + o[0] + '" class="' + (String(cur) === String(o[0]) ? 'on' : '') + '">' + esc(o[1]) + '</button>'; }).join('') + '</div>'; };
  h.innerHTML = '<div class="vb-cols">' +
    '<section class="dr-col vb-build"><div class="dr-h"><span class="ico">' + ic('vars') + '</span>' + (ed ? 'Edit · ' + esc(ed.label) : 'New variable') + '<span>a formula over any metric</span></div>' +
      '<div class="vb-tpl"><span class="lbl">Start from</span>' + VAR_TEMPLATES.map(function (t, i) { return '<button class="chip vb-tp' + (VB.tpl === i ? ' on' : '') + '" data-vbtpl="' + i + '" title="' + esc(varPretty(t.f)) + '">' + esc(t.n) + '</button>'; }).join('') + '</div>' +
      '<div class="vb-fbar" id="vbBar"><div class="vb-line" id="vbLine"></div><div class="vb-tools">' +
        '<button class="vb-tb pri" data-vbadd="metric" data-menu>' + gl('plus') + 'Metric</button><span class="vb-sep"></span>' +
        [['+', 'Plus', '+'], ['-', 'Minus', '−'], ['*', 'Times', '×'], ['/', 'Divide', '÷'], ['^', 'Power', '^'], ['(', 'Open bracket', '('], [')', 'Close bracket', ')']].map(function (o) { return '<button class="vb-tb op" data-vbk="' + o[0] + '" title="' + o[1] + '" aria-label="' + o[1] + '">' + o[2] + '</button>'; }).join('') +
        '<span class="vb-sep"></span><button class="vb-tb" data-vbadd="fn" data-menu>Function</button><button class="vb-tb" data-vbadd="num" data-menu>Number</button>' +
        '<span class="vb-end"><button class="vb-tb" data-vbx="back" title="Remove the last piece" aria-label="Remove the last piece">' + gl('prev') + '</button><button class="vb-tb" data-vbx="clear" title="Clear the formula" aria-label="Clear the formula">' + gl('x') + '</button></span>' +
      '</div></div>' +
      '<div class="vb-msg" id="vbMsg"></div>' +
      '<div class="vb-dup" id="vbDup" hidden></div>' +
      '<div class="vb-meta"><label class="bio-f"><span>Name</span><span class="in"><input id="vbName" maxlength="40" autocomplete="off" spellcheck="false" placeholder="Name it" value="' + esc(VB.label) + '"></span></label>' +
        '<label class="bio-f"><span>Short</span><span class="in"><input id="vbShort" maxlength="10" autocomplete="off" spellcheck="false" placeholder="auto" value="' + esc(VB.short) + '"></span></label></div>' +
      '<div class="vb-opts"><span class="vb-og"><span class="lbl">Scale</span>' + seg('scale', [['auto', 'Auto'], ['lin', 'Linear'], ['log', 'Log']], VB.scale) + '</span>' +
        '<span class="vb-og"><span class="lbl">Better</span>' + seg('better', [[1, 'Higher'], [-1, 'Lower'], [0, 'Neither']], VB.better) + '</span></div>' +
      '<div class="vb-save"><span class="vb-tt">' + esc(vbTargetText(VB.target)) + '</span>' + (ed ? '<button class="sbtn ghost" data-vbx="cancel">Cancel</button>' : '') +
        '<button class="sbtn" id="vbSave" data-vbx="save" disabled>' + gl('tick') + (ed ? 'Update' : 'Save variable') + '</button></div>' +
    '</section>' +
    '<section class="dr-col vb-shape"><div class="dr-h"><span class="ico">' + ic('trends') + '</span>Shape<span>how it spreads across the Vault</span></div>' +
      '<div class="vb-sline" id="vbSline"></div><canvas class="vb-cv" id="vbHist" data-h="64"></canvas>' +
      '<div class="vb-vs">Against <button class="vb-pick" data-vbadd="x" data-menu><span id="vbXl">' + esc(mLabel(VB.xk)) + '</span>' + gl('chev') + '</button><span id="vbLg"></span></div>' +
      '<canvas class="vb-cv" id="vbScat" data-h="168"></canvas><div class="vb-miss" id="vbMiss"></div><div class="vb-tops" id="vbTops"></div>' +
    '</section>' +
    '<section class="dr-col vb-list"><div class="dr-h"><span class="ico">' + ic('key') + '</span>My variables<span>this browser</span>' +
      '<button class="ibtn" data-vbx="export" title="Export your variables to a file" aria-label="Export">' + gl('dn') + '</button><button class="ibtn" data-vbx="import" title="Import variables from a file" aria-label="Import">' + gl('up') + '</button><input type="file" id="vbFile" accept=".json,application/json" hidden></div>' +
      '<div id="vbSaved"></div>' +
      '<p class="vb-note">Saved in this browser only. A share link carries the variables its view uses.</p>' +
      '<p class="vb-note vb-soon">' + gl('dot') + 'Community sharing comes later, reviewed before anything appears for everyone.</p>' +
    '</section></div>';
  vbBind(h); vbDrawSaved(); vbRefresh();
}
function vbDrawSaved() {
  var el = $('#vbSaved'); if (!el) return;
  el.innerHTML = VARS.length ? VARS.map(function (v) {
    return '<div class="vb-sv' + (VB.edit === v.k ? ' on' : '') + '"><div class="tx"><div class="nm">' + esc(v.label) + '<em>' + esc(v.short) + '</em>' + (v.linkOnly ? '<span class="vb-lk">from a link</span>' : '') + '</div><code>' + esc(varPretty(v.f)) + (v.err ? ' · ' + esc(v.err) : '') + '</code></div>' +
      (v.linkOnly ? '<button class="ibtn" data-vbkeep="' + v.k + '" title="Keep in My variables" aria-label="Keep">' + gl('tick') + '</button>' : '') +
      '<button class="ibtn" data-vbedit="' + v.k + '" title="Edit" aria-label="Edit">' + gl('next') + '</button>' +
      '<button class="ibtn" data-vbdup="' + v.k + '" title="Duplicate" aria-label="Duplicate">' + gl('copy') + '</button>' +
      '<button class="ibtn" data-vbdel="' + v.k + '" title="Delete" aria-label="Delete">' + gl('x') + '</button></div>';
  }).join('') : '<p class="vb-note">No variables yet. Save one and it appears here and in every metric menu.</p>';
}

/* ── events ────────────────────────────────────────────────────────── */
function vbBind(h) {
  h.onclick = function (e) {
    var b = e.target.closest('button,[data-vbi]'); if (!b || !h.contains(b)) return;
    var d = b.dataset;
    if (d.vbtpl != null) { var t = VAR_TEMPLATES[+d.vbtpl]; VB.tpl = +d.vbtpl; VB.f = t.f; if (!VB.edit) { VB.label = t.name; VB.short = ''; $('#vbName').value = t.name; $('#vbShort').value = ''; } $$('.vb-tp', h).forEach(function (x) { x.classList.toggle('on', x === b); }); vbRefresh(); return; }
    if (d.vbk) { vbAppend(d.vbk); return; }
    if (d.vbadd === 'metric') { vbMetricPop(b, 'Search ' + vbInputs().length + ' metrics', null, function (k) { vbAppend('[' + k + ']'); }); return; }
    if (d.vbadd === 'x') { vbMetricPop(b, 'Plot against…', VB.xk, function (k) { VB.xk = k; $('#vbXl').textContent = mLabel(k); vbShape(); }, true); return; }
    if (d.vbadd === 'fn') { vbFnPop(b); return; }
    if (d.vbadd === 'num') { vbNumPop(b, '1', function (v) { vbAppend(v); }); return; }
    if (d.vbi != null) { vbChipTap(b, +d.vbi); return; }
    if (d.vbx === 'back') { var tk = varTokenize(VB.f); tk.pop(); if (tk.length && tk[tk.length - 1].t === 'p' && tk[tk.length - 1].v === ',') tk.pop(); VB.f = varUntok(tk); VB.tpl = -1; vbRefresh(); return; }
    if (d.vbx === 'clear') { VB.f = ''; VB.tpl = -1; vbRefresh(); return; }
    if (d.vbx === 'save') { vbSave(); return; }
    if (d.vbx === 'cancel') { vbReset(); renderVarsPane(); return; }
    if (d.vbx === 'export') { vbExport(); return; }
    if (d.vbx === 'import') { $('#vbFile').click(); return; }
    if (d.vbx === 'use' && VB.dup) { vbUseInstead(VB.dup.k); return; }
    if (d.vbedit) { vbStartEdit(d.vbedit); renderVarsPane(); return; }
    if (d.vbdup) { var src = varByKey(d.vbdup); vbReset(); VB.f = src.f; VB.label = (src.label + ' copy').slice(0, 40); VB.scale = src.scale; VB.better = src.better; renderVarsPane(); return; }
    if (d.vbkeep) { varsKeepLinked(); return; }
    if (d.vbdel) { var r = varDelete(d.vbdel); if (r.err) toast(esc(r.err)); else { if (VB.edit === d.vbdel) vbReset(); toast('Deleted <b>' + esc(r.v.label) + '</b>'); renderVarsPane(); } return; }
    var sg = b.closest('[data-vbseg]');
    if (sg) { var v = b.dataset.v; if (sg.dataset.vbseg === 'scale') VB.scale = v; else VB.better = +v; $$('button', sg).forEach(function (x) { x.classList.toggle('on', x === b); }); vbShape(); return; }
  };
  $('#vbName').oninput = function () { VB.label = this.value; };
  $('#vbShort').oninput = function () { VB.short = this.value; };
  $('#vbFile').onchange = function () { vbImport(this.files[0]); this.value = ''; };
}
function vbStartEdit(k, quiet) {
  var v = varByKey(k); if (!v) return;
  VB.edit = k; VB.f = v.f; VB.label = v.label; VB.short = v.short; VB.scale = v.scale; VB.better = v.better; VB.tpl = -1; VB.target = null;
}
function vbReset() { VB.f = ''; VB.label = ''; VB.short = ''; VB.scale = 'auto'; VB.better = 0; VB.edit = null; VB.target = null; VB.tpl = -1; }

/* Inside min / max / mean, a value added right after another value gets its comma. */
function vbInnerFn(toks) { var st = []; toks.forEach(function (t, i) { if (t.t === 'p' && t.v === '(') st.push(i > 0 && toks[i - 1].t === 'fn' ? toks[i - 1].v : null); else if (t.t === 'p' && t.v === ')') st.pop(); }); return st.length ? st[st.length - 1] : null; }
function vbAppend(s) {
  var toks = varTokenize(VB.f), nt = varTokenize(s)[0], f = vbInnerFn(toks);
  if (f && VAR_FN[f] === -1 && varIsEnd(toks[toks.length - 1]) && varIsStart(nt)) VB.f += ',';
  VB.f = (VB.f + ' ' + s).trim(); VB.tpl = -1; $$('.vb-tp').forEach(function (x) { x.classList.remove('on'); });
  vbRefresh();
}
function vbChipTap(chip, i) {
  var toks = varTokenize(VB.f), t = toks[i]; if (!t) return;
  if (t.t === 'm') vbMetricPop(chip, 'Swap ' + mShort(t.v) + ' for…', t.v, function (k) { t.v = k; VB.f = varUntok(toks); vbRefresh(); });
  else if (t.t === 'n') vbNumPop(chip, t.v, function (v) { t.v = v; VB.f = varUntok(toks); vbRefresh(); });
}

/* ── popovers (shared menu shell from 60-dock.js) ──────────────────── */
function vbMenuHost() { return S.mobile ? $('#varDlg') : document.body; }
function vbInputs(forPlot) {
  var out = [], ret = [];
  metricsAll().forEach(function (m) {
    var k = m.key; if (!hasMetric(k) || VAR_NOT_INPUT[k] && !forPlot) return;
    if (!forPlot && VB.edit && (k === VB.edit || varUses(k, VB.edit))) return;
    var g = m.retired ? 'Retired · still in the data' : m.group;
    (m.retired ? ret : out).push({ k: k, g: g, l: mLabel(k), s: mShort(k) });
  });
  return out.concat(ret);
}
function vbMetricPop(anchor, head, cur, pick, forPlot) {
  var list = vbInputs(forPlot), groups = []; list.forEach(function (m) { if (groups.indexOf(m.g) < 0) groups.push(m.g); });
  var m = openMenu(anchor, '<div class="mh">' + esc(head) + '</div><div class="msearch"><input data-vbsearch placeholder="Search ' + list.length + ' metrics" autocomplete="off" spellcheck="false"></div>' +
    '<div class="vb-gch"><button class="vb-gc on" data-vbg="">All</button>' + groups.map(function (g) { return '<button class="vb-gc" data-vbg="' + esc(g) + '">' + esc(g.replace(' · still in the data', '')) + '</button>'; }).join('') + '</div>' +
    '<div class="vb-pl" data-vbpl></div><div class="vb-pc" data-vbpc></div>', { host: vbMenuHost() });
  if (!m) return;
  m.classList.add('vb-menu');
  var inp = m.querySelector('[data-vbsearch]'), pl = m.querySelector('[data-vbpl]'), pc = m.querySelector('[data-vbpc]'), grp = '';
  function draw() {
    var q = inp.value.trim().toLowerCase(), g = null, h = '', n = 0;
    list.forEach(function (x) {
      if (grp && x.g !== grp) return;
      if (q && x.l.toLowerCase().indexOf(q) < 0 && x.s.toLowerCase().indexOf(q) < 0 && x.g.toLowerCase().indexOf(q) < 0) return;
      if (x.g !== g) { g = x.g; h += '<div class="mg">' + esc(g) + '</div>'; }
      h += '<button data-vbpick="' + x.k + '" class="' + (x.k === cur ? 'on' : '') + '"><span>' + esc(x.l) + '</span><em>' + esc(x.s) + '</em></button>'; n++;
    });
    pl.innerHTML = h || '<div class="mg">No metric matches</div>'; pc.textContent = n + (n === 1 ? ' metric' : ' metrics');
  }
  inp.oninput = draw;
  m.addEventListener('click', function (e) {
    var g = e.target.closest('[data-vbg]'); if (g) { grp = g.dataset.vbg; $$('.vb-gc', m).forEach(function (x) { x.classList.toggle('on', x === g); }); draw(); pl.scrollTop = 0; return; }
    var p = e.target.closest('[data-vbpick]'); if (p) { closeMenu(); pick(p.dataset.vbpick); }
  });
  draw();
  if (!S.mobile) inp.focus();
}
function vbFnPop(anchor) {
  var m = openMenu(anchor, '<div class="mh">Function</div>' + VAR_FN_INFO.map(function (f) { return '<button data-vbfn="' + f[0] + '"><span class="vb-fnn">' + esc(f[0] === 'scale' ? 'scale 0–1' : f[0]) + '</span><em>' + esc(f[1]) + '</em></button>'; }).join(''), { host: vbMenuHost(), focus: true });
  if (m) m.addEventListener('click', function (e) { var b = e.target.closest('[data-vbfn]'); if (b) { closeMenu(); vbAppend(b.dataset.vbfn + '('); } });
}
function vbNumPop(anchor, start, ok) {
  var m = openMenu(anchor, '<div class="mh">Number</div><div class="vb-num"><input inputmode="decimal" autocomplete="off" value="' + esc(start) + '"><button class="sbtn">Set</button></div>', { host: vbMenuHost() });
  if (!m) return;
  var inp = m.querySelector('input');
  function go() { var v = inp.value.trim(); if (v !== '' && isFinite(+v)) { closeMenu(); ok(String(+v)); } else inp.parentNode.classList.add('bad'); }
  m.querySelector('button').onclick = go; inp.onkeydown = function (e) { if (e.key === 'Enter') { e.preventDefault(); go(); } };
  inp.focus(); inp.select();
}

/* ── evaluate + draw ───────────────────────────────────────────────── */
function vbRefresh() {
  var line = $('#vbLine'); if (!line) return;
  var r = varCompile(VB.f, VB.edit), toks = r.toks, bad = r.tok ? (Array.isArray(r.tok) ? r.tok : [r.tok]) : [];
  var html = toks.map(function (t, i) {
    var cls = (bad.indexOf(t) >= 0 || t.t === 'bad') ? ' bad' : '';
    if (t.t === 'm') return '<button type="button" class="vb-tk ' + (isVarKey(t.v) ? 'u' : 'm') + cls + '" data-vbi="' + i + '" data-menu title="' + esc((METRIC_MAP[t.v] ? mLabel(t.v) : t.v) + ' — tap to swap') + '">' + esc(METRIC_MAP[t.v] ? mShort(t.v) : t.v) + '</button>';
    if (t.t === 'n') return '<button type="button" class="vb-tk n' + cls + '" data-vbi="' + i + '" data-menu title="Tap to change">' + esc(t.v) + '</button>';
    if (t.t === 'op') return '<span class="vb-tk op' + cls + '">' + ({ '*': '×', '/': '÷', '-': '−' }[t.v] || esc(t.v)) + '</span>';
    if (t.t === 'p') return '<span class="vb-tk ' + (t.v === ',' ? 'c' : 'p') + cls + '">' + t.v + '</span>';
    return '<span class="vb-tk fn' + cls + '">' + esc(t.v) + '</span>';
  }).join('');
  line.innerHTML = (html || '<span class="vb-ph">Pick a template, or add a metric</span>') + '<span class="vb-caret"></span>';
  var showErr = !!r.err && toks.length > 0;
  $('#vbBar').classList.toggle('err', showErr);
  var msg = $('#vbMsg'); msg.className = 'vb-msg' + (showErr ? ' err' : ''); msg.textContent = showErr ? r.err : toks.length ? 'Tap a blue metric to swap it, an amber number to change it.' : '';
  VB.last = r.vals || null;
  var any = VB.last && Array.prototype.some.call(VB.last, isFinite);
  $('#vbSave').disabled = !any;
  if (VB.last && !any && !showErr) { msg.className = 'vb-msg err'; msg.textContent = 'No design has a value for this — check the inputs.'; }
  vbDupCheck(); vbShape();
}
/* A recipe that moves in lockstep with an existing metric (rank correlation ≥ 0.995). */
function vbRanks(a) { var idx = [], i; for (i = 0; i < a.length; i++) if (isFinite(a[i])) idx.push(i); idx.sort(function (p, q) { return a[p] - a[q]; }); var r = new Float64Array(a.length).fill(NaN); idx.forEach(function (ix, j) { r[ix] = idx.length > 1 ? j / (idx.length - 1) : 0.5; }); return r; }
function vbDupCheck() {
  var box = $('#vbDup'); VB.dup = null; if (!box) return;
  if (!VB.last) { box.hidden = true; return; }
  var me = vbRanks(VB.last), best = null;
  pickableMetrics().forEach(function (m) {
    if (!hasMetric(m.key) || m.key === VB.edit || m.key === '_score' || m.key === '_scar') return;
    var o = pctOf(m.key), xs = 0, ys = 0, n = 0, i;
    for (i = 0; i < me.length; i++) if (isFinite(me[i]) && isFinite(o[i])) { xs += me[i]; ys += o[i]; n++; }
    if (n < 20) return;
    var mx = xs / n, my = ys / n, sxy = 0, sxx = 0, syy = 0;
    for (i = 0; i < me.length; i++) if (isFinite(me[i]) && isFinite(o[i])) { var a = me[i] - mx, b = o[i] - my; sxy += a * b; sxx += a * a; syy += b * b; }
    var c = sxx && syy ? sxy / Math.sqrt(sxx * syy) : 0;
    if (Math.abs(c) >= 0.995 && (!best || Math.abs(c) > Math.abs(best.r))) best = { k: m.key, r: c };
  });
  if (!best) { box.hidden = true; return; }
  VB.dup = best; box.hidden = false;
  box.innerHTML = gl('copy') + '<span>Moves in lockstep with <b>' + esc(mLabel(best.k)) + '</b>' + (best.r < 0 ? ', in the opposite direction' : '') + ' — already in the menu.</span><button data-vbx="use">Use it instead</button>';
}
function vbUseInstead(k) {
  var t = VB.target;
  if (t) { vbApplyTarget(t, k); toast('<b>' + esc(mLabel(k)) + '</b> · ' + esc(vbTargetText(t).replace('Saves onto', 'on').replace('Saves as', 'as'))); }
  else { setAxis2('y', k); toast('<b>' + esc(mLabel(k)) + '</b> on the 2D Y axis'); }
  if (S.mobile) closeVarDlg();
}
function vbApplyTarget(t, k) {
  if (!t) return;
  if (t.attr === 'setax2') setAxis2(t.axis || 'y', k);
  else if (t.attr === 'setax3') setAxis3(t.axis || 'x', k);
  else if (t.attr === 'color') setColor(k);
  else if (t.attr === 'sort') { var v = varByKey(k); S.sort = { k: k, dir: v && v.better < 0 ? 1 : -1 }; savePrefs(); requestRefresh(); }
  else if (t.attr === 'range') addRangeKey(k);
}
function vbSave() {
  if (!VB.last) return;
  var name = (VB.label || '').trim() || (VB.tpl >= 0 ? VAR_TEMPLATES[VB.tpl].name : 'My variable ' + (VARS.length + 1));
  var r = varSaveDef({ label: name.slice(0, 40), short: (VB.short || '').trim().slice(0, 10), f: varUntok(varTokenize(VB.f)), scale: VB.scale, better: VB.better }, VB.edit);
  if (r.err) { toast(esc(r.err)); return; }
  var was = !!VB.edit, t = VB.target;
  if (t) vbApplyTarget(t, r.v.k);
  toast((was ? 'Updated ' : 'Saved ') + '<b>' + esc(r.v.label) + '</b>' + (t ? ' · ' + esc(vbTargetText(t).replace('Saves onto', 'on').replace('Saves as', 'as')) : ' · in every metric menu'));
  vbReset(); renderVarsPane();
  if (S.mobile && t) closeVarDlg();
}

/* Shape preview: small and stylized — an impression of the trend, not a full plot. */
function vbCtx(c) {
  var dpr = Math.min(window.devicePixelRatio || 1, 3), w = c.clientWidth, h = +c.dataset.h;
  c.style.height = h + 'px'; c.width = Math.max(1, Math.round(w * dpr)); c.height = Math.round(h * dpr);
  var x = c.getContext('2d'); if (!x) return null; x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, w, h); return { x: x, w: w, h: h };
}
function vbSmooth(x, pts) { x.moveTo(pts[0][0], pts[0][1]); for (var i = 1; i < pts.length - 1; i++) { var mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2; x.quadraticCurveTo(pts[i][0], pts[i][1], mx, my); } var l = pts[pts.length - 1]; x.lineTo(l[0], l[1]); }
function vbFmt(v) { if (!isFinite(v)) return '—'; var a = Math.abs(v); return a === 0 ? '0' : a >= 1e4 || a < 1e-3 ? v.toExponential(1) : a >= 100 ? v.toFixed(0) : a >= 10 ? v.toFixed(1) : a >= 1 ? v.toFixed(2) : v.toPrecision(2); }
function vbShape() {
  var hc = $('#vbHist'), sc = $('#vbScat'); if (!hc || !sc) return;
  var H = vbCtx(hc), P = vbCtx(sc); if (!H || !P) return;
  var L = VB.last, who = [], vals = [];
  if (L) for (var i = 0; i < L.length; i++) if (isFinite(L[i])) { who.push(i); vals.push(L[i]); }
  var srt = vals.slice().sort(function (a, b) { return a - b; });
  function hint(c, t) { c.x.fillStyle = '#7a809c'; c.x.font = '12px "Exo 2"'; c.x.textAlign = 'center'; c.x.fillText(t, c.w / 2, c.h / 2 + 4); }
  if (!srt.length) { hint(H, 'Spread'); hint(P, 'Trend'); $('#vbSline').innerHTML = '<span class="vb-cap">Build a formula to see how it spreads across the Vault.</span>'; $('#vbMiss').textContent = ''; $('#vbTops').innerHTML = ''; $('#vbLg').textContent = ''; return; }
  var lo2 = srt[Math.floor(srt.length * 0.02)], hi2 = srt[Math.ceil(srt.length * 0.98) - 1];
  var lg = srt[0] > 0 && (VB.scale === 'log' || (VB.scale === 'auto' && hi2 / Math.max(lo2, 1e-12) >= 40));
  var med = srt[Math.floor(srt.length / 2)];
  $('#vbSline').innerHTML = '<b>' + vbFmt(srt[0]) + '</b><span class="vb-cap">to</span><b>' + vbFmt(srt[srt.length - 1]) + '</b><span class="vb-cap vb-r">median ' + vbFmt(med) + ' · ' + srt.length.toLocaleString('en-US') + ' of ' + DB.N.toLocaleString('en-US') + '</span>';
  $('#vbLg').textContent = lg ? 'log scale' : '';
  var tf = function (v) { return lg ? Math.log10(v) : v; }, lo = tf(srt[0]), hi = tf(srt[srt.length - 1]); if (hi === lo) hi = lo + 1;
  /* spread: a soft density ridge with the median marked */
  var B = 48, cnt = new Array(B).fill(0); srt.forEach(function (v) { cnt[Math.min(B - 1, Math.floor((tf(v) - lo) / (hi - lo) * B))]++; });
  var K = [1, 3, 5, 3, 1], sm = cnt.map(function (_, b) { var s = 0, w = 0; K.forEach(function (k, j) { var q = b + j - 2; if (q >= 0 && q < B) { s += cnt[q] * k; w += k; } }); return s / w; });
  var mx = Math.max.apply(null, sm) || 1, x = H.x, pad = 10, base = H.h - 8, top = 8;
  var pts = sm.map(function (c, b) { return [pad + (b + 0.5) / B * (H.w - 2 * pad), base - (c / mx) * (base - top)]; }); pts.unshift([pad, base]); pts.push([H.w - pad, base]);
  var gr = x.createLinearGradient(0, top, 0, base); gr.addColorStop(0, 'rgba(91,164,238,.55)'); gr.addColorStop(1, 'rgba(91,164,238,.03)');
  x.beginPath(); vbSmooth(x, pts); x.closePath(); x.fillStyle = gr; x.fill();
  x.beginPath(); vbSmooth(x, pts); x.strokeStyle = 'rgba(169,205,245,.9)'; x.lineWidth = 1.4; x.stroke();
  var mxp = pad + (tf(med) - lo) / (hi - lo) * (H.w - 2 * pad);
  x.strokeStyle = 'rgba(200,245,66,.9)'; x.lineWidth = 1.5; x.setLineDash([2, 3]); x.beginPath(); x.moveTo(mxp, top - 2); x.lineTo(mxp, base); x.stroke(); x.setLineDash([]);
  x.fillStyle = '#c8f542'; x.beginPath(); x.arc(mxp, top - 2, 2.4, 0, 6.3); x.fill();
  /* trend: a dim glowing cloud against the chosen metric, and its median line */
  var xs = varCol(VB.xk), Q = who.filter(function (i) { return isFinite(xs[i]); }); x = P.x;
  if (!Q.length) hint(P, 'No overlap with that metric');
  else {
    var xv = Q.map(function (i) { return xs[i]; }), xlo = Math.min.apply(null, xv), xhi = Math.max.apply(null, xv); if (xhi === xlo) xhi = xlo + 1;
    var Lm = 12, Rm = 12, T = 12, Bm = 20, pw = P.w - Lm - Rm, ph = P.h - T - Bm;
    x.strokeStyle = 'rgba(255,255,255,.07)'; x.lineWidth = 1; x.beginPath(); x.moveTo(Lm, T + ph + 0.5); x.lineTo(Lm + pw, T + ph + 0.5); x.moveTo(Lm - 0.5, T); x.lineTo(Lm - 0.5, T + ph); x.stroke();
    x.globalCompositeOperation = 'lighter';
    Q.forEach(function (i) { var cx = Lm + (xs[i] - xlo) / (xhi - xlo) * pw, cy = T + ph - (tf(L[i]) - lo) / (hi - lo) * ph; x.fillStyle = CAT_PALETTES.family[DB.all[i].family] || '#9a9fb7'; x.globalAlpha = 0.14; x.beginPath(); x.arc(cx, cy, 5, 0, 6.3); x.fill(); x.globalAlpha = 0.85; x.beginPath(); x.arc(cx, cy, 1.5, 0, 6.3); x.fill(); });
    x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
    var NB = 10, bins = []; for (var b2 = 0; b2 < NB; b2++) bins.push([]);
    Q.forEach(function (i) { bins[Math.min(NB - 1, Math.floor((xs[i] - xlo) / (xhi - xlo) * NB))].push(tf(L[i])); });
    var tr = []; bins.forEach(function (bb, b) { if (bb.length < 3) return; bb.sort(function (a, c) { return a - c; }); tr.push([Lm + (b + 0.5) / NB * pw, T + ph - (bb[Math.floor(bb.length / 2)] - lo) / (hi - lo) * ph]); });
    if (tr.length > 1) { x.beginPath(); vbSmooth(x, tr); x.strokeStyle = 'rgba(200,245,66,.25)'; x.lineWidth = 6; x.stroke(); x.beginPath(); vbSmooth(x, tr); x.strokeStyle = '#c8f542'; x.lineWidth = 1.8; x.stroke(); }
    x.fillStyle = '#7a809c'; x.font = '12px "Exo 2"'; x.textAlign = 'left'; x.fillText(vbFmt(xlo), Lm, P.h - 4); x.textAlign = 'right'; x.fillText(vbFmt(xhi), Lm + pw, P.h - 4);
  }
  var miss = DB.N - vals.length;
  $('#vbMiss').textContent = miss ? miss.toLocaleString('en-US') + ' designs left empty (a missing input, ÷ 0, or log of a negative).' : '';
  var dir = VB.better < 0 ? 1 : -1, top3 = who.slice().sort(function (a, b) { return dir * (L[a] - L[b]); }).slice(0, 3);
  $('#vbTops').innerHTML = '<span class="vb-cap">' + (VB.better < 0 ? 'Lowest' : 'Highest') + '</span>' + top3.map(function (i) { var d = DB.all[i]; return '<button class="vb-tp3" data-inspect="' + esc(d._id) + '"><i class="dot" style="background:' + (CAT_PALETTES.family[d.family] || '#9a9fb7') + '"></i><span>' + esc(displayPreset(d)) + ' · VF ' + (isNum(d.volume_fraction) ? d.volume_fraction.toFixed(0) : '—') + '%</span><em>' + vbFmt(L[i]) + '</em></button>'; }).join('');
}

/* ── files ─────────────────────────────────────────────────────────── */
function vbExport() {
  var mine = VARS.filter(function (v) { return !v.linkOnly; });
  if (!mine.length) { toast('Nothing to export yet'); return; }
  downloadJSON({ f13ld: 'vault-variables', v: 1, variables: mine.map(function (v) { return { name: v.label, short: v.short, formula: v.f, readable: varPretty(v.f), scale: v.scale, better: v.better }; }) }, 'f13ld-vault-variables.json');
}
function vbImport(file) {
  if (!file) return;
  var rd = new FileReader();
  rd.onload = function () {
    var n = 0, j = null; try { j = JSON.parse(rd.result); } catch (e) { /* not JSON */ }
    ((j && (j.variables || j.recipes)) || []).forEach(function (o) {
      if (VARS.filter(function (v) { return !v.linkOnly; }).length >= VAR_MAX) return;
      var f = String(o.formula || ''), c = varCompile(f, null); if (c.err) return;
      if (VARS.some(function (v) { return v.f === varUntok(varTokenize(f)); })) return;
      var r = varSaveDef({ label: String(o.name || 'Imported').slice(0, 40), short: String(o.short || '').slice(0, 10), f: varUntok(varTokenize(f)), scale: o.scale, better: o.better === 1 || o.better === -1 ? o.better : 0 }, null);
      if (!r.err) n++;
    });
    toast(n ? 'Imported <b>' + n + '</b> variable' + (n > 1 ? 's' : '') : 'That file had no new variables');
    renderVarsPane();
  };
  rd.readAsText(file);
}

/* Close the phone sheet; the desktop drawer closes as before. */
document.addEventListener('click', function (e) {
  if (e.target.closest && e.target.closest('[data-act="vars-close"]')) closeVarDlg();
  else if (e.target.id === 'varDlg') closeVarDlg();
});
addEventListener('resize', debounce(function () { if ((S.drawer && S.tab === 'vars') || $('#varDlg').classList.contains('open')) vbShape(); }, 120));
