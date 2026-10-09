import { defineRouting } from "next-intl/routing";

export const locales = ["ar", "en"] as const;
export type Locale = (typeof locales)[number];

export const routing = defineRouting({
  locales,
  defaultLocale: "ar",
  // The chosen locale is persisted in the NEXT_LOCALE cookie by next-intl.
  localeCookie: { maxAge: 60 * 60 * 24 * 365 },
});

export const localeDir = (locale: string): "rtl" | "ltr" => (locale === "ar" ? "rtl" : "ltr");
