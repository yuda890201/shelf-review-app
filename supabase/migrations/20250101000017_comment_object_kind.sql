-- 日々の投稿(セッション)のコメントピンにも、layouts/new-products と同じ
-- テキストなしのアイコンオブジェクト(移動/フェイス拡げる/フェイス縮める)を
-- 打てるようにする。

alter table comments
  add column if not exists object_kind text
  check (object_kind in ('move', 'widen', 'narrow'));
