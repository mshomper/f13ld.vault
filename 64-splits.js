/* ============================================================
   F13LD.vault · 64-splits.js
   Resizable panels. Three handles sit in the gaps between panels —
   3D | 2D, hero | inspector (or results | right column in layout B), and
   top row | results — plus one on the drawer's top edge. Sizes are saved
   as fractions per layout and re-checked against the window on every
   resize, so a pane never collapses after reloading in a smaller window.
   Double-click a handle to reset it.
   ============================================================ */

var SPL = { a: {}, b: {}, drawer: null };
var SPLIT_MIN = { a: { c0: [380, 300], r0: [220, 180] }, b: { c0: [340, 360], r0: [200, 200] } };

function loadSplits() {
  var o = Store.get(LS_SPLITS, {}) || {};
  SPL.a = o.a || {}; SPL.b = o.b || {}; SPL.drawer = o.drawer || null;
  applySplits();
}
function saveSplits() { Store.set(LS_SPLITS, { a: SPL.a, b: SPL.b, drawer: SPL.drawer }); }
/* fractions → px variables, limited so every pane keeps its minimum */
function applySplits() {
  var main = $('#dMain'), hero = $('#pHero'); if (!main) return;
  var L = S.layout, cfg = SPL[L] || {}, mins = SPLIT_MIN[L], W = main.clientWidth - 28 - 13, H = main.clientHeight - 26 - 13;
  ['c0', 'r0'].forEach(function (k) {
    var name = '--' + L + '-' + k, total = k === 'c0' ? W : H, mn = mins[k];
    if (cfg[k] == null || total < mn[0] + mn[1]) { main.style.removeProperty(name); return; }
    main.style.setProperty(name, Math.round(clamp(cfg[k] * total, mn[0], total - mn[1])) + 'px');
  });
  ['a', 'b'].forEach(function (o) { if (o !== L) { main.style.removeProperty('--' + o + '-c0'); main.style.removeProperty('--' + o + '-r0'); } });
  if (hero) {
    var hw = hero.clientWidth, s3 = cfg.s3d;
    if (s3 == null || hw < 600) hero.style.removeProperty('--s3d'); else hero.style.setProperty('--s3d', Math.round(clamp(s3 * hw, 260, hw - 320)) + 'px');
  }
  var dr = $('#drawer'); if (dr) { if (SPL.drawer) dr.style.setProperty('--drh', Math.round(clamp(SPL.drawer * window.innerHeight, 220, window.innerHeight * 0.8)) + 'px'); else dr.style.removeProperty('--drh'); }
}
function placeSplits() {
  if (S.mobile) return;
  var H = $('#pHero'), I = $('#pInsp'), R = $('#pRes'), v = $('#spV'), h = $('#spH'), s3 = $('#sp3');
  if (!H || !H.offsetWidth) return;
  if (S.layout === 'a') {
    v.style.cssText = 'left:' + (H.offsetLeft + H.offsetWidth) + 'px;top:' + H.offsetTop + 'px;height:' + H.offsetHeight + 'px;width:' + Math.max(12, I.offsetLeft - H.offsetLeft - H.offsetWidth) + 'px';
    h.style.cssText = 'left:' + H.offsetLeft + 'px;top:' + (H.offsetTop + H.offsetHeight) + 'px;width:' + (I.offsetLeft + I.offsetWidth - H.offsetLeft) + 'px;height:' + Math.max(12, R.offsetTop - H.offsetTop - H.offsetHeight) + 'px';
  } else {
    v.style.cssText = 'left:' + (R.offsetLeft + R.offsetWidth) + 'px;top:' + R.offsetTop + 'px;height:' + R.offsetHeight + 'px;width:' + Math.max(12, H.offsetLeft - R.offsetLeft - R.offsetWidth) + 'px';
    h.style.cssText = 'left:' + H.offsetLeft + 'px;top:' + (H.offsetTop + H.offsetHeight) + 'px;width:' + H.offsetWidth + 'px;height:' + Math.max(12, I.offsetTop - H.offsetTop - H.offsetHeight) + 'px';
  }
  var a = $('.hv-3d'); if (s3 && a) s3.style.left = (a.offsetLeft + a.offsetWidth) + 'px';
}
function bindSplit(el, kind) {
  el.addEventListener('pointerdown', function (e) {
    e.preventDefault(); try { el.setPointerCapture(e.pointerId); } catch (x) { /* synthetic */ }
    el.classList.add('drag'); document.body.classList.add('resizing');
    var main = $('#dMain'), mr = main.getBoundingClientRect(), hero = $('#pHero'), hr = hero.getBoundingClientRect(), k = (mr.width / main.offsetWidth) || 1, L = S.layout;
    function mv(ev) {
      if (kind === '3d') { SPL[L].s3d = clamp((ev.clientX - hr.left) / k / hero.clientWidth, 0.2, 0.8); }
      else if (kind === 'drawer') { SPL.drawer = clamp((window.innerHeight - ev.clientY - 52) / window.innerHeight, 0.2, 0.8); }
      else if (kind === 'v') { var W = main.clientWidth - 28 - 13; SPL[L].c0 = clamp(((ev.clientX - mr.left) / k - 14 - 6) / W, 0.1, 0.9); }
      else { var Hh = main.clientHeight - 26 - 13; SPL[L].r0 = clamp(((ev.clientY - mr.top) / k - 13 - 6) / Hh, 0.1, 0.9); }
      applySplits(); placeSplits(); markViewsDirty();
    }
    function up() { el.classList.remove('drag'); document.body.classList.remove('resizing'); el.removeEventListener('pointermove', mv); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up); saveSplits(); renderTags(); renderLegend(); placeSplits(); }
    el.addEventListener('pointermove', mv); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  });
  el.addEventListener('dblclick', function () {
    var L = S.layout;
    if (kind === '3d') delete SPL[L].s3d; else if (kind === 'drawer') SPL.drawer = null; else if (kind === 'v') delete SPL[L].c0; else delete SPL[L].r0;
    saveSplits(); applySplits(); requestAnimationFrame(function () { placeSplits(); renderTags(); markViewsDirty(); });
  });
}
