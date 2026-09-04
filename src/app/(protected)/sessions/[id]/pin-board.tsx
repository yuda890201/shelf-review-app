"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { shelfImagePublicUrl } from "@/lib/supabase/storage";
import type { CommentRow, CommentType, SessionWithImage } from "@/lib/types";

type PendingPin = { x: number; y: number };

const TYPE_LABEL: Record<CommentType, string> = {
  good: "良い点",
  bad: "気になる点",
};

const BASE_WIDTH_PCT = 0.16;
const BASE_HEIGHT_PCT = 0.045;
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

function PinChip({
  x,
  y,
  widthPx,
  heightPx,
  rotationDeg,
  color,
  text,
  onClick,
  isActive,
}: {
  x: number;
  y: number;
  widthPx: number;
  heightPx: number;
  rotationDeg: number;
  color: string;
  text: string;
  onClick?: (e: React.MouseEvent) => void;
  isActive?: boolean;
}) {
  const fontSizePx = Math.max(9, heightPx * 0.65);
  const duration = Math.max(4, text.length * 0.18);
  const style: React.CSSProperties = {
    left: `${x * 100}%`,
    top: `${y * 100}%`,
    width: `${widthPx}px`,
    height: `${heightPx}px`,
    transform: `translate(-50%, -50%) rotate(${rotationDeg}deg)`,
    borderColor: color,
  };
  const track = (
    <span className="marquee-track" style={{ animationDuration: `${duration}s` }}>
      {[0, 1].map((copy) => (
        <span
          key={copy}
          aria-hidden={copy === 1}
          className="whitespace-nowrap px-2 font-black tracking-wide"
          style={{
            fontSize: `${fontSizePx}px`,
            lineHeight: `${heightPx}px`,
            color,
            textShadow: TEXT_OUTLINE,
          }}
        >
          {text || " "}
        </span>
      ))}
    </span>
  );

  if (!onClick) {
    return (
      <div
        className="pointer-events-none absolute z-20 overflow-hidden rounded border-2 bg-transparent"
        style={style}
      >
        {track}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      style={style}
      className={`absolute z-10 overflow-hidden rounded border-2 bg-transparent ${
        isActive ? "ring-2 ring-blue-400" : ""
      }`}
      title={text}
    >
      {track}
    </button>
  );
}

export default function PinBoard({
  session,
  initialComments,
  currentUserId,
  isOpen,
  showList = true,
}: {
  session: SessionWithImage;
  initialComments: CommentRow[];
  currentUserId: string | null;
  isOpen: boolean;
  showList?: boolean;
}) {
  const supabase = createClient();
  const imageRef = useRef<HTMLDivElement>(null);

  const [comments, setComments] = useState<CommentRow[]>(initialComments);
  const [pendingPin, setPendingPin] = useState<PendingPin | null>(null);
  const [commentType, setCommentType] = useState<CommentType>("bad");
  const [body, setBody] = useState("");
  const [frameScale, setFrameScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [imgSize, setImgSize] = useState({ width: 0, height: 0 });
  const [tagSuggestions, setTagSuggestions] = useState<Record<CommentType, string[]>>({
    good: [],
    bad: [],
  });

  useEffect(() => {
    const el = imageRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setImgSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("comments")
      .select("body, comment_type")
      .order("created_at", { ascending: false })
      .limit(500)
      .then(({ data }) => {
        if (cancelled || !data) return;
        const counts: Record<CommentType, Map<string, number>> = {
          good: new Map(),
          bad: new Map(),
        };
        for (const row of data as { body: string; comment_type: CommentType }[]) {
          const map = counts[row.comment_type];
          map.set(row.body, (map.get(row.body) ?? 0) + 1);
        }
        const topOf = (map: Map<string, number>) =>
          [...map.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6)
            .map(([text]) => text);
        setTagSuggestions({ good: topOf(counts.good), bad: topOf(counts.bad) });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addCommentIfNew = useCallback((row: CommentRow) => {
    setComments((prev) => (prev.some((c) => c.id === row.id) ? prev : [...prev, row]));
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel(`comments-session-${session.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "comments",
          filter: `session_id=eq.${session.id}`,
        },
        (payload) => {
          addCommentIfNew(payload.new as CommentRow);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.id]);

  function handleImageClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!isOpen) return;
    const rect = imageRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setPendingPin({ x, y });
    setBody("");
    setCommentType("bad");
    setFrameScale(1);
    setRotation(0);
  }

  const dragCleanupRef = useRef<(() => void) | null>(null);

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
      setFrameScale(
        Math.min(3, Math.max(0.5, startScale * (distance / startDistance))),
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
    };
  }, []);

  async function postComment(text: string, type: CommentType) {
    if (!pendingPin || !currentUserId || !text.trim()) return;
    const pin = pendingPin;
    const id = crypto.randomUUID();

    setSubmitting(true);
    const newComment: CommentRow = {
      id,
      session_id: session.id,
      image_id: session.image_id,
      position_x: pin.x,
      position_y: pin.y,
      comment_type: type,
      body: text.trim(),
      author_id: currentUserId,
      created_at: new Date().toISOString(),
      width_pct: BASE_WIDTH_PCT * frameScale,
      height_pct: BASE_HEIGHT_PCT * frameScale,
      rotation_deg: rotation,
      color: colorForId(id),
    };

    addCommentIfNew(newComment);
    setPendingPin(null);
    setBody("");

    const { error } = await supabase.from("comments").insert({
      id: newComment.id,
      session_id: newComment.session_id,
      image_id: newComment.image_id,
      position_x: newComment.position_x,
      position_y: newComment.position_y,
      comment_type: newComment.comment_type,
      body: newComment.body,
      author_id: newComment.author_id,
      width_pct: newComment.width_pct,
      height_pct: newComment.height_pct,
      rotation_deg: newComment.rotation_deg,
      color: newComment.color,
    });

    if (error) {
      setComments((prev) => prev.filter((c) => c.id !== newComment.id));
      alert(`投稿に失敗しました: ${error.message}`);
    }
    setSubmitting(false);
  }

  async function handleSubmitComment(e: React.FormEvent) {
    e.preventDefault();
    await postComment(body, commentType);
  }

  async function handleTagTap(text: string) {
    await postComment(text, commentType);
  }

  const sortedComments = [...comments].sort((a, b) =>
    a.created_at.localeCompare(b.created_at),
  );

  return (
    <div>
      {isOpen && (
        <p className="mb-2 text-xs text-gray-500">
          画像をタップして、気づいた箇所にピンを打ってください。
        </p>
      )}

      <div
        className={
          showList ? "grid grid-cols-1 gap-6 md:grid-cols-[2fr_1fr]" : ""
        }
      >
        <div
          ref={imageRef}
          onClick={handleImageClick}
          className={`relative w-full overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900 ${
            isOpen ? "cursor-crosshair" : ""
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={shelfImagePublicUrl(session.images!.storage_path)}
            alt="売場写真"
            className="block w-full select-none"
            draggable={false}
          />

          {imgSize.width > 0 &&
            sortedComments.map((c) => (
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
                borderColor:
                  commentType === "good" ? "#22c55e" : "#ef4444",
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
                      (body || "プレビュー").length * 0.18,
                    )}s`,
                  }}
                >
                  {[0, 1].map((copy) => (
                    <span
                      key={copy}
                      aria-hidden={copy === 1}
                      className="whitespace-nowrap px-2 font-black tracking-wide"
                      style={{
                        fontSize: `${Math.max(
                          9,
                          BASE_HEIGHT_PCT * frameScale * imgSize.height * 0.65,
                        )}px`,
                        lineHeight: `${BASE_HEIGHT_PCT * frameScale * imgSize.height}px`,
                        color: commentType === "good" ? "#22c55e" : "#ef4444",
                        textShadow: TEXT_OUTLINE,
                      }}
                    >
                      {(commentType === "good" ? "✅ " : "⚠️ ") +
                        (body || "(プレビュー)")}
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

        {showList && !pendingPin && (
          <div className="flex flex-col gap-2">
            <h2 className="text-sm font-bold text-gray-300">
              コメント ({sortedComments.length})
            </h2>
            {sortedComments.length === 0 && (
              <p className="text-xs text-gray-500">まだコメントはありません。</p>
            )}
            <ul className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto">
              {sortedComments.map((c, i) => (
                <li
                  key={c.id}
                  onClick={() => setActiveCommentId(c.id === activeCommentId ? null : c.id)}
                  className={`cursor-pointer rounded-md border p-2 text-sm ${
                    activeCommentId === c.id
                      ? "border-blue-400 bg-blue-950/50"
                      : "border-neutral-800 bg-neutral-900"
                  }`}
                >
                  <div className="mb-1 flex items-center gap-2 text-xs">
                    <span className="font-bold text-gray-500">#{i + 1}</span>
                    <span
                      className={`rounded-full px-1.5 py-0.5 font-medium ${
                        c.comment_type === "good"
                          ? "bg-green-900/50 text-green-300"
                          : "bg-red-900/50 text-red-300"
                      }`}
                    >
                      {TYPE_LABEL[c.comment_type]}
                    </span>
                    <span className="ml-auto text-gray-500">
                      {new Date(c.created_at).toLocaleTimeString("ja-JP")}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap text-gray-200">{c.body}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {pendingPin && (
        <div
          className="fixed inset-x-0 bottom-0 z-30 rounded-t-2xl border-t border-neutral-700 p-4 shadow-lg"
          style={{
            background: "rgba(23,23,23,0.92)",
            paddingBottom: "calc(1rem + env(safe-area-inset-bottom))",
          }}
        >
          <form
            onSubmit={handleSubmitComment}
            className="mx-auto flex w-full max-w-lg flex-col gap-2"
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
                        ? "border-green-500 bg-green-950/60 text-green-300"
                        : "border-red-500 bg-red-950/60 text-red-300"
                      : "border-neutral-600 text-gray-400"
                  }`}
                >
                  {TYPE_LABEL[t]}
                </button>
              ))}
            </div>

            {tagSuggestions[commentType].length > 0 && (
              <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
                {tagSuggestions[commentType].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    disabled={submitting}
                    onClick={() => handleTagTap(tag)}
                    className="shrink-0 whitespace-nowrap rounded-full border border-neutral-600 bg-neutral-800/90 px-3 py-1.5 text-xs text-gray-300 active:bg-neutral-700 disabled:opacity-50"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            )}

            <textarea
              autoFocus
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="気づいた点を入力..."
              rows={2}
              className="w-full rounded-md border border-neutral-600 bg-neutral-800/70 px-3 py-2 text-sm text-gray-100 placeholder-gray-500"
            />

            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span className="w-10 shrink-0">角度</span>
              <input
                type="range"
                min={-45}
                max={45}
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

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPendingPin(null)}
                className="flex-1 rounded-md border border-neutral-600 bg-neutral-800/70 px-2 py-2 text-xs text-gray-200"
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={submitting || !body.trim()}
                className="flex-1 rounded-md bg-blue-600 px-2 py-2 text-xs font-semibold text-white disabled:opacity-50"
              >
                投稿
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
