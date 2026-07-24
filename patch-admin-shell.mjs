#!/usr/bin/env node
/**
 * Admin shell restructure:
 * - crumb: trellis-node / operate / vcs
 * - sidebar toggle in header (left of crumb)
 * - status → header-end (before notify); remove footer statusbar
 * - logomark chrome-h with bottom border
 * - secondary sidebar (VCS: milestones, issues, lanes, workflows)
 * - resizable primary + secondary + oplog
 */
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/ui/admin.html');
let html = fs.readFileSync(file, 'utf8');

const log = [];
function replace(old, neu, label) {
  if (!html.includes(old)) {
    log.push('MISSING: ' + label);
    fs.writeFileSync(path.join(__dirname, 'patch-shell-out.txt'), log.join('\n'));
    process.exit(1);
  }
  html = html.replace(old, neu);
  log.push('ok ' + label);
}

// --- :root vars ---
replace(
  `      --sidebar-expanded-w: 200px;
      --sidebar-rail-w: 56px;
      --chrome-h: var(--sidebar-rail-w);
      --statusbar-h: var(--chrome-h);
      --sidebar-w: var(--sidebar-expanded-w);
      --oplog-w: 280px;
      --sidebar-bg: #0c0c0c;
      --statusbar-bg: #181818;`,
  `      --sidebar-expanded-w: 200px;
      --sidebar-rail-w: 56px;
      --chrome-h: var(--sidebar-rail-w);
      --sidebar-w: var(--sidebar-expanded-w);
      --secondary-w: 200px;
      --oplog-w: 280px;
      --sidebar-bg: #0c0c0c;
      --sidebar-min-w: 140px;
      --sidebar-max-w: 360px;
      --secondary-min-w: 160px;
      --secondary-max-w: 360px;
      --oplog-min-w: 200px;
      --oplog-max-w: 560px;`,
  'root vars',
);

// --- collapsed / oplog shell columns ---
replace(
  `    html.oplog-collapsed .shell {
      grid-template-columns: var(--sidebar-w) minmax(0, 1fr);
    }

    html.admin-embed.oplog-collapsed .shell {
      grid-template-columns: minmax(0, 1fr);
    }`,
  `    html.oplog-collapsed .shell {
      grid-template-columns: var(--sidebar-w) var(--secondary-w) minmax(0, 1fr);
    }

    html.admin-embed.oplog-collapsed .shell {
      grid-template-columns: var(--secondary-w) minmax(0, 1fr);
    }

    html.admin-embed .shell {
      grid-template-columns: var(--secondary-w) minmax(0, 1fr) var(--oplog-w);
    }`,
  'oplog collapsed cols',
);

// Remove duplicate admin-embed .shell that comes later — we'll replace the block
replace(
  `    .shell {
      display: grid;
      grid-template-columns: var(--sidebar-w) minmax(0, 1fr) var(--oplog-w);
      grid-template-rows: var(--chrome-h) auto minmax(0, 1fr) var(--statusbar-h);
      height: 100%;
      transition: grid-template-columns 0.18s ease;
    }`,
  `    .shell {
      display: grid;
      grid-template-columns: var(--sidebar-w) var(--secondary-w) minmax(0, 1fr) var(--oplog-w);
      grid-template-rows: var(--chrome-h) auto minmax(0, 1fr);
      height: 100%;
      transition: grid-template-columns 0.18s ease;
    }`,
  'shell grid',
);

replace(
  `    /* TRL-191/196: playground island — hide kernel sidebar (single outer nav) */
    html.admin-embed .shell {
      grid-template-columns: minmax(0, 1fr) var(--oplog-w);
    }

    html.admin-embed .sidebar {
      display: none;
    }

    html.admin-embed .header {
      grid-column: 1 / 2;
    }

    html.admin-embed .operate-toolbar,
    html.admin-embed .main {
      grid-column: 1;
    }

    html.admin-embed .statusbar {
      grid-column: 1 / -1;
    }

    html.admin-embed .oplog {
      grid-column: 2;
      grid-row: 1 / 4;
    }

    html.admin-embed .sidebar-toggle {
      display: none;
    }`,
  `    /* TRL-191/196: playground island — hide kernel sidebar (single outer nav) */
    html.admin-embed .sidebar {
      display: none;
    }

    html.admin-embed .header {
      grid-column: 1 / 3;
    }

    html.admin-embed .secondary {
      grid-column: 1;
    }

    html.admin-embed .operate-toolbar,
    html.admin-embed .main {
      grid-column: 2;
    }

    html.admin-embed .oplog {
      grid-column: 3;
      grid-row: 1 / -1;
    }

    html.admin-embed .sidebar-toggle {
      display: none;
    }

    html.admin-embed .resize-handle[data-resize="sidebar"] {
      display: none;
    }`,
  'admin-embed layout',
);

