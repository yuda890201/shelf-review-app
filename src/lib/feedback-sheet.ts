import type { Dictionary } from "@/lib/i18n/dictionaries";
import { LOCALE_TAGS, type Locale } from "@/lib/i18n/locales";
import type { CommentType, PinObjectKind } from "@/lib/types";

// A4・150dpi相当(210mm×297mm)
export const SHEET_WIDTH = 1240;
export const SHEET_HEIGHT = 1754;

const PAD_X = 70;
const PAD_TOP = 66;
const CONTENT_WIDTH = SHEET_WIDTH - PAD_X * 2;

const PAPER = "#fbfaf5";
const LETTERBOX = "#e9e4d4";
const INK = "#201e18";
const INK_SOFT = "#6b6656";
const HAIR = "#e2ddcd";
const GOOD = "#2f7a4f";
const WARN = "#b5502a";
const PENDING = "#1e4fa0";

// 端末に入っているフォントだけで日本語・英語・ネパール語をまかなう。
const FONT =
  "'Hiragino Kaku Gothic ProN', 'Noto Sans JP', 'Kohinoor Devanagari', 'Noto Sans Devanagari', sans-serif";

export type FeedbackSheetPin = {
  id: string;
  position_x: number;
  position_y: number;
  end_position_x: number | null;
  end_position_y: number | null;
  width_pct: number;
  height_pct: number;
  rotation_deg: number;
  comment_type: CommentType;
  body: string;
  object_kind: PinObjectKind | null;
  color: string;
};

export type FeedbackSheetReference = {
  photoUrl: string;
  layoutName: string;
  seasonLabel: string;
};

export type FeedbackSheetParams = {
  storeName: string | null;
  truckName: string | null;
  title: string | null;
  posterName: string | null;
  createdAt: string;
  photoUrl: string;
  pins: FeedbackSheetPin[];
  clapCount: number;
  doneCount: number;
  needsWorkCount: number;
  reference: FeedbackSheetReference | null;
  /** 表示中の言語の辞書。シートの見出しもアプリと同じ言語で書き出す。 */
  t: Dictionary;
  locale: Locale;
};

type Rect = { x: number; y: number; w: number; h: number };

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`画像の読み込みに失敗しました: ${url}`));
    img.src = url;
  });
}

/**
 * object-fit: contain 相当で画像をボックス内に収める(トリミングしない)。
 * ピンの位置はコメント時点の元画像に対する相対座標なので、cover(トリミング)で
 * 描画すると見えている範囲とピン座標がずれてしまう。必ずcontainで、実際に
 * 描画された矩形(戻り値)を基準にピンを配置すること。
 */
function containRect(imgW: number, imgH: number, boxW: number, boxH: number): Rect {
  const scale = Math.min(boxW / imgW, boxH / imgH);
  const w = imgW * scale;
  const h = imgH * scale;
  return { x: (boxW - w) / 2, y: (boxH - h) / 2, w, h };
}

function drawImageFitted(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  boxX: number,
  boxY: number,
  boxW: number,
  boxH: number,
): Rect {
  const fit = containRect(img.naturalWidth, img.naturalHeight, boxW, boxH);
  ctx.fillStyle = LETTERBOX;
  ctx.fillRect(boxX, boxY, boxW, boxH);
  ctx.drawImage(img, boxX + fit.x, boxY + fit.y, fit.w, fit.h);
  return { x: boxX + fit.x, y: boxY + fit.y, w: fit.w, h: fit.h };
}

