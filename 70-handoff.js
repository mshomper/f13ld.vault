/* ============================================================
   F13LD.vault · 70-handoff.js
   Sending a design onward: F13LD.mesh and F13LD.lab read the recipe from
   #r=<JSON>; F13LD.sweep has no link import yet, so its recipe is saved as
   a file to drop into Sweep; F13LD.queue goes through its client library
   (loaded on first use). Also: recipe download / copy and the share link.
   ============================================================ */

function recipeOf(d) { return d && d.recipe ? JSON.parse(JSON.stringify(d.recipe)) : null; }
function recipeFileName(d) { return 'f13ld_' + (d.family || 'design') + '_' + displayPreset(d).replace(/[^a-z0-9_-]+/gi, '_') + '_' + d._id + '.json'; }
function openTool(url, recipe, name) {
  var full = url + '#r=' + encodeURIComponent(JSON.stringify(recipe));
  if (full.length > HANDOFF_URL_MAX) {
    copyText(JSON.stringify(recipe, null, 2)).then(function (ok) { toast(ok ? 'Recipe too long for a link — copied the JSON; drop or paste it into ' + name : 'Recipe too long for a link — use Download recipe and drop the file into ' + name); });
    return;
  }
  window.open(full, '_blank', 'noopener');
}
function openMesh(d) { d = d || S.sel; var r = recipeOf(d); if (!r) { toast('This design has no recipe stored'); return; } openTool(MESH_URL, r, 'F13LD.mesh'); toast('Opened <b>' + esc(displayPreset(d)) + '</b> in F13LD.mesh'); }
function openLab(d) {
  d = d || S.sel; var r = recipeOf(d); if (!r) { toast('This design has no recipe stored'); return; }
  r.geometry = r.geometry || {};
  if (d.family !== 'beam' && !(d.family === 'foam' && r.geometry.tile_mm > 0) && r.geometry.cell_size_mm == null && r.geometry.cellSizeMm == null && isNum(d.cell_size_mm)) r.geometry.cell_size_mm = d.cell_size_mm;
  r.title = 'Vault ' + d._id + ' · ' + displayPreset(d);
  openTool(LAB_URL, r, 'F13LD.lab'); toast('Opened <b>' + esc(displayPreset(d)) + '</b> in F13LD.lab');
}
/* "Explore around it": Sweep jitters a loaded recipe, so hand it this one. */
function openSweep(d) {
  var r = recipeOf(d); if (!r) { toast('This design has no recipe stored'); return; }
  downloadJSON(r, recipeFileName(d));
  window.open(SWEEP_URL, '_blank', 'noopener');
  toast('Saved <b>' + esc(recipeFileName(d)) + '</b> — drop it onto F13LD.sweep and run a Neighbourhood sweep around it');
}
function downloadRecipe(d) { d = d || S.sel; var r = recipeOf(d); if (!r) { toast('This design has no recipe stored'); return; } downloadJSON(r, recipeFileName(d)); toast('Saved <b>' + esc(recipeFileName(d)) + '</b>'); }
function copyRecipe(d) { d = d || S.sel; var r = recipeOf(d); if (!r) return; copyText(JSON.stringify(r, null, 2)).then(function (ok) { toast(ok ? 'Recipe JSON copied' : 'Copy was blocked by the browser — use Download instead'); }); }
function copyViewLink() { var u = shareURL(); copyText(u).then(function (ok) { toast(ok ? 'Link copied — it opens this exact view' : 'Copy blocked — the address bar already holds this view'); }); try { history.replaceState(null, '', u); } catch (e) { /* sandbox */ } }

/* ── F13LD.queue ─────────────────────────────────────────────────────── */
var _queueLib = null;
function queueLib() {
  if (window.F13LDQueue) return Promise.resolve(window.F13LDQueue);
  if (_queueLib) return _queueLib;
  _queueLib = new Promise(function (res, rej) {
    var sc = document.createElement('script'); sc.src = QUEUE_JS;
    sc.onload = function () { window.F13LDQueue ? res(window.F13LDQueue) : rej(new Error('queue client missing')); };
    sc.onerror = function () { _queueLib = null; rej(new Error("couldn't reach the queue service")); };
    document.head.appendChild(sc);
  });
  return _queueLib;
}
function thumbDataURL(d) { var t = PV.thumbs.get(d._id); if (!t) return null; try { var c = document.createElement('canvas'), k = 256 / Math.max(t.width, t.height); c.width = Math.round(t.width * k); c.height = Math.round(t.height * k); c.getContext('2d').drawImage(t, 0, 0, c.width, c.height); return c.toDataURL('image/webp', 0.72); } catch (e) { return null; } }
function queueAdd(designs, code) {
  designs = designs.filter(function (d) { return d && d.recipe; }); if (!designs.length) { toast('Nothing with a recipe to add'); return; }
  queueLib().then(function (Q) {
    var go = code ? Promise.resolve(code) : Q.ensureCode();
    return go.then(function (c) {
      return designs.reduce(function (p, d) { return p.then(function () { return Q.addTo(c, recipeOf(d), { tool: 'f13ld.vault', label: displayPreset(d) + ' · ' + d._id, thumb: thumbDataURL(d) || undefined }); }); }, Promise.resolve()).then(function () { return c; });
    });
  }).then(function (c) {
    toast('Added ' + (designs.length > 1 ? designs.length + ' designs' : '<b>' + esc(displayPreset(designs[0])) + '</b>') + ' to queue <b>' + esc(c) + '</b>');
  }).catch(function (e) { toast('Queue: ' + esc(e.message || 'offline')); });
}
/* Queue pill: one click adds to the active queue; the menu picks another or starts one. */
function queueMenu(anchor, designs) {
  queueLib().then(function (Q) {
    var active = Q.getCode(), rec = (Q.getRecent() || []).filter(function (c) { return c !== active; }).slice(0, 6);
    var h = '<div class="mh">Add ' + (designs.length > 1 ? designs.length + ' designs' : 'to queue') + '</div>' +
      (active ? '<button data-qcode="' + esc(active) + '" class="on">' + gl('tick') + esc(active) + '<em>active</em></button>' : '') +
      rec.map(function (c) { return '<button data-qcode="' + esc(c) + '">' + gl('dot') + esc(c) + '</button>'; }).join('') +
      '<button data-qnew="1">' + gl('plus') + 'Start a new queue</button>' +
      '<button data-qopen="1">' + ic('queue') + 'Open F13LD.queue</button>';
    var m = openMenu(anchor, h, { focus: true });
    m.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return; closeMenu();
      if (b.dataset.qcode) queueAdd(designs, b.dataset.qcode);
      else if (b.dataset.qnew) Q.newCode().then(function (c) { queueAdd(designs, c); });
      else if (b.dataset.qopen) window.open(Q.appUrl(), '_blank', 'noopener');
    });
  }).catch(function (e) { toast('Queue: ' + esc(e.message || 'offline')); });
}
function addRangeKey(k) {
  if (!hasMetric(k)) return;
  if (F.rangeKeys.indexOf(k) < 0) { F.rangeKeys.push(k); buildRangeRows(); requestRefresh(); }
  setTimeout(function () { var r = $('#dFilters .rng[data-key="' + k + '"]') || $('#mFB .rng[data-key="' + k + '"]'); if (r && r.scrollIntoView) r.scrollIntoView({ block: 'nearest' }); }, 60);
}
