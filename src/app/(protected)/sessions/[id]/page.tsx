import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { CommentRow, SessionWithImage } from "@/lib/types";
import SessionBoard from "./session-board";

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: session } = await supabase
    .from("sessions")
    .select("*, images(*)")
    .eq("id", id)
    .single<SessionWithImage>();

  if (!session || !session.images) {
    notFound();
  }

  const { data: comments } = await supabase
    .from("comments")
    .select("*")
    .eq("session_id", id)
    .order("created_at", { ascending: true })
    .returns<CommentRow[]>();

  return (
    <SessionBoard
      session={session}
      initialComments={comments ?? []}
      currentUserId={user?.id ?? null}
    />
  );
}
