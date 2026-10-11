/* ============================================================
   F13LD.vault · 99-init.js
   Boot, event wiring and the animation loop.
   ============================================================ */

function icons(root) {
  $$('[data-ic]', root).forEach(function (e) { if (!e.firstChild) e.innerHTML = ic(e.dataset.ic); });
  $$('[data-gl]', root).forEach(function (e) { if (!e.firstChild) e.innerHTML = gl(e.dataset.gl); });
  $$('[data-mark]', root).forEach(function (e) { if (!e.firstChild) e.innerHTML = markSVG(); });
}

/* ── splash ("Resolve", as F13LD.lab) ─────────────────────────────────── */
var SPLASH = { t0: 0, done: false, msg: 'connecting to the Vault' };
function splashTick(now) {
  var sp = $('#splash'); if (!sp || SPLASH.done) return;
  var t = now - SPLASH.t0, spans = $$('#spWm span'), fin = ['F', '1', '3', 'L', 'D'], col = ['#1D9E75', '#c8f542', '#c8f542', '#1D9E75', '#1D9E75'], G = 'ABCDEFGHJKMNPRSTVWXYZ0123456789';
  spans.forEach(function (s, i) { var lock = 420 + i * 190; if (t >= lock) { s.textContent = fin[i]; s.style.color = col[i]; } else s.textContent = G[Math.floor(Math.random() * G.length)]; });
  rippleMark($('#spMark svg'), t / 200);
  $('#spMsg').textContent = SPLASH.msg;
  /* v0.8.2 — the bar tracks rows received once the total is known; the final
     count holds about a second before the fade, so it can be read */
  var real = SPLASH.tot ? 8 + 88 * Math.min(1, (SPLASH.got || 0) / SPLASH.tot) : 86;
  $('#spBar').style.width = Math.min(DB.loaded ? 100 : real, t / 18) + '%';
  if (DB.loaded && !SPLASH.doneAt) SPLASH.doneAt = now;
  if (DB.loaded && t > 1500 && now - SPLASH.doneAt > 900) {
    SPLASH.done = true; sp.classList.add('out'); setTimeout(function () { sp.remove(); }, 600);
    S.introT0 = performance.now() + 100;
    if (welcomeWanted()) setTimeout(function () { if (!WG.open && welcomeWanted()) openWelcome(); }, 650);   /* v0.9.0 */
    if (!S.mobile && !S.sel && S.list[0] && !S._linkSel) setTimeout(function () { if (!S.sel && S.list[0]) select(S.list[0], 'step-quiet'); }, 1500);
  }
}

