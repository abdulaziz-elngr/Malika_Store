import Image from "next/image";
import { cn } from "@/lib/cn";

type Tone = "wine" | "copper" | "cream" | "sage";
const tones: Record<Tone, string> = {
  wine: "from-wine-900 via-wine-700 to-wine-500",
  copper: "from-copper-700 via-copper-500 to-copper-300",
  cream: "from-cream-300 via-cream-200 to-cream-100",
  sage: "from-sage-700 via-sage-500 to-sage-200",
};

type Props = { src?: string | null; alt?: string; tone?: Tone; className?: string; sizes?: string; priority?: boolean };

/**
 * Renders a managed image when one exists; otherwise an on-brand tonal panel.
 * Images come from the media library (admin) once it exists, so no stock photography is hardcoded here.
 */
export function ImageSlot({ src, alt = "", tone = "wine", className, sizes = "100vw", priority }: Props) {
  return (
    <div className={cn("relative overflow-hidden bg-gradient-to-br", tones[tone], className)}>
      {src ? (
        <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className="object-cover" />
      ) : (
        <div aria-hidden className="absolute inset-0 opacity-[0.12] mix-blend-overlay [background-image:radial-gradient(circle_at_30%_20%,#fff,transparent_55%)]" />
      )}
    </div>
  );
}
