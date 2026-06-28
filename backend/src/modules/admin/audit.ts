import { query } from '../../config/db';

export interface LogAdminActionInput {
  adminId: string;
  action: string;
  targetType?: string;
  targetId?: string;
  meta?: Record<string, unknown>;
}

/**
 * Records an audit log entry. Per doc security requirement: "admin
 * endpoints require role check + audit log entry on every mutation."
 * Called from every admin controller function that changes state — never
 * from read-only (GET) admin endpoints, since there's nothing to audit
 * about a read.
 */
export async function logAdminAction(input: LogAdminActionInput): Promise<void> {
  await query(
    `INSERT INTO admin_actions (admin_id, action, target_type, target_id, meta)
     VALUES ($1, $2, $3, $4, $5)`,
    [input.adminId, input.action, input.targetType ?? null, input.targetId ?? null, JSON.stringify(input.meta ?? {})]
  );
}
