"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { shelfImagePublicUrl } from "@/lib/supabase/storage";
import type { ReactionRow, ReactionType, SessionWithImage } from "@/lib/types";

type SortMode = "new" | "needs_work";

export default function Feed({
  initialSessions,
  initialReactions,
  commentCounts,
  currentUserId,
}: {
  initialSessions: SessionWithImage[];
  initialReactions: ReactionRow[];
  commentCounts: Record<string, number>;
  currentUserId: string | null;
}) {
  const supabase = createClient();
  const [reactions, setReactions] = useState<ReactionRow[]>(initialReactions);
  const [storeFilter, setStoreFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("new");
  const [poppingId, setPoppingId] = useState<string | null>(null);
  const lastTapRef = useRef<Record<string, number>>({});

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

  function handlePhotoTap(sessionId: string, e: React.MouseEvent) {
    const now = e.timeStamp;
    const last = lastTapRef.current[sessionId] ?? 0;
    if (now - last < 300) {
      lastTapRef.current[sessionId] = 0;
      handleReact(sessionId, "like");
      setPoppingId(sessionId);
      setTimeout(() => setPoppingId((cur) => (cur === sessionId ? null : cur)), 800);
    } else {
      lastTapRef.current[sessionId] = now;
    }
  }

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
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-bold">フィード</h1>
        <Link
          href="/sessions/new"
          className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white"
        >
          + 新規セッション
        </Link>
      </div>

      {initialSessions.length > 0 && (
        <div className="mx-auto mb-4 flex max-w-md flex-wrap gap-2">
          <select
            value={storeFilter}
            onChange={(e) => setStoreFilter(e.target.value)}
            className="rounded-md border border-gray-300 px-2 py-1.5 text-xs"
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
            className="rounded-md border border-gray-300 px-2 py-1.5 text-xs"
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
            className="ml-auto rounded-md border border-gray-300 px-2 py-1.5 text-xs"
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

      <div className="mx-auto flex max-w-md flex-col gap-6">
        {visibleSessions.map((session) => {
          if (!session.images) return null;
          const sessionReactions = reactions.filter(
            (r) => r.session_id === session.id,
          );
          const likeCount = sessionReactions.filter(
            (r) => r.reaction_type === "like",
          ).length;
          const needsWorkCount = sessionReactions.filter(
            (r) => r.reaction_type === "needs_work",
          ).length;
          const total = likeCount + needsWorkCount;
          const likeRate = total ? Math.round((likeCount / total) * 100) : 0;
          const needsWorkRate = total ? 100 - likeRate : 0;
          const myReaction = sessionReactions.find(
            (r) => r.user_id === currentUserId,
          )?.reaction_type;
          const commentCount = commentCounts[session.id] ?? 0;

          return (
            <article
              key={session.id}
              className="overflow-hidden rounded-lg border border-gray-200 bg-white"
            >
              <Link
                href={`/sessions/${session.id}`}
                className="flex items-center justify-between px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-900">
                    {session.title || "無題のセッション"}
                  </p>
                  <p className="truncate text-xs text-gray-500">
                    {session.images.store_name}{" "}
                    {session.images.shelf_category &&
                      `/ ${session.images.shelf_category}`}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                    session.status === "open"
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {session.status === "open" ? "進行中" : "クローズ済"}
                </span>
              </Link>

              <div
                className="relative select-none"
                onClick={(e) => handlePhotoTap(session.id, e)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={shelfImagePublicUrl(session.images.storage_path)}
                  alt=""
                  className="aspect-square w-full bg-gray-100 object-cover"
                  draggable={false}
                />

                {myReaction && (
                  <div className="absolute right-2 top-2 rounded-full bg-black/55 px-2 py-1 text-base leading-none">
                    {myReaction === "like" ? "🙏" : "🔧"}
                  </div>
                )}

                {poppingId === session.id && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <span className="heart-pop text-7xl">🙏</span>
                  </div>
                )}
              </div>

              <div className="px-3 py-3">
                <div className="mb-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleReact(session.id, "like")}
                    className={`flex-1 rounded-md border px-3 py-2 text-sm font-semibold ${
                      myReaction === "like"
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-gray-300 text-gray-600"
                    }`}
                  >
                    🙏 ありがとう {likeCount}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReact(session.id, "needs_work")}
                    className={`flex-1 rounded-md border px-3 py-2 text-sm font-semibold ${
                      myReaction === "needs_work"
                        ? "border-orange-500 bg-orange-50 text-orange-700"
                        : "border-gray-300 text-gray-600"
                    }`}
                  >
                    🔧 まだまだ {needsWorkCount}
                  </button>
                </div>

                {total > 0 && (
                  <div className="mb-2">
                    <div className="flex h-2 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="bg-blue-500"
                        style={{ width: `${likeRate}%` }}
                      />
                      <div
                        className="bg-orange-400"
                        style={{ width: `${needsWorkRate}%` }}
                      />
                    </div>
                    <div className="mt-1 flex justify-between text-[11px] text-gray-500">
                      <span>ありがとう率 {likeRate}%</span>
                      <span>まだまだ率 {needsWorkRate}%</span>
                    </div>
                  </div>
                )}

                <Link
                  href={`/sessions/${session.id}`}
                  className="text-xs text-gray-500 hover:underline"
                >
                  コメントを見る({commentCount}件)
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
