import { headers } from "next/headers";

/** IP and user agent of the current request; empty outside a request (scripts, seeding). */
export async function requestInfo() {
  try {
    const h = await headers();
    return { ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? null, userAgent: h.get("user-agent")?.slice(0, 200) ?? null };
  } catch {
    return { ip: null, userAgent: null };
  }
}
