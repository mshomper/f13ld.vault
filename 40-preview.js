/* ============================================================
   F13LD.vault · 40-preview.js
   Geometry previews from each design's stored recipe.

   Fields are baked by worker/bake-worker.js (F13LD.sweep's geom/ code),
   uploaded as a 3D texture and raymarched with the shared F13LD-SHADE
   lighting — the same shader path as F13LD.sweep's inspector, with a
   transparent background and optional cell tiling.

   Thumbnails: only cards on screen are baked (IntersectionObserver), a
   pool of workers bakes in parallel, each finished image is kept (about
   THUMB_LRU in memory, every one in IndexedDB) so it is drawn once and
   shown instantly after that. Only the inspector renders live.
   ============================================================ */

var PV = { ok: false, gl: null, cv: null, prog: null, u: null, tex: null, SZ: 512, view: null, lost: false,
           workers: [], idle: [], queue: [], jobs: new Map(), fields: new Map(),
           thumbs: new Map(), idb: null, stat: { baked: 0, bakeMs: 0, rendered: 0, fromCache: 0, failed: 0 } };

var PV_VERT = '#version 300 es\nin vec2 p;void main(){gl_Position=vec4(p,0.0,1.0);}';
function pvFrag() {
  return [
    '#version 300 es',
    'precision highp float;precision highp sampler3D;',
    'out vec4 fragColor;',
    'uniform vec2 res;uniform mat3 rot;uniform float zoom;uniform float uCells;',
    'uniform sampler3D uField;uniform float uLip;uniform vec3 uHalf;uniform vec3 uColor;uniform float uStep;',
    'float fieldAt(vec3 p){return texture(uField,(p/uHalf*0.5+0.5)*uCells).r;}',
    'float boxSDF(vec3 p){vec3 d=abs(p)-uHalf;return length(max(d,0.0))+min(max(d.x,max(d.y,d.z)),0.0);}',
    'float implicitD(vec3 p){return -fieldAt(p)/(uLip*uCells);}',
    'float sceneSDF(vec3 p){return max(implicitD(p),boxSDF(p));}',
    'float f13Map(vec3 p){return sceneSDF(p);}',
    F13_SHADE_GLSL,
    'vec3 nrm(vec3 p,float e){return normalize(vec3(sceneSDF(p+vec3(e,0,0))-sceneSDF(p-vec3(e,0,0)),sceneSDF(p+vec3(0,e,0))-sceneSDF(p-vec3(0,e,0)),sceneSDF(p+vec3(0,0,e))-sceneSDF(p-vec3(0,0,e))));}',
    'void main(){',
    '  vec2 uv=(gl_FragCoord.xy-res*0.5)/min(res.x,res.y);',
    '  vec3 ro=rot*vec3(0.0,0.0,zoom);',
    '  vec3 rd=normalize(rot*vec3(uv.x,uv.y,-1.6));',
    '  vec3 iv=vec3(1.0)/rd;',
    '  vec3 tb=(-uHalf-ro)*iv,tt=(uHalf-ro)*iv;',
    '  vec3 tmi=min(tb,tt),tma=max(tb,tt);',
    '  float tEn=max(max(tmi.x,tmi.y),tmi.z);float tEx=min(min(tma.x,tma.y),tma.z);',
    '  if(tEn>tEx||tEx<0.0){fragColor=vec4(0.0);return;}',
    '  float t=max(tEn,0.001);bool hit=false;float thr=uStep*0.15;',
    '  for(int i=0;i<320;i++){',
    '    vec3 p=ro+rd*t;float d=sceneSDF(p);',
    '    if(d<thr){hit=true;break;}',
    '    if(t>tEx+0.01)break;',
    '    t+=clamp(d,uStep*0.25,uStep*3.0);',
    '  }',
    '  if(!hit){',
    '    vec3 pc=ro+rd*tEn,ep=abs(pc)/uHalf;',
    '    vec2 fp;if(ep.x>ep.y&&ep.x>ep.z)fp=ep.yz;else if(ep.y>ep.z)fp=ep.xz;else fp=ep.xy;',
    '    float ed=min(1.0-fp.x,1.0-fp.y);',
    '    if(ed<0.035){float w=(1.0-smoothstep(0.004,0.035,ed));fragColor=vec4(0.78,0.96,0.26,w*0.35);return;}',
    '    fragColor=vec4(0.0);return;',
    '  }',
    '  vec3 pos=ro+rd*t;',
    '  vec3 n=nrm(pos,uStep*0.5);',
    '  if(dot(n,-rd)<0.0)n=-n;',
    '  bool isCut=implicitD(pos)<sceneSDF(pos)-1e-4;',
    '  vec3 col=f13Shade(uColor,pos,n,rd,rot,isCut,2.0,uStep*0.5,1.6);',
    '  fragColor=vec4(clamp(col,0.0,1.0),1.0);',
    '}'].join('\n');
}
var PV_FAMILY_COLOR = { tpms: [0.369, 0.792, 0.647], noise: [0.918, 0.439, 0.314], grain: [0.659, 0.647, 0.604], beam: [0.722, 0.812, 0.314],
                        foam: [0.910, 0.831, 0.635], wave: [0.851, 0.467, 0.024], bundle: [0.482, 0.310, 0.620] };
