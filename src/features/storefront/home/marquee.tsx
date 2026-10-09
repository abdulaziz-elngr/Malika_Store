import { getTranslations } from "next-intl/server";

export async function Marquee({ items: override }: { items?: string[] } = {}) {
  const t = await getTranslations("marquee");
  const items = override?.length ? override : [t("i0"), t("i1"), t("i2"), t("i3")];
  const row = (hidden: boolean) => (
    <ul aria-hidden={hidden} className="flex shrink-0 animate-[marquee_38s_linear_infinite] items-center gap-12 pe-12 motion-reduce:animate-none">
      {items.map((s) => (
        <li key={s} className="flex items-center gap-12 font-display text-3xl text-brand">
          {s}
          <span aria-hidden className="text-accent">✦</span>
        </li>
      ))}
    </ul>
  );
  return (
    <div className="overflow-hidden border-y border-line py-6" dir="ltr">
      <div className="flex w-max">{row(false)}{row(true)}</div>
    </div>
  );
}
