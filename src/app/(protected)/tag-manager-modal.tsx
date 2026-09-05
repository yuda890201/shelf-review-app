"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { CommentType, TagRow } from "@/lib/types";

const TYPE_LABEL: Record<CommentType, string> = {
  good: "良い点",
  bad: "気になる点",
};

export default function TagManagerModal({
  commentType,
  tags,
  onClose,
  onChange,
}: {
  commentType: CommentType;
  tags: TagRow[];
  onClose: () => void;
  onChange: (tags: TagRow[]) => void;
}) {
  const supabase = createClient();
  const [newBody, setNewBody] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingBody, setEditingBody] = useState("");
  const [busy, setBusy] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  async function handleAdd() {
    const trimmed = newBody.trim();
    if (!trimmed) return;
    setBusy(true);
    const { data, error } = await supabase
      .from("tags")
      .insert({ comment_type: commentType, body: trimmed })
      .select()
      .single<TagRow>();
    if (!error && data) {
      onChange([...tags, data]);
      setNewBody("");
    } else if (error?.code === "23505") {
      alert("同じタグが既に存在します。");
    } else if (error) {
      alert(`追加に失敗しました: ${error.message}`);
    }
    setBusy(false);
  }

  async function handleSaveEdit(id: string) {
    const trimmed = editingBody.trim();
    if (!trimmed) return;
    setBusy(true);
    const { error } = await supabase
      .from("tags")
      .update({ body: trimmed, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (!error) {
      onChange(tags.map((t) => (t.id === id ? { ...t, body: trimmed } : t)));
      setEditingId(null);
    } else {
      alert(`更新に失敗しました: ${error.message}`);
    }
    setBusy(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("このタグを削除しますか?")) return;
    setBusy(true);
    const { error } = await supabase.from("tags").delete().eq("id", id);
    if (!error) {
      onChange(tags.filter((t) => t.id !== id));
    } else {
      alert(`削除に失敗しました: ${error.message}`);
    }
    setBusy(false);
  }

  const sorted = [...tags].sort((a, b) => b.use_count - a.use_count);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
      className="fixed inset-0 z-50 m-0 h-full max-h-none w-full max-w-none border-none bg-black/60 p-0"
    >
      <div
        className="slide-up-sheet absolute inset-x-0 bottom-0 flex max-h-[85vh] flex-col rounded-t-2xl border-t border-neutral-700 bg-neutral-900 p-4"
        style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-100">
            {TYPE_LABEL[commentType]}のタグを編集
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-gray-400"
          >
            ✕ 閉じる
          </button>
        </div>

        <div className="mb-3 flex gap-2">
          <input
            type="text"
            value={newBody}
            onChange={(e) => setNewBody(e.target.value)}
            placeholder="新しいタグを入力..."
            className="min-w-0 flex-1 rounded-md border border-neutral-600 bg-neutral-800 px-3 py-2 text-base text-gray-100 placeholder-gray-500"
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={busy || !newBody.trim()}
            className="shrink-0 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            追加
          </button>
        </div>

        <ul className="flex flex-col gap-2 overflow-y-auto">
          {sorted.length === 0 && (
            <p className="text-xs text-gray-500">まだタグがありません。</p>
          )}
          {sorted.map((tag) => (
            <li
              key={tag.id}
              className="flex items-center gap-2 rounded-md border border-neutral-800 bg-neutral-800/50 px-3 py-2"
            >
              {editingId === tag.id ? (
                <>
                  <input
                    type="text"
                    autoFocus
                    value={editingBody}
                    onChange={(e) => setEditingBody(e.target.value)}
                    className="min-w-0 flex-1 rounded-md border border-neutral-600 bg-neutral-800 px-2 py-1 text-base text-gray-100"
                  />
                  <button
                    type="button"
                    onClick={() => handleSaveEdit(tag.id)}
                    disabled={busy}
                    className="shrink-0 text-xs font-semibold text-blue-400 disabled:opacity-50"
                  >
                    保存
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="shrink-0 text-xs text-gray-500"
                  >
                    取消
                  </button>
                </>
              ) : (
                <>
                  <span className="min-w-0 flex-1 truncate text-sm text-gray-200">
                    {tag.body}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(tag.id);
                      setEditingBody(tag.body);
                    }}
                    className="shrink-0 text-xs text-gray-400"
                    aria-label="編集"
                  >
                    ✎
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(tag.id)}
                    disabled={busy}
                    className="shrink-0 text-xs text-red-400 disabled:opacity-50"
                    aria-label="削除"
                  >
                    🗑
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      </div>
    </dialog>
  );
}
