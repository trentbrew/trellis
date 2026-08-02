/**
 * Common inspect wrapper — single-component shell renderer for the
 * Storybook-style gallery. Creates a fresh core from default config,
 * mounts the vanilla view into the canvas, and fills the controls rail
 * with About (description + adapter badges), live State JSON, and action
 * buttons + reset. Returns a cleanup.
 */

import type { HeadlessCore } from '../../src/headless/index.js'
import type { RegisteredComponent, VisualRenderer } from '../../src/inspector/index.js'
import { el } from './dom.js'

export interface InspectTargets {
  canvas: HTMLElement
  aboutDisplay: HTMLElement
  stateDisplay: HTMLElement
  actionsDisplay: HTMLElement
}

export function renderInspect(
  entry: RegisteredComponent<unknown>,
  targets: InspectTargets,
): () => void {
  let core: HeadlessCore<unknown> = entry.create(entry.defaultConfig ?? ({} as never))
  let viewCleanup: (() => void) | undefined
  let unsub: (() => void) | undefined
  let buttons: HTMLButtonElement[] = []

  const vanilla = entry.renderers.find(
    (r): r is VisualRenderer<unknown> => r.framework === 'vanilla',
  )

  function mountView(): void {
    viewCleanup?.()
    viewCleanup = undefined
    targets.canvas.replaceChildren()
    if (vanilla) {
      try {
        viewCleanup = vanilla.render(core, targets.canvas, entry.defaultConfig ?? {})
      } catch (err) {
        targets.canvas.append(el('p', { class: 'dim' }, `render failed: ${(err as Error).message}`))
      }
    } else {
      targets.canvas.append(el('p', { class: 'dim' }, 'no vanilla renderer registered'))
    }
  }

  function refresh(): void {
    targets.stateDisplay.textContent = JSON.stringify(core.state, null, 2)
    for (const [i, btn] of buttons.entries()) {
      const action = entry.actions?.[i]
      if (action?.enabled) btn.disabled = !action.enabled(core)
    }
  }

  function reset(): void {
    unsub?.()
    core = entry.create(entry.defaultConfig ?? ({} as never))
    unsub = core.subscribe(refresh)
    mountView()
    refresh()
  }

  targets.aboutDisplay.replaceChildren(
    el('p', { class: 'comp-desc' }, entry.description ?? ''),
  )
  const badges = entry.renderers.map((r) =>
    el('span', { class: 'chip badge' }, r.framework),
  )
  targets.aboutDisplay.append(el('div', { class: 'badge-row' }, ...badges))

  targets.actionsDisplay.replaceChildren()
  buttons = []
  if (entry.actions?.length) {
    for (const action of entry.actions) {
      const btn = el('button', { onclick: () => action.run(core) }, action.label)
      buttons.push(btn)
      targets.actionsDisplay.append(btn)
    }
  }
  targets.actionsDisplay.append(el('button', { class: 'reset', onclick: reset }, '↺ reset'))

  unsub = core.subscribe(refresh)
  mountView()
  refresh()

  return () => {
    viewCleanup?.()
    unsub?.()
  }
}
