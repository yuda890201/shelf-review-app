-- オブジェクトピン(移動/フェイス拡げる/フェイス縮める)を始点+終点の線として描画できるように、
-- 終点座標を pins / comments 両テーブルに追加する。
alter table pins add column if not exists end_position_x numeric;
alter table pins add column if not exists end_position_y numeric;

alter table comments add column if not exists end_position_x numeric;
alter table comments add column if not exists end_position_y numeric;
