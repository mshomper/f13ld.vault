/* ============================================================
   F13LD.vault · 66-trends.js  (v0.9.0)
   Correlation map: every pickable metric against every other, coloured by
   rank correlation over the designs that match the current filters. Hover
   a cell for the pair, its ρ and how many designs carry both; click it to
   send the pair to the 2D plot. The side list ranks what moves with the
   metric under the pointer and names near-duplicates (|ρ| ≥ 0.95).
   Order: "Similar" clusters metrics that trend together (average linkage
   on 1 − |ρ|); "Group" keeps the metric groups. Phones get the ranked list
   only — a 60-column grid can't be touched at that width.

   ρ is Spearman-style: each metric is ranked once over the filtered set,
   then Pearson on those ranks over the designs that have both values.
   Diverging colour: negative = Vault blue, positive = green, 0 = a dark
   neutral; the sign and value are always in the tooltip and the list.
   ============================================================ */

var TR = { open: false, order: 'similar', M: null, keys: [], idx: [], n: [], hover: -1, focus: -1, cs: 14, lab: 168, top: 0, N: 0 };
var TR_NEG = [91, 164, 238], TR_POS = [143, 209, 79], TR_MID = [30, 33, 48];
var TR_MIN_N = 15;

function trColor(r) {
  if (!isNum(r)) return 'rgba(0,0,0,0)';
  var t = Math.min(1, Math.abs(r)), e = r < 0 ? TR_NEG : TR_POS;
  t = Math.pow(t, 0.8);   /* lift mid values a little so 0.3–0.6 reads */
  return 'rgb(' + [0, 1, 2].map(function (j) { return Math.round(TR_MID[j] + (e[j] - TR_MID[j]) * t); }).join(',') + ')';
}
/* Ranks (ties averaged) of metric k over the list; NaN where missing. */
function trRanks(list, k) {
  var idx = [], out = new Float64Array(list.length).fill(NaN);
  for (var i = 0; i < list.length; i++) if (isNum(list[i][k])) idx.push(i);
  idx.sort(function (a, b) { return list[a][k] - list[b][k]; });
  for (var p = 0; p < idx.length;) {
    var q = p; while (q + 1 < idx.length && list[idx[q + 1]][k] === list[idx[p]][k]) q++;
    var r = (p + q) / 2; for (var s = p; s <= q; s++) out[idx[s]] = r;
    p = q + 1;
  }
  return out;
}
function trCompute() {
  var list = S.list && S.list.length ? S.list : DB.all, N = list.length;
  var keys = pickableMetrics().map(function (m) { return m.key; }).filter(function (k) {
    if (k === '_scar' || !hasMetric(k)) return false;
    var c = 0, first = null, varies = false;
    for (var i = 0; i < N; i++) { var v = list[i][k]; if (isNum(v)) { c++; if (first === null) first = v; else if (v !== first) varies = true; } }
    return c >= TR_MIN_N && varies;
  });
  var R = keys.map(function (k) { return trRanks(list, k); }), K = keys.length;
  var M = [], NN = [];
  for (var a = 0; a < K; a++) { M.push(new Float64Array(K)); NN.push(new Int32Array(K)); }
  for (a = 0; a < K; a++) {
    M[a][a] = 1; var ra = R[a], cA = 0; for (var i0 = 0; i0 < N; i0++) if (!isNaN(ra[i0])) cA++; NN[a][a] = cA;
    for (var b = a + 1; b < K; b++) {
      var rb = R[b], n = 0, sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0;
      for (var i = 0; i < N; i++) { var x = ra[i], y = rb[i]; if (x !== x || y !== y) continue; n++; sx += x; sy += y; sxx += x * x; syy += y * y; sxy += x * y; }
      var r = NaN;
      if (n >= TR_MIN_N) { var vx = sxx - sx * sx / n, vy = syy - sy * sy / n; if (vx > 0 && vy > 0) r = (sxy - sx * sy / n) / Math.sqrt(vx * vy); }
      M[a][b] = M[b][a] = r; NN[a][b] = NN[b][a] = n;
    }
  }
  TR.M = M; TR.n = NN; TR.keys = keys; TR.N = N;
  trOrder();
}
/* Leaf order of an average-linkage tree on 1 − |ρ| (missing = 1). */
function trOrder() {
  var K = TR.keys.length, M = TR.M;
  if (TR.order === 'group') {
    var gi = {}; metricsAll().forEach(function (m, i) { gi[m.key] = i; });
    var grp = ['Derived', 'Geometry', 'Stiffness', 'Shear', 'Elastic tensor', 'Thermal', 'Compliance', 'Pore', 'Curvature', 'Topology', 'Transport'];
    TR.idx = TR.keys.map(function (k, i) { return i; }).sort(function (a, b) {
      var ga = grp.indexOf(METRIC_MAP[TR.keys[a]].group), gb = grp.indexOf(METRIC_MAP[TR.keys[b]].group);
      return ga - gb || gi[TR.keys[a]] - gi[TR.keys[b]]; });
    return;
  }
  var D = function (a, b) { var r = M[a][b]; return isNum(r) ? 1 - Math.abs(r) : 1; };
  var clusters = []; for (var i = 0; i < K; i++) clusters.push([i]);
  while (clusters.length > 1) {
    var best = Infinity, bi = 0, bj = 1;
    for (var p = 0; p < clusters.length; p++) for (var q = p + 1; q < clusters.length; q++) {
      var s = 0, A = clusters[p], B = clusters[q];
      for (var x = 0; x < A.length; x++) for (var y = 0; y < B.length; y++) s += D(A[x], B[y]);
      s /= A.length * B.length; if (s < best) { best = s; bi = p; bj = q; }
    }
    /* join so the closest ends meet */
    var A1 = clusters[bi], B1 = clusters[bj], opts = [[A1, B1], [A1, B1.slice().reverse()], [A1.slice().reverse(), B1], [B1, A1]];
    var pick = opts.reduce(function (m, o) { var d = D(o[0][o[0].length - 1], o[1][0]); return d < m.d ? { d: d, o: o } : m; }, { d: Infinity, o: opts[0] }).o;
    clusters.splice(bj, 1); clusters[bi] = pick[0].concat(pick[1]);
  }
  TR.idx = clusters[0] || [];
}

