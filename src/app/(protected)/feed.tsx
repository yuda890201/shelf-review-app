"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n/provider";
import {
  DEFAULT_FEED_FILTERS,
  FEED_PAGE_SIZE,
  fetchFeedPage,
  fetchSessionWithRelations,
  type FeedFilters,
  type FeedPage,
  type FeedSortMode,
} from "@/lib/feed-data";
import type {
  ClapRow,
  CommentRow,
  CommentType,
  LayoutRow,
  ReactionRow,
  ReactionType,
  SessionWithImage,
  TagRow,
} from "@/lib/types";
import SessionCard from "./session-card";
import PullToRefresh from "@/components/pull-to-refresh";

// 紙吹雪の演出は「ゴンドラを選んだとき」にしか出ないので、初回のバンドルには
// 含めず必要になってから読み込む。
const ThankYouCelebration = dynamic(
  () => import("@/components/thank-you-celebration"),
  { ssr: false },
);

// コメントが1件も無い投稿に毎回新しい配列を渡すと、memo化したカードが
// 「propsが変わった」と判断して描き直されてしまうので使い回す。
const NO_COMMENTS: CommentRow[] = [];
const NO_REACTIONS: ReactionRow[] = [];

/** 既にある行はそのままに、まだ無い行だけを後ろに足す。 */
function mergeById<T extends { id: string }>(current: T[], incoming: T[]): T[] {
  if (incoming.length === 0) return current;
  const seen = new Set(current.map((row) => row.id));
  const added = incoming.filter((row) => !seen.has(row.id));
  return added.length === 0 ? current : [...current, ...added];
}

