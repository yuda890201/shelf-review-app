import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { shelfImagePublicUrl } from "@/lib/supabase/storage";
import type { SessionWithImage } from "@/lib/types";

export default async function SessionListPage() {
  const supabase = await createClient();
  const { data: sessions, error } = await supabase
    .from("sessions")
    .select("*, images(*)")
    .order("created_at", { ascending: false })
    .returns<SessionWithImage[]>();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-bold">セッション一覧</h1>
        <Link
          href="/sessions/new"
          className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white"
        >
          + 新規セッション
        </Link>
      </div>

      {error && (
        <p className="text-sm text-red-600">
          読み込みに失敗しました: {error.message}
        </p>
      )}

      {sessions && sessions.length === 0 && (
        <p className="text-sm text-gray-500">
          まだセッションがありません。売場写真をアップロードして最初のブレスト会を作成しましょう。
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {sessions?.map((session) => (
          <li key={session.id}>
            <Link
              href={`/sessions/${session.id}`}
              className="flex items-center gap-4 rounded-lg border border-gray-200 bg-white p-3 hover:border-blue-300 hover:shadow-sm"
            >
              {session.images && (
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md bg-gray-100">
                  <Image
                    src={shelfImagePublicUrl(session.images.storage_path)}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="64px"
                    unoptimized
                  />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-semibold text-gray-900">
                    {session.title || "無題のセッション"}
                  </p>
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
                <p className="truncate text-xs text-gray-500">
                  {session.images?.store_name}{" "}
                  {session.images?.shelf_category &&
                    `/ ${session.images.shelf_category}`}
                </p>
                <p className="text-xs text-gray-400">
                  {new Date(session.created_at).toLocaleString("ja-JP")}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
