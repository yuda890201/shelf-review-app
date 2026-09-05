import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { LayoutCurrentPhotoRow, LayoutRow, PinRow } from "@/lib/types";
import NewProductAnnotator from "./new-product-annotator";

export default async function NewProductPhotoPage({
  params,
}: {
  params: Promise<{ photoId: string }>;
}) {
  const { photoId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: photo } = await supabase
    .from("layout_current_photos")
    .select("*")
    .eq("id", photoId)
    .single<LayoutCurrentPhotoRow>();

  if (!photo) notFound();

  const [{ data: layout }, { data: pins }] = await Promise.all([
    supabase
      .from("layouts")
      .select("*")
      .eq("id", photo.layout_id)
      .single<LayoutRow>(),
    supabase
      .from("pins")
      .select("*")
      .eq("layout_current_photo_id", photo.id)
      .returns<PinRow[]>(),
  ]);

  return (
    <NewProductAnnotator
      photo={photo}
      layoutName={layout?.name ?? "不明な売場"}
      initialPins={pins ?? []}
      currentUserId={user?.id ?? null}
    />
  );
}
