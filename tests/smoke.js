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
    [80, "setPareto('auto'); FRONT.list.length"],
    [80, "setGap(true); GAP.grid ? GAP.max : 'no grid'"],
    [80, "VIEWS.h3.projOK=true; VIEWS.h3.brush=[0,0,900,520]; applyBrush3D(VIEWS.h3); refreshNow(); F.region && F.region.length"],
    [80, "removeFilter('region'); refreshNow(); F.region"],
    [80, "setColor('_scar'); DB.all.filter(d=>d._scar!=null).length"],
    [80, "setColor('family'); legendClick('beam', false); refreshNow(); F.fam.join(',')"],
    [80, "clearAll(); refreshNow(); S.cnt === DB.N"],
    [80, "copyViewLink(); shareURL().length > 20"],
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
