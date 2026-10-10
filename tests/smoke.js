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
    [80, "setPareto('auto'); FRONT.list.length"],
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
    [400, "document.querySelector('#bioDlg').classList.contains('open') + ' ' + document.querySelectorAll('#tags .tag.needs').length"],
    [80, "document.querySelector('#bioMat').value = 'ti6al4v'; document.querySelector('#bioMat').onchange(); document.querySelector('#bioSig').value = 10; document.querySelector('#bioCell').value = 2; closeBioPrompt('apply');"],
    [500, "var d0 = DB.all.find(function (d) { return d.ex_norm > 0.01; }); hasMetric('microstrain_avg_per_gpa') + ' ' + Math.round(d0.microstrain_x_per_gpa) + ' vs ' + Math.round(1000 / d0.ex_norm * 10 / globalInputs.modulus_gpa) + ' · tags ' + document.querySelectorAll('#tags .tag.needs').length"],
    [80, "refreshNow(); var f = scoreFactors(S.list[0], 'biomedical', domainPop('biomedical')); f.factors[1].label + ' = ' + f.factors[1].txt"],
    [80, "btReset();"],
    [500, "hasMetric('microstrain_avg_per_gpa') + ' ' + document.querySelectorAll('#tags .tag.needs').length"],
    [80, "setDomain('all'); setDomain('biomedical');"],
    [400, "var o = document.querySelector('#bioDlg').classList.contains('open'); closeBioPrompt('skip'); setDomain('all'); setDomain('biomedical'); o"],
    [400, "document.querySelector('#bioDlg').classList.contains('open') + ' (should be false: Not now remembered)'"],
    [80, "setDomain('all'); clearAll(); refreshNow(); S.cnt === DB.N"],
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
