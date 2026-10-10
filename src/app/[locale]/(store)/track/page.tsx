import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { inputClass } from "@/components/ui/field";
import { OrderDetail } from "@/features/storefront/account/order-views";
import type { Locale } from "@/i18n/routing";
import { normalizePhone } from "@/lib/validation/checkout";
import { rateLimit } from "@/server/auth/rate-limit";
import { getOrderForGuest } from "@/server/services/orders";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false } };

export default async function TrackPage({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("orders");
  const sp = await searchParams;
  const number = typeof sp.number === "string" ? sp.number.slice(0, 20) : "";
  const phoneRaw = typeof sp.phone === "string" ? sp.phone.slice(0, 30) : "";
  const phone = normalizePhone(phoneRaw);

  let state: "idle" | "found" | "notFound" | "limited" = "idle";
  let order = null;
  if (number && phoneRaw) {
    if (!(await rateLimit("track", 10, 10 * 60_000))) state = "limited";
    else {
      order = phone ? await getOrderForGuest(number, phone) : null;
      state = order ? "found" : "notFound";
    }
  }

  return (
    <Container className="max-w-4xl py-14 lg:py-20">
      <h1 className="font-display text-5xl text-brand sm:text-6xl">{t("trackTitle")}</h1>
      <p className="mt-3 max-w-xl text-muted">{t("trackIntro")}</p>
      <form method="get" className="mt-10 grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
        <label className="space-y-2"><span className="block text-[0.72rem] font-medium uppercase tracking-[0.2em] text-accent">{t("orderNumber")}</span><input name="number" defaultValue={number} dir="ltr" placeholder="MLK-10291" required className={inputClass} /></label>
        <label className="space-y-2"><span className="block text-[0.72rem] font-medium uppercase tracking-[0.2em] text-accent">{t("phone")}</span><input name="phone" defaultValue={phoneRaw} dir="ltr" inputMode="tel" placeholder="01XXXXXXXXX" required className={inputClass} /></label>
        <Button type="submit">{t("trackButton")}</Button>
      </form>
      {state === "notFound" && <p role="alert" className="mt-8 border border-brand/40 bg-brand/5 px-4 py-3 text-sm text-brand">{t("trackNotFound")}</p>}
      {state === "limited" && <p role="alert" className="mt-8 border border-brand/40 bg-brand/5 px-4 py-3 text-sm text-brand">{t("trackLimited")}</p>}
      {order && <div className="mt-14 border-t border-line pt-14"><OrderDetail order={order} /></div>}
    </Container>
  );
}
