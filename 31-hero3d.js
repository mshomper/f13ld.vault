/* ============================================================
   F13LD.vault · 31-hero3d.js
   The 3D design space. Axes are percentile ranks of any metric (default:
   stiffness efficiency × anisotropy × the domain score), so the cloud
   always fills the cube; ticks read low / median / high.

   Controls: drag orbits · Ctrl, right or middle drag pans · wheel zooms
   · Shift-drag (or the Brush tool) boxes a region into a filter · click
   picks · double-click resets. Touch: one finger orbits, two pinch-zoom
   and pan, tap picks.
   Points are drawn by PointLayer (WebGL); this file owns the camera, the
   overlay (cube, axes, rings, brush) and picking.
   ============================================================ */

var HERO_YAW = -0.62, HERO_PITCH = -0.36, HERO_DST = 4.6;

function Hero3D(host, mobile) {
  this.host = host; this.mobile = mobile;
  this.gcv = host.querySelector('.v-gl'); this.ocv = host.querySelector('.v-ov');
  this.pts = new PointLayer(this.gcv, 0); this.octx = this.ocv.getContext('2d');
  this.yaw = HERO_YAW; this.pitch = HERO_PITCH; this.yawT = null; this.pitchT = null;
  this.zoom = mobile ? 0.9 : 1; this.zT = this.zoom; this.c = [0, 0, 0]; this.cT = [0, 0, 0];
  this.inset = 0; this.insetT = 0; this.S0 = 200; this.cx = 0; this.cy = 0;
  this.hover = null; this.hl = null; this.drag = null; this.brush = null; this.ptr = new Map(); this.lastInt = -1e9;
  this.sx = new Float32Array(0); this.sy = new Float32Array(0); this.sz = new Float32Array(0); this.projOK = false;
  this.dirty = true; this.link = null;
  this.bind();
}
Hero3D.prototype.visible = function () { return this.host.offsetWidth > 0 && this.host.offsetHeight > 0; };
Hero3D.prototype.local = function (e) { var r = this.ocv.getBoundingClientRect(), k = this.ocv.offsetWidth / (r.width || 1); return [(e.clientX - r.left) * k, (e.clientY - r.top) * k]; };

