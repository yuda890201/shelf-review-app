"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { shelfImagePublicUrl } from "@/lib/supabase/storage";
import LoadingOverlay from "@/components/loading-overlay";
import type { LayoutCurrentPhotoRow, LayoutRow, StoreRow } from "@/lib/types";

export default function NewProductPicker({
  layouts,
  stores,
}: {
  layouts: LayoutRow[];
  stores: StoreRow[];
}) {
  const router = useRouter();
  const supabase = createClient();

  const [selectedLayoutId, setSelectedLayoutId] = useState<string>(
    layouts[0]?.id ?? "",
  );
  const [selectedStore, setSelectedStore] = useState<string>(
    stores[0]?.name ?? "",
  );
  const [photosByKey, setPhotosByKey] = useState<
    Record<string, LayoutCurrentPhotoRow[]>
  >({});

  const requestKey = `${selectedLayoutId}:${selectedStore}`;
  const photos = photosByKey[requestKey] ?? [];
  const loadingPhotos = !!selectedLayoutId && !(requestKey in photosByKey);

  useEffect(() => {
    if (!selectedLayoutId) return;
    let cancelled = false;
    const key = `${selectedLayoutId}:${selectedStore}`;
    supabase
      .from("layout_current_photos")
      .select("*")
      .eq("layout_id", selectedLayoutId)
      .eq("store_name", selectedStore)
      .order("created_at", { ascending: false })
      .returns<LayoutCurrentPhotoRow[]>()
      .then(({ data }) => {
        if (!cancelled) {
          setPhotosByKey((prev) => ({ ...prev, [key]: data ?? [] }));
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLayoutId, selectedStore]);

  const [latest, ...archived] = photos;

  return (
    <div>
      <section className="mb-4 rounded-lg border border-neutral-800 bg-neutral-900 p-3">
        <h2 className="mb-2 text-sm font-bold text-gray-300">売場を選択</h2>
        <select
          value={selectedLayoutId}
          onChange={(e) => setSelectedLayoutId(e.target.value)}
          className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-gray-100"
        >
          {layouts.map((layout) => (
            <option key={layout.id} value={layout.id}>
              {layout.name}
            </option>
          ))}
        </select>
      </section>

      <section className="mb-4 rounded-lg border border-neutral-800 bg-neutral-900 p-3">
        <h2 className="mb-2 text-sm font-bold text-gray-300">店舗を選択</h2>
        <div className="flex flex-wrap gap-2">
          {stores.map(({ id, name }) => (
            <button
              key={id}
              type="button"
              onClick={() => setSelectedStore(name)}
              className={`rounded-md border px-3 py-1.5 text-xs font-semibold ${
                selectedStore === name
                  ? "border-blue-500 bg-blue-950/60 text-blue-300"
                  : "border-neutral-700 text-gray-400"
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-neutral-800 bg-neutral-900 p-3">
        <h2 className="mb-2 text-sm font-bold text-gray-300">売場写真を選択</h2>

        {loadingPhotos && <LoadingOverlay variant="inline" label="読み込み中..." />}

        {!loadingPhotos && photos.length === 0 && (
          <p className="text-xs text-gray-500">
            この売場・店舗の現在の売場写真がまだありません。先に「本部レイアウト比較」からアップロードしてください。
          </p>
        )}

        {!loadingPhotos && latest && (
          <div className="mb-3">
            <p className="mb-1 text-xs font-medium text-blue-400">現在の売場</p>
            <button
              type="button"
              onClick={() => router.push(`/new-products/${latest.id}`)}
              className="block w-full"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={shelfImagePublicUrl(latest.storage_path)}
                alt="現在の売場写真"
                className="aspect-square w-full rounded-md border border-blue-800 object-cover"
              />
            </button>
          </div>
        )}

        {!loadingPhotos && archived.length > 0 && (
          <div>
            <p className="mb-1 text-xs font-medium text-gray-500">
              過去のアーカイブ
            </p>
            <div className="grid grid-cols-3 gap-2">
              {archived.map((photo) => (
                <button
                  key={photo.id}
                  type="button"
                  onClick={() => router.push(`/new-products/${photo.id}`)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={shelfImagePublicUrl(photo.storage_path)}
                    alt="アーカイブ売場写真"
                    className="aspect-square w-full rounded-md border border-neutral-800 object-cover"
                  />
                  <p className="mt-0.5 text-[10px] text-gray-500">
                    {new Date(photo.created_at).toLocaleDateString("ja-JP")}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
