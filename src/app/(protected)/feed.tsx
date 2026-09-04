"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { shelfImagePublicUrl } from "@/lib/supabase/storage";
import type { ReactionRow, ReactionType, SessionWithImage } from "@/lib/types";

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

      {initialSessions.length === 0 && (
        <p className="text-sm text-gray-500">
          まだ投稿がありません。売場写真をアップロードして最初の投稿を作りましょう。
        </p>
      )}

      <div className="mx-auto flex max-w-md flex-col gap-6">
        {initialSessions.map((session) => {
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
              <div className="flex items-center justify-between px-3 py-2">
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
              </div>

              <Link href={`/sessions/${session.id}`} className="block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={shelfImagePublicUrl(session.images.storage_path)}
                  alt=""
                  className="aspect-square w-full bg-gray-100 object-cover"
                />
              </Link>

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
                    👍 いいね {likeCount}
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
                      <span>いいね率 {likeRate}%</span>
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
