"use client";

import { useTranslations } from "next-intl";
import { useRef } from "react";
import { Container } from "@/components/ui/container";
import { ImageSlot } from "./image-slot";
import type { SectionOverrides } from "./overrides";
import { SectionHeading } from "./section-heading";

const looks = ["wine", "cream", "copper", "sage", "wine", "cream"] as const;

export function Lookbook({ o }: { o?: SectionOverrides }) {
  const t = useTranslations("lookbook");
  const track = useRef<HTMLDivElement>(null);

  // Native scroll-snap track: keyboard + touch + trackpad work, and the cursor shows DRAG on desktop.
  const drag = useRef({ down: false, x: 0, left: 0 });
  const onDown = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse" || !track.current) return;
    drag.current = { down: true, x: e.clientX, left: track.current.scrollLeft };
    track.current.style.scrollSnapType = "none";
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current.down || !track.current) return;
    track.current.scrollLeft = drag.current.left - (e.clientX - drag.current.x);
  };
  const onUp = () => {
    drag.current.down = false;
    if (track.current) track.current.style.scrollSnapType = "";
  };

  return (
    <section className="overflow-hidden py-24 lg:py-32">
      <Container className="mb-12 flex flex-wrap items-end justify-between gap-4">
        <SectionHeading eyebrow={o?.eyebrow ?? t("eyebrow")} title={o?.title ?? t("title")} />
        <p className="text-sm text-muted">{o?.body ?? t("hint")}</p>
      </Container>
      <div
        ref={track}
        data-cursor="drag"
        role="region"
        aria-label={o?.title ?? t("title")}
        tabIndex={0}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={onUp}
        className="flex cursor-grab snap-x snap-mandatory gap-5 overflow-x-auto px-5 pb-4 [scrollbar-width:none] active:cursor-grabbing sm:px-8 lg:px-12 [&::-webkit-scrollbar]:hidden"
      >
        {looks.map((tone, i) => (
          <figure key={i} className="w-[72vw] shrink-0 snap-start select-none sm:w-[38vw] lg:w-[26vw]">
            <ImageSlot tone={tone} className="aspect-[3/4]" sizes="(min-width:1024px) 26vw, 72vw" />
            <figcaption className="pt-3 text-xs uppercase tracking-[0.25em] text-muted">
              {t("look")} {String(i + 1).padStart(2, "0")}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
