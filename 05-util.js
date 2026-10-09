/* ============================================================
   F13LD.vault · 05-util.js
   Small helpers shared by every module: DOM lookup, maths, escaping,
   number formatting, safe storage, toasts with an Undo action.
   ============================================================ */

function $(s, root) { return (root || document).querySelector(s); }
function $$(s, root) { return Array.prototype.slice.call((root || document).querySelectorAll(s)); }
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function lerp(a, b, t) { return a + (b - a) * t; }
function isNum(v) { return typeof v === 'number' && isFinite(v); }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function hexRGB(h) { var n = parseInt(String(h).slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function rgbHex(r, g, b) { return '#' + [r, g, b].map(function (v) { return ('0' + Math.round(clamp(v, 0, 255)).toString(16)).slice(-2); }).join(''); }
function ordinal(n) { var s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }
function debounce(fn, ms) { var t = 0; return function () { var a = arguments, self = this; clearTimeout(t); t = setTimeout(function () { fn.apply(self, a); }, ms); }; }
/* shortest signed angle from a to b */
function angDelta(a, b) { var d = (b - a) % (2 * Math.PI); if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI; return d; }

/* Compact numeric formatting that keeps 3–4 significant figures. */
function fmtNum(v) {
  if (!isNum(v)) return '—';
  var a = Math.abs(v);
  if (a === 0) return '0';
  if (a >= 10000) return v.toExponential(2);
  if (a >= 100) return v.toFixed(0);
  if (a >= 10) return v.toFixed(1);
  if (a >= 1) return v.toFixed(2);
  if (a >= 0.01) return v.toFixed(3);
  if (a >= 0.001) return v.toFixed(4);
  return v.toExponential(2);
}

var Store = {
  get: function (k, dflt) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? dflt : v; } catch (e) { return dflt; } },
  set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage blocked — fine */ } }
};

/* Toast — one at a time, optional action button (Undo). */
var _toastT = 0;
function toast(html, action) {
  var t = $('#toast');
  if (!t) return;
  var host = (typeof S !== 'undefined' && S.mobile) ? $('#mApp') : document.body;
  if (t.parentNode !== host) host.appendChild(t);
  t.innerHTML = '<span class="tx">' + html + '</span>' + (action ? '<button class="toast-act" type="button">' + (action.icon ? ic(action.icon) : '') + esc(action.label) + '</button>' : '');
  if (action) t.querySelector('.toast-act').onclick = function () { t.classList.remove('on'); action.run(); };
  t.classList.add('on');
  clearTimeout(_toastT);
  _toastT = setTimeout(function () { t.classList.remove('on'); }, action ? 4200 : 2400);
}

function copyText(txt) {
  try { if (navigator.clipboard) return navigator.clipboard.writeText(txt).then(function () { return true; }, function () { return false; }); } catch (e) { /* fall through */ }
  return Promise.resolve(false);
}
function downloadJSON(obj, name) {
  var blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(function () { URL.revokeObjectURL(a.href); }, 3000);
}
