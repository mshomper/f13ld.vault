/* ============================================================
   F13LD.vault · 80-mobile.js
   Phone layout (≤ 760 px): the design space fills the screen, results live
   in a bottom sheet with three stops (peek · half · full), filters open
   full screen with a live "Show N designs" button. The sheet body is
   padded by however much of it sits below the screen, so the end of the
   list is always reachable.
   ============================================================ */

function sheetH() { var a = $('#mApp'); return a ? a.clientHeight - 64 : 600; }
function sheetY(s) { var H = sheetH(); return s === 'full' ? 0 : s === 'half' ? Math.round(H * 0.46) : H - 128; }
function setSnap(s) {
  S.snap = s; var sh = $('#mSheet'); if (!sh) return;
  var y = sheetY(s); sh.style.transform = 'translateY(' + y + 'px)';
  $('#mBody').style.paddingBottom = (y + 40) + 'px';
  var vis = s === 'full' ? sheetH() : sheetH() - y;
  if (VIEWS.m3) VIEWS.m3.insetT = vis; if (VIEWS.m2) VIEWS.m2.insetT = Math.min(vis, sheetH() - 60);
  markViewsDirty();
}
var _mMoreIO = null;
function renderMobile() {
  var b = $('#mBody'); if (!b || !S.mobile) return;
  var d = S.sel;
  if (d && S.mInsp) {
    var i = S.list.indexOf(d), periodic = PV_PERIODIC[d.family];
    b.innerHTML = '<div class="m-ins"><button class="m-back" data-act="m-back">' + gl('back') + 'All results</button>' +
      '<div class="m-vp"><canvas id="mICv"></canvas><div class="insp-nav"><button class="ibtn" data-act="prev" aria-label="Previous">' + gl('prev') + '</button><button class="ibtn" data-act="next" aria-label="Next">' + gl('next') + '</button></div>' +
      (periodic ? '<div class="seg insp-cells" id="mCells">' + [1, 2, 3].map(function (c) { return '<button data-c="' + c + '" class="' + (IV.cells === c ? 'on' : '') + '">' + c + '</button>'; }).join('') + '<span class="lbl2">cells</span></div>' : '') + '</div>' +
      '<div class="m-ttl"><div><div class="insp-name">' + esc(displayPreset(d)) + '</div><div class="insp-sub"><i class="dot" style="background:' + (CAT_PALETTES.family[d.family] || '#9a9fb7') + '"></i>' + esc(FAMILY_NAME[d.family] || d.family) + ' · ' + (i >= 0 ? (i + 1) + ' of ' + S.cnt : 'outside filters') + '</div></div>' + ringSVG(d, true) + '</div>' +
      '<div class="m-tiles">' + TILE_KEYS.map(function (k) { return tileHTML(d, k); }).join('') + '</div>' +
      '<div class="m-acts"><button class="ibtn' + (S.pins.indexOf(d) >= 0 ? ' on' : '') + '" data-act="pin" aria-label="Pin">' + '<span class="ico">' + ic('pin') + '</span></button><button class="ibtn" data-act="link" aria-label="Copy link"><span class="ico">' + ic('link') + '</span></button><button class="ibtn" data-act="queue" aria-label="Add to queue"><span class="ico">' + ic('queue') + '</span></button><button class="prim" data-act="mesh"><span class="ico">' + ic('mesh') + '</span>Open in Mesh</button></div>' +
      noticesHTML(d) + scoreBreakdownHTML(d) +
      '<div class="m-sec">Nearest in the design space</div><div class="m-near">' + S.near.map(function (n) { return cardHTML(n, { small: true }); }).join('') + '</div>' +
      recipeHTML(d) + provenanceHTML(d) + '</div>';
    bindOrbit($('#mICv')); IV.dirty = true;
    paintThumbs(b);
  } else {
    var L = S.list.slice(0, S.shown);
    b.innerHTML = L.length ? '<div class="m-gal">' + L.map(function (x) { return cardHTML(x, { small: true }); }).join('') + '</div>' + (S.cnt > L.length ? '<div class="m-more" data-act="more">' + (S.cnt - L.length).toLocaleString() + ' more</div>' : '')
                           : '<div class="m-gal">' + emptyStateHTML() + '</div>';
    observeThumbs(b);
    var sentinel = b.querySelector('.m-more');
    if (_mMoreIO) { _mMoreIO.disconnect(); _mMoreIO = null; }
    if (sentinel && 'IntersectionObserver' in window) { _mMoreIO = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { _mMoreIO.disconnect(); _mMoreIO = null; S.shown += MOBILE_PAGE; renderMobile(); } }, { root: b, rootMargin: '300px' }); _mMoreIO.observe(sentinel); }
  }
  var dm = DOMAIN_IDS.indexOf(F.domain) >= 0 ? F.domain : 'all';
  $('#mDomIco').innerHTML = ic(dm); $('#mDomName').textContent = DOMAIN_SHORT[dm];
}
function openMFilters() { $('#mFilters').classList.add('open'); $('#mFilters').inert = false; }
function closeMFilters() { $('#mFilters').classList.remove('open'); $('#mFilters').inert = true; if (S.snap === 'peek') setSnap('half'); }
function setMhv(v) {
  S.mhv = v; savePrefs();
  $$('#mHv [data-mhv]').forEach(function (b) { b.classList.toggle('on', b.dataset.mhv === v); });
  $('#mHero3').style.display = v === '3d' ? '' : 'none'; $('#mHero2').style.display = v === '2d' ? '' : 'none';
  markViewsDirty();
}
(function sheetDrag() {
  var g = null;
  document.addEventListener('pointerdown', function (e) {
    var grab = e.target.closest && e.target.closest('#mGrab'); if (!grab || e.target.closest('button')) return;
    var m = /translateY\((-?[\d.]+)px\)/.exec($('#mSheet').style.transform); g = { id: e.pointerId, y0: e.clientY, t0: m ? +m[1] : 0, t: performance.now(), moved: false, y: m ? +m[1] : 0, v: 0 };
    $('#mSheet').classList.add('drag');
  });
  document.addEventListener('pointermove', function (e) {
    if (!g || e.pointerId !== g.id) return; var app = $('#mApp'), k = app.getBoundingClientRect().height / app.offsetHeight || 1, dy = (e.clientY - g.y0) / k;
    if (Math.abs(dy) > 4) g.moved = true; var y = clamp(g.t0 + dy, 0, sheetH() - 96);
    $('#mSheet').style.transform = 'translateY(' + y + 'px)'; g.v = (y - g.y) / Math.max(1, performance.now() - g.t); g.y = y; g.t = performance.now();
  });
  document.addEventListener('pointercancel', function (e) { if (!g || e.pointerId !== g.id) return; $('#mSheet').classList.remove('drag'); setSnap(S.snap); g = null; });
  document.addEventListener('pointerup', function (e) {
    if (!g || e.pointerId !== g.id) return; $('#mSheet').classList.remove('drag');
    if (!g.moved) { setSnap(S.snap === 'peek' ? 'half' : S.snap === 'half' ? 'full' : 'peek'); g = null; return; }
    var y = g.y, v = g.v, s;
    if (v > 0.6) s = S.snap === 'full' ? 'half' : 'peek'; else if (v < -0.6) s = S.snap === 'peek' ? 'half' : 'full';
    else s = [['full', sheetY('full')], ['half', sheetY('half')], ['peek', sheetY('peek')]].sort(function (a, b) { return Math.abs(a[1] - y) - Math.abs(b[1] - y); })[0][0];
    setSnap(s); g = null;
  });
})();
