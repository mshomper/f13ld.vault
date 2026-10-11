/* ============================================================
   F13LD.vault · 32-plot2d.js
   The 2D plot: any two metrics, real values with ticks, log scale where a
   metric spans decades, histograms of what still matches along the top
   and right edges.

   Tools (top-right of the plot):
     Box     drag a box → two range filters (one per axis)
     Target  click → a target point; designs rank by closeness to it, and
             if nothing is near, Vault offers to explore around the nearest
             design in F13LD.sweep
     Pareto  light the best trade-off designs for the current axes
     Gap     shade where the Vault has designs; click an empty patch to
             target it
     Presets one-click axis pairs for the active domain
   Ctrl, right or middle drag pans · wheel zooms around the cursor ·
   double-click resets the view. Touch: one finger pans, two pinch.
   ============================================================ */

function plotScale(k) {
  var r = rangeScale(k);
  return { lg: r.lg, min: r.min, max: r.max, f: function (v) { return 0.03 + 0.94 * r.f(v); }, inv: function (t) { return r.inv((t - 0.03) / 0.94); } };
}
function set2DTargets() {
  var sx = plotScale(S.ax2.x), sy = plotScale(S.ax2.y);
  for (var i = 0; i < DB.N; i++) {
    var d = DB.all[i], h = d._h, vx = d[S.ax2.x], vy = d[S.ax2.y];
    h.has2 = isNum(vx) && isNum(vy);
    h.tu = isNum(vx) ? sx.f(vx) : -1; h.tv = isNum(vy) ? sy.f(vy) : -1;
  }
  computeFront(); computeGapGrid();
  if (S.color === '_pdepth') recolor();   /* v0.7.1 — Pareto depth follows the axes */
  markViewsDirty();
}
function ticksFor(k, lo, hi) {
  var out = []; if (lo > hi) { var t = lo; lo = hi; hi = t; }
  if (plotScale(k).lg) {
    for (var e = Math.floor(Math.log10(lo)); e <= Math.ceil(Math.log10(hi)); e++) [1, 2, 5].forEach(function (m) { var v = m * Math.pow(10, e); if (v >= lo && v <= hi) out.push(v); });
    return out;
  }
  var span = hi - lo || 1, st = Math.pow(10, Math.floor(Math.log10(span / 5))), steps = [1, 2, 2.5, 5, 10].map(function (m) { return m * st; });
  var step = steps.filter(function (x) { return span / x <= 6; })[0] || st * 10;
  for (var v = Math.ceil(lo / step) * step; v <= hi + 1e-12; v += step) out.push(+v.toPrecision(12));
  return out;
}
function tickText(k, v) { return k === 'volume_fraction' ? v.toFixed(v < 10 ? 1 : 0) : fmtNum(v); }

