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
    [400, "document.querySelector('#welDlg [data-wg=next]').click(); WG.step + ' · spot ' + (S.spot && S.spot.size) + ' · load ' + hasLoad() + ' · docked ' + document.querySelector('#welDlg').classList.contains('dock') + ' · spot cards ' + document.querySelectorAll('.card.spot').length"],
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
    /* v0.8.2 — a domain sets its own 3D and 2D axes; Keep my axes puts them back; a load upgrades biomedical to pore vs strain */
    [80, "setDomain('aerospace'); [S.ax3.x, S.ax3.y, S.ax3.z, S.ax2.x, S.ax2.y].join(' ')"],
    [80, "setDomain('thermal'); [S.ax3.x, S.ax3.y, S.ax3.z, S.ax2.x, S.ax2.y].join(' ')"],
    [80, "btReset(); setDomain('biomedical'); closeBioPrompt('skip'); [S.ax3.x, S.ax3.y, S.ax2.x, S.ax2.y].join(' ') + ' (no load: pore vs density)'"],
    [80, "globalInputs.ref_stress_mpa = 10; globalInputs.modulus_gpa = 110; globalInputs.cell_size_mm = 2; strainInputsChanged(); [S.ax3.x, S.ax3.y, S.ax2.x, S.ax2.y].join(' ') + ' (load: pore vs strain)'"],
    [80, "btReset(); setAxis3('x', 'volume_fraction'); setDomain('oilgas'); document.querySelector('#toast .toast-act').click(); S.ax3.x + ' (kept)'"],
    [80, "setDomain('all'); [S.ax3.x, S.ax3.y, S.ax3.z, S.ax2.x, S.ax2.y].join(' ')"],
    [80, "window.__phone = true; applyMobile(); S.mobile"],
    [200, "select(S.list[3], 'hero'); S.mInsp + ' ' + document.querySelector('#mBody').innerHTML.length"],
    [80, "act('m-back'); document.querySelectorAll('#mBody .card').length"],
    [80, "openMFilters(); document.querySelector('#mFilters').className"],
    [80, "setMhv('2d'); S.mhv"],
    [80, "setSnap('full'); setSnap('peek'); document.querySelector('#mSheet').style.transform"],
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
