/**
 * Inspector registry entries — the canonical index of headless components
 * (ADR 0034). Each entry pairs a kernel core with metadata, action specs,
 * and a vanilla renderer. Importing this module registers every entry into
 * the shared `inspectorRegistry` singleton, so any consumer (wedge-smoke,
 * the admin Components panel) renders them in isolation with a common
 * inspect wrapper.
 *
 * Import as a side effect to populate the registry:
 *
 *   import '../../inspector/entries/index.js';
 */

import { inspectorRegistry } from '../registry/inspector-registry.js';
import { tableEntry } from './table.js';
import { editorEntry } from './editor.js';
import { uploadEntry } from './upload.js';
import { colorpickerEntry } from './colorpicker.js';
import { undoHistoryEntry } from './undo-history.js';
import { formEntry } from './forms.js';
import { paletteEntry } from './palette.js';
import { dialogEntry } from './dialog.js';
import { timelineEntry } from './timeline.js';
import { comboboxEntry } from './combobox.js';
import { kanbanEntry } from './kanban.js';

inspectorRegistry.register(tableEntry);
inspectorRegistry.register(editorEntry);
inspectorRegistry.register(uploadEntry);
inspectorRegistry.register(colorpickerEntry);
inspectorRegistry.register(undoHistoryEntry);
inspectorRegistry.register(formEntry);
inspectorRegistry.register(paletteEntry);
inspectorRegistry.register(dialogEntry);
inspectorRegistry.register(timelineEntry);
inspectorRegistry.register(comboboxEntry);
inspectorRegistry.register(kanbanEntry);

export { inspectorRegistry };