Hero3D.prototype.bind = function () {
  var cv = this.ocv, self = this;
  cv.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  cv.addEventListener('pointerdown', function (e) {
    var p = self.local(e); try { cv.setPointerCapture(e.pointerId); } catch (x) { /* synthetic events */ }
    self.ptr.set(e.pointerId, p); self.lastInt = performance.now(); self.yawT = self.pitchT = null;
    if (self.ptr.size === 2) { var q = Array.from(self.ptr.values()); self.pinch = { d0: Math.hypot(q[0][0] - q[1][0], q[0][1] - q[1][1]), z0: self.zT, m0: [(q[0][0] + q[1][0]) / 2, (q[0][1] + q[1][1]) / 2], c0: self.cT.slice() }; self.drag = null; return; }
    var pan = e.ctrlKey || e.metaKey || e.button === 1 || e.button === 2;
    self.drag = { x0: p[0], y0: p[1], yaw0: self.yaw, pitch0: self.pitch, c0: self.cT.slice(), moved: false,
                  mode: pan ? 'pan' : (!self.mobile && (S.tool === 'brush' || e.shiftKey)) ? 'brush' : 'orbit', add: e.altKey };
    if (pan) e.preventDefault();
  });
  cv.addEventListener('pointermove', function (e) {
    var p = self.local(e);
    if (self.ptr.has(e.pointerId)) self.ptr.set(e.pointerId, p);
    if (self.pinch && self.ptr.size === 2) {
      var q = Array.from(self.ptr.values()), pc = self.pinch, dd = Math.hypot(q[0][0] - q[1][0], q[0][1] - q[1][1]);
      self.zT = self.zoom = clamp(pc.z0 * dd / (pc.d0 || 1), 0.55, 3);
      self.panBy(pc.c0, (q[0][0] + q[1][0]) / 2 - pc.m0[0], (q[0][1] + q[1][1]) / 2 - pc.m0[1]); self.dirty = true; return;
    }
    var g = self.drag;
    if (!g) {
      if (!self.mobile) {
        var h = self.pick(p[0], p[1], 14, true);
        if (h !== self.hover) { self.hover = h; if (self.link) { self.link.hl = h; self.link.dirty = true; } self.dirty = true; }
        showTip(h, p[0] + self.host.offsetLeft, p[1] + self.host.offsetTop, self.host.closest('.p-hero'));
        cv.style.cursor = h ? 'pointer' : (S.tool === 'brush' ? 'crosshair' : 'grab');
      }
      return;
    }
    var dx = p[0] - g.x0, dy = p[1] - g.y0; if (Math.hypot(dx, dy) > 4) g.moved = true; self.lastInt = performance.now(); self.dirty = true;
    if (g.mode === 'brush') { self.brush = [g.x0, g.y0, p[0], p[1]]; return; }
    if (g.mode === 'pan') { self.panBy(g.c0, dx, dy); cv.style.cursor = 'move'; return; }
    self.yaw = g.yaw0 + dx * 0.008; self.pitch = clamp(g.pitch0 - dy * 0.006, -1.35, 0.55);
    if (g.moved && self.hover) { self.hover = null; showTip(null); }
  });
  function up(e) {
    self.ptr.delete(e.pointerId); if (self.ptr.size < 2) self.pinch = null;
    var g = self.drag; self.drag = null; if (!g) return;
    var p = self.local(e);
    if (g.mode === 'brush') { applyBrush3D(self, g.add); self.brush = null; self.dirty = true; return; }
    var tUp = performance.now(), second = !g.moved && tUp - (self._lastUp || -1e9) < 320; if (!g.moved) self._lastUp = second ? -1e9 : tUp;   /* 2nd click of a double-click resets, never picks */
    if (!g.moved && !self._dbl && !second) { var d = self.pick(p[0], p[1], self.mobile ? 26 : 14, false); if (d) select(d, 'hero'); }
  }
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  cv.addEventListener('pointerleave', function () { if (!self.drag && self.hover) { self.hover = null; showTip(null); if (self.link) { self.link.hl = null; self.link.dirty = true; } self.dirty = true; } });
  cv.addEventListener('wheel', function (e) { e.preventDefault(); self.zT = clamp(self.zT * (1 - e.deltaY * 0.0012), 0.55, 3); self.lastInt = performance.now(); self.dirty = true; }, { passive: false });
  /* double-click resets; the second click must not also pick */
  cv.addEventListener('dblclick', function () { self._dbl = true; setTimeout(function () { self._dbl = false; }, 300); self.reset(); });
};
/* Pan in the view plane, scaled so the cloud follows the pointer. */
Hero3D.prototype.panBy = function (c0, dx, dy) {
  var k = 1 / (this.S0 || 200), cy = Math.cos(this.yaw), sy = Math.sin(this.yaw), cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
  var r = [cy, 0, -sy], u = [sp * sy, cp, sp * cy];
  for (var i = 0; i < 3; i++) this.cT[i] = this.c[i] = clamp(c0[i] - (dx * r[i] - dy * u[i]) * k, -2.5, 2.5);
};
Hero3D.prototype.reset = function () {
  this.cT = [0, 0, 0]; this.zT = this.mobile ? 0.9 : 1;
  this.yawT = this.yaw + angDelta(this.yaw, HERO_YAW); this.pitchT = HERO_PITCH; this.dirty = true;
};
Hero3D.prototype.focus = function (d) {
  var h = d._h; this.cT = [h.tx * 0.55, h.ty * 0.55, h.tz * 0.55];
  this.zT = Math.max(this.zT, this.mobile ? 1.15 : 1.3); this.lastInt = performance.now(); this.dirty = true;
};
/* Screen position of every design (CPU, same maths as the shader). */
Hero3D.prototype.project = function () {
  var N = DB.N;
  if (this.sx.length !== N) { this.sx = new Float32Array(N); this.sy = new Float32Array(N); this.sz = new Float32Array(N); }
  var cyw = Math.cos(this.yaw), syw = Math.sin(-this.yaw), cp = Math.cos(this.pitch), sp = Math.sin(-this.pitch), c = this.c;
  for (var i = 0; i < N; i++) {
    var h = DB.all[i]._h, x = h.x - c[0], y = h.y - c[1], z = h.z - c[2];
    var x1 = x * cyw + z * syw, z1 = -x * syw + z * cyw, y2 = y * cp - z1 * sp, z2 = y * sp + z1 * cp, pp = HERO_DST / (HERO_DST - z2);
    this.sx[i] = this.cx + x1 * this.S0 * pp; this.sy[i] = this.cy - y2 * this.S0 * pp; this.sz[i] = z2;
  }
  this.projOK = true;
};
Hero3D.prototype.proj = function (x, y, z) {
  var c = this.c; x -= c[0]; y -= c[1]; z -= c[2];
  var cyw = Math.cos(this.yaw), syw = Math.sin(-this.yaw), cp = Math.cos(this.pitch), sp = Math.sin(-this.pitch);
  var x1 = x * cyw + z * syw, z1 = -x * syw + z * cyw, y2 = y * cp - z1 * sp, z2 = y * sp + z1 * cp, pp = HERO_DST / (HERO_DST - z2);
  return [this.cx + x1 * this.S0 * pp, this.cy - y2 * this.S0 * pp, z2];
};
/* Pick the nearest design under the pointer. Dimmed designs can be hovered
   (the tooltip says which filter hides them) but a click only picks lit ones. */
