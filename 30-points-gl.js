/* ============================================================
   F13LD.vault · 30-points-gl.js
   WebGL point renderer shared by the 3D design space and the 2D plot.
   Every design is one point; three passes draw it:
     dim   — designs outside the filters, small and faint
     glow  — additive halo in the colour of the design
     core  — the shape (sphere / disc / rod / diamond = connectivity class)
   The views only call draw() when something changed, so an idle page
   costs nothing and 10,000 designs orbit as smoothly as 600.
   ============================================================ */

var PT_FLOATS = 10;   /* pos3 · col3 · size · alpha · shape · matched */

var PT_VS = [
  'attribute vec3 aPos;attribute vec3 aCol;attribute float aSize;attribute float aAlpha;attribute float aShape;attribute float aM;',
  'uniform vec2 uRes;uniform float uDpr;uniform float uMode;uniform vec3 uC;uniform float uYaw;uniform float uPitch;uniform float uS0;uniform float uDst;uniform vec2 uCxy;',
  'uniform vec4 uWin;uniform vec4 uRect;uniform mediump float uPass;',
  'varying vec3 vCol;varying float vA;varying float vShape;varying float vDepth;',
  'void main(){',
  '  bool want=(uPass<0.5)?(aM<0.5):(aM>0.5);',
  '  if(!want){gl_Position=vec4(2.0,2.0,2.0,1.0);gl_PointSize=1.0;return;}',
  '  vec2 sp;float depth=0.0;float pp=1.0;',
  '  if(uMode<0.5){vec3 p=aPos-uC;float cy=cos(uYaw),sy=sin(-uYaw),cp=cos(uPitch),sq=sin(-uPitch);',
  '    float x1=p.x*cy+p.z*sy;float z1=-p.x*sy+p.z*cy;float y2=p.y*cp-z1*sq;float z2=p.y*sq+z1*cp;',
  '    pp=uDst/(uDst-z2);sp=vec2(uCxy.x+x1*uS0*pp,uCxy.y-y2*uS0*pp);depth=z2;}',
  '  else{sp=vec2(uRect.x+(aPos.x-uWin.x)/(uWin.y-uWin.x)*uRect.z,uRect.y+uRect.w-(aPos.y-uWin.z)/(uWin.w-uWin.z)*uRect.w);}',
  '  vec2 ndc=vec2(sp.x/uRes.x*2.0-1.0,1.0-sp.y/uRes.y*2.0);',
  '  gl_Position=vec4(ndc,uMode<0.5?clamp(-depth*0.2,-0.99,0.99):0.0,1.0);',
  '  float s=aSize*(uMode<0.5?sqrt(pp):1.0);',
  '  float mul=uPass<0.5?0.8:(uPass<1.5?6.5:1.0);',
  '  gl_PointSize=max(1.0,s*mul*uDpr);',
  '  vCol=aCol;vA=aAlpha;vShape=aShape;vDepth=uMode<0.5?clamp((depth+1.7)/3.4,0.0,1.0):1.0;',
  '}'].join('\n');
var PT_FS = [
  'precision mediump float;',
  'uniform mediump float uPass;uniform mediump float uGlow;varying vec3 vCol;varying float vA;varying float vShape;varying float vDepth;',
  'void main(){',
  '  vec2 q=gl_PointCoord*2.0-1.0;',
  '  if(uPass<0.5){if(dot(q,q)>1.0)discard;float a0=vA*(0.55+0.45*vDepth);gl_FragColor=vec4(vec3(0.50,0.53,0.66)*a0,a0);return;}',
  '  if(uPass<1.5){float r=length(q);if(r>1.0)discard;float g=exp(-r*r*5.0)*(1.0-r);float k=g*vA*uGlow;gl_FragColor=vec4(vCol*k,k*0.85);return;}',
  '  float inside;',
  '  if(vShape<0.5)inside=step(length(q),1.0);',
  '  else if(vShape<1.5)inside=step(length(vec2(q.x,q.y*2.0)),1.0);',
  '  else if(vShape<2.5)inside=step(abs(q.x),0.38)*step(abs(q.y),1.0);',
  '  else inside=step(abs(q.x)+abs(q.y),1.0);',
  '  if(inside<0.5)discard;',
  '  float a1=vA*(0.6+0.4*vDepth);gl_FragColor=vec4(vCol*a1,a1);',
  '}'].join('\n');

