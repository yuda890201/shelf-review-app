"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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

export default function NewSessionPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("store");
  const [store, setStore] = useState("");
  const [category, setCategory] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

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

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;

    setStep("uploading");
    setErrorMessage("");

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setErrorMessage("ログインが必要です。");
      setStep("camera");
      return;
    }

    try {
      const ext = file.name.split(".").pop() || "jpg";
      const storagePath = `${user.id}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("shelf-images")
        .upload(storagePath, file);
      if (uploadError) throw uploadError;

      const { data: image, error: imageError } = await supabase
        .from("images")
        .insert({
          storage_path: storagePath,
          uploaded_by: user.id,
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
          facilitator_id: user.id,
          status: "open",
        })
        .select()
        .single();
      if (sessionError) throw sessionError;

      router.push(`/sessions/${session.id}`);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "エラーが発生しました。");
      setStep("camera");
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      {step === "store" && (
        <div>
          <h1 className="mb-4 text-lg font-bold">店舗を選んでください</h1>
          <div className="flex flex-col gap-3">
            {STORES.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => selectStore(name)}
                className="rounded-lg border border-gray-300 bg-white px-4 py-4 text-base font-semibold text-gray-800 active:bg-blue-50"
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === "category" && (
        <div>
          <h1 className="mb-1 text-lg font-bold">撮影する売場を選んでください</h1>
          <p className="mb-4 text-xs text-gray-500">店舗: {store}</p>
          <div className="grid grid-cols-2 gap-3">
            {SHELF_CATEGORIES.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => selectCategory(name)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-4 text-sm font-semibold text-gray-800 active:bg-blue-50"
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
          <h1 className="mb-1 text-lg font-bold">売場の名前を入力してください</h1>
          <p className="mb-4 text-xs text-gray-500">店舗: {store}</p>
          <input
            type="text"
            autoFocus
            value={customCategory}
            onChange={(e) => setCustomCategory(e.target.value)}
            placeholder="例: 雑誌コーナー"
            className="mb-3 w-full rounded-md border border-gray-300 px-3 py-3 text-base"
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
          <h1 className="mb-1 text-lg font-bold">写真を撮影してください</h1>
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
            className="mt-3 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-600 active:bg-gray-50"
          >
            写真を選ぶ(カメラロールから)
          </button>
          {errorMessage && (
            <p className="mt-3 text-sm text-red-600">{errorMessage}</p>
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
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-base font-semibold text-gray-700">
            アップロード中...
          </p>
          <p className="mt-1 text-xs text-gray-400">
            {store} / {category}
          </p>
        </div>
      )}
    </div>
  );
}
