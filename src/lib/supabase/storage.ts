import type { ImageRow } from "@/lib/types";

export function shelfImagePublicUrl(storagePath: string) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  return `${base}/storage/v1/object/public/shelf-images/${storagePath}`;
}

/**
 * 一覧表示用のURL。アップロード時に作ったサムネイルがあればそれを返す。
 * サムネイル導入前に投稿された写真には thumb_path が無いので原寸に戻す。
 */
export function shelfImageThumbUrl(
  image: Pick<ImageRow, "storage_path" | "thumb_path">,
) {
  return shelfImagePublicUrl(image.thumb_path ?? image.storage_path);
}
