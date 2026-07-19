// Cursor pagination — one implementation used by every list endpoint. We
// paginate by `createdAt` (or a caller-supplied field) descending, with the
// row's `id` as a tie-breaker so pages are stable when many rows share a
// timestamp. `nextCursor` is opaque to the client — base64url of the
// composite key, so we can change the key later without a wire change.
//
// Why not offset pagination? Offsets get slower as pages grow (Postgres has
// to scan+discard) and skip rows on concurrent inserts. Cursors are O(1)
// and stable.

import { BadRequestException } from '@nestjs/common';

export interface Paginated<T> {
  items: T[];
  nextCursor: string | null;
}

export interface CursorArgs {
  before?: string; // opaque cursor from a previous page
  limit?: string; // string from query — parsed here
}

interface DecodedCursor<K extends string = 'createdAt'> {
  field: K;
  value: string; // ISO date or string
  id: string;
}

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 100;

export function parseLimit(input: string | undefined | null): number {
  if (input == null || input === '') return DEFAULT_LIMIT;
  const n = parseInt(input, 10);
  if (Number.isNaN(n) || n < 1) return DEFAULT_LIMIT;
  return Math.min(n, MAX_LIMIT);
}

export function encodeCursor<K extends string>(c: DecodedCursor<K>): string {
  return Buffer.from(JSON.stringify(c), 'utf8').toString('base64url');
}

export function decodeCursor<K extends string = 'createdAt'>(
  raw: string | undefined | null,
): DecodedCursor<K> | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(
      Buffer.from(raw, 'base64url').toString('utf8'),
    ) as Partial<DecodedCursor<K>>;
    if (!parsed.field || !parsed.value || !parsed.id) {
      throw new Error('Cursor missing fields');
    }
    return parsed as DecodedCursor<K>;
  } catch {
    throw new BadRequestException('Invalid cursor');
  }
}

/**
 * Build the Prisma `where` clause for the next page.
 * Descending by (field, id): the next page contains rows where
 *   (field < cursor.value) OR (field = cursor.value AND id < cursor.id).
 * Postgres can serve this from the (childId, createdAt) indexes we already
 * have without a full scan.
 */
export function cursorWhere<K extends string>(
  cursor: DecodedCursor<K> | null,
  field: K,
): Record<string, unknown> | undefined {
  if (!cursor) return undefined;
  const value =
    field === 'createdAt' || field === 'updatedAt' || field === 'scheduledAt' || field === 'occurredAt' || field === 'loggedAt'
      ? new Date(cursor.value)
      : cursor.value;
  return {
    OR: [
      { [field]: { lt: value } },
      { [field]: value, id: { lt: cursor.id } },
    ],
  };
}

/**
 * Wrap a Prisma findMany that has been queried with `take: limit + 1` so
 * we know if there's another page. Returns the trimmed list + next cursor.
 */
export function makePage<T extends { id: string }, K extends string>(
  rows: T[],
  limit: number,
  field: K,
): Paginated<T> {
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const last = items[items.length - 1];
  const nextCursor =
    hasMore && last
      ? encodeCursor({
          field,
          value:
            (last as unknown as Record<string, unknown>)[field] instanceof Date
              ? ((last as unknown as Record<string, Date>)[field]).toISOString()
              : String((last as unknown as Record<string, unknown>)[field]),
          id: last.id,
        })
      : null;
  return { items, nextCursor };
}