function Plot2D(host, mobile) {
  this.host = host; this.mobile = mobile;
  this.bcv = host.querySelector('.v-bg'); this.gcv = host.querySelector('.v-gl'); this.ocv = host.querySelector('.v-ov');
  this.bctx = this.bcv ? this.bcv.getContext('2d') : null;
  this.pts = new PointLayer(this.gcv, 1); this.octx = this.ocv.getContext('2d');
  this.axEl = host.querySelector('.p2-ax');
  this.v = [0, 1, 0, 1]; this.vT = [0, 1, 0, 1]; this.inset = 0; this.insetT = 0;
  this.R = { L: 0, T: 0, W: 1, H: 1 }; this.px = new Float32Array(0); this.py = new Float32Array(0);
  this.hover = null; this.hl = null; this.drag = null; this.brush = null; this.ptr = new Map();
  this.dirty = true; this.link = null; this.axKey = ''; this.gapHover = null;
  this.bind();
}
Plot2D.prototype.visible = Hero3D.prototype.visible;
Plot2D.prototype.local = Hero3D.prototype.local;
Plot2D.prototype.toS = function (fx, fy) { var r = this.R, v = this.v; return [r.L + (fx - v[0]) / (v[1] - v[0]) * r.W, r.T + r.H - (fy - v[2]) / (v[3] - v[2]) * r.H]; };
Plot2D.prototype.toF = function (sx, sy) { var r = this.R, v = this.v; return [v[0] + (sx - r.L) / r.W * (v[1] - v[0]), v[2] + (r.T + r.H - sy) / r.H * (v[3] - v[2])]; };
Plot2D.prototype.inPlot = function (x, y) { var r = this.R; return x >= r.L && x <= r.L + r.W && y >= r.T && y <= r.T + r.H; };
Plot2D.prototype.reset = function () { this.vT = [0, 1, 0, 1]; this.dirty = true; };
Plot2D.prototype.zoomAt = function (x, y, k) {
  var f = this.toF(x, y), v = this.vT, nv = [f[0] + (v[0] - f[0]) * k, f[0] + (v[1] - f[0]) * k, f[1] + (v[2] - f[1]) * k, f[1] + (v[3] - f[1]) * k];
  if (nv[1] - nv[0] < 0.01 || nv[1] - nv[0] > 1.6) return; this.vT = nv; this.dirty = true;
};
Plot2D.prototype.pick = function (x, y, r, includeDim) {
  if (!this.inPlot(x, y) || this.px.length !== DB.N) return null;
  var best = null, bd = r * r;
  for (var i = 0; i < DB.N; i++) {
    var d = DB.all[i]; if (!d._h.has2 || (!d._m && !includeDim)) continue;
    var dx = this.px[i] - x, dy = this.py[i] - y, q = (dx * dx + dy * dy) * (d._m ? 1 : 2.2);
    if (q < bd) { bd = q; best = d; }
  }
  return best;
};
Plot2D.prototype.bind = function () {
  var cv = this.ocv, self = this;
  cv.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  cv.addEventListener('pointerdown', function (e) {
    var p = self.local(e); try { cv.setPointerCapture(e.pointerId); } catch (x) { /* synthetic */ }
    self.ptr.set(e.pointerId, p);
    if (self.ptr.size === 2) { var q = Array.from(self.ptr.values()); self.pinch = { d0: Math.hypot(q[0][0] - q[1][0], q[0][1] - q[1][1]), v0: self.vT.slice() }; self.drag = null; return; }
    var pan = self.mobile || e.ctrlKey || e.metaKey || e.button === 1 || e.button === 2;
    self.drag = { x0: p[0], y0: p[1], v0: self.v.slice(), moved: false, mode: pan ? 'pan' : (S.tool2 === 'target' ? 'target' : 'box') };
    if (pan) e.preventDefault();
  });
  cv.addEventListener('pointermove', function (e) {
    var p = self.local(e); if (self.ptr.has(e.pointerId)) self.ptr.set(e.pointerId, p);
    if (self.pinch && self.ptr.size === 2) {
      var q = Array.from(self.ptr.values()), dd = Math.hypot(q[0][0] - q[1][0], q[0][1] - q[1][1]), k = self.pinch.d0 / (dd || 1), v0 = self.pinch.v0;
      var cx = (v0[0] + v0[1]) / 2, cy = (v0[2] + v0[3]) / 2, hx = (v0[1] - v0[0]) / 2 * k, hy = (v0[3] - v0[2]) / 2 * k;
      if (hx * 2 > 0.01 && hx * 2 < 1.6) { self.vT = self.v = [cx - hx, cx + hx, cy - hy, cy + hy]; self.dirty = true; } return;
    }
    var g = self.drag;
    if (!g) {
      if (!self.mobile) {
        var h = self.pick(p[0], p[1], 13, true);
        if (h !== self.hover) { self.hover = h; if (self.link) { self.link.hl = h; self.link.dirty = true; } self.dirty = true; }
        showTip(h, p[0] + self.host.offsetLeft, p[1] + self.host.offsetTop, self.host.closest('.p-hero'));
        self.gapHover = (S.gap && !h && self.inPlot(p[0], p[1])) ? self.gapCell(p[0], p[1]) : null;
        cv.style.cursor = h ? 'pointer' : (S.tool2 === 'target' || self.gapHover ? 'crosshair' : 'crosshair');
        if (S.gap) self.dirty = true;
      }
      return;
    }
    var dx = p[0] - g.x0, dy = p[1] - g.y0; if (Math.hypot(dx, dy) > 4) g.moved = true; self.dirty = true;
    if (g.mode === 'box') { if (g.moved) self.brush = [g.x0, g.y0, p[0], p[1]]; return; }
    if (g.mode === 'pan') {
      var fx = dx / self.R.W * (g.v0[1] - g.v0[0]), fy = dy / self.R.H * (g.v0[3] - g.v0[2]);
      self.v = self.vT = [g.v0[0] - fx, g.v0[1] - fx, g.v0[2] + fy, g.v0[3] + fy]; cv.style.cursor = 'move';
    }
  });
  function up(e) {
    self.ptr.delete(e.pointerId); if (self.ptr.size < 2) self.pinch = null;
    var g = self.drag; self.drag = null; if (!g) return; var p = self.local(e);
    if (g.mode === 'box' && g.moved) { applyBrush2D(self); self.brush = null; self.dirty = true; return; }
    var tUp = performance.now(), second = !g.moved && tUp - (self._lastUp || -1e9) < 320; if (!g.moved) self._lastUp = second ? -1e9 : tUp;   /* 2nd click of a double-click resets, never picks */
    if (g.moved || self._dbl || second) return;
    /* v0.7.1 — a ghost target (colour by aimed run) picks its run */
    var gh = g.mode !== 'target' && (self.ghosts || []).filter(function (q) { return Math.hypot(q.x - p[0], q.y - p[1]) < (self.mobile ? 20 : 13); })[0];
    if (gh) { selectAimRun(gh.id); return; }
    var d = self.pick(p[0], p[1], self.mobile ? 24 : 13, false);
    if (d && g.mode !== 'target') { select(d, 'plot'); return; }
    if ((g.mode === 'target' || (S.gap && !d)) && self.inPlot(p[0], p[1])) { var f = self.toF(p[0], p[1]); setTarget(S.ax2.x, S.ax2.y, plotScale(S.ax2.x).inv(f[0]), plotScale(S.ax2.y).inv(f[1])); return; }
    if (d) select(d, 'plot');
  }
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  cv.addEventListener('pointerleave', function () { if (!self.drag) { if (self.hover) { self.hover = null; showTip(null); if (self.link) { self.link.hl = null; self.link.dirty = true; } } self.gapHover = null; self.dirty = true; } });
  cv.addEventListener('wheel', function (e) { e.preventDefault(); var p = self.local(e); self.zoomAt(p[0], p[1], Math.exp(e.deltaY * 0.0013)); }, { passive: false });
  cv.addEventListener('dblclick', function () { self._dbl = true; setTimeout(function () { self._dbl = false; }, 300); self.reset(); });
};
Plot2D.prototype.gapCell = function (x, y) {
  var G = GAP.grid; if (!G) return null;
  var f = this.toF(x, y), i = Math.floor(f[0] * GAP.nx), j = Math.floor(f[1] * GAP.ny);
  if (i < 0 || j < 0 || i >= GAP.nx || j >= GAP.ny) return null;
  return { i: i, j: j, n: G[j * GAP.nx + i] };
};
Plot2D.prototype.frame = function (now) {
  if (!this.visible()) return;
  var busy = false, k;
  for (k = 0; k < 4; k++) { var dv = this.vT[k] - this.v[k]; if (Math.abs(dv) > 1e-5) { this.v[k] += dv * 0.2; busy = true; } }
  if (Math.abs(this.insetT - this.inset) > 0.5) { this.inset += (this.insetT - this.inset) * 0.14; busy = true; }
  var moving = _pointsMoving;
  var overlayLive = ((!!S.sel || !!F.target) && pulseOn(now)) || !!this.hl || !!this.brush || (!!S.spot && now - S.spotT0 < 1200);
  if (!busy && !moving && !this.dirty && !overlayLive) return;
  var w = this.ocv.clientWidth, h = this.ocv.clientHeight, dpr = Math.min(window.devicePixelRatio || 1, 2), m = this.mobile;
  var L = m ? 84 : 104, Rr = m ? 16 : 46, T = m ? 118 : 86, B = (m ? 70 : 88) + this.inset;
  this.R = { L: L, T: T, W: Math.max(40, w - L - Rr), H: Math.max(40, h - T - B) };
  if (busy || moving || this.dirty) {
    var self = this;
    this.pts.fill(function (hh) { return [hh.has2 ? hh.u : -9, hh.has2 ? hh.v : -9, 0]; });
    this.pts.draw({ dpr: dpr, win: this.v, rect: this.R });
    var N = DB.N; if (this.px.length !== N) { this.px = new Float32Array(N); this.py = new Float32Array(N); }
    for (var i = 0; i < N; i++) { var hh = DB.all[i]._h, s = this.toS(hh.u, hh.v); this.px[i] = s[0]; this.py[i] = s[1]; }
    this.drawBack(w, h, dpr);
  }
  this.drawOverlay(now, w, h, dpr);
  this.dirty = false;
};
/* Gap map, under the points. */
Plot2D.prototype.drawBack = function (w, h, dpr) {
  var cv = this.bcv, ctx = this.bctx; if (!ctx) return;
  var W = Math.round(w * dpr), H = Math.round(h * dpr); if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
  if (!S.gap || !GAP.grid) return;
  var r = this.R; ctx.save(); ctx.beginPath(); ctx.rect(r.L, r.T, r.W, r.H); ctx.clip();
  var mx = GAP.max || 1;
  for (var j = 0; j < GAP.ny; j++) for (var i = 0; i < GAP.nx; i++) {
    var n = GAP.grid[j * GAP.nx + i], a = this.toS(i / GAP.nx, (j + 1) / GAP.ny), b = this.toS((i + 1) / GAP.nx, j / GAP.ny);
    if (n > 0) { ctx.fillStyle = 'rgba(91,164,238,' + (0.06 + 0.22 * Math.log(1 + n) / Math.log(1 + mx)).toFixed(3) + ')'; ctx.fillRect(a[0], a[1], b[0] - a[0] + 0.5, b[1] - a[1] + 0.5); }
    else if (GAP.inside[j * GAP.nx + i]) { ctx.strokeStyle = 'rgba(200,245,66,0.18)'; ctx.setLineDash([2, 3]); ctx.strokeRect(a[0] + 1, a[1] + 1, b[0] - a[0] - 2, b[1] - a[1] - 2); ctx.setLineDash([]); }
  }
  ctx.restore();
};
Plot2D.prototype.drawOverlay = function (now, w, h, dpr) {
  var cv = this.ocv, ctx = this.octx, W = Math.round(w * dpr), H = Math.round(h * dpr), self = this, m = this.mobile;
  if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
  if (!DB.N) return;
  var r = this.R, kx = S.ax2.x, ky = S.ax2.y, sx = plotScale(kx), sy = plotScale(ky), v = this.v;
  ctx.font = '500 12px "JetBrains Mono",monospace'; ctx.lineWidth = 1;
  var tx = hasMetric(kx) ? ticksFor(kx, sx.inv(v[0]), sx.inv(v[1])) : [], ty = hasMetric(ky) ? ticksFor(ky, sy.inv(v[2]), sy.inv(v[3])) : [];
  /* where the selection's value chips will sit, so tick labels give way to them */
  var cs = S.sel && S.sel._h.has2 ? S.sel : null, cX = null, cY = null, cW = 0;
  if (cs) { var qx = this.px[cs._i], qy = this.py[cs._i]; if (qx >= r.L && qx <= r.L + r.W && qy >= r.T && qy <= r.T + r.H) { cX = qx; cY = qy;
    ctx.font = '600 12px "JetBrains Mono",monospace'; cW = ctx.measureText(tickText(kx, cs[kx])).width + 12; ctx.font = '500 12px "JetBrains Mono",monospace'; } }
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  var lastX = -1e9;
  tx.forEach(function (t) { var X = self.toS(sx.f(t), 0)[0]; if (X < r.L - 1 || X > r.L + r.W + 1) return;
    ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.beginPath(); ctx.moveTo(X, r.T); ctx.lineTo(X, r.T + r.H); ctx.stroke();
    var s = tickText(kx, t), tw = ctx.measureText(s).width; if (X - tw / 2 < lastX + 8) return;
    if (cX !== null && Math.abs(X - cX) < tw / 2 + cW / 2 + 4) return; lastX = X + tw / 2;
    ctx.fillStyle = '#7a809c'; ctx.fillText(s, X, r.T + r.H + 8); });
  ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  var lastY = 1e9;
  ty.forEach(function (t) { var Y = self.toS(0, sy.f(t))[1]; if (Y < r.T - 1 || Y > r.T + r.H + 1) return;
    ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.beginPath(); ctx.moveTo(r.L, Y); ctx.lineTo(r.L + r.W, Y); ctx.stroke();
    if (Y > lastY - 16) return; if (cY !== null && Math.abs(Y - cY) < 20) return; lastY = Y; ctx.fillStyle = '#7a809c'; ctx.fillText(tickText(ky, t), r.L - 9, Y); });
  ctx.strokeStyle = 'rgba(200,245,66,0.35)'; ctx.beginPath(); ctx.moveTo(r.L, r.T); ctx.lineTo(r.L, r.T + r.H); ctx.lineTo(r.L + r.W, r.T + r.H); ctx.stroke();
  /* edge histograms of what still matches, over the visible window */
  if (!m) {
    var NB = 48, bx = new Array(NB).fill(0), by = new Array(NB).fill(0), px = this.px, py = this.py;
    for (var a = 0; a < S.list.length; a++) { var d = S.list[a], i = d._i; if (!d._h.has2) continue;
      if (px[i] >= r.L && px[i] <= r.L + r.W) bx[Math.min(NB - 1, Math.floor((px[i] - r.L) / r.W * NB))]++;
      if (py[i] >= r.T && py[i] <= r.T + r.H) by[Math.min(NB - 1, Math.floor((r.T + r.H - py[i]) / r.H * NB))]++; }
    var mxb = Math.max.apply(null, bx.concat([1])), myb = Math.max.apply(null, by.concat([1]));
    ctx.fillStyle = 'rgba(91,164,238,0.5)';
    for (var b = 0; b < NB; b++) { var hx = bx[b] / mxb * 20, hy = by[b] / myb * 24;
      ctx.fillRect(r.L + b * r.W / NB + 0.5, r.T - 6 - hx, r.W / NB - 1, hx); ctx.fillRect(r.L + r.W + 6, r.T + r.H - (b + 1) * r.H / NB + 0.5, hy, r.H / NB - 1); }
  }
  ctx.save(); ctx.beginPath(); ctx.rect(r.L - 2, r.T - 2, r.W + 4, r.H + 4); ctx.clip();
  /* Pareto front */
  if (S.pareto && FRONT.list.length > 1) {
    var fl = FRONT.list.filter(function (d) { return d._m; });
    /* v0.8.0 — the front as one smooth curve through every front design
       (monotone cubic, so it never swings inside the cloud between two of
       them), run out to the plot edges along its end slopes, faded and
       dashed where it is extrapolated. Its shape — a tight knee or an open
       sweep — is what the engineer reads (Matt, 2026-10-10). */
    var fc = paretoCurve(fl.map(function (d) { return [self.px[d._i], self.py[d._i]]; }), paretoDirs());
    if (fc) {
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(200,245,66,0.35)'; ctx.lineWidth = 1.6; ctx.setLineDash([5, 5]);
      ctx.beginPath(); ctx.moveTo(fc.ext[0][0][0], fc.ext[0][0][1]); ctx.lineTo(fc.ext[0][1][0], fc.ext[0][1][1]);
      ctx.moveTo(fc.ext[1][0][0], fc.ext[1][0][1]); ctx.lineTo(fc.ext[1][1][0], fc.ext[1][1][1]); ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = 'rgba(200,245,66,0.8)'; ctx.lineWidth = 2.2; ctx.shadowColor = 'rgba(200,245,66,0.6)'; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.moveTo(fc.p[0][0], fc.p[0][1]);
      fc.seg.forEach(function (c) { ctx.bezierCurveTo(c[0], c[1], c[2], c[3], c[4], c[5]); });
      ctx.stroke();
    }
    ctx.shadowBlur = 0; ctx.lineWidth = 1.4; ctx.strokeStyle = 'rgba(200,245,66,0.75)';
    fl.forEach(function (d) { var i = d._i; ctx.beginPath(); ctx.arc(self.px[i], self.py[i], 6, 0, 6.2832); ctx.stroke(); });
  }
  /* pins, hover */
  if (S.spot) drawSpot(ctx, now, function (d) { return d._m && d._h.has2 ? [self.px[d._i], self.py[d._i]] : null; });   /* v0.9.0 */
  S.pins.forEach(function (d, k) { var i = d._i; if (!d._h.has2) return; ctx.strokeStyle = PIN_COLORS[k]; ctx.lineWidth = 1.6; ctx.strokeRect(self.px[i] - 6, self.py[i] - 6, 12, 12);
    ctx.fillStyle = PIN_COLORS[k]; ctx.font = '700 12px "JetBrains Mono",monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.fillText(String(k + 1), self.px[i], self.py[i] - 11); });
  var hv = this.hover || this.hl;
  if (hv && hv._h.has2) { var ih = hv._i; ctx.strokeStyle = this.hover ? (hv._m ? 'rgba(228,230,242,0.9)' : 'rgba(154,159,183,0.7)') : 'rgba(228,230,242,' + (0.55 + 0.4 * Math.sin(now / 120)).toFixed(3) + ')';
    ctx.lineWidth = 1.3; ctx.setLineDash(hv._m ? [] : [2, 3]); ctx.beginPath(); ctx.arc(this.px[ih], this.py[ih], this.hover ? 8 : 11, 0, 6.2832); ctx.stroke(); ctx.setLineDash([]); }
  /* gap hover */
  if (this.gapHover && this.gapHover.n === 0) { var g = this.gapHover, g0 = this.toS(g.i / GAP.nx, (g.j + 1) / GAP.ny), g1 = this.toS((g.i + 1) / GAP.nx, g.j / GAP.ny);
    ctx.strokeStyle = 'rgba(200,245,66,0.9)'; ctx.setLineDash([3, 3]); ctx.strokeRect(g0[0], g0[1], g1[0] - g0[0], g1[1] - g0[1]); ctx.setLineDash([]); }
  /* target */
  var T0 = F.target;
  if (T0 && T0.kx === kx && T0.ky === ky) {
    var ts = this.toS(sx.f(T0.x), sy.f(T0.y)), ph = pulsePh(now, 2200);
    ctx.strokeStyle = 'rgba(200,245,66,0.9)'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(ts[0], ts[1], 10, 0, 6.2832); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ts[0] - 18, ts[1]); ctx.lineTo(ts[0] - 5, ts[1]); ctx.moveTo(ts[0] + 5, ts[1]); ctx.lineTo(ts[0] + 18, ts[1]);
    ctx.moveTo(ts[0], ts[1] - 18); ctx.lineTo(ts[0], ts[1] - 5); ctx.moveTo(ts[0], ts[1] + 5); ctx.lineTo(ts[0], ts[1] + 18); ctx.stroke();
    ctx.strokeStyle = 'rgba(200,245,66,' + (0.6 * (1 - ph)).toFixed(3) + ')'; ctx.beginPath(); ctx.arc(ts[0], ts[1], 10 + ph * 34, 0, 6.2832); ctx.stroke();
    var near = S.list.filter(function (d) { return isFinite(d._tdist); }).slice(0, 5);
    ctx.setLineDash([2, 4]); ctx.strokeStyle = 'rgba(200,245,66,0.45)'; ctx.lineWidth = 1;
    near.forEach(function (d) { var i = d._i; if (!d._h.has2) return; ctx.beginPath(); ctx.moveTo(ts[0], ts[1]); ctx.lineTo(self.px[i], self.py[i]); ctx.stroke(); });
    ctx.setLineDash([]);
  }
  this.ghosts = S.color === 'aim' ? aimOverlay2D(this, ctx, sx, sy, kx, ky) : [];
  ctx.restore();
  /* selection crosshair with value chips on both axes */
  var sel = S.sel;
  if (sel && sel._h.has2) {
    var i0 = sel._i, X = this.px[i0], Y = this.py[i0];
    if (X >= r.L && X <= r.L + r.W && Y >= r.T && Y <= r.T + r.H) {
      ctx.setLineDash([3, 4]); ctx.strokeStyle = 'rgba(91,164,238,0.55)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(X, r.T + r.H); ctx.moveTo(X, Y); ctx.lineTo(r.L, Y); ctx.stroke(); ctx.setLineDash([]);
      var ph2 = pulsePh(now, 1700); ctx.strokeStyle = 'rgba(91,164,238,' + (1 - ph2).toFixed(3) + ')'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(X, Y, 8 + ph2 * 22, 0, 6.2832); ctx.stroke();
      ctx.strokeStyle = '#5BA4EE'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(X, Y, 9, 0, 6.2832); ctx.stroke();
      ctx.font = '600 12px "JetBrains Mono",monospace';
      var chip = function (txt, cx, cy, al) { var tw = ctx.measureText(txt).width + 12, x0 = al === 'c' ? cx - tw / 2 : cx - tw;
        ctx.fillStyle = '#5BA4EE'; ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x0, cy - 10, tw, 20, 4); else ctx.rect(x0, cy - 10, tw, 20); ctx.fill();
        ctx.fillStyle = '#04101f'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(txt, x0 + tw / 2, cy + 0.5); };
      chip(tickText(kx, sel[kx]), X, r.T + r.H + 17, 'c'); chip(tickText(ky, sel[ky]), r.L - 4, Y, 'r');
    }
  }
  if (this.brush) { var bb = this.brush; ctx.fillStyle = 'rgba(200,245,66,0.06)'; ctx.strokeStyle = 'rgba(200,245,66,0.85)'; ctx.setLineDash([4, 4]); ctx.lineWidth = 1;
    ctx.fillRect(Math.min(bb[0], bb[2]), Math.min(bb[1], bb[3]), Math.abs(bb[2] - bb[0]), Math.abs(bb[3] - bb[1]));
    ctx.strokeRect(Math.min(bb[0], bb[2]), Math.min(bb[1], bb[3]), Math.abs(bb[2] - bb[0]), Math.abs(bb[3] - bb[1])); ctx.setLineDash([]); }
  /* axis pickers (HTML, rebuilt only when the layout or axes change) */
  var key = kx + '|' + ky + '|' + r.L + '|' + r.T + '|' + Math.round(r.W) + '|' + Math.round(r.H) + '|' + F.domain;
  if (key !== this.axKey && this.axEl) {
    this.axKey = key;
    var lab = function (k) { return esc(mLabel(k)) + (plotScale(k).lg ? '<em>log</em>' : ''); };
    this.axEl.innerHTML = '<button class="axchip" data-axis2="x" style="left:' + (r.L + r.W / 2) + 'px;top:' + (r.T + r.H + (m ? 30 : 34)) + 'px;transform:translateX(-50%)" title="Pick the X metric"><i>X</i>' + lab(kx) + gl('chev') + '</button>' +
      '<button class="axchip ax-y" data-axis2="y" style="left:' + (m ? 8 : 12) + 'px;top:' + (r.T + r.H / 2) + 'px" title="Pick the Y metric"><i>Y</i>' + lab(ky) + gl('chev') + '</button>';
  }
};

