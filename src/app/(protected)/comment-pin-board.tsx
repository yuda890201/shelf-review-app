"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import PinChip from "@/components/pin-chip";
import PinObjectIcon from "@/components/pin-object-icon";
import PinObjectLine from "@/components/pin-object-line";
import { BASE_HEIGHT_PCT, BASE_WIDTH_PCT } from "@/lib/comment-pin";
import { rafThrottle } from "@/lib/raf-throttle";
import { usePhotoZoom } from "@/lib/use-photo-zoom";
import { useI18n } from "@/lib/i18n/provider";
import type {
  CommentRow,
  CommentType,
  PinObjectKind,
  TagRow,
} from "@/lib/types";

// タグ編集はたまにしか開かないので、初回のバンドルには含めない。
const TagManagerModal = dynamic(() => import("./tag-manager-modal"), {
  ssr: false,
});

const OBJECT_KINDS: PinObjectKind[] = ["move", "widen", "narrow"];
const DRAG_THRESHOLD_PX = 10;
const PENDING_COLOR = "#3b82f6";
const MIN_WIDTH_PCT = 0.05;
const MAX_WIDTH_PCT = 0.9;
const MIN_HEIGHT_PCT = 0.02;
const MAX_HEIGHT_PCT = 0.4;

type PendingPin = { x: number; y: number };
type PendingLine = { x1: number; y1: number; x2: number; y2: number };

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
  hint,
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
    pin: {
      x: number;
      y: number;
      widthPct: number;
      heightPct: number;
      rotationDeg: number;
      endX: number | null;
      endY: number | null;
    };
  }) => Promise<{ error?: string } | void>;
  stickyHeader?: boolean;
  hint?: string;
  /** If set, a tap waits this long for a second tap before opening the composer (lets onDoubleTap fire instead). */
  tapDelayMs?: number;
  onDoubleTap?: () => void;
  overlay?: React.ReactNode;
}) {
  const { t } = useI18n();
  const hintText = hint ?? t.pin.hint;
  /** 拡大の枠(ここからはみ出た分は隠れる)。 */
  const frameRef = useRef<HTMLDivElement>(null);
  /** 写真そのもの。ピンの座標はこの要素の矩形が基準。 */
  const imageRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const zoom = usePhotoZoom(frameRef);
  const [imgSize, setImgSize] = useState({ width: 0, height: 0 });
  const [pendingPin, setPendingPin] = useState<PendingPin | null>(null);
  const [draftLine, setDraftLine] = useState<PendingLine | null>(null);
  const [pendingLine, setPendingLine] = useState<PendingLine | null>(null);
  const [commentType, setCommentType] = useState<CommentType>("bad");
  const [body, setBody] = useState("");
  const [frameWidthPct, setFrameWidthPct] = useState(BASE_WIDTH_PCT);
  const [frameHeightPct, setFrameHeightPct] = useState(BASE_HEIGHT_PCT);
  const [rotation, setRotation] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [tagManagerOpen, setTagManagerOpen] = useState(false);
  const dragCleanupRef = useRef<(() => void) | null>(null);
  const gestureCleanupRef = useRef<(() => void) | null>(null);
  const pendingTapRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const el = imageRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      // 同じ寸法で更新すると、ぶら下がっているピンまで無駄に描き直してしまう。
      setImgSize((prev) =>
        prev.width === width && prev.height === height
          ? prev
          : { width, height },
      );
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const composerOpen = !!pendingPin || !!pendingLine;
  useEffect(() => {
    if (composerOpen) {
      composerRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
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
    setFrameWidthPct(BASE_WIDTH_PCT);
    setFrameHeightPct(BASE_HEIGHT_PCT);
    setRotation(0);
  }

  function handleTap(clientX: number, clientY: number) {
    if (!canComment) return;

    if (!tapDelayMs) {
      openComposerAt(clientX, clientY);
      return;
    }

    if (pendingTapRef.current) {
      clearTimeout(pendingTapRef.current);
      pendingTapRef.current = null;
      onDoubleTap?.();
      return;
    }

    pendingTapRef.current = setTimeout(() => {
      pendingTapRef.current = null;
      openComposerAt(clientX, clientY);
    }, tapDelayMs);
  }

  function handleContainerPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (zoom.handlePointerDown(e)) {
      // 2本指になった = 拡大操作。打ちかけのピン/矢印は取り消す。
      gestureCleanupRef.current?.();
      setDraftLine(null);
      if (pendingTapRef.current) {
        clearTimeout(pendingTapRef.current);
        pendingTapRef.current = null;
      }
      return;
    }
    if (!canComment || pendingPin || pendingLine) return;
    const rect = imageRef.current?.getBoundingClientRect();
    if (!rect) return;
    const startClientX = e.clientX;
    const startClientY = e.clientY;
    const startX = (startClientX - rect.left) / rect.width;
    const startY = (startClientY - rect.top) / rect.height;
    let moved = false;
    let endX = startX;
    let endY = startY;

    const onMove = rafThrottle((ev: PointerEvent) => {
      const dx = ev.clientX - startClientX;
      const dy = ev.clientY - startClientY;
      if (!moved && Math.hypot(dx, dy) >= DRAG_THRESHOLD_PX) moved = true;
      if (moved) {
        const r = imageRef.current?.getBoundingClientRect();
        if (!r) return;
        endX = Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width));
        endY = Math.min(1, Math.max(0, (ev.clientY - r.top) / r.height));
        setDraftLine({ x1: startX, y1: startY, x2: endX, y2: endY });
      }
    });

    function detach() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      gestureCleanupRef.current = null;
    }

    /** 中断用。保留中の移動は捨てる。 */
    function cleanup() {
      onMove.cancel();
      detach();
    }

    function onUp() {
      // 保留中の pointermove を先に反映してから確定する。捨ててしまうと
      // 終点が1フレーム古くなり、1フレームで終わる素早いドラッグは
      // 「動いていない」= タップとして誤判定される。
      onMove.flush();
      detach();
      setDraftLine(null);
      if (moved) {
        setPendingLine({ x1: startX, y1: startY, x2: endX, y2: endY });
      } else {
        handleTap(startClientX, startClientY);
      }
    }

    function onCancel() {
      // ブラウザが縦スクロールとしてジェスチャーを奪った場合(touch-action: pan-y)。
      // 誤タップ・誤ピン打ちを防ぐため何もせず中断する。
      cleanup();
      setDraftLine(null);
    }

    gestureCleanupRef.current = cleanup;
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
  }

  useEffect(() => {
    return () => {
      if (pendingTapRef.current) clearTimeout(pendingTapRef.current);
    };
  }, []);

  function startDrag(handler: (e: PointerEvent) => void) {
    const onMove = rafThrottle(handler);
    const handleUp = () => {
      onMove.flush();
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
    const rect = imageRef.current?.getBoundingClientRect();
    if (!rect) return;
    const centerX = rect.left + pin.x * rect.width;
    const centerY = rect.top + pin.y * rect.height;
    // 枠が回転している場合、ドラッグの生座標を枠のローカル座標系(幅方向/高さ方向)へ
    // 逆回転して変換することで、縦横を独立して自由にリサイズできるようにする。
    const rad = (-rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    startDrag((ev) => {
      const dxRaw = ev.clientX - centerX;
      const dyRaw = ev.clientY - centerY;
      const localDx = dxRaw * cos - dyRaw * sin;
      const localDy = dxRaw * sin + dyRaw * cos;
      setFrameWidthPct(
        Math.min(
          MAX_WIDTH_PCT,
          Math.max(MIN_WIDTH_PCT, (Math.abs(localDx) * 2) / rect.width),
        ),
      );
      setFrameHeightPct(
        Math.min(
          MAX_HEIGHT_PCT,
          Math.max(MIN_HEIGHT_PCT, (Math.abs(localDy) * 2) / rect.height),
        ),
      );
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
      gestureCleanupRef.current?.();
    };
  }, []);

  async function submit(text: string, type: CommentType) {
    if (!pendingPin || !currentUserId) return;
    if (!text.trim()) return;
    setSubmitting(true);
    const result = await onSubmit({
      type,
      body: text,
      objectKind: null,
      pin: {
        x: pendingPin.x,
        y: pendingPin.y,
        widthPct: frameWidthPct,
        heightPct: frameHeightPct,
        rotationDeg: rotation,
        endX: null,
        endY: null,
      },
    });
    if (result && "error" in result && result.error) {
      alert(t.common.postFailed(result.error));
    } else {
      setPendingPin(null);
      setBody("");
    }
    setSubmitting(false);
  }

  async function submitLineObject(kind: PinObjectKind) {
    if (!pendingLine || !currentUserId) return;
    setSubmitting(true);
    const result = await onSubmit({
      type: commentType,
      body: "",
      objectKind: kind,
      pin: {
        x: pendingLine.x1,
        y: pendingLine.y1,
        // object_kindが設定されたピンはPinObjectLineで描画されwidth_pct/height_pctは使わないが、
        // commentsテーブルには0より大きい値を要求するCHECK制約があるためプレースホルダーを入れる。
        widthPct: BASE_WIDTH_PCT,
        heightPct: BASE_HEIGHT_PCT,
        rotationDeg: 0,
        endX: pendingLine.x2,
        endY: pendingLine.y2,
      },
    });
    if (result && "error" in result && result.error) {
      alert(t.common.postFailed(result.error));
    } else {
      setPendingLine(null);
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

  const textPins = useMemo(() => pins.filter((c) => !c.object_kind), [pins]);
  const objectPins = useMemo(
    () =>
      pins.filter(
        (
          c,
        ): c is CommentRow & {
          object_kind: PinObjectKind;
          end_position_x: number;
          end_position_y: number;
        } =>
          !!c.object_kind &&
          c.end_position_x != null &&
          c.end_position_y != null,
      ),
    [pins],
  );

  return (
    <div>
      <div
        className={
          stickyHeader
            ? "sticky top-0 z-10 -mx-3 -mt-3 bg-neutral-900 px-3 pb-2 pt-3"
            : undefined
        }
      >
        {canComment && hintText && (
          <p className="mb-2 text-xs text-gray-500">
            {hintText}
            <br />
            {t.pin.hintDrag}
            <br />
            {t.pin.hintZoom}
          </p>
        )}

        <div
          ref={frameRef}
          onPointerDown={handleContainerPointerDown}
          // 縦スクロールはブラウザに任せつつ、2本指のジェスチャーは奪われない
          // ようにする(奪われるとピンチの途中で pointercancel が飛ぶ)。
          style={{ touchAction: "pan-y" }}
          className={`relative w-full overflow-hidden bg-neutral-800 ${
            stickyHeader ? "rounded-lg border border-neutral-800" : ""
          } ${canComment ? "cursor-crosshair" : ""}`}
        >
          {/* 拡大はこの層に掛ける。ピンの座標は imageRef の矩形基準で計算しており、
              getBoundingClientRect() は transform を反映するので、拡大中でも
              「指が触れた場所 = 写真上の同じ場所」がそのまま成り立つ。 */}
          <div style={zoom.style}>
            <div ref={imageRef} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoUrl}
                alt={t.pin.photoAlt}
                loading="lazy"
                decoding="async"
                className="block w-full select-none"
                draggable={false}
              />

              {imgSize.width > 0 &&
                textPins.map((c) => (
                  <PinChip
                    key={c.id}
                    x={c.position_x}
                    y={c.position_y}
                    widthPx={c.width_pct * imgSize.width}
                    heightPx={c.height_pct * imgSize.height}
                    rotationDeg={c.rotation_deg}
                    color={c.color}
                    text={`${c.comment_type === "good" ? "✅" : "⚠️"} ${c.body}`}
                    isActive={activeCommentId === c.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveCommentId(
                        c.id === activeCommentId ? null : c.id,
                      );
                    }}
                  />
                ))}

              {imgSize.width > 0 &&
                objectPins.map((c) => (
                  <PinObjectLine
                    key={c.id}
                    x1={c.position_x}
                    y1={c.position_y}
                    x2={c.end_position_x}
                    y2={c.end_position_y}
                    containerWidth={imgSize.width}
                    containerHeight={imgSize.height}
                    kind={c.object_kind}
                    color={c.color}
                  />
                ))}

              {draftLine && imgSize.width > 0 && (
                <PinObjectLine
                  x1={draftLine.x1}
                  y1={draftLine.y1}
                  x2={draftLine.x2}
                  y2={draftLine.y2}
                  containerWidth={imgSize.width}
                  containerHeight={imgSize.height}
                  kind="move"
                  color={PENDING_COLOR}
                  dashed
                  showLabel={false}
                />
              )}

              {pendingLine && imgSize.width > 0 && (
                <PinObjectLine
                  x1={pendingLine.x1}
                  y1={pendingLine.y1}
                  x2={pendingLine.x2}
                  y2={pendingLine.y2}
                  containerWidth={imgSize.width}
                  containerHeight={imgSize.height}
                  kind="move"
                  color={PENDING_COLOR}
                  showLabel={false}
                />
              )}

              {pendingPin && imgSize.width > 0 && (
                <div
                  style={{
                    left: `${pendingPin.x * 100}%`,
                    top: `${pendingPin.y * 100}%`,
                    width: `${frameWidthPct * imgSize.width}px`,
                    height: `${frameHeightPct * imgSize.height}px`,
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
                        animationDuration: `${Math.max(
                          4,
                          (body || t.pin.preview).length * 0.18,
                        )}s`,
                      }}
                    >
                      {[0, 1].map((copy) => (
                        <span
                          key={copy}
                          aria-hidden={copy === 1}
                          className="whitespace-nowrap px-2 font-black tracking-wide"
                          style={{
                            fontSize: `${Math.max(9, frameHeightPct * imgSize.height * 0.65)}px`,
                            lineHeight: `${frameHeightPct * imgSize.height}px`,
                            color:
                              commentType === "good" ? "#22c55e" : "#ef4444",
                            textShadow: TEXT_OUTLINE,
                          }}
                        >
                          {(commentType === "good" ? "✅ " : "⚠️ ") +
                            (body || t.pin.preview)}
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
            </div>
          </div>

          {zoom.isZoomed && (
            <button
              type="button"
              onClick={zoom.reset}
              className="absolute left-2 top-2 z-30 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-semibold text-white"
            >
              {t.viewer.reset}
            </button>
          )}

          {overlay}
        </div>
      </div>

      {pendingLine && (
        <div
          ref={composerRef}
          className="mt-3 flex flex-col gap-2 rounded-lg border border-neutral-300 bg-neutral-100 p-3"
        >
          <p className="text-xs text-gray-500">{t.pin.whichObject}</p>
          <div className="flex gap-2">
            {OBJECT_KINDS.map((kind) => (
              <button
                key={kind}
                type="button"
                onClick={() => submitLineObject(kind)}
                disabled={submitting}
                className="flex flex-1 flex-col items-center gap-1 rounded-md border border-neutral-300 bg-white px-2 py-2 text-gray-700 disabled:opacity-50"
              >
                <PinObjectIcon kind={kind} className="h-6 w-6" />
                <span className="text-[10px] leading-tight">
                  {t.object[kind]}
                </span>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setPendingLine(null)}
            disabled={submitting}
            className="rounded-md border border-neutral-300 bg-white px-2 py-2 text-xs text-gray-700 disabled:opacity-50"
          >
            {t.common.cancel}
          </button>
        </div>
      )}

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
              {(["good", "bad"] as CommentType[]).map((kind) => (
                <button
                  key={kind}
                  type="button"
                  onClick={() => setCommentType(kind)}
                  className={`flex-1 rounded-md border px-2 py-1.5 text-xs font-semibold ${
                    commentType === kind
                      ? kind === "good"
                        ? "border-green-500 bg-green-50 text-green-700"
                        : "border-red-500 bg-red-50 text-red-700"
                      : "border-neutral-300 text-gray-500"
                  }`}
                >
                  {kind === "good" ? t.pin.typeGood : t.pin.typeBad}
                </button>
              ))}
            </div>

            <p className="text-center text-[11px] text-gray-500">
              {t.pin.frequentTags}
            </p>

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
                {t.pin.editTags}
              </button>
            </div>

            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={t.pin.bodyPlaceholder}
              rows={2}
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400"
            />

            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="w-10 shrink-0">{t.pin.angle}</span>
              <input
                type="range"
                min={-180}
                max={180}
                step={1}
                value={rotation}
                onChange={(e) => setRotation(Number(e.target.value))}
                className="flex-1"
              />
              <span className="whitespace-pre-line text-right text-[11px] leading-tight text-gray-500">
                {t.pin.frameHint}
              </span>
            </div>
          </form>

          <div className="flex gap-2 border-t border-neutral-300 pt-2">
            <button
              type="button"
              onClick={() => setPendingPin(null)}
              className="flex-1 rounded-md border border-neutral-300 bg-white px-2 py-2 text-xs text-gray-700"
            >
              {t.common.cancel}
            </button>
            <button
              type="submit"
              form="pin-comment-form"
              disabled={submitting || !body.trim()}
              className="flex-1 rounded-md bg-blue-600 px-2 py-2 text-xs font-semibold text-white disabled:opacity-50"
            >
              {t.pin.submit}
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