/* ── boot ─────────────────────────────────────────────────────────────── */
var MQ = window.matchMedia ? window.matchMedia('(max-width: 760px)') : { matches: false, addEventListener: function () {} };
function applyMobile() {
  var was = S.mobile; S.mobile = !!MQ.matches;
  document.body.classList.toggle('is-mobile', S.mobile);
  if (was === S.mobile && S.ready) return;
  S.shown = S.mobile ? MOBILE_PAGE : PAGE_SIZE;   /* phones start with a lighter first page */
  if (S.mobile) { setSnap(S.snap); setMhv(S.mhv); }
  closeMenu(); renderLists(); renderInspector(); markViewsDirty();
  requestAnimationFrame(function () { applySplits(); placeSplits(); renderTags(); renderLegend(); });
}
function boot() {
  loadPrefs();
  icons(document);
  $('#spMark').innerHTML = markSVG();
  SPLASH.t0 = performance.now();
  $$('.ver').forEach(function (e) { e.textContent = 'v' + VAULT_VERSION; });
  VIEWS.h3 = new Hero3D($('.hv-3d'), false); VIEWS.p2 = new Plot2D($('.hv-2d'), false);
  VIEWS.m3 = new Hero3D($('#mHero3'), true); VIEWS.m2 = new Plot2D($('#mHero2'), true);
  VIEWS.h3.link = VIEWS.p2; VIEWS.p2.link = VIEWS.h3; VIEWS.m3.link = VIEWS.m2; VIEWS.m2.link = VIEWS.m3;
  bindOrbit($('#iCv'));
  ['spV', 'spH', 'sp3', 'spD'].forEach(function (id) { var e = $('#' + id); if (e) bindSplit(e, { spV: 'v', spH: 'h', sp3: '3d', spD: 'drawer' }[id]); });
  pvInit(); bindWelcome();
  setLayout(S.layout); setHv(S.hv); setAlive(S.alive); setTool('orbit'); setTool2('box');
  applyMobile();
  if (MQ.addEventListener) MQ.addEventListener('change', applyMobile); else if (MQ.addListener) MQ.addListener(applyMobile);
  closeDrawer();
  $('#mFilters').inert = true;
  loadVaultRows(function (n, tot) { SPLASH.got = n; SPLASH.tot = tot; SPLASH.msg = 'loading ' + n.toLocaleString() + (tot ? ' of ' + tot.toLocaleString() : '') + ' designs'; }).then(start).catch(loadFailed);
  requestAnimationFrame(loop);
}
function start(rows) {
  ingestRows(rows);
  SPLASH.msg = DB.N.toLocaleString() + ' designs · ' + DB.families.length + ' families';
  var linked = readShareLink();
  if (!DOMAIN_Z_COMPOUND[F.domain]) F.domain = 'all';
  /* saved or linked axes on a metric that's missing or retired (v0.9.0) fall back to the defaults */
  ['x', 'y', 'z'].forEach(function (a) { if ((!hasMetric(S.ax3[a]) && S.ax3[a] !== '_score') || isRetired(S.ax3[a])) S.ax3[a] = { x: '_beff', y: 'anisotropy', z: '_score' }[a]; });
  ['x', 'y'].forEach(function (a) { if (!hasMetric(S.ax2[a]) || isRetired(S.ax2[a])) S.ax2[a] = { x: 'volume_fraction', y: '_emax' }[a]; });
  if (S.color === '_perf') S.color = '_beff';
  if (S.sort && isRetired(S.sort.k)) S.sort = { k: '_score', dir: -1 };
  computeScores(F.domain);
  buildFilters(); renderTargetPane(); buildKeyPane();
  setAxesTargets3D(); set2DTargets(); recolor(); renderAxisChips(); renderLegend(); renderTray();
  $('#hStats').innerHTML = '<b>' + DB.N.toLocaleString() + '</b> designs · <b>' + DB.families.length + '</b> families' + (DB.source === 'mock' ? ' · <span class="mockb">sample data</span>' : '');
  $$('.mStatusTxt').forEach(function (e) { e.textContent = DB.N.toLocaleString(); });
  if (F.target) { computeTargetDistances(); if (!S.sort || S.sort.k !== '_target') S.sort = { k: '_target', dir: 1 }; }
  histInit(); runFilters(); onFiltersApplied(); renderLists();
  if (linked) {
    S._linkPins.forEach(function (id) { var d = DB.byId.get(String(id)); if (d && S.pins.length < 4) S.pins.push(d); }); renderTray();
    var sd = S._linkSel && DB.byId.get(String(S._linkSel)); if (sd) select(sd, 'hero');
    setHv(S.hv); setColor(S.color);
  }
  if (DB.excluded) console.info('[F13LD.vault] ' + DB.excluded + ' degenerate or invalid-solver rows are kept out of the explorer.');
  S.ready = true; S.cntShown = 0;
  initHints();
  _loadSig = [globalInputs.ref_stress_mpa, globalInputs.modulus_gpa, globalInputs.strain_lo, globalInputs.strain_hi, globalInputs.cell_size_mm].join('|');
  if (bioPromptWanted()) setTimeout(openBioPrompt, 1400);   /* v0.6: a saved Biomedical view asks too */
}
/* Gesture hints: shown until the first drag in that view, then they fade and
   stay away (remembered per browser). The shortcuts sheet (?) keeps them. */