function openTrends() {
  if (!DB.N) return;
  closeMenu(); TR.open = true; TR.hover = -1; TR.focus = -1;
  trCompute();
  var el = $('#trDlg'); el.classList.add('open');
  el.innerHTML = '<div class="kbd-box tr-box" role="dialog" aria-modal="true" aria-labelledby="trT">' +
    '<div class="kbd-h">' + ic('trends') + '<span id="trT">Correlation map</span>' +
    '<span class="tr-sub">' + TR.keys.length + ' metrics · ' + TR.N.toLocaleString('en-US') + ' designs in the current filters</span>' +
    (S.mobile ? '' : '<div class="seg tr-ord" role="group" aria-label="Order"><button data-tr-ord="similar"' + (TR.order === 'similar' ? ' class="on"' : '') + '>Similar</button><button data-tr-ord="group"' + (TR.order === 'group' ? ' class="on"' : '') + '>Group</button></div>') +
    '<button class="ibtn" data-tr="close" aria-label="Close">' + gl('x') + '</button></div>' +
    '<div class="tr-main">' + (S.mobile ? '' : '<div class="tr-grid"><canvas id="trCv" aria-label="Correlation map: hover a cell, click to plot the pair in 2D"></canvas></div>') +
    '<div class="tr-side" id="trSide"></div></div>' +
    '<div class="tr-legend"><span>−1</span><i></i><span>0</span><i class="pos"></i><span>+1</span><em>rank correlation ρ · ' + (S.mobile ? 'tap a metric pair to plot it' : 'click a cell to plot the pair in 2D') + '</em></div></div>';
  bindTrends();
  if (!S.mobile) requestAnimationFrame(trDraw);
  var vf = TR.keys.indexOf('volume_fraction');
  trSide(vf >= 0 ? vf : TR.idx.length ? TR.idx[0] : -1);
}
function closeTrends() { if (!TR.open) return; TR.open = false; var el = $('#trDlg'); el.classList.remove('open'); el.innerHTML = ''; }

