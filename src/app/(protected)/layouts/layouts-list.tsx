"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { shelfImageThumbUrl } from "@/lib/supabase/storage";
import { useI18n } from "@/lib/i18n/provider";
import type { LayoutReferencePhotoRow, LayoutRow } from "@/lib/types";

export default function LayoutsList({
  layouts,
  latestReferenceByLayout,
  storeCoverageByLayout,
  openTaskCountByLayout,
  totalStores,
}: {
  layouts: LayoutRow[];
  latestReferenceByLayout: Record<string, LayoutReferencePhotoRow>;
  storeCoverageByLayout: Record<string, number>;
  openTaskCountByLayout: Record<string, number>;
  totalStores: number;
}) {
  const supabase = createClient();
  const { t } = useI18n();
  const [items, setItems] = useState<LayoutRow[]>(layouts);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;
    setAdding(true);
    const { data, error } = await supabase
      .from("layouts")
      .insert({ name: trimmed, sort_order: items.length })
      .select()
      .single<LayoutRow>();
    if (!error && data) {
      setItems((prev) => [...prev, data]);
      setNewName("");
    } else if (error) {
      alert(t.common.addFailed(error.message));
    }
    setAdding(false);
  }

  return (
    <div>
      <h1 className="mb-1 text-lg font-bold text-gray-100">{t.layouts.title}</h1>
      <p className="mb-4 text-xs text-gray-500">{t.layouts.description}</p>

      <form onSubmit={handleAdd} className="mb-4 flex gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder={t.layouts.addPlaceholder}
          className="min-w-0 flex-1 rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-gray-100 placeholder-gray-500"
        />
        <button
          type="submit"
          disabled={adding || !newName.trim()}
          className="shrink-0 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {t.common.add}
        </button>
      </form>

      {items.length === 0 && (
        <p className="text-sm text-gray-500">{t.layouts.empty}</p>
      )}

      <div className="grid grid-cols-2 gap-3">
        {items.map((layout) => {
          const reference = latestReferenceByLayout[layout.id];
          const coverage = storeCoverageByLayout[layout.id] ?? 0;
          const openTasks = openTaskCountByLayout[layout.id] ?? 0;

          return (
            <Link
              key={layout.id}
              href={`/layouts/${layout.id}`}
              className="overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900"
            >
              <div className="aspect-square w-full bg-neutral-800">
                {reference && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={shelfImageThumbUrl(reference)}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover"
                  />
                )}
                {!reference && (
                  <div className="flex h-full w-full items-center justify-center text-xs text-gray-600">
                    {t.layouts.noReference}
                  </div>
                )}
              </div>
              <div className="p-2">
                <p className="truncate text-sm font-semibold text-gray-100">
                  {layout.name}
                </p>
                <p className="truncate text-[11px] text-gray-500">
                  {reference
                    ? t.layouts.coverageWithSeason(
                        reference.season === "spring"
                          ? t.layoutDetail.seasonSpring
                          : t.layoutDetail.seasonAutumn,
                        coverage,
                        totalStores,
                      )
                    : t.layouts.coverage(coverage, totalStores)}
                </p>
                {openTasks > 0 && (
                  <span className="mt-1 inline-block rounded-full bg-orange-900/50 px-2 py-0.5 text-[11px] font-medium text-orange-300">
                    {t.layouts.openTasks(openTasks)}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
