"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import PinChip from "@/components/pin-chip";
import PinObjectLine from "@/components/pin-object-line";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";
import { useI18n } from "@/lib/i18n/provider";
import type { CommentType, PinObjectKind } from "@/lib/types";

/** ダブルタップで順に切り替わる倍率。片手でも操作できるよう段階式にしている。 */
const ZOOM_STEPS = [1, 2, 4];
const MAX_SCALE = 6;
const MIN_SCALE = 1;
const DOUBLE_TAP_MS = 300;
const DOUBLE_TAP_SLOP_PX = 24;

export type ViewerPin = {
  id: string;
  position_x: number;
  position_y: number;
  width_pct: number;
  height_pct: number;
  rotation_deg: number;
  color: string;
  body: string;
  object_kind: PinObjectKind | null;
  end_position_x: number | null;
  end_position_y: number | null;
  /** フィードのコメントだけが持つ。良い点/気になる点で先頭のアイコンが変わる。 */
  comment_type?: CommentType | null;
};

type Point = { x: number; y: number };

function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/**
 * 売場写真を全画面で拡大して見るビューア。
 *
 * フィードの写真はタップ=ピン、ダブルタップ=ありがとう、ドラッグ=矢印、と
 * ジェスチャーが埋まっているため、拡大は写真上ではなく専用のビューアで行う。
 * ここでは操作が競合しないので、ダブルタップを段階拡大に割り当てられる。
 *
 * 表示するのは一覧用サムネイルではなく原寸。フィードを軽く保ったまま、
 * 見たいときだけ値札が読める解像度を取りに行く。
 */
