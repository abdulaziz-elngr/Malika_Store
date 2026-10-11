"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Heart, Menu, Search, ShoppingBag, User, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Logo } from "@/components/brand/logo";
import { Container } from "@/components/ui/container";
import { useCart } from "@/features/storefront/cart/cart-provider";
import { useWishlist } from "@/features/storefront/wishlist/wishlist-provider";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import type { HeaderLink } from "@/lib/header-nav";
import { LanguageSwitcher } from "./language-switcher";
import { navItems } from "./nav-items";
import { ThemeToggle } from "./theme-toggle";

const iconBtn = "relative grid size-10 place-items-center text-foreground transition-colors hover:text-accent";

function Badge({ n }: { n: number }) {
  if (n < 1) return null;
  return <span aria-hidden className="absolute end-0.5 top-0.5 grid min-w-4 place-items-center rounded-full bg-brand px-1 text-[0.6rem] leading-4 text-brand-contrast">{n > 9 ? "9+" : n}</span>;
}

export type { HeaderLink } from "@/lib/header-nav";

/**
 * Menu items (labels already resolved server-side) fall back to the brand's default navigation.
 * Audience entries carry groups (categories, collections) that open as a dropdown on desktop and expand in the mobile menu.
 */
export function Header({ items, viewAllLabel }: { items?: HeaderLink[]; viewAllLabel?: string }) {
  const t = useTranslations("nav");
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const cart = useCart();
  const wishlist = useWishlist();
  const links: HeaderLink[] = items?.length ? items : navItems.map((i) => ({ id: i.key, href: i.href, label: t(i.key) }));

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-40 border-b transition-[background,border-color,backdrop-filter] duration-500 ease-luxe",
          scrolled ? "border-line bg-background/85 backdrop-blur-md" : "border-transparent bg-background",
        )}
      >
        <Container className={cn("flex items-center justify-between transition-[height] duration-500 ease-luxe", scrolled ? "h-16" : "h-20")}>
          <button type="button" className={cn(iconBtn, "lg:hidden")} onClick={() => setOpen(true)} aria-label={t("openMenu")} aria-expanded={open}>
            <Menu size={22} strokeWidth={1.4} />
          </button>

          <Link href="/" aria-label="MALIKA" className="max-lg:absolute max-lg:start-1/2 max-lg:-translate-x-1/2 rtl:max-lg:translate-x-1/2">
            <Logo height={scrolled ? 48 : 64}  priority className="transition-all duration-500 ease-luxe" />
          </Link>

          <nav aria-label={t("primary")} className="hidden lg:block">
            <ul className="flex items-center gap-9">
              {links.map((item) => (
                <li key={item.id} className="group/menu relative">
                  <Link href={item.href} className="group relative inline-flex items-center gap-1 py-2 text-[0.8rem] font-medium uppercase tracking-[0.2em]">
                    {item.label}
                    {item.groups && <ChevronDown size={12} strokeWidth={1.6} aria-hidden className="transition-transform duration-300 group-hover/menu:rotate-180 group-focus-within/menu:rotate-180" />}
                    <span className="absolute inset-x-0 -bottom-0.5 h-px origin-start scale-x-0 bg-accent transition-transform duration-500 ease-luxe group-hover:scale-x-100 rtl:origin-right ltr:origin-left" />
                  </Link>
                  {item.groups && (
                    <div className="invisible absolute start-1/2 top-full z-50 -translate-x-1/2 pt-3 opacity-0 transition-[opacity,visibility] duration-300 group-hover/menu:visible group-hover/menu:opacity-100 group-focus-within/menu:visible group-focus-within/menu:opacity-100 rtl:translate-x-1/2">
                      <div className="flex min-w-56 gap-10 border border-line bg-background p-6 shadow-soft">
                        {item.groups.map((g) => (
                          <div key={g.id} className="min-w-36 space-y-3">
                            <p className="text-[0.68rem] font-medium uppercase tracking-[0.22em] text-accent">{g.title}</p>
                            <ul className="space-y-2">
                              {g.links.map((l) => (
                                <li key={l.id}>
                                  <Link href={l.href} className="block whitespace-nowrap text-sm normal-case tracking-normal text-foreground transition-colors hover:text-accent">{l.label}</Link>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                        {viewAllLabel && (
                          <Link href={item.href} className="self-end whitespace-nowrap border-b border-accent pb-0.5 text-xs uppercase tracking-[0.2em] text-brand transition-colors hover:text-accent">{viewAllLabel}</Link>
                        )}
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex items-center">
            <LanguageSwitcher className="hidden sm:flex me-2" />
            <ThemeToggle />
            <Link href="/search" aria-label={t("search")} className={iconBtn}><Search size={19} strokeWidth={1.4} /></Link>
            <Link href="/account" aria-label={t("account")} className={cn(iconBtn, "hidden lg:grid")}><User size={19} strokeWidth={1.4} /></Link>
            <Link href="/account/wishlist" aria-label={wishlist.count ? t("wishlistCount", { count: wishlist.count }) : t("wishlist")} className={cn(iconBtn, "hidden lg:grid")}><Heart size={19} strokeWidth={1.4} /><Badge n={wishlist.count} /></Link>
            <button type="button" onClick={cart.open} aria-haspopup="dialog" aria-label={cart.count ? t("cartCount", { count: cart.count }) : t("cart")} className={iconBtn}><ShoppingBag size={19} strokeWidth={1.4} /><Badge n={cart.count} /></button>
          </div>
        </Container>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={t("primary")}
            className="fixed inset-0 z-50 flex h-dvh flex-col bg-background"
            initial={{ opacity: 0, clipPath: "inset(0 0 100% 0)" }}
            animate={{ opacity: 1, clipPath: "inset(0 0 0% 0)" }}
            exit={{ opacity: 0, clipPath: "inset(0 0 100% 0)" }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <Container className="flex h-20 items-center justify-between">
              <button type="button" className={iconBtn} onClick={() => setOpen(false)} aria-label={t("closeMenu")}>
                <X size={22} strokeWidth={1.4} />
              </button>
              <Logo height={40} />
              <span className="size-10" aria-hidden />
            </Container>
            <nav aria-label={t("primary")} className="flex flex-1 flex-col overflow-y-auto px-8 py-4 [justify-content:safe_center]">
              <ul className="space-y-2">
                {links.map((item, i) => (
                  <motion.li key={item.id} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.06, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>
                    <div className="flex items-center justify-between gap-4">
                      <Link href={item.href} onClick={() => setOpen(false)} className="block py-1 font-display text-4xl text-brand sm:text-5xl">
                        {item.label}
                      </Link>
                      {item.groups && (
                        <button type="button" onClick={() => setExpanded(expanded === item.id ? null : item.id)} aria-expanded={expanded === item.id} aria-label={item.label} className="grid size-10 shrink-0 place-items-center text-brand">
                          <ChevronDown size={22} strokeWidth={1.4} className={cn("transition-transform duration-300", expanded === item.id && "rotate-180")} />
                        </button>
                      )}
                    </div>
                    {item.groups && expanded === item.id && (
                      <div className="space-y-5 pb-4 ps-1 pt-2">
                        {item.groups.map((g) => (
                          <div key={g.id} className="space-y-2">
                            <p className="text-[0.68rem] font-medium uppercase tracking-[0.22em] text-accent">{g.title}</p>
                            <ul className="space-y-1">
                              {g.links.map((l) => (
                                <li key={l.id}>
                                  <Link href={l.href} onClick={() => setOpen(false)} className="block py-1.5 text-lg text-foreground">{l.label}</Link>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.li>
                ))}
              </ul>
            </nav>
            <div className="flex items-center justify-between border-t border-line px-8 py-6">
              <LanguageSwitcher />
              <div className="flex">
                <Link href="/account" onClick={() => setOpen(false)} aria-label={t("account")} className={iconBtn}><User size={20} strokeWidth={1.4} /></Link>
                <Link href="/account/wishlist" onClick={() => setOpen(false)} aria-label={wishlist.count ? t("wishlistCount", { count: wishlist.count }) : t("wishlist")} className={iconBtn}><Heart size={20} strokeWidth={1.4} /><Badge n={wishlist.count} /></Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
