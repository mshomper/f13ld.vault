/* ============================================================
   F13LD.vault · 62-panes.js
   Drawer panes: Build target (absolute units), Metric key, and the
   preview-engine readout (how much the thumbnails cost on this machine).
   ============================================================ */

function renderTargetPane() {
  var el = $('#dTarget'); if (!el) return;
  var g = globalInputs, opts = '<option value="custom">Custom (enter below)</option>' + Object.keys(MATERIAL_PRESETS).map(function (k) { var m = MATERIAL_PRESETS[k]; return '<option value="' + k + '"' + (g.material_id === k ? ' selected' : '') + '>' + esc(m.label) + ' · ' + m.E + ' GPa</option>'; }).join('');
  function fld(id, label, key, unit, hint, step) {
    return '<div class="fld"><label for="' + id + '">' + esc(label) + '</label><div class="in"><input id="' + id + '" data-bt="' + key + '" type="number" min="0" step="' + (step || 'any') + '" inputmode="decimal" placeholder="—" value="' + (g[key] != null ? g[key] : '') + '"><span>' + esc(unit) + '</span></div><div class="h">' + esc(hint) + '</div></div>';
  }
  el.innerHTML = '<div class="bt-grid">' +
    fld('btCell', 'Cell size', 'cell_size_mm', 'mm', 'Pore and throat sizes in µm', '0.1') +
    '<div class="fld"><label for="btMat">Material</label><div class="in"><select id="btMat" data-btmat>' + opts + '</select></div><div class="h">Fills modulus, density and conductivity</div></div>' +
    fld('btE', 'Modulus E', 'modulus_gpa', 'GPa', 'Stiffness and shear in GPa', '0.1') +
    fld('btRho', 'Density ρ', 'density_gcc', 'g/cm³', 'With E: specific stiffness', '0.01') +
    fld('btK', 'Thermal k', 'thermal_k_wmk', 'W/m·K', 'Conductivity in W/m·K', '0.1') +
    fld('btSig', 'Reference stress σ', 'ref_stress_mpa', 'MPa', 'With E: strain in µε and strain energy', '1') +
    '<div class="bt-status">' + (hasAnyGlobalInput() ? ic('target') + '<span>Absolute units <b>on</b> — every card, tile, slider and tag now reads in real units.</span>' : ic('target') + '<span>Showing normalised values. Fill any field to read absolute units.</span>') +
    '<button class="mini" data-act="bt-reset"' + (hasAnyGlobalInput() ? '' : ' disabled') + '>' + gl('x') + 'Reset all</button></div>' +
    '<div class="bt-status pv">' + ic('cell') + '<span id="pvStat">' + pvStatText() + '</span></div>' +
    '</div>';
}
function pvStatText() {
  var s = PV.stat;
  return 'Preview engine · ' + (PV.ok ? PV.workers.length + ' worker' + (PV.workers.length === 1 ? '' : 's') : 'WebGL2 unavailable') +
    ' · ' + s.baked + ' baked' + (s.baked ? ' (avg ' + Math.round(s.bakeMs / s.baked) + ' ms)' : '') + ' · ' + s.fromCache + ' from cache · ' + PV.queue.length + ' queued' + (s.failed ? ' · ' + s.failed + ' failed' : '');
}
function btInput(key, raw) {
  var v = raw === '' ? null : parseFloat(raw); globalInputs[key] = (v != null && isFinite(v) && v > 0) ? v : null;
  if (key === 'modulus_gpa' || key === 'density_gcc' || key === 'thermal_k_wmk') globalInputs.material_id = 'custom';
  unitsChanged();
}
function btMaterial(id) {
  globalInputs.material_id = id;
  var m = MATERIAL_PRESETS[id]; if (m) { globalInputs.modulus_gpa = m.E; globalInputs.density_gcc = m.rho; globalInputs.thermal_k_wmk = m.k; }
  unitsChanged(); renderTargetPane();
}
function btReset() { Object.keys(globalInputs).forEach(function (k) { globalInputs[k] = k === 'material_id' ? 'custom' : null; }); unitsChanged(); renderTargetPane(); }
var unitsChanged = debounce(function () {
  persistGlobalInputs(); updateFilterUI(); renderTags(); renderLists(); renderInspector();
  if (S.tab === 'compare' && S.drawer) renderCompare();
  /* never rebuild the fields while someone is typing in them: refresh only the status line */
  var st = $('#dTarget .bt-status');
  if (st) { st.innerHTML = (hasAnyGlobalInput() ? ic('target') + '<span>Absolute units <b>on</b> — every card, tile, slider and tag now reads in real units.</span>' : ic('target') + '<span>Showing normalised values. Fill any field to read absolute units.</span>') +
      '<button class="mini" data-act="bt-reset"' + (hasAnyGlobalInput() ? '' : ' disabled') + '>' + gl('x') + 'Reset all</button>'; }
  var sel = $('#btMat'); if (sel && sel.value !== globalInputs.material_id) sel.value = MATERIAL_PRESETS[globalInputs.material_id] ? globalInputs.material_id : 'custom';
}, 250);

function renderKeyPane(q) {
  var el = $('#keyGrid'); if (!el) return;
  q = (q || '').trim().toLowerCase();
  function hit(s) { return !q || String(s).toLowerCase().indexOf(q) >= 0; }
  var comp = DOMAIN_IDS.filter(function (k) { var z = Z_COMPOUND_GLOSSARY[k]; return z && (hit(z.label) || hit(z.def) || hit(DOMAIN_SHORT[k])); }).map(function (k) {
    var z = Z_COMPOUND_GLOSSARY[k]; return '<div class="key-it comp"><b>' + ic(k) + esc(DOMAIN_SHORT[k]) + ' · ' + esc(domainZLabel(k)) + '</b><code>' + esc(z.formula) + '</code>' + esc(z.def) + '<i>' + esc(z.interp) + '</i></div>';
  }).join('');
  var mets = pickableMetrics().filter(function (m) { var g = mGloss(m.key) || {}; return hit(m.label) || hit(m.key) || hit(g.def) || hit(mShort(m.key)); }).map(function (m) {
    var g = mGloss(m.key) || {}; return '<div class="key-it"><b>' + esc(m.label) + ' <span>' + esc(mShort(m.key)) + '</span></b>' + esc(g.def || '') + (g.interp ? '<i>' + esc(g.interp) + '</i>' : '') + '</div>';
  }).join('');
  el.innerHTML = (comp ? '<div class="key-h">Domain compounds</div>' + comp : '') + (mets ? '<div class="key-h">Metrics</div>' + mets : '') || '<div class="cmp-empty">Nothing matches “' + esc(q) + '”.</div>';
}
function buildKeyPane() {
  $('#dKey').innerHTML = '<div class="key-wrap"><div class="key-top"><span class="gl-wrap">' + gl('search') + '</span><input id="keyIn" placeholder="Search a metric, code or definition" autocomplete="off" spellcheck="false"></div><div class="key-grid" id="keyGrid"></div></div>';
  renderKeyPane('');
}
