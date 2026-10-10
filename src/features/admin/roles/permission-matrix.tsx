"use client";

import { useTranslations } from "next-intl";
import { ACTIONS, RESOURCES, permissionKey, type Action, type Resource } from "@/lib/permissions";
import { TableWrap, Th } from "@/components/admin/primitives";

const CHECKBOX = "size-4 accent-[var(--color-brand,#67251b)]";

const keysOf = (r: Resource) => (RESOURCES[r] as readonly Action[]).map((a) => permissionKey(r, a));

type Props = {
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
  readOnly: boolean;
};

/** Resources × actions grid: every cell is a permission, each row has an "all" toggle plus one master switch. */
export function PermissionMatrix({ selected, onChange, readOnly }: Props) {
  const a = useTranslations("admin");
  const ta = useTranslations("admin.actions");
  const tr = useTranslations("admin.resources");
  const t = useTranslations("admin.role");
  const resources = Object.keys(RESOURCES) as Resource[];
  const allKeys = resources.flatMap(keysOf);
  const allOn = allKeys.length > 0 && allKeys.every((k) => selected.has(k));

  const toggleKey = (key: string) => {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange(next);
  };

  const toggleRow = (r: Resource) => {
    const keys = keysOf(r);
    const rowAll = keys.every((k) => selected.has(k));
    const next = new Set(selected);
    for (const k of keys) {
      if (rowAll) next.delete(k);
      else next.add(k);
    }
    onChange(next);
  };

  const toggleAll = () => onChange(allOn ? new Set<string>() : new Set(allKeys));

  return (
    <div className="space-y-4">
      <label className="inline-flex items-center gap-3 text-sm font-medium">
        <input type="checkbox" checked={allOn} disabled={readOnly} onChange={toggleAll} aria-label={t("selectAll")} className={CHECKBOX} />
        <span>{t("selectAll")}</span>
      </label>

      <TableWrap>
        <thead>
          <tr className="border-b border-line">
            <Th>{a("resource")}</Th>
            {ACTIONS.map((action) => (
              <Th key={action} className="text-center">
                {ta(action)}
              </Th>
            ))}
            <Th className="text-center">{t("all")}</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {resources.map((r) => {
            const keys = keysOf(r);
            const rowAll = keys.length > 0 && keys.every((k) => selected.has(k));
            return (
              <tr key={r} className="hover:bg-brand/5">
                <th scope="row" className="px-5 py-3 text-start text-sm font-medium">
                  {tr(r)}
                </th>
                {ACTIONS.map((action) => {
                  const applicable = (RESOURCES[r] as readonly Action[]).includes(action);
                  if (!applicable) {
                    return (
                      <td key={action} aria-hidden className="px-5 py-3 text-center text-line">
                        ·
                      </td>
                    );
                  }
                  const key = permissionKey(r, action);
                  return (
                    <td key={action} className="px-5 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={selected.has(key)}
                        disabled={readOnly}
                        onChange={() => toggleKey(key)}
                        aria-label={`${tr(r)} — ${ta(action)}`}
                        className={CHECKBOX}
                      />
                    </td>
                  );
                })}
                <td className="px-5 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={rowAll}
                    disabled={readOnly}
                    onChange={() => toggleRow(r)}
                    aria-label={t("allFor", { resource: tr(r) })}
                    className={CHECKBOX}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </TableWrap>
    </div>
  );
}