Hero3D.prototype.pick = function (x, y, r, includeDim) {
  if (!this.projOK) return null;
  var best = null, bd = r * r, bz = -1e9;
  for (var i = 0; i < DB.N; i++) {
    var d = DB.all[i]; if (!d._m && !includeDim) continue; if (d._h.a < 0.2) continue;
    var dx = this.sx[i] - x, dy = this.sy[i] - y, q = dx * dx + dy * dy, w = d._m ? q : q * 2.2;
    if (w < bd || (w < bd * 1.15 && this.sz[i] > bz)) { bd = w; best = d; bz = this.sz[i]; }
  }
  return best;
};
Hero3D.prototype.step = function (now, dt, moving) {
  var busy = moving;
  if (S.alive && !this.drag && now - this.lastInt > 2600 && this.yawT === null) { this.yaw += dt * 0.00008; busy = true; }
  if (this.yawT !== null) { this.yaw += (this.yawT - this.yaw) * 0.1; this.pitch += (this.pitchT - this.pitch) * 0.1; busy = true;
    if (Math.abs(this.yawT - this.yaw) < 0.002 && Math.abs(this.pitchT - this.pitch) < 0.002) { this.yaw = this.yawT; this.yawT = this.pitchT = null; } }
  for (var k = 0; k < 3; k++) { var dc = this.cT[k] - this.c[k]; if (Math.abs(dc) > 1e-4) { this.c[k] += dc * 0.08; busy = true; } }
  if (Math.abs(this.zT - this.zoom) > 1e-4) { this.zoom += (this.zT - this.zoom) * 0.08; busy = true; }
  if (Math.abs(this.insetT - this.inset) > 0.5) { this.inset += (this.insetT - this.inset) * 0.14; busy = true; }
  return busy;
};
Hero3D.prototype.frame = function (now, dt, moving) {
  if (!this.visible()) return;
  var busy = this.step(now, dt, moving);
  var w = this.ocv.clientWidth, h = this.ocv.clientHeight, dpr = Math.min(window.devicePixelRatio || 1, 2);
  /* keep the cube between the tool row (top) and the axis chips (bottom) */
  var top = this.mobile ? 96 : 46, bot = this.mobile ? 0 : (this.host.classList.contains('hint-on') ? 74 : 48);
  var avail = Math.max(140, h - this.inset - top - bot);
  this.S0 = Math.min(w * 0.92, avail) * (this.mobile ? 0.3 : 0.34) * this.zoom; this.cx = w / 2; this.cy = top + avail / 2;
  this.safe = [top - 34, h - this.inset - bot + 10];
  var overlayLive = (!!S.sel && pulseOn(now)) || !!this.hl || !!this.brush;
  if (!busy && !this.dirty && !overlayLive) return;
  if (busy || this.dirty) {
    this.pts.fill(function (hh) { return [hh.x, hh.y, hh.z]; });
    this.pts.draw({ dpr: dpr, c: this.c, yaw: this.yaw, pitch: this.pitch, S0: this.S0, dst: HERO_DST, cx: this.cx, cy: this.cy });
    this.project();
  }
  this.drawOverlay(now, w, h, dpr);
  this.dirty = false;
};
Hero3D.prototype.drawOverlay = function (now, w, h, dpr) {
  var cv = this.ocv, ctx = this.octx, W = Math.round(w * dpr), H = Math.round(h * dpr), self = this;
  if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
  if (!DB.N) return;
  var P = function (x, y, z) { return self.proj(x, y, z); };
  ctx.lineWidth = 1;
  for (var i = 0; i <= 4; i++) {
    var t = -1 + i * 0.5, a = P(t, -1, -1), b = P(t, -1, 1); ctx.strokeStyle = 'rgba(91,164,238,0.06)';
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    a = P(-1, -1, t); b = P(1, -1, t); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
  }
  var CN = [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]].map(function (p) { return P(p[0], p[1], p[2]); });
  [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]].forEach(function (e) {
    var z = (CN[e[0]][2] + CN[e[1]][2]) / 2; ctx.strokeStyle = 'rgba(154,159,183,' + (0.07 + 0.08 * (z + 1.7) / 3.4).toFixed(3) + ')';
    ctx.beginPath(); ctx.moveTo(CN[e[0]][0], CN[e[0]][1]); ctx.lineTo(CN[e[1]][0], CN[e[1]][1]); ctx.stroke();
  });
  /* axes from the origin corner, with rank ticks (low · median · high).
     Every label goes through place(): it is skipped when it would collide
     with one already drawn or leave the safe band, and gets a dark halo so it
     reads over the points. The axis names live in the chips below. */
  var occ = [], safe = this.safe || [0, h];
  function place(txt, x, y, font, col) {
    ctx.font = font; var tw = ctx.measureText(txt).width, b = [x - tw / 2 - 3, y - 8, x + tw / 2 + 3, y + 8];
    if (b[1] < safe[0] || b[3] > safe[1] || b[0] < 4 || b[2] > w - 4) return false;
    for (var k = 0; k < occ.length; k++) { var o = occ[k]; if (b[0] < o[2] && b[2] > o[0] && b[1] < o[3] && b[3] > o[1]) return false; }
    occ.push(b); ctx.lineJoin = 'round'; ctx.lineWidth = 3.5; ctx.strokeStyle = 'rgba(6,8,15,0.88)'; ctx.strokeText(txt, x, y);
    ctx.fillStyle = col; ctx.fillText(txt, x, y); return true;
  }
  var AX = [['x', [1, 0, 0]], ['y', [0, 1, 0]], ['z', [0, 0, 1]]], ends = {};
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  AX.forEach(function (ax) {
    var dir = ax[1], o = CN[0], e = P(-1 + 2.22 * dir[0], -1 + 2.22 * dir[1], -1 + 2.22 * dir[2]); ends[ax[0]] = e;
    ctx.strokeStyle = 'rgba(200,245,66,0.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(o[0], o[1]); ctx.lineTo(e[0], e[1]); ctx.stroke();
  });
  AX.forEach(function (ax) { var e = ends[ax[0]]; place(ax[0].toUpperCase(), e[0], e[1], '700 13px "Exo 2",sans-serif', 'rgba(200,245,66,0.98)'); });
  if (!this.mobile) {
    /* high first: it sits away from the crowded origin corner */
    [['high', 0.94], ['median', 0.5], ['low', 0.06]].forEach(function (tk) {
      AX.forEach(function (ax) {
        var f = -1 + 2 * tk[1], q = ax[0] === 'x' ? P(f, -1.16, -1) : ax[0] === 'y' ? P(-1.18, f, -1) : P(-1.16, -1, f);
        place(tk[0], q[0], q[1], '500 12px "JetBrains Mono",monospace', 'rgba(154,159,183,0.8)');
      });
    });
  }
  ctx.lineWidth = 1;
  if (!this.projOK) return;
  var sx = this.sx, sy = this.sy, sel = S.sel;
  if (sel && sel._m) {
    var i0 = sel._i;
    ctx.setLineDash([2, 4]); ctx.lineWidth = 1;
    S.near.forEach(function (n) { var j = n._i; if (!n._m) return; var gr = ctx.createLinearGradient(sx[i0], sy[i0], sx[j], sy[j]);
      gr.addColorStop(0, 'rgba(91,164,238,0.7)'); gr.addColorStop(1, 'rgba(91,164,238,0.1)'); ctx.strokeStyle = gr;
      ctx.beginPath(); ctx.moveTo(sx[i0], sy[i0]); ctx.lineTo(sx[j], sy[j]); ctx.stroke();
      ctx.beginPath(); ctx.arc(sx[j], sy[j], 5, 0, 6.2832); ctx.strokeStyle = 'rgba(91,164,238,0.45)'; ctx.stroke(); });
    ctx.setLineDash([]);
    var ph = pulsePh(now, 1700); ctx.strokeStyle = 'rgba(91,164,238,' + (1 - ph).toFixed(3) + ')'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(sx[i0], sy[i0], 8 + ph * 26, 0, 6.2832); ctx.stroke();
    ctx.strokeStyle = '#5BA4EE'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(sx[i0], sy[i0], 9 + (pulseOn(now) ? 1.5 * Math.sin(now / 260) : 0), 0, 6.2832); ctx.stroke();
    if (!this.mobile && S.near.length) { ctx.textAlign = 'center'; var nt = S.near.length + ' nearest', nx = sx[i0] + 52, ny = sy[i0] - 18;
      if (!place(nt, nx, ny, '500 12px "JetBrains Mono",monospace', 'rgba(169,205,245,0.95)')) place(nt, sx[i0] - 52, sy[i0] + 20, '500 12px "JetBrains Mono",monospace', 'rgba(169,205,245,0.95)'); }
  }
  S.pins.forEach(function (d, k) { var i = d._i; ctx.strokeStyle = PIN_COLORS[k]; ctx.lineWidth = 1.6; ctx.strokeRect(sx[i] - 6, sy[i] - 6, 12, 12);
    ctx.fillStyle = PIN_COLORS[k]; ctx.font = '700 12px "JetBrains Mono",monospace'; ctx.textAlign = 'center'; ctx.fillText(String(k + 1), sx[i], sy[i] - 15); });
  var hh = this.hover || this.hl;
  if (hh) { var ih = hh._i; ctx.strokeStyle = this.hover ? (hh._m ? 'rgba(228,230,242,0.9)' : 'rgba(154,159,183,0.7)') : 'rgba(228,230,242,' + (0.55 + 0.4 * Math.sin(now / 120)).toFixed(3) + ')';
    ctx.lineWidth = 1.3; ctx.setLineDash(hh._m ? [] : [2, 3]); ctx.beginPath(); ctx.arc(sx[ih], sy[ih], this.hover ? 8 : 11, 0, 6.2832); ctx.stroke(); ctx.setLineDash([]); }
  if (this.brush) { var b = this.brush; ctx.fillStyle = 'rgba(200,245,66,0.06)'; ctx.strokeStyle = 'rgba(200,245,66,0.85)'; ctx.setLineDash([4, 4]);
    ctx.fillRect(Math.min(b[0], b[2]), Math.min(b[1], b[3]), Math.abs(b[2] - b[0]), Math.abs(b[3] - b[1]));
    ctx.strokeRect(Math.min(b[0], b[2]), Math.min(b[1], b[3]), Math.abs(b[2] - b[0]), Math.abs(b[3] - b[1])); ctx.setLineDash([]); }
};

