"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { compressImage } from "@/lib/image";
import type { DeliveryTruckRow, StoreRow } from "@/lib/types";
import LoadingOverlay from "@/components/loading-overlay";

type Step = "store" | "truck" | "truckOther" | "camera" | "uploading";

const MAX_FILES = 5;
const OTHER = "その他";

export default function NewSessionWizard({
  stores,
  trucks,
}: {
  stores: StoreRow[];
  trucks: DeliveryTruckRow[];
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("store");
  const [store, setStore] = useState("");
  const [truck, setTruck] = useState("");
  const [customTruck, setCustomTruck] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  function selectStore(name: string) {
    setStore(name);
    setStep("truck");
  }

  function selectTruck(name: string) {
    if (name === OTHER) {
      setStep("truckOther");
      return;
    }
    setTruck(name);
    setStep("camera");
  }

  function confirmCustomTruck() {
    const trimmed = customTruck.trim();
    if (!trimmed) return;
    setTruck(trimmed);
    setStep("camera");
  }

  async function createSessionFromFile(
    file: File,
    userId: string,
  ): Promise<string> {
    const supabase = createClient();
    const compressed = await compressImage(file);
    const ext = compressed.name.split(".").pop() || "jpg";
    const storagePath = `${userId}/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("shelf-images")
      .upload(storagePath, compressed);
    if (uploadError) throw uploadError;

    const { data: image, error: imageError } = await supabase
      .from("images")
      .insert({
        storage_path: storagePath,
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
        category: truck,
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
      setErrorMessage("ログインが必要です。");
      setStep("camera");
      return;
    }

    const sessionIds: string[] = [];
    const failures: string[] = [];

    for (const file of files) {
      try {
        const sessionId = await createSessionFromFile(file, user.id);
        sessionIds.push(sessionId);
      } catch (err) {
        failures.push(err instanceof Error ? err.message : "エラー");
      }
      setProgress((prev) => ({ ...prev, done: prev.done + 1 }));
    }

    if (sessionIds.length === 0) {
      setErrorMessage(
        failures[0]
          ? `アップロードに失敗しました: ${failures[0]}`
          : "アップロードに失敗しました。",
      );
      setStep("camera");
      return;
    }

    if (failures.length > 0) {
      alert(
        `${sessionIds.length}件は作成できましたが、${failures.length}件失敗しました。`,
      );
    }

    if (sessionIds.length === 1) {
      router.push(`/?session=${sessionIds[0]}`);
    } else {
      router.push("/");
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      {step === "store" && (
        <div>
          <h1 className="mb-4 text-lg font-bold text-gray-100">店舗を選んでください</h1>
          {stores.length === 0 && (
            <p className="text-sm text-gray-500">
              店舗が登録されていません。マイページの「店舗・納品トラックの管理」から追加してください。
            </p>
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
          <h1 className="mb-1 text-lg font-bold text-gray-100">納品トラックを選んでください</h1>
          <p className="mb-4 text-xs text-gray-500">店舗: {store}</p>
          <div className="grid grid-cols-2 gap-3">
            {trucks.map(({ id, name }) => (
              <button
                key={id}
                type="button"
                onClick={() => selectTruck(name)}
                className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-4 text-sm font-semibold text-gray-100 active:bg-blue-950/50"
              >
                {name}
              </button>
            ))}
            <button
              type="button"
              onClick={() => selectTruck(OTHER)}
              className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-4 text-sm font-semibold text-gray-100 active:bg-blue-950/50"
            >
              {OTHER}
            </button>
          </div>
          <button
            type="button"
            onClick={() => setStep("store")}
            className="mt-4 text-xs text-gray-500 underline"
          >
            店舗選択に戻る
          </button>
        </div>
      )}

      {step === "truckOther" && (
        <div>
          <h1 className="mb-1 text-lg font-bold text-gray-100">納品トラックの名前を入力してください</h1>
          <p className="mb-4 text-xs text-gray-500">店舗: {store}</p>
          <input
            type="text"
            autoFocus
            value={customTruck}
            onChange={(e) => setCustomTruck(e.target.value)}
            placeholder="例: センター4便"
            className="mb-3 w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-3 text-base text-gray-100 placeholder-gray-500"
          />
          <button
            type="button"
            onClick={confirmCustomTruck}
            disabled={!customTruck.trim()}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 text-base font-semibold text-white disabled:opacity-50"
          >
            次へ
          </button>
          <button
            type="button"
            onClick={() => setStep("truck")}
            className="mt-4 text-xs text-gray-500 underline"
          >
            納品トラック選択に戻る
          </button>
        </div>
      )}

      {step === "camera" && (
        <div>
          <h1 className="mb-1 text-lg font-bold text-gray-100">写真を撮影してください</h1>
          <p className="mb-6 text-xs text-gray-500">
            店舗: {store} / 納品トラック: {truck}
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
            📷 カメラを起動
          </button>
          <button
            type="button"
            onClick={() => galleryInputRef.current?.click()}
            className="mt-3 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-gray-300 active:bg-neutral-800"
          >
            写真を選ぶ(カメラロールから、最大{MAX_FILES}枚まとめて選択可)
          </button>
          {errorMessage && (
            <p className="mt-3 text-sm text-red-400">{errorMessage}</p>
          )}
          <button
            type="button"
            onClick={() => setStep("truck")}
            className="mt-4 text-xs text-gray-500 underline"
          >
            納品トラック選択に戻る
          </button>
        </div>
      )}

      {step === "uploading" && (
        <LoadingOverlay
          label={`アップロード中...${
            progress.total > 1 ? ` (${progress.done}/${progress.total})` : ""
          }`}
        />
      )}
    </div>
  );
}
