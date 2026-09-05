"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type {
  ClapRow,
  CommentRow,
  CommentType,
  ReactionRow,
  ReactionType,
  SessionWithImage,
  TagRow,
} from "@/lib/types";
import SessionCard from "./session-card";
import SessionCommentModal from "./session-comment-modal";

type SortMode = "new" | "needs_work";

export default function Feed({
  initialSessions,
  initialReactions,
  initialClapCounts,
  initialComments,
  commentCounts,
  profileNames,
  currentUserId,
}: {
  initialSessions: SessionWithImage[];
  initialReactions: ReactionRow[];
  initialClapCounts: Record<string, number>;
  initialComments: CommentRow[];
  commentCounts: Record<string, number>;
  profileNames: Record<string, string>;
  currentUserId: string | null;
}) {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sessions, setSessions] = useState<SessionWithImage[]>(initialSessions);
  const [reactions, setReactions] = useState<ReactionRow[]>(initialReactions);
  const [clapCounts, setClapCounts] =
    useState<Record<string, number>>(initialClapCounts);
  const [comments, setComments] = useState<CommentRow[]>(initialComments);
  const [tags, setTags] = useState<Record<CommentType, TagRow[]>>({
    good: [],
    bad: [],
  });
  const [storeFilter, setStoreFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("new");
  const [poppingId, setPoppingId] = useState<string | null>(null);
  const [openSessionId, setOpenSessionId] = useState<string | null>(
    () => searchParams.get("session"),
  );

  useEffect(() => {
    // ?session=<id> はモーダルを自動で開くためだけの一時的なパラメータ。
    // URLに残したままだとリロードや再訪問のたびに開き直してしまう
    // (背景スクロールがロックされたまま戻れなくなる不具合の原因になる)ので、
    // 読み取ったら一度きりで消す。
    if (searchParams.get("session")) {
      router.replace("/", { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  function addCommentIfNew(row: CommentRow) {
    setComments((prev) => (prev.some((c) => c.id === row.id) ? prev : [...prev, row]));
  }

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

  function handleSessionUpdate(updated: SessionWithImage) {
    setSessions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  }

  async function handleShare(session: SessionWithImage) {
    const url = `${window.location.origin}/?session=${session.id}`;
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

  const openSession = sessions.find((s) => s.id === openSessionId) ?? null;

  const stores = useMemo(
    () =>
      [...new Set(sessions.map((s) => s.images?.store_name).filter(Boolean))] as string[],
    [sessions],
  );
  const categories = useMemo(
    () =>
      [
        ...new Set(
          sessions.map((s) => s.images?.shelf_category).filter(Boolean),
        ),
      ] as string[],
    [sessions],
  );

  const visibleSessions = useMemo(() => {
    let list = sessions.filter((s) => {
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
  }, [sessions, storeFilter, categoryFilter, sortMode, reactions]);

  return (
    <div>
      {sessions.length > 0 && (
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

      {sessions.length === 0 && (
        <p className="text-sm text-gray-500">
          まだ投稿がありません。売場写真をアップロードして最初の投稿を作りましょう。
        </p>
      )}
      {sessions.length > 0 && visibleSessions.length === 0 && (
        <p className="text-sm text-gray-500">条件に一致する投稿がありません。</p>
      )}

      <div className="mx-auto flex max-w-md flex-col gap-6">
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
          const myReaction = sessionReactions.find(
            (r) => r.user_id === currentUserId,
          )?.reaction_type;

          return (
            <SessionCard
              key={session.id}
              session={session}
              posterName={
                (session.facilitator_id && profileNames[session.facilitator_id]) ||
                null
              }
              sessionComments={sessionComments}
              doneCount={doneCount}
              needsWorkCount={needsWorkCount}
              myReaction={myReaction}
              commentCount={commentCounts[session.id] ?? 0}
              clapCount={clapCounts[session.id] ?? 0}
              isPopping={poppingId === session.id}
              currentUserId={currentUserId}
              tags={tags}
              onTagsChange={setTags}
              onCommentAdded={addCommentIfNew}
              onReact={handleReact}
              onClap={handleClap}
              onShare={handleShare}
              onOpenComments={setOpenSessionId}
              onSessionUpdate={handleSessionUpdate}
            />
          );
        })}
      </div>

      {openSession?.images && (
        <SessionCommentModal
          session={openSession}
          currentUserId={currentUserId}
          onClose={() => setOpenSessionId(null)}
        />
      )}
    </div>
  );
}
