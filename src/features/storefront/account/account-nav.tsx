"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/cn";

const items = [
  { key: "overview", href: "/account" },
  { key: "orders", href: "/account/orders" },
  { key: "wishlist", href: "/account/wishlist" },
  { key: "addresses", href: "/account/addresses" },
  { key: "profile", href: "/account/profile" },
  { key: "notifications", href: "/account/notifications" },
] as const;

export function AccountNav({ unread, logout }: { unread: number; logout: React.ReactNode }) {
  const t = useTranslations("account");
  const pathname = usePathname();
  const active = (href: string) => (href === "/account" ? pathname === href : pathname.startsWith(href));
  return (
    <nav aria-label={t("navLabel")} className="min-w-0 lg:sticky lg:top-28">
      <ul className="flex gap-1 overflow-x-auto border-b border-line pb-px lg:flex-col lg:gap-0 lg:border-b-0 lg:border-s lg:pb-0">
        {items.map((i) => (
          <li key={i.key} className="shrink-0">
            <Link href={i.href} aria-current={active(i.href) ? "page" : undefined} className={cn("flex items-center gap-2 px-4 py-3 text-sm uppercase tracking-[0.15em] transition-colors lg:-ms-px lg:border-s-2", active(i.href) ? "text-brand lg:border-brand" : "text-muted hover:text-foreground lg:border-transparent")}>
              {t(`nav.${i.key}`)}
              {i.key === "notifications" && unread > 0 && <span className="grid min-w-5 place-items-center rounded-full bg-brand px-1.5 text-[0.65rem] leading-5 text-brand-contrast">{unread}</span>}
            </Link>
          </li>
        ))}
        <li className="shrink-0 lg:mt-4 lg:border-t lg:border-line lg:pt-4">{logout}</li>
      </ul>
    </nav>
  );
}