function PointLayer(canvas, mode) {
  this.cv = canvas; this.mode = mode;   /* 0 = 3D, 1 = 2D */
  this.ok = false; this.lost = false; this.buf = null; this.data = null; this.n = 0;
  var self = this;
  canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); self.lost = true; self.ok = false; });
  canvas.addEventListener('webglcontextrestored', function () { self.lost = false; self.init(); self.dirty = true; if (typeof markViewsDirty === 'function') markViewsDirty(); });
  this.init();
}
PointLayer.prototype.init = function () {
  var gl = null;
  try { gl = this.cv.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: true, depth: true }); } catch (e) { gl = null; }
  if (!gl) { this.ok = false; return; }
  function sh(t, src) { var s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn('[F13LD.vault] point shader:', gl.getShaderInfoLog(s)); return null; } return s; }
  var vs = sh(gl.VERTEX_SHADER, PT_VS), fs = sh(gl.FRAGMENT_SHADER, PT_FS); if (!vs || !fs) return;
  var p = gl.createProgram(); gl.attachShader(p, vs); gl.attachShader(p, fs); gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { console.warn('[F13LD.vault] point link:', gl.getProgramInfoLog(p)); return; }
  this.gl = gl; this.prog = p; this.buf = gl.createBuffer();
  this.a = {}; ['aPos', 'aCol', 'aSize', 'aAlpha', 'aShape', 'aM'].forEach(function (n) { this.a[n] = gl.getAttribLocation(p, n); }, this);
  this.u = {}; ['uRes', 'uDpr', 'uMode', 'uC', 'uYaw', 'uPitch', 'uS0', 'uDst', 'uCxy', 'uWin', 'uRect', 'uPass', 'uGlow'].forEach(function (n) { this.u[n] = gl.getUniformLocation(p, n); }, this);
  this.ok = true;
};
/* Fill the vertex data from the population (positions from d._h). */
PointLayer.prototype.fill = function (getPos) {
  var N = DB.N;
  if (!this.data || this.data.length !== N * PT_FLOATS) this.data = new Float32Array(N * PT_FLOATS);
  var a = this.data, base = S.mobile ? 2.4 : 2.9, hi = S.hiFam;
  for (var i = 0; i < N; i++) {
    var d = DB.all[i], h = d._h, o = i * PT_FLOATS, p = getPos(h), c = d._col || [0.6, 0.6, 0.7];
    a[o] = p[0]; a[o + 1] = p[1]; a[o + 2] = p[2];
    var boost = hi && d.family === hi ? 1.25 : (hi ? 0.55 : 1);
    a[o + 3] = c[0] * boost; a[o + 4] = c[1] * boost; a[o + 5] = c[2] * boost;
    a[o + 6] = base * h.s * (1 + h.tw * 0.7) * (hi && d.family === hi ? 1.25 : 1);
    a[o + 7] = d._m ? h.a * (0.85 + h.tw * 0.5) : Math.min(0.22, h.a * 0.22);
    a[o + 8] = d._kappa === 'disc' ? 1 : d._kappa === 'rod' ? 2 : d._kappa === 'diamond' ? 3 : 0;
    a[o + 9] = d._m ? 1 : 0;
  }
  this.n = N;
};
PointLayer.prototype.draw = function (U) {
  if (!this.ok || this.lost || !this.n) return;
  var gl = this.gl, cv = this.cv, dpr = U.dpr;
  var W = Math.round(cv.clientWidth * dpr), H = Math.round(cv.clientHeight * dpr);
  if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
  gl.viewport(0, 0, W, H);
  gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.useProgram(this.prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
  gl.bufferData(gl.ARRAY_BUFFER, this.data, gl.DYNAMIC_DRAW);
  var st = PT_FLOATS * 4, a = this.a;
  gl.enableVertexAttribArray(a.aPos); gl.vertexAttribPointer(a.aPos, 3, gl.FLOAT, false, st, 0);
  gl.enableVertexAttribArray(a.aCol); gl.vertexAttribPointer(a.aCol, 3, gl.FLOAT, false, st, 12);
  gl.enableVertexAttribArray(a.aSize); gl.vertexAttribPointer(a.aSize, 1, gl.FLOAT, false, st, 24);
  gl.enableVertexAttribArray(a.aAlpha); gl.vertexAttribPointer(a.aAlpha, 1, gl.FLOAT, false, st, 28);
  gl.enableVertexAttribArray(a.aShape); gl.vertexAttribPointer(a.aShape, 1, gl.FLOAT, false, st, 32);
  gl.enableVertexAttribArray(a.aM); gl.vertexAttribPointer(a.aM, 1, gl.FLOAT, false, st, 36);
  var u = this.u;
  gl.uniform2f(u.uRes, cv.clientWidth, cv.clientHeight); gl.uniform1f(u.uDpr, dpr); gl.uniform1f(u.uMode, this.mode);
  if (this.mode === 0) {
    gl.uniform3f(u.uC, U.c[0], U.c[1], U.c[2]); gl.uniform1f(u.uYaw, U.yaw); gl.uniform1f(u.uPitch, U.pitch);
    gl.uniform1f(u.uS0, U.S0); gl.uniform1f(u.uDst, U.dst); gl.uniform2f(u.uCxy, U.cx, U.cy);
  } else {
    gl.uniform4f(u.uWin, U.win[0], U.win[1], U.win[2], U.win[3]); gl.uniform4f(u.uRect, U.rect.L, U.rect.T, U.rect.W, U.rect.H);
  }
  /* glow strength falls with point density, so a crowded cloud keeps its colours instead of burning to white */
  var area = this.mode === 0 ? Math.pow(2.4 * U.S0, 2) : U.rect.W * U.rect.H, lit = Math.max(1, S.cnt || this.n);
  gl.uniform1f(u.uGlow, clamp(area / (lit * 361) * 3.4, 0.38, 1.25));
  gl.enable(gl.BLEND); gl.disable(gl.DEPTH_TEST);
  /* premultiplied output throughout: "over" for dim and core, additive light for the glow */
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.uniform1f(u.uPass, 0); gl.drawArrays(gl.POINTS, 0, this.n);
  gl.blendFunc(gl.ONE, gl.ONE); gl.uniform1f(u.uPass, 1); gl.drawArrays(gl.POINTS, 0, this.n);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  if (this.mode === 0) { gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); }
  gl.uniform1f(u.uPass, 2); gl.drawArrays(gl.POINTS, 0, this.n);
  gl.disable(gl.DEPTH_TEST);
};