var LS_HINTS = 'f13ld.vault.hints.v1';
function initHints() {
  var seen = Store.get(LS_HINTS, {});
  [['.hv-3d', 'h3'], ['.hv-2d', 'p2']].forEach(function (p) {
    var el = $(p[0]); if (!el || seen[p[1]]) return;
    el.classList.add('hint-on');
    var cv = el.querySelector('.v-ov');
    cv.addEventListener('pointerdown', function once() {
      cv.removeEventListener('pointerdown', once);
      setTimeout(function () { el.classList.remove('hint-on'); var s2 = Store.get(LS_HINTS, {}); s2[p[1]] = 1; Store.set(LS_HINTS, s2); markViewsDirty(); }, 2500);
    });
  });
  markViewsDirty();
}
function loadFailed(e) {
  console.error('[F13LD.vault] load failed:', e);
  DB.loaded = true; DB.error = e;
  SPLASH.msg = "couldn't reach the Vault";
  var msg = esc(e && e.message ? e.message : String(e));
  var html = '<div class="load-err">' + ic('vault' in ICONS ? 'vault' : 'cell') + '<div class="et">Couldn’t reach F13LD.vault</div><div class="es">' + msg + '</div>' +
    '<div class="es dim">On a phone this is most often a content blocker, a private-relay setting or a captive Wi-Fi portal.</div>' +
    '<div class="err-acts"><button class="sbtn" data-act="retry">' + ic('reset') + 'Try again</button><button class="sbtn ghost" data-act="mock">' + ic('cell') + 'Explore with sample data</button></div></div>';
  ['#rBody', '#mBody'].forEach(function (s) { var el = $(s); if (el) el.innerHTML = html; });
  $('#hStatus').classList.add('err'); $('#hStatusTxt').textContent = 'offline';
}

