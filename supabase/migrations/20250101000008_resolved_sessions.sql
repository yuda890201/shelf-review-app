-- 「対応済み」フラグと改善後(after)写真

alter table sessions
  add column if not exists resolved_at timestamptz,
  add column if not exists after_image_id uuid references images(id) on delete set null;

create index if not exists sessions_after_image_id_idx on sessions(after_image_id);
