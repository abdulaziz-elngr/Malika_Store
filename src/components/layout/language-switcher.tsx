"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/cn";

export function LanguageSwitcher({ className }: { className?: string }) {
  const locale = useLocale();
  const pathname = usePathname();
  const t = useTranslations("common");

  const item = (code: "ar" | "en", label: string, aria: string) => (
    <Link
      href={pathname}
      locale={code}
      hrefLang={code}
      lang={code}
      aria-label={aria}
      aria-current={locale === code ? "true" : undefined}
      className={cn(
        "px-1 py-2 text-sm tracking-[0.14em] transition-colors",
        locale === code ? "text-brand font-medium" : "text-muted hover:text-foreground",
      )}
    >
      {label}
    </Link>
  );

  return (
    <div className={cn("flex items-center gap-2", className)} role="group" aria-label={t("language")} dir="ltr">
      {item("ar", "AR", t("switchToArabic"))}
      <span aria-hidden className="text-line">|</span>
      {item("en", "EN", t("switchToEnglish"))}
    </div>
  );
}
