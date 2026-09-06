import { OBJECT_KIND_LABEL } from "@/components/pin-object-icon";
import type { CommentType, PinObjectKind } from "@/lib/types";

// A4・150dpi相当(210mm×297mm)
export const SHEET_WIDTH = 1240;
export const SHEET_HEIGHT = 1754;

const PAD_X = 70;
const PAD_TOP = 66;
const CONTENT_WIDTH = SHEET_WIDTH - PAD_X * 2;

const PAPER = "#fbfaf5";
const INK = "#201e18";
const INK_SOFT = "#6b6656";
const HAIR = "#e2ddcd";
const GOOD = "#2f7a4f";
const WARN = "#b5502a";
const PENDING = "#1e4fa0";

const FONT = "'Hiragino Kaku Gothic ProN', 'Noto Sans JP', sans-serif";

export type FeedbackSheetPin = {
  id: string;
  position_x: number;
  position_y: number;
  end_position_x: number | null;
  end_position_y: number | null;
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
};

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`画像の読み込みに失敗しました: ${url}`));
    img.src = url;
  });
}

/** object-fit: cover 相当で画像をボックスに描画する */
function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const scale = Math.max(w / img.width, h / img.height);
  const sw = w / scale;
  const sh = h / scale;
  const sx = (img.width - sw) / 2;
  const sy = (img.height - sh) / 2;
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
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
) {
  ctx.lineWidth = 5;
  ctx.strokeStyle = "rgba(255,255,255,0.92)";
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

/** pins/comment-pin-boardのPinObjectLineと同じ向きの矢印をCanvas上に再現する */
function drawObjectPin(
  ctx: CanvasRenderingContext2D,
  pin: FeedbackSheetPin,
  boxX: number,
  boxY: number,
  boxW: number,
  boxH: number,
) {
  if (!pin.object_kind || pin.end_position_x == null || pin.end_position_y == null) return;
  const px1 = boxX + pin.position_x * boxW;
  const py1 = boxY + pin.position_y * boxH;
  const px2 = boxX + pin.end_position_x * boxW;
  const py2 = boxY + pin.end_position_y * boxH;
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
  drawOutlinedText(ctx, OBJECT_KIND_LABEL[pin.object_kind], (px1 + px2) / 2, (py1 + py2) / 2 - 20, color);
}

function drawPinBadge(ctx: CanvasRenderingContext2D, x: number, y: number, num: number, color: string) {
  ctx.beginPath();
  ctx.arc(x, y, 21, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = PAPER;
  ctx.stroke();
  ctx.fillStyle = "#fff";
  ctx.font = `700 20px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(num), x, y + 1);
}

export async function generateFeedbackSheetBlob(
  params: FeedbackSheetParams,
): Promise<Blob> {
  const [photo, referencePhoto] = await Promise.all([
    loadImage(params.photoUrl),
    params.reference ? loadImage(params.reference.photoUrl) : Promise.resolve(null),
  ]);

  const canvas = document.createElement("canvas");
  canvas.width = SHEET_WIDTH;
  canvas.height = SHEET_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvasの初期化に失敗しました");

  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, SHEET_WIDTH, SHEET_HEIGHT);

  // --- ヘッダー ---
  let y = PAD_TOP;
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  ctx.fillStyle = INK;
  ctx.font = `900 46px ${FONT}`;
  ctx.fillText(params.storeName ?? "店舗未設定", PAD_X, y);

  ctx.textAlign = "right";
  ctx.font = `700 26px ${FONT}`;
  ctx.fillText("売場添削アプリ", PAD_X + CONTENT_WIDTH, y + 2);
  ctx.font = `400 20px ${FONT}`;
  ctx.fillStyle = INK_SOFT;
  const dateLabel = new Date(params.createdAt).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  ctx.fillText(dateLabel, PAD_X + CONTENT_WIDTH, y + 40);
  ctx.fillText(`投稿者: ${params.posterName ?? "スタッフ"}`, PAD_X + CONTENT_WIDTH, y + 66);

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
  ctx.fillText(params.title || "無題のセッション", PAD_X, y);
  y += 46;

  // --- 写真(お手本 / 現在の売場) ---
  const photoBoxH = 700;
  const hasReference = !!(params.reference && referencePhoto);
  const colGap = 24;
  const colWidth = hasReference ? (CONTENT_WIDTH - colGap) / 2 : CONTENT_WIDTH;

  function drawPhotoLabel(text: string, x: number, color: string) {
    ctx!.font = `700 18px ${FONT}`;
    ctx!.fillStyle = color;
    ctx!.textAlign = "left";
    ctx!.fillText(text, x, y);
  }

  const labelY = y;
  if (hasReference && referencePhoto && params.reference) {
    drawPhotoLabel(`本部お手本 ・ ${params.reference.seasonLabel}`, PAD_X, INK_SOFT);
    drawPhotoLabel("現在の売場(投稿写真)", PAD_X + colWidth + colGap, PENDING);
  } else {
    drawPhotoLabel("現在の売場(投稿写真)", PAD_X, PENDING);
  }
  y = labelY + 30;

  if (hasReference && referencePhoto) {
    // お手本写真は少し彩度を落として「参考写真」であることを示す
    ctx.save();
    ctx.filter = "sepia(0.2) saturate(0.85) brightness(0.98)";
    drawCover(ctx, referencePhoto, PAD_X, y, colWidth, photoBoxH);
    ctx.restore();
    ctx.strokeStyle = "#cdbf8f";
    ctx.lineWidth = 3;
    ctx.strokeRect(PAD_X + 1.5, y + 1.5, colWidth - 3, photoBoxH - 3);
  }

  const currentX = hasReference ? PAD_X + colWidth + colGap : PAD_X;
  drawCover(ctx, photo, currentX, y, colWidth, photoBoxH);

  const textPins = params.pins.filter((p) => !p.object_kind);
  const objectPins = params.pins.filter(
    (p) => p.object_kind && p.end_position_x != null && p.end_position_y != null,
  );
  objectPins.forEach((p) => drawObjectPin(ctx, p, currentX, y, colWidth, photoBoxH));
  textPins.forEach((p, i) =>
    drawPinBadge(ctx, currentX + p.position_x * colWidth, y + p.position_y * photoBoxH, i + 1, p.color),
  );

  y += photoBoxH + 26;
  ctx.font = `400 16px ${FONT}`;
  ctx.fillStyle = INK_SOFT;
  ctx.textAlign = "left";
  ctx.fillText(
    hasReference
      ? "左が本部お手本(参考)、右が今回の投稿写真。矢印は投稿写真側のオブジェクト指示、番号は下記コメント対応"
      : "矢印はオブジェクト指示(移動/フェイス拡げる/縮める)、番号は下記コメント対応",
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
    ctx.fillText(`ほか${measured.length - shown}件のコメントはアプリでご確認ください`, PAD_X, cy);
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
    { value: String(params.clapCount), label: "🙏 ありがとう", color: INK },
    { value: String(params.doneCount), label: "✅ 完成", color: GOOD },
    { value: String(params.needsWorkCount), label: "🔧 まだまだ", color: WARN },
    { value: `${doneRate}%`, label: "完成率", color: INK },
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
    `${new Date().toLocaleString("ja-JP")} 書き出し`,
    PAD_X,
    footerY,
  );
  ctx.textAlign = "right";
  ctx.fillText("shelf-review-app.vercel.app", PAD_X + CONTENT_WIDTH, footerY);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("画像の生成に失敗しました"));
    }, "image/png");
  });
}
