import { cn } from "@/lib/cn";

export function Card({ className, ...p }: React.ComponentProps<"section">) {
  return <section className={cn("border border-line bg-surface", className)} {...p} />;
}

export function CardHeader({ title, action, id, className }: { title: string; action?: React.ReactNode; id?: string; className?: string }) {
  return (
    <header className={cn("flex min-h-14 items-center justify-between gap-3 border-b border-line px-5", className)}>
      <h2 id={id} className="text-[0.72rem] font-medium uppercase tracking-[0.22em] text-accent">{title}</h2>
      {action}
    </header>
  );
}

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="space-y-2">
        {eyebrow && <p className="text-[0.72rem] uppercase tracking-[0.3em] text-accent">{eyebrow}</p>}
        <h1 className="font-display text-4xl text-brand sm:text-5xl">{title}</h1>
        {description && <p className="max-w-2xl text-muted">{description}</p>}
      </div>
      {actions}
    </header>
  );
}

const tones = {
  neutral: "border-line text-muted",
  brand: "border-brand/40 bg-brand/5 text-brand",
  sage: "border-sage-500/50 bg-sage-200/40 text-sage-700 dark:bg-sage-700/20 dark:text-sage-200",
  copper: "border-copper-500/50 bg-copper-200/40 text-copper-700 dark:bg-copper-700/20 dark:text-copper-300",
} as const;
export type BadgeTone = keyof typeof tones;

export function Badge({ tone = "neutral", className, ...p }: React.ComponentProps<"span"> & { tone?: BadgeTone }) {
  return <span className={cn("inline-flex items-center whitespace-nowrap border px-2 py-0.5 text-xs", tones[tone], className)} {...p} />;
}

export function EmptyState({ icon, title, body, action }: { icon?: React.ReactNode; title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="grid justify-items-center gap-3 px-6 py-14 text-center">
      {icon && <div className="text-accent" aria-hidden>{icon}</div>}
      <p className="font-display text-2xl text-brand">{title}</p>
      {body && <p className="max-w-sm text-sm text-muted">{body}</p>}
      {action}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse bg-line/60 motion-reduce:animate-none", className)} />;
}

/** Responsive table wrapper: scrolls inside its own box instead of the page. */
export function TableWrap({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("overflow-x-auto", className)}><table className="w-full min-w-[34rem] text-sm">{children}</table></div>;
}
export const Th = ({ className, ...p }: React.ComponentProps<"th">) => <th scope="col" className={cn("px-5 py-3 text-start text-xs font-medium uppercase tracking-[0.14em] text-muted", className)} {...p} />;
export const Td = ({ className, ...p }: React.ComponentProps<"td">) => <td className={cn("px-5 py-3 align-middle", className)} {...p} />;
