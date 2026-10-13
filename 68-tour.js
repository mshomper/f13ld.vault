/* ============================================================
   F13LD.vault · 68-tour.js  (v0.10.0)
   The tour: what Vault can do, on the real controls. A lime ring around
   each control, a card that explains it in a sentence or two, and on some
   stops a "try it" that ticks when the user does it (or "Do it").
   Offered from the welcome guide's last step, once to returning users who
   finished the old guide, and any time from the guide button / palette /
   phone menu. Each stop has a desktop and a phone target; a stop with no
   phone target is left out on the phone.
   ============================================================ */

var LS_TOUR = 'f13ld.vault.tour.v1';
var TOUR = { on: false, i: 0, did: {}, steps: [], raf: 0, rect: '', el: null, offer: false };

function tourOfferWanted() { return welcomeDone() && !Store.get(LS_TOUR, false) && !/[#&](v|r|aim)=/.test(location.hash || ''); }

/* Make sure there's a design open in the inspector (the phone shows it in the sheet). */
function tourEnsureDesign() {
  if (!S.sel) { var d = S.list[0] || DB.all[0]; if (d) select(d, 'tour'); }
  if (S.mobile) { if (!S.mInsp) { S.mInsp = true; renderMobile(); } setSnap('full'); }
}
function tourEnsure2D() {
  if (S.mobile) { S.mInsp = false; renderMobile(); setSnap('peek'); setMhv('2d'); }
  else if (S.hv === '3d') setHv('split');
}
/* Phone: back to the results list with the sheet lowered, so the top bar and the plot are in view. */
function tourTop() { if (S.mobile) { if (S.mInsp) { S.mInsp = false; renderMobile(); } setSnap('peek'); } }
function tourShut() { closeMenu(); if (S.drawer) closeDrawer(); if (S.mobile) { closeMFilters(); if ($('#varDlg').classList.contains('open')) closeVarDlg(); } }

var TOUR_STEPS = [
  { id: 'read', ic: 'cell', t: 'Read a design', d: '#pInsp', m: '#mBody .m-vp',
    pre: function () { tourShut(); tourEnsureDesign(); },
    p: 'Every design opens here: its geometry, its key numbers and the <b>score breakdown</b> — why it ranks where it does for your domain.',
    pm: 'Every design opens here: its geometry, its key numbers and, further down, the <b>score breakdown</b> — why it ranks where it does.',
    tr: { k: 'select', tx: 'Pick another design — a card, or a point in the design space', txm: 'Tap the arrows to step to the next design', dn: 'Opened' } },
  { id: 'pin', ic: 'pin', t: 'Pin the ones you like', d: '#iPin', m: '#mBody .m-acts [data-act="pin"]',
    pre: function () { tourShut(); tourEnsureDesign(); },
    p: 'Pinning keeps a design to compare against others — up to four. <b>P</b> pins the open design.',
    pm: 'Pinning keeps a design to compare against others — up to four.',
    tr: { k: 'pin', tx: 'Pin this design', dn: 'Pinned', act: function () { if (S.sel && S.pins.indexOf(S.sel) < 0) togglePin(S.sel); } } },
  { id: 'compare', ic: 'compare', t: 'Compare side by side', d: '#dCompare', m: null,
    pre: function () { closeMenu(); openDrawer('compare'); },
    p: 'Pinned designs line up here, metric by metric, with their geometry. <b>Lime</b> marks the best of the set for your domain.' },
  { id: 'filters', ic: 'filters', t: 'Narrow it down', d: '#dFilters', m: '#mFB',
    pre: function () { closeMenu(); if (S.mobile) { if ($('#varDlg').classList.contains('open')) closeVarDlg(); openMFilters(); } else openDrawer('filters'); },
    p: 'The domain re-ranks everything. Below it: families, connectivity, and a <b>range on any metric</b> with its histogram. A design you expected but can’t see? Its card says which filter hides it.' },
  { id: 'build', ic: 'target', t: 'Your build, any time', d: '#dTarget', m: null,
    pre: function () { closeMenu(); openDrawer('target'); },
    p: 'The material, cell size and load you set at the start. Change them here and every pore size, strain and score follows.' },
  { id: 'vars', ic: 'vars', t: 'Make your own metric', d: '#dVars', m: '[data-act="m-menu"]',
    pre: function () { closeMenu(); if (S.mobile) { closeMFilters(); tourTop(); } else openDrawer('vars'); },
    p: 'Combine any metric into a <b>variable</b> — a ratio, a per-material measure, your own score. It then works everywhere a metric does: axes, colour, sort, filters, Compare.',
    pm: 'Your own metrics — <b>variables</b> — live under this menu, and <b>New variable…</b> sits at the top of every metric menu. A variable works everywhere a metric does.' },
  { id: 'axes', ic: 'view2d', t: 'Plot anything against anything', d: '#pHero .hv-2d [data-axis2="y"]', m: '#mHero2 [data-axis2="y"]',
    pre: function () { tourShut(); tourEnsure2D(); },
    p: 'Tap an axis to put any metric — or one of your variables — on it. <b>New variable…</b> is at the top of every metric menu, and saves straight onto that axis.',
    tr: { k: 'newvar', tx: 'Tap the Y axis, then New variable…', dn: 'That’s the builder — your variable can go straight onto this axis' } },
  { id: 'gap', ic: 'gap', t: 'Find the holes', d: '#pHero .hv-2d [data-act="gap"]', m: '#mTools2 [data-act="gap"]',
    pre: function () { tourShut(); tourEnsure2D(); },
    p: 'The <b>gap map</b> shades where the Vault has designs on this plot, and outlines the <b>holes</b> inside the cloud — space nobody has explored yet. Click a hole to drop a target there.',
    pm: 'The <b>gap map</b> shades where the Vault has designs on this plot, and outlines the <b>holes</b> inside the cloud — space nobody has explored yet. Tap a hole to drop a target there.',
    tr: { k: 'gap', tx: 'Turn on the gap map', dn: 'Blue = designs · dashed outlines = holes', act: function () { setGap(true); } } },
  { id: 'aim', ic: 'sweep', t: 'Aim Sweep at a gap', d: '#pHero .hv-2d [data-tool2="target"]', m: '#mTools2 [data-act="m-target"]',
    pre: function () { tourShut(); tourEnsure2D(); },
    p: 'Pick <b>Target</b> and click inside a gap. Designs rank by how close they come, and <b>Aim Sweep</b> in the banner opens F13LD.sweep seeded from the designs that can reach it — new designs to fill the hole.',
    pm: 'Turn on <b>Target</b> here, then tap inside a gap. Designs rank by how close they come, and <b>Aim Sweep</b> in the banner opens F13LD.sweep seeded from the designs that can reach it.',
    tr: { k: 'target', tx: 'Pick Target, then click the plot', txm: 'Turn on Target, then tap the plot', dn: 'Target set — Aim Sweep is in the banner', act: function () { setTool2('target'); toast(S.mobile ? 'Tap the 2D plot to drop the target' : 'Click the 2D plot to drop the target'); } } },
  { id: 'further', ic: 'mesh', t: 'Take a design further', d: '#dApp .hpills', m: '#mBody .m-acts',
    pre: function () { tourShut(); tourEnsureDesign(); },
    p: 'Every design carries its <b>recipe</b>, so it opens in the rest of F13LD:',
    acts: [['mesh', 'Mesh', 'a watertight, print-ready 3MF at your cell size'], ['lab', 'Lab', 'a full solve to verify stiffness, yield and buckling'], ['sweep', 'Sweep', 'explore around it, or aim at a target (inspector)'], ['queue', 'Queue', 'collect designs across devices with a word-pair code'], ['download', 'Download', 'the recipe file, for any F13LD tool (inspector)']],
    actsm: [['mesh', 'Mesh', 'a watertight, print-ready 3MF at your cell size'], ['queue', 'Queue', 'collect designs across devices with a word-pair code'], ['link', 'Link', 'a link to this exact view, to share']] },
  { id: 'done', ic: 'guide', t: 'That’s the tour', d: '[data-act="guide"]', m: '[data-act="m-menu"]',
    pre: function () { tourShut(); tourTop(); },
    p: 'Reopen the tour or the welcome guide from here. <b>Ctrl K</b> searches designs, metrics and actions.',
    pm: 'The tour, the welcome guide and your variables are in this menu.' }
];

function startTour() {
  if (!DB.N) return;
  if (typeof WG !== 'undefined' && WG.open) closeWelcome('tour');
  closeMenu(); TOUR.offer = false;
  TOUR.steps = TOUR_STEPS.filter(function (s) { return S.mobile ? !!s.m : !!s.d; });
  TOUR.on = true; TOUR.i = 0; TOUR.did = {};
  if (!Store.get(LS_TOUR, false)) Store.set(LS_TOUR, 'started');
  tourShow();
  if (!TOUR.raf) TOUR.raf = requestAnimationFrame(tourTick);
}
function endTour(finished) {
  if (!TOUR.on && !TOUR.offer) return;
  var wasTour = TOUR.on;
  TOUR.on = false; TOUR.offer = false; TOUR.el = null; TOUR.alt = null; document.body.classList.remove('tour-aim');
  $('#tourRing').hidden = true; $('#tourCard').hidden = true; $('#tourCard').innerHTML = '';
  if (!wasTour) return;
  Store.set(LS_TOUR, 'done');
  tourShut(); if (S.mobile) { S.mInsp = false; renderMobile(); setSnap('half'); }
  if (S.tool2 === 'target' && !F.target) setTool2('box');   /* the aiming stop's Target tool, never used */
  if (S.spot) setSpot(null);
  toast(finished ? 'Tour finished · reopen it from the guide' : 'Tour closed · reopen it from the guide');
}
/* Once, for people who finished the old guide: a small card, no ring. */
function offerTour() {
  TOUR.offer = true;
  var c = $('#tourCard');
  c.innerHTML = '<div class="tc-h">' + ic('tour') + '<b>New: a tour of Vault</b></div><p>Three minutes on the real controls — pinning and comparing, filters, your own variables, the gap map and aiming Sweep, and where a design goes next.</p>' +
    '<div class="tc-f"><button class="sbtn ghost" data-tour="later">Not now</button><span class="tc-sp"></span><button class="sbtn" data-tour="start">' + ic('tour') + 'Show me around</button></div>';
  c.hidden = false; c.classList.add('offer'); tourPlaceCard(null);
}

function tourStep() { return TOUR.steps[TOUR.i]; }
function tourTarget(st) {
  var alt = TOUR.alt && $(TOUR.alt);   /* a try-it can move the ring to what it produced (the Aim Sweep banner) */
  if (alt && alt.getClientRects().length) return alt;
  var sel = S.mobile ? st.m : st.d, el = sel ? $(sel) : null;
  if (el && !el.getClientRects().length) el = null;   /* hidden at this size */
  return el;
}
/* Phone: scroll only the results sheet to the control — scrollIntoView would also scroll the fixed app frame. */
function tourBring(el) {
  var mb = el && S.mobile && el.closest('#mBody');
  if (mb) mb.scrollTop += el.getBoundingClientRect().top - mb.getBoundingClientRect().top - 8;
  return el;
}
function tourShow() {
  var st = tourStep(); if (!st) return;
  TOUR.el = null; TOUR.rect = ''; TOUR.alt = null;
  document.body.classList.toggle('tour-aim', st.id === 'aim');   /* phone: the Aim Sweep banner sits above the card on this stop only */
  $('#tourRing').hidden = true;
  if (st.pre) st.pre();
  tourCard();
  setTimeout(function () {
    if (!TOUR.on || tourStep() !== st) return;
    TOUR.el = tourBring(tourTarget(st)); TOUR.rect = '';
  }, st.pre ? 340 : 20);
}
function tourCard() {
  var st = tourStep(), c = $('#tourCard'), n = TOUR.steps.length, m = S.mobile, tr = st.tr, did = tr && TOUR.did[tr.k];
  var acts = (m && st.actsm) || st.acts;
  c.classList.remove('offer');
  c.innerHTML = '<div class="tc-h">' + ic(st.ic) + '<b>' + esc(st.t) + '</b><span class="tc-of">' + (TOUR.i + 1) + ' of ' + n + '</span></div>' +
    '<p>' + ((m && st.pm) || st.p) + '</p>' +
    (acts ? '<ul class="tc-acts">' + acts.map(function (a) { return '<li>' + ic(a[0]) + '<span><b>' + esc(a[1]) + '</b> · ' + esc(a[2]) + '</span></li>'; }).join('') + '</ul>' : '') +
    (tr ? '<div class="tc-try' + (did ? ' done' : '') + '">' + (did ? gl('tick') : gl('next')) + '<span>' + esc(did ? tr.dn : 'Try it: ' + ((m && tr.txm) || tr.tx)) + '</span>' + (tr.act && !did ? '<button data-tour="do">Do it</button>' : '') + '</div>' : '') +
    '<div class="tc-dots">' + TOUR.steps.map(function (_, k) { return '<i class="' + (k < TOUR.i ? 'done' : k === TOUR.i ? 'on' : '') + '"></i>'; }).join('') + '</div>' +
    '<div class="tc-f"><button class="sbtn ghost" data-tour="end">End tour</button><span class="tc-sp"></span>' + (TOUR.i ? '<button class="sbtn ghost" data-tour="back">Back</button>' : '') +
    '<button class="sbtn" data-tour="next">' + (TOUR.i === n - 1 ? gl('tick') + 'Finish' : 'Next' + gl('next')) + '</button></div>';
  c.hidden = false;
  tourPlaceCard(TOUR.el);
}
/* A try-it was done: tick it (the card only — the step's setup doesn't run again). */
function tourEvent(k) {
  if (!TOUR.on) return; var st = tourStep();
  if (st && st.tr && st.tr.k === k && !TOUR.did[k]) {
    TOUR.did[k] = 1; tourCard();
    if (k === 'target') setTimeout(function () { if (!TOUR.on || tourStep() !== st) return; TOUR.alt = '.t-banner'; var b = $('.t-banner'); if (b) { TOUR.el = b; TOUR.rect = ''; } }, 120);   /* point at Aim Sweep */
  }
}

/* Follow the target every frame (panels resize, sheets slide, the drawer opens). */
function tourTick() {
  TOUR.raf = 0;
  if (!TOUR.on && !TOUR.offer) return;
  if (TOUR.on) {
    var st = tourStep();
    if (st && TOUR.el && !TOUR.el.isConnected) { var el = tourTarget(st); if (el) TOUR.el = tourBring(el); }   /* the list re-rendered: find the control again and bring it back up */
    var ring = $('#tourRing'), e = TOUR.el;
    var cov = false;
    if (e && S.mobile && document.elementFromPoint && e.isConnected && e.getClientRects().length) { var rc = e.getBoundingClientRect(), hit = document.elementFromPoint(rc.left + rc.width / 2, rc.top + Math.min(rc.height / 2, 20)); cov = !!hit && !e.contains(hit) && !hit.contains(e) && !hit.closest('#tourRing,#tourCard'); }
    if (e && !cov && e.isConnected && e.getClientRects().length) {
      var r = e.getBoundingClientRect(), pad = 6, vh = innerHeight, vw = innerWidth;
      var top = Math.max(4, r.top - pad), left = Math.max(4, r.left - pad), bot = Math.min(vh - 4, r.bottom + pad), right = Math.min(vw - 4, r.right + pad);
      if (S.mobile) bot = Math.min(bot, vh - $('#tourCard').offsetHeight - 22);   /* never under the card */
      var key = [top, left, bot, right].map(Math.round).join(',');
      if (bot - top > 8 && right - left > 8) {
        if (key !== TOUR.rect) { TOUR.rect = key; ring.style.top = top + 'px'; ring.style.left = left + 'px'; ring.style.width = (right - left) + 'px'; ring.style.height = (bot - top) + 'px'; ring.hidden = false; tourPlaceCard(e); }
      } else { ring.hidden = true; TOUR.rect = ''; }
    } else { if (!ring.hidden) { ring.hidden = true; tourPlaceCard(null); } TOUR.rect = ''; }   /* forget the last box, so the ring comes back when the control does */
  }
  TOUR.raf = requestAnimationFrame(tourTick);
}
/* Desktop: beside the target (right, left, below, above). Phone: a sheet at the bottom. */
function tourPlaceCard(el) {
  var c = $('#tourCard'); if (c.hidden) return;
  if (S.mobile) { c.style.left = ''; c.style.top = ''; c.classList.add('sheet'); return; }
  c.classList.remove('sheet');
  var cw = c.offsetWidth, ch = c.offsetHeight, g = 14, vw = innerWidth, vh = innerHeight, x, y;
  if (!el) { x = vw - cw - 18; y = vh - ch - 70; }
  else {
    var r = el.getBoundingClientRect();
    if (r.right + g + cw < vw - 10) { x = r.right + g; y = r.top; }
    else if (r.left - g - cw > 10) { x = r.left - g - cw; y = r.top; }
    else if (r.bottom + g + ch < vh - 10) { x = r.left; y = r.bottom + g; }
    else if (r.top - g - ch > 10) { x = r.left; y = r.top - g - ch; }
    else { x = vw - cw - 18; y = 70; }
  }
  c.style.left = clamp(x, 10, Math.max(10, vw - cw - 10)) + 'px'; c.style.top = clamp(y, 10, Math.max(10, vh - ch - 10)) + 'px';
}

document.addEventListener('click', function (e) {
  var b = e.target.closest && e.target.closest('[data-tour]'); if (!b) return;
  var a = b.dataset.tour, n = TOUR.steps.length;
  if (a === 'start') { $('#tourCard').hidden = true; startTour(); }
  else if (a === 'later') { Store.set(LS_TOUR, 'later'); endTour(); toast('The tour waits behind the guide button'); }
  else if (a === 'end') endTour(false);
  else if (a === 'next') { if (TOUR.i >= n - 1) endTour(true); else { TOUR.i++; tourShow(); } }
  else if (a === 'back') { if (TOUR.i > 0) { TOUR.i--; tourShow(); } }
  else if (a === 'do') { var st = tourStep(); if (st && st.tr && st.tr.act) st.tr.act(); }
});
addEventListener('resize', function () { if (TOUR.on || TOUR.offer) { TOUR.rect = ''; tourPlaceCard(TOUR.el); } });

/* The guide button: the tour, or the welcome guide again. */
function guideMenu(b) {
  openMenu(b, '<div class="mh">Guide</div><button data-act="tour">' + ic('tour') + 'Tour · what Vault can do</button><button data-act="welcome">' + ic('guide') + 'Welcome guide again</button>', { focus: true, host: S.mobile ? $('#mApp') : document.body });
}
