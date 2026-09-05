-- ピンにテキストなしの「オブジェクト」種別を追加する。
-- 移動・フェイス拡げる・フェイス縮めるのように、当たり前で説明不要な
-- 指示は文章を打たずにアイコンだけで素早くフィードバックできるようにする。

alter table pins
  add column if not exists object_kind text
  check (object_kind in ('move', 'widen', 'narrow'));
