export interface PaginationParams {
  cursor?: string;
  limit?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  nextCursor: string | null;
}

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export function parsePagination(query: any): { limit: number; cursor: string | null } {
  let limit = parseInt(query.limit, 10);
  if (!Number.isFinite(limit) || limit <= 0) limit = DEFAULT_LIMIT;
  if (limit > MAX_LIMIT) limit = MAX_LIMIT;
  const cursor = typeof query.cursor === 'string' && query.cursor.length > 0 ? query.cursor : null;
  return { limit, cursor };
}

/** Encodes a cursor as base64 of "createdAt|id" so it's opaque to clients but stable for ORDER BY (created_at, id). */
export function encodeCursor(createdAt: Date | string, id: string): string {
  return Buffer.from(`${new Date(createdAt).toISOString()}|${id}`).toString('base64');
}

export function decodeCursor(cursor: string): { createdAt: string; id: string } | null {
  try {
    const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
    const [createdAt, id] = decoded.split('|');
    if (!createdAt || !id) return null;
    return { createdAt, id };
  } catch {
    return null;
  }
}
