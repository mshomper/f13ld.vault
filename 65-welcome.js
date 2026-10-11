/* ============================================================
   F13LD.vault · 65-welcome.js  (v0.9.0)
   First-visit guide: pick a domain → your build (material, cell size,
   and for Biomedical the reference stress, with application presets) →
   the top 24 for that domain light up in both views and at the head of
   the list. "Don't show this again" (or finishing the guide) retires it;
   skipping part-way brings it back next visit. While it is open it stands
   in for the Biomedical loading prompt; once retired, that prompt works as
   before. Reopen any time from the header Guide button or the palette.
   ============================================================ */

var LS_WELCOME = 'f13ld.vault.welcome.v1';
var WG = { open: false, step: 0, dom: null, never: false };
var SPOT_N = 24;

/* Reference stress by application (Matt, 2026-10-11): trabecular scaffold
   contact 0.5–2 MPa, subchondral 2–5 MPa, load-bearing / cortical ≈10 MPa. */
var STRESS_PRESETS = [
  { id: 'trab', label: 'Trabecular', v: 1.0, range: '0.5–2 MPa', tip: 'Cancellous bone contact — interbody cages and trabecular scaffolds' },
  { id: 'subc', label: 'Subchondral', v: 3.5, range: '2–5 MPa', tip: 'Beneath joint cartilage — osteochondral and subchondral plates' },
  { id: 'cort', label: 'Load-bearing', v: 10, range: '≈10 MPa', tip: 'Cortical and load-bearing implants — segmental and diaphyseal' }
];
/* Preset chips + a help line under a stress input (the guide and the Biomedical prompt). */
function stressPresetsHTML(inputId) {
  return '<div class="sp-pre" data-for="' + inputId + '" role="group" aria-label="Typical stress by application">' +
    STRESS_PRESETS.map(function (p) { return '<button type="button" class="sp-chip" data-stress="' + p.v + '" data-tip="' + esc(p.tip) + '" title="' + esc(p.label + ' · ' + p.range + ' — ' + p.tip) + '"><b>' + esc(p.label) + '</b><em>' + esc(p.range) + '</em></button>'; }).join('') +
    '</div><div class="sp-help" data-help-for="' + inputId + '">Typical stresses at the bone–scaffold interface. Pick one or type your own.</div>';
}
function bindStressPresets(root) {
  $$('.sp-pre', root).forEach(function (g) {
    var inp = $('#' + g.dataset.for), help = $('[data-help-for="' + g.dataset.for + '"]', root);
    function mark() { var v = parseFloat(inp && inp.value); $$('.sp-chip', g).forEach(function (c) { c.classList.toggle('on', +c.dataset.stress === v); }); }
    $$('.sp-chip', g).forEach(function (c) {
      c.onclick = function () { if (inp) { inp.value = c.dataset.stress; inp.dispatchEvent(new Event('input')); } mark(); if (help) help.textContent = c.dataset.tip + '.'; };
      c.onmouseenter = c.onfocus = function () { if (help) help.textContent = c.dataset.tip + '.'; };
    });
    if (inp) inp.addEventListener('input', mark);
    mark();
  });
}

/* Shared with the Biomedical prompt: write the build into globalInputs. */
function applyBuild(o) {
  var m = MATERIAL_PRESETS[o.mid];
  globalInputs.material_id = o.mid || 'custom';
  if (m) { globalInputs.density_gcc = m.rho; globalInputs.thermal_k_wmk = m.k; }
  if (o.E !== undefined) globalInputs.modulus_gpa = o.E;
  if (o.sig !== undefined) globalInputs.ref_stress_mpa = o.sig;
  if (o.cell !== undefined) globalInputs.cell_size_mm = o.cell;
  if (o.lo !== undefined) globalInputs.strain_lo = o.lo || 1000;
  if (o.hi !== undefined) globalInputs.strain_hi = o.hi || 3500;
  persistGlobalInputs(); strainInputsChanged();   /* now, so the scores and the top 24 see the load */
  unitsChanged(); renderTargetPane();             /* lists, inspector and tags follow on the debounce */
}

