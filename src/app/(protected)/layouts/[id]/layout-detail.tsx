"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { shelfImagePublicUrl, shelfImageThumbUrl } from "@/lib/supabase/storage";
import { uploadShelfImage } from "@/lib/upload-image";
import { useI18n } from "@/lib/i18n/provider";
import type {
  LayoutCurrentPhotoRow,
  LayoutReferencePhotoRow,
  LayoutRow,
  LayoutTaskRow,
  PinObjectKind,
  PinRow,
  Season,
  StoreRow,
} from "@/lib/types";
import LoadingOverlay from "@/components/loading-overlay";
import PhotoAnnotator from "@/components/photo-annotator";
import PhotoViewer, { type ViewerPin } from "@/components/photo-viewer";

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
  const { t } = useI18n();
  const seasonLabel = (season: Season) =>
    season === "spring" ? t.layoutDetail.seasonSpring : t.layoutDetail.seasonAutumn;
  const [referencePhotos, setReferencePhotos] = useState(initialReferencePhotos);
  const [currentPhotos, setCurrentPhotos] = useState(initialCurrentPhotos);
  const [tasks, setTasks] = useState(initialTasks);
  const [selectedStore, setSelectedStore] = useState(stores[0]?.name ?? "");
  const [season, setSeason] = useState<Season>(guessCurrentSeason());
  const [uploadingReference, setUploadingReference] = useState(false);
  const [uploadingCurrent, setUploadingCurrent] = useState(false);
  const [newTask, setNewTask] = useState("");
  const [addingTask, setAddingTask] = useState(false);
  /** 拡大ビューアで開いている写真。お手本と現在の売場を同じ仕組みで見る。 */
  const [viewing, setViewing] = useState<
    { url: string; alt: string; pins: ViewerPin[] } | null
  >(null);
  const [referencePinsById, setReferencePinsById] = useState<Record<string, PinRow[]>>({});
  const [currentPinsById, setCurrentPinsById] = useState<Record<string, PinRow[]>>({});

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

  const referencePins = latestReference
    ? (referencePinsById[latestReference.id] ?? [])
    : [];
  const currentPins = latestCurrentForStore
    ? (currentPinsById[latestCurrentForStore.id] ?? [])
    : [];
  const loadingReferencePins =
    !!latestReference && !(latestReference.id in referencePinsById);
  const loadingCurrentPins =
    !!latestCurrentForStore && !(latestCurrentForStore.id in currentPinsById);

  useEffect(() => {
    if (!latestReference) return;
    let cancelled = false;
    const referenceId = latestReference.id;
    supabase
      .from("pins")
      .select("*")
      .eq("layout_reference_photo_id", referenceId)
      .returns<PinRow[]>()
      .then(({ data }) => {
        if (!cancelled) {
          setReferencePinsById((prev) => ({ ...prev, [referenceId]: data ?? [] }));
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latestReference?.id]);

  useEffect(() => {
    if (!latestCurrentForStore) return;
    let cancelled = false;
    const currentId = latestCurrentForStore.id;
    supabase
      .from("pins")
      .select("*")
      .eq("layout_current_photo_id", currentId)
      .returns<PinRow[]>()
      .then(({ data }) => {
        if (!cancelled) {
          setCurrentPinsById((prev) => ({ ...prev, [currentId]: data ?? [] }));
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latestCurrentForStore?.id]);

  async function handleSubmitReferencePin(pin: {
    position_x: number;
    position_y: number;
    end_position_x: number | null;
    end_position_y: number | null;
    width_pct: number;
    height_pct: number;
    rotation_deg: number;
    color: string;
    body: string;
    object_kind: PinObjectKind | null;
  }) {
    if (!latestReference) return { error: t.layoutDetail.referenceMissing };
    const { data, error } = await supabase
      .from("pins")
      .insert({ layout_reference_photo_id: latestReference.id, ...pin })
      .select()
      .single<PinRow>();
    if (error) return { error: error.message };
    setReferencePinsById((prev) => ({
      ...prev,
      [latestReference.id]: [...(prev[latestReference.id] ?? []), data],
    }));
  }

  async function handleSubmitCurrentPin(pin: {
    position_x: number;
    position_y: number;
    end_position_x: number | null;
    end_position_y: number | null;
    width_pct: number;
    height_pct: number;
    rotation_deg: number;
    color: string;
    body: string;
    object_kind: PinObjectKind | null;
  }) {
    if (!latestCurrentForStore) return { error: t.layoutDetail.currentMissing };
    const { data, error } = await supabase
      .from("pins")
      .insert({ layout_current_photo_id: latestCurrentForStore.id, ...pin })
      .select()
      .single<PinRow>();
    if (error) return { error: error.message };
    setCurrentPinsById((prev) => ({
      ...prev,
      [latestCurrentForStore.id]: [...(prev[latestCurrentForStore.id] ?? []), data],
    }));
  }

  async function handleReferenceFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    e.target.value = "";
    if (!file || !currentUserId) return;

    setUploadingReference(true);
    try {
      const paths = await uploadShelfImage(supabase, currentUserId, file);

      const { data, error } = await supabase
        .from("layout_reference_photos")
        .insert({
          layout_id: layout.id,
          season,
          // year列は今後使わないが、既存のNOT NULL制約を満たすため現在年を入れておく
          year: new Date().getFullYear(),
          ...paths,
          uploaded_by: currentUserId,
        })
        .select()
        .single<LayoutReferencePhotoRow>();
      if (error) throw error;

      setReferencePhotos((prev) => [data, ...prev]);
    } catch (err) {
      alert(
        t.layoutDetail.referenceFailed(
          err instanceof Error ? err.message : t.common.error,
        ),
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
      const paths = await uploadShelfImage(supabase, currentUserId, file);

      const { data, error } = await supabase
        .from("layout_current_photos")
        .insert({
          layout_id: layout.id,
          store_name: selectedStore,
          ...paths,
          uploaded_by: currentUserId,
        })
        .select()
        .single<LayoutCurrentPhotoRow>();
      if (error) throw error;

      setCurrentPhotos((prev) => [data, ...prev]);
    } catch (err) {
      alert(
        t.layoutDetail.currentFailed(
          err instanceof Error ? err.message : t.common.error,
        ),
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
      alert(t.layoutDetail.taskFailed(error.message));
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
      setTasks((prev) => prev.map((row) => (row.id === task.id ? task : row)));
      alert(t.common.updateFailed(error.message));
    }
  }

  return (
    <div>
      {viewing && (
        <PhotoViewer
          photoUrl={viewing.url}
          alt={viewing.alt}
          pins={viewing.pins}
          onClose={() => setViewing(null)}
        />
      )}

      {uploadingReference && (
        <LoadingOverlay label={t.layoutDetail.referenceUploading} />
      )}
      {uploadingCurrent && (
        <LoadingOverlay label={t.layoutDetail.currentUploading} />
      )}

      <h1 className="mb-4 text-lg font-bold text-gray-100">{layout.name}</h1>

      <div className="mb-4 rounded-lg border border-neutral-800 bg-neutral-900 p-3">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-300">
            {t.layoutDetail.referenceTitle}
          </h2>
          {latestReference && (
            <span className="text-xs text-gray-500">
              {seasonLabel(latestReference.season)}
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
              {seasonLabel(s)}
            </button>
          ))}
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
            {loadingReferencePins ? (
              <LoadingOverlay variant="inline" label={t.common.loading} />
            ) : (
              <PhotoAnnotator
                photoUrl={shelfImageThumbUrl(latestReference)}
                pins={referencePins}
                currentUserId={currentUserId}
                onSubmit={handleSubmitReferencePin}
              />
            )}
          </div>
        )}

        <div className="flex gap-2">
          {latestReference && (
            <button
              type="button"
              onClick={() =>
                setViewing({
                  url: shelfImagePublicUrl(latestReference.storage_path),
                  alt: t.layoutDetail.referenceAlt,
                  pins: referencePins,
                })
              }
              className="shrink-0 rounded-md border border-neutral-600 px-3 py-2 text-xs text-gray-200"
              aria-label={t.viewer.open}
            >
              🔍
            </button>
          )}
          <button
            type="button"
            onClick={() => referenceCameraRef.current?.click()}
            disabled={uploadingReference}
            className="flex-1 rounded-md bg-blue-600 px-2 py-2 text-xs font-semibold text-white disabled:opacity-50"
          >
            {latestReference ? t.common.retake : t.common.camera}
          </button>
          <button
            type="button"
            onClick={() => referenceGalleryRef.current?.click()}
            disabled={uploadingReference}
            className="flex-1 rounded-md border border-neutral-600 px-2 py-2 text-xs text-gray-200 disabled:opacity-50"
          >
            {t.common.fromGallery}
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
          {t.layoutDetail.currentTitle(selectedStore)}
        </h2>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="mb-1 text-center text-xs font-medium text-gray-500">
              {t.layoutDetail.referenceShort}
            </p>
            {latestReference ? (
              <button
                type="button"
                onClick={() =>
                  setViewing({
                    url: shelfImagePublicUrl(latestReference.storage_path),
                    alt: t.layoutDetail.referenceAlt,
                    pins: referencePins,
                  })
                }
                className="block w-full"
                aria-label={t.viewer.open}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={shelfImageThumbUrl(latestReference)}
                  alt={t.layoutDetail.referenceAlt}
                  loading="lazy"
                  decoding="async"
                  className="aspect-square w-full rounded-md border border-neutral-800 object-cover"
                />
              </button>
            ) : (
              <div className="flex aspect-square w-full items-center justify-center rounded-md border border-neutral-800 bg-neutral-900 text-[11px] text-gray-600">
                {t.common.notRegistered}
              </div>
            )}
          </div>
          <div>
            <p className="mb-1 text-center text-xs font-medium text-blue-400">
              {t.layoutDetail.currentShort}
            </p>
            {latestCurrentForStore ? (
              loadingCurrentPins ? (
                <LoadingOverlay variant="inline" label={t.common.loading} />
              ) : (
                <PhotoAnnotator
                  photoUrl={shelfImageThumbUrl(latestCurrentForStore)}
                  pins={currentPins}
                  currentUserId={currentUserId}
                  onSubmit={handleSubmitCurrentPin}
                  hint={t.pin.hintTapOnly}
                />
              )
            ) : (
              <div className="flex aspect-square w-full items-center justify-center rounded-md border border-blue-900 bg-neutral-900 text-[11px] text-gray-600">
                {t.common.notRegistered}
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
          {latestCurrentForStore && (
            <button
              type="button"
              onClick={() =>
                setViewing({
                  url: shelfImagePublicUrl(latestCurrentForStore.storage_path),
                  alt: t.layoutDetail.currentShort,
                  pins: currentPins,
                })
              }
              className="shrink-0 rounded-md border border-neutral-600 px-3 py-2 text-xs text-gray-200"
              aria-label={t.viewer.open}
            >
              🔍
            </button>
          )}
          <button
            type="button"
            onClick={() => currentCameraRef.current?.click()}
            disabled={uploadingCurrent}
            className="flex-1 rounded-md bg-blue-600 px-2 py-2 text-xs font-semibold text-white disabled:opacity-50"
          >
            {latestCurrentForStore ? t.common.retake : t.common.camera}
          </button>
          <button
            type="button"
            onClick={() => currentGalleryRef.current?.click()}
            disabled={uploadingCurrent}
            className="flex-1 rounded-md border border-neutral-600 px-2 py-2 text-xs text-gray-200 disabled:opacity-50"
          >
            {t.common.fromGallery}
          </button>
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-bold text-gray-300">
          {t.layoutDetail.tasksTitle(
            selectedStore,
            doneTasks.length,
            storeTasks.length,
          )}
        </h2>

        <form onSubmit={handleAddTask} className="mb-3 flex gap-2">
          <input
            type="text"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            placeholder={t.layoutDetail.taskPlaceholder}
            className="min-w-0 flex-1 rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-base text-gray-100 placeholder-gray-500"
          />
          <button
            type="submit"
            disabled={addingTask || !newTask.trim()}
            className="shrink-0 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {t.common.add}
          </button>
        </form>

        {storeTasks.length === 0 && (
          <p className="text-xs text-gray-500">{t.layoutDetail.taskEmpty}</p>
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
                aria-label={
                  task.done ? t.layoutDetail.taskUncheck : t.layoutDetail.taskCheck
                }
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