// --- sidebar brand chrome-h + padding ---
replace(
  `    .sidebar {
      grid-column: 1;
      grid-row: 1 / -1;
      background: var(--sidebar-bg);
      border-right: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      padding: 10px;
      gap: 4px;
      overflow-x: hidden;
      overflow-y: auto;
      min-width: 0;
      z-index: 4;
    }

    .sidebar-brand {
      display: flex;
      align-items: center;
      justify-content: flex-start;
      gap: 8px;
      height: 36px;
      padding: 0 10px;
      margin-bottom: 4px;
      flex: none;
      min-width: 0;
    }`,
  `    .sidebar {
      grid-column: 1;
      grid-row: 1 / -1;
      background: var(--sidebar-bg);
      border-right: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      padding: 0 10px 10px;
      gap: 4px;
      overflow-x: hidden;
      overflow-y: auto;
      min-width: 0;
      z-index: 4;
      position: relative;
    }

    .sidebar-brand {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      height: var(--chrome-h);
      margin: 0 -10px 4px;
      padding: 0 10px;
      flex: none;
      min-width: 0;
      box-sizing: border-box;
      border-bottom: 1px solid var(--border);
    }`,
  'sidebar brand chrome',
);

// Remove bottom sidebar-toggle styles that conflict — keep class for header use
replace(
  `    .sidebar-toggle {
      margin-top: auto;
      display: flex;
      align-items: center;
      justify-content: flex-start;
      gap: 8px;
      height: 36px;
      padding: 0 10px;
      border: none;
      border-radius: 8px;
      background: transparent;
      color: var(--text3);
      font: 500 12px var(--font);
      cursor: pointer;
      width: 100%;
      flex: none;
    }

    .sidebar-toggle:hover {
      background: var(--sidebar-item-hover);
      color: var(--text);
    }

    .sidebar-toggle:focus-visible {
      outline: 2px solid color-mix(in srgb, var(--accent) 55%, transparent);
      outline-offset: 2px;
    }

    .sidebar-toggle svg {
      width: 16px;
      height: 16px;
      flex: none;
      stroke: currentColor;
      fill: none;
      stroke-width: 1.75;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    .sidebar-toggle .icon-expand {
      display: none;
    }

    html.sidebar-collapsed .sidebar-toggle .icon-collapse {
      display: none;
    }

    html.sidebar-collapsed .sidebar-toggle .icon-expand {
      display: block;
    }`,
  `    .sidebar-toggle {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      flex: none;
      padding: 0;
      border: none;
      border-radius: 6px;
      background: transparent;
      color: var(--text3);
      cursor: pointer;
    }

    .sidebar-toggle:hover {
      background: var(--sidebar-item-hover);
      color: var(--text);
    }

    .sidebar-toggle:focus-visible {
      outline: 2px solid color-mix(in srgb, var(--accent) 55%, transparent);
      outline-offset: 2px;
    }

    .sidebar-toggle svg {
      width: 16px;
      height: 16px;
      flex: none;
      stroke: currentColor;
      fill: none;
      stroke-width: 1.75;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    .sidebar-toggle .icon-expand {
      display: none;
    }

    .sidebar-toggle .nav-label {
      display: none;
    }

    html.sidebar-collapsed .sidebar-toggle .icon-collapse {
      display: none;
    }

    html.sidebar-collapsed .sidebar-toggle .icon-expand {
      display: block;
    }`,
  'sidebar toggle header style',
);

