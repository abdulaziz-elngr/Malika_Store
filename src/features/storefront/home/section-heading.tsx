import { Reveal, TextReveal } from "@/components/motion/reveal";
import { cn } from "@/lib/cn";

export function SectionHeading({ eyebrow, title, className }: { eyebrow: string; title: string; className?: string }) {
  return (
    <div className={cn("space-y-4", className)}>
      <Reveal><p className="text-xs font-medium uppercase tracking-[0.3em] text-accent">{eyebrow}</p></Reveal>
      <h2 className="font-display text-4xl text-brand sm:text-5xl lg:text-6xl"><TextReveal text={title} /></h2>
    </div>
  );
}
