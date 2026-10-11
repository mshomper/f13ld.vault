/* ============================================================
   F13LD.vault · 02-icons.js
   Drawn icons (brand style, as F13LD.lab / F13LD.sweep): 40 × 40 grid,
   round caps, 2.6 strokes, a neon accent node (.acc). Small 16 × 16
   glyphs for buttons. No text glyphs or emoji anywhere in the UI.
   ============================================================ */

var SV = ' fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"';
var ST = ' fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"';
var ICONS = {
  queue:   '<rect x="8" y="5" width="24" height="8" rx="2.5"' + SV + ' opacity=".45"/><rect x="8" y="16" width="24" height="8" rx="2.5"' + SV + ' opacity=".75"/><rect x="8" y="27" width="24" height="8" rx="2.5"' + SV + '/><circle class="acc" cx="27" cy="31" r="2.6"/>',
  mesh:    '<path d="M20 4L34 12V28L20 36L6 28V12Z"' + SV + '/><path d="M6 12L20 20L34 12M20 20V36M6 28L20 20L34 28"' + SV + ' stroke-width="1.6" opacity=".55"/><circle class="acc" cx="20" cy="20" r="3.2"/>',
  lab:     '<path d="M15 5H25M17 5V15L8 31.5A2.5 2.5 0 0 0 10.2 35H29.8A2.5 2.5 0 0 0 32 31.5L23 15V5"' + SV + '/><path d="M12 26H28"' + SV + ' opacity=".5"/><circle class="acc" cx="21" cy="30" r="2.8"/>',
  sweep:   '<path d="M7 33 L14 6 M7 33 L25 7 M7 33 L33 14"' + SV + '/><path d="M7 33 L35 25"' + SV + ' opacity=".45"/><circle cx="7" cy="33" r="2.6" fill="currentColor"/><circle class="acc" cx="25" cy="7" r="3.3"/>',
  filters: '<path d="M5 11H9.5M18.5 11H35M5 29H21.5M30.5 29H35"' + SV + '/><circle cx="14" cy="11" r="4.5"' + SV + '/><circle class="acc" cx="26" cy="29" r="4"/>',
  target:  '<circle cx="20" cy="20" r="12.5"' + SV + '/><path d="M20 3V10M20 30V37M3 20H10M30 20H37"' + SV + '/><circle class="acc" cx="20" cy="20" r="3.4"/>',
  compare: '<path d="M14 5L23 10V20L14 25L5 20V10Z"' + SV + '/><path d="M26 15L35 20V30L26 35L17 30V20Z"' + SV + ' opacity=".65"/><circle class="acc" cx="26" cy="25" r="3"/>',
  key:     '<path d="M5 6H12V13H5Z M5 28H12V35H5Z"' + SV + ' opacity=".75"/><path d="M17 9.5H35M17 20.5H31M17 31.5H35"' + SV + ' opacity=".8"/><path d="M5 17H12V24H5Z"' + SV + '/><circle class="acc" cx="8.5" cy="20.5" r="2.4"/>',
  cell:    '<path d="M20 4L34 12V28L20 36L6 28V12Z"' + SV + '/><path d="M20 12L27 16V24L20 28L13 24V16Z"' + SV + ' stroke-width="2" opacity=".55"/><circle class="acc" cx="20" cy="20" r="3.2"/>',
  search:  '<circle cx="17" cy="17" r="10.5"' + SV + '/><path d="M25 25L34 34"' + SV + '/>',
  orbit:   '<ellipse cx="20" cy="20" rx="15" ry="7"' + SV + '/><path d="M29 10.5L34.5 12.5L32 17.5"' + SV + '/><circle class="acc" cx="20" cy="20" r="3.4"/>',
  brush:   '<path d="M6 6H34V34H6Z"' + SV + ' stroke-dasharray="3.5 4.5"/><circle class="acc" cx="20" cy="20" r="3.6"/>',
  reset:   '<path d="M9.5 13A13 13 0 1 1 7 21"' + SV + '/><path d="M8 5V13H16"' + SV + '/><circle class="acc" cx="20" cy="20" r="3"/>',
  alive:   '<path d="M3 21H11L15 10L21 31L26 16L29 21H37"' + SV + '/><circle class="acc" cx="15" cy="10" r="2.6"/>',
  pin:     '<path d="M20 4A8 8 0 0 1 28 12C28 17 24.5 19 24.5 23H15.5C15.5 19 12 17 12 12A8 8 0 0 1 20 4Z"' + SV + '/><path d="M13 23H27M20 23V36"' + SV + '/><circle class="acc" cx="20" cy="12" r="2.8"/>',
  link:    '<path d="M17 23L23 17"' + SV + '/><path d="M21.5 11.5L25 8A6 6 0 0 1 32 16L28.5 19.5M18.5 28.5L15 32A6 6 0 0 1 8 24L11.5 20.5"' + SV + '/><circle class="acc" cx="20" cy="20" r="2.4"/>',
  download:'<path d="M20 5V24M12.5 16.5L20 24L27.5 16.5"' + SV + '/><path d="M6 30V34H34V30"' + SV + ' opacity=".7"/><circle class="acc" cx="20" cy="24" r="2.6"/>',
  undo:    '<path d="M14 9L7 16L14 23"' + SV + '/><path d="M7 16H24A9 9 0 0 1 24 34H15"' + SV + '/><circle class="acc" cx="15" cy="34" r="2.6"/>',
  redo:    '<path d="M26 9L33 16L26 23"' + SV + '/><path d="M33 16H16A9 9 0 0 0 16 34H25"' + SV + '/><circle class="acc" cx="25" cy="34" r="2.6"/>',
  pareto:  '<path d="M6 34V6M6 34H34"' + SV + ' opacity=".55"/><path d="M9 9C13 10 15 13 18 17S25 26 32 30"' + SV + '/><circle cx="12" cy="10" r="2.2" fill="currentColor"/><circle cx="21" cy="21" r="2.2" fill="currentColor"/><circle class="acc" cx="30" cy="29" r="3"/>',
  gap:     '<path d="M6 34V6M6 34H34"' + SV + ' opacity=".55"/><circle cx="13" cy="26" r="2" fill="currentColor"/><circle cx="17" cy="29" r="2" fill="currentColor"/><circle cx="27" cy="12" r="2" fill="currentColor"/><circle cx="31" cy="16" r="2" fill="currentColor"/><circle cx="22" cy="19" r="5.5"' + SV + ' stroke-dasharray="2.5 3"/><circle class="acc" cx="22" cy="19" r="2.2"/>',
  presets: '<rect x="5" y="5" width="13" height="13" rx="3"' + SV + '/><rect x="22" y="5" width="13" height="13" rx="3"' + SV + ' opacity=".55"/><rect x="5" y="22" width="13" height="13" rx="3"' + SV + ' opacity=".55"/><path d="M24 33L28 25L33 30"' + SV + '/><circle class="acc" cx="11.5" cy="11.5" r="2.6"/>',
  flag:    '<path d="M9 36V5"' + SV + '/><path d="M9 6H30L25 13.5L30 21H9" fill="currentColor" fill-opacity=".18"' + SV.replace(' fill="none"', '') + '/><circle class="acc" cx="9" cy="36" r="2.4"/>',
  view3d:  '<path d="M20 5L34 12.5V27.5L20 35L6 27.5V12.5Z"' + SV + '/><path d="M6 12.5L20 20L34 12.5M20 20V35"' + SV + ' opacity=".6"/><circle class="acc" cx="20" cy="20" r="3"/>',
  view2d:  '<path d="M6 34V6M6 34H34"' + SV + '/><circle cx="14" cy="24" r="2.4" fill="currentColor"/><circle cx="21" cy="17" r="2.4" fill="currentColor"/><circle class="acc" cx="29" cy="11" r="3"/>',
  split:   '<rect x="4" y="7" width="32" height="26" rx="4"' + SV + '/><path d="M20 7V33"' + SV + '/><circle class="acc" cx="20" cy="20" r="3"/>',
  all:     '<rect x="6" y="6" width="11" height="11" rx="2.5"' + SV + '/><rect x="23" y="6" width="11" height="11" rx="2.5"' + SV + '/><rect x="6" y="23" width="11" height="11" rx="2.5"' + SV + '/><rect x="23" y="23" width="11" height="11" rx="2.5"' + SV + ' opacity=".55"/><circle class="acc" cx="28.5" cy="28.5" r="2.6"/>',
  biomedical: '<path d="M12 8H28A4 4 0 0 1 32 12V15A4 4 0 0 1 28 19H12A4 4 0 0 1 8 15V12A4 4 0 0 1 12 8Z"' + SV + '/><path d="M14 19V24M26 19V24M10 27H30"' + SV + ' opacity=".7"/><path d="M20 27V35"' + SV + '/><circle class="acc" cx="20" cy="13.5" r="2.6"/>',
  aerospace:  '<path d="M4 22C10 14 24 13 36 18C26 20.5 14 22 4 22Z"' + SV + '/><path d="M8 29H32"' + SV + ' opacity=".5"/><circle class="acc" cx="15" cy="18.5" r="2.4"/>',
  automotive: '<circle cx="20" cy="20" r="14"' + SV + '/><circle cx="20" cy="20" r="5"' + SV + '/><path d="M20 6V15M20 25V34M6 20H15M25 20H34"' + SV + ' opacity=".55"/><circle class="acc" cx="20" cy="20" r="2.2"/>',
  oilgas:     '<path d="M20 4C14 13 9 19 9 25A11 11 0 0 0 31 25C31 19 26 13 20 4Z"' + SV + '/><path d="M15 26A5 5 0 0 0 20 31"' + SV + ' opacity=".6"/><circle class="acc" cx="24" cy="22" r="2.4"/>',
  thermal:    '<path d="M8 34V13M16 34V8M24 34V13M32 34V8"' + SV + '/><path d="M5 34H35"' + SV + ' opacity=".55"/><circle class="acc" cx="16" cy="8" r="2.8"/>',
  spread:     '<circle cx="20" cy="20" r="5"' + SV + '/><path d="M20 6V10M20 30V34M6 20H10M30 20H34M10.1 10.1L12.9 12.9M27.1 27.1L29.9 29.9M10.1 29.9L12.9 27.1M27.1 12.9L29.9 10.1"' + SV + ' opacity=".6"/><circle class="acc" cx="20" cy="20" r="2.2"/>',   /* v0.9.0 heat spreading */
  noPreview:  '<path d="M20 4L34 12V28L20 36L6 28V12Z"' + SV + ' stroke-dasharray="3 4"/><circle class="acc" cx="20" cy="20" r="3"/>',
  vault:      '<ellipse cx="20" cy="10" rx="13" ry="4.5"' + SV + '/><path d="M7 10V30A13 4.5 0 0 0 33 30V10"' + SV + '/><path d="M7 20A13 4.5 0 0 0 33 20"' + SV + ' opacity=".5"/><circle class="acc" cx="20" cy="27" r="3"/>',
  trends:     '<rect x="6" y="6" width="8" height="8" rx="1.5"' + SV + '/><rect x="16" y="6" width="8" height="8" rx="1.5"' + SV + ' opacity=".5"/><rect x="26" y="6" width="8" height="8" rx="1.5"' + SV + ' opacity=".3"/><rect x="6" y="16" width="8" height="8" rx="1.5"' + SV + ' opacity=".5"/><rect x="16" y="16" width="8" height="8" rx="1.5"' + SV + '/><rect x="26" y="16" width="8" height="8" rx="1.5"' + SV + ' opacity=".5"/><rect x="6" y="26" width="8" height="8" rx="1.5"' + SV + ' opacity=".3"/><rect x="16" y="26" width="8" height="8" rx="1.5"' + SV + ' opacity=".5"/><circle class="acc" cx="30" cy="30" r="3.2"/>',   /* v0.9.0 correlation map */
  guide:      '<circle cx="20" cy="20" r="15"' + SV + '/><path d="M15 16A5 5 0 1 1 22.5 20.3C21 21.2 20 22.3 20 24.5"' + SV + '/><circle class="acc" cx="20" cy="30" r="2.4"/>',
  keyboard:   '<rect x="4" y="10" width="32" height="20" rx="3"' + SV + '/><path d="M10 16H11M16 16H17M22 16H23M28 16H29M10 22H11M28 22H29M15 24H25"' + SV + '/><circle class="acc" cx="20" cy="17" r="1.8"/>'
};
var GLY = {
  x:       '<path d="M4.5 4.5L11.5 11.5M11.5 4.5L4.5 11.5"' + ST + '/>',
  target:  '<circle cx="8" cy="8" r="4.6"' + ST + '/><path d="M8 1.5V4M8 12V14.5M1.5 8H4M12 8H14.5"' + ST + '/>',   /* v0.7.1 */
  chev:    '<path d="M4.5 6.2L8 9.7L11.5 6.2"' + ST + '/>',
  next:    '<path d="M6.2 4.5L9.7 8L6.2 11.5"' + ST + '/>',
  prev:    '<path d="M9.8 4.5L6.3 8L9.8 11.5"' + ST + '/>',
  back:    '<path d="M10 3.5L5.5 8L10 12.5"' + ST + '/>',
  search:  '<circle cx="7" cy="7" r="4.6"' + ST + '/><path d="M10.5 10.5L14 14"' + ST + '/>',
  pin:     '<path d="M8 1.8A3.6 3.6 0 0 1 11.6 5.4C11.6 7.4 10 8.4 10 10.2H6C6 8.4 4.4 7.4 4.4 5.4A3.6 3.6 0 0 1 8 1.8Z"' + ST + '/><path d="M8 10.2V14.4"' + ST + '/>',
  flag:    '<path d="M3.5 14.5V2"' + ST + '/><path d="M3.5 2.6H12.2L10.2 5.6L12.2 8.6H3.5" fill="currentColor" fill-opacity=".22" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>',
  gallery: '<rect x="2.5" y="2.5" width="4.6" height="4.6" rx="1"' + ST + '/><rect x="8.9" y="2.5" width="4.6" height="4.6" rx="1"' + ST + '/><rect x="2.5" y="8.9" width="4.6" height="4.6" rx="1"' + ST + '/><rect x="8.9" y="8.9" width="4.6" height="4.6" rx="1"' + ST + '/>',
  table:   '<path d="M2.5 4H13.5M2.5 8H13.5M2.5 12H13.5"' + ST + '/>',
  sort:    '<path d="M5 3V13M2.5 10.5L5 13L7.5 10.5M11 13V3M8.5 5.5L11 3L13.5 5.5"' + ST + '/>',
  up:      '<path d="M8 13V3.5M4.6 6.9L8 3.5L11.4 6.9"' + ST + '/>',
  dn:      '<path d="M8 3V12.5M4.6 9.1L8 12.5L11.4 9.1"' + ST + '/>',
  tick:    '<path d="M3.5 8.4L6.7 11.5L12.5 4.8"' + ST + '/>',
  plus:    '<path d="M8 3V13M3 8H13"' + ST + '/>',
  copy:    '<path d="M5.5 5.5H12.5V13H5.5Z"' + ST + '/><path d="M3.5 10.5V3H10"' + ST + '/>',
  dot:     '<circle cx="8" cy="8" r="2.6" fill="currentColor"/>'
};
function ic(n) { return '<svg class="ic" viewBox="0 0 40 40" aria-hidden="true">' + (ICONS[n] || ICONS.cell) + '</svg>'; }
function gl(n) { return '<svg class="gl" viewBox="0 0 16 16" aria-hidden="true">' + (GLY[n] || '') + '</svg>'; }