replace(
  `    html.sidebar-collapsed .nav-label,
    html.sidebar-collapsed .sidebar-toggle .nav-label,
    html.sidebar-collapsed .sidebar-brand .brand-text {
      display: none;
    }

    html.sidebar-collapsed .zone {
      display: none;
    }

    html.sidebar-collapsed .sidebar-brand {
      justify-content: center;
      padding: 0;
      width: 36px;
      height: 36px;
    }

    html.sidebar-collapsed .nav-item,
    html.sidebar-collapsed .sidebar-toggle {
      justify-content: center;
      padding: 0;
      width: 36px;
      height: 36px;
    }`,
  `    html.sidebar-collapsed .nav-label,
    html.sidebar-collapsed .sidebar-brand .brand-text {
      display: none;
    }

    html.sidebar-collapsed .zone {
      display: none;
    }

    html.sidebar-collapsed .sidebar-brand {
      justify-content: center;
      padding: 0;
      margin-left: -10px;
      margin-right: -10px;
      width: auto;
    }

    html.sidebar-collapsed .nav-item {
      justify-content: center;
      padding: 0;
      width: 36px;
      height: 36px;
    }

    html.sidebar-collapsed .resize-handle[data-resize="sidebar"] {
      display: none;
    }`,
  'collapsed rail tweaks',
);

// Header column + start cluster
replace(
  `    .header {
      grid-column: 2 / 3;
      grid-row: 1;
      display: flex;
      align-items: center;
      gap: 10px;
      height: var(--chrome-h);
      padding: 0 12px;
      background: var(--tml-glass-surface);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--border);
      min-width: 0;
      z-index: 2;
    }

    .header-end {
      margin-left: auto;
      display: flex;
      align-items: center;
      gap: 4px;
      flex: none;
    }`,
  `    .header {
      grid-column: 2 / 4;
      grid-row: 1;
      display: flex;
      align-items: center;
      gap: 8px;
      height: var(--chrome-h);
      padding: 0 12px;
      background: var(--tml-glass-surface);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--border);
      min-width: 0;
      z-index: 2;
    }

    .header-start {
      display: flex;
      align-items: center;
      gap: 6px;
      min-width: 0;
      flex: 1;
    }

    .header-end {
      margin-left: auto;
      display: flex;
      align-items: center;
      gap: 2px;
      flex: none;
      min-width: 0;
    }

    .header-stats {
      display: flex;
      align-items: center;
      gap: 2px;
      min-width: 0;
      font: 500 11px var(--mono);
      color: var(--text2);
    }

    .header-stats .item {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 0 8px;
      height: 28px;
      color: var(--text2);
      white-space: nowrap;
    }

    .header-stats .item svg {
      width: 12px;
      height: 12px;
      flex: none;
      stroke: currentColor;
      fill: none;
      stroke-width: 1.75;
      stroke-linecap: round;
      stroke-linejoin: round;
      opacity: 0.75;
    }

    .header-stats .item b {
      font-weight: 600;
      color: var(--text);
    }

    .header-stats .item .lbl {
      color: var(--text3);
    }

    .header-stats .live {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 0 8px;
      height: 28px;
      white-space: nowrap;
    }

    .header-stats .live-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--green);
      box-shadow: 0 0 0 0 rgba(18, 201, 5, 0.45);
      animation: pulse 1.6s ease-out infinite;
    }

    @media (prefers-reduced-motion: reduce) {
      .header-stats .live-dot {
        animation: none;
      }
    }

    @media (max-width: 1100px) {
      .header-stats .item[data-priority="low"] {
        display: none;
      }
    }

    @media (max-width: 820px) {
      .header-stats .item .lbl {
        display: none;
      }
    }`,
  'header layout + stats',
);

// Crumb
replace(
  `    .crumb {
      display: flex;
      align-items: center;
      gap: 8px;
      font: 500 11px var(--mono);
      color: var(--text3);
      white-space: nowrap;
      overflow: hidden;
      min-width: 0;
      flex: 1;
    }

    .crumb-nav {
      flex: none;
    }

    .crumb-sep {
      color: var(--text3);
      opacity: 0.55;
      flex: none;
    }

    .crumb-path {
      color: var(--text2);
      overflow: hidden;
      text-overflow: ellipsis;
      min-width: 0;
    }

    .operate-toolbar {
      grid-column: 2;
      grid-row: 2;`,
  `    .crumb {
      display: flex;
      align-items: center;
      gap: 8px;
      font: 500 11px var(--mono);
      color: var(--text3);
      white-space: nowrap;
      overflow: hidden;
      min-width: 0;
      flex: 1;
      text-transform: lowercase;
    }

    .crumb-sep {
      color: var(--text3);
      opacity: 0.55;
      flex: none;
    }

    .crumb-repo {
      color: var(--text2);
      flex: none;
    }

    .crumb-zone,
    .crumb-route {
      flex: none;
    }

    .operate-toolbar {
      grid-column: 3;
      grid-row: 2;`,
  'crumb + toolbar col',
);

