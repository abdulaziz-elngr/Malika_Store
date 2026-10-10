import type { Metadata, Viewport } from "next";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import "@fontsource/cormorant-garamond/400.css";
import "@fontsource/cormorant-garamond/500.css";
import "@fontsource/cormorant-garamond/600.css";
import "@fontsource/amiri/400.css";
import "@fontsource/amiri/700.css";
import "@fontsource-variable/jost";
import "@fontsource/ibm-plex-sans-arabic/300.css";
import "@fontsource/ibm-plex-sans-arabic/400.css";
import "@fontsource/ibm-plex-sans-arabic/500.css";
import "../globals.css";
import { Providers } from "@/components/providers/theme-provider";
import { ToastProvider } from "@/components/ui/toast";
import { localeDir, routing } from "@/i18n/routing";
import { site } from "@/lib/site";
import { BrandProvider } from "@/components/brand/brand-provider";
import { DEFAULT_BRAND, DEFAULT_THEME, getBrandSettings, getThemeSettings, type ThemeMode, type ThemeSettings } from "@/server/services/settings";

const HEX = /^#[0-9a-f]{6}$/i;
const VARS: [keyof ThemeMode, string][] = [
  ["bg", "--bg"], ["surface", "--surface"], ["fg", "--fg"], ["muted", "--muted"],
  ["line", "--line"], ["brand", "--brand"], ["brandContrast", "--brand-contrast"], ["accent", "--accent"],
];

function block(selector: string, mode: Partial<ThemeMode> | undefined, extra = "") {
  const decls = VARS.flatMap(([key, name]) => {
    const v = mode?.[key];
    return typeof v === "string" && HEX.test(v) ? [`${name}:${v}`] : [];
  });
  return decls.length || extra ? `${selector}{${decls.join(";")}${extra}}` : "";
}

/**
 * Turns the admin's saved theme into CSS variable overrides for the storefront.
 * `html:root` / `html.dark` out-rank the defaults in globals.css whatever the stylesheet order.
 * Only strict #rrggbb values are emitted, so nothing else can reach the stylesheet.
 */
function themeToCss(theme: ThemeSettings): string {
  const radius = Number.isFinite(Number(theme.radius)) ? Math.min(32, Math.max(0, Number(theme.radius))) : null;
  return [
    block("html:root", theme.light, radius === null ? "" : `;--radius-brand:${radius}px`),
    block("html.dark", theme.dark),
  ].join("");
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "meta" });
  const brand = await getBrandSettings().catch(() => DEFAULT_BRAND);
  return {
    ...(brand.faviconUrl ? { icons: { icon: brand.faviconUrl, shortcut: brand.faviconUrl, apple: brand.faviconUrl } } : {}),
    metadataBase: new URL(site.url),
    title: t("title"),
    description: t("description"),
    alternates: { languages: { ar: "/ar", en: "/en" } },
    openGraph: { title: t("title"), description: t("description"), locale, siteName: "MALIKA" },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f0e6" },
    { media: "(prefers-color-scheme: dark)", color: "#1b0f0c" },
  ],
};

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("common");
  // Colours saved in Admin → Appearance. If the database is unreachable the built-in MALIKA palette is used.
  const themeCss = themeToCss(await getThemeSettings().catch(() => DEFAULT_THEME));
  const brand = await getBrandSettings().catch(() => DEFAULT_BRAND);

  return (
    <html lang={locale} dir={localeDir(locale)} suppressHydrationWarning>
      <head>{themeCss ? <style id="malika-theme" dangerouslySetInnerHTML={{ __html: themeCss }} /> : null}</head>
      <body className="min-h-dvh">
        <NextIntlClientProvider>
          <Providers>
            <BrandProvider value={{ logoUrl: brand.logoUrl, logoDarkUrl: brand.logoDarkUrl }}>
            <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-[60] focus:bg-brand focus:px-4 focus:py-2 focus:text-brand-contrast">
              {t("skipToContent")}
            </a>
            <ToastProvider dismissLabel={t("dismiss")}>
              {children}
            </ToastProvider>
            </BrandProvider>
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
