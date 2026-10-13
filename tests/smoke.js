/* ============================================================
   F13LD.vault · tests/smoke.js
   Headless run of the whole page on the sample data (?mock): boots,
   filters, ranges, undo/redo, brush, target, Pareto, gap map, compare,
   palette, layouts, phone layout. Fails on any page error.

     npm i jsdom        (once, anywhere on NODE_PATH)
     node tests/smoke.js

   No WebGL or workers under jsdom: points and previews are skipped, every
   other code path runs. GPU rendering is checked by hand in a browser.
   ============================================================ */
const path = require('path');
const { JSDOM, VirtualConsole, ResourceLoader } = require('jsdom');
const fs = require('fs');
const ROOT = path.join(__dirname, '..'), BASE = 'http://localhost/f13ld.vault/';
/* serve the repo from disk; skip everything external (fonts, queue client) */
class Local extends ResourceLoader {
  fetch(url, opts) {
    if (url.indexOf(BASE) !== 0) return null;
    const f = path.join(ROOT, url.slice(BASE.length).split(/[?#]/)[0]);
    return Promise.resolve(fs.readFileSync(f));
  }
}

const errs = [], vc = new VirtualConsole();
vc.on('jsdomError', e => errs.push('jsdomError: ' + (e.stack || e.message || e)));
vc.on('error', e => errs.push('console.error: ' + e));
vc.on('warn', () => {});

const file = path.join(__dirname, '..', 'index.html');
JSDOM.fromFile(file, {
  url: BASE + 'index.html?mock', runScripts: 'dangerously', resources: new Local(), pretendToBeVisual: true, virtualConsole: vc,
  beforeParse(w) {
    const noop = () => {}, grad = { addColorStop: noop };
    const ctx2d = new Proxy({}, { get: (t, k) => k in t ? t[k] : (k === 'measureText' ? () => ({ width: 40 }) : (k === 'createRadialGradient' || k === 'createLinearGradient') ? () => grad : noop), set: (t, k, v) => { t[k] = v; return true; } });
    w.HTMLCanvasElement.prototype.getContext = function (t) { return t === '2d' ? ctx2d : null; };
    const size = { offsetWidth: 900, offsetHeight: 520, clientWidth: 900, clientHeight: 520 };
    Object.keys(size).forEach(k => Object.defineProperty(w.HTMLElement.prototype, k, { configurable: true, get() { return size[k]; } }));
    w.HTMLElement.prototype.scrollIntoView = function () {};
    w.HTMLElement.prototype.setPointerCapture = function () {};
    w.matchMedia = q => ({ get matches() { return !!w.__phone; }, addEventListener() {}, addListener() {} });
    w.open = () => null;
    w.addEventListener('error', e => errs.push('window.error: ' + e.message));
  }
}).then(dom => {
  const w = dom.window;
  const ev = (code) => { try { return w.eval(code); } catch (e) { errs.push('step "' + code.slice(0, 70) + '": ' + e.stack.split('\n').slice(0, 2).join(' | ')); } };
  const steps = [
    [3200, "DB.N + ' designs, ' + S.cnt + ' lit, sel ' + (S.sel && S.sel._id)"],
    /* v0.9.0 welcome guide: opens on a first visit, domain → build (stress presets) → top 24 → filter; then retired */
    [80, "WG.open + ' step ' + WG.step + ' · ' + document.querySelectorAll('#welDlg .wg-dom').length + ' domains · next disabled ' + document.querySelector('#welDlg [data-wg=next]').disabled"],
    [80, "document.querySelector('#welDlg [data-wg-dom=biomedical]').click(); document.querySelector('#welDlg [data-wg=next]').click(); WG.step + ' ' + F.domain + ' · bio card open ' + document.querySelector('#bioDlg').classList.contains('open') + ' · chips ' + document.querySelectorAll('#welDlg .sp-chip').length"],
    [80, "document.querySelector('#welDlg .sp-chip[data-stress=\"3.5\"]').click(); document.querySelector('#wgMat').value = 'ti6al4v'; document.querySelector('#wgMat').onchange(); document.querySelector('#wgCell').value = 2; document.querySelector('#wgSig').value + ' MPa · ' + document.querySelector('#welDlg .sp-help').textContent.slice(0, 30) + ' · on ' + document.querySelector('#welDlg .sp-chip.on b').textContent"],
    [400, "document.querySelector('#welDlg [data-wg=next]').click(); WG.step + ' · spot ' + (S.spot && S.spot.size) + ' · load ' + hasLoad() + ' · docked ' + document.querySelector('#welDlg').classList.contains('wg-docked') + ' · spot cards ' + document.querySelectorAll('.card.spot').length"],
    [400, "var top24 = topForDomain(24).map(function (d) { return d._id; }); document.querySelector('#welDlg [data-wg=filter]').click(); refreshNow(); WG.open + ' · region ' + F.region.length + ' · lit ' + S.cnt + ' · retired ' + welcomeDone() + ' · same ' + (top24.join() === F.region.join())"],
    [80, "clearAll(); btReset(); setDomain('all'); refreshNow(); S.cnt === DB.N"],
    [80, "localStorage.removeItem(LS_WELCOME); openWelcome(); document.querySelector('#welDlg [data-wg=skip]').click(); WG.open + ' · retired ' + welcomeDone() + ' (skip without the box: comes back)'"],
    [80, "openWelcome(); document.querySelector('#welDlg [data-wg=never]').click(); closeWelcome('skip'); welcomeDone() + ' (box ticked: retired)'"],
    [80, "setDomain('biomedical'); refreshNow(); F.domain + ' ' + S.cnt"],
    [80, "toggleChip('fam:tpms'); refreshNow(); S.cnt"],
    [80, "togglePerc('solid:z'); refreshNow(); S.cnt"],
    [80, "setRange('volume_fraction', 15, 35); changed('test range'); refreshNow(); S.cnt"],
    [80, "Object.keys(FX.why).filter(k=>FX.why[k]).join(',')"],
    [80, "undo(); refreshNow(); S.cnt"],
    [80, "redo(); refreshNow(); S.cnt"],
    [80, "document.querySelectorAll('#tags .tag').length"],
    [80, "togglePin(S.list[0]); togglePin(S.list[1]); openDrawer('compare'); document.querySelectorAll('.cmp-row').length"],
    [80, "setTab('target'); btMaterial('ti6al4v'); document.querySelector('#dTarget .bt-status').textContent.slice(0,40)"],
    [400, "setTab('key'); renderKeyPane('pore'); document.querySelectorAll('.key-it').length"],
    [80, "closeDrawer(); setView('table'); document.querySelectorAll('.tbl tbody tr').length"],
    [80, "setView('gallery'); step(1); step(1); S.sel && S.sel._id"],
    [80, "openCP(); cpBuild('gyr'); CP.items.length"],
    [80, "cpRun(0); S.sel && displayPreset(S.sel)"],
    [80, "setLayout('b'); document.querySelector('#dApp').className"],
    [80, "setAxis2('x', 'pore_size_p50_norm'); S.ax2.x"],
    /* v0.8.0 — density exponent and bound efficiency as axes and range filters; wave designs */
    [80, "hasMetric('_nexp') + ' ' + hasMetric('_beff') + ' ' + DB.stats._nexp.n + ' with n'"],
    [80, "setAxis2('y', '_nexp'); setAxis2('x', '_beff'); S.ax2.x + ' / ' + S.ax2.y"],
    [80, "var b = DB.all.filter(d => d._nexpLvl > 0 && isNum(d._nexp))[0]; b ? (b._col[0].toFixed(2) + ' faded') : 'no borrowed'"],
    [80, "setRange('_nexp', 1.2, 2.4); setRange('_beff', 0.05, 0.6); changed('test ranges'); refreshNow(); S.cnt + ' lit'"],
    [80, "delete F.ranges._nexp; delete F.ranges._beff; setAxis2('x', 'volume_fraction', true); setAxis2('y', '_emax', true); refreshNow(); S.cnt"],
    [80, "var wv = DB.all.filter(d => d.family === 'wave'); wv.length + ' wave · ' + recipeLines(wv[0]).map(r => r[0] + '=' + r[1]).join(' | ').slice(0, 160)"],
    [80, "setAxis3('y', 'stiffness_density_norm'); S.ax3.y"],
    [80, "VIEWS.p2.R={L:100,T:80,W:600,H:400}; VIEWS.p2.brush=[150,120,500,400]; applyBrush2D(VIEWS.p2); refreshNow(); Object.keys(F.ranges).join(',')"],
    [80, "setTarget('volume_fraction','_emax',30,0.05); refreshNow(); S.sort.k + ' ' + (S.list[0] && S.list[0]._tdist.toFixed(3))"],
    [80, "document.querySelectorAll('.t-banner').length"],
    /* v0.7.0 — aim F13LD.sweep at the target (23-reach.js, 70-handoff.js) */
    [80, "var sd = reachSeed(F.target); sd ? sd.reason + ' · ' + sd.d.family + ' ' + sd.d._stiff_flag + ' · ρ ' + (sd.phi * 100).toFixed(1) + ' % · residual ' + sd.residual.toFixed(3) : 'none'"],
    [80, "var tp = reachPayload(F.target, reachSeed(F.target)); JSON.stringify(tp.metrics) + ' · ' + tp.density.lo + '–' + tp.density.hi + ' % · ' + tp.variation + ' ± ' + tp.spread"],
    [80, "window.__opened = null; window.open = function (u) { window.__opened = u; return null; }; aimSweep(); var tq = JSON.parse(decodeURIComponent(window.__opened.split('&t=')[1])); var rq = JSON.parse(decodeURIComponent(window.__opened.split('#r=')[1].split('&t=')[0])); (window.__opened.indexOf(SWEEP_URL) === 0) + ' ' + tq.seed.reason + ' ' + !!rq.geometry"],
    [80, "reachPhysics({ kx: 'volume_fraction', ky: '_emax', x: 20, y: 0.5 }).join(' | ')"],
    [80, "reachPhysics({ kx: 'volume_fraction', ky: '_emax', x: 30, y: 0.05 }).length"],
    [80, "reachPhysics({ kx: 'tortuosity_min', ky: 'd_eff_max_norm', x: 1.2, y: 0.995 }).join(' | ') + ' / ' + reachPhysics({ kx: 'tortuosity_min', ky: 'd_eff_max_norm', x: 1.2, y: 0.9 }).length"],
    [80, "solverText({ method: 'FFT-CG', version: '0.24.0', backend: 'gpu', gpu_adapter: 'x' }) + ' | ' + solverText('gpu-fft') + ' | ' + aimedText({ target: { metrics: [{ key: '_emax', value: 0.05 }], rounds: [{}, {}] } })"],
    [80, "select(S.list[0], 'hero'); window.__opened = null; openSweep(S.sel); window.__opened && window.__opened.indexOf('&t=') > 0"],
    /* v0.7.1 — aimed runs and the new colour modes (24-aim.js) */
    [80, "DB.aimRuns.length + ' runs · ' + DB.aimRuns.map(function (R) { return R.designs.length + ' designs, ' + R.hits + ' on target, seed ' + (R.seed ? R.seed._id : 'missing'); }).join(' | ')"],
    [80, "setColor('aim'); document.querySelector('#legend').textContent.replace(/\\s+/g, ' ').slice(0, 120)"],
    [80, "selectAimRun(DB.aimRuns[0].id); S.aimSel === DB.aimRuns[0].id && DB.all.filter(function (d) { return d._colHex === DB.aimRuns[0].color; }).length"],
    [80, "setAxis2('x', 'volume_fraction', true); setAxis2('y', '_emax', true); VIEWS.p2.R = { L: 100, T: 80, W: 600, H: 400 }; VIEWS.p2.v = [0, 1, 0, 1]; VIEWS.p2.px = new Float32Array(DB.N); VIEWS.p2.py = new Float32Array(DB.N); aimOverlay2D(VIEWS.p2, VIEWS.p2.octx, plotScale('volume_fraction'), plotScale('_emax'), 'volume_fraction', '_emax').length"],
    [80, "selectAimRun(DB.aimRuns[0].id); S.aimSel"],
    [80, "clearAll(); refreshNow(); toggleChip('src:aimed'); refreshNow(); var n1 = S.cnt; removeFilter('src:aimed'); refreshNow(); toggleChip('aim:' + DB.aimRuns[1].id); refreshNow(); var n2 = S.cnt; removeFilter('aim:' + DB.aimRuns[1].id); refreshNow(); n1 + ' aimed · ' + n2 + ' in run 2 · back to ' + S.cnt"],
    [80, "select(DB.aimRuns[0].designs[0], 'hero'); !!document.querySelector('#iMore [data-act=show-aim]')"],
    [80, "setColor('_nexp'); var nx = DB.all.map(function (d) { return d._nexp; }).filter(isNum).sort(function (a, b) { return a - b; }); nx.length + ' with n · median ' + nx[nx.length >> 1].toFixed(2) + ' · legend ' + document.querySelector('#legend').textContent.replace(/\\s+/g, ' ')"],
    [80, "setColor('_beff'); var be = DB.all.map(beffOf).filter(isNum); be.length + ' · max ' + Math.max.apply(null, be).toFixed(2)"],
    [80, "setColor('_pdepth'); DB.paretoLayers + ' layers · front ' + S.list.filter(function (d) { return d._pdepth === 0; }).length"],
    [80, "select(S.list[2], 'hero'); setColor('_sim'); S.sel._sim.toFixed(2) + ' self · ' + DB.all.filter(function (d) { return isNum(d._sim) && d._sim > 0.6; }).length + ' alike'"],
    [80, "select(null); setColor('_sim'); document.querySelector('#legend').textContent"],
    [80, "setColor('family'); S.aimSel = null; S.color"],
    [80, "setPareto('auto'); FRONT.list.length"],
    [80, "var pc = paretoCurve([[10,90],[10.5,80],[40,70],[90,20],[200,15]], { x: 1, y: 1 }); pc.p.length + ' points · ' + pc.seg.length + ' segments · ' + pc.ext.length + ' ends'"],
    [80, "setGap(true); GAP.grid ? GAP.max : 'no grid'"],
    [80, "VIEWS.h3.projOK=true; VIEWS.h3.brush=[0,0,900,520]; applyBrush3D(VIEWS.h3); refreshNow(); F.region && F.region.length"],
    [80, "removeFilter('region'); refreshNow(); F.region"],
    [80, "setColor('_scar'); DB.all.filter(d=>d._scar!=null).length"],
    [80, "setColor('family'); legendClick('beam', false); refreshNow(); F.fam.join(',')"],
    [80, "clearAll(); refreshNow(); S.cnt === DB.N"],
    [80, "copyViewLink(); shareURL().length > 20"],
    /* v0.6 strain: hidden without a load; Biomedical asks; real με once applied; Not now remembered */
    [80, "btReset(); localStorage.removeItem(LS_BIO_SKIP); closeBioPrompt('close');"],
    [400, "hasMetric('microstrain_avg_per_gpa') + ' ' + DB.esRefGuess.toFixed(1)"],
    [80, "setDomain('all'); setDomain('biomedical');"],
    [400, "document.querySelector('#bioDlg').classList.contains('open') + ' ' + document.querySelectorAll('#tags .tag.needs').length + ' · stress chips ' + document.querySelectorAll('#bioDlg .sp-chip').length"],
    [80, "document.querySelector('#bioMat').value = 'ti6al4v'; document.querySelector('#bioMat').onchange(); document.querySelector('#bioSig').value = 10; document.querySelector('#bioCell').value = 2; closeBioPrompt('apply');"],
    [500, "var d0 = DB.all.find(function (d) { return d.ex_norm > 0.01; }); hasMetric('microstrain_avg_per_gpa') + ' ' + Math.round(d0.microstrain_x_per_gpa) + ' vs ' + Math.round(1000 / d0.ex_norm * 10 / globalInputs.modulus_gpa) + ' · tags ' + document.querySelectorAll('#tags .tag.needs').length"],
    [80, "refreshNow(); var f = scoreFactors(S.list[0], 'biomedical', domainPop('biomedical')); f.factors[1].label + ' = ' + f.factors[1].txt"],
    [80, "btReset();"],
    [500, "hasMetric('microstrain_avg_per_gpa') + ' ' + document.querySelectorAll('#tags .tag.needs').length"],
    [80, "setDomain('all'); setDomain('biomedical');"],
    [400, "var o = document.querySelector('#bioDlg').classList.contains('open'); closeBioPrompt('skip'); setDomain('all'); setDomain('biomedical'); o"],
    [400, "document.querySelector('#bioDlg').classList.contains('open') + ' (should be false: Not now remembered)'"],
    [80, "setDomain('all'); clearAll(); refreshNow(); S.cnt === DB.N"],
    /* v0.9.0 metrics audit: tensor math on an isotropic solid (E 1, ν 0.3) must read A^U 0 · Zener 1 · G/E 0.385 · E dir 1 · ν 0.3 · HS 1 at full density */
    [80, "var e = 1, n = 0.3, l = e * n / ((1 + n) * (1 - 2 * n)), mu = e / (2 * (1 + n)), C = [[l + 2 * mu, l, l, 0, 0, 0], [l, l + 2 * mu, l, 0, 0, 0], [l, l, l + 2 * mu, 0, 0, 0], [0, 0, 0, mu, 0, 0], [0, 0, 0, 0, mu, 0], [0, 0, 0, 0, 0, mu]]; var t = { volume_fraction: 100, metrics_extended: { C_GPa: C, Es_ref_GPa: 1 } }; elasticOf(t); [t._au, t._zener, t._ge, t._edmax, t._edmin, t._numin, t._hs, t._kb].map(function (v) { return v.toFixed(3); }).join(' ') + ' ' + t._pois"],
    [80, "['_numin', '_edmax', '_au', '_zener', '_kb', '_hs', '_ge', '_tp', '_keff', '_hL', '_ga', '_sv', '_bsbv', '_cfneg', '_cfsad', '_crad', '_ckneg'].map(function (k) { return k + ' ' + (hasMetric(k) ? fmtNum(DB.stats[k].min) + '…' + fmtNum(DB.stats[k].max) : 'MISSING'); }).join(' · ')"],
    [80, "pickableMetrics().length + ' pickable of ' + metricsAll().length + ' · retired shown in picker: ' + pickableMetrics().filter(function (m) { return m.retired; }).length"],
    /* v0.11.0 — trimmed at the reseed: gone from every list, never fetched */
    [80, "var gone = ['ortho_contrast', 'aniso_efficiency', 'surface_complexity', 'u_compliance', '_perf', 'throat_ratio', 'h_mean', 'h_mean_abs', 'h_std', 'k_gauss_mean', 'mih', '_kL2'].filter(function (k) { return METRIC_MAP[k]; }); var fetched = ['ortho_contrast', 'aniso_efficiency', 'surface_complexity', 'u_compliance', 'throat_ratio', 'k_gauss_mean'].filter(function (k) { return VAULT_COLUMNS.indexOf(k) >= 0; }); if (gone.length || fetched.length) throw new Error(gone.concat(fetched).join(',')); 'trimmed metrics gone · columns not fetched'"],
    /* v0.11.0 — tortuosity over open axes: a blocked axis (10) is left out of the average */
    [80, "var t = { metrics_extended: { tortuosity_x: 1.2, tortuosity_y: 1.4, tortuosity_z: 10, tortuosity_nonperc: 4 }, tortuosity_avg: 4.2, tortuosity_min: 1.2 }; derivedColumns(t); var u = { metrics_extended: { tortuosity_x: 10, tortuosity_y: 10, tortuosity_z: 10, tortuosity_nonperc: 7 }, tortuosity_avg: 10, tortuosity_min: 10 }; derivedColumns(u); if (Math.abs(t.tortuosity_avg - 1.3) > 1e-9 || t.tortuosity_min !== 1.2 || u.tortuosity_avg !== null || u.tortuosity_min !== null) throw new Error(JSON.stringify([t.tortuosity_avg, u.tortuosity_avg])); 'tortuosity avg ' + t.tortuosity_avg.toFixed(2) + ' (stored 4.20) · all blocked → empty'"],
    /* v0.11.0 — surface area: A/L² → S_V and BS/BV in mm⁻¹ at a 2 mm cell; concave radius in µm */
    [80, "var keep = globalInputs.cell_size_mm; globalInputs.cell_size_mm = 2; var a = resolveValue(3.1, '_sv'), b = resolveValue(3.1 / 0.25, '_bsbv'), r = resolveValue(1 / 4.2, '_crad'); globalInputs.cell_size_mm = keep; if (a.unit !== 'mm⁻¹' || a.value !== '1.55' || b.value !== '6.20' || r.unit !== 'μm') throw new Error([a.value, b.value, r.value].join(' ')); resolveLabel('_sv', true) + ' ' + a.value + ' ' + a.unit + ' · BS/BV ' + b.value + ' · R concave ' + r.value + ' ' + r.unit"],
    /* v0.11.0 — curvature check filter and colour mode */
    [80, "toggleChip('cflag:flagged'); refreshNow(); var a = S.cnt, t = activeFilterList().some(function (x) { return x.dim === 'cflag'; }); removeFilter('cflag:flagged'); refreshNow(); if (!a || !t || S.cnt !== DB.N) throw new Error(a + ' ' + t); setColor('_cfneg'); var ok = colorMode().id === '_cfneg'; setColor('_curv_flag'); ok = ok && colorMode().id === '_curv_flag'; setColor('family'); if (!ok) throw new Error('colour'); a + ' flagged · tag · colour modes'"],
    [80, "toggleChip('pois:auxetic'); refreshNow(); var a = S.cnt; toggleChip('pois:auxetic'); refreshNow(); a + ' auxetic · tag ' + (activeFilterList().length)"],
    [80, "setDomain('spread'); refreshNow(); DOMAIN_SHORT[F.domain] + ' · scored ' + DB.all.filter(function (d) { return isNum(d._score); }).length + ' · axes ' + [S.ax3.x, S.ax3.y, S.ax2.x, S.ax2.y].join(' ')"],
    /* v0.9.0 biomedical: plateau on the mean pore (300–600 µm), throat gate at 100 µm; plateau maths */
    [80, "[plateauWindow(450, 300, 600), plateauWindow(300, 300, 600), plateauWindow(600 * Math.exp(0.458), 300, 600), plateauWindow(150, 100, Infinity), plateauWindow(60, 100, Infinity)].map(function (v) { return v.toFixed(2); }).join(' ') + ' (1 1 0.50 1 low)'"],
    [80, "globalInputs.cell_size_mm = 2; setDomain('biomedical'); closeBioPrompt('skip'); strainInputsChanged(); refreshNow(); var f = scoreFactors(S.list[0], 'biomedical', domainPop('biomedical')); f.factors.map(function (x) { return x.label + ' = ' + x.txt; }).join(' | ') + ' · scored ' + DB.all.filter(function (d) { return isNum(d._score); }).length"],
    [80, "globalInputs.pore_lo = 500; globalInputs.pore_hi = 800; strainInputsChanged(); refreshNow(); var t0 = S.list[0]; var um = bioSizesUm(t0); 'window 500–800 · top design mean pore ' + Math.round(um.pore) + ' µm'"],
    [80, "btReset(); setDomain('all'); globalInputs.pore_lo + '–' + globalInputs.pore_hi + ' after reset'"],
    [80, "setDomain('automotive'); var f = scoreFactors(S.list[0], 'automotive', domainPop('automotive')); f.factors.map(function (x) { return x.label; }).join(' | ')"],
    [80, "setDomain('oilgas'); var f = scoreFactors(S.list[0], 'oilgas', domainPop('oilgas')); f.factors.map(function (x) { return x.label; }).join(' | ')"],
    [80, "setDomain('all'); S.ax3.x + ' (default 3D X)'"],
    /* v0.9.0 correlation map: opens over the filtered set; VF vs peak stiffness strongly positive; a row click plots the pair */
    [200, "openTrends(); var ia = TR.keys.indexOf('volume_fraction'), ib = TR.keys.indexOf('_emax'), ic2 = TR.keys.indexOf('stiffness_density_norm'), id2 = TR.keys.indexOf('_beff'); TR.open + ' · ' + TR.keys.length + ' metrics · ' + TR.N + ' designs · ρ(VF, E*) ' + trFmt(TR.M[ia][ib]) + ' · ρ(Voigt avg, Voigt max) ' + trFmt(TR.M[ic2][id2]) + ' · order ' + TR.idx.length + ' · rows ' + document.querySelectorAll('#trSide .tr-row').length"],
    [80, "document.querySelector('[data-tr-ord=group]') && document.querySelector('[data-tr-ord=group]').click(); TR.order + ' ' + TR.idx.length"],
    [80, "var r = document.querySelector('#trSide .tr-row'); var p = r.dataset.trPair.split(',').map(Number); r.click(); TR.open + ' · 2D ' + S.ax2.x + ' × ' + S.ax2.y + ' = ' + TR.keys[p[0]] + ' × ' + TR.keys[p[1]]"],
    [80, "toggleChip('fam:tpms'); refreshNow(); openTrends(); var n = TR.N; closeTrends(); toggleChip('fam:tpms'); refreshNow(); n + ' designs when filtered to TPMS · closed ' + !TR.open"],
    /* v0.8.2 — a domain sets its own 3D and 2D axes; Keep my axes puts them back; a load upgrades biomedical to pore vs strain */
    [80, "setDomain('aerospace'); [S.ax3.x, S.ax3.y, S.ax3.z, S.ax2.x, S.ax2.y].join(' ')"],
    [80, "setDomain('thermal'); [S.ax3.x, S.ax3.y, S.ax3.z, S.ax2.x, S.ax2.y].join(' ')"],
    [80, "btReset(); setDomain('biomedical'); closeBioPrompt('skip'); [S.ax3.x, S.ax3.y, S.ax2.x, S.ax2.y].join(' ') + ' (no load: pore vs density)'"],
    [80, "globalInputs.ref_stress_mpa = 10; globalInputs.modulus_gpa = 110; globalInputs.cell_size_mm = 2; strainInputsChanged(); [S.ax3.x, S.ax3.y, S.ax2.x, S.ax2.y].join(' ') + ' (load: pore vs strain)'"],
    [80, "btReset(); setAxis3('x', 'volume_fraction'); setDomain('oilgas'); document.querySelector('#toast .toast-act').click(); S.ax3.x + ' (kept)'"],
    [80, "setDomain('all'); [S.ax3.x, S.ax3.y, S.ax3.z, S.ax2.x, S.ax2.y].join(' ')"],
    /* v0.10.0 — My variables: build from a template onto the 2D Y axis, values, duplicate check, commas, errors, colour / sort / range, share link, delete, undo */
    [80, "localStorage.removeItem(LS_VARS); VARS.length = 0; varRegisterAll(); openVarBuilder({ target: { attr: 'setax2', axis: 'y' } }); S.drawer + ' ' + S.tab + ' · menu entry ' + (metricMenuHTML('setax2', 'y', S.ax2.y).indexOf('data-newvar') > 0)"],
    [80, "document.querySelector('#dVars [data-vbtpl=\"2\"]').click(); var sv = document.querySelector('#vbSave'); if (sv.disabled) throw new Error('save disabled'); sv.click(); var v = VARS[0]; if (!v || S.ax2.y !== v.k || !hasMetric(v.k) || METRIC_MAP[v.k].group !== 'My variables') throw new Error('not on the axis'); v.label + ' · ' + v.short + ' · ' + varPretty(v.f)"],
    [80, "var v = VARS[0], d = DB.all.filter(function (x) { return isNum(x._emax) && isNum(x.volume_fraction); })[0], want = d._emax / Math.pow(d.volume_fraction / 100, 2); if (Math.abs(d[v.k] - want) > 1e-9 * Math.abs(want)) throw new Error('value ' + d[v.k] + ' vs ' + want); DB.stats[v.k].n + ' designs · log ' + DB.log[v.k]"],
    [80, "VB.f = '[_emax] / ([volume_fraction] / 100)'; vbRefresh(); if (!VB.dup || VB.dup.k !== '_beff') throw new Error('dup ' + JSON.stringify(VB.dup)); 'duplicate of ' + VB.dup.k + ' ρ ' + VB.dup.r.toFixed(4)"],
    [80, "VB.f = ''; vbAppend('max('); vbAppend('[ex_norm]'); vbAppend('[ey_norm]'); vbAppend('[ez_norm]'); vbAppend(')'); if (varCompile(VB.f).err) throw new Error(VB.f); VB.f"],
    [80, "VB.f = '[ex_norm] [ey_norm]'; vbRefresh(); var m = document.querySelector('#vbMsg').textContent; if (m !== 'Add an operator between Ex and Ey') throw new Error(m); m + ' · score refused: ' + /domain/.test(varCompile('[_score] * 2').err)"],
    [80, "var k = VARS[0].k; setColor(k); S.sort = { k: k, dir: -1 }; addRangeKey(k); var st = DB.stats[k]; F.ranges[k] = [st.min, (st.min + st.max) / 2]; changed('range ' + k); refreshNow(); if (colorMode().id !== k) throw new Error('colour'); 'colour ' + colorMode().label + ' · ' + S.cnt + ' in range · compare row ' + (compareKeys(F.domain).length >= 0)"],
    [80, "var k = VARS[0].k, h = shareURL().split('#')[1], j = JSON.parse(b64d(h.slice(2))); if (!j.u || j.u[0].k !== k) throw new Error('link has no variable'); window.__link = h; 'link carries ' + j.u.length + ' variable'"],
    [80, "var k = VARS[0].k, r = varDelete(k); if (r.err) throw new Error(r.err); if (S.ax2.y === k || S.color === k || F.ranges[k] || F.rangeKeys.indexOf(k) >= 0) throw new Error('left behind'); refreshNow(); 'deleted · y ' + S.ax2.y + ' · colour ' + S.color + ' · ' + S.cnt + ' lit · stored ' + Store.get(LS_VARS, []).length"],
    [80, "undo(); refreshNow(); if (Object.keys(F.ranges).some(function (k) { return /^_u/.test(k) && !METRIC_MAP[k]; })) throw new Error('undo restored a deleted range'); 'undo safe · ' + S.cnt + ' lit'"],
    [80, "location.hash = window.__link; readShareLink(); var v = VARS[0]; if (!v || !v.linkOnly || S.ax2.y !== v.k) throw new Error('link import'); refreshNow(); varsKeepLinked(); 'from link: ' + v.label + ' · kept ' + !v.linkOnly + ' · stored ' + Store.get(LS_VARS, []).length"],
    [80, "var v = VARS[0], r = varSaveDef({ label: v.label, short: v.short, f: '[_emax] / ([volume_fraction] / 100) ^ 3', scale: 'log', better: 1 }, v.k), d = DB.all.filter(function (x) { return isNum(x[v.k]); })[0]; if (Math.abs(d[v.k] - d._emax / Math.pow(d.volume_fraction / 100, 3)) > 1e-9 * d[v.k]) throw new Error('edit'); 'edited · log ' + DB.log[v.k] + ' · better ' + v.better + ' · in compare ' + (renderCompare(), true)"],
    [80, "var a = varSaveDef({ label: 'Uses the first', short: '', f: '[' + VARS[0].k + '] * 2', scale: 'auto', better: 0 }, null); if (a.err) throw new Error(a.err); var r = varDelete(VARS[0].k); if (!r.err) throw new Error('delete of a used variable went through'); 'blocked: ' + r.err"],
    [80, "if (!varCompile('[' + VARS[0].k + '] + 1', VARS[0].k).err) throw new Error('self reference'); renderVarsPane(); document.querySelectorAll('#vbSaved .vb-sv').length + ' saved rows · palette ' + (cpBuild('variable'), CP.items.some(function (i) { return /New variable/.test(i.l); }))"],
    [80, "location.hash = ''; clearAll(); setAxis2('y', '_emax'); setColor('family'); S.sort = { k: '_score', dir: -1 }; closeDrawer(); refreshNow(); S.cnt === DB.N"],
    /* v0.11.0 — templates on a Vault without surface area: the voxel-face fallback is gone, so the template hides; a missing input says so */
    [80, "var keep = DB.stats._sv; delete DB.stats._sv; openVarBuilder({}); var ti = VAR_TEMPLATES.map(function (t) { return t.f.indexOf('[_sv]') >= 0; }).indexOf(true), shown = document.querySelector('#dVars [data-vbtpl=\"' + ti + '\"]'), e = varCompile('[_sv] / 2').err; DB.stats._sv = keep; renderVarsPane(); closeDrawer(); if (ti < 0 || shown) throw new Error('template ' + ti + ' shown'); if (!/no values in the Vault yet/.test(e)) throw new Error(e); 'no S/V: template hidden · ' + e"],
    [80, "var keep = DB.stats.pore_size_norm; delete DB.stats.pore_size_norm; openVarBuilder({}); var n = document.querySelectorAll('#dVars [data-vbtpl]').length; DB.stats.pore_size_norm = keep; renderVarsPane(); closeDrawer(); if (n !== VAR_TEMPLATES.length - 1) throw new Error(n); n + ' templates shown without pore size'"],
    /* v0.10.0 — the tour: every stop, try-its, finish; the guide's tour button; the returning-user offer */
    [80, "localStorage.removeItem(LS_TOUR); startTour(); TOUR.on + ' · ' + TOUR.steps.length + ' stops · ' + TOUR.steps.map(function (s) { return s.id; }).join(' ')"],
    [400, "var seen = []; for (var n = 0; n < 30 && TOUR.on; n++) { var st = tourStep(); seen.push(st.id); var d = document.querySelector('[data-tour=do]'); if (d) d.click(); if (st.tr && st.tr.act && !TOUR.did[st.tr.k] && st.tr.k !== 'target') throw new Error('try-it ' + st.id); document.querySelector('[data-tour=next]').click(); } if (TOUR.on) throw new Error('tour did not finish'); seen.length + ' stops · pin tried ' + S.pins.length + ' · gap ' + S.gap + ' · stored ' + Store.get(LS_TOUR)"],
    [80, "setGap(false); S.pins = []; pinsChanged(); Store.set(LS_TOUR, false); tourOfferWanted() + ' · offer ' + (offerTour(), !!document.querySelector('#tourCard [data-tour=start]')) + ' · later ' + (document.querySelector('[data-tour=later]').click(), Store.get(LS_TOUR))"],
    [80, "openWelcome(); WG.dom = 'all'; WG.step = 2; renderWelcome(); document.querySelector('#welDlg [data-wg=tour]').click(); var r = TOUR.on + ' · welcome open ' + WG.open + ' · retired ' + welcomeDone(); endTour(); r"],
    [80, "selectAimRun && true; tourEvent('select'); 'events without a tour are ignored'"],
    [80, "window.__phone = true; applyMobile(); S.mobile"],
    [200, "select(S.list[3], 'hero'); S.mInsp + ' ' + document.querySelector('#mBody').innerHTML.length"],
    [80, "act('m-back'); document.querySelectorAll('#mBody .card').length"],
    [80, "openMFilters(); document.querySelector('#mFilters').className"],
    [80, "setMhv('2d'); S.mhv"],
    [80, "setSnap('full'); setSnap('peek'); document.querySelector('#mSheet').style.transform"],
    [80, "startTour(); var ids = TOUR.steps.map(function (s) { return s.id; }); for (var n = 0; n < 30 && TOUR.on; n++) document.querySelector('[data-tour=next]').click(); if (ids.indexOf('compare') >= 0 || ids.indexOf('build') >= 0) throw new Error('phone stops'); 'phone tour ' + ids.length + ' stops · ' + ids.join(' ')"],
    [80, "setTool2('box'); setMhv('3d'); var h3 = document.querySelector('#mTools2').hidden; setMhv('2d'); var h2 = document.querySelector('#mTools2').hidden; act('m-target'); var on = document.querySelector('[data-act=m-target]').classList.contains('on') && S.tool2 === 'target'; act('m-target'); act('gap'); var g = S.gap && document.querySelector('#mTools2 [data-act=gap]').classList.contains('on'); act('gap'); if (!h3 || h2 || !on || !g || S.tool2 !== 'box') throw new Error('toolbar ' + [h3, h2, on, g, S.tool2, S.gap]); 'phone 2D toolbar: hidden in 3D, Target and gap map toggle'"],
    [80, "S.mInsp = true; renderMobile(); setSnap('full'); startTour(); TOUR.i = TOUR.steps.map(function (s) { return s.id; }).indexOf('vars'); tourShow(); var r = S.snap + ' ' + S.mInsp; TOUR.i = TOUR.steps.length - 1; tourShow(); r += ' / ' + S.snap + ' ' + S.mInsp; var gs = TOUR_STEPS.filter(function (s) { return s.id === 'gap' || s.id === 'aim'; }).map(function (s) { return !!document.querySelector(s.m); }); endTour(); if (r !== 'peek false / peek false' || gs.indexOf(false) >= 0) throw new Error(r + ' ' + gs); 'phone tour lowers the sheet: ' + r + ' · gap and aim targets exist'"],
    [80, "openVarBuilder({}); var o = document.querySelector('#varDlg').classList.contains('open'), n = document.querySelectorAll('#varBody .vb-sv').length; closeVarDlg(); 'phone builder open ' + o + ' · ' + n + ' saved · closed ' + !document.querySelector('#varDlg').classList.contains('open')"],
    [80, "window.__phone = false; applyMobile(); S.mobile"],
    [300, "PV.ok + ' ' + S.ready"]
  ];
  let i = 0, out = [];
  (function next() {
    if (i >= steps.length) {
      setTimeout(() => {
        out.forEach(l => console.log(l));
        console.log('\nerrors: ' + errs.length); errs.slice(0, 20).forEach(e => console.log('  - ' + e.slice(0, 400)));
        w.close(); process.exit(errs.length ? 1 : 0);
      }, 300);
      return;
    }
    const [ms, code] = steps[i++];
    setTimeout(() => { const v = ev(code); out.push(code.slice(0, 64).padEnd(66) + '=> ' + JSON.stringify(v)); next(); }, ms);
  })();
});
