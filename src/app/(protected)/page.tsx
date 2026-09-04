import { createClient } from "@/lib/supabase/server";
import type { ReactionRow, SessionWithImage } from "@/lib/types";
import Feed from "./feed";

export default async function HomePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: sessions, error } = await supabase
    .from("sessions")
    .select(
      "*, images!sessions_image_id_fkey(*), after_image:images!sessions_after_image_id_fkey(*)",
    )
    .order("created_at", { ascending: false })
    .returns<SessionWithImage[]>();

  const { data: reactions } = await supabase
    .from("reactions")
    .select("*")
    .returns<ReactionRow[]>();

  const { data: commentRows } = await supabase.from("comments").select("session_id");

  const commentCounts: Record<string, number> = {};
  for (const row of commentRows ?? []) {
    commentCounts[row.session_id] = (commentCounts[row.session_id] ?? 0) + 1;
  }

  if (user) {
    await supabase
      .from("profiles")
      .update({ notifications_seen_at: new Date().toISOString() })
      .eq("id", user.id);
  }

  if (error) {
    return (
      <p className="text-sm text-red-600">
        読み込みに失敗しました: {error.message}
      </p>
    );
  }

  return (
    <Feed
      initialSessions={sessions ?? []}
      initialReactions={reactions ?? []}
      commentCounts={commentCounts}
      currentUserId={user?.id ?? null}
    />
  );
}
