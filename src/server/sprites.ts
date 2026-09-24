/**
 * Sprites CLI helpers
 *
 * Wrapper functions for interacting with the Sprites VM platform CLI.
 */

import { existsSync } from 'fs';
import { join, resolve } from 'path';

/**
 * Run a sprite command and capture output.
 */
export async function runSpriteCmd(args: string[]): Promise<string> {
  const proc = Bun.spawn(['sprite', ...args], {
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const exitCode = await proc.exited;
  const stdout = await new Response(proc.stdout).text();
  if (exitCode !== 0) {
    const err = await new Response(proc.stderr).text();
    throw new Error(`sprite ${args[0]} failed (exit ${exitCode}): ${err}`);
  }
  return stdout.trim();
}

/**
 * Copy a file to/from a sprite using sprite cp.
 */
export async function runSpriteCopy(
  localPath: string,
  spriteName: string,
  remotePath: string,
): Promise<void> {
  // Sprites CLI v0.0.1-rc40+: `sprite cp` removed — upload via exec --file
  await runSpriteCmd([
    'exec',
    '-s',
    spriteName,
    `--file`,
    `${localPath}:${remotePath}`,
    '--',
    'true',
  ]);
}

/**
 * Run a sprite command with inherited stdio (for interactive commands).
 */
export async function runSpriteInteractive(args: string[]): Promise<void> {
  const proc = Bun.spawn(['sprite', ...args], { stdio: 'inherit' as any });
  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    throw new Error(`sprite ${args[0]} failed (exit ${exitCode})`);
  }
}

/**
 * Assert that the sprite CLI is available and authenticated.
 */
export async function assertSpriteCli(): Promise<void> {
  await runSpriteCmd(['--version']).catch(() => {
    throw new Error(
      '`sprite` CLI not found. Install it from https://docs.sprites.dev and authenticate.',
    );
  });
}

/**
 * Resolve a sprite name from explicit flag, active VM config, or error.
 */
export function resolveSprite(explicitName?: string): string {
  if (explicitName) {
    return explicitName;
  }
  // TODO: Implement reading from VM config when we create vm-config.ts
  // For now, we'll require explicit name or fail
  throw new Error(
    'No sprite specified. Use --sprite <name> or set an active sprite with `trellis vm use <name>`',
  );
}
