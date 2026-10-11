import { NextResponse } from "next/server";
import { rateLimit } from "@/server/auth/rate-limit";
import { authorize, ForbiddenError, UnauthenticatedError } from "@/server/auth/rbac";
import { isOwnCloudinaryUrl } from "@/server/cloudinary";
import { MAX_BYTES, cleanFolder, cleanName } from "@/server/media-rules";
import { recordMedia } from "@/server/services/admin-content";

/** Step 2 of a direct upload: the browser finished uploading to Cloudinary, now register the file in the library. */
export async function POST(req: Request) {
  try {
    const admin = await authorize("media:create");
    if (!(await rateLimit("media-record", 60, 60_000))) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    const b = (await req.json().catch(() => null)) as { url?: string; kind?: string; name?: string; folder?: string; sizeBytes?: number } | null;
    const kind = b?.kind === "video" ? "video" : b?.kind === "image" ? "image" : null;
    // Only URLs inside our own Cloudinary cloud/folder are accepted — this endpoint can't be used to register arbitrary links.
    if (!b || !kind || typeof b.url !== "string" || !isOwnCloudinaryUrl(b.url, kind)) return NextResponse.json({ error: "bad_request" }, { status: 400 });
    const size = typeof b.sizeBytes === "number" && b.sizeBytes > 0 && b.sizeBytes <= MAX_BYTES ? Math.round(b.sizeBytes) : null;
    const created = await recordMedia(admin, { url: b.url, name: cleanName(b.name), folder: cleanFolder(b.folder), kind, sizeBytes: size });
    return NextResponse.json({ ok: true, media: { id: created.id, url: created.url, name: created.name, kind: created.kind } });
  } catch (err) {
    if (err instanceof UnauthenticatedError || err instanceof ForbiddenError) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    console.error("[media/record]", err);
    return NextResponse.json({ error: "server" }, { status: 500 });
  }
}
