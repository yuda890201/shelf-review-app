"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { shelfImagePublicUrl } from "@/lib/supabase/storage";
import { compressImage } from "@/lib/image";
import type {
  CommentRow,
  ImageRow,
  ReactionType,
  SessionWithImage,
} from "@/lib/types";
import LoadingOverlay from "@/components/loading-overlay";
import PinChip from "@/components/pin-chip";

export default function SessionCard({
  session,
  sessionComments,
  cardSize,
  doneCount,
  needsWorkCount,
  myReaction,
  commentCount,
  clapCount,
  isPopping,
  currentUserId,
  onReact,
  onClap,
  onPhotoTap,
  onShare,
  onOpenComments,
  onSessionUpdate,
}: {
  session: SessionWithImage;
  sessionComments: CommentRow[];
  cardSize: number;
  doneCount: number;
  needsWorkCount: number;
  myReaction: ReactionType | undefined;
  commentCount: number;
  clapCount: number;
  isPopping: boolean;
  currentUserId: string | null;
  onReact: (sessionId: string, type: ReactionType) => void;
  onClap: (sessionId: string) => void;
  onPhotoTap: (sessionId: string, e: React.MouseEvent) => void;
  onShare: (session: SessionWithImage) => void;
  onOpenComments: (sessionId: string) => void;
  onSessionUpdate: (session: SessionWithImage) => void;
}) {
  const supabase = createClient();
  const [closing, setClosing] = useState(false);
  const [resolving, setResolving] = useState(false);
  const resolveCameraRef = useRef<HTMLInputElement>(null);
  const resolveGalleryRef = useRef<HTMLInputElement>(null);

  if (!session.images) return null;

  const isFacilitator = currentUserId && currentUserId === session.facilitator_id;
  const isOpen = session.status === "open";
  const total = doneCount + needsWorkCount;
  const doneRate = total ? Math.round((doneCount / total) * 100) : 0;
  const needsWorkRate = total ? 100 - doneRate : 0;

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
      onSessionUpdate({
        ...session,
        status: "closed",
        closed_at: new Date().toISOString(),
      });
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

      onSessionUpdate({
        ...session,
        resolved_at: nowIso,
        after_image_id: image.id,
        after_image: image,
      });
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
    <article className="overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900">
      {resolving && <LoadingOverlay label="対応済み写真を登録中..." />}

      <div className="flex items-center justify-between px-3 py-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-gray-100">
            {session.title || "無題のセッション"}
          </p>
          <p className="truncate text-xs text-gray-500">
            {session.images.store_name}{" "}
            {session.images.shelf_category &&
              `/ ${session.images.shelf_category}`}
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          {session.resolved_at && (
            <span className="rounded-full bg-blue-900/50 px-2 py-0.5 text-xs font-medium text-blue-300">
              ✅ 対応済み
            </span>
          )}
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              isOpen
                ? "bg-green-900/50 text-green-300"
                : "bg-neutral-700 text-gray-300"
            }`}
          >
            {isOpen ? "進行中" : "クローズ済"}
          </span>
        </div>
      </div>

      {session.resolved_at && session.after_image && (
        <div className="grid grid-cols-2 gap-2 px-3 pb-2">
          <div>
            <p className="mb-1 text-center text-xs font-medium text-gray-500">
              改善前
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={shelfImagePublicUrl(session.images.storage_path)}
              alt="改善前"
              className="aspect-square w-full rounded-md border border-neutral-800 object-cover"
            />
          </div>
          <div>
            <p className="mb-1 text-center text-xs font-medium text-blue-400">
              改善後
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={shelfImagePublicUrl(session.after_image.storage_path)}
              alt="改善後"
              className="aspect-square w-full rounded-md border border-blue-800 object-cover"
            />
          </div>
        </div>
      )}

      <div
        className="relative select-none"
        onClick={(e) => onPhotoTap(session.id, e)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={shelfImagePublicUrl(session.images.storage_path)}
          alt=""
          className="aspect-square w-full bg-neutral-800 object-cover"
          draggable={false}
        />

        {cardSize > 0 &&
          sessionComments.map((c) => (
            <PinChip
              key={c.id}
              x={c.position_x}
              y={c.position_y}
              widthPx={c.width_pct * cardSize}
              heightPx={c.height_pct * cardSize}
              rotationDeg={c.rotation_deg}
              color={c.color}
              text={`${c.comment_type === "good" ? "✅" : "⚠️"} ${c.body}`}
            />
          ))}

        {myReaction && (
          <div className="absolute right-2 top-2 rounded-full bg-black/55 px-2 py-1 text-base leading-none">
            {myReaction === "done" ? "✅" : "🔧"}
          </div>
        )}

        {isPopping && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="heart-pop text-7xl">🙏</span>
          </div>
        )}
      </div>

      <div className="px-3 py-3">
        <button
          type="button"
          onClick={() => onClap(session.id)}
          className="mb-2 w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm font-semibold text-gray-200 active:bg-neutral-700"
        >
          🙏 ありがとう {clapCount}
        </button>

        <div className="mb-2 flex gap-2">
          <button
            type="button"
            onClick={() => onReact(session.id, "done")}
            className={`flex-1 rounded-md border px-3 py-2 text-sm font-semibold ${
              myReaction === "done"
                ? "border-blue-500 bg-blue-950/60 text-blue-300"
                : "border-neutral-700 text-gray-400"
            }`}
          >
            ✅ 完成 {doneCount}
          </button>
          <button
            type="button"
            onClick={() => onReact(session.id, "needs_work")}
            className={`flex-1 rounded-md border px-3 py-2 text-sm font-semibold ${
              myReaction === "needs_work"
                ? "border-orange-500 bg-orange-950/60 text-orange-300"
                : "border-neutral-700 text-gray-400"
            }`}
          >
            🔧 まだまだ {needsWorkCount}
          </button>
        </div>

        <div className="mb-2 flex items-center gap-4">
          <button
            type="button"
            onClick={() => onOpenComments(session.id)}
            className="flex items-center gap-1 text-gray-400"
          >
            <span className="text-xl leading-none">💬</span>
            <span className="text-xs">{commentCount}</span>
          </button>
          <button
            type="button"
            onClick={() => onShare(session)}
            className="text-xl leading-none text-gray-400"
            aria-label="共有"
          >
            📤
          </button>
        </div>

        {total > 0 && (
          <div className="mb-2">
            <div className="flex h-2 overflow-hidden rounded-full bg-neutral-800">
              <div className="bg-blue-500" style={{ width: `${doneRate}%` }} />
              <div
                className="bg-orange-400"
                style={{ width: `${needsWorkRate}%` }}
              />
            </div>
            <div className="mt-1 flex justify-between text-[11px] text-gray-500">
              <span>完成率 {doneRate}%</span>
              <span>まだまだ率 {needsWorkRate}%</span>
            </div>
          </div>
        )}

        {isFacilitator && (isOpen || !session.resolved_at) && (
          <div className="mt-1 flex flex-wrap gap-2 border-t border-neutral-800 pt-2">
            {isOpen && (
              <button
                type="button"
                onClick={handleClose}
                disabled={closing}
                className="rounded-md border border-red-800 px-2 py-1 text-xs font-semibold text-red-400 disabled:opacity-50"
              >
                {closing ? "クローズ中..." : "セッションをクローズ"}
              </button>
            )}
            {!session.resolved_at && (
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
                  type="button"
                  onClick={() => resolveCameraRef.current?.click()}
                  disabled={resolving}
                  className="rounded-md border border-blue-800 px-2 py-1 text-xs font-semibold text-blue-400 disabled:opacity-50"
                >
                  {resolving ? "登録中..." : "✅ 対応済みにする"}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
