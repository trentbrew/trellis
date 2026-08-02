/**
 * Shared schema — the same field descriptor drives both the table
 * columns and the form fields (one generator, two surfaces). This is
 * the "schema-derived columns from the same generator as forms" story:
 * change the schema, the UI regenerates.
 */

export interface FieldDef {
  name: string;
  label: string;
  valueType: 'text' | 'number' | 'select';
  /** Table presentation only. */
  width?: string | number;
  align?: 'left' | 'center' | 'right';
  /** Form/table editability. */
  editable?: boolean;
  /** select valueType → allowed atoms. */
  options?: string[];
  required?: boolean;
}

export const taskFields: FieldDef[] = [
  { name: 'title', label: 'Title', valueType: 'text', width: '54%', required: true },
  { name: 'status', label: 'Status', valueType: 'select', options: ['todo', 'doing', 'done'] },
  { name: 'priority', label: 'Pri', valueType: 'number', width: 52, align: 'center' },
  { name: 'owner', label: 'Owner', valueType: 'text', width: 88 },
];

/** Field descriptor → table column def (table-core shape). */
export function columnsFromSchema<T>(
  fields: FieldDef[],
): { id: string; accessorKey: string; header: string; type?: 'number'; width?: string | number; align?: string; editable?: boolean }[] {
  return fields.map((f) => ({
    id: f.name,
    accessorKey: f.name,
    header: f.label,
    ...(f.valueType === 'number' ? { type: 'number' as const } : {}),
    width: f.width,
    align: f.align,
    editable: f.editable ?? true,
  }));
}

/** Field descriptor → form field config (forms-wedge shape). */
export function formFieldsFromSchema(fields: FieldDef[]): {
  name: string;
  valueType: 'title' | 'rich_text' | 'number' | 'select' | 'checkbox';
  required: boolean;
  selectOptions?: string[];
}[] {
  return fields.map((f) => ({
    name: f.name,
    valueType:
      f.valueType === 'text' ? ('title' as const) : f.valueType,
    required: f.required ?? false,
    ...(f.valueType === 'select' ? { selectOptions: f.options } : {}),
  }));
}
