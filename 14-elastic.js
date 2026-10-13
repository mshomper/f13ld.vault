/* ============================================================
   F13LD.vault · 14-elastic.js  (v0.9.0)
   Metrics Vault derives at load from what every row already carries —
   no reseed needed (2026-10-11 metrics audit, §5A):

   From the full 6×6 stiffness matrix (metrics_extended.C_GPa, Voigt order
   xx yy zz yz xz xy, GPa at the run's solid modulus Es_ref_GPa) — GPU
   solves only; CPU solves show "—", as shear does:
     _nu_xy · _nu_xz · _nu_yz  Poisson's ratios (−S12/S11 …)
     _numin    the smallest of all six νij · d._pois = auxetic / conventional
     _edmax · _edmin  stiffest / softest Young's modulus over EVERY direction
               (1/E(n) = mᵀSm, m = [n1² n2² n3² n2n3 n1n3 n1n2]), ÷ Es
     _au       universal anisotropy A^U = 5 G_V/G_R + K_V/K_R − 6 (0 = isotropic)
     _zener    Zener ratio 2C44/(C11 − C12), cubic-averaged (1 = isotropic)
     _kb       bulk modulus K / Es (Hill average)
     _hs       Hashin–Shtrikman efficiency: mean of K/K_HS and G/G_HS, upper
               bounds for solid + void at the design's solid fraction (ν_s 0.3)
     _ge       G / E (Hill): 0.385 for an isotropic solid at ν 0.3
   From the stored columns, every row:
     _sv       surface area per cell A/L², true interface area (Sweep ≥ 0.30);
               shown as S_V = A/V (BS/TV, mm⁻¹) at the build cell size
     _bsbv     A/(L²·φ): surface per solid volume (BS/BV at the build cell size) — v0.11.0
     _tp       throat ÷ mean pore — the constriction ratio (Sweep ≥ 0.30 stores it as throat_ratio)
     _hL · _hLa · _hsL · _mihL  curvature × the cell size it was
               measured at, so designs from different runs compare
               (v0.11.0: K·L² trimmed — the mean of K is fixed by topology)
     _cfneg · _cfsad · _ck2m · _ck2sd · _ck2med · _crad · _ckneg
               v0.11.0: the principal-curvature profile, Sweep ≥ 0.33
               (metrics_extended.curv_*); _crad = 1 / |median concave κ₂·L|
     tortuosity_min / tortuosity_avg  v0.11.0: rebuilt over the OPEN axes
               from metrics_extended.tortuosity_x/y/z (Sweep stores 10 for a
               blocked axis, which the stored average counted in)
     _keff     conductivity efficiency: k avg / (ks · solid fraction)
     _ga       Gibson–Ashby prefactor C in E/Es = C·ρⁿ (with the design's n)
   ============================================================ */

var NU_SOLID = 0.3;

