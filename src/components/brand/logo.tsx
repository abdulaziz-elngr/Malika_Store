"use client";

import Image from "next/image";
import { cn } from "@/lib/cn";
import { useBrand } from "./brand-provider";

// The built-in logo files keep the original aspect ratio (569 × 285); only height is set.
const RATIO = 569 / 285;

type LogoProps = { height?: number; className?: string; priority?: boolean };

/**
 * The brand logo. Uses the files uploaded in Admin → Appearance when set, otherwise the built-in MALIKA logo
 * (burgundy in light mode, tone-matched cream in dark mode). Uploaded logos are shown as-is, never redrawn.
 */
export function Logo({ height = 44, className, priority = false }: LogoProps) {
  const { logoUrl, logoDarkUrl } = useBrand();

  if (logoUrl) {
    // Custom logo: natural aspect ratio, height-driven. With no dark version the same file is used in both modes.
    const dark = logoDarkUrl || logoUrl;
    const maxWidth = Math.round(height * 5);
    return (
      <span className={cn("inline-flex shrink-0", className)} style={{ height, maxWidth }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoUrl} alt="MALIKA" height={height} className={cn("block h-full w-auto max-w-full object-contain", dark !== logoUrl && "dark:hidden")} />
        {dark !== logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={dark} alt="MALIKA" height={height} className="hidden h-full w-auto max-w-full object-contain dark:block" />
        ) : null}
      </span>
    );
  }

  const width = Math.round(height * RATIO);
  return (
    <span className={cn("inline-flex shrink-0", className)} style={{ width, height }}>
      <Image src="/brand/logo.png" alt="MALIKA" width={width} height={height} priority={priority} className="block h-full w-full object-contain dark:hidden" />
      <Image src="/brand/logo-cream.png" alt="MALIKA" width={width} height={height} priority={priority} className="hidden h-full w-full object-contain dark:block" />
    </span>
  );
}
