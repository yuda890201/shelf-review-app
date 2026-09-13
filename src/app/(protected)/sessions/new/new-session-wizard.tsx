"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { uploadShelfImage } from "@/lib/upload-image";
import { useI18n } from "@/lib/i18n/provider";
import type { DeliveryTruckRow, LayoutRow, StoreRow } from "@/lib/types";
import LoadingOverlay from "@/components/loading-overlay";

type Step = "store" | "truck" | "truckOther" | "gondola" | "camera" | "uploading";

const MAX_FILES = 5;

/** ゴンドラを選ばずに撮る場合の集計用キー。 */
const NO_GONDOLA = "__none__";

type Gondola = { id: string; name: string };

export default function NewSessionWizard({
  stores,
  trucks,
  gondolas,
  gondolaIdsByTruck,
}: {
  stores: StoreRow[];
  trucks: DeliveryTruckRow[];
  gondolas: LayoutRow[];
  gondolaIdsByTruck: Record<string, string[]>;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("store");
  const [store, setStore] = useState("");
  const [truck, setTruck] = useState("");
  const [truckId, setTruckId] = useState<string | null>(null);
  const [customTruck, setCustomTruck] = useState("");
  const [gondola, setGondola] = useState<Gondola | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  /** ゴンドラごとの撮影済み枚数。1便で複数ゴンドラを回るときの進捗表示に使う。 */
  const [shotCounts, setShotCounts] = useState<Record<string, number>>({});
  const [createdIds, setCreatedIds] = useState<string[]>([]);

  const gondolaById = useMemo(
    () => new Map(gondolas.map((g) => [g.id, g])),
    [gondolas],
  );

  // 選んだ便に紐づくゴンドラを上に、それ以外を「その他のゴンドラ」として下に出す。
  // 紐づけがまだ無い便(「その他」で手入力した便を含む)では全ゴンドラを候補にする。
  const { linkedGondolas, otherGondolas } = useMemo(() => {
    const linkedIds = truckId ? (gondolaIdsByTruck[truckId] ?? []) : [];
    const linked = linkedIds
      .map((id) => gondolaById.get(id))
      .filter((g): g is LayoutRow => !!g);
    const linkedSet = new Set(linked.map((g) => g.id));
    return {
      linkedGondolas: linked,
      otherGondolas: gondolas.filter((g) => !linkedSet.has(g.id)),
    };
  }, [truckId, gondolaIdsByTruck, gondolaById, gondolas]);

  function selectStore(name: string) {
    setStore(name);
    setStep("truck");
  }

  function selectTruck(row: DeliveryTruckRow) {
    setTruck(row.name);
    setTruckId(row.id);
    setStep("gondola");
  }

  function confirmCustomTruck() {
    const trimmed = customTruck.trim();
    if (!trimmed) return;
    setTruck(trimmed);
    setTruckId(null);
    setStep("gondola");
  }

  function selectGondola(next: Gondola | null) {
    setGondola(next);
    setErrorMessage("");
    setStep("camera");
  }

  function finish() {
    if (createdIds.length === 1) {
      router.push(`/?session=${createdIds[0]}`);
    } else {
      router.push("/");
    }
  }

  async function createSessionFromFile(
    file: File,
    userId: string,
  ): Promise<string> {
    const supabase = createClient();
    const paths = await uploadShelfImage(supabase, userId, file);

    const { data: image, error: imageError } = await supabase
      .from("images")
      .insert({
        ...paths,
        uploaded_by: userId,
        store_name: store,
        // shelf_category という列名のまま納品トラック名を保存している
        // (元は売場カテゴリだったが、運用実態が納品トラック単位だったため
        // 意味だけ読み替えた。列のリネームは別マイグレーションが必要)
        shelf_category: truck,
      })
      .select()
      .single();
    if (imageError) throw imageError;

    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .insert({
        image_id: image.id,
        title: `${store} ${truck}`,
        facilitator_id: userId,
        status: "open",
        // 撮影時にゴンドラが分かっているので、後から誰かに紐づけてもらう必要がない。
        layout_id: gondola?.id ?? null,
      })
      .select()
      .single();
    if (sessionError) throw sessionError;

    fetch("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "new_session",
        sessionId: session.id,
        authorId: userId,
        store,
        category: gondola ? `${truck} / ${gondola.name}` : truck,
      }),
    }).catch(() => {});

    return session.id as string;
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const allFiles = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (allFiles.length === 0) return;
    const files = allFiles.slice(0, MAX_FILES);

    setStep("uploading");
    setErrorMessage("");
    setProgress({ done: 0, total: files.length });

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setErrorMessage(t.common.loginRequired);
      setStep("camera");
      return;
    }

    const sessionIds: string[] = [];
    const failures: string[] = [];

    for (const file of files) {
      try {
        sessionIds.push(await createSessionFromFile(file, user.id));
      } catch (err) {
        failures.push(err instanceof Error ? err.message : t.common.error);
      }
      setProgress((prev) => ({ ...prev, done: prev.done + 1 }));
    }

    if (sessionIds.length === 0) {
      setErrorMessage(
        failures[0]
          ? t.wizard.uploadFailedWith(failures[0])
          : t.wizard.uploadFailed,
      );
      setStep("camera");
      return;
    }

    if (failures.length > 0) {
      alert(t.wizard.partialFailure(sessionIds.length, failures.length));
    }

    const key = gondola?.id ?? NO_GONDOLA;
    setShotCounts((prev) => ({
      ...prev,
      [key]: (prev[key] ?? 0) + sessionIds.length,
    }));
    setCreatedIds((prev) => [...prev, ...sessionIds]);
    // 1便で複数のゴンドラを回れるよう、撮り終えたらゴンドラ選択に戻る。
    setGondola(null);
    setStep("gondola");
  }

  // コンポーネントとしてではなく素の関数として描画する。毎回の再描画で
  // 新しいコンポーネント型が作られると、ボタンが丸ごと作り直されてしまうため。
  function renderGondola(item: Gondola) {
    const count = shotCounts[item.id] ?? 0;
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => selectGondola(item)}
        className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-3 text-left active:bg-blue-950/50 ${
          count > 0
            ? "border-blue-800 bg-blue-950/30"
            : "border-neutral-700 bg-neutral-900"
        }`}
      >
        <span className="min-w-0 truncate text-sm font-semibold text-gray-100">
          {count > 0 ? "✅ " : "📷 "}
          {item.name}
        </span>
        <span className="shrink-0 text-[11px] text-gray-500">
          {count > 0 ? t.wizard.shot(count) : t.wizard.notShot}
        </span>
      </button>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      {step === "store" && (
        <div>
          <h1 className="mb-4 text-lg font-bold text-gray-100">
            {t.wizard.selectStore}
          </h1>
          {stores.length === 0 && (
            <p className="text-sm text-gray-500">{t.wizard.noStores}</p>
          )}
          <div className="flex flex-col gap-3">
            {stores.map(({ id, name }) => (
              <button
                key={id}
                type="button"
                onClick={() => selectStore(name)}
                className="rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-4 text-base font-semibold text-gray-100 active:bg-blue-950/50"
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === "truck" && (
        <div>
          <h1 className="mb-1 text-lg font-bold text-gray-100">
            {t.wizard.selectTruck}
          </h1>
          <p className="mb-4 text-xs text-gray-500">
            {t.wizard.storeLabel(store)}
          </p>
          <div className="grid grid-cols-2 gap-3">
            {trucks.map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => selectTruck(row)}
                className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-4 text-sm font-semibold text-gray-100 active:bg-blue-950/50"
              >
                {row.name}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setStep("truckOther")}
              className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-4 text-sm font-semibold text-gray-100 active:bg-blue-950/50"
            >
              {t.wizard.other}
            </button>
          </div>
          <button
            type="button"
            onClick={() => setStep("store")}
            className="mt-4 text-xs text-gray-500 underline"
          >
            {t.wizard.backToStore}
          </button>
        </div>
      )}

      {step === "truckOther" && (
        <div>
          <h1 className="mb-1 text-lg font-bold text-gray-100">
            {t.wizard.truckNameTitle}
          </h1>
          <p className="mb-4 text-xs text-gray-500">
            {t.wizard.storeLabel(store)}
          </p>
          <input
            type="text"
            autoFocus
            value={customTruck}
            onChange={(e) => setCustomTruck(e.target.value)}
            placeholder={t.wizard.truckNamePlaceholder}
            className="mb-3 w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-3 text-base text-gray-100 placeholder-gray-500"
          />
          <button
            type="button"
            onClick={confirmCustomTruck}
            disabled={!customTruck.trim()}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 text-base font-semibold text-white disabled:opacity-50"
          >
            {t.common.next}
          </button>
          <button
            type="button"
            onClick={() => setStep("truck")}
            className="mt-4 text-xs text-gray-500 underline"
          >
            {t.wizard.backToTruck}
          </button>
        </div>
      )}

      {step === "gondola" && (
        <div>
          <h1 className="mb-1 text-lg font-bold text-gray-100">
            {t.wizard.selectGondola}
          </h1>
          <p className="text-xs text-gray-500">
            {t.wizard.contextLabel(store, truck, null)}
          </p>
          <p className="mb-4 mt-1 text-xs text-gray-500">
            {t.wizard.gondolaHelp}
          </p>

          {gondolas.length === 0 && (
            <p className="mb-4 text-sm text-gray-500">{t.wizard.noGondolas}</p>
          )}

          {gondolas.length > 0 && linkedGondolas.length === 0 && (
            <p className="mb-4 text-xs text-amber-400">
              {t.wizard.noGondolasForTruck}
            </p>
          )}

          {linkedGondolas.length > 0 && (
            <div className="mb-4">
              <p className="mb-2 text-xs font-bold text-gray-400">
                {t.wizard.linkedGondolas}
              </p>
              <div className="flex flex-col gap-2">
                {linkedGondolas.map(renderGondola)}
              </div>
            </div>
          )}

          {otherGondolas.length > 0 && (
            <details className="mb-4">
              <summary className="cursor-pointer text-xs font-bold text-gray-400">
                {t.wizard.otherGondolas} ({otherGondolas.length})
              </summary>
              <div className="mt-2 flex flex-col gap-2">
                {otherGondolas.map(renderGondola)}
              </div>
            </details>
          )}

          <button
            type="button"
            onClick={() => selectGondola(null)}
            className="w-full rounded-lg border border-dashed border-neutral-600 px-3 py-3 text-sm text-gray-400 active:bg-neutral-800"
          >
            {shotCounts[NO_GONDOLA]
              ? `${t.wizard.skipGondola} (${t.wizard.shot(shotCounts[NO_GONDOLA])})`
              : t.wizard.skipGondola}
          </button>

          {createdIds.length > 0 && (
            <div className="mt-6 border-t border-neutral-800 pt-4">
              <p className="mb-2 text-xs text-gray-500">
                {t.wizard.finishHint(createdIds.length)}
              </p>
              <button
                type="button"
                onClick={finish}
                className="w-full rounded-lg bg-blue-600 px-4 py-3 text-base font-bold text-white active:bg-blue-700"
              >
                {t.wizard.finish}
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setStep("truck")}
            className="mt-4 text-xs text-gray-500 underline"
          >
            {t.wizard.backToTruck}
          </button>
        </div>
      )}

      {step === "camera" && (
        <div>
          <h1 className="mb-1 text-lg font-bold text-gray-100">
            {t.wizard.takePhoto}
          </h1>
          <p className="mb-6 text-xs text-gray-500">
            {t.wizard.contextLabel(store, truck, gondola?.name ?? null)}
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelected}
            className="hidden"
          />
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelected}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full rounded-lg bg-blue-600 px-4 py-8 text-xl font-bold text-white active:bg-blue-700"
          >
            {t.wizard.cameraButton}
          </button>
          <button
            type="button"
            onClick={() => galleryInputRef.current?.click()}
            className="mt-3 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-gray-300 active:bg-neutral-800"
          >
            {t.wizard.galleryButton(MAX_FILES)}
          </button>
          {errorMessage && (
            <p className="mt-3 text-sm text-red-400">{errorMessage}</p>
          )}
          <button
            type="button"
            onClick={() => setStep("gondola")}
            className="mt-4 text-xs text-gray-500 underline"
          >
            {t.wizard.backToGondola}
          </button>
        </div>
      )}

      {step === "uploading" && (
        <LoadingOverlay
          label={
            progress.total > 1
              ? t.wizard.uploadingProgress(progress.done, progress.total)
              : t.wizard.uploading
          }
        />
      )}
    </div>
  );
}
