"use client";

import { ArrowDown, ArrowUp, ImageIcon, Plus, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useActionState, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormError, inputClass, useFieldError } from "@/components/ui/field";
import { useRouter } from "@/i18n/navigation";
import { saveProductAction } from "@/server/actions/admin-catalog";
import type { ActionState } from "@/server/actions/types";
import type { ProductAdmin } from "@/server/services/admin-catalog";

const TONES = ["wine", "copper", "cream", "sage"] as const;
const STATUSES = ["draft", "published", "archived"] as const;

type ImageRow = { id?: string; url: string; tone: string; altAr: string; altEn: string; colorHex: string | null };
type VariantRow = { id?: string; sku: string; size: string; colorNameAr: string; colorNameEn: string; colorHex: string; price: string; stock: string };

const blankImage = (): ImageRow => ({ url: "", tone: "wine", altAr: "", altEn: "", colorHex: "#67251b" });
const blankVariant = (): VariantRow => ({ sku: "", size: "", colorNameAr: "", colorNameEn: "", colorHex: "#67251b", price: "", stock: "0" });
const egp = (minor: number | null | undefined) => (minor == null ? "" : String(minor / 100));

type Option = { id: string; nameEn: string; nameAr: string };

export function ProductForm({ product, categories, collections, audiences }: { product: ProductAdmin | null; categories: Option[]; collections: Option[]; audiences: { slug: string; nameEn: string; nameAr: string }[] }) {
  const locale = useLocale();
  const t = useTranslations("admin.products");
  const f = useTranslations("admin.form");
  const ferr = useFieldError();
  const router = useRouter();
  const [state, action, pending] = useActionState(saveProductAction, {} as ActionState);

  const [images, setImages] = useState<ImageRow[]>(() => product?.images.map((i) => ({ id: i.id, url: i.url ?? "", tone: i.tone, altAr: i.altAr ?? "", altEn: i.altEn ?? "", colorHex: i.colorHex })) ?? []);
  const [variants, setVariants] = useState<VariantRow[]>(
    () =>
      product?.variants.map((v) => ({ id: v.id, sku: v.sku, size: v.size, colorNameAr: v.colorNameAr, colorNameEn: v.colorNameEn, colorHex: v.colorHex, price: egp(v.priceMinor), stock: String(v.stock) })) ??
      [blankVariant()],
  );
  const [tagsText, setTagsText] = useState((product?.tags ?? []).join(", "));
  const [featured, setFeatured] = useState(product?.featured ?? false);
  const [isNew, setIsNew] = useState(product?.isNew ?? false);
  const [bestSeller, setBestSeller] = useState(product?.bestSeller ?? false);
  const [selectedCollections, setSelectedCollections] = useState<string[]>(() => product?.collections.map((c) => c.collectionId) ?? []);

  useEffect(() => {
    if (!state.ok) return;
    if (product) router.refresh();
    else if (state.id) router.push(`/admin/products/${state.id}`);
    else router.push("/admin/products");
  }, [state, product, router]);

  // State → wire format. Money is entered in EGP and stored in piastres; empty means "no override".
  const variantsJson = useMemo(
    () =>
      JSON.stringify(
        variants.map((v) => {
          const price = v.price.trim() === "" ? null : Math.round(Number(v.price.replace(/[^\d.]/g, "")) * 100);
          return { id: v.id, sku: v.sku, size: v.size, colorNameAr: v.colorNameAr, colorNameEn: v.colorNameEn, colorHex: v.colorHex, priceMinor: Number.isFinite(price as number) ? price : null, stock: Math.max(0, Math.min(99_999, Math.floor(Number(v.stock) || 0))) };
        }),
      ),
    [variants],
  );
  const imagesJson = useMemo(() => JSON.stringify(images), [images]);
  const tagsJson = useMemo(() => JSON.stringify(tagsText.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 20)), [tagsText]);
  const collectionIdsJson = useMemo(() => JSON.stringify(selectedCollections), [selectedCollections]);

  const move = <T,>(rows: T[], i: number, dir: -1 | 1): T[] => {
    const j = i + dir;
    if (j < 0 || j >= rows.length) return rows;
    const next = rows.slice();
    [next[i], next[j]] = [next[j]!, next[i]!];
    return next;
  };
  const patch = <T,>(rows: T[], i: number, part: Partial<T>): T[] => rows.map((r, k) => (k === i ? { ...r, ...part } : r));

  const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  const flagBtn = (on: boolean) => `border px-3 py-1.5 text-xs transition-colors ${on ? "border-brand bg-brand text-brand-contrast" : "border-line text-muted hover:border-accent"}`;

  return (
    <form action={action} className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_20rem]" noValidate aria-busy={pending}>
      <input type="hidden" name="id" value={product?.id ?? ""} />
      <input type="hidden" name="images" value={imagesJson} />
      <input type="hidden" name="variants" value={variantsJson} />
      <input type="hidden" name="tags" value={tagsJson} />
      <input type="hidden" name="collectionIds" value={collectionIdsJson} />
      <input type="hidden" name="featured" value={String(featured)} />
      <input type="hidden" name="isNew" value={String(isNew)} />
      <input type="hidden" name="bestSeller" value={String(bestSeller)} />

      <div className="space-y-8">
        <FormError error={state.errors?.form} />

        <section className="border border-line bg-surface">
          <header className="border-b border-line px-5 py-3 text-xs uppercase tracking-[0.2em] text-accent">{t("sections.identity")}</header>
          <div className="space-y-5 p-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label={f("nameAr")} error={state.errors?.nameAr}>
                {(p) => <input {...p} name="nameAr" defaultValue={product?.nameAr} maxLength={160} required className={inputClass} />}
              </Field>
              <Field label={f("nameEn")} error={state.errors?.nameEn}>
                {(p) => <input {...p} name="nameEn" dir="ltr" defaultValue={product?.nameEn} maxLength={160} required className={inputClass} />}
              </Field>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label={t("sku")} error={state.errors?.sku}>
                {(p) => <input {...p} name="sku" dir="ltr" defaultValue={product?.sku} maxLength={60} placeholder="MLK-DRS-001" required className={inputClass} />}
              </Field>
              <Field label={t("slug")} hint={t("slugHint")} error={state.errors?.slug}>
                {(p) => <input {...p} name="slug" dir="ltr" defaultValue={product?.slug} maxLength={90} placeholder="velvet-slip-dress" className={inputClass} />}
              </Field>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label={t("gender")} error={state.errors?.gender}>
                {(p) => (
                  <select {...p} name="gender" defaultValue={product?.gender ?? "women"} className={inputClass}>
                    {audiences.map((g) => (
                      <option key={g.slug} value={g.slug}>
                        {locale === "ar" ? g.nameAr : g.nameEn}
                      </option>
                    ))}
                  </select>
                )}
              </Field>
              <Field label={t("category")} error={state.errors?.categoryId}>
                {(p) => (
                  <select {...p} name="categoryId" defaultValue={product?.categoryId ?? ""} className={inputClass}>
                    <option value="">{t("noCategory")}</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nameEn}
                      </option>
                    ))}
                  </select>
                )}
              </Field>
            </div>
          </div>
        </section>

        <section className="border border-line bg-surface">
          <header className="border-b border-line px-5 py-3 text-xs uppercase tracking-[0.2em] text-accent">{t("sections.story")}</header>
          <div className="space-y-5 p-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label={t("shortAr")} error={state.errors?.shortAr}>
                {(p) => <textarea {...p} name="shortAr" defaultValue={product?.shortAr ?? ""} maxLength={300} rows={2} className={`${inputClass} h-auto py-3`} />}
              </Field>
              <Field label={t("shortEn")} error={state.errors?.shortEn}>
                {(p) => <textarea {...p} name="shortEn" dir="ltr" defaultValue={product?.shortEn ?? ""} maxLength={300} rows={2} className={`${inputClass} h-auto py-3`} />}
              </Field>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label={t("descriptionAr")} error={state.errors?.descriptionAr}>
                {(p) => <textarea {...p} name="descriptionAr" defaultValue={product?.descriptionAr ?? ""} maxLength={5000} rows={7} className={`${inputClass} h-auto py-3`} />}
              </Field>
              <Field label={t("descriptionEn")} error={state.errors?.descriptionEn}>
                {(p) => <textarea {...p} name="descriptionEn" dir="ltr" defaultValue={product?.descriptionEn ?? ""} maxLength={5000} rows={7} className={`${inputClass} h-auto py-3`} />}
              </Field>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label={t("materialsAr")} error={state.errors?.materialsAr}>
                {(p) => <textarea {...p} name="materialsAr" defaultValue={product?.materialsAr ?? ""} maxLength={600} rows={2} className={`${inputClass} h-auto py-3`} />}
              </Field>
              <Field label={t("materialsEn")} error={state.errors?.materialsEn}>
                {(p) => <textarea {...p} name="materialsEn" dir="ltr" defaultValue={product?.materialsEn ?? ""} maxLength={600} rows={2} className={`${inputClass} h-auto py-3`} />}
              </Field>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label={t("careAr")} error={state.errors?.careAr}>
                {(p) => <textarea {...p} name="careAr" defaultValue={product?.careAr ?? ""} maxLength={600} rows={2} className={`${inputClass} h-auto py-3`} />}
              </Field>
              <Field label={t("careEn")} error={state.errors?.careEn}>
                {(p) => <textarea {...p} name="careEn" dir="ltr" defaultValue={product?.careEn ?? ""} maxLength={600} rows={2} className={`${inputClass} h-auto py-3`} />}
              </Field>
            </div>
          </div>
        </section>

        <section className="border border-line bg-surface">
          <header className="border-b border-line px-5 py-3 text-xs uppercase tracking-[0.2em] text-accent">{t("sections.pricing")}</header>
          <div className="space-y-5 p-5">
            <div className="grid gap-5 sm:grid-cols-3">
              <Field label={t("price")} hint={t("egpHint")} error={state.errors?.priceMinor}>
                {(p) => <input {...p} name="priceMinor" dir="ltr" inputMode="decimal" defaultValue={egp(product?.priceMinor)} placeholder="1850" required className={inputClass} />}
              </Field>
              <Field label={t("salePrice")} hint={t("saleHint")} error={state.errors?.salePriceMinor}>
                {(p) => <input {...p} name="salePriceMinor" dir="ltr" inputMode="decimal" defaultValue={egp(product?.salePriceMinor)} placeholder="—" className={inputClass} />}
              </Field>
              <Field label={t("cost")} hint={t("costHint")} error={state.errors?.costMinor}>
                {(p) => <input {...p} name="costMinor" dir="ltr" inputMode="decimal" defaultValue={egp(product?.costMinor)} placeholder="—" className={inputClass} />}
              </Field>
            </div>
            <div className="grid items-end gap-5 sm:grid-cols-3">
              <Field label={t("weight")} error={state.errors?.weightGrams}>
                {(p) => <input {...p} name="weightGrams" dir="ltr" inputMode="numeric" defaultValue={product?.weightGrams ?? ""} placeholder="650" className={inputClass} />}
              </Field>
              <Field label={t("tags")} hint={t("tagsHint")} error={state.errors?.tags}>
                {(p) => <input {...p} name="tagsText" dir="auto" value={tagsText} onChange={(e) => setTagsText(e.target.value)} placeholder={t("tagsPlaceholder")} className={inputClass} />}
              </Field>
              <Field label={t("videoUrl")} error={state.errors?.videoUrl}>
                {(p) => <input {...p} name="videoUrl" dir="ltr" defaultValue={product?.videoUrl ?? ""} maxLength={300} placeholder="/uploads/video.mp4" className={inputClass} />}
              </Field>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setFeatured((v) => !v)} aria-pressed={featured} className={flagBtn(featured)}>
                {t("flags.featured")}
              </button>
              <button type="button" onClick={() => setIsNew((v) => !v)} aria-pressed={isNew} className={flagBtn(isNew)}>
                {t("flags.isNew")}
              </button>
              <button type="button" onClick={() => setBestSeller((v) => !v)} aria-pressed={bestSeller} className={flagBtn(bestSeller)}>
                {t("flags.bestSeller")}
              </button>
            </div>
          </div>
        </section>

        <section className="border border-line bg-surface">
          <header className="flex items-center justify-between border-b border-line px-5 py-3">
            <span className="text-xs uppercase tracking-[0.2em] text-accent">{t("sections.images")}</span>
            <button type="button" onClick={() => setImages((rows) => [...rows, blankImage()])} className="flex items-center gap-1.5 border border-line px-3 py-1 text-xs text-muted hover:border-accent hover:text-foreground">
              <Plus size={13} /> {t("addImage")}
            </button>
          </header>
          <div className="space-y-4 p-5">
            <p className="text-sm text-muted">{t("imagesHint")}</p>
            {state.errors?.images ? (
              <p role="alert" className="border border-brand/40 bg-brand/5 px-4 py-3 text-sm text-brand">
                {ferr(state.errors.images)}
              </p>
            ) : null}
            {images.length === 0 ? (
              <p className="border border-dashed border-line p-6 text-center text-sm text-muted">{t("noImages")}</p>
            ) : (
              <ul className="space-y-4">
                {images.map((im, i) => (
                  <li key={im.id ?? i} className="grid gap-4 border border-line p-4 lg:grid-cols-[8rem_minmax(0,1fr)_auto]">
                    <div className="grid size-32 place-items-center overflow-hidden border border-line" style={{ background: im.colorHex ?? "#67251b" }} aria-hidden>
                      {im.url ? (
                        // eslint-disable-next-line @next/next/no-img-element -- admin previews arbitrary stored URLs
                        <img src={im.url} alt="" className="size-full object-cover" />
                      ) : (
                        <ImageIcon size={22} strokeWidth={1.2} className="text-brand-contrast opacity-70" />
                      )}
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label={t("imageUrl")} error={undefined} className="sm:col-span-2">
                        {(p) => <input {...p} dir="ltr" value={im.url} onChange={(e) => setImages((rows) => patch(rows, i, { url: e.target.value }))} maxLength={500} placeholder="/uploads/…" className={inputClass} />}
                      </Field>
                      <Field label={t("altAr")} error={undefined}>
                        {(p) => <input {...p} value={im.altAr} onChange={(e) => setImages((rows) => patch(rows, i, { altAr: e.target.value }))} maxLength={160} className={inputClass} />}
                      </Field>
                      <Field label={t("altEn")} error={undefined}>
                        {(p) => <input {...p} dir="ltr" value={im.altEn} onChange={(e) => setImages((rows) => patch(rows, i, { altEn: e.target.value }))} maxLength={160} className={inputClass} />}
                      </Field>
                      <Field label={f("tone")} error={undefined}>
                        {(p) => (
                          <select {...p} value={im.tone} onChange={(e) => setImages((rows) => patch(rows, i, { tone: e.target.value }))} className={inputClass}>
                            {TONES.map((tone) => (
                              <option key={tone} value={tone}>
                                {t(`tones.${tone}` as "tones.wine")}
                              </option>
                            ))}
                          </select>
                        )}
                      </Field>
                      <Field label={t("swatch")} error={undefined}>
                        {(p) => <input {...p} type="color" value={im.colorHex ?? "#67251b"} onChange={(e) => setImages((rows) => patch(rows, i, { colorHex: e.target.value }))} className="h-12 w-full cursor-pointer border border-line bg-surface px-2" />}
                      </Field>
                    </div>
                    <div className="flex flex-row gap-2 lg:flex-col">
                      <button type="button" onClick={() => setImages((rows) => move(rows, i, -1))} disabled={i === 0} aria-label={`${t("moveUp")} ${i + 1}`} className="grid size-8 place-items-center border border-line text-muted disabled:opacity-30 hover:border-accent">
                        <ArrowUp size={14} />
                      </button>
                      <button type="button" onClick={() => setImages((rows) => move(rows, i, 1))} disabled={i === images.length - 1} aria-label={`${t("moveDown")} ${i + 1}`} className="grid size-8 place-items-center border border-line text-muted disabled:opacity-30 hover:border-accent">
                        <ArrowDown size={14} />
                      </button>
                      <button type="button" onClick={() => setImages((rows) => rows.filter((_, k) => k !== i))} aria-label={`${t("removeImage")} ${i + 1}`} className="grid size-8 place-items-center border border-line text-muted hover:border-brand hover:text-brand">
                        <X size={14} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="border border-line bg-surface">
          <header className="flex items-center justify-between border-b border-line px-5 py-3">
            <span className="text-xs uppercase tracking-[0.2em] text-accent">{t("sections.variants")}</span>
            <button type="button" onClick={() => setVariants((rows) => [...rows, blankVariant()])} className="flex items-center gap-1.5 border border-line px-3 py-1 text-xs text-muted hover:border-accent hover:text-foreground">
              <Plus size={13} /> {t("addVariant")}
            </button>
          </header>
          <div className="space-y-4 p-5">
            {state.errors?.variants ? (
              <p role="alert" className="border border-brand/40 bg-brand/5 px-4 py-3 text-sm text-brand">
                {state.errors.variants === "variantsRequired"
                  ? t("errVariantsRequired")
                  : state.errors.variants === "duplicateSku"
                    ? t("errDuplicateSku")
                    : state.errors.variants === "duplicateVariant"
                      ? t("errDuplicateVariant")
                      : ferr(state.errors.variants)}
              </p>
            ) : null}
            <div className="hidden grid-cols-[1fr_0.6fr_1fr_1fr_0.8fr_0.6fr_auto] gap-3 px-1 text-xs uppercase tracking-[0.14em] text-muted lg:grid">
              <span>{t("vSku")}</span>
              <span>{t("vSize")}</span>
              <span>{t("vColorEn")}</span>
              <span>{t("vColorAr")}</span>
              <span>{t("vPrice")}</span>
              <span>{t("vStock")}</span>
              <span className="sr-only">{f("actions")}</span>
            </div>
            <ul className="space-y-3">
              {variants.map((v, i) => (
                <li key={v.id ?? i} className="grid gap-3 border border-line p-4 lg:grid-cols-[1fr_0.6fr_1fr_1fr_0.8fr_0.6fr_auto] lg:items-end">
                  <Field label={t("vSku")} error={undefined}>
                    {(p) => <input {...p} dir="ltr" value={v.sku} onChange={(e) => setVariants((rows) => patch(rows, i, { sku: e.target.value }))} maxLength={60} placeholder="MLK-DRS-001-W30" className={inputClass} />}
                  </Field>
                  <Field label={t("vSize")} error={undefined}>
                    {(p) => <input {...p} dir="ltr" value={v.size} onChange={(e) => setVariants((rows) => patch(rows, i, { size: e.target.value }))} maxLength={20} placeholder="M" className={inputClass} />}
                  </Field>
                  <Field label={t("vColorEn")} error={undefined}>
                    {(p) => <input {...p} dir="ltr" value={v.colorNameEn} onChange={(e) => setVariants((rows) => patch(rows, i, { colorNameEn: e.target.value }))} maxLength={60} placeholder="Wine" className={inputClass} />}
                  </Field>
                  <Field label={t("vColorAr")} error={undefined}>
                    {(p) => <input {...p} value={v.colorNameAr} onChange={(e) => setVariants((rows) => patch(rows, i, { colorNameAr: e.target.value }))} maxLength={60} placeholder="خمري" className={inputClass} />}
                  </Field>
                  <Field label={t("vPrice")} hint={t("vPriceHint")} error={undefined}>
                    {(p) => <input {...p} dir="ltr" inputMode="decimal" value={v.price} onChange={(e) => setVariants((rows) => patch(rows, i, { price: e.target.value }))} placeholder="—" className={inputClass} />}
                  </Field>
                  <Field label={t("vStock")} error={undefined}>
                    {(p) => <input {...p} dir="ltr" inputMode="numeric" value={v.stock} onChange={(e) => setVariants((rows) => patch(rows, i, { stock: e.target.value }))} className={inputClass} />}
                  </Field>
                  <div className="flex gap-2 pb-1">
                    <input type="color" aria-label={`${t("swatch")} ${i + 1}`} value={v.colorHex} onChange={(e) => setVariants((rows) => patch(rows, i, { colorHex: e.target.value }))} className="h-10 w-10 cursor-pointer border border-line bg-surface" />
                    <button type="button" onClick={() => setVariants((rows) => rows.filter((_, k) => k !== i))} disabled={variants.length === 1} aria-label={`${t("removeVariant")} ${i + 1}`} className="grid size-8 place-items-center border border-line text-muted disabled:opacity-30 hover:border-brand hover:text-brand">
                      <X size={14} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="border border-line bg-surface">
          <header className="border-b border-line px-5 py-3 text-xs uppercase tracking-[0.2em] text-accent">{t("sections.collections")}</header>
          <div className="max-h-56 overflow-y-auto p-5">
            {collections.length === 0 ? (
              <p className="text-sm text-muted">{t("noCollections")}</p>
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2">
                {collections.map((c) => (
                  <li key={c.id}>
                    <label className="flex cursor-pointer items-center gap-3 border border-line px-3 py-2 text-sm hover:border-accent">
                      <input type="checkbox" checked={selectedCollections.includes(c.id)} onChange={() => setSelectedCollections((ids) => toggle(ids, c.id))} className="size-4 accent-[var(--color-brand,#67251b)]" />
                      <span>{c.nameEn}</span>
                      <span className="text-xs text-muted">{c.nameAr}</span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="border border-line bg-surface">
          <header className="border-b border-line px-5 py-3 text-xs uppercase tracking-[0.2em] text-accent">{f("seoSection")}</header>
          <div className="space-y-5 p-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label={f("seoTitleAr")} error={state.errors?.seoTitleAr}>
                {(p) => <input {...p} name="seoTitleAr" defaultValue={product?.seoTitleAr ?? ""} maxLength={70} className={inputClass} />}
              </Field>
              <Field label={f("seoTitleEn")} error={state.errors?.seoTitleEn}>
                {(p) => <input {...p} name="seoTitleEn" dir="ltr" defaultValue={product?.seoTitleEn ?? ""} maxLength={70} className={inputClass} />}
              </Field>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label={f("seoDescriptionAr")} error={state.errors?.seoDescriptionAr}>
                {(p) => <textarea {...p} name="seoDescriptionAr" defaultValue={product?.seoDescriptionAr ?? ""} maxLength={200} rows={2} className={`${inputClass} h-auto py-3`} />}
              </Field>
              <Field label={f("seoDescriptionEn")} error={state.errors?.seoDescriptionEn}>
                {(p) => <textarea {...p} name="seoDescriptionEn" dir="ltr" defaultValue={product?.seoDescriptionEn ?? ""} maxLength={200} rows={2} className={`${inputClass} h-auto py-3`} />}
              </Field>
            </div>
          </div>
        </section>
      </div>

      <aside className="space-y-6 xl:sticky xl:top-6 xl:self-start">
        <div className="border border-line bg-surface p-5">
          <p className="mb-4 text-xs uppercase tracking-[0.2em] text-accent">{t("sections.publish")}</p>
          <div className="space-y-5">
            <Field label={f("status")} error={state.errors?.status}>
              {(p) => (
                <select {...p} name="status" defaultValue={product?.status ?? "draft"} className={inputClass}>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {t(`statuses.${s}` as "statuses.draft")}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <p role="status" aria-live="polite" className="text-sm text-sage-700 dark:text-sage-200">
              {state.ok ? f("saved") : ""}
            </p>
            <div className="flex gap-3">
              <Button type="button" variant="secondary" onClick={() => router.push("/admin/products")} className="min-h-11 flex-1 px-4">
                {f("back")}
              </Button>
              <Button type="submit" disabled={pending} aria-busy={pending} className="min-h-11 flex-1 px-4">
                {pending ? f("saving") : f("save")}
              </Button>
            </div>
          </div>
        </div>
        <div className="border border-line bg-surface p-5 text-sm text-muted">
          <p className="mb-2 text-xs uppercase tracking-[0.2em] text-accent">{t("tipsTitle")}</p>
          <ul className="list-inside list-disc space-y-1.5">
            <li>{t("tipSku")}</li>
            <li>{t("tipStock")}</li>
            <li>{t("tipSlug")}</li>
          </ul>
        </div>
      </aside>
    </form>
  );
}
