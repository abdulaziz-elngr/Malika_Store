import { getTranslations } from "next-intl/server";
import { Logo } from "@/components/brand/logo";
import { Container } from "@/components/ui/container";
import { Link } from "@/i18n/navigation";
import { navItems } from "./nav-items";

export async function Footer() {
  const t = await getTranslations("footer");
  const n = await getTranslations("nav");
  const care = [
    { key: "contact", href: "/contact" },
    { key: "faq", href: "/faq" },
    { key: "privacy", href: "/privacy" },
    { key: "terms", href: "/terms" },
  ] as const;
  const col = "space-y-3 text-sm text-muted";
  const link = "transition-colors hover:text-foreground";

  return (
    <footer className="mt-24 border-t border-line bg-surface">
      <Container className="grid gap-12 py-16 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="max-w-sm space-y-5">
          <Logo height={56} />
          <p className="text-muted">{t("about")}</p>
        </div>
        <div>
          <h2 className="mb-5 text-xs font-medium uppercase tracking-[0.22em] text-accent">{t("explore")}</h2>
          <ul className={col}>
            {navItems.map((i) => (
              <li key={i.key}><Link href={i.href} className={link}>{n(i.key)}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="mb-5 text-xs font-medium uppercase tracking-[0.22em] text-accent">{t("care")}</h2>
          <ul className={col}>
            {care.map((i) => (
              <li key={i.key}><Link href={i.href} className={link}>{t(i.key)}</Link></li>
            ))}
          </ul>
        </div>
      </Container>
      <div className="border-t border-line">
        <Container className="flex flex-col gap-2 py-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} MALIKA. {t("rights")}</span>
          <span>
            {t("madeBy")}{" "}
            <a
              href="https://tecn0-platform.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-foreground underline-offset-4 transition-colors hover:text-accent hover:underline"
            >
              Tecno
            </a>
          </span>
        </Container>
      </div>
    </footer>
  );
}
