"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { shelfImagePublicUrl } from "@/lib/supabase/storage";
import type { CommentRow, CommentType, SessionWithImage, TagRow } from "@/lib/types";
import PinChip from "@/components/pin-chip";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";
import TagManagerModal from "./tag-manager-modal";

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
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);
  const [tags, setTags] = useState<Record<CommentType, TagRow[]>>({
    good: [],
    bad: [],
  });
  const [tagManagerOpen, setTagManagerOpen] = useState(false);

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
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => setViewportHeight(vv.height);
    update();
    vv.addEventListener("resize", update);
    return () => vv.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("tags")
      .select("*")
      .returns<TagRow[]>()
      .then(({ data }) => {
        if (cancelled || !data) return;
        setTags({
          good: data.filter((t) => t.comment_type === "good"),
          bad: data.filter((t) => t.comment_type === "bad"),
        });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("tags-all")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "tags" },
        (payload) => {
          const row = payload.new as TagRow;
          setTags((prev) =>
            prev[row.comment_type].some((t) => t.id === row.id)
              ? prev
              : { ...prev, [row.comment_type]: [...prev[row.comment_type], row] },
          );
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "tags" },
        (payload) => {
          const row = payload.new as TagRow;
          setTags((prev) => ({
            ...prev,
            [row.comment_type]: prev[row.comment_type].map((t) =>
              t.id === row.id ? row : t,
            ),
          }));
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "tags" },
        (payload) => {
          const oldRow = payload.old as { id: string };
          setTags((prev) => ({
            good: prev.good.filter((t) => t.id !== oldRow.id),
            bad: prev.bad.filter((t) => t.id !== oldRow.id),
          }));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const trackTagUsage = useCallback(
    async (type: CommentType, text: string) => {
      const { data: existing } = await supabase
        .from("tags")
        .select("id, use_count")
        .eq("comment_type", type)
        .eq("body", text)
        .maybeSingle<{ id: string; use_count: number }>();

      if (existing) {
        await supabase
          .from("tags")
          .update({
            use_count: existing.use_count + 1,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
      } else {
        await supabase
          .from("tags")
          .insert({ comment_type: type, body: text, use_count: 1 });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

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

  const composerOpen = !!pendingPin;
  useBodyScrollLock(composerOpen);

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
    } else {
      trackTagUsage(newComment.comment_type, newComment.body).catch(() => {});
      fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "new_comment",
          sessionId: session.id,
          authorId: currentUserId,
          facilitatorId: session.facilitator_id,
        }),
      }).catch(() => {});
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
          className="fixed inset-x-0 bottom-0 z-30 flex max-h-[58vh] flex-col rounded-t-2xl border-t border-neutral-700 shadow-lg"
          style={{
            background: "rgba(23,23,23,0.92)",
            maxHeight: viewportHeight ? viewportHeight * 0.58 : undefined,
          }}
        >
          <form
            id="pin-comment-form"
            onSubmit={handleSubmitComment}
            className="mx-auto flex w-full max-w-lg min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-4"
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

            <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
              {[...tags[commentType]]
                .sort((a, b) => b.use_count - a.use_count)
                .map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    disabled={submitting}
                    onClick={() => handleTagTap(tag.body)}
                    className="shrink-0 whitespace-nowrap rounded-full border border-neutral-600 bg-neutral-800/90 px-3 py-1.5 text-xs text-gray-300 active:bg-neutral-700 disabled:opacity-50"
                  >
                    {tag.body}
                  </button>
                ))}
              <button
                type="button"
                onClick={() => setTagManagerOpen(true)}
                className="shrink-0 whitespace-nowrap rounded-full border border-dashed border-neutral-600 px-3 py-1.5 text-xs text-gray-500"
              >
                ✎ タグを編集
              </button>
            </div>

            <textarea
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
          </form>

          <div
            className="mx-auto flex w-full max-w-lg shrink-0 gap-2 border-t border-neutral-700 px-4 pt-3"
            style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
          >
            <button
              type="button"
              onClick={() => setPendingPin(null)}
              className="flex-1 rounded-md border border-neutral-600 bg-neutral-800/70 px-2 py-2 text-xs text-gray-200"
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
          onChange={(next) =>
            setTags((prev) => ({ ...prev, [commentType]: next }))
          }
        />
      )}
    </div>
  );
}
