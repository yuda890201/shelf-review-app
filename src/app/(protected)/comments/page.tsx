import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { CommentType } from "@/lib/types";

type CommentSearchRow = {
  id: string;
  session_id: string;
  comment_type: CommentType;
  body: string;
  created_at: string;
  images: { store_name: string | null; shelf_category: string | null } | null;
  sessions: { title: string | null } | null;
};

const TYPE_LABEL: Record<CommentType, string> = {
  good: "良い点",
  bad: "気になる点",
};

export default async function CommentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string }>;
}) {
  const { q = "", type = "all" } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("comments")
    .select("id, session_id, comment_type, body, created_at, images(store_name, shelf_category), sessions(title)")
    .order("created_at", { ascending: false })
    .limit(200);

  if (type === "good" || type === "bad") {
    query = query.eq("comment_type", type);
  }
  if (q) {
    query = query.ilike("body", `%${q}%`);
  }

  const { data: comments, error } = await query.returns<CommentSearchRow[]>();

  return (
    <div>
      <h1 className="mb-4 text-lg font-bold text-gray-100">コメント一覧</h1>

      <form className="mb-4 flex flex-wrap gap-2" method="get">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="コメント本文を検索..."
          className="min-w-[200px] flex-1 rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-gray-100 placeholder-gray-500"
        />
        <select
          name="type"
          defaultValue={type}
          className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-gray-100"
        >
          <option value="all">すべて</option>
          <option value="good">良い点</option>
          <option value="bad">気になる点</option>
        </select>
        <button
          type="submit"
          className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white"
        >
          検索
        </button>
      </form>

      {error && (
        <p className="text-sm text-red-400">読み込みに失敗しました: {error.message}</p>
      )}

      {comments && comments.length === 0 && (
        <p className="text-sm text-gray-500">該当するコメントがありません。</p>
      )}

      <ul className="flex flex-col gap-2">
        {comments?.map((c) => (
          <li key={c.id}>
            <Link
              href={`/?session=${c.session_id}`}
              className="block rounded-md border border-neutral-800 bg-neutral-900 p-3 hover:border-blue-500"
            >
              <div className="mb-1 flex items-center gap-2 text-xs">
                <span
                  className={`rounded-full px-1.5 py-0.5 font-medium ${
                    c.comment_type === "good"
                      ? "bg-green-900/50 text-green-300"
                      : "bg-red-900/50 text-red-300"
                  }`}
                >
                  {TYPE_LABEL[c.comment_type]}
                </span>
                <span className="text-gray-400">
                  {c.sessions?.title || "無題のセッション"}
                </span>
                {c.images?.store_name && (
                  <span className="text-gray-500">/ {c.images.store_name}</span>
                )}
                {c.images?.shelf_category && (
                  <span className="text-gray-500">/ {c.images.shelf_category}</span>
                )}
                <span className="ml-auto text-gray-500">
                  {new Date(c.created_at).toLocaleString("ja-JP")}
                </span>
              </div>
              <p className="text-sm text-gray-200">{c.body}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
