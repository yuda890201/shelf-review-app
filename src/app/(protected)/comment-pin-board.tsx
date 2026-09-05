"use client";

import { useEffect, useRef, useState } from "react";
import PinChip from "@/components/pin-chip";
import PinObjectIcon, { OBJECT_KIND_LABEL } from "@/components/pin-object-icon";
import { BASE_HEIGHT_PCT, BASE_WIDTH_PCT } from "@/lib/comment-pin";
import type { CommentRow, CommentType, PinObjectKind, TagRow } from "@/lib/types";
import TagManagerModal from "./tag-manager-modal";

const OBJECT_KINDS: PinObjectKind[] = ["move", "widen", "narrow"];

type PendingPin = { x: number; y: number };

const TYPE_LABEL: Record<CommentType, string> = {
  good: "良い点",
  bad: "気になる点",
};

const TEXT_OUTLINE =
  "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 2px 5px rgba(0,0,0,0.7)";

export default function CommentPinBoard({
  photoUrl,
  pins,
  currentUserId,
  canComment,
  tags,
  onTagsChange,
  onSubmit,
  stickyHeader = false,
  hint = "画像をタップして、気づいた箇所にピンを打ってください。",
  tapDelayMs,
  onDoubleTap,
  overlay,
}: {
  photoUrl: string;
  pins: CommentRow[];
  currentUserId: string | null;
  canComment: boolean;
  tags: Record<CommentType, TagRow[]>;
  onTagsChange: (next: Record<CommentType, TagRow[]>) => void;
  onSubmit: (args: {
    type: CommentType;
    body: string;
    objectKind: PinObjectKind | null;
    pin: { x: number; y: number; frameScale: number; rotationDeg: number };
  }) => Promise<{ error?: string } | void>;
  stickyHeader?: boolean;
  hint?: string;
  /** If set, a tap waits this long for a second tap before opening the composer (lets onDoubleTap fire instead). */
  tapDelayMs?: number;
  onDoubleTap?: () => void;
  overlay?: React.ReactNode;
}) {
  const imageRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const [imgSize, setImgSize] = useState({ width: 0, height: 0 });
  const [pendingPin, setPendingPin] = useState<PendingPin | null>(null);
  const [commentType, setCommentType] = useState<CommentType>("bad");
  const [body, setBody] = useState("");
  const [frameScale, setFrameScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [tagManagerOpen, setTagManagerOpen] = useState(false);
  const dragCleanupRef = useRef<(() => void) | null>(null);
  const pendingTapRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const el = imageRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setImgSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const composerOpen = !!pendingPin;
  useEffect(() => {
    if (composerOpen) {
      composerRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [composerOpen]);

  function openComposerAt(clientX: number, clientY: number) {
    const rect = imageRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (clientX - rect.left) / rect.width;
    const y = (clientY - rect.top) / rect.height;
    setPendingPin({ x, y });
    setBody("");
    setCommentType("bad");
    setFrameScale(1);
    setRotation(0);
  }

  function handleImageClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!canComment) return;

    if (!tapDelayMs) {
      openComposerAt(e.clientX, e.clientY);
      return;
    }

    if (pendingTapRef.current) {
      clearTimeout(pendingTapRef.current);
      pendingTapRef.current = null;
      onDoubleTap?.();
      return;
    }

    const { clientX, clientY } = e;
    pendingTapRef.current = setTimeout(() => {
      pendingTapRef.current = null;
      openComposerAt(clientX, clientY);
    }, tapDelayMs);
  }

  useEffect(() => {
    return () => {
      if (pendingTapRef.current) clearTimeout(pendingTapRef.current);
    };
  }, []);

  function distanceFromPinCenter(pin: PendingPin, clientX: number, clientY: number) {
    const rect = imageRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    const centerX = rect.left + pin.x * rect.width;
    const centerY = rect.top + pin.y * rect.height;
    return Math.hypot(clientX - centerX, clientY - centerY);
  }

  function startDrag(onMove: (e: PointerEvent) => void) {
    const handleUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", handleUp);
      dragCleanupRef.current = null;
    };
    dragCleanupRef.current = handleUp;
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", handleUp);
  }

  function handleResizeStart(e: React.PointerEvent) {
    e.stopPropagation();
    e.preventDefault();
    if (!pendingPin) return;
    const pin = pendingPin;
    const startDistance = Math.max(1, distanceFromPinCenter(pin, e.clientX, e.clientY));
    const startScale = frameScale;

    startDrag((ev) => {
      const distance = distanceFromPinCenter(pin, ev.clientX, ev.clientY);
      setFrameScale(Math.min(3, Math.max(0.5, startScale * (distance / startDistance))));
    });
  }

  function handleMoveStart(e: React.PointerEvent) {
    e.stopPropagation();
    e.preventDefault();
    if (!pendingPin) return;
    const startPin = pendingPin;
    const startClientX = e.clientX;
    const startClientY = e.clientY;

    startDrag((ev) => {
      const rect = imageRef.current?.getBoundingClientRect();
      if (!rect) return;
      const dx = (ev.clientX - startClientX) / rect.width;
      const dy = (ev.clientY - startClientY) / rect.height;
      setPendingPin({
        x: Math.min(1, Math.max(0, startPin.x + dx)),
        y: Math.min(1, Math.max(0, startPin.y + dy)),
      });
    });
  }

  useEffect(() => {
    return () => {
      dragCleanupRef.current?.();
    };
  }, []);

  async function submit(
    text: string,
    type: CommentType,
    objectKind: PinObjectKind | null = null,
  ) {
    if (!pendingPin || !currentUserId) return;
    if (!objectKind && !text.trim()) return;
    setSubmitting(true);
    const result = await onSubmit({
      type,
      body: text,
      objectKind,
      pin: { x: pendingPin.x, y: pendingPin.y, frameScale, rotationDeg: rotation },
    });
    if (result && "error" in result && result.error) {
      alert(`投稿に失敗しました: ${result.error}`);
    } else {
      setPendingPin(null);
      setBody("");
    }
    setSubmitting(false);
  }

  async function handleSubmitComment(e: React.FormEvent) {
    e.preventDefault();
    await submit(body, commentType);
  }

  async function handleTagTap(text: string) {
    await submit(text, commentType);
  }

  async function handleSubmitObject(kind: PinObjectKind) {
    await submit("", commentType, kind);
  }

  return (
    <div>
      <div
        className={
          stickyHeader
            ? "sticky top-0 z-10 -mx-3 -mt-3 bg-neutral-900 px-3 pb-2 pt-3"
            : undefined
        }
      >
        {canComment && hint && (
          <p className="mb-2 text-xs text-gray-500">{hint}</p>
        )}

        <div
          ref={imageRef}
          onClick={handleImageClick}
          className={`relative w-full overflow-hidden bg-neutral-800 ${
            stickyHeader ? "rounded-lg border border-neutral-800" : ""
          } ${canComment ? "cursor-crosshair" : ""}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoUrl}
            alt="売場写真"
            className="block w-full select-none"
            draggable={false}
          />

          {imgSize.width > 0 &&
            pins.map((c) => (
              <PinChip
                key={c.id}
                x={c.position_x}
                y={c.position_y}
                widthPx={c.width_pct * imgSize.width}
                heightPx={c.height_pct * imgSize.height}
                rotationDeg={c.rotation_deg}
                color={c.color}
                text={`${c.comment_type === "good" ? "✅" : "⚠️"} ${c.body}`}
                objectKind={c.object_kind}
                isActive={activeCommentId === c.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveCommentId(c.id === activeCommentId ? null : c.id);
                }}
              />
            ))}

          {pendingPin && imgSize.width > 0 && (
            <div
              style={{
                left: `${pendingPin.x * 100}%`,
                top: `${pendingPin.y * 100}%`,
                width: `${BASE_WIDTH_PCT * frameScale * imgSize.width}px`,
                height: `${BASE_HEIGHT_PCT * frameScale * imgSize.height}px`,
                transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
                borderColor: commentType === "good" ? "#22c55e" : "#ef4444",
                touchAction: "none",
              }}
              className="absolute z-20 cursor-move overflow-visible rounded border-2 border-dashed bg-transparent"
              onClick={(e) => e.stopPropagation()}
              onPointerDown={handleMoveStart}
            >
              <div className="h-full w-full overflow-hidden">
                <span
                  className="marquee-track"
                  style={{
                    animationDuration: `${Math.max(4, (body || "プレビュー").length * 0.18)}s`,
                  }}
                >
                  {[0, 1].map((copy) => (
                    <span
                      key={copy}
                      aria-hidden={copy === 1}
                      className="whitespace-nowrap px-2 font-black tracking-wide"
                      style={{
                        fontSize: `${Math.max(9, BASE_HEIGHT_PCT * frameScale * imgSize.height * 0.65)}px`,
                        lineHeight: `${BASE_HEIGHT_PCT * frameScale * imgSize.height}px`,
                        color: commentType === "good" ? "#22c55e" : "#ef4444",
                        textShadow: TEXT_OUTLINE,
                      }}
                    >
                      {(commentType === "good" ? "✅ " : "⚠️ ") + (body || "(プレビュー)")}
                    </span>
                  ))}
                </span>
              </div>
              <div
                onPointerDown={handleResizeStart}
                className="absolute -bottom-3 -right-3 h-6 w-6 cursor-nwse-resize rounded-full border-2 border-white bg-blue-500 shadow"
                style={{ touchAction: "none" }}
              />
            </div>
          )}

          {overlay}
        </div>
      </div>

      {pendingPin && (
        <div
          ref={composerRef}
          className="mt-3 flex flex-col gap-2 rounded-lg border border-neutral-300 bg-neutral-100 p-3"
        >
          <form
            id="pin-comment-form"
            onSubmit={handleSubmitComment}
            className="flex flex-col gap-2"
          >
            <div className="flex gap-2">
              {(["good", "bad"] as CommentType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setCommentType(t)}
                  className={`flex-1 rounded-md border px-2 py-1.5 text-xs font-semibold ${
                    commentType === t
                      ? t === "good"
                        ? "border-green-500 bg-green-50 text-green-700"
                        : "border-red-500 bg-red-50 text-red-700"
                      : "border-neutral-300 text-gray-500"
                  }`}
                >
                  {TYPE_LABEL[t]}
                </button>
              ))}
            </div>

            <p className="text-xs text-gray-500">よくある指示はアイコンで素早く:</p>
            <div className="flex gap-2">
              {OBJECT_KINDS.map((kind) => (
                <button
                  key={kind}
                  type="button"
                  onClick={() => handleSubmitObject(kind)}
                  disabled={submitting}
                  className="flex flex-1 flex-col items-center gap-1 rounded-md border border-neutral-300 bg-white px-2 py-2 text-gray-700 disabled:opacity-50"
                >
                  <PinObjectIcon kind={kind} className="h-6 w-6" />
                  <span className="text-[10px] leading-tight">
                    {OBJECT_KIND_LABEL[kind]}
                  </span>
                </button>
              ))}
            </div>

            <p className="text-center text-[11px] text-gray-500">または文章で入力:</p>

            <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
              {[...tags[commentType]]
                .sort((a, b) => b.use_count - a.use_count)
                .map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    disabled={submitting}
                    onClick={() => handleTagTap(tag.body)}
                    className="shrink-0 whitespace-nowrap rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-xs text-gray-700 active:bg-neutral-100 disabled:opacity-50"
                  >
                    {tag.body}
                  </button>
                ))}
              <button
                type="button"
                onClick={() => setTagManagerOpen(true)}
                className="shrink-0 whitespace-nowrap rounded-full border border-dashed border-neutral-400 px-3 py-1.5 text-xs text-gray-500"
              >
                ✎ タグを編集
              </button>
            </div>

            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="気づいた点を入力..."
              rows={2}
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400"
            />

            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="w-10 shrink-0">角度</span>
              <input
                type="range"
                min={-180}
                max={180}
                step={1}
                value={rotation}
                onChange={(e) => setRotation(Number(e.target.value))}
                className="flex-1"
              />
              <span className="text-right text-[11px] leading-tight text-gray-500">
                枠をドラッグで移動
                <br />
                右下の◯でサイズ変更
              </span>
            </div>
          </form>

          <div className="flex gap-2 border-t border-neutral-300 pt-2">
            <button
              type="button"
              onClick={() => setPendingPin(null)}
              className="flex-1 rounded-md border border-neutral-300 bg-white px-2 py-2 text-xs text-gray-700"
            >
              キャンセル
            </button>
            <button
              type="submit"
              form="pin-comment-form"
              disabled={submitting || !body.trim()}
              className="flex-1 rounded-md bg-blue-600 px-2 py-2 text-xs font-semibold text-white disabled:opacity-50"
            >
              投稿
            </button>
          </div>
        </div>
      )}

      {tagManagerOpen && (
        <TagManagerModal
          commentType={commentType}
          tags={tags[commentType]}
          onClose={() => setTagManagerOpen(false)}
          onChange={(next) => onTagsChange({ ...tags, [commentType]: next })}
        />
      )}
    </div>
  );
}
