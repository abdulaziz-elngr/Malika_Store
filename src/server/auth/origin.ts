/**
 * CSRF defence for route handlers that change data (server actions already get Next's Origin check).
 * Rejects the request when the browser says it came from another site.
 */
export function isSameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return req.headers.get("sec-fetch-site") !== "cross-site"; // non-browser clients send no Origin
  try {
    return new URL(origin).host === (req.headers.get("x-forwarded-host") ?? req.headers.get("host"));
  } catch {
    return false;
  }
}
