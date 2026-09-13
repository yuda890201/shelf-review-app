-- フィード表示用のサムネイル。
--
-- これまでフィードは1600px相当の写真をそのまま並べていたため、投稿が増えるほど
-- 低スペック端末でのデコード負荷が大きくスクロールがもたつく原因になっていた。
-- アップロード時に短辺640px程度の軽い画像も一緒に保存し、フィードではそちらを
-- 表示する(フィードバックシートの生成や拡大表示には従来どおり原寸を使う)。
--
-- 既存の写真には thumb_path が無いので、その場合は storage_path に
-- フォールバックする(アプリ側で処理)。

alter table images
  add column if not exists thumb_path text;

-- 本部レイアウト比較の一覧もサムネイルを並べるので同じ列を持たせる。
alter table layout_reference_photos
  add column if not exists thumb_path text;

alter table layout_current_photos
  add column if not exists thumb_path text;

-- フィードは作成日時の降順でページングするので、その並び順の索引を張る。
create index if not exists sessions_created_at_idx
  on sessions(created_at desc);

-- 未読バッジの計算で「自分が投稿したセッション」を引くために使う。
create index if not exists sessions_facilitator_id_idx
  on sessions(facilitator_id);
