import type { SupabaseClient } from "@supabase/supabase-js";
import type { CommentRow, CommentType, PinObjectKind } from "@/lib/types";
import { BASE_HEIGHT_PCT, BASE_WIDTH_PCT, colorForId } from "@/lib/comment-pin";

export async function submitComment({
  supabase,
  sessionId,
  imageId,
  facilitatorId,
  currentUserId,
  type,
  body,
  objectKind = null,
  pin,
}: {
  supabase: SupabaseClient;
  sessionId: string;
  imageId: string;
  facilitatorId: string | null;
  currentUserId: string;
  type: CommentType;
  body: string;
  objectKind?: PinObjectKind | null;
  pin: {
    x: number;
    y: number;
    frameScale: number;
    rotationDeg: number;
    endX?: number | null;
    endY?: number | null;
  };
}): Promise<{ data?: CommentRow; error?: string }> {
  const id = crypto.randomUUID();
  const newComment: CommentRow = {
    id,
    session_id: sessionId,
    image_id: imageId,
    position_x: pin.x,
    position_y: pin.y,
    end_position_x: pin.endX ?? null,
    end_position_y: pin.endY ?? null,
    comment_type: type,
    body: body.trim(),
    object_kind: objectKind,
    author_id: currentUserId,
    created_at: new Date().toISOString(),
    width_pct: BASE_WIDTH_PCT * pin.frameScale,
    height_pct: BASE_HEIGHT_PCT * pin.frameScale,
    rotation_deg: pin.rotationDeg,
    color: colorForId(id),
  };

  const { error } = await supabase.from("comments").insert({
    id: newComment.id,
    session_id: newComment.session_id,
    image_id: newComment.image_id,
    position_x: newComment.position_x,
    position_y: newComment.position_y,
    end_position_x: newComment.end_position_x,
    end_position_y: newComment.end_position_y,
    comment_type: newComment.comment_type,
    body: newComment.body,
    object_kind: newComment.object_kind,
    author_id: newComment.author_id,
    width_pct: newComment.width_pct,
    height_pct: newComment.height_pct,
    rotation_deg: newComment.rotation_deg,
    color: newComment.color,
  });

  if (error) return { error: error.message };

  if (!objectKind) {
    trackTagUsage(supabase, type, newComment.body).catch(() => {});
  }
  fetch("/api/notify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "new_comment",
      sessionId,
      authorId: currentUserId,
      facilitatorId,
    }),
  }).catch(() => {});

  return { data: newComment };
}

async function trackTagUsage(
  supabase: SupabaseClient,
  type: CommentType,
  text: string,
) {
  const { data: existing } = await supabase
    .from("tags")
    .select("id, use_count")
    .eq("comment_type", type)
    .eq("body", text)
    .maybeSingle<{ id: string; use_count: number }>();

  if (existing) {
    await supabase
      .from("tags")
      .update({
        use_count: existing.use_count + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
  } else {
    await supabase.from("tags").insert({ comment_type: type, body: text, use_count: 1 });
  }
}
