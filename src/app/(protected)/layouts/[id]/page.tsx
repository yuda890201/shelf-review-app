import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type {
  LayoutCurrentPhotoRow,
  LayoutReferencePhotoRow,
  LayoutRow,
  LayoutTaskRow,
} from "@/lib/types";
import LayoutDetail from "./layout-detail";

export default async function LayoutDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: layout } = await supabase
    .from("layouts")
    .select("*")
    .eq("id", id)
    .single<LayoutRow>();

  if (!layout) {
    notFound();
  }

  const { data: referencePhotos } = await supabase
    .from("layout_reference_photos")
    .select("*")
    .eq("layout_id", id)
    .order("created_at", { ascending: false })
    .returns<LayoutReferencePhotoRow[]>();

  const { data: currentPhotos } = await supabase
    .from("layout_current_photos")
    .select("*")
    .eq("layout_id", id)
    .order("created_at", { ascending: false })
    .returns<LayoutCurrentPhotoRow[]>();

  const { data: tasks } = await supabase
    .from("layout_tasks")
    .select("*")
    .eq("layout_id", id)
    .order("created_at", { ascending: true })
    .returns<LayoutTaskRow[]>();

  return (
    <LayoutDetail
      layout={layout}
      initialReferencePhotos={referencePhotos ?? []}
      initialCurrentPhotos={currentPhotos ?? []}
      initialTasks={tasks ?? []}
      currentUserId={user?.id ?? null}
    />
  );
}
