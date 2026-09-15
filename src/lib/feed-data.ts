import type { SupabaseClient } from "@supabase/supabase-js";
import type { CommentRow, ReactionRow, SessionWithImage } from "@/lib/types";

/**
 * フィードは1ページずつ読み込む。以前は投稿・コメント・リアクションを全件
 * 取得していたため、投稿が増えるほど初回表示が重くなっていた。
 */
export const FEED_PAGE_SIZE = 8;

export type FeedSortMode = "new" | "needs_work";

export type FeedFilters = {
  store: string | null;
  truck: string | null;
  layoutId: string | null;
  sort: FeedSortMode;
};

export const DEFAULT_FEED_FILTERS: FeedFilters = {
  store: null,
  truck: null,
  layoutId: null,
  sort: "new",
};

export type FeedPage = {
  sessions: SessionWithImage[];
  reactions: ReactionRow[];
  clapCounts: Record<string, number>;
  comments: CommentRow[];
  /** まだ続きのページがあるか。 */
  hasMore: boolean;
  /** 取得に失敗した場合のメッセージ。 */
  error: string | null;
};

export const EMPTY_FEED_PAGE: FeedPage = {
  sessions: [],
  reactions: [],
  clapCounts: {},
  comments: [],
  hasMore: false,
  error: null,
};

/**
 * 1ページ分の投稿と、その投稿に紐づくコメント・リアクション・拍手だけを取る。
 *
 * 「どの投稿を、どの順で、どこから何件」という判断は `feed_session_ids`
 * (データベース側の関数)に任せる。絞り込みや並び替えのために全件を
 * ブラウザへ送らずに済み、低スペック端末でも初回表示が軽くなる。
 *
 * サーバー側の初回描画とクライアント側の追加読み込みの両方から呼べるよう、
 * Supabaseクライアントは引数で受け取る。
 */
export async function fetchFeedPage(
  supabase: SupabaseClient,
  offset: number,
  filters: FeedFilters = DEFAULT_FEED_FILTERS,
  pageSize: number = FEED_PAGE_SIZE,
): Promise<FeedPage> {
  const { data, error: idError } = await supabase.rpc("feed_session_ids", {
    p_store: filters.store,
    p_truck: filters.truck,
    p_layout: filters.layoutId,
    p_sort: filters.sort,
    // 1件多めに取って「次のページがあるか」を判定する(件数を数えるより軽い)
    p_limit: pageSize + 1,
    p_offset: offset,
  });

  if (idError) return { ...EMPTY_FEED_PAGE, error: idError.message };

  const idRows = (data ?? []) as { session_id: string }[];
  if (idRows.length === 0) return EMPTY_FEED_PAGE;

  const hasMore = idRows.length > pageSize;
  const ids = (hasMore ? idRows.slice(0, pageSize) : idRows).map(
    (row) => row.session_id,
  );

  const [
    { data: sessions, error: sessionError },
    { data: reactions },
    { data: clapRows },
    { data: comments },
  ] = await Promise.all([
    supabase
      .from("sessions")
      .select(
        "*, images!sessions_image_id_fkey(*), after_image:images!sessions_after_image_id_fkey(*)",
      )
      .in("id", ids)
      .returns<SessionWithImage[]>(),
    supabase
      .from("reactions")
      .select("*")
      .in("session_id", ids)
      .returns<ReactionRow[]>(),
    supabase.from("claps").select("session_id").in("session_id", ids),
    supabase
      .from("comments")
      .select("*")
      .in("session_id", ids)
      .returns<CommentRow[]>(),
  ]);

  if (sessionError) return { ...EMPTY_FEED_PAGE, error: sessionError.message };

  // `.in()` は並び順を保証しないので、関数が返した順に並べ直す。
  const byId = new Map((sessions ?? []).map((s) => [s.id, s]));
  const ordered = ids
    .map((id) => byId.get(id))
    .filter((s): s is SessionWithImage => !!s);

  const clapCounts: Record<string, number> = {};
  for (const row of clapRows ?? []) {
    clapCounts[row.session_id] = (clapCounts[row.session_id] ?? 0) + 1;
  }

  return {
    sessions: ordered,
    reactions: reactions ?? [],
    clapCounts,
    comments: comments ?? [],
    hasMore,
    error: null,
  };
}
