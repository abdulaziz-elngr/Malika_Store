import { cn } from "@/lib/cn";

const variants = {
  primary: "bg-brand text-brand-contrast hover:opacity-90 border border-brand",
  secondary: "border border-brand text-brand hover:bg-brand hover:text-brand-contrast",
  ghost: "border border-transparent text-foreground hover:border-line",
} as const;

export type ButtonVariant = keyof typeof variants;

export const buttonClasses = (variant: ButtonVariant = "primary", className?: string) =>
  cn(
    "inline-flex min-h-12 items-center justify-center gap-2 px-8 text-sm font-medium uppercase tracking-[0.18em]",
    "rounded-brand transition-[background,color,opacity] duration-300 ease-luxe disabled:opacity-50",
    variants[variant],
    className,
  );

type ButtonProps = React.ComponentProps<"button"> & { variant?: ButtonVariant };

export function Button({ variant = "primary", className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={buttonClasses(variant, className)} {...props} />;
}
