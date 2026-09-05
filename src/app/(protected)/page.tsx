import { createClient } from "@/lib/supabase/server";
import type { CommentRow, ReactionRow, SessionWithImage } from "@/lib/types";
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

  const { data: clapRows } = await supabase.from("claps").select("session_id");

  const clapCounts: Record<string, number> = {};
  for (const row of clapRows ?? []) {
    clapCounts[row.session_id] = (clapCounts[row.session_id] ?? 0) + 1;
  }

  const { data: comments } = await supabase
    .from("comments")
    .select("*")
    .returns<CommentRow[]>();

  const commentCounts: Record<string, number> = {};
  for (const row of comments ?? []) {
    commentCounts[row.session_id] = (commentCounts[row.session_id] ?? 0) + 1;
  }

  const { data: profileRows } = await supabase
    .from("profiles")
    .select("id, display_name")
    .returns<{ id: string; display_name: string }[]>();

  const profileNames: Record<string, string> = {};
  for (const row of profileRows ?? []) {
    profileNames[row.id] = row.display_name;
  }

  if (user) {
    await supabase
      .from("profiles")
      .update({ notifications_seen_at: new Date().toISOString() })
      .eq("id", user.id);
  }

  if (error) {
    return (
      <p className="text-sm text-red-400">
        読み込みに失敗しました: {error.message}
      </p>
    );
  }

  return (
    <Feed
      initialSessions={sessions ?? []}
      initialReactions={reactions ?? []}
      initialClapCounts={clapCounts}
      initialComments={comments ?? []}
      commentCounts={commentCounts}
      profileNames={profileNames}
      currentUserId={user?.id ?? null}
    />
  );
}
