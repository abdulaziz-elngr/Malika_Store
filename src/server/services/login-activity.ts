import { db } from "@/db/client";
import { loginActivity } from "@/db/schema";
import { requestInfo } from "@/server/auth/request-info";

export async function recordLogin(e: { kind: "admin" | "customer"; email: string; userId?: string | null; success: boolean; reason?: string }) {
  const info = await requestInfo();
  await db.insert(loginActivity).values({ kind: e.kind, email: e.email.slice(0, 160), userId: e.userId ?? null, success: e.success, reason: e.reason ?? null, ...info });
}
