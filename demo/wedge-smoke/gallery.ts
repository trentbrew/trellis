/**
 * Wedge gallery — Storybook-like shell consuming the UI registry stack
 * (TRL-422). One component at a time, hash-routed (#type), fullscreen
 * toggle, collapsible sidebar, theme switcher, and <trellis-icon>
 * aliases in the nav. Self-contained: imports icons from local dist.
 *
 * Build with `pnpm smoke:wedge`; open index.html (served, ESM module).
 */

import { inspectorRegistry } from '../../src/inspector/index.js'
import '../../src/inspector/entries/index.js'
import { renderInspect } from './inspect.js'
import { el, $ } from './dom.js'
import './icons.js'

const components = inspectorRegistry.listComponents()
const count = components.length

const navList = $('nav-list')
const navSearch = $('nav-search')
const navCount = $('nav-count')
const btnNavToggle = $('btn-nav-toggle')
const toolbarTitle = $('toolbar-title')
const toolbarType = $('toolbar-type')
const themeSelect = $('theme-select')
const btnPrev = $('btn-prev')
const btnNext = $('btn-next')
const btnFullscreen = $('btn-fullscreen')
const canvas = $('component-canvas')
const stateDisplay = $('state-display')
const actionsDisplay = $('actions-display')
const aboutDisplay = $('about-display')
const body = document.body

let currentIndex = -1
let cleanup: (() => void) | undefined
const navButtons: HTMLButtonElement[] = []

/** Semantic icon aliases for each known component type. */
const ICON_ALIASES: Record<string, string> = {
  table: 'entity-doc',
  editor: 'entity-note',
  upload: 'action-create',
  colorpicker: 'status-in-progress',
  'undo-history': 'action-edit',
  form: 'core-search',
  palette: 'core-search',
  dialog: 'core-close',
  timeline: 'core-plus',
  combobox: 'core-menu',
  kanban: 'entity-project',
}

function iconForType(type: string): string {
  return ICON_ALIASES[type] ?? 'entity-doc'
}

function loadComponent(index: number): void {
  const entry = components[index]
  if (!entry) return
  currentIndex = index
  cleanup?.()
  cleanup = renderInspect(entry, {
    canvas,
    stateDisplay,
    actionsDisplay,
    aboutDisplay,
  })
  toolbarTitle.textContent = entry.name
  toolbarType.textContent = entry.type
  updateNavState()
}

function updateNavState(): void {
  for (const [i, btn] of navButtons.entries()) {
    btn.classList.toggle('active', i === currentIndex)
  }
  navCount.textContent = String(count)
}

function renderNav(): void {
  navList.replaceChildren()
  navButtons.length = 0
  const q = navSearch.value.trim().toLowerCase()
  components.forEach((entry, i) => {
    if (q && !entry.name.toLowerCase().includes(q)) return
    const alias = iconForType(entry.type)
    const btn = el(
      'button',
      {
        class: 'nav-item',
        onclick: () => {
          location.hash = String(entry.type)
        },
      },
      `<trellis-icon name="${alias}" size="sm"></trellis-icon> ${entry.name}`,
    ) as HTMLButtonElement
    // The innerHTML sets the icon element — Lit needs to upgrade it.
    // We use innerHTML deliberately (known-safe alias string).
    btn.innerHTML = `<trellis-icon name="${alias}" size="sm"></trellis-icon> ${entry.name}`
    navButtons.push(btn)
    navList.append(btn)
  })
  updateNavState()
}

function visibleIndices(): number[] {
  const q = navSearch.value.trim().toLowerCase()
  return components
    .map((c, i) => ({ c, i }))
    .filter(({ c }) => !q || c.name.toLowerCase().includes(q))
    .map(({ i }) => i)
}

function step(delta: number): void {
  const visible = visibleIndices()
  if (!visible.length) return
  const pos = visible.indexOf(currentIndex)
  const next = visible[(pos + delta + visible.length) % visible.length]
  location.hash = String(components[next].type)
}

function handleHash(): void {
  const type = decodeURIComponent(location.hash.replace(/^#/, ''))
  const index = components.findIndex((c) => String(c.type) === type)
  loadComponent(index >= 0 ? index : 0)
}

// Fullscreen
function setFullscreen(on: boolean): void {
  body.classList.toggle('fullscreen', on)
  btnFullscreen.classList.toggle('active', on)
  btnFullscreen.title = on ? 'Exit fullscreen (Esc)' : 'Fullscreen'
}
btnFullscreen.addEventListener('click', () =>
  setFullscreen(!body.classList.contains('fullscreen')),
)

// Sidebar collapse
function setNavCollapsed(collapsed: boolean): void {
  body.classList.toggle('nav-collapsed', collapsed)
  btnNavToggle.classList.toggle('active', collapsed)
}
btnNavToggle.addEventListener('click', () =>
  setNavCollapsed(!body.classList.contains('nav-collapsed')),
)

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && body.classList.contains('fullscreen')) {
    setFullscreen(false)
    return
  }
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
    e.preventDefault()
    setNavCollapsed(!body.classList.contains('nav-collapsed'))
    return
  }
  const t = e.target as HTMLElement | null
  const typing =
    t &&
    (t.tagName === 'INPUT' ||
      t.tagName === 'TEXTAREA' ||
      t.tagName === 'SELECT' ||
      t.isContentEditable)
  if (typing) return
  if (e.key === 'ArrowLeft') step(-1)
  else if (e.key === 'ArrowRight') step(1)
  else if (e.key === '/') {
    e.preventDefault()
    navSearch.focus()
  }
})

navSearch.addEventListener('input', renderNav)
btnPrev.addEventListener('click', () => step(-1))
btnNext.addEventListener('click', () => step(1))
window.addEventListener('hashchange', handleHash)
themeSelect.addEventListener('change', () => {
  document.documentElement.setAttribute('data-theme', themeSelect.value)
})

renderNav()
handleHash()
