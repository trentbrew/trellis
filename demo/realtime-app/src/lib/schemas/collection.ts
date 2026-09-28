/**
 * Collections demo — named tables (CollectionMeta) + rows (CollectionRecord).
 * These are the kernel's user-collection types (system tier, ADR 0045); the demo
 * adds only its form rules and the lane it tags rows with.
 */
import {
	COLLECTION_META_PREFIX,
	CollectionMeta as KernelCollectionMeta,
	CollectionRecord as KernelCollectionRecord,
	type InferType
} from 'trellis/schema';
import { z } from 'zod';
import { MAIN_LANE, type LaneId } from '$lib/trellis/lane';

export const CollectionMetaType = KernelCollectionMeta;
export const CollectionRecordType = KernelCollectionRecord;

export type CollectionMeta = InferType<typeof CollectionMetaType>;
/**
 * `laneId` isn't part of the kernel row (ADR 0045 open Q5: a lane concern, not
 * row data); the demo still tags rows with it and the open-world graph keeps it.
 */
export type CollectionRecord = InferType<typeof CollectionRecordType> & { laneId?: LaneId };

export const LaneQueryInput = z.object({
	lane: z.string().optional().default(MAIN_LANE)
});

export const ThingQueryInput = z.object({
	id: z.string().min(1),
	lane: z.string().optional().default(MAIN_LANE)
});

export const UpdateCollectionRecordInput = z.object({
	id: z.string().min(1),
	title: z.string().min(1)
});

export const PromoteLaneInput = z.object({
	lane: z.string()
});

export const DiscardLaneInput = z.object({
	lane: z.string()
});

export const COLLECTION_META_QUERY = `SELECT ?e ?title ?slug ?icon ?color ?description ?sortOrder
WHERE {
  [?e "type" "CollectionMeta"]
  [?e "title" ?title]
}`;

export const COLLECTION_RECORDS_QUERY = `SELECT ?e ?title ?collectionId ?body ?sortOrder ?laneId
WHERE {
  [?e "type" "CollectionRecord"]
  [?e "title" ?title]
}`;

export function slugify(title: string): string {
	return title
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');
}

export function fromMetaRow(row: Record<string, unknown>): CollectionMeta {
	const id = String(row['?e'] ?? row.id ?? row.e ?? '');
	return {
		id,
		type: 'CollectionMeta',
		title: String(row.title ?? id),
		slug: row.slug != null ? String(row.slug) : slugify(String(row.title ?? id)),
		icon: row.icon != null ? String(row.icon) : undefined,
		color: row.color != null ? String(row.color) : undefined,
		description: row.description != null ? String(row.description) : undefined,
		sortOrder: typeof row.sortOrder === 'number' ? row.sortOrder : undefined
	};
}

export function fromRecordRow(row: Record<string, unknown>): CollectionRecord {
	const id = String(row['?e'] ?? row.id ?? row.e ?? '');
	return {
		id,
		type: 'CollectionRecord',
		collectionId: String(row.collectionId ?? ''),
		title: String(row.title ?? id),
		body: row.body != null ? String(row.body) : undefined,
		sortOrder: typeof row.sortOrder === 'number' ? row.sortOrder : undefined,
		laneId: row.laneId != null ? (String(row.laneId) as LaneId) : MAIN_LANE
	};
}

export function sortMeta(items: CollectionMeta[]): CollectionMeta[] {
	return [...items].sort((a, b) => {
		const orderA = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
		const orderB = b.sortOrder ?? Number.MAX_SAFE_INTEGER;
		if (orderA !== orderB) return orderA - orderB;
		return a.title.localeCompare(b.title);
	});
}

export function sortRecords(items: CollectionRecord[]): CollectionRecord[] {
	return [...items].sort((a, b) => {
		const orderA = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
		const orderB = b.sortOrder ?? Number.MAX_SAFE_INTEGER;
		if (orderA !== orderB) return orderA - orderB;
		return a.title.localeCompare(b.title);
	});
}

export function recordIdPrefix(): string {
	return 'collectionRecord:';
}

/**
 * Client-side validation for collection record title + body (L2 forms). Form rules
 * are the app's: the kernel type only requires `title` to exist.
 */
const recordFieldsSchema = z.object({
	title: z.string().min(1),
	body: z.string().max(4000).optional()
});

export function validateRecordFields(input: {
	title: string;
	body?: string;
}): { ok: true } | { ok: false; message: string } {
	const parsed = recordFieldsSchema.safeParse({
		title: input.title.trim(),
		body: input.body?.trim() ? input.body.trim() : undefined
	});
	if (parsed.success) return { ok: true };
	const issue = parsed.error.issues[0];
	return { ok: false, message: issue?.message ?? 'Invalid record' };
}

export function metaIdPrefix(): string {
	return COLLECTION_META_PREFIX;
}
