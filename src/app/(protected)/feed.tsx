"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { shelfImagePublicUrl } from "@/lib/supabase/storage";
import type {
  ClapRow,
  CommentRow,
  ReactionRow,
  ReactionType,
  SessionWithImage,
} from "@/lib/types";
import PinChip from "@/components/pin-chip";
import SessionCommentModal from "./session-comment-modal";

type SortMode = "new" | "needs_work";

export default function Feed({
  initialSessions,
  initialReactions,
  initialClapCounts,
  initialComments,
  commentCounts,
  currentUserId,
}: {
  initialSessions: SessionWithImage[];
  initialReactions: ReactionRow[];
  initialClapCounts: Record<string, number>;
  initialComments: CommentRow[];
  commentCounts: Record<string, number>;
  currentUserId: string | null;
}) {
  const supabase = createClient();
  const [reactions, setReactions] = useState<ReactionRow[]>(initialReactions);
  const [clapCounts, setClapCounts] =
    useState<Record<string, number>>(initialClapCounts);
  const [comments, setComments] = useState<CommentRow[]>(initialComments);
  const [storeFilter, setStoreFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("new");
  const [poppingId, setPoppingId] = useState<string | null>(null);
  const [openSessionId, setOpenSessionId] = useState<string | null>(null);
  const lastTapRef = useRef<Record<string, number>>({});
  const listRef = useRef<HTMLDivElement>(null);
  const [cardSize, setCardSize] = useState(0);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setCardSize(entry.contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("reactions-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "reactions" },
        (payload) => {
          const row = payload.new as ReactionRow;
          setReactions((prev) =>
            prev.some((r) => r.id === row.id) ? prev : [...prev, row],
          );
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "reactions" },
        (payload) => {
          const row = payload.new as ReactionRow;
          setReactions((prev) => prev.map((r) => (r.id === row.id ? row : r)));
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "reactions" },
        (payload) => {
          const oldRow = payload.old as { id: string };
          setReactions((prev) => prev.filter((r) => r.id !== oldRow.id));
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "claps" },
        (payload) => {
          const row = payload.new as ClapRow;
          setClapCounts((prev) => ({
            ...prev,
            [row.session_id]: (prev[row.session_id] ?? 0) + 1,
          }));
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "comments" },
        (payload) => {
          const row = payload.new as CommentRow;
          setComments((prev) =>
            prev.some((c) => c.id === row.id) ? prev : [...prev, row],
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleReact(sessionId: string, type: ReactionType) {
    if (!currentUserId) return;
    const existing = reactions.find(
      (r) => r.session_id === sessionId && r.user_id === currentUserId,
    );

    if (existing && existing.reaction_type === type) {
      setReactions((prev) => prev.filter((r) => r.id !== existing.id));
      const { error } = await supabase
        .from("reactions")
        .delete()
        .eq("id", existing.id);
      if (error) setReactions((prev) => [...prev, existing]);
    } else if (existing) {
      const updated = { ...existing, reaction_type: type };
      setReactions((prev) =>
        prev.map((r) => (r.id === existing.id ? updated : r)),
      );
      const { error } = await supabase
        .from("reactions")
        .update({ reaction_type: type })
        .eq("id", existing.id);
      if (error)
        setReactions((prev) =>
          prev.map((r) => (r.id === existing.id ? existing : r)),
        );
    } else {
      const newRow: ReactionRow = {
        id: crypto.randomUUID(),
        session_id: sessionId,
        user_id: currentUserId,
        reaction_type: type,
        created_at: new Date().toISOString(),
      };
      setReactions((prev) => [...prev, newRow]);
      const { error } = await supabase.from("reactions").insert({
        id: newRow.id,
        session_id: newRow.session_id,
        user_id: newRow.user_id,
        reaction_type: newRow.reaction_type,
      });
      if (error) setReactions((prev) => prev.filter((r) => r.id !== newRow.id));
    }
  }

  async function handleClap(sessionId: string) {
    if (!currentUserId) return;
    setPoppingId(sessionId);
    setTimeout(() => setPoppingId((cur) => (cur === sessionId ? null : cur)), 800);
    // カウントはリアルタイム購読(claps INSERT)側で加算するので、ここでは
    // 楽観的更新をせず二重カウントを避ける。
    await supabase.from("claps").insert({
      session_id: sessionId,
      user_id: currentUserId,
    });
  }

  function handlePhotoTap(sessionId: string, e: React.MouseEvent) {
    const now = e.timeStamp;
    const last = lastTapRef.current[sessionId] ?? 0;
    if (now - last < 300) {
      lastTapRef.current[sessionId] = 0;
      handleClap(sessionId);
    } else {
      lastTapRef.current[sessionId] = now;
    }
  }

  async function handleShare(session: SessionWithImage) {
    const url = `${window.location.origin}/sessions/${session.id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: session.title || "売場添削アプリ",
          url,
        });
      } catch {
        // ユーザーがキャンセルした場合などは何もしない
      }
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(url);
      alert("リンクをコピーしました");
    } else {
      alert(url);
    }
  }

  const openSession = initialSessions.find((s) => s.id === openSessionId) ?? null;

  const stores = useMemo(
    () =>
      [...new Set(initialSessions.map((s) => s.images?.store_name).filter(Boolean))] as string[],
    [initialSessions],
  );
  const categories = useMemo(
    () =>
      [
        ...new Set(
          initialSessions.map((s) => s.images?.shelf_category).filter(Boolean),
        ),
      ] as string[],
    [initialSessions],
  );

  const visibleSessions = useMemo(() => {
    let list = initialSessions.filter((s) => {
      if (storeFilter && s.images?.store_name !== storeFilter) return false;
      if (categoryFilter && s.images?.shelf_category !== categoryFilter) return false;
      return true;
    });
    if (sortMode === "needs_work") {
      const rateOf = (sessionId: string) => {
        const rs = reactions.filter((r) => r.session_id === sessionId);
        const needsWork = rs.filter((r) => r.reaction_type === "needs_work").length;
        return rs.length ? needsWork / rs.length : -1;
      };
      list = [...list].sort((a, b) => rateOf(b.id) - rateOf(a.id));
    }
    return list;
  }, [initialSessions, storeFilter, categoryFilter, sortMode, reactions]);

  return (
    <div>
      {initialSessions.length > 0 && (
        <div className="mx-auto mb-4 flex max-w-md flex-wrap gap-2">
          <select
            value={storeFilter}
            onChange={(e) => setStoreFilter(e.target.value)}
            className="rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-xs text-gray-100"
          >
            <option value="">すべての店舗</option>
            {stores.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-xs text-gray-100"
          >
            <option value="">すべての売場</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
            className="ml-auto rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-xs text-gray-100"
          >
            <option value="new">新着順</option>
            <option value="needs_work">まだまだ率が高い順</option>
          </select>
        </div>
      )}

      {initialSessions.length === 0 && (
        <p className="text-sm text-gray-500">
          まだ投稿がありません。売場写真をアップロードして最初の投稿を作りましょう。
        </p>
      )}
      {initialSessions.length > 0 && visibleSessions.length === 0 && (
        <p className="text-sm text-gray-500">条件に一致する投稿がありません。</p>
      )}

      <div ref={listRef} className="mx-auto flex max-w-md flex-col gap-6">
        {visibleSessions.map((session) => {
          if (!session.images) return null;
          const sessionComments = comments.filter(
            (c) => c.session_id === session.id,
          );
          const sessionReactions = reactions.filter(
            (r) => r.session_id === session.id,
          );
          const doneCount = sessionReactions.filter(
            (r) => r.reaction_type === "done",
          ).length;
          const needsWorkCount = sessionReactions.filter(
            (r) => r.reaction_type === "needs_work",
          ).length;
          const total = doneCount + needsWorkCount;
          const doneRate = total ? Math.round((doneCount / total) * 100) : 0;
          const needsWorkRate = total ? 100 - doneRate : 0;
          const myReaction = sessionReactions.find(
            (r) => r.user_id === currentUserId,
          )?.reaction_type;
          const commentCount = commentCounts[session.id] ?? 0;
          const clapCount = clapCounts[session.id] ?? 0;

          return (
            <article
              key={session.id}
              className="overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900"
            >
              <Link
                href={`/sessions/${session.id}`}
                className="flex items-center justify-between px-3 py-2"
              >
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
                      session.status === "open"
                        ? "bg-green-900/50 text-green-300"
                        : "bg-neutral-700 text-gray-300"
                    }`}
                  >
                    {session.status === "open" ? "進行中" : "クローズ済"}
                  </span>
                </div>
              </Link>

              <div
                className="relative select-none"
                onClick={(e) => handlePhotoTap(session.id, e)}
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

                {poppingId === session.id && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <span className="heart-pop text-7xl">🙏</span>
                  </div>
                )}
              </div>

              <div className="px-3 py-3">
                <button
                  type="button"
                  onClick={() => handleClap(session.id)}
                  className="mb-2 w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm font-semibold text-gray-200 active:bg-neutral-700"
                >
                  🙏 ありがとう {clapCount}
                </button>

                <div className="mb-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleReact(session.id, "done")}
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
                    onClick={() => handleReact(session.id, "needs_work")}
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
                    onClick={() => setOpenSessionId(session.id)}
                    className="flex items-center gap-1 text-gray-400"
                  >
                    <span className="text-xl leading-none">💬</span>
                    <span className="text-xs">{commentCount}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleShare(session)}
                    className="text-xl leading-none text-gray-400"
                    aria-label="共有"
                  >
                    📤
                  </button>
                </div>

                {total > 0 && (
                  <div className="mb-2">
                    <div className="flex h-2 overflow-hidden rounded-full bg-neutral-800">
                      <div
                        className="bg-blue-500"
                        style={{ width: `${doneRate}%` }}
                      />
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
              </div>
            </article>
          );
        })}
      </div>

      {openSession && (
        <SessionCommentModal
          session={openSession}
          currentUserId={currentUserId}
          onClose={() => setOpenSessionId(null)}
        />
      )}
    </div>
  );
}
