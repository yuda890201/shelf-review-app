"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { shelfImagePublicUrl } from "@/lib/supabase/storage";
import { compressImage } from "@/lib/image";
import type {
  LayoutCurrentPhotoRow,
  LayoutReferencePhotoRow,
  LayoutRow,
  LayoutTaskRow,
  PinRow,
  Season,
  StoreRow,
} from "@/lib/types";
import LoadingOverlay from "@/components/loading-overlay";
import PhotoAnnotator from "@/components/photo-annotator";

const SEASON_LABEL: Record<Season, string> = {
  spring: "春",
  autumn: "秋",
};

function guessCurrentSeason(): Season {
  const month = new Date().getMonth() + 1;
  return month >= 3 && month <= 8 ? "spring" : "autumn";
}

export default function LayoutDetail({
  layout,
  initialReferencePhotos,
  initialCurrentPhotos,
  initialTasks,
  stores,
  currentUserId,
}: {
  layout: LayoutRow;
  initialReferencePhotos: LayoutReferencePhotoRow[];
  initialCurrentPhotos: LayoutCurrentPhotoRow[];
  initialTasks: LayoutTaskRow[];
  stores: StoreRow[];
  currentUserId: string | null;
}) {
  const supabase = createClient();
  const [referencePhotos, setReferencePhotos] = useState(initialReferencePhotos);
  const [currentPhotos, setCurrentPhotos] = useState(initialCurrentPhotos);
  const [tasks, setTasks] = useState(initialTasks);
  const [selectedStore, setSelectedStore] = useState(stores[0]?.name ?? "");
  const [season, setSeason] = useState<Season>(guessCurrentSeason());
  const [year, setYear] = useState(new Date().getFullYear());
  const [uploadingReference, setUploadingReference] = useState(false);
  const [uploadingCurrent, setUploadingCurrent] = useState(false);
  const [newTask, setNewTask] = useState("");
  const [addingTask, setAddingTask] = useState(false);
  const [referencePins, setReferencePins] = useState<PinRow[]>([]);
  const [currentPins, setCurrentPins] = useState<PinRow[]>([]);

  const referenceCameraRef = useRef<HTMLInputElement>(null);
  const referenceGalleryRef = useRef<HTMLInputElement>(null);
  const currentCameraRef = useRef<HTMLInputElement>(null);
  const currentGalleryRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const channel = supabase
      .channel(`layout-${layout.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "layout_current_photos",
          filter: `layout_id=eq.${layout.id}`,
        },
        (payload) => {
          const row = payload.new as LayoutCurrentPhotoRow;
          setCurrentPhotos((prev) =>
            prev.some((p) => p.id === row.id) ? prev : [row, ...prev],
          );
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "layout_tasks",
          filter: `layout_id=eq.${layout.id}`,
        },
        (payload) => {
          const row = payload.new as LayoutTaskRow;
          setTasks((prev) => (prev.some((t) => t.id === row.id) ? prev : [...prev, row]));
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "layout_tasks",
          filter: `layout_id=eq.${layout.id}`,
        },
        (payload) => {
          const row = payload.new as LayoutTaskRow;
          setTasks((prev) => prev.map((t) => (t.id === row.id ? row : t)));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout.id]);

  const latestReference = referencePhotos[0] ?? null;
  const latestCurrentForStore =
    currentPhotos.find((p) => p.store_name === selectedStore) ?? null;
  const storeTasks = tasks.filter((t) => t.store_name === selectedStore);
  const openTasks = storeTasks.filter((t) => !t.done);
  const doneTasks = storeTasks.filter((t) => t.done);

  useEffect(() => {
    if (!latestReference) return;
    let cancelled = false;
    supabase
      .from("pins")
      .select("*")
      .eq("layout_reference_photo_id", latestReference.id)
      .returns<PinRow[]>()
      .then(({ data }) => {
        if (!cancelled) setReferencePins(data ?? []);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latestReference?.id]);

  useEffect(() => {
    if (!latestCurrentForStore) return;
    let cancelled = false;
    supabase
      .from("pins")
      .select("*")
      .eq("layout_current_photo_id", latestCurrentForStore.id)
      .returns<PinRow[]>()
      .then(({ data }) => {
        if (!cancelled) setCurrentPins(data ?? []);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latestCurrentForStore?.id]);

  async function handleSubmitReferencePin(pin: {
    position_x: number;
    position_y: number;
    width_pct: number;
    height_pct: number;
    rotation_deg: number;
    color: string;
    body: string;
  }) {
    if (!latestReference) return { error: "お手本写真がまだ登録されていません" };
    const { data, error } = await supabase
      .from("pins")
      .insert({ layout_reference_photo_id: latestReference.id, ...pin })
      .select()
      .single<PinRow>();
    if (error) return { error: error.message };
    setReferencePins((prev) => [...prev, data]);
  }

  async function handleSubmitCurrentPin(pin: {
    position_x: number;
    position_y: number;
    width_pct: number;
    height_pct: number;
    rotation_deg: number;
    color: string;
    body: string;
  }) {
    if (!latestCurrentForStore) return { error: "現在の売場写真がまだ登録されていません" };
    const { data, error } = await supabase
      .from("pins")
      .insert({ layout_current_photo_id: latestCurrentForStore.id, ...pin })
      .select()
      .single<PinRow>();
    if (error) return { error: error.message };
    setCurrentPins((prev) => [...prev, data]);
  }

  async function handleReferenceFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    e.target.value = "";
    if (!file || !currentUserId) return;

    setUploadingReference(true);
    try {
      const compressed = await compressImage(file);
      const ext = compressed.name.split(".").pop() || "jpg";
      const storagePath = `${currentUserId}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("shelf-images")
        .upload(storagePath, compressed);
      if (uploadError) throw uploadError;

      const { data, error } = await supabase
        .from("layout_reference_photos")
        .insert({
          layout_id: layout.id,
          season,
          year,
          storage_path: storagePath,
          uploaded_by: currentUserId,
        })
        .select()
        .single<LayoutReferencePhotoRow>();
      if (error) throw error;

      setReferencePhotos((prev) => [data, ...prev]);
    } catch (err) {
      alert(
        `お手本写真の登録に失敗しました: ${
          err instanceof Error ? err.message : "エラー"
        }`,
      );
    }
    setUploadingReference(false);
  }

  async function handleCurrentFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    e.target.value = "";
    if (!file || !currentUserId) return;

    setUploadingCurrent(true);
    try {
      const compressed = await compressImage(file);
      const ext = compressed.name.split(".").pop() || "jpg";
      const storagePath = `${currentUserId}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("shelf-images")
        .upload(storagePath, compressed);
      if (uploadError) throw uploadError;

      const { data, error } = await supabase
        .from("layout_current_photos")
        .insert({
          layout_id: layout.id,
          store_name: selectedStore,
          storage_path: storagePath,
          uploaded_by: currentUserId,
        })
        .select()
        .single<LayoutCurrentPhotoRow>();
      if (error) throw error;

      setCurrentPhotos((prev) => [data, ...prev]);
    } catch (err) {
      alert(
        `現在の売場写真の登録に失敗しました: ${
          err instanceof Error ? err.message : "エラー"
        }`,
      );
    }
    setUploadingCurrent(false);
  }

  async function handleAddTask(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newTask.trim();
    if (!trimmed || !currentUserId) return;
    setAddingTask(true);
    const { data, error } = await supabase
      .from("layout_tasks")
      .insert({
        layout_id: layout.id,
        store_name: selectedStore,
        body: trimmed,
        author_id: currentUserId,
      })
      .select()
      .single<LayoutTaskRow>();
    if (!error && data) {
      setTasks((prev) => [...prev, data]);
      setNewTask("");
    } else if (error) {
      alert(`タスクの追加に失敗しました: ${error.message}`);
    }
    setAddingTask(false);
  }

  async function handleToggleTask(task: LayoutTaskRow) {
    const nowIso = new Date().toISOString();
    const nextDone = !task.done;
    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id
          ? { ...t, done: nextDone, done_at: nextDone ? nowIso : null }
          : t,
      ),
    );
    const { error } = await supabase
      .from("layout_tasks")
      .update({ done: nextDone, done_at: nextDone ? nowIso : null })
      .eq("id", task.id);
    if (error) {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)));
      alert(`更新に失敗しました: ${error.message}`);
    }
  }

  return (
    <div>
      {uploadingReference && <LoadingOverlay label="お手本写真を登録中..." />}
      {uploadingCurrent && <LoadingOverlay label="現在の売場写真を登録中..." />}

      <h1 className="mb-4 text-lg font-bold text-gray-100">{layout.name}</h1>

      <div className="mb-4 rounded-lg border border-neutral-800 bg-neutral-900 p-3">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-300">本部お手本写真</h2>
          {latestReference && (
            <span className="text-xs text-gray-500">
              {latestReference.year}年{SEASON_LABEL[latestReference.season]}
            </span>
          )}
        </div>

        <div className="mb-2 flex gap-2">
          {(["spring", "autumn"] as Season[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSeason(s)}
              className={`flex-1 rounded-md border px-2 py-1.5 text-xs font-semibold ${
                season === s
                  ? "border-blue-500 bg-blue-950/60 text-blue-300"
                  : "border-neutral-600 text-gray-400"
              }`}
            >
              {SEASON_LABEL[s]}
            </button>
          ))}
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="w-20 rounded-md border border-neutral-600 bg-neutral-800 px-2 py-1.5 text-center text-xs text-gray-100"
          />
        </div>

        <input
          ref={referenceCameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleReferenceFileSelected}
          className="hidden"
        />
        <input
          ref={referenceGalleryRef}
          type="file"
          accept="image/*"
          onChange={handleReferenceFileSelected}
          className="hidden"
        />

        {latestReference && (
          <div className="mb-2">
            <PhotoAnnotator
              photoUrl={shelfImagePublicUrl(latestReference.storage_path)}
              pins={referencePins}
              currentUserId={currentUserId}
              onSubmit={handleSubmitReferencePin}
              hint="画像をタップして、コメントを貼り付けてください。"
            />
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => referenceCameraRef.current?.click()}
            disabled={uploadingReference}
            className="flex-1 rounded-md bg-blue-600 px-2 py-2 text-xs font-semibold text-white disabled:opacity-50"
          >
            📷 {latestReference ? "撮り直す" : "撮影する"}
          </button>
          <button
            type="button"
            onClick={() => referenceGalleryRef.current?.click()}
            disabled={uploadingReference}
            className="flex-1 rounded-md border border-neutral-600 px-2 py-2 text-xs text-gray-200 disabled:opacity-50"
          >
            カメラロールから選ぶ
          </button>
        </div>
      </div>

      <div className="mb-4 flex gap-2">
        {stores.map(({ id, name }) => (
          <button
            key={id}
            type="button"
            onClick={() => setSelectedStore(name)}
            className={`flex-1 rounded-md border px-2 py-2 text-xs font-semibold ${
              selectedStore === name
                ? "border-blue-500 bg-blue-950/60 text-blue-300"
                : "border-neutral-700 text-gray-400"
            }`}
          >
            {name}
          </button>
        ))}
      </div>

      <div className="mb-4">
        <h2 className="mb-2 text-sm font-bold text-gray-300">
          {selectedStore}の現在の売場
        </h2>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="mb-1 text-center text-xs font-medium text-gray-500">
              本部お手本
            </p>
            {latestReference ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={shelfImagePublicUrl(latestReference.storage_path)}
                alt="本部お手本写真"
                className="aspect-square w-full rounded-md border border-neutral-800 object-cover"
              />
            ) : (
              <div className="flex aspect-square w-full items-center justify-center rounded-md border border-neutral-800 bg-neutral-900 text-[11px] text-gray-600">
                未登録
              </div>
            )}
          </div>
          <div>
            <p className="mb-1 text-center text-xs font-medium text-blue-400">
              現在の売場
            </p>
            {latestCurrentForStore ? (
              <PhotoAnnotator
                photoUrl={shelfImagePublicUrl(latestCurrentForStore.storage_path)}
                pins={currentPins}
                currentUserId={currentUserId}
                onSubmit={handleSubmitCurrentPin}
                hint="タップしてコメントを貼り付け"
              />
            ) : (
              <div className="flex aspect-square w-full items-center justify-center rounded-md border border-blue-900 bg-neutral-900 text-[11px] text-gray-600">
                未登録
              </div>
            )}
          </div>
        </div>

        <input
          ref={currentCameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleCurrentFileSelected}
          className="hidden"
        />
        <input
          ref={currentGalleryRef}
          type="file"
          accept="image/*"
          onChange={handleCurrentFileSelected}
          className="hidden"
        />
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => currentCameraRef.current?.click()}
            disabled={uploadingCurrent}
            className="flex-1 rounded-md bg-blue-600 px-2 py-2 text-xs font-semibold text-white disabled:opacity-50"
          >
            📷 {latestCurrentForStore ? "撮り直す" : "撮影する"}
          </button>
          <button
            type="button"
            onClick={() => currentGalleryRef.current?.click()}
            disabled={uploadingCurrent}
            className="flex-1 rounded-md border border-neutral-600 px-2 py-2 text-xs text-gray-200 disabled:opacity-50"
          >
            カメラロールから選ぶ
          </button>
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-bold text-gray-300">
          {selectedStore}のタスク ({doneTasks.length}/{storeTasks.length}完了)
        </h2>

        <form onSubmit={handleAddTask} className="mb-3 flex gap-2">
          <input
            type="text"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            placeholder="やるべきことを入力..."
            className="min-w-0 flex-1 rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-base text-gray-100 placeholder-gray-500"
          />
          <button
            type="submit"
            disabled={addingTask || !newTask.trim()}
            className="shrink-0 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            追加
          </button>
        </form>

        {storeTasks.length === 0 && (
          <p className="text-xs text-gray-500">まだタスクがありません。</p>
        )}

        <ul className="flex flex-col gap-2">
          {[...openTasks, ...doneTasks].map((task) => (
            <li
              key={task.id}
              className={`flex items-start gap-2 rounded-md border p-2 ${
                task.done
                  ? "border-neutral-800 bg-neutral-900/50"
                  : "border-neutral-700 bg-neutral-900"
              }`}
            >
              <button
                type="button"
                onClick={() => handleToggleTask(task)}
                aria-label={task.done ? "未完了に戻す" : "完了にする"}
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs ${
                  task.done
                    ? "border-blue-500 bg-blue-600 text-white"
                    : "border-neutral-500 text-transparent"
                }`}
              >
                ✓
              </button>
              <p
                className={`whitespace-pre-wrap text-sm ${
                  task.done ? "text-gray-500 line-through" : "text-gray-200"
                }`}
              >
                {task.body}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
