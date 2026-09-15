"use client";

import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n/provider";
import type {
  DeliveryTruckRow,
  LayoutRow,
  StoreRow,
  TruckLayoutRow,
} from "@/lib/types";

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
  const { t } = useI18n();
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
      alert(t.common.duplicateName);
    } else if (error) {
      alert(t.common.addFailed(error.message));
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
      alert(t.common.duplicateName);
    } else {
      alert(t.common.updateFailed(error.message));
    }
    setBusy(false);
  }

  async function handleDelete(id: string) {
    if (!confirm(t.common.confirmDelete)) return;
    setBusy(true);
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (!error) {
      onChange(items.filter((i) => i.id !== id));
    } else {
      alert(t.common.deleteFailed(error.message));
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
          {t.common.add}
        </button>
      </form>

      {items.length === 0 && (
        <p className="text-xs text-gray-500">{t.masters.empty}</p>
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
                  {t.common.save}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="shrink-0 text-xs text-gray-500"
                >
                  {t.common.cancel}
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
                  aria-label={t.common.edit}
                >
                  ✎
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(item.id)}
                  disabled={busy}
                  className="shrink-0 text-xs text-red-400 disabled:opacity-50"
                  aria-label={t.common.delete}
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

/**
 * 便ごとに、その便が商品を持ってくるゴンドラ(売場)を選ぶ。
 * 例: ヤマザキパン1便 → 菓子パン・惣菜パン・マルチパン。
 * ここで選んだゴンドラが投稿ウィザードで候補として上に並ぶ。
 */
function TruckGondolaLinks({
  trucks,
  gondolas,
  links,
  onChange,
}: {
  trucks: DeliveryTruckRow[];
  gondolas: LayoutRow[];
  links: TruckLayoutRow[];
  /** 連続タップでも取りこぼさないよう、更新関数を渡せる形にしている。 */
  onChange: Dispatch<SetStateAction<TruckLayoutRow[]>>;
}) {
  const supabase = createClient();
  const { t } = useI18n();
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const linkByKey = useMemo(() => {
    const map = new Map<string, TruckLayoutRow>();
    for (const link of links) {
      map.set(`${link.delivery_truck_id}:${link.layout_id}`, link);
    }
    return map;
  }, [links]);

  const countByTruck = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const link of links) {
      counts[link.delivery_truck_id] = (counts[link.delivery_truck_id] ?? 0) + 1;
    }
    return counts;
  }, [links]);

  async function toggle(truckId: string, layoutId: string) {
    const key = `${truckId}:${layoutId}`;
    const existing = linkByKey.get(key);
    setBusyKey(key);

    // 直前の値を配列で持ち回すと、2つ続けてタップしたときに後の更新が前の
    // 更新を巻き戻してしまう(awaitを挟むため)。必ず最新の値から作り直す。
    if (existing) {
      onChange((prev) => prev.filter((l) => l.id !== existing.id));
      const { error } = await supabase
        .from("truck_layouts")
        .delete()
        .eq("id", existing.id);
      if (error) {
        onChange((prev) =>
          prev.some((l) => l.id === existing.id) ? prev : [...prev, existing],
        );
        alert(t.masters.linkFailed(error.message));
      }
    } else {
      const { data, error } = await supabase
        .from("truck_layouts")
        .insert({ delivery_truck_id: truckId, layout_id: layoutId })
        .select()
        .single<TruckLayoutRow>();
      if (error) {
        alert(t.masters.linkFailed(error.message));
      } else if (data) {
        onChange((prev) =>
          prev.some((l) => l.id === data.id) ? prev : [...prev, data],
        );
      }
    }
    setBusyKey(null);
  }

  return (
    <section className="mb-4 rounded-lg border border-neutral-800 bg-neutral-900 p-3">
      <h2 className="mb-1 text-sm font-bold text-gray-300">
        {t.masters.linkTitle}
      </h2>
      <p className="mb-3 text-xs text-gray-500">{t.masters.linkDescription}</p>

      {gondolas.length === 0 && (
        <p className="text-xs text-gray-500">{t.masters.linkNoGondolas}</p>
      )}
      {gondolas.length > 0 && trucks.length === 0 && (
        <p className="text-xs text-gray-500">{t.masters.linkNoTrucks}</p>
      )}

      <div className="flex flex-col gap-2">
        {gondolas.length > 0 &&
          trucks.map((truck) => (
            <details
              key={truck.id}
              className="rounded-md border border-neutral-800 bg-neutral-800/50 px-3 py-2"
            >
              <summary className="flex cursor-pointer items-center justify-between gap-2 text-sm text-gray-200">
                <span className="min-w-0 truncate">{truck.name}</span>
                <span className="shrink-0 text-[11px] text-gray-500">
                  {t.masters.linkSelected(countByTruck[truck.id] ?? 0)}
                </span>
              </summary>
              <div className="mt-2 flex flex-wrap gap-2">
                {gondolas.map((gondola) => {
                  const key = `${truck.id}:${gondola.id}`;
                  const linked = linkByKey.has(key);
                  return (
                    <button
                      key={gondola.id}
                      type="button"
                      disabled={busyKey === key}
                      onClick={() => toggle(truck.id, gondola.id)}
                      aria-pressed={linked}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${
                        linked
                          ? "border-blue-500 bg-blue-950/60 text-blue-300"
                          : "border-neutral-700 text-gray-400"
                      }`}
                    >
                      {linked ? "✓ " : ""}
                      {gondola.name}
                    </button>
                  );
                })}
              </div>
            </details>
          ))}
      </div>
    </section>
  );
}

export default function MastersEditor({
  initialStores,
  initialTrucks,
  gondolas,
  initialLinks,
}: {
  initialStores: StoreRow[];
  initialTrucks: DeliveryTruckRow[];
  gondolas: LayoutRow[];
  initialLinks: TruckLayoutRow[];
}) {
  const { t } = useI18n();
  const [stores, setStores] = useState<StoreRow[]>(initialStores);
  const [trucks, setTrucks] = useState<DeliveryTruckRow[]>(initialTrucks);
  const [links, setLinks] = useState<TruckLayoutRow[]>(initialLinks);

  return (
    <div>
      <Link href="/" className="text-xs text-blue-400 hover:underline">
        {t.common.backHome}
      </Link>
      <h1 className="mb-1 mt-1 text-lg font-bold text-gray-100">
        {t.masters.title}
      </h1>
      <p className="mb-4 text-xs text-gray-500">{t.masters.description}</p>

      <MasterList
        table="stores"
        label={t.masters.stores}
        placeholder={t.masters.storePlaceholder}
        items={stores}
        onChange={setStores}
      />
      <MasterList
        table="delivery_trucks"
        label={t.masters.trucks}
        placeholder={t.masters.truckPlaceholder}
        items={trucks}
        onChange={setTrucks}
      />
      <TruckGondolaLinks
        trucks={trucks}
        gondolas={gondolas}
        links={links}
        onChange={setLinks}
      />
    </div>
  );
}
