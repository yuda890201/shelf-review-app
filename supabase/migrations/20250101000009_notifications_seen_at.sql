-- 通知バッジ用: 最後にフィードを確認した時刻

alter table profiles
  add column if not exists notifications_seen_at timestamptz not null default now();
