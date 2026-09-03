-- 売場添削アプリ: 初期スキーマ (フェーズ1「意見出しモード」)

create extension if not exists "pgcrypto";
create extension if not exists "vector";

-- 画像
create table if not exists images (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null,
  uploaded_by uuid references auth.users(id) on delete set null,
  store_name text,
  shelf_category text,
  embedding vector(1536), -- フェーズ2以降(類似画像検索)で使用
  created_at timestamptz default now()
);

-- セッション(1枚の画像を囲むブレスト会)
create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  image_id uuid not null references images(id) on delete cascade,
  title text,
  facilitator_id uuid references auth.users(id) on delete set null,
  status text not null check (status in ('open', 'closed')) default 'open',
  created_at timestamptz default now(),
  closed_at timestamptz
);

-- コメント(ピン+コメント本体)
create table if not exists comments (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  image_id uuid not null references images(id) on delete cascade,
  position_x float not null check (position_x >= 0 and position_x <= 1),
  position_y float not null check (position_y >= 0 and position_y <= 1),
  comment_type text not null check (comment_type in ('good', 'bad')),
  body text not null,
  author_id uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

create index if not exists comments_session_id_idx on comments(session_id);
create index if not exists comments_image_id_idx on comments(image_id);
create index if not exists sessions_image_id_idx on sessions(image_id);
create index if not exists sessions_status_idx on sessions(status);
