"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { shelfImagePublicUrl, shelfImageThumbUrl } from "@/lib/supabase/storage";
import { useI18n } from "@/lib/i18n/provider";
import { LOCALE_TAGS } from "@/lib/i18n/locales";
import PhotoAnnotator from "@/components/photo-annotator";
import PhotoViewer from "@/components/photo-viewer";
import type { LayoutCurrentPhotoRow, PinObjectKind, PinRow } from "@/lib/types";

export default function NewProductAnnotator({
  photo,
  layoutName,
  initialPins,
  currentUserId,
}: {
  photo: LayoutCurrentPhotoRow;
  layoutName: string;
  initialPins: PinRow[];
  currentUserId: string | null;
}) {
  const supabase = createClient();
  const { t, locale } = useI18n();
  const [pins, setPins] = useState<PinRow[]>(initialPins);
  const [viewing, setViewing] = useState(false);

  async function handleSubmitPin(pin: {
    position_x: number;
    position_y: number;
    end_position_x: number | null;
    end_position_y: number | null;
    width_pct: number;
    height_pct: number;
    rotation_deg: number;
    color: string;
    body: string;
    object_kind: PinObjectKind | null;
  }) {
    if (!currentUserId) return { error: t.common.loginRequired };
    const { data, error } = await supabase
      .from("pins")
      .insert({
        layout_current_photo_id: photo.id,
        author_id: currentUserId,
        ...pin,
      })
      .select()
      .single<PinRow>();
    if (error) return { error: error.message };
    setPins((prev) => [...prev, data]);
  }

  return (
    <div>
      <Link href="/new-products" className="text-xs text-blue-400 hover:underline">
        {t.newProducts.backToPicker}
      </Link>
      {viewing && (
        <PhotoViewer
          photoUrl={shelfImagePublicUrl(photo.storage_path)}
          alt={t.newProducts.currentAlt}
          pins={pins}
          onClose={() => setViewing(false)}
        />
      )}

      <div className="mb-1 mt-1 flex items-center justify-between gap-2">
        <h1 className="min-w-0 truncate text-lg font-bold text-gray-100">
          {layoutName}
        </h1>
        <button
          type="button"
          onClick={() => setViewing(true)}
          className="shrink-0 rounded-md border border-neutral-700 px-3 py-1.5 text-sm text-gray-200"
          aria-label={t.viewer.open}
        >
          🔍
        </button>
      </div>
      <p className="mb-4 text-xs text-gray-500">
        {t.newProducts.photoCaption(
          photo.store_name,
          new Date(photo.created_at).toLocaleDateString(LOCALE_TAGS[locale]),
        )}
      </p>

      <PhotoAnnotator
        photoUrl={shelfImageThumbUrl(photo)}
        pins={pins}
        currentUserId={currentUserId}
        onSubmit={handleSubmitPin}
        hint={t.newProducts.placementHint}
      />
    </div>
  );
}
