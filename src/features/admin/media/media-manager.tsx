"use client";

import { Clipboard, Film, Images, Pencil, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Badge, Card, CardHeader, EmptyState } from "@/components/admin/primitives";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { Drawer } from "@/components/admin/overlay";
import { useRouter } from "@/i18n/navigation";
import { deleteMediaAction } from "@/server/actions/admin-content";
import { MediaEditForm } from "./media-edit-form";
import { MediaUpload } from "./media-upload";

export type MediaRow = {
  id: string;
  url: string;
  kind: "image" | "video";
  name: string;
  folder: string;
  altAr: string | null;
  altEn: string | null;
  sizeBytes: number | null;
  createdAt: Date;
};

type Props = { rows: MediaRow[]; canCreate: boolean; canEdit: boolean; canDelete: boolean; emptyIcon?: React.ReactNode };

const formatSize = (bytes: number | null) => {
  if (bytes == null) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/** Media grid: upload zone, copy-to-clipboard, metadata editing, guarded (multi) delete. */
export function MediaManager({ rows, canCreate, canEdit, canDelete, emptyIcon }: Props) {
  const t = useTranslations("admin.media");
  const f = useTranslations("admin.form");
  const router = useRouter();
  const [edit, setEdit] = useState<MediaRow | null>(null);
  const [confirm, setConfirm] = useState<MediaRow[] | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  const flash = (text: string) => {
    setNotice(text);
    setTimeout(() => setNotice(null), 2500);
  };

  const copy = async (row: MediaRow) => {
    try {
      await navigator.clipboard.writeText(row.url);
      flash(t("copied"));
    } catch {
      flash(t("copyFailed"));
    }
  };

  const targets = confirm ?? [];
  const deleteThem = () => {
    const ids = targets.map((r) => r.id);
    setConfirm(null);
    setSelected((s) => s.filter((id) => !ids.includes(id)));
    if (!ids.length) return;
    const fd = new FormData();
    for (const id of ids) fd.append("id", id);
    return deleteMediaAction(fd).then(() => router.refresh());
  };

  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <div className="space-y-8">
      {canCreate && <MediaUpload onUploaded={() => flash(t("uploadedNew"))} />}

      <Card>
        <CardHeader
          title={t("listTitle", { count: rows.length })}
          action={
            canDelete && rows.length > 0 ? (
              <div className="flex items-center gap-3">
                <label className="flex cursor-pointer items-center gap-2 text-xs text-muted">
                  <input
                    type="checkbox"
                    checked={selected.length > 0 && selected.length === rows.length}
                    onChange={(e) => setSelected(e.target.checked ? rows.map((r) => r.id) : [])}
                    className="size-4 accent-[var(--color-brand,#67251b)]"
                  />
                  {t("selectAll")}
                </label>
                <button
                  type="button"
                  disabled={selected.length === 0}
                  onClick={() => setConfirm(rows.filter((r) => selected.includes(r.id)))}
                  className="inline-flex min-h-9 items-center gap-1.5 border border-line px-3 text-xs text-muted enabled:hover:border-brand enabled:hover:text-brand disabled:opacity-40"
                >
                  <Trash2 size={13} /> {t("deleteSelected", { count: selected.length })}
                </button>
              </div>
            ) : undefined
          }
        />

        <p role="status" aria-live="polite" className="px-5 pt-4 text-sm text-sage-700 dark:text-sage-200">
          {notice ?? ""}
        </p>

        {rows.length === 0 ? (
          <EmptyState icon={emptyIcon ?? <Images size={30} strokeWidth={1.2} />} title={t("empty")} body={t("emptyBody")} />
        ) : (
          <ul className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {rows.map((row) => (
              <li key={row.id} className="group border border-line bg-surface">
                <div className="relative aspect-square overflow-hidden bg-brand/5">
                  {row.kind === "image" ? (
                    // eslint-disable-next-line @next/next/no-img-element -- admin library previews arbitrary stored URLs
                    <img src={row.url} alt="" loading="lazy" className="size-full object-cover" />
                  ) : (
                    <span className="grid size-full place-items-center text-muted">
                      <Film size={26} strokeWidth={1.2} />
                    </span>
                  )}
                  {canDelete && (
                    <input
                      type="checkbox"
                      checked={selected.includes(row.id)}
                      onChange={() => toggle(row.id)}
                      aria-label={`${t("select")} — ${row.name}`}
                      className="absolute start-2 top-2 size-4 accent-[var(--color-brand,#67251b)]"
                    />
                  )}
                </div>
                <div className="space-y-2 p-3">
                  <p className="truncate text-sm" title={row.name} dir="auto">
                    {row.name}
                  </p>
                  <p className="truncate text-xs text-muted" dir="ltr">
                    {row.folder} · {formatSize(row.sizeBytes)}
                  </p>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => copy(row)}
                      aria-label={`${t("copy")} — ${row.name}`}
                      className="grid size-8 place-items-center border border-line text-muted hover:border-accent hover:text-foreground"
                    >
                      <Clipboard size={14} />
                    </button>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => setEdit(row)}
                        aria-label={`${f("edit")} — ${row.name}`}
                        className="grid size-8 place-items-center border border-line text-muted hover:border-accent hover:text-foreground"
                      >
                        <Pencil size={14} />
                      </button>
                    )}
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => setConfirm([row])}
                        aria-label={`${f("delete")} — ${row.name}`}
                        className="grid size-8 place-items-center border border-line text-muted hover:border-brand hover:text-brand"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="px-5 pb-5 text-xs text-muted">{t("useHint")}</p>
      </Card>

      <Drawer open={edit !== null} onClose={() => setEdit(null)} title={t("editTitle")} className="w-[min(94vw,30rem)]">
        {edit && <MediaEditForm row={edit} onDone={() => setEdit(null)} onCancel={() => setEdit(null)} />}
      </Drawer>

      <ConfirmDialog
        open={targets.length > 0}
        onClose={() => setConfirm(null)}
        title={targets.length === 1 ? f("deleteTitle", { name: targets[0]?.name ?? "" }) : t("deleteManyTitle", { count: targets.length })}
        body={f("deleteBody")}
        confirmLabel={f("deleteConfirm")}
        formAction={deleteThem}
      />
    </div>
  );
}

export function MediaBadge({ kind }: { kind: "image" | "video" }) {
  const t = useTranslations("admin.media");
  return <Badge tone={kind === "video" ? "copper" : "sage"}>{t(kind === "video" ? "kindVideo" : "kindImage")}</Badge>;
}