export default function Feed({
  initialPage,
  initialProfileNames,
  layouts,
  storeOptions,
  truckOptions,
  currentUserId,
}: {
  initialPage: FeedPage;
  initialProfileNames: Record<string, string>;
  layouts: LayoutRow[];
  /** 実際に投稿に付いている店舗名。マスタではなくこちらと突き合わせて絞り込む。 */
  storeOptions: string[];
  /** 同上。「その他」で手入力された便もここに含まれる。 */
  truckOptions: string[];
  currentUserId: string | null;
}) {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useI18n();

  const [sessions, setSessions] = useState<SessionWithImage[]>(
    initialPage.sessions,
  );
  const [reactions, setReactions] = useState<ReactionRow[]>(
    initialPage.reactions,
  );
  const [clapCounts, setClapCounts] = useState<Record<string, number>>(
    initialPage.clapCounts,
  );
  const [comments, setComments] = useState<CommentRow[]>(initialPage.comments);
  const [hasMore, setHasMore] = useState(initialPage.hasMore);
  const [loadError, setLoadError] = useState<string | null>(initialPage.error);
  const [loadingMore, setLoadingMore] = useState(false);
  const [profileNames, setProfileNames] =
    useState<Record<string, string>>(initialProfileNames);
  const [tags, setTags] = useState<Record<CommentType, TagRow[]>>({
    good: [],
    bad: [],
  });
  const [filters, setFilters] = useState<FeedFilters>(DEFAULT_FEED_FILTERS);
  const [poppingId, setPoppingId] = useState<string | null>(null);
  const [celebrating, setCelebrating] = useState(false);

  // Realtimeの通知は今読み込んでいる投稿の分だけ反映する。読み込んでいない
  // 投稿の行まで溜め込むと、件数が増えるほどメモリと再描画の無駄になる。
  const loadedIdsRef = useRef<Set<string>>(
    new Set(initialPage.sessions.map((s) => s.id)),
  );
  // 下のハンドラから「今の値」を読むためのref。state を直接依存に入れると
  // リアクションが1つ増えるたびにコールバックの中身が変わり、memo化した
  // SessionCard が全部描き直されてしまう。
  const sessionsRef = useRef(sessions);
  const reactionsRef = useRef(reactions);
  const profileNamesRef = useRef(profileNames);

  useEffect(() => {
    loadedIdsRef.current = new Set(sessions.map((s) => s.id));
    sessionsRef.current = sessions;
  }, [sessions]);
  useEffect(() => {
    reactionsRef.current = reactions;
  }, [reactions]);
  useEffect(() => {
    profileNamesRef.current = profileNames;
  }, [profileNames]);

  useEffect(() => {
    // ?session=<id> は共有リンクやプッシュ通知から開いたときにその投稿まで
    // スクロールするための一時的なパラメータ。URLに残したままだと再訪問のたびに
    // スクロールし直してしまうので、読み取ったら一度きりで消す。
    const targetId = searchParams.get("session");
    if (!targetId) return;
    router.replace("/", { scroll: false });

    let cancelled = false;

    function scrollToTarget() {
      document
        .getElementById(`session-${targetId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    if (initialPage.sessions.some((s) => s.id === targetId)) {
      scrollToTarget();
      return;
    }

    // フィードは1ページ8件しか読み込まないので、古い投稿へのリンクだと
    // 対象がまだDOMに無い。その1件だけ取ってきて先頭に差し込む。
    fetchSessionWithRelations(supabase, targetId).then((page) => {
      if (cancelled || page.sessions.length === 0) return;
      setSessions((prev) => mergeById(page.sessions, prev));
      setReactions((prev) => mergeById(prev, page.reactions));
      setComments((prev) => mergeById(prev, page.comments));
      setClapCounts((prev) => ({ ...page.clapCounts, ...prev }));
      // 差し込んだ直後はまだ描画されていないので次のフレームで狙う。
      requestAnimationFrame(scrollToTarget);
    });

    return () => {
      cancelled = true;
    };
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
          good: data.filter((tag) => tag.comment_type === "good"),
          bad: data.filter((tag) => tag.comment_type === "bad"),
        });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 購読は1チャンネルにまとめる。チャンネルを分けるとWebSocketの
  // やり取りとコールバックが二重になるだけで得がない。
  useEffect(() => {
    const isLoaded = (sessionId: string) => loadedIdsRef.current.has(sessionId);

    const channel = supabase
      .channel("feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "tags" },
        (payload) => {
          const row = payload.new as TagRow;
          setTags((prev) =>
            prev[row.comment_type].some((tag) => tag.id === row.id)
              ? prev
              : {
                  ...prev,
                  [row.comment_type]: [...prev[row.comment_type], row],
                },
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
            [row.comment_type]: prev[row.comment_type].map((tag) =>
              tag.id === row.id ? row : tag,
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
            good: prev.good.filter((tag) => tag.id !== oldRow.id),
            bad: prev.bad.filter((tag) => tag.id !== oldRow.id),
          }));
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "reactions" },
        (payload) => {
          const row = payload.new as ReactionRow;
          if (!isLoaded(row.session_id)) return;
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
          if (!isLoaded(row.session_id)) return;
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
          if (!isLoaded(row.session_id)) return;
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

  const applyPage = useCallback((page: FeedPage, append: boolean) => {
    setLoadError(page.error);
    // 取得に失敗したときまで hasMore を false にすると、一時的な通信エラーで
    // 「もっと見る」が消えたまま戻らなくなる。成功したときだけ更新する。
    if (!page.error) setHasMore(page.hasMore);

    if (append) {
      // ページングは件数オフセットなので、閲覧中に新しい投稿が入ると
      // 同じ投稿が次のページにも現れる。IDで重複を弾く。
      setSessions((prev) => mergeById(prev, page.sessions));
      setReactions((prev) => mergeById(prev, page.reactions));
      setComments((prev) => mergeById(prev, page.comments));
      setClapCounts((prev) => ({ ...prev, ...page.clapCounts }));
    } else {
      setSessions(page.sessions);
      setReactions(page.reactions);
      setComments(page.comments);
      setClapCounts(page.clapCounts);
    }
  }, []);

  const reload = useCallback(
    async (next: FeedFilters) => {
      const [page, { data: profileRows }] = await Promise.all([
        fetchFeedPage(supabase, 0, next),
        supabase
          .from("profiles")
          .select("id, display_name")
          .returns<{ id: string; display_name: string }[]>(),
      ]);
      applyPage(page, false);
      if (profileRows) {
        const names: Record<string, string> = {};
        for (const row of profileRows) names[row.id] = row.display_name;
        setProfileNames(names);
      }
    },
    [supabase, applyPage],
  );

  const changeFilters = useCallback(
    (patch: Partial<FeedFilters>) => {
      const next = { ...filters, ...patch };
      setFilters(next);
      setLoadingMore(true);
      reload(next).finally(() => setLoadingMore(false));
    },
    [filters, reload],
  );

  const loadMore = useCallback(async () => {
    setLoadingMore(true);
    const page = await fetchFeedPage(supabase, sessions.length, filters);
    applyPage(page, true);
    setLoadingMore(false);
  }, [supabase, sessions.length, filters, applyPage]);

  const refreshFeed = useCallback(async () => {
    await reload(filters);
  }, [reload, filters]);

  const handleCommentAdded = useCallback((row: CommentRow) => {
    setComments((prev) =>
      prev.some((c) => c.id === row.id) ? prev : [...prev, row],
    );
  }, []);

  const handleReact = useCallback(
    async (sessionId: string, type: ReactionType) => {
      if (!currentUserId) return;
      const names = profileNamesRef.current;
      const myName = names[currentUserId];
      const existing = reactionsRef.current.find(
        (r) =>
          r.session_id === sessionId &&
          (myName ? names[r.user_id] === myName : r.user_id === currentUserId),
      );

      // 匿名ログインは再ログインのたびに別のuser_idになるため、user_id単位では
      // 同一人物による多重投票を防げない。表示名が同じ既存の投票があり、それが
      // 自分(今のuser_id)のものでない場合は、他人のログインをまたいだ多重投票を
      // 防ぐため何もしない(ボタン自体もUI側で無効化される)。
      if (existing && existing.user_id !== currentUserId) return;

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
        if (error)
          setReactions((prev) => prev.filter((r) => r.id !== newRow.id));
      }
    },
    [supabase, currentUserId],
  );

  const handleClap = useCallback(
    async (sessionId: string) => {
      if (!currentUserId) return;
      setPoppingId(sessionId);
      setTimeout(
        () => setPoppingId((cur) => (cur === sessionId ? null : cur)),
        800,
      );
      // カウントはリアルタイム購読(claps INSERT)側で加算するので、ここでは
      // 楽観的更新をせず二重カウントを避ける。
      await supabase
        .from("claps")
        .insert({ session_id: sessionId, user_id: currentUserId });
    },
    [supabase, currentUserId],
  );

  const handleSessionUpdate = useCallback((updated: SessionWithImage) => {
    setSessions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  }, []);

  const handleSelectLayout = useCallback(
    async (sessionId: string, layoutId: string | null) => {
      if (!currentUserId) return;
      // 失敗時に戻す値は、状態更新関数の中ではなく今の値から先に読んでおく
      // (更新関数が呼ばれるのは再描画のタイミングで、awaitより後になりうるため)。
      const previous =
        sessionsRef.current.find((s) => s.id === sessionId)?.layout_id ?? null;
      setSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? { ...s, layout_id: layoutId } : s)),
      );
      const { error } = await supabase.rpc("set_session_layout", {
        p_session_id: sessionId,
        p_layout_id: layoutId,
      });
      if (error) {
        setSessions((prev) =>
          prev.map((s) =>
            s.id === sessionId ? { ...s, layout_id: previous } : s,
          ),
        );
        alert(t.card.gondolaFailed(error.message));
        return;
      }
      // 手間をかけて選んでもらったことへのお礼演出。未選択に戻す操作では出さない。
      if (layoutId) setCelebrating(true);
    },
    [supabase, currentUserId, t],
  );

  const stopCelebrating = useCallback(() => setCelebrating(false), []);

  // 投稿ごとの絞り込みを毎回 filter で回すと投稿数 × コメント数の計算になる。
  // 一度だけまとめてMapに振り分けておく。
  const commentsBySession = useMemo(() => {
    const map = new Map<string, CommentRow[]>();
    for (const comment of comments) {
      const list = map.get(comment.session_id);
      if (list) list.push(comment);
      else map.set(comment.session_id, [comment]);
    }
    return map;
  }, [comments]);

  const reactionsBySession = useMemo(() => {
    const map = new Map<string, ReactionRow[]>();
    for (const reaction of reactions) {
      const list = map.get(reaction.session_id);
      if (list) list.push(reaction);
      else map.set(reaction.session_id, [reaction]);
    }
    return map;
  }, [reactions]);

  const noneLoaded = sessions.length === 0;
  const filtered =
    !!filters.store || !!filters.truck || !!filters.layoutId;

  return (
    <>
      {celebrating && <ThankYouCelebration onDone={stopCelebrating} />}
      <PullToRefresh onRefresh={refreshFeed}>
        <div className="mx-auto mb-4 flex max-w-md flex-wrap gap-2">
          <select
            value={filters.store ?? ""}
            onChange={(e) =>
              changeFilters({ store: e.target.value || null })
            }
            className="rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-xs text-gray-100"
          >
            <option value="">{t.feed.allStores}</option>
            {storeOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <select
            value={filters.truck ?? ""}
            onChange={(e) =>
              changeFilters({ truck: e.target.value || null })
            }
            className="rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-xs text-gray-100"
          >
            <option value="">{t.feed.allTrucks}</option>
            {truckOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <select
            value={filters.layoutId ?? ""}
            onChange={(e) =>
              changeFilters({ layoutId: e.target.value || null })
            }
            className="rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-xs text-gray-100"
          >
            <option value="">{t.feed.allGondolas}</option>
            {layouts.map((layout) => (
              <option key={layout.id} value={layout.id}>
                {layout.name}
              </option>
            ))}
          </select>
          <select
            value={filters.sort}
            onChange={(e) =>
              changeFilters({ sort: e.target.value as FeedSortMode })
            }
            className="ml-auto rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-xs text-gray-100"
          >
            <option value="new">{t.feed.sortNew}</option>
            <option value="needs_work">{t.feed.sortNeedsWork}</option>
          </select>
        </div>

        {loadError && (
          <p className="text-sm text-red-400">{t.common.loadFailed(loadError)}</p>
        )}

        {noneLoaded && !loadError && (
          <p className="text-sm text-gray-500">
            {filtered ? t.feed.noMatch : t.feed.empty}
          </p>
        )}

        <div className="mx-auto flex max-w-md flex-col gap-6">
          {sessions.map((session) => {
            if (!session.images) return null;
            const sessionReactions =
              reactionsBySession.get(session.id) ?? NO_REACTIONS;
            const doneCount = sessionReactions.filter(
              (r) => r.reaction_type === "done",
            ).length;
            const myName = currentUserId
              ? profileNames[currentUserId]
              : undefined;
            const myReactionRow = sessionReactions.find((r) =>
              myName
                ? profileNames[r.user_id] === myName
                : r.user_id === currentUserId,
            );

            return (
              <SessionCard
                key={session.id}
                session={session}
                posterName={
                  (session.facilitator_id &&
                    profileNames[session.facilitator_id]) ||
                  null
                }
                sessionComments={
                  commentsBySession.get(session.id) ?? NO_COMMENTS
                }
                doneCount={doneCount}
                needsWorkCount={sessionReactions.length - doneCount}
                myReaction={myReactionRow?.reaction_type}
                // 匿名ログインは再ログインのたびに別のuser_idになるため、表示名が同じ
                // 既存の投票が別のuser_idに紐づいている場合は、多重投票を防ぐため
                // ボタンを無効化する。
                reactionLocked={
                  !!myReactionRow && myReactionRow.user_id !== currentUserId
                }
                clapCount={clapCounts[session.id] ?? 0}
                isPopping={poppingId === session.id}
                currentUserId={currentUserId}
                tags={tags}
                onTagsChange={setTags}
                onCommentAdded={handleCommentAdded}
                onReact={handleReact}
                onClap={handleClap}
                onSessionUpdate={handleSessionUpdate}
                layouts={layouts}
                onSelectLayout={handleSelectLayout}
              />
            );
          })}
        </div>

        {hasMore && (
          <div className="mx-auto mt-6 max-w-md">
            <button
              type="button"
              onClick={loadMore}
              disabled={loadingMore}
              className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-3 text-sm font-semibold text-gray-200 active:bg-neutral-800 disabled:opacity-50"
            >
              {loadingMore
                ? t.feed.loadingMore
                : `${t.feed.loadMore} (+${FEED_PAGE_SIZE})`}
            </button>
          </div>
        )}
      </PullToRefresh>
    </>
  );
}
