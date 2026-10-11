/* ============================================================
   F13LD.vault · 13-state.js
   F = what the user asked for (filters, domain, target) — undoable and
     carried in the share link.
   S = how they are looking at it (layout, axes, colour, selection) —
     remembered in this browser, partly carried in the link.
   ============================================================ */

function freshFilters() {
  return { domain: 'all', fam: [], kappa: [], grid: [], flag: [], pois: [], contrib: [], src: [], aim: [], solid: [], void: [],
           ranges: {}, rangeKeys: ['volume_fraction', 'stiffness_density_norm', 'pore_size_p50_norm'],
           region: null, target: null };
}
var F = freshFilters();

var S = {
  layout: 'a', mobile: false, hv: 'split', mhv: '3d', alive: true, color: 'family', tool: 'orbit', tool2: 'box',
  ax3: { x: '_beff', y: 'anisotropy', z: '_score' }, ax2: { x: 'volume_fraction', y: '_emax' },
  sort: { k: '_score', dir: -1 }, view: 'gallery', shown: PAGE_SIZE,
  sel: null, near: [], pins: [], hot: null, hiFam: null, aimSel: null,
  drawer: false, tab: 'filters', pareto: null, gap: false,
  list: [], cnt: 0, cntShown: 0, snap: 'peek', mInsp: false,
  introT0: 0, ready: false
};

/* Preferences that persist between visits. */
var PREF_KEYS = ['layout', 'hv', 'mhv', 'alive', 'color', 'ax3', 'ax2', 'view', 'sort'];
function loadPrefs() {
  var p = Store.get(LS_PREFS, null); if (!p) return;
  PREF_KEYS.forEach(function (k) { if (p[k] != null) S[k] = p[k]; });
}
var savePrefs = debounce(function () { var o = {}; PREF_KEYS.forEach(function (k) { o[k] = S[k]; }); Store.set(LS_PREFS, o); }, 300);

/* ── undo / redo ─────────────────────────────────────────────────────── */
var HIST = { past: [], future: [], cur: null };
function snapF() { return JSON.stringify(F); }
function histInit() { HIST.cur = snapF(); HIST.past = []; HIST.future = []; }
/* Record the current F as a step. Returns true if anything changed. */
function histCommit(label) {
  var s = snapF();
  if (s === HIST.cur) return false;
  HIST.past.push({ snap: HIST.cur, label: label || 'change' });
  if (HIST.past.length > 100) HIST.past.shift();
  HIST.future = []; HIST.cur = s;
  updateHistButtons();
  return true;
}
function histApply(snap) {
  var o = JSON.parse(snap), domWas = F.domain;
  F = Object.assign(freshFilters(), o);
  HIST.cur = snap;
  if (F.domain !== domWas) domainChanged(true);
  rangesChanged();
  requestRefresh();
  updateHistButtons();
  if (typeof shareLinkSoon === 'function') shareLinkSoon();
}
function undo() {
  if (!HIST.past.length) { toast('Nothing to undo'); return; }
  var p = HIST.past.pop(); HIST.future.push({ snap: HIST.cur, label: p.label });
  histApply(p.snap);
  toast('Undid <b>' + esc(p.label) + '</b>', { label: 'Redo', icon: 'redo', run: redo });
}
function redo() {
  if (!HIST.future.length) { toast('Nothing to redo'); return; }
  var n = HIST.future.pop(); HIST.past.push({ snap: HIST.cur, label: n.label });
  histApply(n.snap);
  toast('Redid <b>' + esc(n.label) + '</b>', { label: 'Undo', icon: 'undo', run: undo });
}
function updateHistButtons() {
  $$('[data-act="undo"]').forEach(function (b) { b.disabled = !HIST.past.length; b.title = HIST.past.length ? 'Undo ' + HIST.past[HIST.past.length - 1].label + ' (Ctrl Z)' : 'Nothing to undo'; });
  $$('[data-act="redo"]').forEach(function (b) { b.disabled = !HIST.future.length; b.title = HIST.future.length ? 'Redo ' + HIST.future[HIST.future.length - 1].label + ' (Ctrl Shift Z)' : 'Nothing to redo'; });
}
/* One call for every user filter change: record it, refresh, and offer Undo
   for the changes that are easy to make by accident or hard to redo by hand. */
function changed(label, offerUndo) {
  if (!histCommit(label)) { requestRefresh(); return; }
  requestRefresh();
  shareLinkSoon();
  if (offerUndo) toast(esc(label), { label: 'Undo', icon: 'undo', run: undo });
}

/* ── share link: the view lives in the URL hash ─────────────────────── */
function b64e(s) { try { return btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); } catch (e) { return ''; } }
function b64d(s) { try { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return decodeURIComponent(escape(atob(s))); } catch (e) { return null; } }
function viewState() {
  var f = {}, base = freshFilters();
  Object.keys(F).forEach(function (k) { if (JSON.stringify(F[k]) !== JSON.stringify(base[k])) f[k] = F[k]; });
  return { f: f, s: S.sel ? S.sel._id : null, a3: S.ax3, a2: S.ax2, c: S.color, hv: S.hv, p: S.pins.map(function (d) { return d._id; }) };
}
function shareURL() {
  var u = location.href.split('#')[0];
  if (DB.source === 'mock') u += (u.indexOf('?') < 0 ? '?' : '&') + 'mock';
  return u.replace(/([?&])mock&mock/, '$1mock') + '#v=' + b64e(JSON.stringify(viewState()));
}
var shareLinkSoon = debounce(function () {
  try { history.replaceState(null, '', '#v=' + b64e(JSON.stringify(viewState()))); } catch (e) { /* file:// or sandbox */ }
}, 500);
/* Read a #v= link (after data is loaded). Returns true if one was applied. */
function readShareLink() {
  var m = /#v=([A-Za-z0-9_-]+)/.exec(location.hash || ''); if (!m) return false;
  var j = b64d(m[1]); if (!j) return false;
  var o; try { o = JSON.parse(j); } catch (e) { return false; }
  F = Object.assign(freshFilters(), o.f || {});
  if (o.a3) S.ax3 = o.a3; if (o.a2) S.ax2 = o.a2; if (o.c) S.color = o.c; if (o.hv) S.hv = o.hv;
  S._linkSel = o.s || null; S._linkPins = o.p || [];
  return true;
}
