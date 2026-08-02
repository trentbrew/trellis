/**
 * First-run onboarding (Slice A, docs/planning/device-registry-and-sprite-pairing.md).
 *
 * Identity is created once, at first device/workstation setup — the "Apple ID"
 * model. `trellis init` first-run detection (no person identity, no profile)
 * enters an onboarding branch:
 *
 * - **new** — create the person identity (`~/.trellis/identity.json`) + profile;
 *   ops minted from op #1 are signed with the person root.
 * - **existing** — the identity lives on another device; the machine adopts it
 *   via the QR pairing flow (`trellis pair`). Person identity is NOT created
 *   here; the device key signs as the identity (getSigningMaterial device-first).
 * - **skip** — stay anonymous (legacy behavior), dev-only warning.
 *
 * Non-interactive default is `new` (deterministic for CI / sprite
 * provisioning), overridable with `--identity new|existing|skip`.
 */

import chalk from 'chalk';
import { ensurePersonIdentity, hasPersonIdentity } from '../identity/identity.js';
import { hasProfile, updateProfile } from '../scaffold/profile.js';

export type IdentityMode = 'new' | 'existing' | 'skip';

export interface OnboardOptions {
  interactive: boolean;
  /** `--identity` CLI override — deterministic mode for non-interactive runs. */
  identityFlag?: IdentityMode;
}

export interface OnboardResult {
  mode: IdentityMode;
  displayName?: string;
}

function defaultName(): string {
  return process.env.USER ?? 'Anonymous';
}

function printExistingInstructions(): void {
  console.log(chalk.yellow('\n  Pairing flow (adopt your identity from an existing device):'));
  console.log('    1. On your existing device:  trellis pair start');
  console.log('    2. Scan or paste the payload: trellis pair join <payload>');
  console.log('    3. Approve on the existing device (verify the fingerprint)');
  console.log('    4. Finish here:              trellis pair accept <auth-payload>');
  console.log(chalk.dim('    Your device key signs as your identity — `~/.trellis/identity.json` is never copied.\n'));
}

/**
 * First-run onboarding gate. No-op (mode `skip`) when the machine is already
 * onboarded (person identity or profile exists).
 */
export async function onboardFirstRun(
  opts: OnboardOptions,
): Promise<OnboardResult> {
  if (hasPersonIdentity() || hasProfile()) {
    return { mode: 'skip' };
  }

  if (opts.interactive) {
    const { select, input } = await import('@inquirer/prompts');
    console.log(chalk.cyan('\n  Welcome to Trellis! Let\'s set up your identity.'));
    const choice = await select({
      message: 'Are you new to Trellis, or do you already have an identity?',
      choices: [
        {
          name: 'New — create my identity',
          value: 'new' as IdentityMode,
        },
        {
          name: 'Existing — pair with another device to sync my graph',
          value: 'existing' as IdentityMode,
        },
      ],
      default: 'new',
    });

    if (choice === 'new') {
      const nameRaw = await input({
        message: 'Your name',
        default: defaultName(),
      });
      const displayName = nameRaw.trim() || defaultName();
      ensurePersonIdentity({ displayName });
      updateProfile({ name: displayName });
      console.log(
        chalk.green(
          `  ✓ Identity created at ~/.trellis/identity.json (${displayName})\n`,
        ),
      );
      return { mode: 'new', displayName };
    }

    printExistingInstructions();
    const nameRaw = await input({
      message: 'Your name (profile only — identity comes from pairing)',
      default: defaultName(),
    });
    const displayName = nameRaw.trim() || defaultName();
    updateProfile({ name: displayName });
    return { mode: 'existing', displayName };
  }

  const mode: IdentityMode = opts.identityFlag ?? 'new';

  if (mode === 'new') {
    const displayName = defaultName();
    ensurePersonIdentity({ displayName });
    updateProfile({ name: displayName });
    return { mode, displayName };
  }

  if (mode === 'existing') {
    printExistingInstructions();
    updateProfile({ name: defaultName() });
    return { mode };
  }

  updateProfile({ name: 'Unknown' });
  console.log(
    chalk.yellow(
      '  ⚠ Skipping identity onboarding — this workspace stays anonymous (dev-only). Run `trellis identity init` to create one later.',
    ),
  );
  return { mode };
}