/** 日本語は単語区切りが無いため、文字単位でmaxWidthに収まるよう折り返す */
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const ch of text) {
    const test = line + ch;
    if (line && ctx.measureText(test).width > maxWidth) {
      lines.push(line);
      line = ch;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

/** 収まりきらない場合はフォントサイズを段階的に縮小し、それでも収まらなければ末尾を…で切る */
function fitTextToWidth(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxFontPx: number,
  minFontPx: number,
  weight = 900,
): { text: string; fontSize: number } {
  let fontSize = maxFontPx;
  ctx.font = `${weight} ${fontSize}px ${FONT}`;
  while (fontSize > minFontPx && ctx.measureText(text).width > maxWidth) {
    fontSize -= 1;
    ctx.font = `${weight} ${fontSize}px ${FONT}`;
  }
  let out = text;
  if (ctx.measureText(out).width > maxWidth) {
    while (out.length > 1 && ctx.measureText(`${out}…`).width > maxWidth) {
      out = out.slice(0, -1);
    }
    out = out.length < text.length ? `${out}…` : out;
  }
  return { text: out, fontSize };
}

function drawArrowhead(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  size: number,
  color: string,
) {
  const a1 = angle + Math.PI * 0.82;
  const a2 = angle - Math.PI * 0.82;
  ctx.beginPath();
  ctx.moveTo(x + size * Math.cos(a1), y + size * Math.sin(a1));
  ctx.lineTo(x, y);
  ctx.lineTo(x + size * Math.cos(a2), y + size * Math.sin(a2));
  ctx.strokeStyle = color;
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();
}

function drawOutlinedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  color: string,
  outlineWidth = 5,
) {
  ctx.lineWidth = outlineWidth;
  ctx.lineJoin = "round";
  ctx.strokeStyle = "rgba(255,255,255,0.92)";
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

/** pins/comment-pin-boardのPinObjectLineと同じ向きの矢印を、実際に描画された写真の矩形基準で再現する */
function drawObjectPin(
  ctx: CanvasRenderingContext2D,
  pin: FeedbackSheetPin,
  photoRect: Rect,
  objectLabels: Dictionary["object"],
) {
  if (!pin.object_kind || pin.end_position_x == null || pin.end_position_y == null) return;
  const px1 = photoRect.x + pin.position_x * photoRect.w;
  const py1 = photoRect.y + pin.position_y * photoRect.h;
  const px2 = photoRect.x + pin.end_position_x * photoRect.w;
  const py2 = photoRect.y + pin.end_position_y * photoRect.h;
  const angle = Math.atan2(py2 - py1, px2 - px1);
  const color = pin.color;

  ctx.beginPath();
  ctx.moveTo(px1, py1);
  ctx.lineTo(px2, py2);
  ctx.strokeStyle = color;
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.stroke();

  const ARROW_SIZE = 18;
  if (pin.object_kind === "move") {
    drawArrowhead(ctx, px2, py2, angle, ARROW_SIZE, color);
  } else if (pin.object_kind === "widen") {
    drawArrowhead(ctx, px2, py2, angle, ARROW_SIZE, color);
    drawArrowhead(ctx, px1, py1, angle + Math.PI, ARROW_SIZE, color);
  } else {
    drawArrowhead(ctx, px2, py2, angle + Math.PI, ARROW_SIZE, color);
    drawArrowhead(ctx, px1, py1, angle, ARROW_SIZE, color);
  }

  ctx.font = `700 24px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  drawOutlinedText(
    ctx,
    objectLabels[pin.object_kind],
    (px1 + px2) / 2,
    (py1 + py2) / 2 - 22,
    color,
  );
}

function drawPinBadge(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  num: number,
  color: string,
  radius = 21,
) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = PAPER;
  ctx.stroke();
  ctx.fillStyle = "#fff";
  ctx.font = `700 ${Math.round(radius * 0.95)}px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(num), x, y + 1);
}

/** アプリのPinChip(枠+流れるコメント)相当を、写真の実描画矩形基準で再現する。回転にも対応 */
function drawTextPinFrame(
  ctx: CanvasRenderingContext2D,
  pin: FeedbackSheetPin,
  num: number,
  photoRect: Rect,
) {
  const cx = photoRect.x + pin.position_x * photoRect.w;
  const cy = photoRect.y + pin.position_y * photoRect.h;
  const w = Math.max(24, pin.width_pct * photoRect.w);
  const h = Math.max(18, pin.height_pct * photoRect.h);

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((pin.rotation_deg * Math.PI) / 180);
  ctx.strokeStyle = pin.color;
  ctx.lineWidth = 3;
  ctx.strokeRect(-w / 2, -h / 2, w, h);

  const maxFont = Math.min(h * 0.62, 22);
  const { text, fontSize } = fitTextToWidth(ctx, pin.body || " ", w - 10, maxFont, 9);
  ctx.font = `900 ${fontSize}px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  drawOutlinedText(ctx, text, 0, 1, pin.color, 3);
  ctx.restore();

  drawPinBadge(ctx, cx - w / 2, cy - h / 2, num, pin.color, 15);
}

export async function generateFeedbackSheetBlob(
  params: FeedbackSheetParams,
): Promise<Blob> {
  const [photo, referencePhoto] = await Promise.all([
    loadImage(params.photoUrl),
    params.reference ? loadImage(params.reference.photoUrl) : Promise.resolve(null),
  ]);

  const { t, locale } = params;
  const localeTag = LOCALE_TAGS[locale];

  const canvas = document.createElement("canvas");
  canvas.width = SHEET_WIDTH;
  canvas.height = SHEET_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error(t.sheet.canvasFailed);

  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, SHEET_WIDTH, SHEET_HEIGHT);

  // --- ヘッダー ---
  let y = PAD_TOP;
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  ctx.fillStyle = INK;
  ctx.font = `900 46px ${FONT}`;
  ctx.fillText(params.storeName ?? t.sheet.storeUnset, PAD_X, y);

  ctx.textAlign = "right";
  ctx.font = `700 26px ${FONT}`;
  ctx.fillText(t.sheet.appName, PAD_X + CONTENT_WIDTH, y + 2);
  ctx.font = `400 20px ${FONT}`;
  ctx.fillStyle = INK_SOFT;
  const dateLabel = new Date(params.createdAt).toLocaleDateString(localeTag, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  ctx.fillText(dateLabel, PAD_X + CONTENT_WIDTH, y + 40);
  ctx.fillText(
    t.sheet.poster(params.posterName ?? t.card.staff),
    PAD_X + CONTENT_WIDTH,
    y + 66,
  );

  y += 60;
  if (params.truckName) {
    ctx.textAlign = "left";
    ctx.font = `700 18px ${FONT}`;
    const label = params.truckName;
    const w = ctx.measureText(label).width + 28;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    // 角丸ピル
    const h = 30;
    const r = h / 2;
    ctx.moveTo(PAD_X + r, y);
    ctx.arcTo(PAD_X + w, y, PAD_X + w, y + h, r);
    ctx.arcTo(PAD_X + w, y + h, PAD_X, y + h, r);
    ctx.arcTo(PAD_X, y + h, PAD_X, y, r);
    ctx.arcTo(PAD_X, y, PAD_X + w, y, r);
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = INK;
    ctx.textBaseline = "middle";
    ctx.fillText(label, PAD_X + 14, y + h / 2 + 1);
    ctx.textBaseline = "top";
    y += h;
  }

  y += 28;
  ctx.strokeStyle = HAIR;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(PAD_X, y);
  ctx.lineTo(PAD_X + CONTENT_WIDTH, y);
  ctx.stroke();

  y += 26;
  ctx.fillStyle = INK;
  ctx.font = `700 30px ${FONT}`;
  ctx.fillText(params.title || t.card.untitled, PAD_X, y);
  y += 46;

  // --- 写真(お手本 / 現在の売場) ---
  const hasReference = !!(params.reference && referencePhoto);
  const colGap = 24;
  const colWidth = hasReference ? (CONTENT_WIDTH - colGap) / 2 : CONTENT_WIDTH;

  // 投稿写真自身の縦横比を基準に高さを決める(トリミングしないのでピン座標が必ず一致する)。
  // 極端な縦長/横長写真でもページが崩れないよう常識的な範囲にクランプする。
  const currentAspect = photo.naturalWidth / photo.naturalHeight;
  let photoBoxH = colWidth / currentAspect;
  photoBoxH = Math.min(Math.max(photoBoxH, colWidth * 0.55), colWidth * 1.7);

  function drawPhotoLabel(text: string, x: number, color: string) {
    ctx!.font = `700 18px ${FONT}`;
    ctx!.fillStyle = color;
    ctx!.textAlign = "left";
    ctx!.fillText(text, x, y);
  }

  const labelY = y;
  if (hasReference && referencePhoto && params.reference) {
    drawPhotoLabel(
      t.sheet.reference(params.reference.seasonLabel),
      PAD_X,
      INK_SOFT,
    );
    drawPhotoLabel(t.sheet.currentPhoto, PAD_X + colWidth + colGap, PENDING);
  } else {
    drawPhotoLabel(t.sheet.currentPhoto, PAD_X, PENDING);
  }
  y = labelY + 30;

  if (hasReference && referencePhoto) {
    // お手本写真は少し彩度を落として「参考写真」であることを示す
    ctx.save();
    ctx.filter = "sepia(0.2) saturate(0.85) brightness(0.98)";
    drawImageFitted(ctx, referencePhoto, PAD_X, y, colWidth, photoBoxH);
    ctx.restore();
    ctx.strokeStyle = "#cdbf8f";
    ctx.lineWidth = 3;
    ctx.strokeRect(PAD_X + 1.5, y + 1.5, colWidth - 3, photoBoxH - 3);
  }

  const currentX = hasReference ? PAD_X + colWidth + colGap : PAD_X;
  const photoRect = drawImageFitted(ctx, photo, currentX, y, colWidth, photoBoxH);

  const textPins = params.pins.filter((p) => !p.object_kind);
  const objectPins = params.pins.filter(
    (p) => p.object_kind && p.end_position_x != null && p.end_position_y != null,
  );
  objectPins.forEach((p) => drawObjectPin(ctx, p, photoRect, t.object));
  textPins.forEach((p, i) => drawTextPinFrame(ctx, p, i + 1, photoRect));

  y += photoBoxH + 26;
  ctx.font = `400 16px ${FONT}`;
  ctx.fillStyle = INK_SOFT;
  ctx.textAlign = "left";
  ctx.fillText(
    hasReference ? t.sheet.captionWithReference : t.sheet.caption,
    PAD_X,
    y,
  );
  y += 34;

  // --- コメント一覧(表示領域に収まる件数だけ表示し、超過分は件数のみ添える) ---
  const statsTop = SHEET_HEIGHT - 190;
  const availableHeight = statsTop - y - 20;
  const lineHeight = 26;
  const badgeGap = 16;
  const rowGap = 14;
  const textMaxWidth = CONTENT_WIDTH - badgeGap - 44;

  ctx.font = `400 19px ${FONT}`;
  const measured = textPins.map((p) => {
    const lines = wrapText(ctx!, p.body, textMaxWidth);
    return { pin: p, lines, height: Math.max(44, lines.length * lineHeight + 8) };
  });

  let shown = 0;
  let usedHeight = 0;
  for (const m of measured) {
    const next = usedHeight + m.height + (shown > 0 ? rowGap : 0);
    if (next > availableHeight && shown > 0) break;
    usedHeight = next;
    shown += 1;
  }

  let cy = y;
  for (let i = 0; i < shown; i++) {
    const m = measured[i];
    const badgeCenterY = cy + 22;
    drawPinBadge(ctx, PAD_X + 21, badgeCenterY, i + 1, m.pin.comment_type === "good" ? GOOD : WARN);
    ctx.textAlign = "left";
    ctx.fillStyle = INK;
    ctx.font = `400 19px ${FONT}`;
    m.lines.forEach((line, li) => {
      ctx.fillText(line, PAD_X + 44 + badgeGap, cy + li * lineHeight + 4);
    });
    cy += m.height + rowGap;
  }
  if (shown < measured.length) {
    ctx.font = `400 16px ${FONT}`;
    ctx.fillStyle = INK_SOFT;
    ctx.fillText(t.sheet.moreComments(measured.length - shown), PAD_X, cy);
  }

  // --- 集計バー ---
  const statsH = 130;
  ctx.strokeStyle = HAIR;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(PAD_X, statsTop);
  ctx.lineTo(PAD_X + CONTENT_WIDTH, statsTop);
  ctx.stroke();

  const total = params.doneCount + params.needsWorkCount;
  const doneRate = total ? Math.round((params.doneCount / total) * 100) : 0;
  const stats: { value: string; label: string; color: string }[] = [
    { value: String(params.clapCount), label: t.sheet.statThanks, color: INK },
    { value: String(params.doneCount), label: t.sheet.statDone, color: GOOD },
    {
      value: String(params.needsWorkCount),
      label: t.sheet.statNeedsWork,
      color: WARN,
    },
    { value: `${doneRate}%`, label: t.sheet.statDoneRate, color: INK },
  ];
  const colW = CONTENT_WIDTH / stats.length;
  stats.forEach((s, i) => {
    const cx = PAD_X + colW * i + colW / 2;
    if (i > 0) {
      ctx.beginPath();
      ctx.moveTo(PAD_X + colW * i, statsTop + 24);
      ctx.lineTo(PAD_X + colW * i, statsTop + statsH - 24);
      ctx.strokeStyle = HAIR;
      ctx.stroke();
    }
    ctx.textAlign = "center";
    ctx.fillStyle = s.color;
    ctx.font = `900 40px ${FONT}`;
    ctx.fillText(s.value, cx, statsTop + 34);
    ctx.fillStyle = INK_SOFT;
    ctx.font = `400 17px ${FONT}`;
    ctx.fillText(s.label, cx, statsTop + 84);
  });

  // --- フッター ---
  const footerY = SHEET_HEIGHT - 44;
  ctx.font = `400 15px ${FONT}`;
  ctx.fillStyle = INK_SOFT;
  ctx.textAlign = "left";
  ctx.fillText(
    t.sheet.exportedAt(new Date().toLocaleString(localeTag)),
    PAD_X,
    footerY,
  );
  ctx.textAlign = "right";
  ctx.fillText("shelf-review-app.vercel.app", PAD_X + CONTENT_WIDTH, footerY);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error(t.sheet.imageFailed));
    }, "image/png");
  });
}
