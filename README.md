# Instatic TalksX

Instagram、TikTok、X、Threadsの投稿予約、履歴、添付ファイル、API設定を一括管理する業務用コンソールです。

## Current capabilities

- Supabase Authによるメールアドレス・パスワード認証
- 公式22店舗とBLU NEROを合わせた23店舗の所属マスター
- 新規登録時の所属店舗選択と、既存利用者向けの初回所属設定
- 店舗・ワークスペース単位の投稿予約と履歴保存
- 非公開Supabase Storageへのファイル保存と期限付きダウンロード
- 1:1、4:5、9:16、16:9の動画クロップ設定と処理履歴
- 元動画を保持したままCloud Run Jobsでクロップ済みMP4を生成する非同期処理
- SNS APIの公開設定と秘密情報の分離保存
- RLSによる利用者・ワークスペース単位のアクセス制御
- 通常の運用画面で現在の所属店舗を常時表示
- 管理者専用ページ `/admin` での全利用者・投稿・予約予定・ファイル・操作履歴の一元確認
- 管理者画面での全店舗一覧と店舗別の絞り込み・運用状況確認
- 管理者による投稿ステータス更新と期限付きファイル取得
- 利用者一覧からの管理者権限付与・解除（最後の管理者は解除不可）
- 管理者専用のGraphifyシステムマップによるコード構成の確認
- 投稿本文やAPIシークレットを複製しない監査ログ
- SupabaseからDropboxへの管理者向けバックアップ

SNSへの実際の公開、コメント、DM、外部分析値の取得には、各SNSの開発者アプリ審査とOAuth・Webhook実装が別途必要です。画面では未取得データを実データ風に表示しません。

## Local development

Node.js 22以降を使用します。

```bash
npm install
npm run dev
npm test
```

ローカル環境変数は `.env.local` に置きます。

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key
```

秘密キー、service role key、SNSトークンをGitへ保存しないでください。

## GitHub Pages deployment

本番URLは [https://marugo-s.github.io/sms-management/](https://marugo-s.github.io/sms-management/) です。`main`へpushするとGitHub Actionsが静的アプリをビルドしてGitHub Pagesへ公開します。Actionsには`NEXT_PUBLIC_SUPABASE_URL`と`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`をRepository Secretとして登録します。これらはブラウザ向けの公開キーであり、秘密キー・service role key・SNSトークンを登録してはいけません。

Supabase DashboardのAuthentication > URL Configurationでは、Redirect URLsに次を登録します。

```text
https://marugo-s.github.io/sms-management/**
```

これによりメール確認、パスワード再設定、Google OAuthの完了後にGitHub Pagesのアプリへ戻ります。

## System map

`/admin` の「システムマップ」は、Graphifyで生成したアプリのコード構成図です。利用者の投稿本文、添付ファイル、Supabaseデータ、環境変数、SNS連携シークレットは解析・表示しません。

アプリ構成を変更した後だけ、Graphify CLIが入った開発環境で更新します。

```bash
npm run graphify:system-map
```

このコマンドはローカルの`graphify-out/`に作業用出力を生成し、公開用の`public/system-map/graph.html`だけを更新します。`graphify-out/`はGit・Dropboxソースミラーに保存しません。

## Supabase

```bash
supabase db push --linked
supabase functions deploy integration-secrets --use-api
supabase functions deploy media-jobs --use-api
supabase db advisors --linked --type all --level warn --fail-on none
```

データベース変更は必ず `supabase migration new <name>` で作成し、`supabase/migrations/` をGitへ保存します。

動画クロップの画面・ジョブ登録・処理履歴はSupabase Freeで利用できます。実際のFFmpeg処理には別途Cloud Run Jobの接続が必要です。接続前の処理は`queued`として残り、履歴から再実行できます。Cloud Runの設定手順は`workers/media-processor/README.md`にあります。

## Backup

`npm run backup:dropbox` は、管理者用のserver-only keyを使ってSupabaseのテーブル、SNS連携シークレット、ファイルをDropboxへバックアップします。Supabaseが本番データの正本で、Dropboxは所有者専用のバックアップとAI引き継ぎ用です。秘密情報はGitのソースフォルダと分離してください。