function trLayout() {
  var host = $('.tr-grid'), cv = $('#trCv'); if (!host || !cv) return null;
  var K = TR.idx.length, W = host.clientWidth, lab = 150, top = 120;
  var cs = Math.max(13, Math.floor((W - lab - 8) / Math.max(1, K)));
  cs = Math.min(cs, 22);
  TR.cs = cs; TR.lab = lab; TR.top = top;
  return { W: lab + cs * K + 4, H: top + cs * K + 4, cs: cs, K: K };
}
function trDraw() {
  var cv = $('#trCv'); if (!cv || !TR.open) return;
  var L = trLayout(); if (!L) return;
  var host = $('.tr-grid');
  if (L.W > host.clientWidth + 1) {   /* never a sideways scroll: stack the list under the grid; still too narrow → the list alone */
    var main = $('.tr-main');
    if (!main.classList.contains('stack')) { main.classList.add('stack'); requestAnimationFrame(trDraw); return; }
    host.style.display = 'none'; main.classList.add('list-only'); return;
  }
  var dpr = window.devicePixelRatio || 1, ctx = cv.getContext('2d'); if (!ctx) return;
  cv.style.width = L.W + 'px'; cv.style.height = L.H + 'px'; cv.width = Math.round(L.W * dpr); cv.height = Math.round(L.H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, L.W, L.H);
  var cs = L.cs, x0 = TR.lab, y0 = TR.top, K = L.K, hov = TR.hover, hr = hov >= 0 ? Math.floor(hov / K) : -1, hc = hov >= 0 ? hov % K : -1;
  for (var r = 0; r < K; r++) for (var c = 0; c < K; c++) {
    var v = TR.M[TR.idx[r]][TR.idx[c]];
    ctx.fillStyle = r === c ? '#2a2f47' : isNum(v) ? trColor(v) : '#12141f';
    ctx.fillRect(x0 + c * cs + 1, y0 + r * cs + 1, cs - 2, cs - 2);   /* 2px surface gap between cells */
  }
  /* group separators in Group order */
  if (TR.order === 'group') {
    ctx.strokeStyle = 'rgba(228,230,242,0.28)'; ctx.lineWidth = 1;
    for (var i = 1; i < K; i++) if (METRIC_MAP[TR.keys[TR.idx[i]]].group !== METRIC_MAP[TR.keys[TR.idx[i - 1]]].group) {
      ctx.beginPath(); ctx.moveTo(x0 + i * cs, y0); ctx.lineTo(x0 + i * cs, y0 + K * cs); ctx.moveTo(x0, y0 + i * cs); ctx.lineTo(x0 + K * cs, y0 + i * cs); ctx.stroke();
    }
  }
  ctx.font = '500 12px "JetBrains Mono",monospace'; ctx.textBaseline = 'middle';
  for (r = 0; r < K; r++) {
    var k = TR.keys[TR.idx[r]], on = r === hr || r === hc || TR.idx[r] === TR.focus;
    ctx.fillStyle = on ? '#e4e6f2' : 'rgba(163,168,191,0.85)'; ctx.textAlign = 'right';
    ctx.fillText(trClip(ctx, mShort(k), TR.lab - 10), x0 - 6, y0 + r * cs + cs / 2);
    ctx.save(); ctx.translate(x0 + r * cs + cs / 2, y0 - 6); ctx.rotate(-Math.PI / 2); ctx.textAlign = 'left';
    ctx.fillStyle = (r === hc || TR.idx[r] === TR.focus) ? '#e4e6f2' : 'rgba(163,168,191,0.85)';
    ctx.fillText(trClip(ctx, mShort(k), TR.top - 12), 0, 0); ctx.restore();
  }
  if (hov >= 0) {
    ctx.strokeStyle = '#e4e6f2'; ctx.lineWidth = 1.5; ctx.strokeRect(x0 + hc * cs + 0.5, y0 + hr * cs + 0.5, cs - 1, cs - 1);
    ctx.strokeStyle = 'rgba(228,230,242,0.22)'; ctx.lineWidth = 1;
    ctx.strokeRect(x0 + 0.5, y0 + hr * cs + 0.5, K * cs - 1, cs - 1); ctx.strokeRect(x0 + hc * cs + 0.5, y0 + 0.5, cs - 1, K * cs - 1);
  }
}
function trClip(ctx, s, w) { if (ctx.measureText(s).width <= w) return s; while (s.length > 2 && ctx.measureText(s + '…').width > w) s = s.slice(0, -1); return s + '…'; }
function trCellAt(e) {
  var cv = $('#trCv'), rc = cv.getBoundingClientRect(), x = e.clientX - rc.left - TR.lab, y = e.clientY - rc.top - TR.top, K = TR.idx.length;
  var c = Math.floor(x / TR.cs), r = Math.floor(y / TR.cs);
  if (x < 0 && y >= 0 && r < K) return { row: r, label: true };
  return c >= 0 && r >= 0 && c < K && r < K ? { row: r, col: c } : null;
}
function trFmt(r) { return isNum(r) ? (r >= 0 ? '+' : '−') + Math.abs(r).toFixed(2) : '—'; }

