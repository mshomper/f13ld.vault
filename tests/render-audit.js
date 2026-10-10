/* ============================================================
   F13LD.vault · tests/render-audit.js
   Opens the page in real Chrome on the sample data at three desktop sizes
   and one phone size, saves screenshots, and reports:
     · any text under 12 px
     · text that overlaps other text (clipped to what is visible on screen)
     · horizontal page scroll
     · page errors and failed requests
     · buttons that do nothing when clicked with a real mouse
   This is the collision check for the 12 px minimum.

     npm install                          (once — playwright-core + jsdom)
     npx http-server -p 8765 .            (or: python -m http.server 8765)
     node tests/render-audit.js           (screenshots land in tests/shots/)

   Uses your installed Chrome. Point CHROME at another build if needed:
     CHROME="C:/Program Files/Google/Chrome/Application/chrome.exe" node tests/render-audit.js
   ============================================================ */
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright-core');
const OUT = process.argv[2] || path.join(__dirname, 'shots'), URL = process.env.VAULT_URL || 'http://localhost:8765/index.html?mock';
fs.mkdirSync(OUT, { recursive: true });
const sizes = [['d1600',1600,900,false],['d1280',1280,760,false],['d1024',1024,700,false],['p390',390,844,true]];
const AUDIT = `(() => {
  const res = { small: [], overflow: [], overlap: [] };
  const vis = el => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity !== 0 && el.closest('[inert]') == null ? r : null; };
  const txt = [...document.querySelectorAll('body *')].filter(el => [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && !el.closest('svg') && !el.closest('#splash'));
  const name = el => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\\s+/).slice(0,2).join('.') : '') + ' "' + el.textContent.trim().slice(0, 24) + '"';
  const boxes = [];
  txt.forEach(el => { const r = vis(el); if (!r) return; const fs = parseFloat(getComputedStyle(el).fontSize); if (fs < 12) res.small.push(name(el) + ' ' + fs);
    if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflow === 'visible' && getComputedStyle(el).textOverflow !== 'ellipsis') res.overflow.push(name(el) + ' ' + el.scrollWidth + '>' + el.clientWidth);
    const rg = document.createRange(); rg.selectNodeContents(el); const b0 = rg.getBoundingClientRect(); let rr = { left: b0.left, top: b0.top, right: b0.right, bottom: b0.bottom };
    for (let an = el; an && an !== document.body; an = an.parentElement) { const o = getComputedStyle(an); if (o.overflow !== 'visible' || o.overflowY !== 'visible') { const q = an.getBoundingClientRect(); rr = { left: Math.max(rr.left, q.left), top: Math.max(rr.top, q.top), right: Math.min(rr.right, q.right), bottom: Math.min(rr.bottom, q.bottom) }; } }
    if (rr.right - rr.left > 1 && rr.bottom - rr.top > 1) boxes.push([el, rr]); });
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) { const [a, ra] = boxes[i], [b, rb] = boxes[j]; if (a.contains(b) || b.contains(a)) continue;
    const ox = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left), oy = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
    if (ox > 2 && oy > 2) { const pa = a.closest('.menu,.tip,.toast,.cp,.kbd,.drawer'), pb = b.closest('.menu,.tip,.toast,.cp,.kbd,.drawer'); if (pa !== pb) continue; res.overlap.push(name(a) + ' X ' + name(b)); } }
  res.hscroll = document.documentElement.scrollWidth > innerWidth ? document.documentElement.scrollWidth : 0;
  return res; })()`;

/* Real-mouse click on every distinct visible button: flags any that change
   nothing on the page (no DOM change, no state change, no new window). */
