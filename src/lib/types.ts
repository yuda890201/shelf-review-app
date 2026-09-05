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

export type TagRow = {
  id: string;
  comment_type: CommentType;
  body: string;
  use_count: number;
  created_at: string;
  updated_at: string;
};

export type PushSubscriptionRow = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at: string;
};

export type Season = "spring" | "autumn";

export type LayoutRow = {
  id: string;
  name: string;
  sort_order: number;
  created_at: string;
};

export type LayoutReferencePhotoRow = {
  id: string;
  layout_id: string;
  season: Season;
  year: number;
  storage_path: string;
  uploaded_by: string | null;
  created_at: string;
};

export type LayoutCurrentPhotoRow = {
  id: string;
  layout_id: string;
  store_name: string;
  storage_path: string;
  uploaded_by: string | null;
  created_at: string;
};

export type LayoutTaskRow = {
  id: string;
  layout_id: string;
  store_name: string;
  body: string;
  done: boolean;
  done_at: string | null;
  author_id: string | null;
  created_at: string;
};

export type PinObjectKind = "move" | "widen" | "narrow";

export type PinRow = {
  id: string;
  layout_reference_photo_id: string | null;
  layout_current_photo_id: string | null;
  position_x: number;
  position_y: number;
  width_pct: number;
  height_pct: number;
  rotation_deg: number;
  color: string;
  body: string;
  object_kind: PinObjectKind | null;
  author_id: string | null;
  created_at: string;
};

export type StoreRow = {
  id: string;
  name: string;
  sort_order: number;
  created_at: string;
};

export type DeliveryTruckRow = {
  id: string;
  name: string;
  sort_order: number;
  created_at: string;
};
