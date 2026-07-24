import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 800 } });
await page.goto('http://127.0.0.1:3939/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3000);
const info = await page.evaluate(() => {
  const bar = document.querySelector('.statusbar');
  const r = bar?.getBoundingClientRect();
  return {
    live: document.getElementById('live-label')?.textContent,
    repo: document.getElementById('repo')?.textContent,
    active: document.getElementById('stat-active')?.textContent,
    lanes: document.getElementById('stat-lanes')?.textContent,
    branch: document.getElementById('stat-branch')?.textContent,
    issues: document.getElementById('stat-issues')?.textContent,
    barHeight: r ? Math.round(r.height) : null,
    text: bar?.innerText,
  };
});
console.log(JSON.stringify(info, null, 2));
await page.locator('.statusbar').screenshot({
  path: '/Users/trentbrew/.cursor/projects/Users-trentbrew-TURTLE-Projects-TRELLIS-trellis-node/assets/admin-statusbar-only.png',
});
await browser.close();