var PV_PERIODIC = { tpms: 1, beam: 1, foam: 1 };

function pvInit() {
  try {
    var cv = document.createElement('canvas'); cv.width = cv.height = PV.SZ;
    var gl = cv.getContext('webgl2', { preserveDrawingBuffer: true, premultipliedAlpha: false, alpha: true, antialias: false });
    if (!gl) return false;
    cv.addEventListener('webglcontextlost', function (e) { e.preventDefault(); PV.ok = false; PV.lost = true; });
    cv.addEventListener('webglcontextrestored', function () { PV.lost = false; PV.gl = null; pvInitGL(cv); });
    return pvInitGL(cv);
  } catch (e) { console.warn('[F13LD.vault] preview init:', e); return false; }
}
function pvInitGL(cv) {
  var gl = cv.getContext('webgl2'); if (!gl) return false;
  function mk(t, src) { var s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.error('[F13LD.vault] preview shader:', gl.getShaderInfoLog(s)); return null; } return s; }
  var vs = mk(gl.VERTEX_SHADER, PV_VERT), fs = mk(gl.FRAGMENT_SHADER, pvFrag()); if (!vs || !fs) return false;
  var p = gl.createProgram(); gl.attachShader(p, vs); gl.attachShader(p, fs); gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { console.error('[F13LD.vault] preview link:', gl.getProgramInfoLog(p)); return false; }
  gl.useProgram(p);
  var b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(p, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  PV.u = {}; ['res', 'rot', 'zoom', 'uField', 'uLip', 'uHalf', 'uColor', 'uStep', 'uCells'].forEach(function (n) { PV.u[n] = gl.getUniformLocation(p, n); });
  PV.gl = gl; PV.cv = cv; PV.prog = p; PV.tex = gl.createTexture(); PV.texKey = null;
  if (!PV.view && typeof f13ViewInit === 'function') PV.view = f13ViewInit({ tool: 'vault' });   /* default shading; no menu */
  PV.ok = true; return true;
}

