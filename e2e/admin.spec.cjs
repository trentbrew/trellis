const { test, expect } = require('@playwright/test');

test.describe('trellis admin (/)', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    if (testInfo.title.includes('persists')) return;
    await page.addInitScript(() => {
      try {
        localStorage.removeItem('trellis-admin-sidebar');
        localStorage.removeItem('trellis-admin-oplog');
        localStorage.removeItem('trellis-admin-secondary');
        localStorage.removeItem('trellis-admin-secondary-collapsed');
        localStorage.removeItem('trellis-admin-zone-work-collapsed');
        localStorage.removeItem('trellis-admin-zone-logs-collapsed');
        localStorage.removeItem('trellis-admin-sidebar-w');
        localStorage.removeItem('trellis-admin-secondary-w');
        localStorage.removeItem('trellis-admin-oplog-w');
        localStorage.removeItem('trellis-admin-vcs-route');
        localStorage.removeItem('trellis-admin-inspector-pinned');
      } catch {
        /* ignore */
      }
    });
  });

  test('shell: Operate sidebar, view-header board toolbar, VCS current, kanban default', async ({ page }) => {
    await page.goto('/');
    const nav = page.locator('nav[aria-label="Operate"]');
    await expect(nav.locator('.nav-item')).toHaveCount(8);
    await expect(page.locator('.nav-item[data-nav-id="vcs"][aria-current="page"]')).toContainText('VCS');
    const stubs = page.locator('.nav-item[aria-disabled="true"]');
    await expect(stubs).toHaveCount(7);
    await expect(stubs.first()).toHaveAttribute('aria-label', /coming soon/i);
    const disabledNative = await page.locator('.nav-item[disabled]').count();
    expect(disabledNative).toBe(0);
    await expect(page.locator('.sidebar')).toBeVisible();
    await expect(page.locator('.sidebar .brand-mark')).toBeVisible();
    await expect(page.locator('.sidebar .brand-text')).toHaveText('Trellis');
    await expect(page.locator('.header .brand-mark')).toHaveCount(0);
    await expect(page.locator('.operate-toolbar')).toHaveCount(0);
    await expect(page.locator('.view-header')).toBeVisible();
    await expect(page.locator('#board-toolbar')).toBeVisible();
    await expect(page.locator('.view-toggle[role="radiogroup"]')).toBeVisible();
    await expect(page.locator('#search-input')).toBeVisible();
    await expect(page.locator('#view-kanban')).toHaveClass(/active/);
    await expect(page.locator('#oplog')).toBeHidden();
    await expect(page.locator('.route-item[data-zone="work"][data-tab="board"]')).toHaveAttribute(
      'aria-current',
      'page',
    );
    await expect(page.locator('.view-toggle button[data-view="kanban"]')).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });

  test('sidebar collapses to icon rail and persists', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('trellis-admin-sidebar'));
    await page.reload();
    const toggle = page.locator('#sidebar-toggle');
    await expect(toggle).toBeVisible();
    await expect(page.locator('.header #sidebar-toggle')).toBeVisible();
    await expect(page.locator('.sidebar-brand .brand-mark')).toBeVisible();
    await expect(page.locator('.sidebar-brand .brand-text')).toHaveText('Trellis');
    await expect(page.locator('.zone')).toHaveText('Operate');
    await expect(page.locator('.crumb')).toContainText(/trellis-node\s*\/\s*operate\s*\/\s*vcs\s*\/\s*board/i);
    await expect(page.locator('html')).not.toHaveClass(/sidebar-collapsed/);
    await expect(toggle.locator('.icon-collapse')).toBeVisible();
    await expect(toggle.locator('.icon-expand')).toBeHidden();
    await toggle.click();
    await expect(page.locator('html')).toHaveClass(/sidebar-collapsed/);
    await expect(page.locator('.nav-item[data-nav-id="vcs"] .nav-label')).toBeHidden();
    await expect(page.locator('.route-item[data-zone="work"][data-tab="board"] .nav-label')).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('.zone')).toBeHidden();
    await expect(page.locator('.sidebar-brand .brand-mark')).toBeVisible();
    await expect(page.locator('.sidebar-brand .brand-text')).toBeHidden();
    await expect(toggle.locator('.icon-expand')).toBeVisible();
    await expect(toggle.locator('.icon-collapse')).toBeHidden();
    await expect
      .poll(async () => page.locator('.sidebar').evaluate((el) => el.getBoundingClientRect().width))
      .toBeLessThanOrEqual(72);
    await page.reload();
    await expect(page.locator('html')).toHaveClass(/sidebar-collapsed/);
    await toggle.click();
    await expect(page.locator('html')).not.toHaveClass(/sidebar-collapsed/);
    await page.evaluate(() => localStorage.removeItem('trellis-admin-sidebar'));
  });

  test('chrome height matches collapsed rail width', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    const metrics = await page.evaluate(() => {
      const header = document.querySelector('.header');
      const brand = document.querySelector('.sidebar-brand');
      const sidebar = document.querySelector('.sidebar');
      const secondary = document.querySelector('.secondary');
      const hr = header.getBoundingClientRect();
      const br = brand.getBoundingClientRect();
      const sr = sidebar.getBoundingClientRect();
      const sec = secondary.getBoundingClientRect();
      const rail = getComputedStyle(document.documentElement).getPropertyValue('--sidebar-rail-w').trim();
      return {
        headerH: Math.round(hr.height),
        brandH: Math.round(br.height),
        railVar: rail,
        headerRightOfRail: hr.left >= sr.right - 2,
        secondaryPresent: sec.width > 100,
        secondaryBelowHeader: sec.top >= hr.bottom - 2,
        headerSpansSecondary: hr.right > sec.right,
        railFullHeight: Math.abs(sr.top) <= 1 && Math.abs(sr.bottom - window.innerHeight) <= 1,
        brandBorderAligned: Math.abs(br.bottom - hr.bottom) <= 2,
      };
    });
    expect(metrics.railVar).toBe('56px');
    expect(metrics.headerH).toBe(56);
    expect(metrics.brandH).toBe(56);
    expect(metrics.headerRightOfRail).toBeTruthy();
    expect(metrics.secondaryPresent).toBeTruthy();
    expect(metrics.secondaryBelowHeader).toBeTruthy();
    expect(metrics.headerSpansSecondary).toBeTruthy();
    expect(metrics.railFullHeight).toBeTruthy();
    expect(metrics.brandBorderAligned).toBeTruthy();
    await page.locator('#sidebar-toggle').click();
    await expect(page.locator('html')).toHaveClass(/sidebar-collapsed/);
    await expect
      .poll(async () => page.locator('.sidebar').evaluate((el) => Math.round(el.getBoundingClientRect().width)))
      .toBe(56);
    const collapsed = await page.evaluate(() => {
      const header = document.querySelector('.header');
      const brand = document.querySelector('.sidebar-brand');
      const sidebar = document.querySelector('.sidebar');
      const hr = header.getBoundingClientRect();
      const br = brand.getBoundingClientRect();
      const sr = sidebar.getBoundingClientRect();
      return {
        brandH: Math.round(br.height),
        brandW: Math.round(br.width),
        railClientW: sidebar.clientWidth,
        brandBorderAligned: Math.abs(br.bottom - hr.bottom) <= 2,
        brandFullWidth: Math.abs(br.width - sidebar.clientWidth) <= 1,
        brandFlushTop: Math.abs(br.top - sr.top) <= 1,
      };
    });
    expect(collapsed.brandH).toBe(56);
    expect(collapsed.brandW).toBe(collapsed.railClientW);
    expect(collapsed.brandBorderAligned).toBeTruthy();
    expect(collapsed.brandFullWidth).toBeTruthy();
    expect(collapsed.brandFlushTop).toBeTruthy();
  });

  test('pin live tail opens Live ops inspector; notify bell reopens when closed', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.removeItem('trellis-admin-inspector-pinned');
    });
    await page.reload();
    await expect(page.locator('#oplog')).toBeHidden();
    await page.locator('.route-item[data-zone="logs"][data-tab="ops"]').click();
    await page.locator('#pin-toggle').click();
    await expect(page.locator('html')).toHaveClass(/inspector-pinned/);
    await expect(page.locator('#oplog')).toBeVisible();
    await expect(page.locator('#oplog h2')).toHaveText(/Live ops/i);
    await page.locator('#oplog-toggle').click();
    await expect(page.locator('html')).not.toHaveClass(/inspector-pinned/);
    await expect(page.locator('#oplog')).toBeHidden();
    await page.locator('.route-item[data-zone="logs"][data-tab="ops"]').click();
    await page.locator('#pin-toggle').click();
    await expect(page.locator('#oplog')).toBeVisible();
    await page.locator('#oplog-toggle').click();
    await page.locator('.header #notify-btn').click();
    await expect(page.locator('#oplog')).toBeVisible();
    await page.evaluate(() => localStorage.removeItem('trellis-admin-inspector-pinned'));
  });

  test('serves fractal-playground logo mark', async ({ request }) => {
    const res = await request.get('/logo.png');
    expect(res.ok()).toBeTruthy();
    expect(res.headers()['content-type']).toMatch(/image\/png/);
  });

  test('/admin redirects to / preserving query', async ({ page }) => {
    await page.goto('/admin?view=grid');
    await expect(page).toHaveURL(/\/?\?view=grid/);
    expect(new URL(page.url()).pathname).toBe('/');
    await expect(page.locator('#view-grid')).toHaveClass(/active/);
  });

  test('view toggle updates projection and URL', async ({ page }) => {
    await page.goto('/');
    await page.locator('.view-toggle button[data-view="grid"]').click();
    await expect(page.locator('#view-grid')).toHaveClass(/active/);
    await expect(page.locator('.view-toggle button[data-view="grid"]')).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await expect(page).toHaveURL(/view=grid/);
    await page.locator('.view-toggle button[data-view="table"]').click();
    await expect(page.locator('#view-table')).toHaveClass(/active/);
    await expect(page).toHaveURL(/view=table/);
    await page.locator('.view-toggle button[data-view="kanban"]').click();
    await expect(page.locator('#view-kanban')).toHaveClass(/active/);
  });

  test('loads shared runtime theme contract', async ({ request }) => {
    const css = await request.get('/theme/runtime-theme.css');
    expect(css.ok()).toBeTruthy();
    expect(css.headers()['content-type']).toMatch(/text\/css/);
  });

  test('header band spans above secondary (grid v2)', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#view-title')).toHaveCount(0);
    const layout = await page.evaluate(() => {
      const header = document.querySelector('.header');
      const secondary = document.querySelector('.secondary');
      const hb = header?.getBoundingClientRect();
      const sb = secondary?.getBoundingClientRect();
      return {
        headerBottom: hb?.bottom ?? 0,
        secondaryTop: sb?.top ?? 0,
        headerLeft: hb?.left ?? 0,
        secondaryLeft: sb?.left ?? 0,
      };
    });
    expect(layout.headerBottom).toBeLessThanOrEqual(layout.secondaryTop + 1);
    expect(layout.headerLeft).toBeLessThanOrEqual(layout.secondaryLeft + 1);
  });

  test('header shows live-on-port + stats; crumb trail has four segments', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.statusbar')).toHaveCount(0);
    await expect(page.locator('.header-stats #live-label')).toBeVisible();
    await expect(page.locator('.header-stats #stat-lanes')).toBeVisible();
    await expect(page.locator('.header-stats #stat-issues')).toBeVisible();
    await expect(page.locator('.crumb #crumb-repo')).toBeVisible();
    await expect(page.locator('.crumb #crumb-tab')).toContainText(/board/i);
    await expect(page.locator('.crumb')).toContainText(/operate\s*\/\s*vcs\s*\/\s*board/i);
    await expect(page.locator('#crumb-tab svg')).toBeVisible();
    await expect
      .poll(async () => page.locator('.crumb #crumb-repo').textContent())
      .toMatch(/trellis-node|\w+/);
    await expect(page.locator('.header #notify-btn')).toBeVisible();
    await expect(page.locator('.header #sidebar-toggle')).toBeVisible();
    await expect(page.locator('.sidebar #sidebar-toggle')).toHaveCount(0);
    await expect(page.locator('#secondary-nav-work .route-item')).toHaveCount(3);
    await expect(page.locator('#secondary-nav-logs .route-item')).toHaveCount(3);
    await expect(page.locator('.route-item[data-zone="work"][data-tab="board"]')).toHaveAttribute(
      'aria-current',
      'page',
    );
    await expect
      .poll(async () => page.locator('#live-label').textContent())
      .toMatch(/live on port \d+|connecting|reconnecting|error/i);
  });

  test('WORK zone collapses independently and persists', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.removeItem('trellis-admin-zone-work-collapsed');
      localStorage.removeItem('trellis-admin-zone-logs-collapsed');
    });
    await page.reload();
    await expect(page.locator('#secondary-toggle')).toHaveCount(0);
    const toggle = page.locator('#zone-work-toggle');
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#secondary-nav-work .route-item .nav-label').first()).toBeVisible();
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('#secondary-nav-work')).toBeHidden();
    await page.reload();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await toggle.click();
    await expect(page.locator('#secondary-nav-work .route-item .nav-label').first()).toBeVisible();
    await page.evaluate(() => localStorage.removeItem('trellis-admin-zone-work-collapsed'));
  });

  test('board route hides view-meta; milestones updates crumb tab', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#view-meta')).toBeHidden();
    await expect(page.locator('#stat-issues')).toBeVisible();
    await page.locator('.route-item[data-zone="work"][data-tab="milestones"]').click();
    await expect(page.locator('#crumb-tab')).toContainText(/milestones/i);
    await expect(page.locator('#crumb-tab svg')).toBeVisible();
    await expect(page.locator('#view-meta')).toBeVisible();
  });

  test('board search grows wider than view picker', async ({ page }) => {
    await page.goto('/');
    const widths = await page.evaluate(() => {
      const search = document.querySelector('#search-input');
      const picker = document.querySelector('.view-toggle');
      return {
        search: search?.getBoundingClientRect().width ?? 0,
        picker: picker?.getBoundingClientRect().width ?? 0,
      };
    });
    expect(widths.search).toBeGreaterThan(widths.picker);
  });

  test('pinned inspector groups ops by day', async ({ page }) => {
    await page.goto('/');
    await page.locator('.route-item[data-zone="logs"][data-tab="ops"]').click();
    await page.evaluate(() => {
      const list = document.getElementById('ops-main-list');
      document.getElementById('ops-main-empty')?.remove();
      const d = new Date();
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const row = document.createElement('div');
      row.className = 'op';
      row.dataset.day = key;
      row.innerHTML = '<time>12:00:00</time><span class="kind">test · seed</span><span class="hash">deadbeef</span>';
      list?.appendChild(row);
    });
    await page.locator('#pin-toggle').click();
    await expect(page.locator('#oplog')).toBeVisible();
    await expect(page.locator('.oplog-day')).toHaveCount(1);
    await expect(page.locator('.oplog-day-toggle')).toContainText(/Today/i);
    const dayToggle = page.locator('.oplog-day-toggle').first();
    await dayToggle.click();
    await expect(dayToggle).toHaveAttribute('aria-expanded', 'false');
  });

  test('Work/Logs routes switch view panels and toolbars', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#tml-root')).toBeVisible();
    await expect(page.locator('[data-panel="work/board"]')).toHaveAttribute('data-active', 'true');
    await page.locator('.route-item[data-zone="work"][data-tab="workflows"]').click();
    await expect(page.locator('[data-panel="work/workflows"]')).toHaveAttribute('data-active', 'true');
    await expect(page.locator('#tml-root')).toBeHidden();
    await expect(page.locator('#board-toolbar')).toBeHidden();
    await page.locator('.route-item[data-zone="work"][data-tab="board"]').click();
    await expect(page.locator('#tml-root')).toBeVisible();
    await expect(page.locator('#board-toolbar')).toBeVisible();
    await page.locator('.route-item[data-zone="logs"][data-tab="ops"]').click();
    await expect(page.locator('[data-panel="logs/ops"]')).toHaveAttribute('data-active', 'true');
    await expect(page.locator('#ops-main')).toBeVisible();
    await expect(page.locator('#board-toolbar')).toBeHidden();
    await expect(page.locator('#logs-toolbar')).toBeVisible();
    await expect(page.locator('#tml-root')).toBeHidden();
  });

  test('milestones panel lists VCS milestones from snapshot', async ({ page }) => {
    await page.goto('/');
    const snap = await page.request.get('/api/lanes').then((r) => r.json());
    await page.locator('.route-item[data-zone="work"][data-tab="milestones"]').click();
    await expect(page.locator('[data-panel="work/milestones"]')).toHaveAttribute('data-active', 'true');
    await expect(page.locator('#tml-root')).toBeHidden();
    await expect(page.locator('#board-toolbar')).toBeHidden();
    const count = (snap.milestones || []).length;
    if (count === 0) {
      await expect(page.locator('#milestones-empty')).toBeVisible();
      return;
    }
    await expect(page.locator('#milestones-empty')).toBeHidden();
    await expect(page.locator('.milestone-card')).toHaveCount(count);
    const firstMessage = (snap.milestones[0]?.message || '').trim();
    if (firstMessage) {
      await expect(page.locator('.milestone-card .milestone-message').first()).toContainText(
        firstMessage.slice(0, 24),
      );
    } else {
      await expect(page.locator('.milestone-card .milestone-id').first()).not.toBeEmpty();
    }
  });

  test('sidebars expose resize handles when inspector pinned', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.resize-handle[data-resize="sidebar"]')).toBeVisible();
    await expect(page.locator('.resize-handle[data-resize="secondary"]')).toBeVisible();
    await page.locator('.route-item[data-zone="logs"][data-tab="ops"]').click();
    await page.locator('#pin-toggle').click();
    await expect(page.locator('.resize-handle[data-resize="oplog"]')).toBeVisible();
  });

  test('Live ops inspector hidden by default', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#oplog')).toBeHidden();
  });

  test('toolbar controls share 34px height', async ({ page }) => {
    await page.goto('/');
    const heights = await page.evaluate(() => {
      const toggle = document.querySelector('.view-toggle');
      const input = document.querySelector('#search-input');
      return {
        toggle: toggle ? getComputedStyle(toggle).height : null,
        input: input ? getComputedStyle(input).height : null,
      };
    });
    expect(heights.toggle).toBe('34px');
    expect(heights.input).toBe('34px');
  });

  test('Filters stub opens coming soon; Escape closes', async ({ page }) => {
    await page.goto('/');
    const btn = page.locator('#filters-btn');
    const menu = page.locator('#filters-menu');
    await expect(menu).toBeHidden();
    await btn.click();
    await expect(menu).toBeVisible();
    await expect(menu).toHaveText(/coming soon/i);
    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
  });

  test('Export and New issue are disabled', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#board-toolbar button[aria-label="Export"]')).toBeDisabled();
    await expect(
      page.locator('#board-toolbar button[aria-label="New issue (coming soon)"]'),
    ).toBeDisabled();
  });

  test('embed=1 hides kernel sidebar; view-header + secondary remain', async ({ page }) => {
    await page.goto('/?embed=1');
    await expect(page.locator('html')).toHaveClass(/admin-embed/);
    await expect(page.locator('.sidebar')).toBeHidden();
    await expect(page.locator('#sidebar-toggle')).toBeHidden();
    await expect(page.locator('.view-header')).toBeVisible();
    await expect(page.locator('#board-toolbar')).toBeVisible();
    await expect(page.locator('.secondary')).toBeVisible();
    await expect(page.locator('#oplog')).toBeHidden();
    await expect(page.locator('#view-kanban')).toHaveClass(/active/);
  });

  test('legacy secondary localStorage migrates to work/board', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.removeItem('trellis-admin-vcs-route');
      localStorage.setItem('trellis-admin-secondary', 'lanes');
    });
    await page.reload();
    await expect(page.locator('.route-item[data-zone="work"][data-tab="board"]')).toHaveAttribute(
      'aria-current',
      'page',
    );
    await expect(page.locator('[data-panel="work/board"]')).toHaveAttribute('data-active', 'true');
  });

  test('visual parity: dialog centered via margin:auto', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/?view=kanban');
    const card = page.locator('.issue-card').first();
    await expect(card).toBeVisible({ timeout: 15000 });
    await card.click();
    await expect(page.locator('#dlg')).toBeVisible();
    const centered = await page.evaluate(() => {
      const dlg = document.getElementById('dlg');
      const r = dlg.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const vx = window.innerWidth / 2;
      const vy = window.innerHeight / 2;
      const margin = getComputedStyle(dlg).margin;
      return {
        withinX: Math.abs(cx - vx) <= window.innerWidth * 0.15,
        withinY: Math.abs(cy - vy) <= window.innerHeight * 0.15,
        margin,
        notPinnedTopLeft: !(r.top < 8 && r.left < 8),
      };
    });
    expect(centered.notPinnedTopLeft).toBeTruthy();
    expect(centered.withinX && centered.withinY).toBeTruthy();
  });

  test('visual parity: grid auto-fill has 2+ tracks when wide', async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto('/?view=grid');
    await expect(page.locator('#view-grid')).toHaveClass(/active/);
    await page.waitForTimeout(500);
    const result = await page.evaluate(() => {
      const host = document.querySelector('.grid-host');
      const cards = document.querySelectorAll('.lane-card');
      if (!host) return { ok: false, reason: 'no host' };
      const tracks = getComputedStyle(host).gridTemplateColumns
        .split(' ')
        .filter((t) => t && t !== 'none');
      return {
        ok: true,
        cardCount: cards.length,
        trackCount: tracks.length,
        display: getComputedStyle(host).display,
      };
    });
    expect(result.display).toBe('grid');
    if (result.cardCount >= 2) {
      expect(result.trackCount).toBeGreaterThanOrEqual(2);
    }
  });

  test('visual parity: kanban is display flex', async ({ page }) => {
    await page.goto('/?view=kanban');
    await expect(page.locator('#view-kanban')).toHaveClass(/active/);
    const display = await page.locator('#view-kanban .kanban').evaluate((el) => getComputedStyle(el).display);
    expect(display).toBe('flex');
  });

  test('visual parity: table-wrap fills view width', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/?view=table');
    await expect(page.locator('#view-table')).toHaveClass(/active/);
    const ratio = await page.evaluate(() => {
      const view = document.getElementById('view-table');
      const wrap = view && view.querySelector('.table-wrap');
      if (!view || !wrap) return 0;
      const vw = view.clientWidth;
      const ww = wrap.clientWidth;
      return vw > 0 ? ww / vw : 0;
    });
    expect(ratio).toBeGreaterThanOrEqual(0.9);
  });

  test('datatable: sort headers and 42px row height', async ({ page }) => {
    await page.goto('/?view=table');
    await expect(page.locator('#view-table')).toHaveClass(/active/);
    await expect(page.locator('.table-wrap')).toBeVisible();
    await expect(page.locator('#view-table th .sort-btn')).toHaveCount(6);
    const laneTh = page.locator('#view-table th[data-key="lane"]');
    await expect(laneTh).toHaveAttribute('aria-sort', 'none');
    await laneTh.locator('.sort-btn').click();
    await expect(laneTh).toHaveAttribute('aria-sort', 'ascending');
    await laneTh.locator('.sort-btn').click();
    await expect(laneTh).toHaveAttribute('aria-sort', 'descending');
    const height = await page.evaluate(() => {
      const td = document.querySelector('#view-table tbody tr td');
      return td ? getComputedStyle(td).height : null;
    });
    if (height) {
      const px = parseFloat(height);
      expect(Math.abs(px - 42)).toBeLessThanOrEqual(1);
    }
  });

  test('datatable: search no-match shows table-empty', async ({ page }) => {
    await page.goto('/?view=table');
    await expect(page.locator('#view-table')).toHaveClass(/active/);
    await page.locator('#search-input').fill('zzz-no-match-trellis-datatable-xyz');
    await expect(page.locator('#table-empty')).toBeVisible();
    await expect(page.locator('#table-empty')).toContainText(/no matches/i);
    await page.locator('#search-clear').click();
    await expect(page.locator('#table-empty')).toBeHidden();
  });

  test('datatable: click branch cell enters edit', async ({ page }) => {
    await page.goto('/?view=table');
    await expect(page.locator('#view-table')).toHaveClass(/active/);
    const branch = page.locator('#view-table td[data-col="branch"][data-editable="true"]').first();
    await expect(branch).toBeVisible({ timeout: 15000 });
    await branch.click();
    await expect(page.locator('#view-table td.cell-editing')).toBeVisible();
    await expect(page.locator('#view-table .cell-edit-input')).toBeFocused();
    await page.keyboard.press('Escape');
  });

  test('datatable: click RO lane cell enters edit; no dlg', async ({ page }) => {
    await page.goto('/?view=table');
    const lane = page.locator('#view-table td[data-col="lane"]').first();
    await expect(lane).toBeVisible({ timeout: 15000 });
    await lane.click();
    await expect(page.locator('#dlg')).toBeHidden();
    await expect(page.locator('#view-table td.cell-editing')).toBeVisible();
    await expect(page.locator('#view-table .cell-edit-input')).toBeFocused();
    await page.keyboard.press('Escape');
  });

  test('datatable: sort then click still enters edit', async ({ page }) => {
    await page.goto('/?view=table');
    await expect(page.locator('#view-table td[data-col="branch"]').first()).toBeVisible({
      timeout: 15000,
    });
    await page.locator('#view-table th[data-key="agent"] .sort-btn').click();
    await page.locator('#view-table th[data-key="ops"] .sort-btn').click();
    await page.locator('#view-table td[data-col="branch"]').first().click();
    await expect(page.locator('#view-table td.cell-editing')).toBeVisible();
    await expect(page.locator('#view-table .cell-edit-input')).toBeFocused();
    await page.keyboard.press('Escape');
    await page.locator('#view-table td[data-col="lane"]').first().click();
    await expect(page.locator('#view-table td.cell-editing')).toBeVisible();
    await expect(page.locator('#dlg')).toBeHidden();
    await page.keyboard.press('Escape');
  });

  test('datatable: F2 on row edits branch; Escape cancels', async ({ page }) => {
    await page.goto('/?view=table');
    const branchCell = page
      .locator('#view-table td[data-col="branch"][data-editable="true"]')
      .filter({ hasNotText: /^\s*$/ })
      .first();
    await expect(branchCell).toBeVisible({ timeout: 15000 });
    const row = branchCell.locator('xpath=ancestor::tr[1]');
    await row.focus();
    await page.keyboard.press('F2');
    const input = page.locator('#view-table .cell-edit-input');
    await expect(input).toBeVisible();
    const prior = await input.inputValue();
    await input.fill(prior + '-edited');
    await page.keyboard.press('Escape');
    await expect(page.locator('#view-table td.cell-editing')).toHaveCount(0);
    await expect(branchCell).toHaveText(prior);
  });

  test('datatable: invalid issue stays editing with alert', async ({ page }) => {
    await page.goto('/?view=table');
    const issue = page.locator('#view-table td[data-col="issue"][data-editable="true"]').first();
    await expect(issue).toBeVisible({ timeout: 15000 });
    await issue.click();
    const input = page.locator('#view-table .cell-edit-input');
    await input.fill('not-an-issue');
    await page.keyboard.press('Enter');
    await expect(page.locator('#view-table td.cell-editing')).toBeVisible();
    await expect(page.locator('#cell-edit-error')).toBeVisible();
    await expect(page.locator('#cell-edit-error')).toContainText(/TRL-N|issue/i);
  });

  test('visual parity: nested kanban clones do not flex-grow tall', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/?view=kanban');
    await expect(page.locator('#view-kanban .issue-card').first()).toBeVisible({ timeout: 15000 });
    const ok = await page.evaluate(() => {
      const bodies = Array.from(document.querySelectorAll('#view-kanban .kanban-col-body'));
      const nested = bodies.filter((el) => el.parentElement?.classList.contains('kanban-col-body'));
      if (nested.length === 0) return { ok: true, reason: 'no nested yet' };
      const flexed = nested.filter((el) => getComputedStyle(el).flexGrow !== '0');
      const tall = nested.filter((el) => el.getBoundingClientRect().height > 220);
      return { ok: flexed.length === 0 && tall.length === 0, flexed: flexed.length, tall: tall.length };
    });
    expect(ok.ok).toBeTruthy();
  });

  test('visual parity: kanban board scrolls horizontally', async ({ page }) => {
    await page.setViewportSize({ width: 700, height: 800 });
    await page.goto('/?view=kanban');
    await expect(page.locator('#view-kanban .kanban')).toBeVisible({ timeout: 15000 });
    const result = await page.evaluate(() => {
      const view = document.querySelector('#view-kanban');
      const board = document.querySelector('#view-kanban .kanban');
      const cols = Array.from(document.querySelectorAll('#view-kanban .kanban-col'));
      const s = getComputedStyle(board);
      const totalCol = cols.reduce((n, c) => n + c.getBoundingClientRect().width, 0);
      const padL = parseFloat(s.paddingLeft) || 0;
      const padR = parseFloat(s.paddingRight) || 0;
      return {
        overflowX: s.overflowX,
        viewPad: getComputedStyle(view).padding,
        boardPadL: padL,
        boardPadR: padR,
        colCount: cols.length,
        boardClientW: board.clientWidth,
        colsWidth: totalCol,
        canScroll: board.scrollWidth > board.clientWidth + 1,
        colFlex: cols.map((c) => getComputedStyle(c).flexGrow),
      };
    });
    expect(result.overflowX === 'auto' || result.overflowX === 'scroll').toBeTruthy();
    expect(result.viewPad === '0px' || result.viewPad.startsWith('0px')).toBeTruthy();
    expect(result.boardPadL).toBeGreaterThanOrEqual(12);
    expect(result.boardPadR).toBeGreaterThanOrEqual(12);
    expect(result.colFlex.every((g) => g === '0')).toBeTruthy();
    expect(result.canScroll || result.colsWidth >= result.boardClientW).toBeTruthy();
  });

  test('visual parity: in-progress cards expose spinner', async ({ page }) => {
    await page.goto('/?view=kanban');
    await expect(page.locator('#view-kanban .kanban-col').nth(1)).toBeVisible({ timeout: 15000 });
    const ok = await page.evaluate(() => {
      const col = document.querySelectorAll('#view-kanban .kanban-col')[1];
      const cards = Array.from(col.querySelectorAll('.issue-card[data-status="in_progress"]'));
      if (!cards.length) return { ok: true, reason: 'no in_progress cards' };
      return {
        ok: cards.every((c) => {
          const spin = c.querySelector('.progress-spin');
          return spin && getComputedStyle(spin).display !== 'none';
        }),
        count: cards.length,
      };
    });
    expect(ok.ok).toBeTruthy();
  });

  test('visual parity: kanban columns scroll independently within viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/?view=kanban');
    await expect(page.locator('#view-kanban .kanban-col').first()).toBeVisible({ timeout: 15000 });
    const result = await page.evaluate(() => {
      const vh = window.innerHeight;
      const cols = Array.from(document.querySelectorAll('#view-kanban .kanban-col'));
      const hosts = cols.map((col) => col.querySelector(':scope > .kanban-col-body')).filter(Boolean);
      return {
        hostCount: hosts.length,
        allScrollable: hosts.every((el) => {
          const s = getComputedStyle(el);
          return s.overflowY === 'auto' || s.overflowY === 'scroll';
        }),
        withinViewport: cols.every((col) => {
          const r = col.getBoundingClientRect();
          return r.bottom <= vh + 1 && r.height <= vh;
        }),
        boardOverflowY: getComputedStyle(document.querySelector('#view-kanban')).overflowY,
      };
    });
    expect(result.hostCount).toBe(3);
    expect(result.allScrollable).toBeTruthy();
    expect(result.withinViewport).toBeTruthy();
    expect(result.boardOverflowY).toBe('hidden');
  });

  test('tml-op: grid promote posts to /api/tml-mutations', async ({ page }) => {
    await page.goto('/?view=grid');
    await expect(page.locator('#view-grid')).toHaveClass(/active/);
    // Wait for TML mount — static template exposes Promote before listeners bind.
    await page.waitForFunction(
      () => {
        const idEl = document.querySelector('#view-grid .lane-id');
        return idEl && /^lane-/.test(idEl.textContent || '');
      },
      { timeout: 15_000 },
    );
    const promoteBtn = page.locator('#view-grid .lane-promote').first();
    await expect(promoteBtn).toBeVisible();

    const [req] = await Promise.all([
      page.waitForRequest(
        (r) => r.url().includes('/api/tml-mutations') && r.method() === 'POST',
        { timeout: 15_000 },
      ),
      promoteBtn.click(),
    ]);
    const body = JSON.parse(req.postData() || '{}');
    expect(body.action).toBe('promote');
    expect(body.args?.id).toMatch(/^lane-/);
  });

  test('logs/branches route mounts causal graph and view-meta', async ({ page }) => {
    await page.goto('/?vcs=logs/branches');
    await expect(page.locator('[data-panel="logs/branches"]')).toHaveAttribute('data-active', 'true');
    await expect(page.locator('#causal-graph-host')).toBeVisible();
    await expect(page.locator('[data-panel="logs/branches"] .route-panel-stub')).toHaveCount(0);
    await expect(page.locator('#view-meta')).toHaveText(/events · .*integration:/i);
    await expect(page.locator('#view-meta')).not.toHaveText(/coming soon/i);
  });

  test('logs/branches row select shows inline meta hash', async ({ page }) => {
    await page.goto('/?vcs=logs/branches');
    const snap = await page.request.get('/api/causal-graph').then((r) => r.json());
    if (!snap.commits?.length) {
      test.skip(true, 'no causal graph commits in fixture repo');
      return;
    }
    const btn = page.locator('.graph-list .graph-row-btn').first();
    await expect(btn).toBeVisible();
    await btn.click();
    await expect(btn).toHaveAttribute('aria-selected', 'true');
    await expect(btn.locator('.graph-meta')).toContainText(/[a-f0-9]{6,}/i);
  });

  test('logs/branches lane select scopes inspector ops', async ({ page }) => {
    await page.goto('/?vcs=logs/branches');
    const snap = await page.request.get('/api/causal-graph').then((r) => r.json());
    const laneNode = (snap.commits || []).find((c) => c.laneId);
    if (!laneNode?.laneId) {
      test.skip(true, 'no lane nodes in causal graph fixture');
      return;
    }
    await expect(page.locator('.graph-times')).toBeVisible();
    const rowBtn = page.locator(`.graph-list .graph-row-btn[data-node-id="${laneNode.id}"]`);
    await expect(rowBtn).toBeVisible();
    await rowBtn.click();
    await expect(page.locator('#oplog')).toBeVisible();
    await expect(page.locator('#oplog-title')).toContainText(/Lane ops/i);
    const laneOps = await page.request.get(`/api/lanes/${encodeURIComponent(laneNode.laneId)}/ops`);
    expect(laneOps.ok()).toBeTruthy();
    await expect(page.locator('#oplog .ops-empty')).toHaveCount(0);
  });
});
