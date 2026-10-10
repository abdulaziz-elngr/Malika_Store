import { createHash } from "node:crypto";

/**
 * Minimal Cloudinary client (signed REST calls, no SDK needed).
 * Env: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
 */
const cloud = () => process.env.CLOUDINARY_CLOUD_NAME ?? "";
const key = () => process.env.CLOUDINARY_API_KEY ?? "";
const secret = () => process.env.CLOUDINARY_API_SECRET ?? "";

export const cloudinaryEnabled = () => !!(cloud() && key() && secret());

const sign = (params: Record<string, string>) => {
  const toSign = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return createHash("sha1").update(toSign + secret()).digest("hex");
};

export async function uploadToCloudinary(file: File, opts: { folder: string; publicId: string; kind: "image" | "video" }): Promise<string> {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signed = { folder: opts.folder, public_id: opts.publicId, timestamp };
  const fd = new FormData();
  fd.set("file", file);
  fd.set("api_key", key());
  fd.set("timestamp", timestamp);
  fd.set("folder", opts.folder);
  fd.set("public_id", opts.publicId);
  fd.set("signature", sign(signed));
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud()}/${opts.kind}/upload`, { method: "POST", body: fd });
  const body = (await res.json().catch(() => ({}))) as { secure_url?: string; error?: { message?: string } };
  if (!res.ok || !body.secure_url) throw new Error(`cloudinary upload failed: ${body.error?.message ?? res.status}`);
  return body.secure_url;
}

/** Best-effort delete from a Cloudinary delivery URL. */
export async function deleteFromCloudinary(url: string): Promise<void> {
  const m = url.match(/^https:\/\/res\.cloudinary\.com\/[^/]+\/(image|video)\/upload\/(?:v\d+\/)?(.+)\.[a-z0-9]+$/i);
  if (!m || !cloudinaryEnabled()) return;
  const [, kind, publicId] = m;
  const timestamp = String(Math.floor(Date.now() / 1000));
  const fd = new FormData();
  fd.set("public_id", publicId);
  fd.set("api_key", key());
  fd.set("timestamp", timestamp);
  fd.set("signature", sign({ public_id: publicId, timestamp }));
  await fetch(`https://api.cloudinary.com/v1_1/${cloud()}/${kind}/destroy`, { method: "POST", body: fd });
}
