const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.82;

/**
 * フィード一覧用の軽い画像。カード幅は実測で最大450px程度なので、高精細画面でも
 * 粗く見えない範囲まで落とす。原寸(1600px)に対してデコード面積はおよそ1/3になる。
 */
const THUMB_DIMENSION = 960;
const THUMB_QUALITY = 0.75;
/** 元画像がこれ以下ならサムネイルを作っても意味がないので原寸をそのまま使う。 */
const THUMB_SKIP_DIMENSION = 1100;

export type PreparedImage = {
  /** 原寸(最大1600px)。拡大表示やフィードバックシートの生成に使う。 */
  full: File;
  /** 一覧表示用のサムネイル。元画像が十分小さい場合はnull。 */
  thumb: File | null;
};

async function loadImage(file: File): Promise<HTMLImageElement | null> {
  // Loaded via an <img> element rather than createImageBitmap(): browsers
  // have long applied EXIF orientation consistently when decoding <img>
  // sources, whereas createImageBitmap's orientation handling depends on an
  // options dictionary that isn't uniformly supported/defaulted across
  // browsers — that mismatch is what caused portrait photos to come out
  // sideways here even after requesting "from-image" explicitly.
  const objectUrl = URL.createObjectURL(file);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("image load failed"));
      el.src = objectUrl;
    });
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function resizeToBlob(
  img: HTMLImageElement,
  maxDimension: number,
  quality: number,
): Promise<Blob | null> {
  const scale = Math.min(
    1,
    maxDimension / Math.max(img.naturalWidth, img.naturalHeight),
  );
  const width = Math.max(1, Math.round(img.naturalWidth * scale));
  const height = Math.max(1, Math.round(img.naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.resolve(null);
  ctx.drawImage(img, 0, 0, width, height);

  return new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/jpeg", quality),
  );
}

function jpegName(name: string) {
  return name.replace(/\.\w+$/, "") + ".jpg";
}

export async function compressImage(file: File): Promise<File> {
  return (await prepareImage(file)).full;
}

/**
 * 1回のデコードで「原寸」と「一覧用サムネイル」の両方を作る。
 * 低スペック端末ではJPEGのデコードがいちばん重いので、2回読み込まない。
 */
export async function prepareImage(file: File): Promise<PreparedImage> {
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") {
    return { full: file, thumb: null };
  }

  const img = await loadImage(file);
  if (!img) return { full: file, thumb: null };

  const longestSide = Math.max(img.naturalWidth, img.naturalHeight);

  const fullBlob = await resizeToBlob(img, MAX_DIMENSION, JPEG_QUALITY);
  const full =
    fullBlob && fullBlob.size < file.size
      ? new File([fullBlob], jpegName(file.name), { type: "image/jpeg" })
      : file;

  if (longestSide <= THUMB_SKIP_DIMENSION) return { full, thumb: null };

  const thumbBlob = await resizeToBlob(img, THUMB_DIMENSION, THUMB_QUALITY);
  const thumb = thumbBlob
    ? new File([thumbBlob], jpegName(file.name), { type: "image/jpeg" })
    : null;

  return { full, thumb };
}