/* 6×6 inverse by Gauss–Jordan; null if singular. */
function inv6(A) {
  var n = 6, M = A.map(function (r, i) { return r.slice().concat([0, 0, 0, 0, 0, 0].map(function (_, j) { return i === j ? 1 : 0; })); });
  for (var c = 0; c < n; c++) {
    var p = c; for (var r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (Math.abs(M[p][c]) < 1e-14) return null;
    var t = M[c]; M[c] = M[p]; M[p] = t;
    var pv = M[c][c]; for (var k = 0; k < 2 * n; k++) M[c][k] /= pv;
    for (r = 0; r < n; r++) if (r !== c) { var f = M[r][c]; if (f) for (k = 0; k < 2 * n; k++) M[r][k] -= f * M[c][k]; }
  }
  return M.map(function (r) { return r.slice(n); });
}
/* Directions on a hemisphere (Fibonacci) — E(n) = E(−n). */
var _dirs = null;
function sphereDirs(N) {
  if (_dirs) return _dirs;
  var out = [], ga = Math.PI * (3 - Math.sqrt(5));
  for (var i = 0; i < N; i++) { var z = 1 - (i + 0.5) / N, r = Math.sqrt(1 - z * z), a = i * ga; out.push([r * Math.cos(a), r * Math.sin(a), z]); }
  [[1, 0, 0], [0, 1, 0], [0, 0, 1]].forEach(function (e) { out.push(e); });   /* the axes exactly */
  return (_dirs = out);
}
function readC(ext) {
  var C = ext && ext.C_GPa;
  if (!Array.isArray(C) || C.length !== 6) return null;
  for (var i = 0; i < 6; i++) { if (!Array.isArray(C[i]) || C[i].length !== 6) return null; for (var j = 0; j < 6; j++) if (!isNum(C[i][j])) return null; }
  return C;
}
function hsUpper(phi) {
  var K1 = 1 / (3 * (1 - 2 * NU_SOLID)), G1 = 1 / (2 * (1 + NU_SOLID)), f2 = 1 - phi;   /* per unit Es */
  var K = K1 + f2 / (-1 / K1 + 3 * phi / (3 * K1 + 4 * G1));
  var G = G1 + f2 / (-1 / G1 + 6 * phi * (K1 + 2 * G1) / (5 * G1 * (3 * K1 + 4 * G1)));
  return [Math.max(K, 0), Math.max(G, 0)];
}

function elasticOf(d) {
  var ext = d.metrics_extended || {}, C = readC(ext), keys = ['_nu_xy', '_nu_xz', '_nu_yz', '_numin', '_edmax', '_edmin', '_au', '_zener', '_kb', '_hs', '_ge'];
  keys.forEach(function (k) { d[k] = null; });
  d._pois = 'not recorded';
  var Es = isNum(ext.Es_ref_GPa) && ext.Es_ref_GPa > 0 ? ext.Es_ref_GPa : isNum(d.e_solid_gpa) && d.e_solid_gpa > 0 ? d.e_solid_gpa : (DB.esRefGuess || 100);
  var S6 = C ? inv6(C) : null;
  /* Poisson's ratios: the solver's own when it reported them, else from S */
  var nu = null;
  if (S6 && S6[0][0] > 0 && S6[1][1] > 0 && S6[2][2] > 0) {
    nu = { xy: -S6[0][1] / S6[0][0], yx: -S6[0][1] / S6[1][1], xz: -S6[0][2] / S6[0][0], zx: -S6[0][2] / S6[2][2], yz: -S6[1][2] / S6[1][1], zy: -S6[1][2] / S6[2][2] };
  }
  d._nu_xy = isNum(ext.nu_xy) ? ext.nu_xy : nu ? nu.xy : null;
  d._nu_xz = isNum(ext.nu_xz) ? ext.nu_xz : nu ? nu.xz : null;
  d._nu_yz = isNum(ext.nu_yz) ? ext.nu_yz : nu ? nu.yz : null;
  var all = nu ? [nu.xy, nu.yx, nu.xz, nu.zx, nu.yz, nu.zy] : [d._nu_xy, d._nu_xz, d._nu_yz];
  all = all.filter(isNum);
  if (all.length) { d._numin = Math.min.apply(null, all); d._pois = d._numin < -0.005 ? 'auxetic' : 'conventional'; }
  if (!S6) return;
  /* directional Young's modulus over the sphere */
  var lo = Infinity, hi = 0;
  sphereDirs(1200).forEach(function (n) {
    var m = [n[0] * n[0], n[1] * n[1], n[2] * n[2], n[1] * n[2], n[0] * n[2], n[0] * n[1]], s = 0;
    for (var i = 0; i < 6; i++) { var row = 0; for (var j = 0; j < 6; j++) row += S6[i][j] * m[j]; s += m[i] * row; }
    if (s > 0) { var E = 1 / s; if (E < lo) lo = E; if (E > hi) hi = E; }
  });
  if (hi > 0) { d._edmax = hi / Es; d._edmin = lo / Es; }
  /* Voigt / Reuss / Hill */
  var c = C, s = S6;
  var KV = ((c[0][0] + c[1][1] + c[2][2]) + 2 * (c[0][1] + c[0][2] + c[1][2])) / 9;
  var GV = ((c[0][0] + c[1][1] + c[2][2]) - (c[0][1] + c[0][2] + c[1][2]) + 3 * (c[3][3] + c[4][4] + c[5][5])) / 15;
  var KRi = (s[0][0] + s[1][1] + s[2][2]) + 2 * (s[0][1] + s[0][2] + s[1][2]);
  var GRi = 4 * (s[0][0] + s[1][1] + s[2][2]) - 4 * (s[0][1] + s[0][2] + s[1][2]) + 3 * (s[3][3] + s[4][4] + s[5][5]);
  if (KRi > 0 && GRi > 0 && KV > 0 && GV > 0) {
    var KR = 1 / KRi, GR = 15 / GRi, KH = (KV + KR) / 2, GH = (GV + GR) / 2;
    d._au = Math.max(0, 5 * GV / GR + KV / KR - 6);
    d._kb = KH / Es;
    var EH = 9 * KH * GH / (3 * KH + GH); d._ge = EH > 0 ? GH / EH : null;
    var phi = isNum(d.volume_fraction) ? d.volume_fraction / 100 : null;
    if (phi > 0 && phi <= 1) { var hs = hsUpper(phi); if (hs[0] > 0 && hs[1] > 0) d._hs = ((KH / Es) / hs[0] + (GH / Es) / hs[1]) / 2; }
  }
  var c11 = (c[0][0] + c[1][1] + c[2][2]) / 3, c12 = (c[0][1] + c[0][2] + c[1][2]) / 3, c44 = (c[3][3] + c[4][4] + c[5][5]) / 3;
  d._zener = isNum(ext.zener_A) ? ext.zener_A : (c11 - c12 > 1e-12 ? 2 * c44 / (c11 - c12) : null);
}

/* Derived from the stored columns — every row. */
function derivedColumns(d) {
  var num = function (v) { return isNum(v) ? v : null; }, L = isNum(d.cell_size_mm) && d.cell_size_mm > 0 ? d.cell_size_mm : null, phi = isNum(d.volume_fraction) && d.volume_fraction > 0 ? d.volume_fraction / 100 : null;
  d._sv = isNum((d.metrics_extended || {}).specific_surface) && d.metrics_extended.specific_surface > 0 ? d.metrics_extended.specific_surface : null;   /* Sweep ≥ 0.30 */
  d._tp = isNum(d.throat_size_norm) && isNum(d.pore_size_norm) && d.pore_size_norm > 0 ? d.throat_size_norm / d.pore_size_norm : null;   /* mean pore, not P50 (P50 is the distance field's median, ~½ the pore) */
  d._hL = L && num(d.h_mean) != null ? d.h_mean * L : null;
  d._hLa = L && num(d.h_mean_abs) != null ? d.h_mean_abs * L : null;
  d._hsL = L && num(d.h_std) != null ? d.h_std * L : null;
  d._mihL = L && num(d.mih) != null ? d.mih / L : null;
  d._keff = phi && isNum(d.keff_avg_norm) ? d.keff_avg_norm / phi : null;
  /* v0.11.0 — surface per solid volume, and the curvature profile */
  var ext = d.metrics_extended || {};
  d._bsbv = d._sv != null && phi ? d._sv / phi : null;
  d._cfneg = num(ext.curv_f_neg); d._cfsad = num(ext.curv_f_sad);
  d._ck2m = num(ext.curv_k2_mean); d._ck2sd = num(ext.curv_k2_sd);
  d._ck2med = num(ext.curv_k2_neg_med); d._ckneg = num(ext.curv_k_neg_int);
  d._crad = d._ck2med != null && d._ck2med < 0 ? 1 / Math.abs(d._ck2med) : null;
  d._cgb = num(ext.curv_gb_resid);
  /* v0.11.0 — tortuosity over the axes the pores connect along: Sweep stores
     10 (its cap) on a blocked axis and sets that axis's bit in
     tortuosity_nonperc (1 = x, 2 = y, 4 = z); the stored average counted it */
  var T = [ext.tortuosity_x, ext.tortuosity_y, ext.tortuosity_z];
  if (T.every(isNum)) {
    var bits = isNum(ext.tortuosity_nonperc) ? ext.tortuosity_nonperc : 0;
    var open = T.filter(function (t, i) { return !(bits & (1 << i)) && t < 9.99; });
    d.tortuosity_min = open.length ? Math.min.apply(null, open) : null;
    d.tortuosity_avg = open.length ? open.reduce(function (a, b) { return a + b; }, 0) / open.length : null;
  }
}
/* After ensureNexp: the prefactor that goes with each design's own n. */
function gibsonAshby() {
  DB.all.forEach(function (d) {
    var E = d._nexpSrc === 'peak' ? d._emax : d._egeo, phi = isNum(d.volume_fraction) ? d.volume_fraction / 100 : null;
    d._ga = isNum(d._nexp) && isNum(E) && E > 0 && phi > 0 ? E / Math.pow(phi, d._nexp) : null;
  });
}
