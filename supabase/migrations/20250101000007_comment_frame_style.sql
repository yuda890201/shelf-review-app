-- コメントピンの見た目(枠のサイズ・角度・色)を投稿ごとに保存する

alter table comments
  add column if not exists width_pct float not null default 0.16,
  add column if not exists height_pct float not null default 0.045,
  add column if not exists rotation_deg float not null default 0,
  add column if not exists color text not null default '#3b82f6';

alter table comments
  add constraint comments_width_pct_range check (width_pct > 0 and width_pct <= 1),
  add constraint comments_height_pct_range check (height_pct > 0 and height_pct <= 1),
  add constraint comments_rotation_deg_range check (rotation_deg >= -180 and rotation_deg <= 180);