// Remove statusbar CSS block (from .statusbar { through before .view-toggle)
// Find and replace statusbar section with secondary + resize styles
const statusStart = html.indexOf('    .statusbar {');
const viewToggle = html.indexOf('    .view-toggle {');
if (statusStart < 0 || viewToggle < 0 || viewToggle <= statusStart) {
  console.error('MISSING: statusbar/view-toggle anchors');
  process.exit(1);
}
html =
  html.slice(0, statusStart) +
  `    .secondary {
      grid-column: 2;
      grid-row: 2 / -1;
      background: var(--surface2);
      border-right: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      min-width: 0;
      overflow: hidden;
      position: relative;
      z-index: 2;
    }

    .secondary-head {
      flex: none;
      padding: 10px 12px 6px;
      font: 600 10px var(--mono);
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--text3);
    }

    .secondary-nav {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 0 8px 12px;
      overflow-y: auto;
      flex: 1;
      min-height: 0;
    }

    .secondary-nav .nav-item {
      font-size: 12px;
      height: 32px;
      border-radius: 6px;
    }

    .secondary-empty {
      display: none;
      flex: 1;
      flex-direction: column;
      align-items: flex-start;
      justify-content: flex-start;
      gap: 6px;
      padding: 24px 16px;
      color: var(--text3);
      font: 500 12px var(--font);
    }

    .secondary-empty[data-active="true"] {
      display: flex;
    }

    .secondary-empty strong {
      color: var(--text2);
      font: 600 13px var(--font);
    }

    .resize-handle {
      position: absolute;
      top: 0;
      bottom: 0;
      width: 5px;
      z-index: 6;
      cursor: col-resize;
      background: transparent;
    }

    .resize-handle:hover,
    .resize-handle.is-active {
      background: color-mix(in srgb, var(--accent) 35%, transparent);
    }

    .resize-handle[data-resize="sidebar"],
    .resize-handle[data-resize="secondary"] {
      right: -2px;
    }

    .resize-handle[data-resize="oplog"] {
      left: -2px;
    }

    html.is-resizing {
      cursor: col-resize;
      user-select: none;
    }

    html.is-resizing iframe,
    html.is-resizing .kanban,
    html.is-resizing .main {
      pointer-events: none;
    }

` +
  html.slice(viewToggle);
console.log('ok statusbar→secondary+resize');

// main column
replace(
  `    .main {
      grid-column: 2;
      grid-row: 3;`,
  `    .main {
      grid-column: 3;
      grid-row: 3;`,
  'main col',
);

// oplog row span
replace(
  `    .oplog {
      grid-row: 1 / 4;
      grid-column: 3;
      background: var(--surface2);
      border-left: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      min-height: 0;
      min-width: 0;
      overflow: hidden;
    }`,
  `    .oplog {
      grid-row: 1 / -1;
      grid-column: 4;
      background: var(--surface2);
      border-left: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      min-height: 0;
      min-width: 0;
      overflow: hidden;
      position: relative;
    }`,
  'oplog col',
);

// toast bottom without statusbar
replace(
  `      bottom: calc(var(--statusbar-h) + 12px);`,
  `      bottom: 16px;`,
  'toast bottom',
);

