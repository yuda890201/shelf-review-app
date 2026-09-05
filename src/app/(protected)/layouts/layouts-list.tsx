"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { shelfImagePublicUrl } from "@/lib/supabase/storage";
import type { LayoutReferencePhotoRow, LayoutRow } from "@/lib/types";

const SEASON_LABEL: Record<string, string> = {
  spring: "春",
  autumn: "秋",
};

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
      alert(`追加に失敗しました: ${error.message}`);
    }
    setAdding(false);
  }

  return (
    <div>
      <h1 className="mb-1 text-lg font-bold text-gray-100">
        本部レイアウト比較
      </h1>
      <p className="mb-4 text-xs text-gray-500">
        本部が発表する売場レイアウト(お手本写真)と各店舗の現在の売場写真を比較し、対応タスクを管理します。
      </p>

      <form onSubmit={handleAdd} className="mb-4 flex gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="新しい売場名を入力(例: おにぎり什器)"
          className="min-w-0 flex-1 rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-gray-100 placeholder-gray-500"
        />
        <button
          type="submit"
          disabled={adding || !newName.trim()}
          className="shrink-0 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          追加
        </button>
      </form>

      {items.length === 0 && (
        <p className="text-sm text-gray-500">
          まだ売場が登録されていません。上のフォームから追加してください。
        </p>
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
                    src={shelfImagePublicUrl(reference.storage_path)}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                )}
                {!reference && (
                  <div className="flex h-full w-full items-center justify-center text-xs text-gray-600">
                    お手本写真未登録
                  </div>
                )}
              </div>
              <div className="p-2">
                <p className="truncate text-sm font-semibold text-gray-100">
                  {layout.name}
                </p>
                <p className="truncate text-[11px] text-gray-500">
                  {reference
                    ? `${reference.year}年${SEASON_LABEL[reference.season]} · 現在写真 ${coverage}/${totalStores}店舗`
                    : `現在写真 ${coverage}/${totalStores}店舗`}
                </p>
                {openTasks > 0 && (
                  <span className="mt-1 inline-block rounded-full bg-orange-900/50 px-2 py-0.5 text-[11px] font-medium text-orange-300">
                    未完了タスク {openTasks}
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
