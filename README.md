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

### 3. 認証方式の確認

メール配信の設定が不要な**匿名ログイン**(名前を入力するだけ)を採用しています。Supabase Dashboard > Authentication > Sign In / Providers で **Anonymous Sign-Ins** を有効にしてください(デフォルトは無効です)。

### 4. 環境変数

```bash
cp .env.example .env.local
```

`.env.local` に Supabase の URL と anon key を設定します。

### 5. 開発サーバー起動

```bash
npm install
npm run dev
```

[http://localhost:3000](http://localhost:3000) を開きます。

## 画面構成

| パス | 内容 |
|---|---|
| `/login` | 名前を入力するだけの匿名ログイン |
| `/` | Instagram風の縦スクロールフィード(投稿ごとに「ありがとう」「まだまだ」ボタンと反応率、新規作成ボタン) |
| `/sessions/new` | 店舗選択→売場選択→カメラ起動のウィザード形式でセッション作成。カメラロールからは最大5枚まで一括選択でき、1枚ごとに個別のセッションとして作成される |
| `/sessions/[id]` | セッション詳細 — 画像上にピンを打って良い点/悪い点コメントを投稿、他の参加者の投稿がリアルタイムで反映される。過去のコメントから集計した「よく使う文言」をタップ即投稿できるスタンプも表示。司会者(セッション作成者)はクローズ操作が可能 |
| `/comments` | コメント一覧・キーワード/種別での検索 |
| `/dashboard` | 店舗別・売場カテゴリ別の「まだまだ率」集計(高い順)|

「フィード」タブには、自分が作成したセッションに他の人からの新着コメント・リアクションがあると未読件数バッジが表示されます(フィードを開くと既読になります)。iPhone/Androidともホーム画面に追加するとアプリのようにフルスクリーンで開けます(PWA対応)。

## データモデル

`sessions`(1枚の画像を囲むブレスト会) → `images`(売場画像、Storageパスと店舗/棚カテゴリのメタ情報) → `comments`(相対座標0〜1のピン位置 + good/bad種別 + 本文 + 投稿者)。`reactions` はセッション単位で1ユーザー1件(`unique(session_id, user_id)`)の「ありがとう/まだまだ」を保持し、フィードの反応率計算に使う。

`images.embedding` はフェーズ2以降の類似画像検索用に予約したカラムで、MVPでは未使用です。

## MVPで未実装の機能(意図的なスコープ外)

ログイン以外の権限管理、矩形描画・手書き注釈、カーソル共有、Googleスプレッドシート連携、類似画像検索、VLM添削。

## 既知の制約

- 匿名ログインのため、一度サインアウトすると同じ名前で再ログインしても内部的には別ユーザー(別のauth uid)として扱われます。なりすまし防止や本人確認はできません(MVPのスコープ外)。
- コメントは匿名投稿です。投稿者は `author_id`(user id)として構造化データには保存されますが(将来の分析・モデレーション用)、UI上は誰が投稿したか一切表示されません(自分の投稿かどうかも含めて非表示)。活発な意見出しを促すための意図的な設計です。
