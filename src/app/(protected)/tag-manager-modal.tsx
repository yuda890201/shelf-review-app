"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import type { CommentType, TagRow } from "@/lib/types";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";
import { useI18n } from "@/lib/i18n/provider";

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
  const { t } = useI18n();
  const [newBody, setNewBody] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingBody, setEditingBody] = useState("");
  const [busy, setBusy] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const scrollRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  useBodyScrollLock(scrollRef, true);

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
      alert(t.common.duplicateName);
    } else if (error) {
      alert(t.common.addFailed(error.message));
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
      alert(t.common.updateFailed(error.message));
    }
    setBusy(false);
  }

  async function handleDelete(id: string) {
    if (!confirm(t.common.confirmDelete)) return;
    setBusy(true);
    const { error } = await supabase.from("tags").delete().eq("id", id);
    if (!error) {
      onChange(tags.filter((t) => t.id !== id));
    } else {
      alert(t.common.deleteFailed(error.message));
    }
    setBusy(false);
  }

  const sorted = [...tags].sort((a, b) => b.use_count - a.use_count);

  return createPortal(
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
            {t.tags.title(
              commentType === "good" ? t.pin.typeGood : t.pin.typeBad,
            )}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-gray-400"
          >
            {`✕ ${t.tags.close}`}
          </button>
        </div>

        <div className="mb-3 flex gap-2">
          <input
            type="text"
            value={newBody}
            onChange={(e) => setNewBody(e.target.value)}
            placeholder={t.tags.placeholder}
            className="min-w-0 flex-1 rounded-md border border-neutral-600 bg-neutral-800 px-3 py-2 text-base text-gray-100 placeholder-gray-500"
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={busy || !newBody.trim()}
            className="shrink-0 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {t.common.add}
          </button>
        </div>

        <ul ref={scrollRef} className="flex flex-col gap-2 overflow-y-auto">
          {sorted.length === 0 && (
            <p className="text-xs text-gray-500">{t.tags.empty}</p>
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
                    {t.common.save}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="shrink-0 text-xs text-gray-500"
                  >
                    {t.common.cancel}
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
                    aria-label={t.common.edit}
                  >
                    ✎
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(tag.id)}
                    disabled={busy}
                    className="shrink-0 text-xs text-red-400 disabled:opacity-50"
                    aria-label={t.common.delete}
                  >
                    🗑
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      </div>
    </dialog>,
    document.body,
  );
}