// Mobile media query overhaul
replace(
  `    @media (max-width: 1099px) {
      .shell {
        grid-template-columns: var(--sidebar-w) minmax(0, 1fr);
        grid-template-rows: var(--chrome-h) auto minmax(0, 1fr) 200px var(--statusbar-h);
      }

      html.admin-embed .shell {
        grid-template-columns: minmax(0, 1fr);
        grid-template-rows: var(--chrome-h) auto minmax(0, 1fr) 200px var(--statusbar-h);
      }

      html.oplog-collapsed .shell,
      html.admin-embed.oplog-collapsed .shell {
        grid-template-rows: var(--chrome-h) auto minmax(0, 1fr) var(--statusbar-h);
      }

      .header {
        grid-column: 2 / 3;
      }

      html.admin-embed .header {
        grid-column: 1 / -1;
      }

      .sidebar {
        grid-row: 1 / -1;
      }

      .statusbar {
        grid-column: 2 / -1;
      }

      html.admin-embed .statusbar {
        grid-column: 1 / -1;
      }

      .oplog {
        grid-row: 4;
        grid-column: 1 / -1;
        border-left: none;
        border-top: 1px solid var(--border);
      }

      html.admin-embed .oplog {
        grid-column: 1;
        grid-row: 4;
      }

      .statusbar {
        grid-row: 5;
      }

      html.oplog-collapsed .statusbar {
        grid-row: 4;
      }

      .toast {
        right: 16px;
      }
    }`,
  `    @media (max-width: 1099px) {
      .shell {
        grid-template-columns: var(--sidebar-w) var(--secondary-w) minmax(0, 1fr);
        grid-template-rows: var(--chrome-h) auto minmax(0, 1fr) 200px;
      }

      html.admin-embed .shell {
        grid-template-columns: var(--secondary-w) minmax(0, 1fr);
        grid-template-rows: var(--chrome-h) auto minmax(0, 1fr) 200px;
      }

      html.oplog-collapsed .shell,
      html.admin-embed.oplog-collapsed .shell {
        grid-template-rows: var(--chrome-h) auto minmax(0, 1fr);
      }

      .header {
        grid-column: 2 / 4;
      }

      html.admin-embed .header {
        grid-column: 1 / 3;
      }

      .oplog {
        grid-row: 4;
        grid-column: 1 / -1;
        border-left: none;
        border-top: 1px solid var(--border);
      }

      html.admin-embed .oplog {
        grid-column: 1 / -1;
        grid-row: 4;
      }

      .toast {
        right: 16px;
      }
    }`,
  'mobile grid',
);