/* Brush in 3D → a region filter over every design inside the box on screen
   (lit or dimmed), so loosening another filter later brings them back. */
function applyBrush3D(view, add) {
  var b = view.brush; if (!b) return;
  var x0 = Math.min(b[0], b[2]), x1 = Math.max(b[0], b[2]), y0 = Math.min(b[1], b[3]), y1 = Math.max(b[1], b[3]);
  if (x1 - x0 < 8 || y1 - y0 < 8) return;
  var ids = [];
  for (var i = 0; i < DB.N; i++) if (view.sx[i] >= x0 && view.sx[i] <= x1 && view.sy[i] >= y0 && view.sy[i] <= y1) ids.push(DB.all[i]._id);
  if (!ids.length) { toast('No designs inside that box'); return; }
  F.region = (add && F.region) ? Array.from(new Set(F.region.concat(ids))) : ids;
  changed('3D region · ' + F.region.length + ' designs', true);
}

/* Rank positions for the 3D axes. */
function setAxesTargets3D() {
  var px = pctOf(S.ax3.x), py = pctOf(S.ax3.y), pz = pctOf(S.ax3.z);
  for (var i = 0; i < DB.N; i++) {
    var h = DB.all[i]._h;
    h.tx = (isNaN(px[i]) ? 0 : px[i] - 0.5) * 2; h.ty = (isNaN(py[i]) ? 0 : py[i] - 0.5) * 2; h.tz = (isNaN(pz[i]) ? 0 : pz[i] - 0.5) * 2;
  }
  markViewsDirty();
}
