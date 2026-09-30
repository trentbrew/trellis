#!/usr/bin/env bun
// formatTerminal spike — table/kv heuristics over JSON-shaped payloads.

import { ansi, formatTerminal, plain } from './index.ts'

const strip = (s) => s.replace(/\u001b\[[0-9;?]*[A-Za-z]/g, '')

const caps = [
  { id: 'capability:process', name: 'Process lifecycle', mutates: true, routes: ['/exec'] },
  { id: 'capability:catalog', name: 'Hardware catalog', mutates: false, routes: ['/graph/gaps'] },
]

const capLines = formatTerminal(caps, { hints: { title: 'Capabilities', columns: ['id', 'name', 'mutates'] }, style: plain })
const capText = strip(capLines.join('\n'))
if (!capText.includes('Capabilities')) throw new Error(`cap title: ${capText}`)
if (capText.trimStart().startsWith('{') || capText.trimStart().startsWith('[')) {
  throw new Error(`capabilities should not look like raw JSON: ${capText.slice(0, 80)}`)
}
if (!capText.includes('capability:process')) throw new Error(`cap row: ${capText}`)

const refs = { count: 2, dangling: ['@missing'], targets: ['proc:init', 'machine:turtleos'] }
const refLines = formatTerminal(refs, { hints: { title: 'References' }, style: plain })
const refText = strip(refLines.join('\n'))
if (!refText.includes('count') || !refText.includes('proc:init')) throw new Error(`refs kv: ${refText}`)

const kernel = { bundle: 'supervisor', version: '0.1.0', trellis: '4.0.10' }
const kernelLines = formatTerminal(kernel, { hints: { title: 'Kernel' }, style: plain })
if (!strip(kernelLines.join('\n')).includes('bundle')) throw new Error('kernel kv')

const empty = formatTerminal([], { hints: { emptyMessage: 'No capabilities.' }, style: ansi })
if (!strip(empty[0]).includes('No capabilities')) throw new Error(`empty: ${empty}`)

const emptyTitled = formatTerminal([], { hints: { title: 'Projections', emptyMessage: 'No projections.' }, style: plain })
const emptyTitledText = strip(emptyTitled.join('\n'))
if (!emptyTitledText.includes('Projections') || !emptyTitledText.includes('No projections')) {
  throw new Error(`empty titled: ${emptyTitledText}`)
}

const sidecars = [
  { key: 'graph', id: 'sidecar:graph', port: 7777, status: 'active', listening: true },
  { key: 'agentBridge', id: 'sidecar:agent-bridge', port: 7778, status: 'reserved', listening: false },
]
const sideLines = formatTerminal(sidecars, {
  hints: { title: 'Sidecars', columns: ['key', 'id', 'port', 'status', 'listening'] },
  style: plain,
})
const header = strip(sideLines.find((l) => l.includes('port') && l.includes('key')) ?? '')
const row = strip(sideLines.find((l) => l.includes('agentBridge')) ?? '')
const portCol = header.indexOf('port')
const portVal = row.indexOf('7778')
if (portCol < 0 || portVal !== portCol) {
  throw new Error(`table columns misaligned: header@${portCol} row@${portVal}\n${header}\n${row}`)
}

console.log('format terminal smoke: ok')
