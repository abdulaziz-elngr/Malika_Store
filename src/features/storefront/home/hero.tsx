"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Magnetic } from "@/components/motion/magnetic";
import { TextReveal } from "@/components/motion/reveal";
import { buttonClasses } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { ImageSlot } from "./image-slot";

export type HeroConfig = {
  desktopImage?: string | null;
  mobileImage?: string | null;
  videoUrl?: string | null;
  overlay?: number; // 0–0.8
  align?: "start" | "center" | "end";
  height?: "full" | "tall";
  badge?: boolean;
  countdownTo?: string | null; // ISO date; hidden when empty or passed
  ctaHref?: string;
  secondaryHref?: string;
};

function useCountdown(iso?: string | null) {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    if (!iso) return;
    const end = new Date(iso).getTime();
    const tick = () => setLeft(Math.max(0, end - Date.now()));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [iso]);
  return left;
}

export function Hero({ config = {} }: { config?: HeroConfig }) {
  const t = useTranslations("hero");
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "18%"]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.08]);
  const left = useCountdown(config.countdownTo);
  const { overlay = 0.35, align = "start", height = "full" } = config;

  const parts =
    left && left > 0
      ? ([
          [Math.floor(left / 864e5), t("countdown.days")],
          [Math.floor((left / 36e5) % 24), t("countdown.hours")],
          [Math.floor((left / 6e4) % 60), t("countdown.minutes")],
          [Math.floor((left / 1e3) % 60), t("countdown.seconds")],
        ] as const)
      : null;

  return (
    <section ref={ref} className={cn("relative isolate overflow-hidden text-cream-50", height === "full" ? "min-h-[calc(100dvh-5rem)]" : "min-h-[80dvh]")}>
      <motion.div style={{ y, scale }} className="absolute inset-0 -z-20">
        {config.videoUrl ? (
          <video className="size-full object-cover" src={config.videoUrl} autoPlay muted loop playsInline aria-hidden />
        ) : (
          <>
            <ImageSlot src={config.desktopImage} tone="wine" className="hidden size-full md:block" priority />
            <ImageSlot src={config.mobileImage ?? config.desktopImage} tone="wine" className="size-full md:hidden" priority />
          </>
        )}
      </motion.div>
      <div aria-hidden className="absolute inset-0 -z-10 bg-wine-950" style={{ opacity: overlay }} />
      <div aria-hidden className="absolute inset-x-0 bottom-0 -z-10 h-1/2 bg-gradient-to-t from-wine-950/70 to-transparent" />

      <div className={cn("mx-auto flex min-h-[inherit] w-full max-w-[90rem] flex-col justify-end gap-8 px-5 pb-16 pt-32 sm:px-8 lg:px-12 lg:pb-24", align === "center" && "items-center text-center", align === "end" && "items-end text-end")}>
        {config.badge !== false && (
          <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9, duration: 1 }} className="inline-flex w-fit items-center gap-3 border border-copper-300/60 px-4 py-1.5 text-[0.7rem] uppercase tracking-[0.28em] text-copper-200">
            <span aria-hidden className="size-1.5 rounded-full bg-copper-300" />
            {t("badge")}
          </motion.span>
        )}
        <div className="max-w-4xl space-y-6">
          <p className="text-xs uppercase tracking-[0.35em] text-copper-200">{t("eyebrow")}</p>
          <h1 className="font-display text-6xl leading-[0.95] sm:text-7xl lg:text-8xl xl:text-9xl">
            <TextReveal text={t("title")} delay={0.5} />
          </h1>
          <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.1, duration: 0.9 }} className="max-w-xl text-base text-cream-100/90 sm:text-lg">
            {t("subtitle")}
          </motion.p>
        </div>

        {parts && (
          <dl className="flex gap-6" dir="ltr">
            {parts.map(([n, label]) => (
              <div key={label} className="text-center">
                <dt className="sr-only">{label}</dt>
                <dd className="font-display text-4xl tabular-nums">{String(n).padStart(2, "0")}</dd>
                <p aria-hidden className="text-[0.62rem] uppercase tracking-[0.25em] text-copper-200">{label}</p>
              </div>
            ))}
          </dl>
        )}

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.3, duration: 0.9 }} className="flex flex-wrap gap-4">
          <Magnetic>
            <Link href={config.ctaHref ?? "/shop"} className={buttonClasses("primary", "border-cream-50 bg-cream-50 text-wine-900")}>{t("cta")}</Link>
          </Magnetic>
          <Magnetic>
            <Link href={config.secondaryHref ?? "/collections"} className={buttonClasses("secondary", "border-cream-50 text-cream-50 hover:bg-cream-50 hover:text-wine-900")}>{t("secondary")}</Link>
          </Magnetic>
        </motion.div>
      </div>
    </section>
  );
}
