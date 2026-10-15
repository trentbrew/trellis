const { test } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const OUT = path.join(__dirname, 'layout-debug.json');

test('debug layout', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
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
  fs.writeFileSync(OUT, JSON.stringify(m, null, 2));
});
