/**
 * Redirect the oplog mirror out of the shared `~/.trellis/oplog-mirror` for
 * the whole test process.
 *
 * The JSON-op backend mirrors every initialized repo into the machine-level
 * mirror (see `src/vcs/oplog-mirror.ts`). Tests init many scratch repos, so
 * without this the suite floods the shared mirror — the same global store the
 * other active session's repo (trellis-chat-gemma4) lives in. The env override
 * is read at module import, so it must be set here (before any test module
 * loads `oplog-mirror.js`).
 */
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

process.env.TRELLIS_OPLOG_MIRROR_DIR = mkdtempSync(
  join(tmpdir(), 'trellis-mirror-test-'),
);
