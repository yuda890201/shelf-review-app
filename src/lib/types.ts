export type SessionStatus = "open" | "closed";
export type CommentType = "good" | "bad";

export type ImageRow = {
  id: string;
  storage_path: string;
  uploaded_by: string | null;
  store_name: string | null;
  shelf_category: string | null;
  created_at: string;
};

export type SessionRow = {
  id: string;
  image_id: string;
  title: string | null;
  facilitator_id: string | null;
  status: SessionStatus;
  created_at: string;
  closed_at: string | null;
  resolved_at: string | null;
  after_image_id: string | null;
};

export type CommentRow = {
  id: string;
  session_id: string;
  image_id: string;
  position_x: number;
  position_y: number;
  comment_type: CommentType;
  body: string;
  author_id: string | null;
  author_email?: string | null;
  created_at: string;
  width_pct: number;
  height_pct: number;
  rotation_deg: number;
  color: string;
};

export type SessionWithImage = SessionRow & {
  images: ImageRow | null;
  after_image: ImageRow | null;
};

export type ReactionType = "done" | "needs_work";

export type ReactionRow = {
  id: string;
  session_id: string;
  user_id: string;
  reaction_type: ReactionType;
  created_at: string;
};

export type ClapRow = {
  id: string;
  session_id: string;
  user_id: string;
  created_at: string;
};

export type PushSubscriptionRow = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at: string;
};
