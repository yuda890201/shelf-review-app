"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { shelfImagePublicUrl } from "@/lib/supabase/storage";
import { compressImage } from "@/lib/image";
import type { CommentRow, ImageRow, SessionWithImage } from "@/lib/types";
import PinBoard from "./pin-board";

export default function SessionBoard({
  session,
  initialComments,
  currentUserId,
}: {
  session: SessionWithImage;
  initialComments: CommentRow[];
  currentUserId: string | null;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [status, setStatus] = useState(session.status);
  const [closing, setClosing] = useState(false);
  const [resolvedAt, setResolvedAt] = useState(session.resolved_at);
  const [afterImage, setAfterImage] = useState<ImageRow | null>(session.after_image);
  const [resolving, setResolving] = useState(false);
  const resolveCameraRef = useRef<HTMLInputElement>(null);
  const resolveGalleryRef = useRef<HTMLInputElement>(null);

  const isFacilitator = currentUserId && currentUserId === session.facilitator_id;
  const isOpen = status === "open";

  async function handleClose() {
    if (!confirm("このセッションをクローズしますか?")) return;
    setClosing(true);
    const { error } = await supabase
      .from("sessions")
      .update({ status: "closed", closed_at: new Date().toISOString() })
      .eq("id", session.id);
    if (error) {
      alert(`クローズに失敗しました: ${error.message}`);
    } else {
      setStatus("closed");
      router.refresh();
    }
    setClosing(false);
  }

  async function handleResolvePhotoSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    e.target.value = "";
    if (!file || !currentUserId) return;

    setResolving(true);
    try {
      const compressed = await compressImage(file);
      const ext = compressed.name.split(".").pop() || "jpg";
      const storagePath = `${currentUserId}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("shelf-images")
        .upload(storagePath, compressed);
      if (uploadError) throw uploadError;

      const { data: image, error: imageError } = await supabase
        .from("images")
        .insert({
          storage_path: storagePath,
          uploaded_by: currentUserId,
          store_name: session.images?.store_name ?? null,
          shelf_category: session.images?.shelf_category ?? null,
        })
        .select()
        .single<ImageRow>();
      if (imageError) throw imageError;

      const nowIso = new Date().toISOString();
      const { error: sessionError } = await supabase
        .from("sessions")
        .update({ resolved_at: nowIso, after_image_id: image.id })
        .eq("id", session.id);
      if (sessionError) throw sessionError;

      setAfterImage(image);
      setResolvedAt(nowIso);
    } catch (err) {
      alert(
        `対応済み写真の登録に失敗しました: ${
          err instanceof Error ? err.message : "エラー"
        }`,
      );
    }
    setResolving(false);
  }

  return (
    <div>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold">
            {session.title || "無題のセッション"}
          </h1>
          <p className="text-xs text-gray-500">
            {session.images?.store_name}{" "}
            {session.images?.shelf_category && `/ ${session.images.shelf_category}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              isOpen ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"
            }`}
          >
            {isOpen ? "進行中" : "クローズ済"}
          </span>
          {resolvedAt && (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
              ✅ 対応済み
            </span>
          )}
          {isFacilitator && isOpen && (
            <button
              onClick={handleClose}
              disabled={closing}
              className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            >
              {closing ? "クローズ中..." : "セッションをクローズ"}
            </button>
          )}
          {isFacilitator && !resolvedAt && (
            <>
              <input
                ref={resolveCameraRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleResolvePhotoSelected}
                className="hidden"
              />
              <input
                ref={resolveGalleryRef}
                type="file"
                accept="image/*"
                onChange={handleResolvePhotoSelected}
                className="hidden"
              />
              <button
                onClick={() => resolveCameraRef.current?.click()}
                disabled={resolving}
                className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
              >
                {resolving ? "登録中..." : "✅ 対応済みにする"}
              </button>
            </>
          )}
        </div>
      </div>

      {resolvedAt && afterImage && (
        <div className="mb-4 grid grid-cols-2 gap-2">
          <div>
            <p className="mb-1 text-center text-xs font-medium text-gray-500">
              改善前
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={shelfImagePublicUrl(session.images!.storage_path)}
              alt="改善前"
              className="aspect-square w-full rounded-md border border-gray-200 object-cover"
            />
          </div>
          <div>
            <p className="mb-1 text-center text-xs font-medium text-blue-600">
              改善後
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={shelfImagePublicUrl(afterImage.storage_path)}
              alt="改善後"
              className="aspect-square w-full rounded-md border border-blue-300 object-cover"
            />
          </div>
        </div>
      )}

      <PinBoard
        session={session}
        initialComments={initialComments}
        currentUserId={currentUserId}
        isOpen={isOpen}
      />
    </div>
  );
}