/* ── workers ─────────────────────────────────────────────────────────── */
function pvWorkers() {
  if (PV.workers.length || PV.noWorkers || typeof Worker === 'undefined') return;
  var n = clamp((navigator.hardwareConcurrency || 4) - 2, 1, 4);
  for (var i = 0; i < n; i++) {
    try {
      var w = new Worker('worker/bake-worker.js'); w._job = null;
      w.onmessage = pvOnBaked.bind(null, w);
      w.onerror = function (e) {
        /* a worker that cannot load (say a geom/ file 404s) fails its job and leaves the pool, so nothing waits forever */
        console.warn('[F13LD.vault] bake worker:', e.message); if (e.preventDefault) e.preventDefault();
        var me = this, job = me._job; me._job = null;
        PV.workers = PV.workers.filter(function (x) { return x !== me; }); PV.idle = PV.idle.filter(function (x) { return x !== me; });
        try { me.terminate(); } catch (er) { /* already gone */ }
        if (job) { PV.jobs.delete(job.key); PV.stat.failed = (PV.stat.failed || 0) + 1; job.rej(new Error('worker failed')); }
        if (!PV.workers.length) { PV.queue.splice(0).forEach(function (j) { PV.jobs.delete(j.key); j.rej(new Error('no preview workers')); }); PV.noWorkers = true; }
        else pvPump();
      };
      PV.workers.push(w); PV.idle.push(w);
    } catch (e) { console.warn('[F13LD.vault] no workers (open the page over http, not file://):', e.message); break; }
  }
}
function pvKey(d, N) { return d._id + ':' + N; }
/* Bake a design's field; resolves with {N,data,lip,family,half}. */
function pvBake(d, N, front) {
  var key = pvKey(d, N);
  pvWorkers(); if (!PV.workers.length) return Promise.reject(new Error('no preview workers'));
  if (PV.fields.has(key)) { var f = PV.fields.get(key); PV.fields.delete(key); PV.fields.set(key, f); return Promise.resolve(f); }
  if (PV.jobs.has(key)) { var j = PV.jobs.get(key); if (front) { PV.queue = PV.queue.filter(function (x) { return x !== j; }); if (!j.sent) PV.queue.unshift(j); } return j.promise; }
  var job = { key: key, d: d, N: N, sent: false, t0: 0 };
  job.promise = new Promise(function (res, rej) { job.res = res; job.rej = rej; });
  PV.jobs.set(key, job);
  if (front) PV.queue.unshift(job); else PV.queue.push(job);
  pvPump();
  return job.promise;
}
function pvPump() {
  pvWorkers();
  while (PV.idle.length && PV.queue.length) {
    var job = PV.queue.shift(), w = PV.idle.pop();
    job.sent = true; job.t0 = performance.now(); w._job = job;
    w.postMessage({ type: 'bake', key: job.key, recipe: job.d.recipe, N: job.N });
  }
}
function pvOnBaked(w, e) {
  var m = e.data, job = w._job; w._job = null; PV.idle.push(w);
  if (job) PV.jobs.delete(job.key);
  if (m.type === 'baked' && job) {
    PV.stat.baked++; PV.stat.bakeMs += performance.now() - job.t0;
    var f = { N: m.N, data: m.data, lip: m.lip, family: m.family, half: m.half };
    PV.fields.set(job.key, f); while (PV.fields.size > 14) PV.fields.delete(PV.fields.keys().next().value);
    job.res(f);
  } else if (job) { PV.stat.failed++; job.rej(new Error(m.message || 'bake failed')); }
  pvPump();
}
/* Drop queued (not yet started) thumbnail bakes no longer wanted. */
function pvCancel(pred) {
  PV.queue = PV.queue.filter(function (j) { if (!j.sent && j.thumb && pred(j.d)) { PV.jobs.delete(j.key); j.rej(new Error('cancelled')); return false; } return true; });
}

/* ── render ─────────────────────────────────────────────────────────── */
function rotMat(yaw, pitch) { var cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch); return new Float32Array([cy, 0, -sy, sp * sy, cp, sp * cy, cp * sy, -sp, cp * cy]); }
function pvCells(fam, want) { return PV_PERIODIC[fam] ? want : 1; }
/* Render field f at w×h (≤ 512) into the GL canvas; returns the source rect. */
function pvRender(f, w, h, view, fam) {
  if (!PV.ok) return null;
  var gl = PV.gl; w = clamp(Math.round(w), 8, PV.SZ); h = clamp(Math.round(h), 8, PV.SZ);
  gl.useProgram(PV.prog); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_3D, PV.tex);
  if (PV.texKey !== f) {
    gl.texImage3D(gl.TEXTURE_3D, 0, gl.R16F, f.N, f.N, f.N, 0, gl.RED, gl.FLOAT, f.data);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    var wrap = PV_PERIODIC[f.family] ? gl.REPEAT : gl.CLAMP_TO_EDGE;
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, wrap); gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, wrap); gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_R, wrap);
    PV.texKey = f;
  }
  var half = f.half || [1, 1, 1], mh = Math.min(half[0], half[1], half[2]), cells = pvCells(f.family, view.cells || 1);
  var c = PV_FAMILY_COLOR[fam || f.family] || PV_FAMILY_COLOR.tpms;
  gl.viewport(0, 0, w, h); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
  gl.uniform2f(PV.u.res, w, h); gl.uniformMatrix3fv(PV.u.rot, false, rotMat(view.yaw, view.pitch));
  gl.uniform1f(PV.u.zoom, 5.1 / (view.zoom || 1)); gl.uniform1i(PV.u.uField, 0); gl.uniform1f(PV.u.uLip, f.lip / mh);
  gl.uniform3f(PV.u.uHalf, half[0], half[1], half[2]); gl.uniform3f(PV.u.uColor, c[0], c[1], c[2]);
  gl.uniform1f(PV.u.uStep, 2 * mh / (f.N * cells)); gl.uniform1f(PV.u.uCells, cells);
  if (PV.view) PV.view.apply(gl, PV.prog);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  PV.stat.rendered++;
  return { x: 0, y: PV.SZ - h, w: w, h: h };
}
function pvBlit(rect, ctx, dw, dh) { ctx.clearRect(0, 0, dw, dh); ctx.drawImage(PV.cv, rect.x, rect.y, rect.w, rect.h, 0, 0, dw, dh); }

