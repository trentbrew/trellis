import type { TrellisKernel } from '../kernel/trellis-kernel.js';
import { PROVENANCE } from '../persist/canonical-op.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import type { DAGRunStep } from './dag-scheduler.js';

const execAsync = promisify(exec);
const AGENT_CTX = { provenance: PROVENANCE.agent };

export type GateType = 'test' | 'manual' | 'ac_check' | 'semantic_diff';
export type GateFailAction = 'stop' | 'retry' | 'route_to';

export interface DAGGate {
  type: GateType;
  criteria?: string;
  onFail: GateFailAction;
  retryStepId?: string;
  failRouteEdgeId?: string;
}

export interface GateResult {
  passed: boolean;
  message: string;
  action: 'continue' | 'stop' | 'retry' | 'route_to';
  retryStepId?: string;
  failRouteEdgeId?: string;
}

async function runShellCommand(command: string): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  try {
    const { stdout, stderr } = await execAsync(command, { timeout: 30000 });
    return { exitCode: 0, stdout, stderr };
  } catch (err: any) {
    return {
      exitCode: err.code ?? 1,
      stdout: err.stdout ?? '',
      stderr: err.stderr ?? err.message ?? '',
    };
  }
}

function buildResult(passed: boolean, message: string, gate: DAGGate): GateResult {
  return {
    passed,
    message,
    action: passed ? 'continue' : gate.onFail,
    retryStepId: passed ? undefined : gate.retryStepId,
    failRouteEdgeId: passed ? undefined : gate.failRouteEdgeId,
  };
}

async function evaluateTestGate(gate: DAGGate, step: DAGRunStep): Promise<GateResult> {
  const command = gate.criteria?.trim();
  if (!command) {
    return buildResult(false, 'Test gate has no command in criteria', gate);
  }

  const { exitCode, stdout, stderr } = await runShellCommand(command);
  if (exitCode === 0) {
    return buildResult(true, `Test passed: ${stdout.slice(0, 200)}`, gate);
  }
  return buildResult(false, `Test failed (exit ${exitCode}): ${stderr.slice(0, 500)}`, gate);
}

async function evaluateManualGate(gate: DAGGate, _step: DAGRunStep, kernel?: TrellisKernel): Promise<GateResult> {
  if (kernel) {
    const handoffId = `handoff:gate:${_step.step.id}:${Date.now()}`;
    try {
      await kernel.createEntity(handoffId, 'Handoff', {
        type: 'approval',
        status: 'pending',
        sourceStep: _step.step.id,
        gateName: gate.type,
        criteria: gate.criteria ?? '',
      }, undefined, AGENT_CTX);
    } catch { /* swallow */ }
    return {
      passed: false,
      message: `Manual approval required — Handoff created: ${handoffId}`,
      action: 'stop',
      retryStepId: gate.retryStepId,
      failRouteEdgeId: gate.failRouteEdgeId,
    };
  }
  return {
    passed: false,
    message: 'Manual approval required — no kernel available to create Handoff',
    action: 'stop',
    retryStepId: gate.retryStepId,
    failRouteEdgeId: gate.failRouteEdgeId,
  };
}

async function evaluateAcCheckGate(gate: DAGGate, step: DAGRunStep): Promise<GateResult> {
  const criteria = gate.criteria?.trim();
  if (!criteria) {
    return buildResult(true, 'No acceptance criteria defined', gate);
  }

  const output = step.result ?? '';
  const keywords = criteria.split(/\s+/).filter(Boolean);
  const matched = keywords.filter((kw) => output.toLowerCase().includes(kw.toLowerCase()));
  const ratio = matched.length / keywords.length;

  if (ratio >= 0.5) {
    return buildResult(true, `AC check passed (${matched.length}/${keywords.length} keywords matched)`, gate);
  }
  return buildResult(false, `AC check failed (${matched.length}/${keywords.length} keywords matched)`, gate);
}

async function evaluateSemanticDiffGate(_gate: DAGGate, _step: DAGRunStep): Promise<GateResult> {
  return buildResult(true, 'Semantic diff gate passed (v1: no-op)', _gate);
}

export async function evaluateGate(
  gate: DAGGate,
  step: DAGRunStep,
  kernel?: TrellisKernel,
): Promise<GateResult> {
  switch (gate.type) {
    case 'test':
      return evaluateTestGate(gate, step);
    case 'manual':
      return evaluateManualGate(gate, step, kernel);
    case 'ac_check':
      return evaluateAcCheckGate(gate, step);
    case 'semantic_diff':
      return evaluateSemanticDiffGate(gate, step);
    default:
      return { passed: false, message: `Unknown gate type: ${(gate as any).type}`, action: 'stop' };
  }
}