/* v0.7.1 — colour by aimed run: every run's target as a ghost crosshair
   (a dashed line when the run aimed at only one of the two axes); the
   picked run also shows the seed it started from and the path to its
   cluster. → the ghosts' screen positions, for clicking. */
function aimOverlay2D(P, ctx, sx, sy, kx, ky) {
  var runs = DB.aimRuns || [], out = [], r = P.R;
  runs.forEach(function (R) {
    var mx = R.metrics.filter(function (m) { return m.key === kx; })[0], my = R.metrics.filter(function (m) { return m.key === ky; })[0];
    if (!mx && !my) return;
    var picked = S.aimSel === R.id, faint = S.aimSel && !picked;
    var c = hexRGB(R.color), col = function (a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; };
    ctx.save();
    ctx.setLineDash([4, 4]); ctx.lineWidth = picked ? 1.6 : 1.2; ctx.strokeStyle = col(faint ? 0.25 : picked ? 0.95 : 0.7);
    if (mx && my) {
      var s = P.toS(sx.f(mx.value), sy.f(my.value));
      if (s[0] >= r.L - 20 && s[0] <= r.L + r.W + 20 && s[1] >= r.T - 20 && s[1] <= r.T + r.H + 20) {
        ctx.beginPath(); ctx.arc(s[0], s[1], picked ? 11 : 9, 0, 6.2832); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(s[0] - 16, s[1]); ctx.lineTo(s[0] + 16, s[1]); ctx.moveTo(s[0], s[1] - 16); ctx.lineTo(s[0], s[1] + 16); ctx.stroke();
        out.push({ id: R.id, x: s[0], y: s[1] });
        if (picked) {
          /* the seed, and a path from it to the middle of the run's cluster */
          var pts = R.designs.filter(function (d) { return d._h.has2; }), seedBox = null;
          if (pts.length) {
            var cx = 0, cy = 0; pts.forEach(function (d) { cx += P.px[d._i]; cy += P.py[d._i]; }); cx /= pts.length; cy /= pts.length;
            var sd = R.seed && R.seed._h.has2 ? R.seed : null;
            ctx.setLineDash([]); ctx.strokeStyle = col(0.9); ctx.lineWidth = 1.2;
            ctx.beginPath(); ctx.arc(cx, cy, 4, 0, 6.2832); ctx.stroke();
            if (sd) {
              var qx = P.px[sd._i], qy = P.py[sd._i];
              ctx.strokeStyle = 'rgba(228,230,242,0.85)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(qx, qy, 8, 0, 6.2832); ctx.stroke();
              ctx.setLineDash([3, 4]); ctx.strokeStyle = col(0.8); ctx.lineWidth = 1.3;
              var mxp = (qx + cx) / 2 - (cy - qy) * 0.18, myp = (qy + cy) / 2 + (cx - qx) * 0.18;
              ctx.beginPath(); ctx.moveTo(qx, qy); ctx.quadraticCurveTo(mxp, myp, cx, cy); ctx.stroke();
              /* arrowhead at the cluster */
              var ang = Math.atan2(cy - myp, cx - mxp); ctx.setLineDash([]);
              ctx.beginPath(); ctx.moveTo(cx - 9 * Math.cos(ang - 0.45), cy - 9 * Math.sin(ang - 0.45)); ctx.lineTo(cx, cy); ctx.lineTo(cx - 9 * Math.cos(ang + 0.45), cy - 9 * Math.sin(ang + 0.45)); ctx.stroke();
              var sw = ctx.measureText('seed').width;
              seedBox = { x: qx + 12, y: qy - 8, w: sw + 2, h: 16 };
              ctx.font = '600 12px "JetBrains Mono",monospace'; ctx.fillStyle = 'rgba(228,230,242,0.9)'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
              ctx.fillText('seed', qx + 12, qy);
            }
            /* the hit rate beside the ghost target, on whichever side keeps clear of the seed's label */
            ctx.font = '600 12px "JetBrains Mono",monospace';
            var ht = R.hits + '/' + R.designs.length + ' on target', hw = ctx.measureText(ht).width;
            var spots = [[s[0] + 16, s[1] - 22], [s[0] - 16 - hw, s[1] - 22], [s[0] + 16, s[1] + 8], [s[0] - 16 - hw, s[1] + 8]];
            var clear = function (q) { return !seedBox || q[0] > seedBox.x + seedBox.w + 4 || q[0] + hw < seedBox.x - 4 || q[1] > seedBox.y + seedBox.h + 2 || q[1] + 14 < seedBox.y - 2; };
            var at = spots.filter(clear)[0] || spots[0];
            ctx.fillStyle = col(0.95); ctx.textAlign = 'left'; ctx.textBaseline = 'top';
            ctx.fillText(ht, at[0], at[1]);
          }
        }
      }
    } else {
      /* aimed at one of these axes only: a dashed line at its value */
      ctx.setLineDash([2, 6]);
      if (mx) { var X = P.toS(sx.f(mx.value), 0)[0]; if (X >= r.L && X <= r.L + r.W) { ctx.beginPath(); ctx.moveTo(X, r.T); ctx.lineTo(X, r.T + r.H); ctx.stroke(); } }
      if (my) { var Y = P.toS(0, sy.f(my.value))[1]; if (Y >= r.T && Y <= r.T + r.H) { ctx.beginPath(); ctx.moveTo(r.L, Y); ctx.lineTo(r.L + r.W, Y); ctx.stroke(); } }
    }
    ctx.restore();
  });
  return out;
}

