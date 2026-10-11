import { MAX_UPLOAD_BYTES } from "./limits";

export type UploadedMedia = { id: string; url: string; name: string; kind: "image" | "video" };
export type UploadResult = { ok: true; media: UploadedMedia } | { ok: false; code: "too_large" | "bad_type" | "rate_limited" | "failed" };

const codeOf = (status: number, code?: string): Extract<UploadResult, { ok: false }>["code"] =>
  status === 413 || code === "too_large" ? "too_large" : status === 415 || code === "bad_type" ? "bad_type" : status === 429 || code === "rate_limited" ? "rate_limited" : "failed";

const json = async <T,>(res: Response) => (await res.json().catch(() => ({}))) as T;

/**
 * Uploads one file. With Cloudinary configured it goes browser → Cloudinary directly (signed by our server),
 * so Vercel's 4.5 MB request-body limit never applies; otherwise it falls back to the multipart route (local dev).
 */
export async function uploadMediaFile(file: File, folder = ""): Promise<UploadResult> {
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false, code: "too_large" };
  try {
    const signRes = await fetch("/api/admin/media/sign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: file.type, size: file.size }),
    });
    const sign = await json<{ mode?: string; error?: string; kind?: "image" | "video"; endpoint?: string; apiKey?: string; timestamp?: string; folder?: string; publicId?: string; signature?: string }>(signRes);
    if (!signRes.ok) return { ok: false, code: codeOf(signRes.status, sign.error) };

    if (sign.mode === "cloud" && sign.endpoint && sign.kind) {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("api_key", sign.apiKey ?? "");
      fd.set("timestamp", sign.timestamp ?? "");
      fd.set("folder", sign.folder ?? "");
      fd.set("public_id", sign.publicId ?? "");
      fd.set("signature", sign.signature ?? "");
      const up = await fetch(sign.endpoint, { method: "POST", body: fd });
      const upBody = await json<{ secure_url?: string }>(up);
      if (!up.ok || !upBody.secure_url) return { ok: false, code: up.status === 413 ? "too_large" : "failed" };

      const rec = await fetch("/api/admin/media/record", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: upBody.secure_url, kind: sign.kind, name: file.name, folder, sizeBytes: file.size }),
      });
      const recBody = await json<{ media?: UploadedMedia; error?: string }>(rec);
      return rec.ok && recBody.media ? { ok: true, media: recBody.media } : { ok: false, code: codeOf(rec.status, recBody.error) };
    }

    const fd = new FormData();
    fd.set("file", file);
    if (folder.trim()) fd.set("folder", folder.trim());
    const res = await fetch("/api/admin/media", { method: "POST", body: fd });
    const body = await json<{ media?: UploadedMedia; error?: string }>(res);
    return res.ok && body.media ? { ok: true, media: body.media } : { ok: false, code: codeOf(res.status, body.error) };
  } catch {
    return { ok: false, code: "failed" };
  }
}
