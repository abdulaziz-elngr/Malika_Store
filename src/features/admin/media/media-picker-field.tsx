"use client";

import { ImageIcon, Images, Loader2, Trash2, UploadCloud } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { Modal } from "@/components/admin/overlay";
import { useFieldError } from "@/components/ui/field";
import { ACCEPT_IMAGES, ACCEPT_VIDEOS, MAX_UPLOAD_BYTES } from "./limits";
import { uploadMediaFile } from "./upload-client";

const ERR_KEY = { too_large: "fileTooLarge", bad_type: "badFileType", rate_limited: "rateLimited", failed: "uploadFailed" } as const;

type Item = { id: string; url: string; name: string; kind: "image" | "video" };

type Props = {
  /** Form field name — renders a hidden input so plain `<form action>` submits keep working. */
  name?: string;
  /** Controlled value (product form) or initial value (uncontrolled forms). */
  value?: string;
  defaultValue?: string;
  onChange?: (url: string) => void;
  kind?: "image" | "video";
  /** Fires once when a new file has been uploaded, with its display name (handy for pre-filling alt text). */
  onUploaded?: (item: Item) => void;
  /** Hide the built-in thumbnail when the parent already shows a preview. */
  hidePreview?: boolean;
};

/**
 * Image/video chooser: upload from the device (stored in the media library) or pick an existing library file.
 * Replaces the old "paste a URL" text inputs.
 */
export function MediaPickerField({ name, value, defaultValue, onChange, kind = "image", onUploaded, hidePreview }: Props) {
  const t = useTranslations("admin.media");
  const ferr = useFieldError();
  const fileRef = useRef<HTMLInputElement>(null);
  const [inner, setInner] = useState(value ?? defaultValue ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const current = value ?? inner;
  const set = (url: string) => {
    setInner(url);
    onChange?.(url);
  };

  const upload = async (file: File | undefined) => {
    if (!file || busy) return;
    setError(null);
    if (file.size > MAX_UPLOAD_BYTES) return setError(ferr("fileTooLarge") ?? "");
    setBusy(true);
    const r = await uploadMediaFile(file);
    setBusy(false);
    if (r.ok) {
      set(r.media.url);
      onUploaded?.(r.media);
    } else {
      setError(ferr(ERR_KEY[r.code]) ?? "");
    }
  };

  const btn = "inline-flex min-h-10 items-center gap-2 border border-line px-4 text-sm text-foreground transition-colors hover:border-accent disabled:opacity-50";

  return (
    <div className="flex flex-wrap items-center gap-4">
      {name ? <input type="hidden" name={name} value={current} /> : null}
      <div className={`${hidePreview ? "hidden" : "grid"} size-20 shrink-0 place-items-center overflow-hidden border border-line bg-surface`}>
        {current ? (
          kind === "video" ? (
            <video src={current} muted className="size-full object-cover" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={current} alt="" className="size-full object-cover" />
          )
        ) : (
          <ImageIcon size={22} strokeWidth={1.2} className="text-muted" />
        )}
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => fileRef.current?.click()} disabled={busy} className={btn}>
            {busy ? <Loader2 size={15} className="animate-spin" /> : <UploadCloud size={15} strokeWidth={1.5} />}
            {busy ? t("uploading") : t("pickFromDevice")}
          </button>
          <button type="button" onClick={() => setOpen(true)} disabled={busy} className={btn}>
            <Images size={15} strokeWidth={1.5} />
            {t("pickFromLibrary")}
          </button>
          {current ? (
            <button type="button" onClick={() => set("")} disabled={busy} className={`${btn} hover:border-brand hover:text-brand`} aria-label={t("removePicked")}>
              <Trash2 size={15} strokeWidth={1.5} />
            </button>
          ) : null}
        </div>
        {error ? <p role="alert" className="text-sm text-brand">{error}</p> : <p className="text-xs text-muted">{t("maxSize")}</p>}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept={kind === "video" ? ACCEPT_VIDEOS : ACCEPT_IMAGES}
        className="sr-only"
        aria-label={t("pickFromDevice")}
        onChange={(e) => {
          void upload(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <LibraryDialog
        open={open}
        kind={kind}
        onClose={() => setOpen(false)}
        onPick={(url) => {
          set(url);
          setOpen(false);
        }}
      />
    </div>
  );
}

function LibraryDialog({ open, kind, onClose, onPick }: { open: boolean; kind: "image" | "video"; onClose: () => void; onPick: (url: string) => void }) {
  const t = useTranslations("admin.media");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [rows, setRows] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const load = useCallback(
    async (query: string, pg: number, signal: AbortSignal) => {
      setLoading(true);
      setFailed(false);
      try {
        const res = await fetch(`/api/admin/media?${new URLSearchParams({ q: query, page: String(pg), kind })}`, { signal });
        const body = (await res.json()) as { rows?: Item[]; pages?: number };
        if (!res.ok || !body.rows) throw new Error("load");
        setRows(body.rows);
        setPages(body.pages ?? 1);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setFailed(true);
      } finally {
        setLoading(false);
      }
    },
    [kind],
  );

  useEffect(() => {
    if (!open) return;
    const ctl = new AbortController();
    const timer = setTimeout(() => void load(q, page, ctl.signal), q ? 250 : 0);
    return () => {
      clearTimeout(timer);
      ctl.abort();
    };
  }, [open, q, page, load]);

  return (
    <Modal open={open} onClose={onClose} title={t("libraryTitle")} className="max-w-3xl">
      <input
        type="search"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setPage(1);
        }}
        placeholder={t("searchPlaceholder")}
        aria-label={t("searchLabel")}
        className="mb-4 h-11 w-full border border-line bg-surface px-4 text-sm outline-none focus:border-brand"
      />
      <div className="max-h-[60vh] min-h-40 overflow-y-auto">
        {failed ? (
          <p className="p-6 text-center text-sm text-brand">{t("libraryFailed")}</p>
        ) : loading && rows.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted">{t("uploading")}</p>
        ) : rows.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted">{t("empty")}</p>
        ) : (
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {rows.map((r) => (
              <li key={r.id}>
                <button type="button" onClick={() => onPick(r.url)} title={r.name} className="group block w-full border border-line text-start transition-colors hover:border-brand focus-visible:border-brand">
                  <span className="block aspect-square overflow-hidden bg-surface">
                    {r.kind === "video" ? (
                      <video src={r.url} muted className="size-full object-cover" />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.url} alt="" loading="lazy" className="size-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    )}
                  </span>
                  <span className="block truncate px-2 py-1 text-xs text-muted">{r.name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {pages > 1 ? (
        <div className="mt-4 flex items-center justify-between text-sm">
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="border border-line px-3 py-1 disabled:opacity-40">‹</button>
          <span className="text-muted">{page} / {pages}</span>
          <button type="button" disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="border border-line px-3 py-1 disabled:opacity-40">›</button>
        </div>
      ) : null}
    </Modal>
  );
}
