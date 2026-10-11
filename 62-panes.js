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
    fld('btSig', 'Applied stress σ', 'ref_stress_mpa', 'MPa', 'With E: strain in µε, strain energy and the Biomedical strain window', '1') +
    fld('btLo', 'Bone window from', 'strain_lo', 'με', 'Biomedical: full marks from here…', '100') +
    fld('btHi', 'Bone window to', 'strain_hi', 'με', '…to here (Frost-style, soft edges)', '100') +
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
function btReset() { Object.keys(globalInputs).forEach(function (k) { globalInputs[k] = k === 'material_id' ? 'custom' : k === 'strain_lo' ? 1000 : k === 'strain_hi' ? 3500 : null; }); unitsChanged(); renderTargetPane(); }
var unitsChanged = debounce(function () {
  persistGlobalInputs();
  strainInputsChanged(); updateFilterUI(); renderTags(); renderLists(); renderInspector();
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
  var mets = metricsAll().filter(function (m) { var g = mGloss(m.key) || {}; return hit(m.label) || hit(m.key) || hit(g.def) || hit(mShort(m.key)); }).map(function (m) {
    var g = mGloss(m.key) || {}; return '<div class="key-it"><b>' + esc(m.label) + ' <span>' + esc(mShort(m.key)) + '</span></b>' + esc(g.def || '') + (g.interp ? '<i>' + esc(g.interp) + '</i>' : '') + '</div>';
  }).join('');
  el.innerHTML = (comp ? '<div class="key-h">Domain compounds</div>' + comp : '') + (mets ? '<div class="key-h">Metrics</div>' + mets : '') || '<div class="cmp-empty">Nothing matches “' + esc(q) + '”.</div>';
}
function buildKeyPane() {
  $('#dKey').innerHTML = '<div class="key-wrap"><div class="key-top"><span class="gl-wrap">' + gl('search') + '</span><input id="keyIn" placeholder="Search a metric, code or definition" autocomplete="off" spellcheck="false"></div><div class="key-grid" id="keyGrid"></div></div>';
  renderKeyPane('');
}


/* ── v0.6: strain follows the load ─────────────────────────────────────
   Real microstrain is rebuilt whenever the load, modulus or bone window
   changes; with no load it disappears from every list, axis and slider. */
var _loadSig = '';
function strainInputsChanged() {
  var g = globalInputs, sig = [g.ref_stress_mpa, g.modulus_gpa, g.strain_lo, g.strain_hi, g.cell_size_mm].join('|');
  if (sig === _loadSig) return; _loadSig = sig;
  loadChanged();
  buildRangeRows(); setAxesTargets3D(); set2DTargets(); renderAxisChips();
  requestRefresh();
}

/* ── v0.6: Biomedical asks for its loading case ────────────────────────
   Switching to Biomedical without a load or cell size opens this card.
   "Not now" is remembered; the dock tag and the score breakdown reopen it. */
function bioPromptWanted() { return F.domain === 'biomedical' && needsBioInputs() && !Store.get(LS_BIO_SKIP, false) && !(typeof WG !== 'undefined' && WG.open); }   /* v0.9.0: the welcome guide stands in for it while open */
function openBioPrompt() {
  var el = $('#bioDlg'); if (!el) return;
  var g = globalInputs, w = bioWindow();
  var opts = '<option value="custom">Custom</option>' + Object.keys(MATERIAL_PRESETS).map(function (k) { var m = MATERIAL_PRESETS[k]; return '<option value="' + k + '"' + (g.material_id === k ? ' selected' : '') + '>' + esc(m.label) + ' · ' + m.E + ' GPa</option>'; }).join('');
  function fld(id, label, val, unit, step) { return '<label class="bio-f" for="' + id + '"><span>' + esc(label) + '</span><span class="in"><input id="' + id + '" type="number" min="0" step="' + step + '" inputmode="decimal" placeholder="—" value="' + (val != null ? val : '') + '"><em>' + esc(unit) + '</em></span></label>'; }
  el.innerHTML = '<div class="kbd-box bio-box" role="dialog" aria-modal="true" aria-labelledby="bioT">' +
    '<div class="kbd-h">' + ic('biomedical') + '<span id="bioT">Biomedical needs your loading case</span><button class="ibtn" data-act="bio-close" aria-label="Close">' + gl('x') + '</button></div>' +
    '<p class="bio-p">Bone ingrowth depends on the strain the struts see. Enter the load and the cell size you will print at: every design’s stiffness becomes real microstrain, scored against the bone-forming window.</p>' +
    '<div class="bio-g">' +
      '<label class="bio-f" for="bioMat"><span>Material</span><span class="in"><select id="bioMat">' + opts + '</select></span></label>' +
      fld('bioE', 'Modulus E', g.modulus_gpa, 'GPa', '0.1') +
      fld('bioSig', 'Applied stress σ', g.ref_stress_mpa, 'MPa', '0.5') +
      fld('bioCell', 'Cell size', g.cell_size_mm, 'mm', '0.1') +
      fld('bioLo', 'Bone window from', w[0], 'με', '100') +
      fld('bioHi', 'Bone window to', w[1], 'με', '100') +
    '</div>' + stressPresetsHTML('bioSig') +
    '<div class="bio-note">Full marks inside the window, soft fall-off outside it. Without a load, strain stays hidden and the score leaves it out.</div>' +
    '<div class="bio-acts"><button class="sbtn ghost" data-act="bio-skip">Not now</button><button class="sbtn prim" data-act="bio-apply">' + ic('target') + 'Apply</button></div></div>';
  el.classList.add('open');
  var first = ['#bioSig', '#bioCell', '#bioE'].map(function (q) { return $(q); }).filter(function (i) { return i && !i.value; })[0] || $('#bioSig');
  if (first) first.focus();
  $('#bioMat').onchange = function () { var m = MATERIAL_PRESETS[this.value]; if (m) $('#bioE').value = m.E; };
  bindStressPresets(el);
}
function closeBioPrompt(how) {
  var el = $('#bioDlg'); if (!el || !el.classList.contains('open')) return;
  if (how === 'apply') {
    var num = function (q) { var v = parseFloat($(q).value); return isFinite(v) && v > 0 ? v : null; };
    applyBuild({ mid: $('#bioMat').value, E: num('#bioE'), sig: num('#bioSig'), cell: num('#bioCell'), lo: num('#bioLo'), hi: num('#bioHi') });   /* v0.9.0 — shared with the guide */
    toast(hasLoad() ? 'Strain on · bone window ' + bioWindow()[0].toLocaleString('en-US') + '–' + bioWindow()[1].toLocaleString('en-US') + ' με' : 'Saved · add a stress and modulus to turn strain on');
  }
  if (how === 'skip') { Store.set(LS_BIO_SKIP, true); toast('Strain window left out · reopen it from the dock tag'); }
  el.classList.remove('open'); el.innerHTML = '';
  renderTags();
}