/* Box in 2D → one range filter per axis (a region when an axis isn't a column). */
function applyBrush2D(p) {
  var b = p.brush; if (!b) return;
  var xa = Math.min(b[0], b[2]), xb = Math.max(b[0], b[2]), ya = Math.min(b[1], b[3]), yb = Math.max(b[1], b[3]);
  if (xb - xa < 8 || yb - ya < 8) return;
  var f0 = p.toF(xa, yb), f1 = p.toF(xb, ya), out = [];
  [['x', f0[0], f1[0]], ['y', f0[1], f1[1]]].forEach(function (a) {
    var k = S.ax2[a[0]], sc = plotScale(k), st = DB.stats[k]; if (!st) return;
    F.ranges[k] = [Math.max(st.min, sc.inv(a[1])), Math.min(st.max, sc.inv(a[2]))];
    if (F.rangeKeys.indexOf(k) < 0) F.rangeKeys.push(k);
    out.push(mShort(k) + ' ' + fmtRangeVal(k, F.ranges[k][0]) + '–' + fmtRangeVal(k, F.ranges[k][1]));
  });
  rangesChanged();
  changed('2D box · ' + out.join(' · '), true);
}

/* ── target pin ─────────────────────────────────────────────────────── */
function setTarget(kx, ky, x, y) {
  pulseKick();
  F.target = { kx: kx, ky: ky, x: x, y: y };
  S.sort = { k: '_target', dir: 1 };
  changed('target set', true);
}
function computeTargetDistances() {
  var T = F.target, sx = plotScale(T.kx), sy = plotScale(T.ky), tx = sx.f(T.x), ty = sy.f(T.y);
  for (var i = 0; i < DB.N; i++) { var d = DB.all[i], a = d[T.kx], b = d[T.ky];
    d._tdist = isNum(a) && isNum(b) ? Math.hypot(sx.f(a) - tx, sy.f(b) - ty) : Infinity; }
}
function targetCloseness(d) { return F.target && isFinite(d._tdist) ? clamp(1 - d._tdist / 0.35, 0, 1) : null; }
var TARGET_FAR = 0.07;   /* nearest design farther than this (plot fraction) = a gap */