// --- HTML: remove sidebar toggle from sidebar ---
replace(
  `      </nav>
      <button type="button" class="sidebar-toggle" id="sidebar-toggle" aria-controls="sidebar" aria-expanded="true"
        aria-label="Collapse sidebar" title="Collapse sidebar">
        <svg class="icon-collapse" viewBox="0 0 24 24" aria-hidden="true">
          <rect width="18" height="18" x="3" y="3" rx="2" />
          <path d="M9 3v18" />
          <path d="m16 15-3-3 3-3" />
        </svg>
        <svg class="icon-expand" viewBox="0 0 24 24" aria-hidden="true">
          <rect width="18" height="18" x="3" y="3" rx="2" />
          <path d="M9 3v18" />
          <path d="m14 9 3 3-3 3" />
        </svg>
        <span class="nav-label">Collapse</span>
      </button>
    </aside>

    <header class="header">
      <div class="crumb" aria-label="Location">
        <span class="crumb-nav">Operate / VCS</span>
        <span class="crumb-sep" aria-hidden="true">/</span>
        <span class="crumb-path" id="repo-path" title="Repository root">—</span>
      </div>
      <div class="header-end">
        <button type="button" class="notify" id="notify-btn" aria-label="Notifications" title="Notifications">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
          </svg>
          <span class="notify-badge" id="notify-badge" hidden>0</span>
        </button>
      </div>
    </header>`,
  `      </nav>
      <div class="resize-handle" data-resize="sidebar" role="separator" aria-orientation="vertical"
        aria-label="Resize sidebar" tabindex="0"></div>
    </aside>

    <aside class="secondary" id="secondary" data-route="vcs">
      <div class="secondary-head" id="secondary-head">VCS</div>
      <nav class="secondary-nav" aria-label="VCS" id="secondary-nav">
        <button type="button" class="nav-item" data-secondary="milestones" title="Milestones" aria-label="Milestones">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
            <line x1="4" x2="4" y1="22" y2="15" />
          </svg>
          <span class="nav-label">Milestones</span>
        </button>
        <button type="button" class="nav-item" data-secondary="issues" title="Issues" aria-label="Issues">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4" />
            <path d="M12 8h.01" />
          </svg>
          <span class="nav-label">Issues</span>
        </button>
        <button type="button" class="nav-item" data-secondary="lanes" aria-current="page" title="Lanes"
          aria-label="Lanes">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M2 12h6" />
            <path d="M22 12h-6" />
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v3" />
            <path d="M12 19v3" />
          </svg>
          <span class="nav-label">Lanes</span>
        </button>
        <button type="button" class="nav-item" data-secondary="workflows" title="Workflows" aria-label="Workflows">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect width="8" height="8" x="3" y="3" rx="2" />
            <path d="M7 11v4a2 2 0 0 0 2 2h4" />
            <rect width="8" height="8" x="13" y="13" rx="2" />
          </svg>
          <span class="nav-label">Workflows</span>
        </button>
      </nav>
      <div class="resize-handle" data-resize="secondary" role="separator" aria-orientation="vertical"
        aria-label="Resize secondary sidebar" tabindex="0"></div>
    </aside>

    <header class="header">
      <div class="header-start">
        <button type="button" class="sidebar-toggle" id="sidebar-toggle" aria-controls="sidebar" aria-expanded="true"
          aria-label="Collapse sidebar" title="Collapse sidebar">
          <svg class="icon-collapse" viewBox="0 0 24 24" aria-hidden="true">
            <rect width="18" height="18" x="3" y="3" rx="2" />
            <path d="M9 3v18" />
            <path d="m16 15-3-3 3-3" />
          </svg>
          <svg class="icon-expand" viewBox="0 0 24 24" aria-hidden="true">
            <rect width="18" height="18" x="3" y="3" rx="2" />
            <path d="M9 3v18" />
            <path d="m14 9 3 3-3 3" />
          </svg>
        </button>
        <div class="crumb" aria-label="Location">
          <span class="crumb-repo" id="crumb-repo">trellis-node</span>
          <span class="crumb-sep" aria-hidden="true">/</span>
          <span class="crumb-zone" id="crumb-zone">operate</span>
          <span class="crumb-sep" aria-hidden="true">/</span>
          <span class="crumb-route" id="crumb-route">vcs</span>
        </div>
      </div>
      <div class="header-end">
        <div class="header-stats" role="status" aria-label="Repository status">
          <div class="live" aria-live="polite" title="Stream status">
            <span class="live-dot" id="live-dot" aria-hidden="true"></span>
            <span id="live-label">connecting…</span>
          </div>
          <span class="item" data-priority="low" title="Lanes">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M2 12h6" />
              <path d="M22 12h-6" />
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v3" />
              <path d="M12 19v3" />
            </svg>
            <b id="stat-lanes">—</b><span class="lbl"> lanes</span>
          </span>
          <span class="item" data-priority="low" title="Issues">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4" />
              <path d="M12 8h.01" />
            </svg>
            <b id="stat-issues">—</b><span class="lbl"> issues</span>
          </span>
        </div>
        <button type="button" class="notify" id="notify-btn" aria-label="Notifications" title="Notifications">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
          </svg>
          <span class="notify-badge" id="notify-badge" hidden>0</span>
        </button>
      </div>
    </header>`,
  'secondary + header chrome',
);

// Wrap main content with panels + empty stubs before </main>
replace(
  `    <main class="main">
      <div class="banner" id="lock"></div>

      <div id="tml-root">`,
  `    <main class="main">
      <div class="banner" id="lock"></div>

      <div class="secondary-empty" data-panel="milestones" id="panel-milestones">
        <strong>Milestones</strong>
        <span>No milestones view yet.</span>
      </div>
      <div class="secondary-empty" data-panel="workflows" id="panel-workflows">
        <strong>Workflows</strong>
        <span>Pipeline setup and visualization will live here.</span>
      </div>

      <div id="tml-root" data-panel="board">`,
  'panel stubs',
);

