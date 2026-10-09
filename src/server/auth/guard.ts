import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getCustomer } from "./session";

/** For account pages: returns the signed-in customer or sends the visitor to the login page. */
export async function requireCustomer(next?: string) {
  const c = await getCustomer();
  if (!c) redirect({ href: `/account/login${next ? `?next=${encodeURIComponent(next)}` : ""}`, locale: await getLocale() });
  return c!;
}
