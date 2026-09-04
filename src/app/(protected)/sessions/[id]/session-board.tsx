"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { shelfImagePublicUrl } from "@/lib/supabase/storage";
import type { CommentRow, CommentType, SessionWithImage } from "@/lib/types";

type PendingPin = { x: number; y: number };

const TYPE_LABEL: Record<CommentType, string> = {
  good: "良い点",
  bad: "気になる点",
};

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
  const imageRef = useRef<HTMLDivElement>(null);

  const [comments, setComments] = useState<CommentRow[]>(initialComments);
  const [status, setStatus] = useState(session.status);
  const [pendingPin, setPendingPin] = useState<PendingPin | null>(null);
  const [commentType, setCommentType] = useState<CommentType>("bad");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  const [tagSuggestions, setTagSuggestions] = useState<Record<CommentType, string[]>>({
    good: [],
    bad: [],
  });

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

  const isFacilitator = currentUserId && currentUserId === session.facilitator_id;
  const isOpen = status === "open";

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
  }

  async function postComment(text: string, type: CommentType) {
    if (!pendingPin || !currentUserId || !text.trim()) return;
    const pin = pendingPin;

    setSubmitting(true);
    const newComment: CommentRow = {
      id: crypto.randomUUID(),
      session_id: session.id,
      image_id: session.image_id,
      position_x: pin.x,
      position_y: pin.y,
      comment_type: type,
      body: text.trim(),
      author_id: currentUserId,
      created_at: new Date().toISOString(),
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

  const sortedComments = [...comments].sort((a, b) =>
    a.created_at.localeCompare(b.created_at),
  );

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
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              isOpen ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"
            }`}
          >
            {isOpen ? "進行中" : "クローズ済"}
          </span>
          {isFacilitator && isOpen && (
            <button
              onClick={handleClose}
              disabled={closing}
              className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            >
              {closing ? "クローズ中..." : "セッションをクローズ"}
            </button>
          )}
        </div>
      </div>

      {isOpen && (
        <p className="mb-2 text-xs text-gray-500">
          画像をタップして、気づいた箇所にピンを打ってください。
        </p>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-[2fr_1fr]">
        <div
          ref={imageRef}
          onClick={handleImageClick}
          className={`relative w-full overflow-hidden rounded-lg border border-gray-200 bg-gray-100 ${
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

          {sortedComments.map((c) => {
            const duration = Math.max(4, c.body.length * 0.18);
            const isGood = c.comment_type === "good";
            return (
              <button
                key={c.id}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveCommentId(c.id === activeCommentId ? null : c.id);
                }}
                style={{ left: `${c.position_x * 100}%`, top: `${c.position_y * 100}%` }}
                className={`absolute z-10 h-6 w-24 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded border-2 bg-white/90 shadow ${
                  isGood ? "border-green-500" : "border-red-500"
                } ${activeCommentId === c.id ? "ring-2 ring-blue-400" : ""}`}
                title={c.body}
              >
                <span
                  className="marquee-track"
                  style={{ animationDuration: `${duration}s` }}
                >
                  {[0, 1].map((copy) => (
                    <span
                      key={copy}
                      aria-hidden={copy === 1}
                      className={`whitespace-nowrap px-2 py-1 text-[10px] font-bold ${
                        isGood ? "text-green-700" : "text-red-700"
                      }`}
                    >
                      {c.body}
                    </span>
                  ))}
                </span>
              </button>
            );
          })}

          {pendingPin && (
            <div
              style={{ left: `${pendingPin.x * 100}%`, top: `${pendingPin.y * 100}%` }}
              className="absolute z-20 w-64 -translate-x-1/2 translate-y-3 rounded-lg border border-gray-200 bg-white p-3 shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <form onSubmit={handleSubmitComment} className="flex flex-col gap-2">
                <div className="flex gap-2">
                  {(["good", "bad"] as CommentType[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setCommentType(t)}
                      className={`flex-1 rounded-md border px-2 py-1 text-xs font-semibold ${
                        commentType === t
                          ? t === "good"
                            ? "border-green-500 bg-green-50 text-green-700"
                            : "border-red-500 bg-red-50 text-red-700"
                          : "border-gray-300 text-gray-500"
                      }`}
                    >
                      {TYPE_LABEL[t]}
                    </button>
                  ))}
                </div>
                {tagSuggestions[commentType].length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {tagSuggestions[commentType].map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        disabled={submitting}
                        onClick={() => handleTagTap(tag)}
                        className="rounded-full border border-gray-300 bg-gray-50 px-2 py-1 text-xs text-gray-600 active:bg-gray-200 disabled:opacity-50"
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
                  rows={3}
                  className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPendingPin(null)}
                    className="flex-1 rounded-md border border-gray-300 px-2 py-1 text-xs"
                  >
                    キャンセル
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !body.trim()}
                    className="flex-1 rounded-md bg-blue-600 px-2 py-1 text-xs font-semibold text-white disabled:opacity-50"
                  >
                    投稿
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-bold text-gray-700">
            コメント ({sortedComments.length})
          </h2>
          {sortedComments.length === 0 && (
            <p className="text-xs text-gray-400">まだコメントはありません。</p>
          )}
          <ul className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto">
            {sortedComments.map((c, i) => (
              <li
                key={c.id}
                onClick={() => setActiveCommentId(c.id === activeCommentId ? null : c.id)}
                className={`cursor-pointer rounded-md border p-2 text-sm ${
                  activeCommentId === c.id
                    ? "border-blue-400 bg-blue-50"
                    : "border-gray-200 bg-white"
                }`}
              >
                <div className="mb-1 flex items-center gap-2 text-xs">
                  <span className="font-bold text-gray-400">#{i + 1}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.5 font-medium ${
                      c.comment_type === "good"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {TYPE_LABEL[c.comment_type]}
                  </span>
                  <span className="text-gray-400">
                    {c.author_id === currentUserId ? "自分" : "参加者"}
                  </span>
                  <span className="ml-auto text-gray-400">
                    {new Date(c.created_at).toLocaleTimeString("ja-JP")}
                  </span>
                </div>
                <p className="whitespace-pre-wrap text-gray-800">{c.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
