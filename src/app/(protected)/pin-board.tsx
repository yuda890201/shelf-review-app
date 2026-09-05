"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { shelfImagePublicUrl } from "@/lib/supabase/storage";
import { submitComment } from "@/lib/submit-comment";
import type { CommentRow, CommentType, SessionWithImage, TagRow } from "@/lib/types";
import CommentPinBoard from "./comment-pin-board";

export default function PinBoard({
  session,
  initialComments,
  currentUserId,
  isOpen,
}: {
  session: SessionWithImage;
  initialComments: CommentRow[];
  currentUserId: string | null;
  isOpen: boolean;
}) {
  const supabase = createClient();

  const [comments, setComments] = useState<CommentRow[]>(initialComments);
  const [tags, setTags] = useState<Record<CommentType, TagRow[]>>({
    good: [],
    bad: [],
  });

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("tags")
      .select("*")
      .returns<TagRow[]>()
      .then(({ data }) => {
        if (cancelled || !data) return;
        setTags({
          good: data.filter((t) => t.comment_type === "good"),
          bad: data.filter((t) => t.comment_type === "bad"),
        });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("tags-all")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "tags" },
        (payload) => {
          const row = payload.new as TagRow;
          setTags((prev) =>
            prev[row.comment_type].some((t) => t.id === row.id)
              ? prev
              : { ...prev, [row.comment_type]: [...prev[row.comment_type], row] },
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
            [row.comment_type]: prev[row.comment_type].map((t) =>
              t.id === row.id ? row : t,
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
            good: prev.good.filter((t) => t.id !== oldRow.id),
            bad: prev.bad.filter((t) => t.id !== oldRow.id),
          }));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addCommentIfNew = useCallback((row: CommentRow) => {
    setComments((prev) => (prev.some((c) => c.id === row.id) ? prev : [...prev, row]));
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel(`comments-session-${session.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "comments",
          filter: `session_id=eq.${session.id}`,
        },
        (payload) => {
          addCommentIfNew(payload.new as CommentRow);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.id]);

  async function handleSubmit({
    type,
    body,
    pin,
  }: {
    type: CommentType;
    body: string;
    pin: { x: number; y: number; frameScale: number; rotationDeg: number };
  }) {
    if (!currentUserId) return { error: "ログインが必要です。" };
    const { data, error } = await submitComment({
      supabase,
      sessionId: session.id,
      imageId: session.image_id,
      facilitatorId: session.facilitator_id,
      currentUserId,
      type,
      body,
      pin,
    });
    if (error) return { error };
    if (data) addCommentIfNew(data);
  }

  const sortedComments = [...comments].sort((a, b) =>
    a.created_at.localeCompare(b.created_at),
  );

  return (
    <CommentPinBoard
      photoUrl={shelfImagePublicUrl(session.images!.storage_path)}
      pins={sortedComments}
      currentUserId={currentUserId}
      canComment={isOpen}
      tags={tags}
      onTagsChange={setTags}
      onSubmit={handleSubmit}
      stickyHeader
    />
  );
}
