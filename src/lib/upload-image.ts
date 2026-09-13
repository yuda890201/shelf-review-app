import type { SupabaseClient } from "@supabase/supabase-js";
import { prepareImage } from "@/lib/image";

export type UploadedImagePaths = {
  storage_path: string;
  /** サムネイルを作れなかった(元画像が十分小さい等)場合はnull。 */
  thumb_path: string | null;
};

/**
 * 売場写真を1枚アップロードする。原寸と一覧用サムネイルの2ファイルを保存し、
 * それぞれのパスを返す。サムネイルのアップロードに失敗しても投稿自体は
 * 成立させたいので、その場合は thumb_path を null にして続行する。
 */
export async function uploadShelfImage(
  supabase: SupabaseClient,
  userId: string,
  file: File,
): Promise<UploadedImagePaths> {
  const { full, thumb } = await prepareImage(file);
  const id = crypto.randomUUID();
  const ext = full.name.split(".").pop() || "jpg";
  const storagePath = `${userId}/${id}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("shelf-images")
    .upload(storagePath, full);
  if (uploadError) throw uploadError;

  if (!thumb) return { storage_path: storagePath, thumb_path: null };

  const thumbPath = `${userId}/${id}_thumb.jpg`;
  const { error: thumbError } = await supabase.storage
    .from("shelf-images")
    .upload(thumbPath, thumb);

  return {
    storage_path: storagePath,
    thumb_path: thumbError ? null : thumbPath,
  };
}
