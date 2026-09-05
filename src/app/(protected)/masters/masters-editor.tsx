"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { DeliveryTruckRow, StoreRow } from "@/lib/types";

type MasterRow = { id: string; name: string; sort_order: number };

function MasterList<T extends MasterRow>({
  table,
  label,
  placeholder,
  items,
  onChange,
}: {
  table: "stores" | "delivery_trucks";
  label: string;
  placeholder: string;
  items: T[];
  onChange: (next: T[]) => void;
}) {
  const supabase = createClient();
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;
    setBusy(true);
    const nextSortOrder = items.length
      ? Math.max(...items.map((i) => i.sort_order)) + 1
      : 1;
    const { data, error } = await supabase
      .from(table)
      .insert({ name: trimmed, sort_order: nextSortOrder })
      .select()
      .single<T>();
    if (!error && data) {
      onChange([...items, data]);
      setNewName("");
    } else if (error?.code === "23505") {
      alert("同じ名前がすでに登録されています。");
    } else if (error) {
      alert(`追加に失敗しました: ${error.message}`);
    }
    setBusy(false);
  }

  async function handleSaveEdit(id: string) {
    const trimmed = editingName.trim();
    if (!trimmed) return;
    setBusy(true);
    const { error } = await supabase
      .from(table)
      .update({ name: trimmed })
      .eq("id", id);
    if (!error) {
      onChange(items.map((i) => (i.id === id ? { ...i, name: trimmed } : i)));
      setEditingId(null);
    } else if (error.code === "23505") {
      alert("同じ名前がすでに登録されています。");
    } else {
      alert(`更新に失敗しました: ${error.message}`);
    }
    setBusy(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("削除しますか?")) return;
    setBusy(true);
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (!error) {
      onChange(items.filter((i) => i.id !== id));
    } else {
      alert(`削除に失敗しました: ${error.message}`);
    }
    setBusy(false);
  }

  return (
    <section className="mb-4 rounded-lg border border-neutral-800 bg-neutral-900 p-3">
      <h2 className="mb-2 text-sm font-bold text-gray-300">{label}</h2>

      <form onSubmit={handleAdd} className="mb-3 flex gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder={placeholder}
          className="min-w-0 flex-1 rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-500"
        />
        <button
          type="submit"
          disabled={busy || !newName.trim()}
          className="shrink-0 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          追加
        </button>
      </form>

      {items.length === 0 && (
        <p className="text-xs text-gray-500">まだ登録がありません。</p>
      )}

      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-center gap-2 rounded-md border border-neutral-800 bg-neutral-800/50 px-3 py-2"
          >
            {editingId === item.id ? (
              <>
                <input
                  type="text"
                  autoFocus
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  className="min-w-0 flex-1 rounded-md border border-neutral-600 bg-neutral-800 px-2 py-1 text-sm text-gray-100"
                />
                <button
                  type="button"
                  onClick={() => handleSaveEdit(item.id)}
                  disabled={busy}
                  className="shrink-0 text-xs font-semibold text-blue-400 disabled:opacity-50"
                >
                  保存
                </button>
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="shrink-0 text-xs text-gray-500"
                >
                  取消
                </button>
              </>
            ) : (
              <>
                <span className="min-w-0 flex-1 truncate text-sm text-gray-200">
                  {item.name}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(item.id);
                    setEditingName(item.name);
                  }}
                  className="shrink-0 text-xs text-gray-400"
                  aria-label="編集"
                >
                  ✎
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(item.id)}
                  disabled={busy}
                  className="shrink-0 text-xs text-red-400 disabled:opacity-50"
                  aria-label="削除"
                >
                  🗑
                </button>
              </>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function MastersEditor({
  initialStores,
  initialTrucks,
}: {
  initialStores: StoreRow[];
  initialTrucks: DeliveryTruckRow[];
}) {
  const [stores, setStores] = useState<StoreRow[]>(initialStores);
  const [trucks, setTrucks] = useState<DeliveryTruckRow[]>(initialTrucks);

  return (
    <div>
      <Link href="/" className="text-xs text-blue-400 hover:underline">
        ← ホームに戻る
      </Link>
      <h1 className="mb-1 mt-1 text-lg font-bold text-gray-100">
        店舗・納品トラックの管理
      </h1>
      <p className="mb-4 text-xs text-gray-500">
        投稿時の店舗選択・納品トラック選択に表示される一覧です。ここで追加・編集・削除した内容がすぐに反映されます。
      </p>

      <MasterList
        table="stores"
        label="店舗"
        placeholder="新しい店舗名を入力"
        items={stores}
        onChange={setStores}
      />
      <MasterList
        table="delivery_trucks"
        label="納品トラック"
        placeholder="新しい納品トラック名を入力(例: センター4便)"
        items={trucks}
        onChange={setTrucks}
      />
    </div>
  );
}