/* ── Pareto front over the lit designs on the current 2D axes ───────── */
var FRONT = { list: [], key: '' };
function paretoDirs() {
  if (S.pareto && S.pareto !== 'auto') return { x: S.pareto.indexOf('xhi') >= 0 ? 1 : -1, y: S.pareto.indexOf('yhi') >= 0 ? 1 : -1 };
  var g = DOMAIN_GOALS[F.domain] || DOMAIN_GOALS.all, gx = g[S.ax2.x], gy = g[S.ax2.y];
  return { x: gx != null ? gx : (S.ax2.x === 'volume_fraction' ? -1 : 1), y: gy != null ? gy : 1 };
}
/* The front's curve in screen space: points sorted along x (designs within
   1.5 px merged, keeping the one farther out), a monotone cubic Hermite
   (Fritsch–Carlson) through them as Bézier segments, and the two end
   extensions to the plot rectangle. Null for fewer than two points. */
function paretoCurve(pts, dir) {
  var P = pts.filter(function (q) { return isFinite(q[0]) && isFinite(q[1]); }).sort(function (a, b) { return a[0] - b[0]; });
  var outY = function (a, b) { return dir.y > 0 ? Math.min(a, b) : Math.max(a, b); };   /* screen y grows downward */
  var M = [];
  P.forEach(function (q) { var l = M[M.length - 1]; if (l && q[0] - l[0] < 1.5) l[1] = outY(l[1], q[1]); else M.push([q[0], q[1]]); });
  var n = M.length; if (n < 2) return null;
  var h = [], dl = [], m = new Array(n);
  for (var i = 0; i < n - 1; i++) { h[i] = M[i + 1][0] - M[i][0]; dl[i] = (M[i + 1][1] - M[i][1]) / h[i]; }
  m[0] = dl[0]; m[n - 1] = dl[n - 2];
  for (var k = 1; k < n - 1; k++) {
    if (dl[k - 1] * dl[k] <= 0) { m[k] = 0; continue; }
    var w1 = 2 * h[k] + h[k - 1], w2 = h[k] + 2 * h[k - 1];
    m[k] = (w1 + w2) / (w1 / dl[k - 1] + w2 / dl[k]);
  }
  var seg = [];
  for (var j = 0; j < n - 1; j++) seg.push([M[j][0] + h[j] / 3, M[j][1] + m[j] * h[j] / 3, M[j + 1][0] - h[j] / 3, M[j + 1][1] - m[j + 1] * h[j] / 3, M[j + 1][0], M[j + 1][1]]);
  /* end extensions: along the end slope until the plot edge (or 2000 px) */
  var ext = function (q, slope, sgn) {
    var len = 2000, dx = sgn / Math.sqrt(1 + slope * slope), dy = slope * dx;
    return [q, [q[0] + dx * len, q[1] + dy * len]];
  };
  return { p: M, seg: seg, ext: [ext(M[0], m[0], -1), ext(M[n - 1], m[n - 1], 1)] };
}
function computeFront() {
  FRONT.list = []; if (!S.pareto) return;
  var dir = paretoDirs(), kx = S.ax2.x, ky = S.ax2.y;
  var c = S.list.filter(function (d) { return isNum(d[kx]) && isNum(d[ky]); });
  c.sort(function (a, b) { return (a[kx] - b[kx]) * -dir.x || (b[ky] - a[ky]) * dir.y; });
  var best = -Infinity;
  c.forEach(function (d) { var y = d[ky] * dir.y; if (y > best) { FRONT.list.push(d); best = y; } });
}

