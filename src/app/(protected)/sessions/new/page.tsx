"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { compressImage } from "@/lib/image";
import LoadingOverlay from "@/components/loading-overlay";

const STORES = ["博多住吉通り店", "清川二丁目店"];

const SHELF_CATEGORIES = [
  "センター1便",
  "ヤマザキパン1便",
  "センター2便",
  "山崎パン2便",
  "昼ピークFF",
  "センター3便",
  "夜ピークFF",
  "その他",
];

type Step = "store" | "category" | "categoryOther" | "camera" | "uploading";

const MAX_FILES = 5;

export default function NewSessionPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("store");
  const [store, setStore] = useState("");
  const [category, setCategory] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  function selectStore(name: string) {
    setStore(name);
    setStep("category");
  }

  function selectCategory(name: string) {
    if (name === "その他") {
      setStep("categoryOther");
      return;
    }
    setCategory(name);
    setStep("camera");
  }

  function confirmCustomCategory() {
    const trimmed = customCategory.trim();
    if (!trimmed) return;
    setCategory(trimmed);
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
        shelf_category: category,
      })
      .select()
      .single();
    if (imageError) throw imageError;

    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .insert({
        image_id: image.id,
        title: `${store} ${category}`,
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
        category,
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
      router.push(`/sessions/${sessionIds[0]}`);
    } else {
      router.push("/");
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      {step === "store" && (
        <div>
          <h1 className="mb-4 text-lg font-bold text-gray-100">店舗を選んでください</h1>
          <div className="flex flex-col gap-3">
            {STORES.map((name) => (
              <button
                key={name}
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

      {step === "category" && (
        <div>
          <h1 className="mb-1 text-lg font-bold text-gray-100">撮影する売場を選んでください</h1>
          <p className="mb-4 text-xs text-gray-500">店舗: {store}</p>
          <div className="grid grid-cols-2 gap-3">
            {SHELF_CATEGORIES.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => selectCategory(name)}
                className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-4 text-sm font-semibold text-gray-100 active:bg-blue-950/50"
              >
                {name}
              </button>
            ))}
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

      {step === "categoryOther" && (
        <div>
          <h1 className="mb-1 text-lg font-bold text-gray-100">売場の名前を入力してください</h1>
          <p className="mb-4 text-xs text-gray-500">店舗: {store}</p>
          <input
            type="text"
            autoFocus
            value={customCategory}
            onChange={(e) => setCustomCategory(e.target.value)}
            placeholder="例: 雑誌コーナー"
            className="mb-3 w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-3 text-base text-gray-100 placeholder-gray-500"
          />
          <button
            type="button"
            onClick={confirmCustomCategory}
            disabled={!customCategory.trim()}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 text-base font-semibold text-white disabled:opacity-50"
          >
            次へ
          </button>
          <button
            type="button"
            onClick={() => setStep("category")}
            className="mt-4 text-xs text-gray-500 underline"
          >
            売場選択に戻る
          </button>
        </div>
      )}

      {step === "camera" && (
        <div>
          <h1 className="mb-1 text-lg font-bold text-gray-100">写真を撮影してください</h1>
          <p className="mb-6 text-xs text-gray-500">
            店舗: {store} / 売場: {category}
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
            onClick={() => setStep("category")}
            className="mt-4 text-xs text-gray-500 underline"
          >
            売場選択に戻る
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
