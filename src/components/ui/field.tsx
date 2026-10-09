"use client";

import { useTranslations } from "next-intl";
import { useId } from "react";
import { cn } from "@/lib/cn";

export const inputClass =
  "h-12 w-full border border-line bg-surface px-4 text-base text-foreground outline-none transition-colors placeholder:text-muted/70 focus:border-brand aria-[invalid=true]:border-brand disabled:opacity-60";

/** Translates a validation message key (e.g. "required", "phone") into the active language. */
export function useFieldError() {
  const t = useTranslations("validation");
  return (key?: string) => (key ? (t.has(key as never) ? t(key as never) : t("invalid")) : undefined);
}

type FieldProps = { label: string; error?: string; hint?: string; className?: string; children: (props: { id: string; "aria-invalid": boolean; "aria-describedby"?: string }) => React.ReactNode };

export function Field({ label, error, hint, className, children }: FieldProps) {
  const id = useId();
  const msg = useFieldError()(error);
  const describedBy = msg ? `${id}-err` : hint ? `${id}-hint` : undefined;
  return (
    <div className={cn("space-y-2", className)}>
      <label htmlFor={id} className="block text-[0.72rem] font-medium uppercase tracking-[0.2em] text-accent">{label}</label>
      {children({ id, "aria-invalid": !!msg, "aria-describedby": describedBy })}
      {msg ? <p id={`${id}-err`} role="alert" className="text-sm text-brand">{msg}</p> : hint ? <p id={`${id}-hint`} className="text-sm text-muted">{hint}</p> : null}
    </div>
  );
}

export function FormError({ error }: { error?: string }) {
  const msg = useFieldError()(error);
  if (!msg) return null;
  return <p role="alert" className="border border-brand/40 bg-brand/5 px-4 py-3 text-sm text-brand">{msg}</p>;
}
