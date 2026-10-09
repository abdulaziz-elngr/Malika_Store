import { and, asc, count, desc, eq, ilike, or } from "drizzle-orm";
import type { Executor } from "@/db/client";
import { db } from "@/db/client";
import { auditLogs } from "@/db/schema";
import { requestInfo } from "@/server/auth/request-info";

export type Actor = { id: string; name: string; roleKey?: string | null };
export type AuditEntry = { action: string; entity: string; entityId?: string | null; summary: string; before?: unknown; after?: unknown };

const SENSITIVE = /password|token|secret|hash|cookie/i;

/** Removes secrets from anything that is about to be stored in the log. */
export function redact(value: unknown, depth = 0): unknown {
  if (value == null || typeof value !== "object" || depth > 4) return value;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.slice(0, 50).map((v) => redact(v, depth + 1));
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, SENSITIVE.test(k) ? "[redacted]" : redact(v, depth + 1)]));
}

/** Keeps only the fields that differ, so the log shows exactly what an admin changed. */
export function changedFields(before: Record<string, unknown>, after: Record<string, unknown>) {
  const b: Record<string, unknown> = {};
  const a: Record<string, unknown> = {};
  for (const k of new Set([...Object.keys(before), ...Object.keys(after)])) {
    if (JSON.stringify(before[k]) !== JSON.stringify(after[k])) {
      b[k] = before[k];
      a[k] = after[k];
    }
  }
  return { before: b, after: a };
}

/**
 * Writes one audit row. Pass the transaction (`tx`) from the surrounding change so the log entry
 * commits or rolls back together with the change it describes.
 */
export async function recordAudit(ex: Executor | null, actor: Actor | null, e: AuditEntry) {
  const info = await requestInfo();
  await (ex ?? db).insert(auditLogs).values({
    userId: actor?.id ?? null,
    userName: actor?.name ?? "system",
    userRole: actor?.roleKey ?? null,
    action: e.action,
    entity: e.entity,
    entityId: e.entityId ?? null,
    summary: e.summary.slice(0, 300),
    before: e.before === undefined ? null : redact(e.before),
    after: e.after === undefined ? null : redact(e.after),
    ip: info.ip,
  });
}

export const AUDIT_PAGE_SIZE = 25;

/** Paged, filterable read of the audit log. `q` matches the summary or the staff name. */
export async function listAuditLogs(f: { q?: string; entity?: string; page: number }) {
  const conds = [];
  const q = f.q?.trim().slice(0, 80);
  if (q) {
    const like = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    conds.push(or(ilike(auditLogs.summary, like), ilike(auditLogs.userName, like)));
  }
  if (f.entity) conds.push(eq(auditLogs.entity, f.entity));
  const where = conds.length ? and(...conds) : undefined;
  const [[{ total } = { total: 0 }], rows, entities] = await Promise.all([
    db.select({ total: count() }).from(auditLogs).where(where),
    db.select().from(auditLogs).where(where).orderBy(desc(auditLogs.createdAt), desc(auditLogs.id)).limit(AUDIT_PAGE_SIZE).offset((f.page - 1) * AUDIT_PAGE_SIZE),
    db.selectDistinct({ entity: auditLogs.entity }).from(auditLogs).orderBy(asc(auditLogs.entity)),
  ]);
  return { rows, total, pages: Math.max(1, Math.ceil(total / AUDIT_PAGE_SIZE)), entities: entities.map((e) => e.entity) };
}
