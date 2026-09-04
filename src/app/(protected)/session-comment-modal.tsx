"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { CommentRow, SessionWithImage } from "@/lib/types";
import PinBoard from "./sessions/[id]/pin-board";

export default function SessionCommentModal({
  session,
  currentUserId,
  onClose,
}: {
  session: SessionWithImage;
  currentUserId: string | null;
  onClose: () => void;
}) {
  const [comments, setComments] = useState<CommentRow[] | null>(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    supabase
      .from("comments")
      .select("*")
      .eq("session_id", session.id)
      .order("created_at", { ascending: true })
      .returns<CommentRow[]>()
      .then(({ data }) => {
        if (!cancelled) setComments(data ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, [session.id]);

  if (!session.images) return null;

  return (
    <div className="fixed inset-0 z-40">
      <button
        type="button"
        aria-label="閉じる"
        onClick={onClose}
        className="absolute inset-0 bg-black/50"
      />
      <div className="slide-up-sheet absolute inset-x-0 bottom-0 flex max-h-[92vh] flex-col rounded-t-2xl bg-neutral-900 shadow-xl">
        <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-gray-100">
              {session.title || "無題のセッション"}
            </p>
            <p className="truncate text-xs text-gray-500">
              {session.images.store_name}{" "}
              {session.images.shelf_category && `/ ${session.images.shelf_category}`}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <Link
              href={`/sessions/${session.id}`}
              className="text-xs text-gray-400 underline"
            >
              詳細ページ
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-neutral-700 px-2 py-1 text-xs text-gray-300"
            >
              ✕ 閉じる
            </button>
          </div>
        </div>

        <div className="overflow-y-auto p-3">
          {comments === null ? (
            <p className="py-10 text-center text-sm text-gray-500">読み込み中...</p>
          ) : (
            <PinBoard
              session={session}
              initialComments={comments}
              currentUserId={currentUserId}
              isOpen={session.status === "open"}
              showList={false}
            />
          )}
        </div>
      </div>
    </div>
  );
}