/* F13LD master mark — never recoloured or rotated. The status chip ripples
   its waves while the Vault is busy (F13LD.lab's "Field" status). */
var _markN = 0;
function markSVG() {
  var c = 'vmk' + (_markN++);
  return '<svg viewBox="0 0 100 100" style="width:100%;height:100%;display:block" aria-hidden="true"><defs><clipPath id="' + c + '"><path d="M50,5 C91,5 95,9 95,50 C95,91 91,95 50,95 C9,95 5,91 5,50 C5,9 9,5 50,5Z"/></clipPath></defs>' +
    '<path d="M50,5 C91,5 95,9 95,50 C95,91 91,95 50,95 C9,95 5,91 5,50 C5,9 9,5 50,5Z" fill="#111e13" stroke="#1D9E75" stroke-width="5"/>' +
    '<g clip-path="url(#' + c + ')" fill="none">' +
    '<path class="s1" d="M0,31 Q25,21 50,31 Q75,41 100,31" stroke="#2c4e30" stroke-width="3"/><path class="s2" d="M0,69 Q25,59 50,69 Q75,79 100,69" stroke="#2c4e30" stroke-width="3"/>' +
    '<path class="s3" d="M31,0 Q21,25 31,50 Q41,75 31,100" stroke="#2c4e30" stroke-width="3"/><path class="s4" d="M69,0 Q59,25 69,50 Q79,75 69,100" stroke="#2c4e30" stroke-width="3"/>' +
    '<path class="h" d="M0,50 Q25,40 50,50 Q75,60 100,50" stroke="#c8f542" stroke-width="6"/><path class="v" d="M50,0 Q40,25 50,50 Q60,75 50,100" stroke="#c8f542" stroke-width="6"/>' +
    '<circle class="node" cx="50" cy="50" r="7" fill="#c8f542"/></g>' +
    '<path d="M50,5 C91,5 95,9 95,50 C95,91 91,95 50,95 C9,95 5,91 5,50 C5,9 9,5 50,5Z" fill="none" stroke="#1D9E75" stroke-width="5"/></svg>';
}
function rippleMark(svg, t) {
  if (!svg) return;
  var a = 10 * Math.cos(t), b = 10 * Math.cos(t + 1.3), s = 10 * Math.cos(t * 0.6 + 0.7);
  if (t === 0) { a = b = s = 10; }
  function hz(y, m) { return 'M0,' + y + ' Q25,' + (y - m) + ' 50,' + y + ' Q75,' + (y + m) + ' 100,' + y; }
  function vt(x, m) { return 'M' + x + ',0 Q' + (x - m) + ',25 ' + x + ',50 Q' + (x + m) + ',75 ' + x + ',100'; }
  function q(c) { return svg.querySelector('.' + c); }
  q('h').setAttribute('d', hz(50, a)); q('v').setAttribute('d', vt(50, b));
  q('s1').setAttribute('d', hz(31, s)); q('s2').setAttribute('d', hz(69, s));
  q('s3').setAttribute('d', vt(31, s)); q('s4').setAttribute('d', vt(69, s));
  q('node').setAttribute('r', t === 0 ? '7' : (7 + 1.6 * Math.sin(t * 1.7)).toFixed(2));
}