function welcomeDone() { return !!Store.get(LS_WELCOME, false); }
/* Deep links (a shared view, a Lab or Sweep hand-off) arrive with a purpose: no guide. */
function welcomeWanted() { return !welcomeDone() && !/[#&](v|r|aim)=/.test(location.hash || ''); }

function openWelcome() {
  if (!DB.N) return;
  closeMenu(); closeBioPrompt('close');
  WG.open = true; WG.step = 0; WG.never = false; WG.dom = F.domain !== 'all' ? F.domain : null;
  $('#welDlg').classList.add('open'); renderWelcome();
}
function closeWelcome(how) {
  if (!WG.open) return;
  WG.open = false;
  if (how === 'done' || WG.never) Store.set(LS_WELCOME, true);
  var el = $('#welDlg'); el.classList.remove('open', 'wg-docked'); el.innerHTML = '';
  if (how !== 'filter') setSpot(null);
  /* the guide stood in for the Biomedical card; if it closed early, the card takes over */
  if (how === 'skip' && bioPromptWanted()) setTimeout(openBioPrompt, 250);
}

function setSpot(list) {
  S.spot = list && list.length ? new Set(list) : null; S.spotT0 = performance.now();
  markViewsDirty(); renderLists();
}
function topForDomain(n) {
  return DB.all.filter(function (d) { return d._m && isNum(d._score); })
    .sort(function (a, b) { return b._score - a._score; }).slice(0, n);
}

function renderWelcome() {
  var el = $('#welDlg'), s = WG.step, dom = WG.dom, bio = dom === 'biomedical';
  el.classList.toggle('wg-docked', s === 2);
  var bars = '<div class="wg-steps" aria-hidden="true">' + [0, 1, 2].map(function (k) { return '<i class="' + (k < s ? 'done' : k === s ? 'on' : '') + '"></i>'; }).join('') + '</div>';
  var never = '<button type="button" class="wg-chk' + (WG.never ? ' on' : '') + '" data-wg="never" role="checkbox" aria-checked="' + WG.never + '"><b></b>Don’t show this again</button>';
  var head = '<div class="wg-h">' + bars + '<button class="ibtn" data-wg="' + (s === 2 ? 'done' : 'skip') + '" aria-label="Close">' + gl('x') + '</button></div>';
  var html;
  if (s === 0) {
    var doms = ['biomedical', 'aerospace', 'automotive', 'oilgas', 'thermal', 'spread', 'all'];
    var blurb = { biomedical: 'Bone ingrowth: pore size, bone-forming strain, open throats', aerospace: 'Stiff along one load path for the least material',
      automotive: 'Balanced stiffness in every direction', oilgas: 'Open, straight flow paths through the void', thermal: 'Conduction along a chosen direction', spread: 'Conduction per unit material, every direction', all: 'Surface efficiency across every family' };
    html = head + '<div class="wg-c"><h2 id="wgT">Welcome to F13LD.vault</h2>' +
      '<p class="wg-sub">A community library of solved metamaterial unit cells — ' + DB.N.toLocaleString('en-US') + ' designs across ' + DB.families.length + ' families. What are you designing for? Vault ranks every design for that use.</p>' +
      '<div class="wg-doms">' + doms.map(function (k) {
        return '<button type="button" class="wg-dom' + (dom === k ? ' on' : '') + '" data-wg-dom="' + k + '" aria-pressed="' + (dom === k) + '"><span class="ico">' + ic(k) + '</span><b>' + esc(k === 'all' ? 'Just exploring' : DOMAIN_SHORT[k]) + '</b><em>' + esc(blurb[k]) + '</em></button>';
      }).join('') + '</div><p class="wg-why">Change it any time from <b>Domain</b> in the filters.</p></div>' +
      '<div class="wg-f">' + never + '<span class="wg-sp"></span><button class="sbtn ghost" data-wg="skip">Skip</button><button class="sbtn prim" data-wg="next"' + (dom ? '' : ' disabled') + '>Next</button></div>';
  } else if (s === 1) {
    var g = globalInputs;
    var opts = '<option value="custom">Custom</option>' + Object.keys(MATERIAL_PRESETS).map(function (k) { var m = MATERIAL_PRESETS[k]; return '<option value="' + k + '"' + (g.material_id === k ? ' selected' : '') + '>' + esc(m.label) + ' · ' + m.E + ' GPa</option>'; }).join('');
    function fld(id, label, val, unit, step, full) { return '<label class="bio-f' + (full ? ' full' : '') + '" for="' + id + '"><span>' + esc(label) + '</span><span class="in"><input id="' + id + '" type="number" min="0" step="' + step + '" inputmode="decimal" placeholder="—" value="' + (val != null ? val : '') + '"><em>' + esc(unit) + '</em></span></label>'; }
    html = head + '<div class="wg-c"><h2 id="wgT">Your build</h2>' +
      '<p class="wg-sub">' + (bio ? 'Bone ingrowth depends on real pore size and the strain the struts see, so Vault needs your material, the cell size you print at, and the stress on the scaffold.' : 'Optional. With a material and cell size, stiffness reads in GPa and pores in µm instead of fractions.') + '</p>' +
      '<div class="bio-g">' +
        '<label class="bio-f" for="wgMat"><span>Base material</span><span class="in"><select id="wgMat">' + opts + '</select></span></label>' +
        fld('wgE', 'Modulus E', g.modulus_gpa, 'GPa', '0.1') +
        fld('wgCell', 'Cell size you print at', g.cell_size_mm, 'mm', '0.1', !bio) +
        (bio ? fld('wgSig', 'Reference stress σ', g.ref_stress_mpa, 'MPa', '0.5') : '') +
      '</div>' + (bio ? stressPresetsHTML('wgSig') : '') +
      '<p class="wg-note">' + (bio ? 'Scored on mean pore <b>' + poreWindow()[0] + '–' + poreWindow()[1] + ' µm</b>, necks of at least <b>100 µm</b> and the bone-forming window <b>' + bioWindow()[0].toLocaleString('en-US') + '–' + bioWindow()[1].toLocaleString('en-US') + ' με</b>. Change them later in Build target.' : 'These live in <b>Build target</b>, where you can change or clear them.') + '</p></div>' +
      '<div class="wg-f">' + never + '<span class="wg-sp"></span><button class="sbtn ghost" data-wg="back">Back</button><button class="sbtn prim" data-wg="next">' + ic('target') + 'Show me the best</button></div>';
  } else {
    var n = S.spot ? S.spot.size : 0, dn = dom === 'all' ? 'all applications' : DOMAIN_SHORT[dom];
    html = head + '<div class="wg-c"><h2 id="wgT">Top ' + n + ' for ' + esc(dn) + '</h2>' +
      '<p class="wg-sub">' + (n ? 'Ringed in lime in the design space and marked at the head of the list. A few ways in:' : 'No design scores for this domain yet. A few ways in:') + '</p>' +
      '<div class="wg-tips">' +
        '<div class="wg-tip"><span class="kbd">' + 'drag' + '</span>Orbit the 3D space' + (S.mobile ? '' : ' · Ctrl + drag pans') + '</div>' +
        '<div class="wg-tip"><span class="kbd">' + (S.mobile ? 'tap' : 'click') + '</span>Any point opens its geometry and scores</div>' +
        '<div class="wg-tip"><span class="kbd">axis</span>Pick any metric on either 2D axis to compare two</div>' +
        (S.mobile ? '' : '<div class="wg-tip"><span class="kbd">Ctrl K</span>Search designs, metrics and actions</div>') +
      '</div></div>' +
      '<div class="wg-f">' + never.replace('Don’t show this again', 'Don’t show again') + '<span class="wg-sp"></span><button class="sbtn ghost" data-wg="done">Keep all</button><button class="sbtn prim" data-wg="filter"' + (n ? '' : ' disabled') + '>' + ic('filters') + 'Filter to these</button></div>';
  }
  el.innerHTML = '<div class="kbd-box wg-box" role="dialog" aria-modal="' + (s < 2) + '" aria-labelledby="wgT">' + html + '</div>';
  if (s === 1) {
    $('#wgMat').onchange = function () { var m = MATERIAL_PRESETS[this.value]; if (m) $('#wgE').value = m.E; };
    if ($('#wgMat').value !== 'custom' && !$('#wgE').value) $('#wgE').value = MATERIAL_PRESETS[$('#wgMat').value].E;
    bindStressPresets(el);
  }
  var f = el.querySelector(s === 0 ? '.wg-dom.on, .wg-dom' : s === 1 ? 'select, input' : '[data-wg="filter"]:not([disabled]), [data-wg="done"]');
  if (f && !S.mobile) f.focus();
}

function welcomeAct(a, b) {
  if (a === 'never') { WG.never = !WG.never; b.classList.toggle('on', WG.never); b.setAttribute('aria-checked', String(WG.never)); return; }
  if (a === 'skip') { closeWelcome('skip'); return; }
  if (a === 'done') { closeWelcome('done'); return; }
  if (a === 'back') { WG.step = Math.max(0, WG.step - 1); renderWelcome(); return; }
  if (a === 'filter') {
    var ids = S.spot ? Array.from(S.spot).map(function (d) { return d._id; }) : [];
    closeWelcome('done'); setSpot(null);
    if (ids.length) { F.region = ids; changed('Top ' + ids.length + ' · ' + (WG.dom === 'all' ? 'All applications' : DOMAIN_SHORT[WG.dom]), true); }
    return;
  }
  if (a === 'next') {
    if (WG.step === 0) { if (!WG.dom) return; if (WG.dom !== F.domain) setDomain(WG.dom); WG.step = 1; renderWelcome(); return; }
    if (WG.step === 1) {
      var num = function (q) { var e = $(q); if (!e) return undefined; var v = parseFloat(e.value); return isFinite(v) && v > 0 ? v : null; };
      applyBuild({ mid: $('#wgMat').value, E: num('#wgE'), cell: num('#wgCell'), sig: num('#wgSig') });
      if (typeof refreshNow === 'function') refreshNow();
      setSpot(topForDomain(SPOT_N));
      if (S.spot && !S.mobile) { var best = topForDomain(1)[0]; if (best) select(best, 'step-quiet'); }
      WG.step = 2; renderWelcome();
      if (hasLoad() || WG.dom !== 'biomedical') toast(WG.dom === 'biomedical' ? 'Strain on · bone window ' + bioWindow()[0].toLocaleString('en-US') + '–' + bioWindow()[1].toLocaleString('en-US') + ' με' : 'Ranked for <b>' + esc(WG.dom === 'all' ? 'all applications' : DOMAIN_SHORT[WG.dom]) + '</b>');
    }
  }
}
function bindWelcome() {
  var el = $('#welDlg'); if (!el) return;
  el.addEventListener('click', function (e) {
    var d = e.target.closest('[data-wg-dom]'); if (d) { WG.dom = d.dataset.wgDom; renderWelcome(); return; }
    var b = e.target.closest('[data-wg]'); if (b && !b.disabled) welcomeAct(b.dataset.wg, b);
  });
  el.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { e.stopPropagation(); closeWelcome(WG.step === 2 ? 'done' : 'skip'); }
    if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); welcomeAct('next'); }
  });
}
