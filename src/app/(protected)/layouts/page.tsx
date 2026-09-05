import { createClient } from "@/lib/supabase/server";
import type {
  LayoutCurrentPhotoRow,
  LayoutReferencePhotoRow,
  LayoutRow,
  LayoutTaskRow,
  StoreRow,
} from "@/lib/types";
import LayoutsList from "./layouts-list";

export default async function LayoutsPage() {
  const supabase = await createClient();

  const { data: layouts } = await supabase
    .from("layouts")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .returns<LayoutRow[]>();

  const { data: referencePhotos } = await supabase
    .from("layout_reference_photos")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<LayoutReferencePhotoRow[]>();

  const { data: currentPhotos } = await supabase
    .from("layout_current_photos")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<LayoutCurrentPhotoRow[]>();

  const { data: tasks } = await supabase
    .from("layout_tasks")
    .select("*")
    .returns<LayoutTaskRow[]>();

  const { data: stores } = await supabase
    .from("stores")
    .select("*")
    .returns<StoreRow[]>();
  const storeNames = (stores ?? []).map((s) => s.name);

  const latestReferenceByLayout: Record<string, LayoutReferencePhotoRow> = {};
  for (const row of referencePhotos ?? []) {
    if (!latestReferenceByLayout[row.layout_id]) {
      latestReferenceByLayout[row.layout_id] = row;
    }
  }

  const storeCoverageByLayout: Record<string, number> = {};
  for (const store of storeNames) {
    const seen = new Set<string>();
    for (const row of currentPhotos ?? []) {
      if (row.store_name === store && !seen.has(row.layout_id)) {
        seen.add(row.layout_id);
        storeCoverageByLayout[row.layout_id] =
          (storeCoverageByLayout[row.layout_id] ?? 0) + 1;
      }
    }
  }

  const openTaskCountByLayout: Record<string, number> = {};
  for (const row of tasks ?? []) {
    if (!row.done) {
      openTaskCountByLayout[row.layout_id] =
        (openTaskCountByLayout[row.layout_id] ?? 0) + 1;
    }
  }

  return (
    <LayoutsList
      layouts={layouts ?? []}
      latestReferenceByLayout={latestReferenceByLayout}
      storeCoverageByLayout={storeCoverageByLayout}
      openTaskCountByLayout={openTaskCountByLayout}
      totalStores={storeNames.length}
    />
  );
}