/* Placeholder for families without preview geometry (wave, bundle) or failed bakes. */
function pvPlaceholder(cv, d, msg) {
  var ctx = cv.getContext('2d'), w = cv.width, h = cv.height, col = CAT_PALETTES.family[d.family] || '#9a9fb7';
  ctx.clearRect(0, 0, w, h);
  var s = Math.min(w, h) * 0.22, cx = w / 2, cy = h / 2 - s * 0.25;
  ctx.strokeStyle = col; ctx.globalAlpha = 0.55; ctx.lineWidth = Math.max(1.5, s * 0.06); ctx.setLineDash([s * 0.12, s * 0.16]);
  ctx.beginPath(); for (var k = 0; k < 6; k++) { var a = Math.PI / 6 + k * Math.PI / 3; ctx[k ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * s, cy + Math.sin(a) * s); } ctx.closePath(); ctx.stroke();
  ctx.setLineDash([]); ctx.globalAlpha = 1; ctx.fillStyle = '#c8f542'; ctx.beginPath(); ctx.arc(cx, cy, s * 0.12, 0, 6.2832); ctx.fill();
  ctx.fillStyle = '#7a809c'; ctx.font = '500 ' + Math.max(12, Math.round(h * 0.075)) + 'px "JetBrains Mono",monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(msg || 'no preview yet', cx, cy + s * 1.55);
}

/* ── thumbnails ─────────────────────────────────────────────────────── */
function idbOpen() {
  if (PV.idb !== null) return PV.idb;
  PV.idb = new Promise(function (res) {
    try { var rq = indexedDB.open(THUMB_IDB, 1); rq.onupgradeneeded = function () { rq.result.createObjectStore('t'); };
      rq.onsuccess = function () { res(rq.result); }; rq.onerror = function () { res(null); }; } catch (e) { res(null); }
  });
  return PV.idb;
}
function thumbKey(d) { return THUMB_IDB_VER + ':' + d._id + ':' + (d.content_hash || ''); }
function idbGet(d) { return idbOpen().then(function (db) { if (!db) return null; return new Promise(function (res) { try { var r = db.transaction('t').objectStore('t').get(thumbKey(d)); r.onsuccess = function () { res(r.result || null); }; r.onerror = function () { res(null); }; } catch (e) { res(null); } }); }); }
function idbPut(d, blob) { idbOpen().then(function (db) { if (!db || !blob) return; try { db.transaction('t', 'readwrite').objectStore('t').put(blob, thumbKey(d)); } catch (e) { /* quota */ } }); }