// Oplog resize handle + remove footer
replace(
  `    <aside class="oplog" id="oplog">
      <div class="oplog-head">
        <h2>Op log</h2>
        <button type="button" class="chrome-toggle" id="oplog-toggle" data-panel="oplog" aria-controls="oplog"
          aria-expanded="true" aria-label="Close op log" title="Close op log">
          <svg class="icon-close" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>
      </div>
      <div class="ops" id="ops">
        <div class="ops-empty" id="ops-empty">No ops yet</div>
      </div>
    </aside>

    <footer class="statusbar" role="status" aria-label="Repository status">
      <div class="statusbar-left">
        <div class="live" aria-live="polite" title="Stream status">
          <span class="live-dot" id="live-dot" aria-hidden="true"></span>
          <span id="live-label">connecting…</span>
        </div>
        <span class="item" data-priority="low" title="Lanes">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M2 12h6" />
            <path d="M22 12h-6" />
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v3" />
            <path d="M12 19v3" />
          </svg>
          <b id="stat-lanes">—</b><span class="lbl"> lanes</span>
        </span>
        <span class="item" data-priority="low" title="Issues">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4" />
            <path d="M12 8h.01" />
          </svg>
          <b id="stat-issues">—</b><span class="lbl"> issues</span>
        </span>
      </div>
    </footer>
  </div>`,
  `    <aside class="oplog" id="oplog">
      <div class="resize-handle" data-resize="oplog" role="separator" aria-orientation="vertical"
        aria-label="Resize op log" tabindex="0"></div>
      <div class="oplog-head">
        <h2>Op log</h2>
        <button type="button" class="chrome-toggle" id="oplog-toggle" data-panel="oplog" aria-controls="oplog"
          aria-expanded="true" aria-label="Close op log" title="Close op log">
          <svg class="icon-close" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>
      </div>
      <div class="ops" id="ops">
        <div class="ops-empty" id="ops-empty">No ops yet</div>
      </div>
    </aside>
  </div>`,
  'oplog handle + drop statusbar',
);

// JS: keys, setSidebarCollapsed label, repo basename, secondary, resize
replace(
  `    const VIEW_KEY = 'trellis-admin-view';
    const SIDEBAR_KEY = 'trellis-admin-sidebar';
    const OPLOG_KEY = 'trellis-admin-oplog';`,
  `    const VIEW_KEY = 'trellis-admin-view';
    const SIDEBAR_KEY = 'trellis-admin-sidebar';
    const SIDEBAR_W_KEY = 'trellis-admin-sidebar-w';
    const SECONDARY_W_KEY = 'trellis-admin-secondary-w';
    const OPLOG_KEY = 'trellis-admin-oplog';
    const OPLOG_W_KEY = 'trellis-admin-oplog-w';
    const SECONDARY_KEY = 'trellis-admin-secondary';`,
  'storage keys',
);

