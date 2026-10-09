export function PageHeader({ eyebrow, title, subtitle }: { eyebrow?: string; title: string; subtitle?: string }) {
  return (
    <header className="max-w-2xl space-y-4">
      {eyebrow && <p className="text-xs font-medium uppercase tracking-[0.3em] text-accent">{eyebrow}</p>}
      <h1 className="font-display text-5xl text-brand sm:text-6xl">{title}</h1>
      {subtitle && <p className="text-muted">{subtitle}</p>}
    </header>
  );
}