/* ── colour per design (cached; recomputed when the colour mode changes) ── */
var COLOR_RAMP = (function () {
  var st = ['#0C447C', '#1C6FB9', '#1D9E75', '#8fd14f', '#c8f542'].map(hexRGB), o = [];
  for (var i = 0; i < 32; i++) { var t = i / 31 * (st.length - 1), a = Math.floor(t), b = Math.min(a + 1, st.length - 1), f = t - a;
    o.push([0, 1, 2].map(function (j) { return lerp(st[a][j], st[b][j], f) / 255; })); }
  return o;
})();
var COLOR_MODE_LIST = [
  { id: 'family', label: 'Family', type: 'cat' },
  { id: 'kappa', label: 'Connectivity', type: 'cat' },
  { id: 'stiff_axis', label: 'Stiffest axis', type: 'cat' },
  { id: 'topology', label: 'Topology', type: 'cat' },
  { id: '_stiff_flag', label: 'Stiffness flag', type: 'cat' },
  { id: '_curv_flag', label: 'Curvature check', type: 'cat' },   /* v0.11.0 */
  { id: 'volume_fraction', label: 'Volume fraction', type: 'cont' },
  { id: '_score', label: 'Domain score', type: 'cont' },
  { id: '_pois', label: 'Poisson (auxetic)', type: 'cat' },   /* v0.9.0 — was stiffness efficiency; Voigt efficiency is below */
  { id: 'anisotropy', label: 'Anisotropy', type: 'cont' },
  /* v0.11.0 — principal-curvature profile (Sweep v0.33+) */
  { id: '_cfneg', label: 'Concave area', type: 'cont', abs: [0, 1], lo: '0 %', hi: '100 %',
    tip: 'Share of the surface that is concave in at least one direction (smaller principal curvature below zero), where bone cells prefer to grow (Callens et al. 2023). Minimal surfaces read near 100 %. Grey: no curvature profile (Sweep before v0.33).' },
  { id: '_scar', label: 'Domain scarcity', type: 'cont' },
  /* v0.7.1 (24-aim.js) — absolute scales: abs = [value at the low end, value at the high end] */
  { id: 'aim', label: 'Aimed run', type: 'cat' },
  { id: '_nexp', label: 'Density exponent', type: 'cont', abs: [1, 3.5], lo: 'stretch 1', hi: '3.5 bend', prep: function () { ensureNexp(); }, dim: function (d) { return nexpDim(d); },
    tip: 'How stiffness grows with density for each design type, E ∝ ρⁿ (mean of Ex, Ey, Ez, fitted across designs of the same family, topology and preset). Near 1: stretch-dominated; near 2 and up: bending-dominated. Faded: the type has too few designs or too narrow a density range, so the trend is borrowed from its wider family. Grey: not even the family can give a trend.' },
  { id: '_beff', label: 'Voigt efficiency', type: 'cont', abs: [0, 1], lo: '0 %', hi: '100 %', val: function (d) { return beffOf(d); },
    tip: 'Peak stiffness as a share of the most any structure can have at that density (Voigt bound: E* / Es ≤ solid fraction).' },
  { id: '_pdepth', label: 'Pareto depth', type: 'cont', abs: [12, 0], lo: 'deep', hi: 'front', prep: function () { ensurePareto(); },
    tip: 'How many layers each design sits behind the Pareto front of the 2D axes (bright = the front). Follows the axes and the filters.' },
  { id: '_sim', label: 'Similar to selected', type: 'cont', abs: [0, 1], lo: 'unlike', hi: 'alike', prep: function () { ensureSim(); },
    tip: 'How close each design is to the selected one across volume fraction, stiffness, shear, anisotropy, pores, conductivity, connectivity, tortuosity and curvature.' }
];
function colorMode() {
  var m = COLOR_MODE_LIST.filter(function (x) { return x.id === S.color; })[0];
  if (!m && isVarKey(S.color) && hasMetric(S.color)) m = { id: S.color, label: mLabel(S.color), type: 'cont' };   /* v0.10.0 — colour by your variable */
  return m || COLOR_MODE_LIST[0];
}
var FLAG_COLORS = { flagged: '#f0b429', clean: '#3f4766', 'not recorded': '#5f6582' };
var POIS_COLORS = { auxetic: '#c8f542', conventional: '#3f6aa0', 'not recorded': '#5f6582' };
function catValue(d, id) {
  if (id === 'family') return d.family;
  if (id === 'kappa') return d._kappa;
  if (id === 'stiff_axis') return d.stiff_axis || 'none';
  if (id === '_stiff_flag') return d._stiff_flag;
  if (id === '_curv_flag') return d._curv_flag;
  if (id === '_pois') return d._pois;
  if (id === 'aim') return aimCatValue(d);
  if (id === 'topology') { var g = (d.recipe && d.recipe.geometry) || {}; return String(g.mode || g.topology || 'other').replace(/^(grain|noise)-/, ''); }
  return null;
}
function catColor(id, v) {
  if (id === 'family') return CAT_PALETTES.family[v] || '#9a9fb7';
  if (id === 'kappa') return CAT_PALETTES.kappa[v] || '#9a9fb7';
  if (id === 'stiff_axis') return CAT_PALETTES.stiff_axis[v] || '#666666';
  if (id === '_stiff_flag') return FLAG_COLORS[v] || '#5f6582';
  if (id === '_curv_flag') return FLAG_COLORS[v] || '#5f6582';
  if (id === '_pois') return POIS_COLORS[v] || '#5f6582';
  if (id === 'topology') return CAT_PALETTES.topology[v] || '#9a9fb7';
  if (id === 'aim') return aimCatColor(v);
  return '#9a9fb7';
}
function recolor() {
  var mode = colorMode();
  if (mode.id === '_scar') ensureScarcity(F.domain);
  if (mode.prep) mode.prep();
  var pr = mode.type === 'cont' && !mode.abs ? pctOf(mode.id) : null;
  /* v0.8.0 — a borrowed density exponent stays faded while n is on a plot axis, in any colour mode */
  var nexpOnAxis = [S.ax2.x, S.ax2.y, S.ax3.x, S.ax3.y, S.ax3.z].indexOf('_nexp') >= 0;
  DB.all.forEach(function (d) {
    if (mode.type === 'cat') { var c = hexRGB(catColor(mode.id, catValue(d, mode.id))), f = nexpOnAxis ? nexpDim(d) : 0;
      if (f > 0) c = [c[0] + (84 - c[0]) * f, c[1] + (89 - c[1]) * f, c[2] + (115 - c[2]) * f];
      d._col = [c[0] / 255, c[1] / 255, c[2] / 255]; d._colHex = f > 0 ? rgbHex(c[0], c[1], c[2]) : catColor(mode.id, catValue(d, mode.id)); }
    else { var p;
      if (mode.abs) { var av = mode.val ? mode.val(d) : d[mode.id]; p = isNum(av) ? clamp((av - mode.abs[0]) / (mode.abs[1] - mode.abs[0]), 0, 1) : NaN; }
      else p = pr[d._i];
      if (isNaN(p)) { d._col = [0.33, 0.35, 0.45]; d._colHex = '#555a73'; } else {
        var r = COLOR_RAMP[Math.round(p * 31)], m = mode.dim ? mode.dim(d) : (nexpOnAxis ? nexpDim(d) : 0);
        if (m > 0) r = [r[0] + (0.33 - r[0]) * m, r[1] + (0.35 - r[1]) * m, r[2] + (0.45 - r[2]) * m];   /* faded toward the no-value grey */
        d._col = r; d._colHex = rgbHex(r[0] * 255, r[1] * 255, r[2] * 255); } }
  });
  markViewsDirty();
}
