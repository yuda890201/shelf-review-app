"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { shelfImagePublicUrl } from "@/lib/supabase/storage";
import PhotoAnnotator from "@/components/photo-annotator";
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
  const [pins, setPins] = useState<PinRow[]>(initialPins);

  async function handleSubmitPin(pin: {
    position_x: number;
    position_y: number;
    width_pct: number;
    height_pct: number;
    rotation_deg: number;
    color: string;
    body: string;
    object_kind: PinObjectKind | null;
  }) {
    if (!currentUserId) return { error: "ログインが必要です。" };
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
        ← 売場・写真選択に戻る
      </Link>
      <h1 className="mb-1 mt-1 text-lg font-bold text-gray-100">{layoutName}</h1>
      <p className="mb-4 text-xs text-gray-500">
        {photo.store_name} ・ {new Date(photo.created_at).toLocaleDateString("ja-JP")}
        の売場写真
      </p>

      <PhotoAnnotator
        photoUrl={shelfImagePublicUrl(photo.storage_path)}
        pins={pins}
        currentUserId={currentUserId}
        onSubmit={handleSubmitPin}
        hint="新商品を並べる位置をタップして、指示コメントを貼り付けてください。"
      />
    </div>
  );
}
