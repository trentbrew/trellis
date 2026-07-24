const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto('http://127.0.0.1:3939/');
  const m = await page.evaluate(() => {
    const shell = getComputedStyle(document.querySelector('.shell'));
    const els = ['.sidebar', '.secondary', '.header', '.operate-toolbar', '.main', '.oplog'];
    const rects = {};
    for (const sel of els) {
      const el = document.querySelector(sel);
      if (!el) {
        rects[sel] = null;
        continue;
      }
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      rects[sel] = {
        col: cs.gridColumn,
        row: cs.gridRow,
        left: Math.round(r.left),
        right: Math.round(r.right),
        top: Math.round(r.top),
        width: Math.round(r.width),
        z: cs.zIndex,
      };
    }
    return { cols: shell.gridTemplateColumns, rows: shell.gridTemplateRows, rects };
  });
  fs.writeFileSync('layout-debug.json', JSON.stringify(m, null, 2));
  await browser.close();
})().catch((e) => {
  fs.writeFileSync('layout-debug.json', String(e));
  process.exit(1);
});
