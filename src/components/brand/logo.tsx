import Image from "next/image";
import { cn } from "@/lib/cn";

// The logo files keep the original aspect ratio (569 × 285); only height is set.
const RATIO = 569 / 285;

type LogoProps = { height?: number; className?: string; priority?: boolean };

/** Burgundy logo in light mode, tone-matched cream version in dark mode. Never redrawn. */
export function Logo({ height = 44, className, priority = false }: LogoProps) {
  const width = Math.round(height * RATIO);
  return (
    <span className={cn("inline-flex shrink-0", className)} style={{ width, height }}>
      <Image
        src="/brand/logo.png"
        alt="MALIKA"
        width={width}
        height={height}
        priority={priority}
        className="block h-full w-full object-contain dark:hidden"
      />
      <Image
        src="/brand/logo-cream.png"
        alt="MALIKA"
        width={width}
        height={height}
        priority={priority}
        className="hidden h-full w-full object-contain dark:block"
      />
    </span>
  );
}
