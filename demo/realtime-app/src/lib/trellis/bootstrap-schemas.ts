import { env } from '$env/dynamic/public';
import type { TrellisDb } from 'trellis/client/sdk';
import type { AnyType } from 'trellis/schema';
import { ChatMessageType } from '$lib/schemas/chat';
import { NavItem, NavSection } from '$lib/schemas/nav';

/**
 * Browser → same-origin (Vite proxies /entities, /query, /ontologies, /realtime
 * to the sidecar). Override with PUBLIC_TRELLIS_URL when deployed.
 */
export function trellisClientUrl(): string {
	if (env.PUBLIC_TRELLIS_URL) return env.PUBLIC_TRELLIS_URL;
	if (typeof window !== 'undefined') return '';
	return 'http://localhost:3920';
}

export function byOrder<T extends { order: number }>(a: T, b: T) {
	return a.order - b.order;
}

/**
 * All durable explorer types — register idempotently from the browser on mount.
 * CollectionMeta/CollectionRecord aren't here: they ship with the kernel (ADR 0045).
 */
export const EXPLORER_SCHEMAS: AnyType[] = [NavSection, NavItem, ChatMessageType];

/**
 * Register explorer schemas (idempotent). Graph seed data runs on the sidecar
 * (trellis-serve) — never seed entities from the browser (N tabs = N races).
 */
export async function bootstrapExplorerSchemas(client: TrellisDb): Promise<void> {
	for (const schema of EXPLORER_SCHEMAS) {
		await client.registerType(schema);
	}
}

/** @deprecated Use bootstrapExplorerSchemas */
export const bootstrapGraphNav = bootstrapExplorerSchemas;
