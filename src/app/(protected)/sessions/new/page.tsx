import { createClient } from "@/lib/supabase/server";
import type {
  DeliveryTruckRow,
  LayoutReferencePhotoRow,
  LayoutRow,
  StoreRow,
  TruckLayoutRow,
} from "@/lib/types";
import NewSessionWizard from "./new-session-wizard";

export default async function NewSessionPage() {
  const supabase = await createClient();

  const [
    { data: stores },
    { data: trucks },
    { data: layouts },
    { data: links },
    { data: referencePhotos },
  ] = await Promise.all([
      supabase
        .from("stores")
        .select("*")
        .order("sort_order", { ascending: true })
        .returns<StoreRow[]>(),
      supabase
        .from("delivery_trucks")
        .select("*")
        .order("sort_order", { ascending: true })
        .returns<DeliveryTruckRow[]>(),
      supabase
        .from("layouts")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true })
        .returns<LayoutRow[]>(),
      supabase
        .from("truck_layouts")
        .select("*")
        .order("sort_order", { ascending: true })
        .returns<TruckLayoutRow[]>(),
      supabase
        .from("layout_reference_photos")
        .select("layout_id, storage_path, thumb_path")
        .order("created_at", { ascending: false })
        .returns<
          Pick<LayoutReferencePhotoRow, "layout_id" | "storage_path" | "thumb_path">[]
        >(),
    ]);

  // 便 → その便が商品を持ってくるゴンドラID の対応表にしてから渡す。
  const gondolaIdsByTruck: Record<string, string[]> = {};
  for (const link of links ?? []) {
    (gondolaIdsByTruck[link.delivery_truck_id] ??= []).push(link.layout_id);
  }

  // 撮影ガイドに「どんな売場にするのが正解か」を並べて出すため、ゴンドラごとの
  // 最新のお手本写真を引いておく(作成日時の降順なので最初に見つかったものが最新)。
  const referenceByGondola: Record<
    string,
    { storage_path: string; thumb_path: string | null }
  > = {};
  for (const photo of referencePhotos ?? []) {
    referenceByGondola[photo.layout_id] ??= {
      storage_path: photo.storage_path,
      thumb_path: photo.thumb_path,
    };
  }

  return (
    <NewSessionWizard
      stores={stores ?? []}
      trucks={trucks ?? []}
      gondolas={layouts ?? []}
      gondolaIdsByTruck={gondolaIdsByTruck}
      referenceByGondola={referenceByGondola}
    />
  );
}