/* ── events ───────────────────────────────────────────────────────────── */
function byId(id) { return DB.byId.get(String(id)); }
function typing(e) { var t = e.target; return t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)); }
document.addEventListener('click', function (e) {
  var t = e.target, b;
  if (_menu && !t.closest('.menu') && !t.closest('[data-menu]')) closeMenu();
  if ((b = t.closest('[data-cpi]'))) { cpRun(+b.dataset.cpi); return; }
  if (t.id === 'cp') { closeCP(); return; }
  if (t.id === 'kbd') { closeShortcuts(); return; }
  if ((b = t.closest('[data-pin]'))) { e.stopPropagation(); togglePin(byId(b.dataset.pin)); return; }
  if ((b = t.closest('[data-inspect]'))) { var di = byId(b.dataset.inspect); if (di) { select(di, 'card'); if (S.mobile) { S.mInsp = true; renderMobile(); } } return; }
  if ((b = t.closest('[data-mesh]'))) { openMesh(byId(b.dataset.mesh)); return; }
  if ((b = t.closest('[data-sweep]'))) { openSweep(byId(b.dataset.sweep)); return; }
  if ((b = t.closest('[data-untag]'))) { e.stopPropagation(); removeFilter(b.dataset.untag); return; }
  if ((b = t.closest('[data-dom]'))) { setDomain(b.dataset.dom); return; }
  if ((b = t.closest('[data-chip]'))) { toggleChip(b.dataset.chip); return; }
  if ((b = t.closest('[data-perc]'))) { togglePerc(b.dataset.perc); return; }
  if ((b = t.closest('[data-rmrange]'))) { var rk = b.dataset.rmrange; F.rangeKeys = F.rangeKeys.filter(function (x) { return x !== rk; }); var had = !!F.ranges[rk]; delete F.ranges[rk]; buildRangeRows(); if (had) changed('remove ' + mShort(rk), false); else requestRefresh(); return; }
  if ((b = t.closest('[data-addm]'))) { addRangeKey(b.dataset.addm); $$('[data-addin]').forEach(function (i) { i.value = ''; }); renderAddList(''); return; }
  if ((b = t.closest('[data-legend]'))) { if (b.closest('.menu')) closeMenu(); legendClick(b.dataset.legend, e.shiftKey); return; }
  if ((b = t.closest('[data-axis3]'))) { openMenu(b, metricMenuHTML('setax3', b.dataset.axis3, S.ax3[b.dataset.axis3], '3D ' + b.dataset.axis3.toUpperCase() + ' axis · ranked'), { up: true, focus: true }); return; }
  if ((b = t.closest('[data-axis2]'))) { openMenu(b, metricMenuHTML('setax2', b.dataset.axis2, S.ax2[b.dataset.axis2], '2D ' + b.dataset.axis2.toUpperCase() + ' axis'), { up: b.dataset.axis2 === 'x', focus: true, host: S.mobile ? $('#mApp') : document.body }); return; }
  if ((b = t.closest('[data-setax3]'))) { var p3 = b.dataset.setax3.split(':'); closeMenu(); setAxis3(p3[0], p3[1]); return; }
  if ((b = t.closest('[data-setax2]'))) { var p2 = b.dataset.setax2.split(':'); closeMenu(); setAxis2(p2[0], p2[1]); return; }
  if ((b = t.closest('[data-color]'))) { closeMenu(); setColor(b.dataset.color); return; }
  if ((b = t.closest('[data-preset]'))) { closeMenu(); var pp = b.dataset.preset.split('|'); applyPreset(pp[0], pp[1]); return; }
  if ((b = t.closest('[data-pareto]'))) { closeMenu(); setPareto(b.dataset.pareto === 'off' ? null : b.dataset.pareto); return; }
  if ((b = t.closest('[data-sortk]'))) { var k = b.dataset.sortk; S.sort = S.sort.k === k ? { k: k, dir: -S.sort.dir } : { k: k, dir: k === '_name' ? 1 : -1 }; savePrefs(); requestRefresh(); return; }
  if ((b = t.closest('[data-sort]'))) { closeMenu(); var sk = b.dataset.sort.split(':'); S.sort = { k: sk[0], dir: +sk[1] }; savePrefs(); requestRefresh(); return; }
  if ((b = t.closest('[data-view]'))) { setView(b.dataset.view); return; }
  if ((b = t.closest('button[data-hv]'))) { setHv(b.dataset.hv); return; }
  if ((b = t.closest('[data-mhv]'))) { setMhv(b.dataset.mhv); return; }
  if ((b = t.closest('[data-layout]'))) { setLayout(b.dataset.layout); return; }
  if ((b = t.closest('[data-tool]'))) { setTool(b.dataset.tool); return; }
  if ((b = t.closest('[data-tool2]'))) { setTool2(b.dataset.tool2); return; }
  if ((b = t.closest('[data-c]'))) { IV.cells = +b.dataset.c; IV.dirty = true; $$('[data-c]').forEach(function (x) { x.classList.toggle('on', +x.dataset.c === IV.cells); }); return; }
  if ((b = t.closest('.dr-tab'))) { setTab(b.dataset.tab); return; }
  if ((b = t.closest('.card[data-id],tr[data-id]'))) { var dc = byId(b.dataset.id); if (dc) { select(dc, 'card'); if (S.mobile) { S.mInsp = true; renderMobile(); $('#mBody').scrollTop = 0; } } return; }
  if ((b = t.closest('[data-act]'))) act(b.dataset.act, b, e);
});
function act(a, b, e) {
  var d = S.sel;
  switch (a) {
    case 'undo': undo(); break;
    case 'redo': redo(); break;
    case 'filters': S.drawer ? closeDrawer() : openDrawer(S.tab || 'filters'); break;
    case 'dr-close': closeDrawer(); break;
    case 'clear-all': clearAll(); break;
    case 'reset-views': resetViews(); break;
    case 'reset-3d': VIEWS.h3.reset(); break;
    case 'reset-2d': VIEWS.p2.reset(); break;
    case 'alive': setAlive(!S.alive); break;
    case 'more': S.shown += S.mobile ? MOBILE_PAGE : PAGE_SIZE; renderLists(); break;
    case 'compare': openDrawer('compare'); break;
    case 'copy-recipe': copyRecipe(d); break;
    case 'link': copyViewLink(); break;
    case 'download': downloadRecipe(d); break;
    case 'pin': togglePin(d); break;
    case 'queue': if (d) queueMenu(b, [d]); break;
    case 'queue-pins': queueMenu(b, S.pins.slice()); break;
    case 'mesh': if (d) openMesh(d); break;
    case 'lab': if (d) openLab(d); break;
    case 'sweep': if (d) openSweep(d); break;
    case 'aim-sweep': aimSweep(); break;   /* v0.7.0 */
    case 'show-aim': if (b.dataset.aim) { S.aimSel = null; selectAimRun(b.dataset.aim); renderInspector(); } break;   /* v0.7.1 */
    case 'prev': step(-1); break;
    case 'next': step(1); break;
    case 'm-back': S.mInsp = false; renderMobile(); break;
    case 'm-filters': openMFilters(); break;
    case 'm-filters-close': closeMFilters(); break;
    case 'gap': setGap(!S.gap); break;
    case 'pareto': openMenu(b, '<div class="mh">Pareto front</div>' + [['auto', 'Best for ' + DOMAIN_SHORT[F.domain]], ['xlo-yhi', 'Low X · high Y'], ['xhi-yhi', 'High X · high Y'], ['xlo-ylo', 'Low X · low Y'], ['xhi-ylo', 'High X · low Y'], ['off', 'Off']].map(function (o) { return '<button data-pareto="' + o[0] + '" class="' + ((S.pareto || 'off') === o[0] ? 'on' : '') + '">' + esc(o[1]) + '</button>'; }).join(''), { focus: true, host: S.mobile ? $('#mApp') : document.body }); break;
    case 'presets': openMenu(b, '<div class="mh">2D presets · ' + esc(DOMAIN_SHORT[F.domain]) + '</div>' + (AXIS_PRESETS[F.domain] || AXIS_PRESETS.all).concat(F.domain === 'all' ? [] : AXIS_PRESETS.all.slice(0, 1)).filter(function (p) { return hasMetric(p[0]) && hasMetric(p[1]); }).map(function (p) { return '<button data-preset="' + p[0] + '|' + p[1] + '"><span>' + esc(p[2]) + '</span><em>' + esc(mShort(p[0]) + ' × ' + mShort(p[1])) + '</em></button>'; }).join(''), { focus: true, host: S.mobile ? $('#mApp') : document.body }); break;
    case 'legend-more': openMenu(b, '<div class="mh">' + esc($('.colorName').textContent) + '</div><div class="lg-all">' + $$('#legend .lg-it').map(function (k) { var c = k.cloneNode(true); c.style.display = ''; return c.outerHTML; }).join('') + '</div>', { focus: true }); break;
    case 'color': openMenu(b, '<div class="mh">Colour points by</div>' + COLOR_MODE_LIST.map(function (m) { return '<button data-color="' + m.id + '" class="' + (S.color === m.id ? 'on' : '') + '">' + esc(m.label) + '</button>'; }).join(''), { focus: true, host: S.mobile ? $('#mApp') : document.body }); break;
    case 'sort': openMenu(b, '<div class="mh">Sort results</div>' + (F.target ? [['_target:1', 'Closest to the target']] : []).concat([['_score:-1', domainZLabel()], ['_beff:-1', 'Voigt efficiency'], ['volume_fraction:1', 'Lightest first'], ['_emax:-1', 'Stiffest first'], ['anisotropy:1', 'Most isotropic'], ['pore_size_p50_norm:-1', 'Largest pores'], ['keff_max_norm:-1', 'Best conductivity'], ['created_at:-1', 'Newest'], ['_name:1', 'Name']])
      .map(function (o) { return '<button data-sort="' + o[0] + '" class="' + (S.sort.k + ':' + S.sort.dir === o[0] ? 'on' : '') + '">' + esc(o[1]) + '</button>'; }).join(''), { focus: true, host: S.mobile ? $('#mApp') : document.body }); break;
    case 'm-menu': openMenu(b, '<div class="mh">View</div><button data-act="color">Colour points…</button><button data-act="m-presets">2D presets…</button><button data-act="reset-views">Reset views</button><button data-act="alive">' + (S.alive ? 'Stop' : 'Start') + ' ambient motion</button><button data-act="link">Copy a link to this view</button><button data-act="guide">Welcome guide</button>', { host: $('#mApp'), focus: true }); break;
    case 'm-presets': setMhv('2d'); act('presets', b, e); break;
    case 'palette': openCP(); break;
    case 'kbd': showShortcuts(); break;
    case 'guide': openWelcome(); break;   /* v0.9.0 */
    case 'kbd-close': closeShortcuts(); break;
    case 'bio-prompt': openBioPrompt(); break;
    case 'bio-apply': closeBioPrompt('apply'); break;
    case 'bio-skip': closeBioPrompt('skip'); break;
    case 'bio-close': closeBioPrompt('close'); break;
    case 'bt-reset': btReset(); break;
    case 'mock': location.href = location.href.split('#')[0].split('?')[0] + '?mock'; break;
    case 'retry': location.reload(); break;
  }
}
document.addEventListener('input', function (e) {
  var t = e.target;
  if (t.matches('[data-addin]')) renderAddList(t.value);
  else if (t.matches('[data-csearch]')) filterContribs(t);
  else if (t.matches('[data-bt]')) btInput(t.dataset.bt, t.value);
  else if (t.id === 'keyIn') renderKeyPane(t.value);
  else if (t.id === 'cpIn') cpBuild(t.value);
  else if (t.matches('[data-msearch]')) { var q = t.value.trim().toLowerCase(); $$('.menu .mlist button').forEach(function (b) { b.style.display = !q || b.dataset.label.indexOf(q) >= 0 ? '' : 'none'; }); $$('.menu .mlist .mg').forEach(function (g) { g.style.display = q ? 'none' : ''; }); }
});
document.addEventListener('change', function (e) { if (e.target.matches('[data-btmat]')) btMaterial(e.target.value); });
document.addEventListener('mouseover', function (e) {
  var c = e.target.closest && e.target.closest('#rBody [data-id]');
  var d = c ? byId(c.dataset.id) : null;
  if (VIEWS.h3 && VIEWS.h3.hl !== d && !e.target.closest('.hero-cv')) { VIEWS.h3.hl = d; VIEWS.p2.hl = d; VIEWS.h3.dirty = VIEWS.p2.dirty = true; }
  var lg = e.target.closest && e.target.closest('[data-legend]'), fam = lg && S.color === 'family' ? lg.dataset.legend : null;
  if (fam !== S.hiFam) { S.hiFam = fam; markViewsDirty(); }
  var th = e.target.closest && e.target.closest('[data-tipk]');
  var tip = $('#colTip');
  if (th && tip) { var g = mGloss(th.dataset.tipk) || {}; tip.innerHTML = '<b>' + esc(mLabel(th.dataset.tipk)) + '</b>' + esc(g.def || ''); var r = th.getBoundingClientRect(); tip.classList.add('on'); tip.style.left = clamp(r.left, 8, innerWidth - 300) + 'px'; tip.style.top = (r.bottom + 6) + 'px'; }
  else if (tip) tip.classList.remove('on');
});
document.addEventListener('keydown', function (e) {
  var k = e.key, mod = e.ctrlKey || e.metaKey;
  if (CP.open) {
    if (k === 'ArrowDown') { CP.idx = Math.min(CP.items.length - 1, CP.idx + 1); cpDraw(); e.preventDefault(); }
    else if (k === 'ArrowUp') { CP.idx = Math.max(0, CP.idx - 1); cpDraw(); e.preventDefault(); }
    else if (k === 'Enter') { cpRun(CP.idx); e.preventDefault(); }
    else if (k === 'Escape') { closeCP(); e.preventDefault(); }
    else if (k === 'Tab') { e.preventDefault(); $('#cpIn').focus(); }
    return;
  }
  if (mod && k.toLowerCase() === 'k') { e.preventDefault(); openCP(); return; }
  if (mod && !typing(e) && (k.toLowerCase() === 'z' || k.toLowerCase() === 'y')) { e.preventDefault(); if (k.toLowerCase() === 'y' || e.shiftKey) redo(); else undo(); return; }
  if (k === 'Enter' && e.target.closest && e.target.closest('#bioDlg') && e.target.tagName === 'INPUT') { e.preventDefault(); closeBioPrompt('apply'); return; }
  if (k === 'Escape') {
    if (WG.open) closeWelcome(WG.step === 2 ? 'done' : 'skip');   /* v0.9.0 */
    else if ($('#bioDlg').classList.contains('open')) closeBioPrompt('close');
    else if ($('#kbd').classList.contains('open')) closeShortcuts(); else if (_menu) closeMenu();
    else if ($('#mFilters').classList.contains('open')) closeMFilters(); else if (S.drawer) closeDrawer();
    else if (S.tool === 'brush') setTool('orbit'); else if (S.tool2 === 'target') setTool2('box');
    return;
  }
  if (mod || e.altKey || typing(e)) return;
  if (k === 'Enter') { var c = e.target.closest && e.target.closest('.card[data-id],tr[data-id]'); if (c) { var d = byId(c.dataset.id); if (d) select(d, 'card'); e.preventDefault(); } return; }
  if (e.target.closest && e.target.closest('.rth')) return;
  switch (k.toLowerCase()) {
    case '/': e.preventDefault(); openCP(); break;
    case '?': showShortcuts(); break;
    case 'f': S.drawer ? closeDrawer() : openDrawer('filters'); break;
    case 'p': togglePin(S.sel); break;
    case 'b': setTool(S.tool === 'brush' ? 'orbit' : 'brush'); break;
    case 'g': setView('gallery'); break;
    case 't': setView('table'); break;
    case 'r': resetViews(); break;
    case 'arrowright': step(1); e.preventDefault(); break;
    case 'arrowleft': step(-1); e.preventDefault(); break;
  }
});
window.addEventListener('resize', debounce(function () { applySplits(); placeSplits(); renderTags(); renderLegend(); if (S.mobile) setSnap(S.snap); markViewsDirty(); }, 60));
if (window.ResizeObserver) { var _legFit = debounce(renderLegend, 120), _ro = new ResizeObserver(function () { placeSplits(); markViewsDirty(); _legFit(); }); setTimeout(function () { ['#dMain', '#pHero', '#pInsp', '#pRes'].forEach(function (q) { var el = $(q); if (el) _ro.observe(el); }); }, 0); }

