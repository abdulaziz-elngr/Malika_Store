import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { rateLimit } from "@/server/auth/rate-limit";
import { authorize, ForbiddenError, UnauthenticatedError } from "@/server/auth/rbac";
import { cloudinaryEnabled, signDirectUpload } from "@/server/cloudinary";
import { ACCEPTED, MAX_BYTES } from "@/server/media-rules";

/**
 * Step 1 of a direct upload: validates type/size and returns a signed Cloudinary request.
 * `{ mode: "local" }` means Cloudinary isn't configured (local dev) — the client falls back to POST /api/admin/media.
 */
export async function POST(req: Request) {
  try {
    await authorize("media:create");
    if (!(await rateLimit("media-sign", 60, 60_000))) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    const body = (await req.json().catch(() => null)) as { type?: string; size?: number } | null;
    const spec = body?.type ? ACCEPTED[body.type] : undefined;
    if (!spec) return NextResponse.json({ error: "bad_type" }, { status: 415 });
    if (typeof body?.size !== "number" || body.size <= 0 || body.size > MAX_BYTES) return NextResponse.json({ error: "too_large" }, { status: 413 });
    if (!cloudinaryEnabled()) return NextResponse.json({ mode: "local" });

    const stamp = new Date().toISOString().slice(0, 10);
    const params = signDirectUpload({ folder: `malika/${stamp}`, publicId: randomUUID(), kind: spec.kind });
    return NextResponse.json({ mode: "cloud", kind: spec.kind, ...params });
  } catch (err) {
    if (err instanceof UnauthenticatedError || err instanceof ForbiddenError) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    console.error("[media/sign]", err);
    return NextResponse.json({ error: "server" }, { status: 500 });
  }
}
