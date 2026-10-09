"use client";

import { UploadCloud } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { inputClass, useFieldError } from "@/components/ui/field";
import { useRouter } from "@/i18n/navigation";

const ACCEPT = "image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm";
const MAX_BYTES = 5 * 1024 * 1024;

type UpState = { busy: boolean; done: number; error: string | null };

/** Drag-and-drop (plus file picker) upload zone. Posts straight to /api/admin/media, then refreshes the grid. */
export function MediaUpload({ onUploaded }: { onUploaded?: () => void }) {
  const t = useTranslations("admin.media");
  const ferr = useFieldError();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [folder, setFolder] = useState("");
  const [state, setState] = useState<UpState>({ busy: false, done: 0, error: null });

  /** useFieldError types its result as optional; every key we pass is known, so narrow once here. */
  const msg = (key: string): string => ferr(key) ?? "";
  const mapError = (status: number, code?: string) =>
    status === 413 || code === "too_large"
      ? msg("fileTooLarge")
      : status === 415 || code === "bad_type"
        ? msg("badFileType")
        : status === 429 || code === "rate_limited"
          ? msg("rateLimited")
          : msg("uploadFailed");

  const send = async (files: FileList | File[] | null) => {
    const list = Array.from(files ?? []).slice(0, 10);
    if (!list.length || state.busy) return;
    setState({ busy: true, done: 0, error: null });
    let done = 0;
    let error: string | null = null;

    for (const file of list) {
      if (file.size > MAX_BYTES) {
        error = msg("fileTooLarge");
        break;
      }
      const fd = new FormData();
      fd.set("file", file);
      if (folder.trim()) fd.set("folder", folder.trim());
      try {
        const res = await fetch("/api/admin/media", { method: "POST", body: fd });
        if (res.ok) done++;
        else {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          error = mapError(res.status, body.error);
          break;
        }
      } catch {
        error = msg("uploadFailed");
        break;
      }
    }

    setState({ busy: false, done, error });
    if (done > 0) {
      onUploaded?.();
      router.refresh();
    }
  };

  return (
    <section
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        void send(e.dataTransfer.files);
      }}
      className={`border border-dashed p-6 transition-colors ${drag ? "border-brand bg-brand/5" : "border-line"}`}
    >
      <div className="flex flex-wrap items-center gap-4">
        <span className="grid size-12 shrink-0 place-items-center border border-line text-accent" aria-hidden>
          <UploadCloud size={20} strokeWidth={1.4} />
        </span>
        <div className="min-w-52 flex-1">
          <p className="text-sm font-medium">{t("uploadTitle")}</p>
          <p className="text-xs text-muted">{t("uploadHint")}</p>
        </div>
        <label className="grid gap-1.5 text-xs uppercase tracking-[0.14em] text-accent">
          {t("folderLabel")}
          <input
            type="text"
            value={folder}
            onChange={(e) => setFolder(e.target.value)}
            dir="ltr"
            maxLength={60}
            placeholder={t("folderPlaceholder")}
            className={`${inputClass} h-10 w-40 text-sm normal-case tracking-normal`}
          />
        </label>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={state.busy}
          className="inline-flex min-h-11 items-center gap-2 border border-brand bg-brand px-6 text-sm font-medium uppercase tracking-[0.18em] text-brand-contrast transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {state.busy ? t("uploading") : t("chooseFiles")}
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT}
          className="sr-only"
          aria-label={t("chooseFiles")}
          onChange={(e) => {
            void send(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
      <p role="status" aria-live="polite" className={`mt-4 text-sm ${state.error ? "text-brand" : "text-sage-700 dark:text-sage-200"}`}>
        {state.error ?? (state.done > 0 ? t("uploaded", { count: state.done }) : "")}
      </p>
      <p className="mt-1 text-xs text-muted">{t("maxSize")}</p>
    </section>
  );
}