replace(
  `    function setSidebarCollapsed(collapsed) {
      document.documentElement.classList.toggle('sidebar-collapsed', collapsed);
      localStorage.setItem(SIDEBAR_KEY, collapsed ? '1' : '0');
      setPanelToggle(sidebarToggle, collapsed, 'Expand sidebar', 'Collapse sidebar');
      const lbl = sidebarToggle?.querySelector('.nav-label');
      if (lbl) lbl.textContent = collapsed ? 'Expand' : 'Collapse';
    }`,
  `    function setSidebarCollapsed(collapsed) {
      document.documentElement.classList.toggle('sidebar-collapsed', collapsed);
      localStorage.setItem(SIDEBAR_KEY, collapsed ? '1' : '0');
      setPanelToggle(sidebarToggle, collapsed, 'Expand sidebar', 'Collapse sidebar');
      if (!collapsed) {
        const saved = Number(localStorage.getItem(SIDEBAR_W_KEY));
        if (Number.isFinite(saved) && saved >= 140) {
          document.documentElement.style.setProperty('--sidebar-w', saved + 'px');
        }
      } else {
        document.documentElement.style.removeProperty('--sidebar-w');
      }
    }

    function repoBasename(p) {
      if (!p) return 'trellis-node';
      const parts = String(p).replace(/\\\\/g, '/').split('/').filter(Boolean);
      return parts[parts.length - 1] || 'trellis-node';
    }

    function setSecondary(id) {
      const allowed = new Set(['milestones', 'issues', 'lanes', 'workflows']);
      if (!allowed.has(id)) id = 'lanes';
      localStorage.setItem(SECONDARY_KEY, id);
      document.querySelectorAll('#secondary-nav .nav-item').forEach((b) => {
        b.setAttribute('aria-current', b.dataset.secondary === id ? 'page' : null);
        if (b.dataset.secondary !== id) b.removeAttribute('aria-current');
        else b.setAttribute('aria-current', 'page');
      });
      const board = document.getElementById('tml-root');
      const toolbar = document.querySelector('.operate-toolbar');
      const showBoard = id === 'lanes' || id === 'issues';
      if (board) board.hidden = !showBoard;
      if (toolbar) toolbar.hidden = !showBoard;
      document.querySelectorAll('.secondary-empty').forEach((el) => {
        el.dataset.active = el.dataset.panel === id ? 'true' : 'false';
      });
    }

    function bindResizeHandles() {
      const root = document.documentElement;
      const cfg = {
        sidebar: {
          key: SIDEBAR_W_KEY,
          css: '--sidebar-w',
          min: 140,
          max: 360,
          dir: 1,
          gate: () => !root.classList.contains('sidebar-collapsed'),
        },
        secondary: {
          key: SECONDARY_W_KEY,
          css: '--secondary-w',
          min: 160,
          max: 360,
          dir: 1,
          gate: () => true,
        },
        oplog: {
          key: OPLOG_W_KEY,
          css: '--oplog-w',
          min: 200,
          max: 560,
          dir: -1,
          gate: () => !root.classList.contains('oplog-collapsed'),
        },
      };
      for (const [name, conf] of Object.entries(cfg)) {
        const saved = Number(localStorage.getItem(conf.key));
        if (Number.isFinite(saved)) root.style.setProperty(conf.css, saved + 'px');
      }
      document.querySelectorAll('.resize-handle').forEach((handle) => {
        const name = handle.dataset.resize;
        const conf = cfg[name];
        if (!conf) return;
        const onDown = (ev) => {
          if (!conf.gate()) return;
          ev.preventDefault();
          const startX = ev.clientX;
          const startW = parseFloat(getComputedStyle(root).getPropertyValue(conf.css)) || 200;
          root.classList.add('is-resizing');
          handle.classList.add('is-active');
          const onMove = (e) => {
            const next = Math.min(
              conf.max,
              Math.max(conf.min, startW + conf.dir * (e.clientX - startX)),
            );
            root.style.setProperty(conf.css, next + 'px');
          };
          const onUp = (e) => {
            const next = Math.min(
              conf.max,
              Math.max(conf.min, startW + conf.dir * (e.clientX - startX)),
            );
            root.style.setProperty(conf.css, next + 'px');
            localStorage.setItem(conf.key, String(Math.round(next)));
            if (name === 'sidebar') {
              root.classList.remove('sidebar-collapsed');
              localStorage.setItem(SIDEBAR_KEY, '0');
              setPanelToggle(sidebarToggle, false, 'Expand sidebar', 'Collapse sidebar');
            }
            root.classList.remove('is-resizing');
            handle.classList.remove('is-active');
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
          };
          window.addEventListener('pointermove', onMove);
          window.addEventListener('pointerup', onUp);
        };
        handle.addEventListener('pointerdown', onDown);
      });
    }`,
  'secondary + resize js',
);

replace(
  `    setSidebarCollapsed(localStorage.getItem(SIDEBAR_KEY) === '1');
    setOplogCollapsed(localStorage.getItem(OPLOG_KEY) === '1');
    updateLiveLabel();`,
  `    setSidebarCollapsed(localStorage.getItem(SIDEBAR_KEY) === '1');
    setOplogCollapsed(localStorage.getItem(OPLOG_KEY) === '1');
    setSecondary(localStorage.getItem(SECONDARY_KEY) || 'lanes');
    document.querySelectorAll('#secondary-nav .nav-item').forEach((b) => {
      b.addEventListener('click', () => setSecondary(b.dataset.secondary));
    });
    bindResizeHandles();
    updateLiveLabel();`,
  'init secondary resize',
);

replace(
  `    function shortRepoPath(p) {
      if (!p) return '—';
      // Collapse /Users/<name> or /home/<name> → ~
      const m = p.match(/^\\/(?:Users|home)\\/[^/]+(.*)$/);
      if (m) return '~' + (m[1] || '');
      return p;
    }

    function applySnapshot(snap) {
      lastSnap = snap;
      const pathEl = document.getElementById('repo-path');
      const root = snap.rootPath || '—';
      pathEl.textContent = shortRepoPath(root);
      pathEl.title = snap.rootPath || 'Repository root';`,
  `    function applySnapshot(snap) {
      lastSnap = snap;
      const repoEl = document.getElementById('crumb-repo');
      if (repoEl) {
        repoEl.textContent = repoBasename(snap.rootPath);
        repoEl.title = snap.rootPath || 'Repository root';
      }`,
  'applySnapshot crumb repo',
);

fs.writeFileSync(file, html);
fs.writeFileSync(path.join(__dirname, 'patch-shell-out.txt'), 'ok wrote ' + html.length + '\n');
console.error('wrote', html.length);
