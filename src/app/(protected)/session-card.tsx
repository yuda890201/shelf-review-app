"use client";

import { memo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  shelfImagePublicUrl,
  shelfImageThumbUrl,
} from "@/lib/supabase/storage";
import { uploadShelfImage } from "@/lib/upload-image";
import { submitComment } from "@/lib/submit-comment";
import { useI18n } from "@/lib/i18n/provider";
import type {
  CommentRow,
  CommentType,
  ImageRow,
  LayoutReferencePhotoRow,
  LayoutRow,
  PinObjectKind,
  ReactionType,
  SessionWithImage,
  TagRow,
} from "@/lib/types";
import LoadingOverlay from "@/components/loading-overlay";
import PhotoViewer from "@/components/photo-viewer";
import { formatRelativeTime } from "@/lib/format-time";
import CommentPinBoard from "./comment-pin-board";

const DOUBLE_TAP_DELAY_MS = 300;

function SessionCard({
  session,
  posterName,
  sessionComments,
  doneCount,
  needsWorkCount,
  myReaction,
  reactionLocked,
  clapCount,
  isPopping,
  currentUserId,
  tags,
  onTagsChange,
  onCommentAdded,
  onReact,
  onClap,
  onSessionUpdate,
  layouts,
  onSelectLayout,
}: {
  session: SessionWithImage;
  posterName: string | null;
  sessionComments: CommentRow[];
  doneCount: number;
  needsWorkCount: number;
  myReaction: ReactionType | undefined;
  /** 表示名が同じ既存の投票が別のuser_id(=別のログイン)に紐づいている場合true。多重投票防止のためボタンを無効化する。 */
  reactionLocked: boolean;
  clapCount: number;
  isPopping: boolean;
  currentUserId: string | null;
  tags: Record<CommentType, TagRow[]>;
  onTagsChange: (next: Record<CommentType, TagRow[]>) => void;
  onCommentAdded: (row: CommentRow) => void;
  onReact: (sessionId: string, type: ReactionType) => void;
  onClap: (sessionId: string) => void;
  onSessionUpdate: (session: SessionWithImage) => void;
  layouts: LayoutRow[];
  onSelectLayout: (sessionId: string, layoutId: string | null) => void;
}) {
  const supabase = createClient();
  const { t, locale } = useI18n();
  const [closing, setClosing] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [generatingSheet, setGeneratingSheet] = useState(false);
  /** 拡大ビューアで開いている写真(改善前/改善後で切り替わる)。 */
  const [viewing, setViewing] = useState<
    { url: string; alt: string; withPins: boolean } | null
  >(null);
  const resolveCameraRef = useRef<HTMLInputElement>(null);
  const resolveGalleryRef = useRef<HTMLInputElement>(null);

  if (!session.images) return null;

  const isFacilitator = currentUserId && currentUserId === session.facilitator_id;
  const isOpen = session.status === "open";
  const total = doneCount + needsWorkCount;
  const doneRate = total ? Math.round((doneCount / total) * 100) : 0;
  const needsWorkRate = total ? 100 - doneRate : 0;

  function openViewer(alt: string, withPins: boolean) {
    if (!session.images) return;
    setViewing({
      url: shelfImagePublicUrl(session.images.storage_path),
      alt,
      withPins,
    });
  }

  async function handleClose() {
    if (!confirm(t.card.confirmClose)) return;
    setClosing(true);
    const { error } = await supabase
      .from("sessions")
      .update({ status: "closed", closed_at: new Date().toISOString() })
      .eq("id", session.id);
    if (error) {
      alert(t.card.closeFailed(error.message));
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
      const paths = await uploadShelfImage(supabase, currentUserId, file);

      const { data: image, error: imageError } = await supabase
        .from("images")
        .insert({
          ...paths,
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
        t.card.resolveFailed(err instanceof Error ? err.message : t.common.error),
      );
    }
    setResolving(false);
  }

  async function handleSubmitComment({
    type,
    body,
    objectKind,
    pin,
  }: {
    type: CommentType;
    body: string;
    objectKind: PinObjectKind | null;
    pin: {
      x: number;
      y: number;
      widthPct: number;
      heightPct: number;
      rotationDeg: number;
      endX: number | null;
      endY: number | null;
    };
  }) {
    if (!currentUserId) return { error: t.common.loginRequired };
    const { data, error } = await submitComment({
      supabase,
      sessionId: session.id,
      imageId: session.image_id,
      facilitatorId: session.facilitator_id,
      currentUserId,
      type,
      body,
      objectKind,
      pin,
    });
    if (error) return { error };
    if (data) onCommentAdded(data);
  }

  async function fetchReference(layoutId: string) {
    const [{ data: layout }, { data: photos }] = await Promise.all([
      supabase.from("layouts").select("name").eq("id", layoutId).maybeSingle<{
        name: string;
      }>(),
      supabase
        .from("layout_reference_photos")
        .select("*")
        .eq("layout_id", layoutId)
        .order("created_at", { ascending: false })
        .limit(1)
        .returns<LayoutReferencePhotoRow[]>(),
    ]);
    const photo = photos?.[0];
    if (!layout || !photo) return null;
    return {
      photoUrl: shelfImagePublicUrl(photo.storage_path),
      layoutName: layout.name,
      seasonLabel:
        photo.season === "spring"
          ? t.layoutDetail.seasonSpring
          : t.layoutDetail.seasonAutumn,
    };
  }

  async function handleGenerateFeedbackSheet() {
    if (!session.images) return;
    setGeneratingSheet(true);
    try {
      const reference = session.layout_id
        ? await fetchReference(session.layout_id)
        : null;

      // キャンバスでA4画像を組み立てるコードは重く、共有するときしか使わない。
      // 初回のバンドルに含めず、押されたタイミングで読み込む。
      const { generateFeedbackSheetBlob } = await import("@/lib/feedback-sheet");

      const blob = await generateFeedbackSheetBlob({
        storeName: session.images.store_name,
        truckName: session.images.shelf_category,
        title: session.title,
        posterName,
        createdAt: session.created_at,
        photoUrl: shelfImagePublicUrl(session.images.storage_path),
        pins: sessionComments,
        clapCount,
        doneCount,
        needsWorkCount,
        reference,
        t,
        locale,
      });

      const fileName = `${t.card.sheetFileName}_${
        session.images.store_name ?? ""
      }_${session.id.slice(0, 8)}.png`;
      const file = new File([blob], fileName, { type: "image/png" });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: session.title || t.card.sheetFileName,
        });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        // 共有シートをユーザーがキャンセルした場合は何もしない
      } else {
        alert(
          t.card.sheetFailed(err instanceof Error ? err.message : t.common.error),
        );
      }
    }
    setGeneratingSheet(false);
  }

  return (
    <>
      {/* 全画面オーバーレイはカードの外に出す。card-defer(content-visibility)は
          paint containment を伴うため、カードの中に置くと position:fixed の
          基準がカード自身になり、画面全体ではなくカード内に閉じ込められる。 */}
      {resolving && <LoadingOverlay label={t.card.resolvingPhoto} />}
      {generatingSheet && <LoadingOverlay label={t.card.sheetGenerating} />}

      {viewing && (
        <PhotoViewer
          photoUrl={viewing.url}
          alt={viewing.alt}
          pins={viewing.withPins ? sessionComments : []}
          onClose={() => setViewing(null)}
        />
      )}

      <article
        id={`session-${session.id}`}
        // card-defer: 画面外のカードは描画を後回しにして、低スペック端末での
        // スクロールを軽くする(globals.css の content-visibility)。
        className="card-defer overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900"
      >
        <div className="flex items-center justify-between px-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-gray-100">
              {session.title || t.card.untitled}
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="truncate text-xs text-gray-500">
                {session.images.store_name}{" "}
                {session.images.shelf_category &&
                  `/ ${session.images.shelf_category}`}
              </p>
              <select
                value={session.layout_id ?? ""}
                onChange={(e) =>
                  onSelectLayout(session.id, e.target.value || null)
                }
                className={`max-w-[8.5rem] shrink-0 truncate rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${
                  session.layout_id
                    ? "border-blue-800 bg-blue-950/50 text-blue-300"
                    : "border-dashed border-neutral-600 text-gray-500"
                }`}
              >
                <option value="">{t.card.selectGondola}</option>
                {layouts.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
            <p className="truncate text-[11px] text-gray-500">
              {posterName ?? t.card.staff} ·{" "}
              {formatRelativeTime(session.created_at, t, locale)}
            </p>
          </div>
          <div className="flex shrink-0 gap-1">
            {session.resolved_at && (
              <span className="rounded-full bg-blue-900/50 px-2 py-0.5 text-xs font-medium text-blue-300">
                {t.card.resolved}
              </span>
            )}
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                isOpen
                  ? "bg-green-900/50 text-green-300"
                  : "bg-neutral-700 text-gray-300"
              }`}
            >
              {isOpen ? t.card.statusOpen : t.card.statusClosed}
            </span>
          </div>
        </div>

        {session.resolved_at && session.after_image && (
          <div className="grid grid-cols-2 gap-2 px-3 pb-2">
            <div>
              <p className="mb-1 text-center text-xs font-medium text-gray-500">
                {t.card.before}
              </p>
              <button
                type="button"
                onClick={() => openViewer(t.card.before, true)}
                className="block w-full"
                aria-label={t.viewer.open}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={shelfImageThumbUrl(session.images)}
                  alt={t.card.before}
                  loading="lazy"
                  decoding="async"
                  className="aspect-square w-full rounded-md border border-neutral-800 object-cover"
                />
              </button>
            </div>
            <div>
              <p className="mb-1 text-center text-xs font-medium text-blue-400">
                {t.card.after}
              </p>
              <button
                type="button"
                onClick={() =>
                  session.after_image &&
                  setViewing({
                    url: shelfImagePublicUrl(session.after_image.storage_path),
                    alt: t.card.after,
                    withPins: false,
                  })
                }
                className="block w-full"
                aria-label={t.viewer.open}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={shelfImageThumbUrl(session.after_image)}
                  alt={t.card.after}
                  loading="lazy"
                  decoding="async"
                  className="aspect-square w-full rounded-md border border-blue-800 object-cover"
                />
              </button>
            </div>
          </div>
        )}

        <CommentPinBoard
          photoUrl={shelfImageThumbUrl(session.images)}
          pins={sessionComments}
          currentUserId={currentUserId}
          canComment={isOpen}
          tags={tags}
          onTagsChange={onTagsChange}
          onSubmit={handleSubmitComment}
          tapDelayMs={DOUBLE_TAP_DELAY_MS}
          onDoubleTap={() => onClap(session.id)}
          hint={isOpen ? t.pin.hintFeed : undefined}
          overlay={
            <>
              {myReaction && (
                <div className="pointer-events-none absolute right-2 top-2 rounded-full bg-black/55 px-2 py-1 text-base leading-none">
                  {myReaction === "done" ? "✅" : "🔧"}
                </div>
              )}

              {isPopping && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <span className="heart-pop text-7xl">🙏</span>
                </div>
              )}
            </>
          }
        />

        <div className="px-3 py-3">
          <button
            type="button"
            onClick={() => onClap(session.id)}
            className="mb-2 w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm font-semibold text-gray-200 active:bg-neutral-700"
          >
            {t.card.thanks(clapCount)}
          </button>

          <div className="mb-2 flex gap-2">
            <button
              type="button"
              onClick={() => onReact(session.id, "done")}
              disabled={reactionLocked}
              className={`flex-1 rounded-md border px-3 py-2 text-sm font-semibold disabled:opacity-50 ${
                myReaction === "done"
                  ? "border-blue-500 bg-blue-950/60 text-blue-300"
                  : "border-neutral-700 text-gray-400"
              }`}
            >
              {t.card.done(doneCount)}
            </button>
            <button
              type="button"
              onClick={() => onReact(session.id, "needs_work")}
              disabled={reactionLocked}
              className={`flex-1 rounded-md border px-3 py-2 text-sm font-semibold disabled:opacity-50 ${
                myReaction === "needs_work"
                  ? "border-orange-500 bg-orange-950/60 text-orange-300"
                  : "border-neutral-700 text-gray-400"
              }`}
            >
              {t.card.needsWork(needsWorkCount)}
            </button>
          </div>

          <div className="mb-2 flex items-center gap-4">
            <span className="flex items-center gap-1 text-gray-400">
              <span className="text-xl leading-none">💬</span>
              <span className="text-xs">{sessionComments.length}</span>
            </span>
            <button
              type="button"
              onClick={() => openViewer(t.pin.photoAlt, true)}
              className="text-xl leading-none text-gray-400"
              aria-label={t.viewer.open}
            >
              🔍
            </button>
            <button
              type="button"
              onClick={handleGenerateFeedbackSheet}
              disabled={generatingSheet}
              className="text-xl leading-none text-gray-400 disabled:opacity-50"
              aria-label={t.card.sheetLabel}
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
                <span>{t.card.doneRate(doneRate)}</span>
                <span>{t.card.needsWorkRate(needsWorkRate)}</span>
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
                  {closing ? t.card.closing : t.card.closeSession}
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
                    {resolving ? t.card.registering : t.card.markResolved}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </article>
    </>
  );
}

// フィードは投稿カードを縦に並べるだけなので、1枚のカードで起きた状態変化で
// 他のカードまで描き直さないようにメモ化する。低スペック端末では効果が大きい。
export default memo(SessionCard);