/* Side list: what moves with metric a (strongest first), and near-duplicates. */
function trSide(a) {
  var el = $('#trSide'); if (!el) return;
  if (a < 0) { el.innerHTML = '<p class="tr-p">No metric varies across these designs.</p>'; return; }
  TR.focus = a;
  var K = TR.keys.length, rows = [];
  for (var b = 0; b < K; b++) if (b !== a && isNum(TR.M[a][b])) rows.push([b, TR.M[a][b]]);
  rows.sort(function (p, q) { return Math.abs(q[1]) - Math.abs(p[1]); });
  var dup = rows.filter(function (r) { return Math.abs(r[1]) >= 0.95; });
  var sel = '<label class="tr-pick"><span>Metric</span><select id="trSel">' + TR.idx.map(function (i) { return '<option value="' + i + '"' + (i === a ? ' selected' : '') + '>' + esc(mLabel(TR.keys[i])) + '</option>'; }).join('') + '</select></label>';
  var bar = function (r) {
    var k = TR.keys[r[0]], w = Math.round(Math.abs(r[1]) * 100);
    return '<button class="tr-row" data-tr-pair="' + a + ',' + r[0] + '" title="' + esc(mLabel(TR.keys[a]) + ' × ' + mLabel(k) + ' · ρ ' + trFmt(r[1]) + ' · ' + TR.n[a][r[0]] + ' designs — plot in 2D') + '">' +
      '<span class="tr-l">' + esc(mLabel(k)) + '</span><span class="tr-b"><i class="' + (r[1] < 0 ? 'neg' : 'pos') + '" style="width:' + w + '%"></i></span><b>' + trFmt(r[1]) + '</b></button>';
  };
  el.innerHTML = sel + '<div class="tr-h">Moves with ' + esc(mShort(TR.keys[a])) + '</div>' + rows.slice(0, S.mobile ? 14 : 10).map(bar).join('') +
    (dup.length ? '<div class="tr-h">Near-duplicates <span>|ρ| ≥ 0.95 — they say the same thing here</span></div>' + dup.slice(0, 6).map(bar).join('') : '') +
    '<p class="tr-p">ρ is a rank correlation over the designs in the current filters; filter to one family to see how its trends differ.</p>';
  $('#trSel').onchange = function () { trSide(+this.value); trDraw(); };
}
function trPlot(a, b) {
  var kx = TR.keys[a], ky = TR.keys[b];
  closeTrends();
  S._domAxesAuto = false;
  setAxis2('x', kx, true); setAxis2('y', ky, true); VIEWS.p2 && VIEWS.p2.reset(); VIEWS.m2 && VIEWS.m2.reset();
  if (S.mobile) setMhv('2d'); else if (S.hv === '3d') setHv('split');
  toast('2D axes · <b>' + esc(mLabel(kx)) + '</b> × <b>' + esc(mLabel(ky)) + '</b> · ρ ' + trFmt(TR.M[a][b]));
}
function bindTrends() {
  var el = $('#trDlg');
  el.onclick = function (e) {
    var b;
    if (e.target === el) { closeTrends(); return; }
    if ((b = e.target.closest('[data-tr="close"]'))) { closeTrends(); return; }
    if ((b = e.target.closest('[data-tr-ord]'))) { TR.order = b.dataset.trOrd; trOrder(); $$('[data-tr-ord]').forEach(function (x) { x.classList.toggle('on', x === b); }); TR.hover = -1; trDraw(); return; }
    if ((b = e.target.closest('[data-tr-pair]'))) { var p = b.dataset.trPair.split(',').map(Number); trPlot(p[0], p[1]); return; }
  };
  el.onkeydown = function (e) { if (e.key === 'Escape') { e.stopPropagation(); closeTrends(); } };
  var cv = $('#trCv'); if (!cv) return;
  var tip = document.createElement('div'); tip.className = 'tr-tip'; $('.tr-grid').appendChild(tip);
  cv.onmousemove = function (e) {
    var h = trCellAt(e), K = TR.idx.length;
    if (!h || h.label) { if (TR.hover !== -1) { TR.hover = -1; trDraw(); } tip.classList.remove('on'); cv.style.cursor = h && h.label ? 'pointer' : 'default'; return; }
    var id = h.row * K + h.col; cv.style.cursor = h.row === h.col ? 'default' : 'pointer';
    if (id !== TR.hover) { TR.hover = id; trDraw(); }
    var a = TR.idx[h.row], b = TR.idx[h.col];
    tip.innerHTML = '<b>' + esc(mLabel(TR.keys[a])) + '</b> × <b>' + esc(mLabel(TR.keys[b])) + '</b><br>' + (a === b ? 'the same metric' : 'ρ ' + trFmt(TR.M[a][b]) + ' · ' + TR.n[a][b].toLocaleString('en-US') + ' designs · click to plot');
    var g = $('.tr-grid').getBoundingClientRect(), x = e.clientX - g.left + $('.tr-grid').scrollLeft, y = e.clientY - g.top + $('.tr-grid').scrollTop;
    tip.style.left = Math.min(x + 14, g.width - 250) + 'px'; tip.style.top = (y + 16) + 'px'; tip.classList.add('on');
  };
  cv.onmouseleave = function () { TR.hover = -1; tip.classList.remove('on'); trDraw(); };
  cv.onclick = function (e) {
    var h = trCellAt(e); if (!h) return;
    if (h.label) { trSide(TR.idx[h.row]); trDraw(); return; }
    if (h.row === h.col) { trSide(TR.idx[h.row]); trDraw(); return; }
    trPlot(TR.idx[h.col], TR.idx[h.row]);   /* column → X, row → Y */
  };
}
