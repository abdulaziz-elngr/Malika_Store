"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Heart, Menu, Search, ShoppingBag, User, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Logo } from "@/components/brand/logo";
import { Container } from "@/components/ui/container";
import { useCart } from "@/features/storefront/cart/cart-provider";
import { useWishlist } from "@/features/storefront/wishlist/wishlist-provider";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { LanguageSwitcher } from "./language-switcher";
import { navItems } from "./nav-items";
import { ThemeToggle } from "./theme-toggle";

const iconBtn = "relative grid size-10 place-items-center text-foreground transition-colors hover:text-accent";

function Badge({ n }: { n: number }) {
  if (n < 1) return null;
  return <span aria-hidden className="absolute end-0.5 top-0.5 grid min-w-4 place-items-center rounded-full bg-brand px-1 text-[0.6rem] leading-4 text-brand-contrast">{n > 9 ? "9+" : n}</span>;
}

export function Header() {
  const t = useTranslations("nav");
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const cart = useCart();
  const wishlist = useWishlist();

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
            <Logo height={scrolled ? 36 : 44} priority className="transition-all duration-500 ease-luxe" />
          </Link>

          <nav aria-label={t("primary")} className="hidden lg:block">
            <ul className="flex items-center gap-9">
              {navItems.map((item) => (
                <li key={item.key}>
                  <Link href={item.href} className="group relative py-2 text-[0.8rem] font-medium uppercase tracking-[0.2em]">
                    {t(item.key)}
                    <span className="absolute inset-x-0 -bottom-0.5 h-px origin-start scale-x-0 bg-accent transition-transform duration-500 ease-luxe group-hover:scale-x-100 rtl:origin-right ltr:origin-left" />
                  </Link>
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
            className="fixed inset-0 z-50 flex flex-col bg-background"
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
            <nav aria-label={t("primary")} className="flex flex-1 flex-col justify-center px-8">
              <ul className="space-y-2">
                {navItems.map((item, i) => (
                  <motion.li key={item.key} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.06, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>
                    <Link href={item.href} onClick={() => setOpen(false)} className="block py-1 font-display text-5xl text-brand">
                      {t(item.key)}
                    </Link>
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