export default function PhotoViewer({
  photoUrl,
  alt,
  pins = [],
  onClose,
}: {
  photoUrl: string;
  alt: string;
  pins?: ViewerPin[];
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const [showPins, setShowPins] = useState(true);
  const [imgSize, setImgSize] = useState({ width: 0, height: 0 });
  /** 写真を置ける領域の実寸。`max-height: 100%` は親の高さが自動だと効かない
      ことがあるので、測った値をpxで指定して確実に画面内に収める。 */
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  /** 写真を表示できる領域(下のボタン列を除いた部分)。 */
  const viewportRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  /** 画面に触れている指。2本になったらピンチとして扱う。 */
  const pointersRef = useRef(new Map<number, Point>());
  const panStartRef = useRef<{ pointer: Point; offset: Point } | null>(null);
  const pinchStartRef = useRef<{
    distance: number;
    scale: number;
    center: Point;
    offset: Point;
  } | null>(null);
  const lastTapRef = useRef<{ time: number; point: Point } | null>(null);
  const movedRef = useRef(false);
  /** 画像サイズが変わったときに今の倍率を参照するため(監視は張り直さない)。 */
  const scaleRef = useRef(scale);
  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);

  // このビューアはボタンを押したときにだけ描画されるので、サーバー側で
  // 描かれることはない。マウント判定のためのstateは要らない。
  useBodyScrollLock(containerRef, true);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  /**
   * 写真が画面の外へ逃げないよう、ずらせる量を制限する。
   * 写真は中央ぞろえで表示し、offset は「中央からのずれ」として扱うので、
   * 拡大して画面からはみ出した分の半分までしか動かせない。
   */
  const clampOffset = useCallback((next: Point, nextScale: number): Point => {
    const viewport = viewportRef.current?.getBoundingClientRect();
    const image = imageRef.current;
    if (!viewport || !image) return next;

    function axis(value: number, size: number, available: number) {
      const slack = Math.max(0, (size - available) / 2);
      return Math.min(slack, Math.max(-slack, value));
    }

    return {
      x: axis(next.x, image.offsetWidth * nextScale, viewport.width),
      y: axis(next.y, image.offsetHeight * nextScale, viewport.height),
    };
  }, []);

  useEffect(() => {
    const el = imageRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (!rect) return;
      setImgSize((prev) =>
        prev.width === rect.width && prev.height === rect.height
          ? prev
          : { width: rect.width, height: rect.height },
      );
      // 画像が読み込まれて大きさが決まったら中央に寄せ直す。
      setOffset((prev) => clampOffset(prev, scaleRef.current));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [clampOffset]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (!rect) return;
      setViewportSize((prev) =>
        prev.width === rect.width && prev.height === rect.height
          ? prev
          : { width: rect.width, height: rect.height },
      );
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  /** 画面上の点を画面中心からの相対座標にする(拡大の基準が中心のため)。 */
  const toCentered = useCallback((screenPoint: Point): Point | null => {
    const viewport = viewportRef.current?.getBoundingClientRect();
    if (!viewport) return null;
    return {
      x: screenPoint.x - (viewport.left + viewport.width / 2),
      y: screenPoint.y - (viewport.top + viewport.height / 2),
    };
  }, []);

  /** 指定した画面上の点を動かさないまま倍率だけ変える。 */
  const zoomAround = useCallback(
    (nextScale: number, screenPoint: Point) => {
      const local = toCentered(screenPoint);
      if (!local) return;
      const target = Math.min(MAX_SCALE, Math.max(MIN_SCALE, nextScale));
      setScale((prevScale) => {
        setOffset((prevOffset) =>
          clampOffset(
            {
              x: local.x - (local.x - prevOffset.x) * (target / prevScale),
              y: local.y - (local.y - prevOffset.y) * (target / prevScale),
            },
            target,
          ),
        );
        return target;
      });
    },
    [clampOffset, toCentered],
  );

  const reset = useCallback(() => {
    setScale(1);
    setOffset(clampOffset({ x: 0, y: 0 }, 1));
  }, [clampOffset]);

  function handlePointerDown(e: React.PointerEvent) {
    const point = { x: e.clientX, y: e.clientY };
    pointersRef.current.set(e.pointerId, point);
    movedRef.current = false;

    if (pointersRef.current.size === 2) {
      const [a, b] = [...pointersRef.current.values()];
      pinchStartRef.current = {
        distance: distance(a, b),
        scale,
        center: midpoint(a, b),
        offset,
      };
      panStartRef.current = null;
      return;
    }

    panStartRef.current = { pointer: point, offset };
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!pointersRef.current.has(e.pointerId)) return;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    const pinch = pinchStartRef.current;
    if (pointersRef.current.size >= 2 && pinch) {
      const [a, b] = [...pointersRef.current.values()];
      const spread = distance(a, b);
      if (pinch.distance <= 0) return;
      movedRef.current = true;
      const next = Math.min(
        MAX_SCALE,
        Math.max(MIN_SCALE, (pinch.scale * spread) / pinch.distance),
      );
      const local = toCentered(pinch.center);
      if (!local) return;
      setScale(next);
      setOffset(
        clampOffset(
          {
            x: local.x - (local.x - pinch.offset.x) * (next / pinch.scale),
            y: local.y - (local.y - pinch.offset.y) * (next / pinch.scale),
          },
          next,
        ),
      );
      return;
    }

    const pan = panStartRef.current;
    if (!pan) return;
    const dx = e.clientX - pan.pointer.x;
    const dy = e.clientY - pan.pointer.y;
    if (Math.hypot(dx, dy) > DOUBLE_TAP_SLOP_PX) movedRef.current = true;
    // 等倍のときは動かしても意味がないので、誤操作を避けて何もしない
    if (scale <= 1) return;
    setOffset(
      clampOffset({ x: pan.offset.x + dx, y: pan.offset.y + dy }, scale),
    );
  }

  function endPointer(e: React.PointerEvent) {
    const wasPinching = pointersRef.current.size >= 2;
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) pinchStartRef.current = null;
    if (pointersRef.current.size === 0) panStartRef.current = null;

    if (wasPinching || movedRef.current) {
      lastTapRef.current = null;
      return;
    }

    // 動いていない指離し = タップ。300ms以内に近い場所でもう一度なら拡大。
    const point = { x: e.clientX, y: e.clientY };
    const previous = lastTapRef.current;
    const now = Date.now();
    if (
      previous &&
      now - previous.time < DOUBLE_TAP_MS &&
      distance(previous.point, point) < DOUBLE_TAP_SLOP_PX
    ) {
      lastTapRef.current = null;
      const index = ZOOM_STEPS.findIndex((step) => step > scale + 0.01);
      const next = index === -1 ? ZOOM_STEPS[0] : ZOOM_STEPS[index];
      if (next === 1) reset();
      else zoomAround(next, point);
      return;
    }
    lastTapRef.current = { time: now, point };
  }

  if (typeof document === "undefined") return null;

  const textPins = pins.filter((pin) => !pin.object_kind);
  const objectPins = pins.filter(
    (
      pin,
    ): pin is ViewerPin & {
      object_kind: PinObjectKind;
      end_position_x: number;
      end_position_y: number;
    } =>
      !!pin.object_kind &&
      pin.end_position_x != null &&
      pin.end_position_y != null,
  );

  return createPortal(
    <div
      ref={containerRef}
      // カードは content-visibility で paint containment が効いているため、
      // その中に置くと position:fixed がカード内に閉じ込められる。body直下へ出す。
      className="fixed inset-0 z-50 flex flex-col bg-black"
      style={{ touchAction: "none" }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endPointer}
      onPointerCancel={endPointer}
    >
      <div ref={viewportRef} className="relative flex-1 overflow-hidden">
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
          }}
        >
          <div ref={imageRef} className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoUrl}
              alt={alt}
              draggable={false}
              style={
                viewportSize.width > 0
                  ? {
                      maxWidth: `${viewportSize.width}px`,
                      maxHeight: `${viewportSize.height}px`,
                    }
                  : undefined
              }
              className="block select-none object-contain"
            />

            {showPins &&
              imgSize.width > 0 &&
              textPins.map((pin) => (
                <PinChip
                  key={pin.id}
                  x={pin.position_x}
                  y={pin.position_y}
                  widthPx={pin.width_pct * imgSize.width}
                  heightPx={pin.height_pct * imgSize.height}
                  rotationDeg={pin.rotation_deg}
                  color={pin.color}
                  text={
                    pin.comment_type
                      ? `${pin.comment_type === "good" ? "✅" : "⚠️"} ${pin.body}`
                      : pin.body
                  }
                />
              ))}

            {showPins &&
              imgSize.width > 0 &&
              objectPins.map((pin) => (
                <PinObjectLine
                  key={pin.id}
                  x1={pin.position_x}
                  y1={pin.position_y}
                  x2={pin.end_position_x}
                  y2={pin.end_position_y}
                  containerWidth={imgSize.width}
                  containerHeight={imgSize.height}
                  kind={pin.object_kind}
                  color={pin.color}
                />
              ))}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 border-t border-neutral-800 bg-black px-3 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-neutral-700 px-3 py-2 text-sm font-semibold text-gray-200 active:bg-neutral-800"
        >
          ✕ {t.viewer.close}
        </button>

        {scale > 1 && (
          <button
            type="button"
            onClick={reset}
            className="rounded-md border border-neutral-700 px-3 py-2 text-xs text-gray-300 active:bg-neutral-800"
          >
            {t.viewer.reset} ({t.viewer.zoomLabel(scale.toFixed(1))})
          </button>
        )}

        {pins.length > 0 && (
          <button
            type="button"
            onClick={() => setShowPins((prev) => !prev)}
            className="rounded-md border border-neutral-700 px-3 py-2 text-xs text-gray-300 active:bg-neutral-800"
          >
            {showPins ? t.viewer.hidePins : t.viewer.showPins}
          </button>
        )}

        <span className="ml-auto truncate text-[11px] text-gray-500">
          {t.viewer.hint}
        </span>
      </div>
    </div>,
    document.body,
  );
}
