"use client";

import { useEffect, useId, useRef, useState } from "react";
import PinChip from "@/components/pin-chip";
import PinObjectIcon, { OBJECT_KIND_LABEL } from "@/components/pin-object-icon";
import type { PinObjectKind } from "@/lib/types";

type PendingPin = { x: number; y: number };

const BASE_WIDTH_PCT = 0.16;
const BASE_HEIGHT_PCT = 0.045;
const PENDING_COLOR = "#3b82f6";
const FRAME_COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f43f5e",
];

function colorForId(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return FRAME_COLORS[hash % FRAME_COLORS.length];
}

const TEXT_OUTLINE =
  "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 2px 5px rgba(0,0,0,0.7)";

export type AnnotatorPin = {
  id: string;
  position_x: number;
  position_y: number;
  width_pct: number;
  height_pct: number;
  rotation_deg: number;
  color: string;
  body: string;
  object_kind?: PinObjectKind | null;
};

const OBJECT_KINDS: PinObjectKind[] = ["move", "widen", "narrow"];

export default function PhotoAnnotator({
  photoUrl,
  pins,
  currentUserId,
  onSubmit,
  readOnly = false,
  hint = "画像をタップして、コメントを貼り付けてください。",
}: {
  photoUrl: string;
  pins: AnnotatorPin[];
  currentUserId: string | null;
  onSubmit: (pin: {
    position_x: number;
    position_y: number;
    width_pct: number;
    height_pct: number;
    rotation_deg: number;
    color: string;
    body: string;
    object_kind: PinObjectKind | null;
  }) => Promise<{ error?: string } | void>;
  readOnly?: boolean;
  hint?: string;
}) {
  const formId = useId();
  const imageRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const [imgSize, setImgSize] = useState({ width: 0, height: 0 });
  const [pendingPin, setPendingPin] = useState<PendingPin | null>(null);
  const [body, setBody] = useState("");
  const [frameScale, setFrameScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const dragCleanupRef = useRef<(() => void) | null>(null);

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

  function handleImageClick(e: React.MouseEvent<HTMLDivElement>) {
    if (readOnly || !currentUserId) return;
    const rect = imageRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setPendingPin({ x, y });
    setBody("");
    setFrameScale(1);
    setRotation(0);
  }

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pendingPin || !body.trim()) return;
    setSubmitting(true);
    const id = crypto.randomUUID();
    const result = await onSubmit({
      position_x: pendingPin.x,
      position_y: pendingPin.y,
      width_pct: BASE_WIDTH_PCT * frameScale,
      height_pct: BASE_HEIGHT_PCT * frameScale,
      rotation_deg: rotation,
      color: colorForId(id),
      body: body.trim(),
      object_kind: null,
    });
    if (result && "error" in result && result.error) {
      alert(`投稿に失敗しました: ${result.error}`);
    } else {
      setPendingPin(null);
      setBody("");
    }
    setSubmitting(false);
  }

  async function submitObject(kind: PinObjectKind) {
    if (!pendingPin) return;
    setSubmitting(true);
    const id = crypto.randomUUID();
    const result = await onSubmit({
      position_x: pendingPin.x,
      position_y: pendingPin.y,
      width_pct: BASE_WIDTH_PCT * frameScale,
      height_pct: BASE_HEIGHT_PCT * frameScale,
      rotation_deg: rotation,
      color: colorForId(id),
      body: "",
      object_kind: kind,
    });
    if (result && "error" in result && result.error) {
      alert(`投稿に失敗しました: ${result.error}`);
    } else {
      setPendingPin(null);
      setBody("");
    }
    setSubmitting(false);
  }

  return (
    <div>
      <div
        ref={imageRef}
        onClick={handleImageClick}
        className={`relative w-full overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900 ${
          readOnly ? "" : "cursor-crosshair"
        }`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photoUrl}
          alt=""
          className="block w-full select-none"
          draggable={false}
        />

        {imgSize.width > 0 &&
          pins.map((p) => (
            <PinChip
              key={p.id}
              x={p.position_x}
              y={p.position_y}
              widthPx={p.width_pct * imgSize.width}
              heightPx={p.height_pct * imgSize.height}
              rotationDeg={p.rotation_deg}
              color={p.color}
              text={p.body}
              objectKind={p.object_kind}
              isActive={activeId === p.id}
              onClick={
                readOnly
                  ? undefined
                  : (e) => {
                      e.stopPropagation();
                      setActiveId(activeId === p.id ? null : p.id);
                    }
              }
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
              borderColor: PENDING_COLOR,
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
                      color: PENDING_COLOR,
                      textShadow: TEXT_OUTLINE,
                    }}
                  >
                    {body || "(プレビュー)"}
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

      {!readOnly && !pendingPin && hint && (
        <p className="mt-2 text-xs text-gray-500">{hint}</p>
      )}

      {pendingPin && (
        <div
          ref={composerRef}
          className="mt-3 flex flex-col gap-2 rounded-lg border border-neutral-700 bg-neutral-900 p-3"
        >
          <p className="text-xs text-gray-400">
            よくある指示はアイコンで素早く:
          </p>
          <div className="flex gap-2">
            {OBJECT_KINDS.map((kind) => (
              <button
                key={kind}
                type="button"
                onClick={() => submitObject(kind)}
                disabled={submitting}
                className="flex flex-1 flex-col items-center gap-1 rounded-md border border-neutral-600 bg-neutral-800/70 px-2 py-2 text-gray-200 disabled:opacity-50"
              >
                <PinObjectIcon kind={kind} className="h-6 w-6" />
                <span className="text-[10px] leading-tight">
                  {OBJECT_KIND_LABEL[kind]}
                </span>
              </button>
            ))}
          </div>

          <p className="text-center text-[11px] text-gray-500">または文章で入力:</p>

          <form
            id={formId}
            onSubmit={handleSubmit}
            className="flex flex-col gap-2"
          >
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="コメントを入力..."
              rows={2}
              className="w-full rounded-md border border-neutral-600 bg-neutral-800/70 px-3 py-2 text-sm text-gray-100 placeholder-gray-500"
            />

            <div className="flex items-center gap-2 text-xs text-gray-400">
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

          <div className="flex gap-2 border-t border-neutral-700 pt-2">
            <button
              type="button"
              onClick={() => setPendingPin(null)}
              className="flex-1 rounded-md border border-neutral-600 bg-neutral-800/70 px-2 py-2 text-xs text-gray-200"
            >
              キャンセル
            </button>
            <button
              type="submit"
              form={formId}
              disabled={submitting || !body.trim()}
              className="flex-1 rounded-md bg-blue-600 px-2 py-2 text-xs font-semibold text-white disabled:opacity-50"
            >
              投稿
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
