/**
 * Trellis Browser — remote DB, schema, realtime, and live-read primitives.
 *
 * Import from `trellis/browser` in browser applications to avoid Node/server
 * modules such as filesystem config, embedded tenancy, or local SQLite.
 *
 * @module trellis/browser
 */

export { TrellisDb, FetchError } from '../client/sdk.browser.js';
export type {
  AuthResult,
  EntityData,
  ListResult,
  QueryResult,
  Subscription,
  SubscriptionCallback,
  TrellisDbLocalOptions,
  TrellisDbOptions,
  TrellisDbRemoteOptions,
  UploadResult,
} from '../client/sdk.browser.js';

export { Signal, BatchSignal } from '../client/reactive.js';
export { liveQuery, liveEntities, liveEntity } from '../client/live.js';
export type {
  LiveEntitiesOptions,
  LiveEntityOptions,
  LiveResource,
  ReadState,
} from '../client/live.js';

export {
  defineType,
  rel,
  rollup,
  formula,
  entitiesQuery,
  entityQuery,
  escapeValue,
  formatEqlLiteral,
  isWhereFilter,
  whereCondition,
  entityMutations,
  resolveRelations,
  inverseForeignKey,
  bindingEntityId,
  bindingToEntity,
  entityRecordToPlain,
  hydrateBindings,
  isSparseBinding,
} from '../schema/index.js';
export type {
  AnyType,
  ComputedField,
  ComputedMap,
  DefineTypeOptions,
  EntityMutations,
  InferEntitiesRead,
  InferEntityRead,
  InferResolvedType,
  InferType,
  Ref,
  Relation,
  RelationMap,
  RelTarget,
  ResolveSpec,
  ResolveSpecFor,
  TrellisType,
  WhereFilter,
  WhereInput,
  WhereOp,
  WhereValue,
} from '../schema/index.js';

// Headless forms (pure schema → form descriptor derivation, browser-safe)
export {
  deriveFormDescriptor,
  deriveFormFields,
  deriveTypeName,
  humanize,
  applyFormOverride,
  formEntityToOverride,
  formMatchesMode,
  listFormableTypes,
  resolveFormDescriptor,
  readFormOverrides,
  createFormCore,
  formSchemaFrom,
  formSchemaFromDescriptor,
  toFormSchema,
  validateFieldValue,
  FIELD_CONTROLS,
  FORM_MODES,
  FormFieldType,
  FormType,
  FORMS_ONTOLOGY,
} from '../forms/index.js';
export type {
  DeriveFormOptions,
  FieldBinding,
  FieldControl,
  FieldOption,
  FieldRelation,
  FieldState,
  FieldValidation,
  FormActions,
  FormDescriptor,
  FormEntity,
  FormEntityLike,
  FormFieldConfig,
  FormFieldDescriptor,
  FormFieldEntity,
  FormFieldEntityLike,
  FormFieldOverride,
  FormKernelReader,
  FormMode,
  FormOverride,
  FormSchema,
  FormSectionDescriptor,
  FormState,
  FormValues,
  ResolveFormOptions,
  UseFormReturn,
  ValidationError,
  ValidationResult,
} from '../forms/index.js';

// Headless UI convention (ADR 0034) — bridge contract + registry types
export { syncFromCore, toSvelteStore } from '../headless/index.js';
export type {
  HeadlessComponentType,
  HeadlessCore,
  RegistryEntry,
} from '../headless/index.js';

// Headless command palette (ADR 0034 pilot) — core is browser-safe
export { createPaletteCore, fuzzyMatch, fuzzyScore } from '../palette/index.js';
export type {
  PaletteActions,
  PaletteConfig,
  PaletteFilter,
  PaletteGroup,
  PaletteItem,
  PaletteState,
  UsePaletteReturn,
} from '../palette/index.js';

// Headless stacked-dialog manager (ADR 0034 wedge 2) — core is browser-safe
export { createDialogCore } from '../dialog/index.js';
export type {
  DialogActions,
  DialogButton,
  DialogConfig,
  DialogInstance,
  DialogKind,
  DialogResult,
  DialogSpec,
  DialogState,
  UseDialogReturn,
} from '../dialog/index.js';

// Headless playhead engine (ADR 0034 wedge 3) — core is browser-safe
export { createTimelineCore } from '../timeline/index.js';
export type {
  TimelineActions,
  TimelineConfig,
  TimelineMark,
  TimelineRange,
  TimelineState,
  UseTimelineReturn,
} from '../timeline/index.js';

// Headless combobox (ADR 0034 wedge 2) — core is browser-safe
export { createComboboxCore } from '../combobox/index.js';
export type {
  ComboboxActions,
  ComboboxConfig,
  ComboboxFilter,
  ComboboxItem,
  ComboboxState,
  UseComboboxReturn,
} from '../combobox/index.js';

// Headless table (ADR 0034 wedge 6) — core is browser-safe
export { createTableCore } from '../table/index.js';
export type {
  CellValueType,
  EditingCell,
  SortDirection,
  SortSpec,
  TableActions,
  TableColumn,
  TableColumnView,
  TableConfig,
  TableRowView,
  TableState,
  UndoCommandLike,
  UndoLike,
  UseTableReturn,
} from '../table/index.js';

// Headless view core (Phase C) — manages view mode + column layout + vantage
export { createViewCore } from '../view/index.js';
export type {
  ViewMode,
  ViewColumn,
  ViewSortSpec,
  ViewState,
  ViewActions,
  ViewConfig,
  UseViewReturn,
} from '../view/index.js';

export {
  RealtimeRoom,
  MemoryHub,
  MemoryRealtimeTransport,
  BroadcastChannelTransport,
  WebSocketRelayTransport,
  DurableObjectRelayTransport,
  joinPresence,
  createPresenceTransport,
  PersistentChannel,
  localStorageChannelStore,
  DEFAULT_MAX_RECORDS,
  RealtimeText,
  REALTIME_PROTOCOL,
} from '../realtime/index.js';
export type {
  BroadcastChannelTransportOptions,
  BroadcastEvent,
  ChannelRecord,
  ChannelStore,
  DurableObjectRelayReconnect,
  DurableObjectRelayTransportOptions,
  PersistentChannelOptions,
  PresenceOptions,
  PresencePeer,
  PresenceState,
  RealtimeMessage,
  RealtimeRoomOptions,
  RealtimeTransport,
  RealtimeTextOptions,
  TextNode,
  TextOp,
  WebSocketRelayTransportOptions,
} from '../realtime/index.js';