function thumbCacheSet(id, img) { PV.thumbs.delete(id); PV.thumbs.set(id, img); while (PV.thumbs.size > THUMB_LRU) PV.thumbs.delete(PV.thumbs.keys().next().value); }
function paintFromImg(cv, img) {
  var ctx = cv.getContext('2d'); if (!ctx) return;
  ctx.clearRect(0, 0, cv.width, cv.height);
  var s = Math.min(cv.width / img.width, cv.height / img.height), w = img.width * s, h = img.height * s;   /* fit inside: never crop the geometry */
  ctx.drawImage(img, (cv.width - w) / 2, (cv.height - h) / 2, w, h); cv.classList.add('ready');
}
function paintEverywhere(d, img) { $$('canvas[data-th="' + d._id + '"]').forEach(function (c) { paintFromImg(c, img); }); }
var _thumbWanted = new Set();
/* Ask for a design's thumbnail; every canvas[data-th=id] is painted when it is ready. */
function thumbWant(d, front) {
  var id = d._id;
  if (PV.thumbs.has(id)) { paintEverywhere(d, PV.thumbs.get(id)); return; }
  if (!PREVIEW_FAMILIES[d.family] || !d.recipe) { $$('canvas[data-th="' + id + '"]').forEach(function (c) { pvPlaceholder(c, d); c.classList.add('ready'); }); return; }
  if (_thumbWanted.has(id)) { if (front) pvBake(d, THUMB_N, true).catch(function () {}); return; }
  _thumbWanted.add(id);
  idbGet(d).then(function (blob) {
    if (blob && typeof createImageBitmap === 'function') return createImageBitmap(blob).then(function (bm) { PV.stat.fromCache++; thumbCacheSet(id, bm); paintEverywhere(d, bm); _thumbWanted.delete(id); return true; });
    return false;
  }).then(function (done) {
    if (done) return;
    if (!PV.ok) { _thumbWanted.delete(id); $$('canvas[data-th="' + id + '"]').forEach(function (c) { pvPlaceholder(c, d, 'needs WebGL2'); }); return; }
    var p = pvBake(d, THUMB_N, front), job = PV.jobs.get(pvKey(d, THUMB_N)); if (job) job.thumb = true;
    return p.then(function (f) {
      var r = pvRender(f, THUMB_W, THUMB_H, THUMB_VIEW, d.family); if (!r) return;
      var c = document.createElement('canvas'); c.width = THUMB_W; c.height = THUMB_H; pvBlit(r, c.getContext('2d'), THUMB_W, THUMB_H);
      thumbCacheSet(id, c); paintEverywhere(d, c); _thumbWanted.delete(id);
      if (c.toBlob) c.toBlob(function (b) { idbPut(d, b); }, 'image/webp', 0.86);
    }).catch(function (err) {
      _thumbWanted.delete(id);
      if (err && err.message === 'cancelled') return;
      $$('canvas[data-th="' + id + '"]').forEach(function (cv) { pvPlaceholder(cv, d, 'preview failed'); cv.classList.add('ready'); });
    });
  });
}
var THUMB_VIEW = { yaw: 0.72, pitch: -0.5, zoom: 1, cells: 2 };

/* Only canvases on screen (plus a margin) are baked; leaving the screen
   before the bake starts drops it from the queue. */
var _thumbIO = null, _thumbIORoot = null;
function observeThumbs(root) {
  var list = root.querySelectorAll('canvas[data-th]');
  if (!('IntersectionObserver' in window)) { Array.prototype.forEach.call(list, function (c) { var d = DB.byId.get(c.dataset.th); if (d) thumbWant(d); }); return; }
  /* one observer per render: the previous cards are gone, so drop them all */
  if (_thumbIO) _thumbIO.disconnect();
  _thumbIORoot = root;
  _thumbIO = new IntersectionObserver(function (es) {
    /* newest-first queue: walk the batch backwards so the top-left card bakes first */
    es.slice().reverse().forEach(function (e) {
      var c = e.target, d = DB.byId.get(c.dataset.th); if (!d) return;
      if (!c.isConnected) { _thumbIO.unobserve(c); return; }
      if (e.isIntersecting) { thumbWant(d, true); return; }
      /* scrolled away — cancel only if no other card for the same design is still near the screen */
      var rr = root.getBoundingClientRect(), still = $$('canvas[data-th="' + d._id + '"]', root).some(function (o) {
        if (o === c) return false; var q = o.getBoundingClientRect(); return q.bottom > rr.top - 220 && q.top < rr.bottom + 220; });
      if (!still) pvCancel(function (x) { return x === d; });
    });
  }, { root: root, rootMargin: '220px' });
  Array.prototype.forEach.call(list, function (c) { var d = DB.byId.get(c.dataset.th); if (!d) return; if (PV.thumbs.has(d._id)) paintFromImg(c, PV.thumbs.get(d._id)); else _thumbIO.observe(c); });
}
/* Canvases outside the scroller (tooltip, tray, compare, nearest) — just ask. */
function paintThumbs(root) { $$('canvas[data-th]', root).reverse().forEach(function (c) { var d = DB.byId.get(c.dataset.th); if (d) thumbWant(d, true); }); }