async function clickSweep(p, n) {
  await p.goto(URL); await p.waitForTimeout(3500);
  await p.evaluate(() => { window.__opened = 0; window.open = () => { window.__opened++; return null; };
    const a = HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click = function () { window.__opened++; }; });
  const keys = await p.evaluate(() => {
    const seen = new Set(), out = [];
    document.querySelectorAll('button, [role=button]').forEach((el, i) => {
      const r = el.getBoundingClientRect(); if (!r.width || !r.height || el.disabled || el.closest('[inert]') || el.closest('.card,.tbl tbody,#splash')) return;
      const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || +cs.opacity === 0) return;
      const sig = [...el.attributes].filter(a => a.name.startsWith('data-') && a.name !== 'data-ic' && a.name !== 'data-gl').map(a => a.name + '=' + a.value).join(' ') || ('#' + el.id) || el.textContent.trim().slice(0, 20);
      if (seen.has(sig) || /data-act=(mock|retry)/.test(sig)) return; seen.add(sig); el.dataset.auditI = i; out.push([i, sig, el.textContent.trim().slice(0, 24)]);
    });
    return out;
  });
  const dead = [];
  for (const [i, sig, txt] of keys) {
    const el = p.locator('[data-audit-i="' + i + '"]');
    const box = await el.boundingBox().catch(() => null); if (!box) continue;
    const top = await p.evaluate(([x, y, i]) => { const e = document.elementFromPoint(x, y); return !!(e && e.closest('[data-audit-i="' + i + '"]')); }, [box.x + box.width / 2, box.y + box.height / 2, i]);
    if (!top) continue;   // covered by something (menu, drawer) — not clickable right now
    await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await p.waitForTimeout(160);   // let hover tooltips settle first
    await p.evaluate(() => { window.__snap = () => document.body.innerHTML.replace(/ data-audit-i="\d+"/g, '') + JSON.stringify([S.tool, S.tool2, S.alive, S.pareto, S.gap, S.hv, S.view, S.color, S.sort, S.pins.length, S.sel && S.sel._id, IV.cells, IV.zoom, location.hash,
        VIEWS.h3 && [VIEWS.h3.yawT, VIEWS.h3.zT, VIEWS.h3.cT], VIEWS.p2 && VIEWS.p2.vT, VIEWS.m3 && VIEWS.m3.yawT, VIEWS.m2 && VIEWS.m2.vT]) + JSON.stringify(F);
      window.__s0 = __snap(); window.__o0 = window.__opened; });
    await p.mouse.click(box.x + box.width / 2, box.y + box.height / 2); await p.waitForTimeout(220);
    /* compare what the page actually shows and holds — rewriting an attribute with the same value doesn't count */
    const fx = await p.evaluate(() => ({ changed: __snap() !== __s0, opened: window.__opened !== __o0 }));
    const wasOn = await el.evaluate(e => e.classList.contains('on') || e.getAttribute('aria-pressed') === 'true').catch(() => false);
    if (!fx.changed && !fx.opened) dead.push(sig + '  "' + txt + '"' + (wasOn ? '  (was already on — fine)' : ''));
    await p.keyboard.press('Escape'); await p.waitForTimeout(80);
  }
  console.log(' click sweep: ' + keys.length + ' buttons, ' + dead.length + ' with no visible effect (a reset already at rest, or Queue offline, is expected)');
  dead.forEach(d => console.log('   no effect: ' + d));
}

(async () => {
  const launch = process.env.CHROME ? { executablePath: process.env.CHROME } : { channel: 'chrome' };
  const b = await chromium.launch(Object.assign(launch, { args: ['--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] }));
  for (const [n, w, h, ph] of sizes) {
    const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: ph, hasTouch: ph });
    const errs = []; p.on('pageerror', e => errs.push('pageerror ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/fonts\.g|ERR_TUNNEL|ERR_INTERNET/.test(m.text())) errs.push('console ' + m.text()); if (m.type() === 'warning' && /F13LD/.test(m.text())) errs.push('warn ' + m.text()); });
    await p.goto(URL); await p.waitForTimeout(5500);
    await p.screenshot({ path: OUT + '/' + n + '.png' });
    const st = await p.evaluate('({webgl2: PV.ok, points: !!(VIEWS.h3.pts && VIEWS.h3.pts.ok), sel: S.sel && S.sel._id, mobile: S.mobile})');
    const a = await p.evaluate(AUDIT);
    console.log('== ' + n, JSON.stringify(st), 'errs', errs.length, errs.slice(0,5));
    console.log(' small', a.small.length, a.small.slice(0, 12)); console.log(' overflow', a.overflow.slice(0, 12)); console.log(' overlap', a.overlap.length, a.overlap.slice(0, 20)); console.log(' hscroll', a.hscroll);
    if (!ph) {
      await p.evaluate("openDrawer('filters')"); await p.waitForTimeout(500); await p.screenshot({ path: OUT + '/' + n + '-filters.png' });
      const a2 = await p.evaluate(AUDIT); console.log(' drawer overlap', a2.overlap.slice(0, 12), 'small', a2.small.slice(0, 8));
      await p.evaluate("closeDrawer(); togglePin(S.list[0]); togglePin(S.list[1]); togglePin(S.list[2]); openDrawer('compare')"); await p.waitForTimeout(500); await p.screenshot({ path: OUT + '/' + n + '-compare.png' });
      await p.evaluate("closeDrawer(); setTarget('volume_fraction','_emax',30,0.05); setPareto('auto'); setView('table')"); await p.waitForTimeout(800); await p.screenshot({ path: OUT + '/' + n + '-target.png' });
      const a3 = await p.evaluate(AUDIT); console.log(' target overlap', a3.overlap.slice(0, 12));
    } else {
      await p.evaluate("setSnap('half')"); await p.waitForTimeout(500); await p.screenshot({ path: OUT + '/' + n + '-half.png' });
      await p.evaluate("select(S.list[2],'hero')"); await p.waitForTimeout(1500); await p.screenshot({ path: OUT + '/' + n + '-insp.png' });
      const a2 = await p.evaluate(AUDIT); console.log(' insp overlap', a2.overlap.slice(0, 12), 'small', a2.small.slice(0,8), 'hscroll', a2.hscroll);
      await p.evaluate("act('m-back'); openMFilters()"); await p.waitForTimeout(500); await p.screenshot({ path: OUT + '/' + n + '-filters.png' });
      await p.evaluate("closeMFilters(); setMhv('2d')"); await p.waitForTimeout(600); await p.screenshot({ path: OUT + '/' + n + '-2d.png' });
    }
    if (n === 'd1600' || n === 'p390') await clickSweep(p, n);
    await p.close();
  }
  await b.close();
  console.log('\nscreenshots: ' + OUT);
})().catch(e => { console.error(e); process.exit(1); });
