"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function NewSessionPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [storeName, setStoreName] = useState("");
  const [shelfCategory, setShelfCategory] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
    setPreview(selected ? URL.createObjectURL(selected) : null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setErrorMessage("売場写真を選択してください。");
      return;
    }

    setSubmitting(true);
    setErrorMessage("");

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setErrorMessage("ログインが必要です。");
      setSubmitting(false);
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
          store_name: storeName || null,
          shelf_category: shelfCategory || null,
        })
        .select()
        .single();
      if (imageError) throw imageError;

      const { data: session, error: sessionError } = await supabase
        .from("sessions")
        .insert({
          image_id: image.id,
          title: title || null,
          facilitator_id: user.id,
          status: "open",
        })
        .select()
        .single();
      if (sessionError) throw sessionError;

      router.push(`/sessions/${session.id}`);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "エラーが発生しました。");
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-4 text-lg font-bold">新規セッション作成</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-700">
            売場写真
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            required
            className="block w-full text-sm"
          />
          {preview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt="プレビュー"
              className="mt-2 max-h-64 rounded-md border border-gray-200 object-contain"
            />
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-700">
            セッションタイトル(任意)
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例: 〇〇店 スナック棚 意見出し"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">
              店舗名(任意)
            </label>
            <input
              type="text"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">
              棚カテゴリ(任意)
            </label>
            <input
              type="text"
              value={shelfCategory}
              onChange={(e) => setShelfCategory(e.target.value)}
              placeholder="例: スナック菓子"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        {errorMessage && (
          <p className="text-sm text-red-600">{errorMessage}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {submitting ? "作成中..." : "セッションを作成"}
        </button>
      </form>
    </div>
  );
}
