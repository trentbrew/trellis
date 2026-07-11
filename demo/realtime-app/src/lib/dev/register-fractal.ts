import type { TrellisDevRegistry } from 'trellis/client/sdk';
import { resolveShell } from '$lib/fractal/shells';

export interface FractalDevState {
  lane: () => string;
  vantage: () => number;
  thingId: () => string | null;
}

export function createFractalDevRegistry(state: FractalDevState): TrellisDevRegistry {
  const lane = () => state.lane();
  const vantage = () => state.vantage();

  return {
    version: 1,
    lane,
    fractal: {
      vantage,
      shell: () => resolveShell(vantage()),
      thingId: () => state.thingId(),
      lane,
    },
  };
}
