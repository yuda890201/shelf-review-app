"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { CommentRow, SessionWithImage } from "@/lib/types";
import LoadingOverlay from "@/components/loading-overlay";
import PinBoard from "./pin-board";

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
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    dialogRef.current?.showModal();
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
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
      className="fixed inset-0 z-40 m-0 h-full max-h-none w-full max-w-none border-none bg-black/50 p-0"
    >
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
            <LoadingOverlay variant="inline" label="読み込み中..." />
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
    </dialog>
  );
}
