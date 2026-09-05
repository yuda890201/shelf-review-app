import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PushSubscriptionRow } from "@/lib/types";

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    "mailto:push@shelf-review-app.example",
    vapidPublicKey,
    vapidPrivateKey,
  );
}

type NotifyBody =
  | {
      type: "new_session";
      sessionId: string;
      authorId: string;
      store?: string | null;
      category?: string | null;
    }
  | {
      type: "new_comment";
      sessionId: string;
      authorId: string;
      facilitatorId: string | null;
    };

export async function POST(req: Request) {
  if (!vapidPublicKey || !vapidPrivateKey) {
    return Response.json({ error: "VAPID keys are not configured" }, { status: 501 });
  }

  const body = (await req.json()) as NotifyBody;
  const supabase = createAdminClient();

  let targetUserIds: string[] = [];
  let title = "売場添削アプリ";
  let message = "";
  const url = `/?session=${body.sessionId}`;

  if (body.type === "new_session") {
    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("user_id")
      .returns<{ user_id: string }[]>();
    const allUserIds = [...new Set((subs ?? []).map((s) => s.user_id))];
    targetUserIds = allUserIds.filter((id) => id !== body.authorId);
    title = "新しい売場写真が投稿されました";
    message = [body.store, body.category].filter(Boolean).join(" / ");
  } else if (body.type === "new_comment") {
    if (body.facilitatorId && body.facilitatorId !== body.authorId) {
      targetUserIds = [body.facilitatorId];
    }
    title = "あなたの投稿にコメントが付きました";
    message = "新しいコメントを確認しましょう";
  } else {
    return Response.json({ error: "invalid type" }, { status: 400 });
  }

  if (targetUserIds.length === 0) {
    return Response.json({ sent: 0 });
  }

  const { data: subscriptions } = await supabase
    .from("push_subscriptions")
    .select("*")
    .in("user_id", targetUserIds)
    .returns<PushSubscriptionRow[]>();

  let sent = 0;
  await Promise.all(
    (subscriptions ?? []).map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify({ title, body: message, url }),
        );
        sent += 1;
      } catch (err) {
        const statusCode =
          err && typeof err === "object" && "statusCode" in err
            ? (err as { statusCode: number }).statusCode
            : null;
        if (statusCode === 404 || statusCode === 410) {
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        }
      }
    }),
  );

  return Response.json({ sent });
}
