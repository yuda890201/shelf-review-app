# 売場添削アプリ

コンビニ・小売店向けの売場添削アプリ。フェーズ1「意見出しモード」— チームで1枚の売場写真を見ながら、画像上にピンを打って良い点・悪い点をリアルタイムでブレストするツール。

## フェーズ設計

1. **(このリポジトリの実装対象)** 意見出しモード — 画像+ピン+コメントを構造化データとして蓄積する
2. (将来) 蓄積データを使った類似画像検索ベースの簡易添削
3. (将来) VLM(Claude等)にチームの陳列基準を注入した添削精度向上

## 技術スタック

- Next.js 16 (App Router, TypeScript, Tailwind CSS)
- Supabase (Postgres + Auth + Storage + Realtime)
- `@supabase/ssr` によるサーバー/クライアント両対応のSupabaseクライアント

## セットアップ

### 1. Supabaseプロジェクトを作成

[supabase.com](https://supabase.com) でプロジェクトを作成し、`Project Settings > API` から URL と anon key を取得します。

### 2. マイグレーションを適用

`supabase/migrations/` 配下のSQLをSupabase SQL Editor で順番に実行するか、Supabase CLIでリンクして適用します。

```bash
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

マイグレーション内容:

- `20250101000001_init_schema.sql` — `images` / `sessions` / `comments` テーブル作成、`pgvector` 拡張の有効化(フェーズ2の埋め込み検索用)
- `20250101000002_storage.sql` — 売場画像用ストレージバケット `shelf-images` と権限
- `20250101000003_rls_policies.sql` — Row Level Security(ログイン済みユーザーは全件閲覧可、投稿は自分のuser_idのみ、セッションのクローズは司会者本人のみ)
- `20250101000004_realtime.sql` — `comments` テーブルをRealtimeパブリケーションに追加
- `20250101000005_profiles.sql` — 匿名ログインの表示名を保存する `profiles` テーブル
- `20250101000006_reactions.sql` — セッション(写真)単位の「ありがとう」「まだまだ」リアクション用 `reactions` テーブル
- `20250101000007_comment_frame_style.sql` — コメントピンの枠のサイズ・角度・色を保存するカラムを `comments` に追加
- `20250101000008_resolved_sessions.sql` — 「対応済み」フラグと改善後(after)写真用のカラムを `sessions` に追加
- `20250101000009_notifications_seen_at.sql` — 通知バッジ計算用に最終閲覧時刻を保存するカラムを `profiles` に追加
- `20250101000010_claps.sql` — 無制限に送れる応援用の `claps` テーブルを追加。`reactions.reaction_type` の値を `like` → `done`(完成)に改名(「ありがとう」は独立した拍手に、`reactions` は「完成/まだまだ」の1人1票判定専用に整理)
- `20250101000011_push_subscriptions.sql` — Web Push通知の購読情報を保存する `push_subscriptions` テーブルを追加(任意機能。設定しなくても他の機能には影響しません)
- `20250101000012_tags.sql` — コメント入力時の「よく使う文言」スタンプを独立管理する `tags` テーブルを追加(投稿から自動的に蓄積され、手動での追加・編集・削除も可能)

### 3. 認証方式の確認

メール配信の設定が不要な**匿名ログイン**(名前を入力するだけ)を採用しています。Supabase Dashboard > Authentication > Sign In / Providers で **Anonymous Sign-Ins** を有効にしてください(デフォルトは無効です)。

### 4. 環境変数

```bash
cp .env.example .env.local
```

`.env.local` に Supabase の URL と anon key を設定します。

### 5. (任意)Web Push通知を有効にする

新しい売場写真の投稿・自分の投稿へのコメントをプッシュ通知で受け取れる機能です。設定しなくてもアプリ本体は問題なく動作します。

1. VAPID鍵ペアを生成: `npx web-push generate-vapid-keys`
2. `.env.local`(と Vercel の環境変数)に追加:
   - `NEXT_PUBLIC_VAPID_PUBLIC_KEY` — 生成した Public Key
   - `VAPID_PRIVATE_KEY` — 生成した Private Key
   - `SUPABASE_SERVICE_ROLE_KEY` — Supabase Dashboard > Project Settings > API の `service_role` シークレット(RLSを無視して通知購読を検索するために使用。**サーバー専用の秘密情報なので `NEXT_PUBLIC_` を付けないこと**)
3. `20250101000011_push_subscriptions.sql` を適用

通知が届くのは **iOS 16.4以降でホーム画面に追加したPWA** または対応するAndroid/デスクトップブラウザのみです(iOS 16.4未満の端末では通知機能自体が表示されません)。

### 6. 開発サーバー起動

```bash
npm install
npm run dev
```

[http://localhost:3000](http://localhost:3000) を開きます。

## 画面構成

| パス | 内容 |
|---|---|
| `/login` | 名前を入力するだけの匿名ログイン |
| `/` | Instagram風の縦スクロールフィード(投稿ごとに「🙏ありがとう」(何回でも送れる応援)と「✅完成/🔧まだまだ」(1人1票、完成率を可視化)のボタン、写真の連続タップでも🙏を送信、💬アイコンでページ遷移なしにピン打ち・コメントができるモーダルを開く、📤アイコンで投稿リンクを共有) |
| `/sessions/new` | 店舗選択→売場選択→カメラ起動のウィザード形式でセッション作成。カメラロールからは最大5枚まで一括選択でき、1枚ごとに個別のセッションとして作成される |
| `/sessions/[id]` | セッション詳細 — 画像上にピンを打って良い点/悪い点コメントを投稿、他の参加者の投稿がリアルタイムで反映される。「よく使う文言」タグをタップ即投稿できるスタンプも表示し、タグ横の「✎ タグを編集」から手動での追加・編集・削除もできる(`tag-manager-modal.tsx`)。司会者(セッション作成者)はクローズ操作が可能。ピン打ちの中核ロジックは `sessions/[id]/pin-board.tsx` に切り出してあり、フィードのモーダルとこのページの両方から使われる |
| `/comments` | コメント一覧・キーワード/種別での検索 |
| `/dashboard` | 店舗別・売場カテゴリ別の「まだまだ率」集計(高い順)|

画面全体はInstagramのように常時ダークモードで統一されており、上部ヘッダーは持たずコンテンツを画面いっぱいに使います。メニューはInstagram同様に画面下部の固定アイコンバー(`src/components/bottom-nav.tsx`)にまとめており、ホーム/コメント一覧/新規投稿(中央の大きな青い＋ボタン)/ダッシュボードのアイコンと、プロフィール(表示名・通知設定・ログアウト)を開くアイコンを配置しています。「ホーム」アイコンには、自分が作成したセッションに他の人からの新着コメント・リアクションがあると未読件数バッジが表示されます(フィードを開くと既読になります)。スマホでの操作感を最優先しており、ピンチズーム・入力時の自動ズームによる横幅のズレも無効化しています(`src/app/layout.tsx` の `viewport` 設定)。iPhone/Androidともホーム画面に追加するとアプリのようにフルスクリーンで開けます(PWA対応)。

プロフィールシートの「🔔 通知を有効にする」から、新しい売場写真の投稿・自分の投稿へのコメントをWeb Pushで受け取れます(対応端末のみボタンが表示されます)。通知の送信は `src/app/api/notify/route.ts` が担当し、`src/lib/supabase/admin.ts` の service role クライアントで購読者を検索して `web-push` パッケージで配信します。

実際に時間のかかる処理(複数枚アップロード、対応済み写真の登録、コメントモーダルの初回読み込み)では `src/components/loading-overlay.tsx` を表示し、アプリの使い方やアイコンの意味をランダムなヒントとして案内します。一瞬で終わる画面遷移には表示されません。

## データモデル

`sessions`(1枚の画像を囲むブレスト会) → `images`(売場画像、Storageパスと店舗/棚カテゴリのメタ情報) → `comments`(相対座標0〜1のピン位置 + good/bad種別 + 本文 + 投稿者)。`reactions` はセッション単位で1ユーザー1件(`unique(session_id, user_id)`)の「完成(done)/まだまだ(needs_work)」を保持し、フィードの完成率計算に使う。`claps` は1人が何回でも送れる「ありがとう」の応援ログで、投稿したスタッフのモチベーション向上が目的のため上限や1人1票制限はない。

`images.embedding` はフェーズ2以降の類似画像検索用に予約したカラムで、MVPでは未使用です。`push_subscriptions` はWeb Push通知の購読情報(ブラウザから発行されるendpoint/鍵)を保持し、通知送信時にservice roleキーで参照します。`tags` はコメント種別(good/bad)ごとの「よく使う文言」で、投稿されるたびに自動で蓄積(既存タグは`use_count`を加算、未登録の文言は新規追加)されるほか、コメント入力画面から手動で追加・編集・削除もできます。

## MVPで未実装の機能(意図的なスコープ外)

ログイン以外の権限管理、矩形描画・手書き注釈、カーソル共有、Googleスプレッドシート連携、類似画像検索、VLM添削。

## 既知の制約

- 匿名ログインのため、一度サインアウトすると同じ名前で再ログインしても内部的には別ユーザー(別のauth uid)として扱われます。なりすまし防止や本人確認はできません(MVPのスコープ外)。
- コメントは匿名投稿です。投稿者は `author_id`(user id)として構造化データには保存されますが(将来の分析・モデレーション用)、UI上は誰が投稿したか一切表示されません(自分の投稿かどうかも含めて非表示)。活発な意見出しを促すための意図的な設計です。
