import { createHmac, timingSafeEqual } from "node:crypto";

function secret() {
  const s = process.env.AUTH_SECRET;
  if (s && s.length >= 32) return s;
  if (process.env.NODE_ENV === "production") throw new Error("AUTH_SECRET must be set (32+ characters) in production.");
  return "malika-dev-only-secret-do-not-use-in-production!!";
}

/** Throws early (before any order is written) when the signing secret is missing in production. */
export const assertAuthSecret = () => void secret();

/** Signs a short value so it can be trusted when it comes back in a cookie. */
export function sign(value: string) {
  return `${value}.${createHmac("sha256", secret()).update(value).digest("base64url")}`;
}

export function unsign(signed: string | undefined) {
  if (!signed) return null;
  const i = signed.lastIndexOf(".");
  if (i < 1) return null;
  const value = signed.slice(0, i);
  const a = Buffer.from(signed.slice(i + 1));
  const b = Buffer.from(createHmac("sha256", secret()).update(value).digest("base64url"));
  return a.length === b.length && timingSafeEqual(a, b) ? value : null;
}

/** Cookie holding the signed number of the order a guest just placed. */
export const ORDER_COOKIE = "malika_order";