/* ── loop ─────────────────────────────────────────────────────────────── */
var _last = 0, _statT = 0, _rippling = false;
function loop(now) {
  requestAnimationFrame(loop);
  try { frameAll(now); } catch (err) { if (!loop.warned) { loop.warned = true; console.error('[F13LD.vault] frame error:', err); } }
}
function frameAll(now) {
  var dt = Math.min(50, now - (_last || now)); _last = now;
  splashTick(now);
  if (!S.ready) return;
  refreshNow();
  var moving = updatePoints(now);
  if (S.mobile) { if (S.mhv === '2d') VIEWS.m2.frame(now); else VIEWS.m3.frame(now, dt, moving); }
  else { if (S.hv !== '2d') VIEWS.h3.frame(now, dt, moving); if (S.hv !== '3d') VIEWS.p2.frame(now); }
  inspectorFrame(now);
  animCount();
  var busy = PV.jobs.size > 0;
  if (busy || _rippling) { $$('[data-mark-live] svg').forEach(function (s) { rippleMark(s, busy ? now / 260 : 0); }); _rippling = busy; }
  var stx = busy ? 'baking previews' : (DB.source === 'mock' ? 'sample data' : 'vault · live'), ste = $('#hStatusTxt'); if (ste.textContent !== stx) ste.textContent = stx;
  if (S.pulseUntil && !S._pulseDone && now > S.pulseUntil) { S._pulseDone = true; markViewsDirty(); }   /* one last calm frame */
  if (now - _statT > 500) { _statT = now; var ps = $('#pvStat'); if (ps) ps.textContent = pvStatText(); var il = $('#iLoading'); if (il) il.style.display = S.sel && PREVIEW_FAMILIES[S.sel.family] && !IV.field && PV.ok ? '' : 'none'; }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