/* ── gap map: where the whole Vault has designs on these axes ───────── */
var GAP = { nx: 40, ny: 28, grid: null, inside: null, max: 0 };
function computeGapGrid() {
  if (!S.gap) { GAP.grid = null; return; }
  var nx = GAP.nx, ny = GAP.ny, G = new Uint32Array(nx * ny), mx = 0;
  for (var i = 0; i < DB.N; i++) { var h = DB.all[i]._h; if (!h.has2) continue;
    var a = Math.floor(h.tu * nx), b = Math.floor(h.tv * ny); if (a < 0 || b < 0 || a >= nx || b >= ny) continue;
    var q = ++G[b * nx + a]; if (q > mx) mx = q; }
  /* "inside" = an empty cell with occupied cells on both sides in x and in y — a hole, not the outskirts */
  var inside = new Uint8Array(nx * ny);
  for (var y = 0; y < ny; y++) for (var x = 0; x < nx; x++) {
    if (G[y * nx + x]) continue;
    var l = false, r = false, u = false, d = false, k;
    for (k = x - 1; k >= 0; k--) if (G[y * nx + k]) { l = true; break; }
    for (k = x + 1; k < nx; k++) if (G[y * nx + k]) { r = true; break; }
    for (k = y - 1; k >= 0; k--) if (G[k * nx + x]) { d = true; break; }
    for (k = y + 1; k < ny; k++) if (G[k * nx + x]) { u = true; break; }
    inside[y * nx + x] = (l && r && u && d) ? 1 : 0;
  }
  GAP.grid = G; GAP.inside = inside; GAP.max = mx;
}