/* ── live inspector view ─────────────────────────────────────────────── */
var IV = { yaw: 0.72, pitch: -0.48, zoom: 1, cells: 2, drag: null, last: -1e9, spinUntil: 0, field: null, fieldFor: null, dirty: true, loading: false };
function inspectorLoad(d) {
  IV.field = null; IV.fieldFor = d; IV.dirty = true; IV.spinUntil = performance.now() + 9000;
  if (!d || !PREVIEW_FAMILIES[d.family] || !d.recipe || !PV.ok) return;
  IV.loading = true;
  /* show the thumbnail field first if it is already baked, then sharpen */
  var quick = PV.fields.get(pvKey(d, THUMB_N)); if (quick) { IV.field = quick; IV.dirty = true; }
  pvBake(d, INSPECT_N, true).then(function (f) { if (IV.fieldFor === d) { IV.field = f; IV.loading = false; IV.dirty = true; } })
    .catch(function () { if (IV.fieldFor === d) { IV.loading = false; IV.dirty = true; } });
}
function bindOrbit(cv) {
  var pts = new Map(), pinch = null;
  cv.addEventListener('pointerdown', function (e) { try { cv.setPointerCapture(e.pointerId); } catch (x) { /* synthetic */ }
    pts.set(e.pointerId, [e.clientX, e.clientY]);
    if (pts.size === 2) { var q = Array.from(pts.values()); pinch = { d0: Math.hypot(q[0][0] - q[1][0], q[0][1] - q[1][1]), z0: IV.zoom }; IV.drag = null; return; }
    IV.drag = { x: e.clientX, y: e.clientY, yaw: IV.yaw, pitch: IV.pitch }; IV.last = performance.now(); IV.spinUntil = 0; });
  cv.addEventListener('pointermove', function (e) {
    if (pts.has(e.pointerId)) pts.set(e.pointerId, [e.clientX, e.clientY]);
    if (pinch && pts.size === 2) { var q = Array.from(pts.values()); IV.zoom = clamp(pinch.z0 * Math.hypot(q[0][0] - q[1][0], q[0][1] - q[1][1]) / (pinch.d0 || 1), 0.6, 2.8); IV.dirty = true; return; }
    if (!IV.drag) return;
    IV.yaw = IV.drag.yaw + (e.clientX - IV.drag.x) * 0.01; IV.pitch = clamp(IV.drag.pitch - (e.clientY - IV.drag.y) * 0.008, -1.45, 1.45); IV.last = performance.now(); IV.dirty = true; });
  function up(e) { pts.delete(e.pointerId); if (pts.size < 2) pinch = null; IV.drag = null; IV.dirty = true; }
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  cv.addEventListener('wheel', function (e) { e.preventDefault(); IV.zoom = clamp(IV.zoom * (1 - e.deltaY * 0.0012), 0.6, 2.8); IV.last = performance.now(); IV.dirty = true; }, { passive: false });
}
/* Called every frame; renders only while something moves. */
function inspectorFrame(now) {
  var cv = S.mobile ? document.getElementById('mICv') : document.getElementById('iCv'), d = S.sel;
  if (!cv || !d || !cv.offsetWidth) return;
  var spinning = now < IV.spinUntil && !IV.drag;
  if (spinning) { IV.yaw += 0.006; IV.dirty = true; }
  var dpr = Math.min(window.devicePixelRatio || 1, 2), W = Math.round(cv.offsetWidth * dpr), H = Math.round(cv.offsetHeight * dpr);
  if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; IV.dirty = true; }
  if (!IV.dirty) return;
  IV.dirty = false;
  var ctx = cv.getContext('2d'); if (!ctx) return;
  if (!PREVIEW_FAMILIES[d.family] || !d.recipe) { pvPlaceholder(cv, d); return; }
  if (!PV.ok) { pvPlaceholder(cv, d, 'preview needs WebGL2'); return; }
  if (!IV.field) { if (PV.thumbs.has(d._id)) paintFromImg(cv, PV.thumbs.get(d._id)); return; }
  var moving = !!IV.drag || spinning, sc = Math.min(1, (moving ? 380 : 512) / Math.max(W, H));
  /* framing is tuned for wide panels; pull back on square or tall ones so the cube's corners stay in view */
  var fit = clamp((W / H) / 1.25, 0.8, 1), view = fit < 1 ? { yaw: IV.yaw, pitch: IV.pitch, zoom: (IV.zoom || 1) * fit, cells: IV.cells } : IV;
  var r = pvRender(IV.field, W * sc, H * sc, view, d.family); if (r) pvBlit(r, ctx, W, H);
}
