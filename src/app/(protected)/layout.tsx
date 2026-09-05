import { createClient } from "@/lib/supabase/server";
import BottomNav from "@/components/bottom-nav";

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
    <div className="flex min-h-screen flex-col bg-black">
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 pb-24">
        {children}
      </main>
      <BottomNav
        unreadCount={unreadCount}
        displayName={displayName}
        userId={user?.id ?? null}
      />
    </div>
  );
}
