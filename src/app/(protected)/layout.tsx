import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "@/components/sign-out-button";

async function getUnreadCount(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  seenAt: string,
) {
  const { data: mySessions } = await supabase
    .from("sessions")
    .select("id")
    .eq("facilitator_id", userId);
  const sessionIds = (mySessions ?? []).map((s) => s.id);
  if (sessionIds.length === 0) return 0;

  const { count: commentCount } = await supabase
    .from("comments")
    .select("id", { count: "exact", head: true })
    .in("session_id", sessionIds)
    .gt("created_at", seenAt)
    .neq("author_id", userId);

  const { count: reactionCount } = await supabase
    .from("reactions")
    .select("id", { count: "exact", head: true })
    .in("session_id", sessionIds)
    .gt("created_at", seenAt)
    .neq("user_id", userId);

  return (commentCount ?? 0) + (reactionCount ?? 0);
}

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let displayName: string | null = null;
  let unreadCount = 0;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, notifications_seen_at")
      .eq("id", user.id)
      .single();
    displayName = profile?.display_name ?? null;
    if (profile?.notifications_seen_at) {
      unreadCount = await getUnreadCount(
        supabase,
        user.id,
        profile.notifications_seen_at,
      );
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <nav className="flex items-center gap-4 text-sm font-medium">
            <Link href="/" className="font-bold text-gray-900">
              売場添削アプリ
            </Link>
            <Link
              href="/"
              className="relative text-gray-600 hover:text-gray-900"
            >
              フィード
              {unreadCount > 0 && (
                <span className="absolute -right-3 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Link>
            <Link
              href="/comments"
              className="text-gray-600 hover:text-gray-900"
            >
              コメント一覧
            </Link>
            <Link
              href="/dashboard"
              className="text-gray-600 hover:text-gray-900"
            >
              ダッシュボード
            </Link>
          </nav>
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <span>{displayName}</span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6">
        {children}
      </main>
    </div>
  );
}
