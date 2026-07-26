# Instatic TalksX 進行記録

## 文書情報

- 記録日時: 2026-07-26 21:50:36 JST
- 対象リポジトリ: `https://github.com/MARUGO-s/sms-management.git`
- 対象ブランチ: `main`
- 記録時のHEAD: `04b3451445a82d1a3ad3a69d039b6aa1f702ccc9`
- ローカル作業場所: `/Users/yoshito/Documents/New project`
- 本番URL: `https://instatic-talksx.yoshito0428.chatgpt.site`
- 管理者URL: `https://instatic-talksx.yoshito0428.chatgpt.site/admin`
- Supabase project ref: `xpdrewhzisycjdtcvvey`
- この文書には秘密値、個人メール、アクセストークンを記載しない。

## 現在の到達点

Instatic TalksXは、Instagram、TikTok、X、Threadsの運用情報を一括管理する業務用Webアプリとして、以下の基盤まで本番反映済み。

- Supabase Authによるメール・パスワード認証
- Google OAuthログイン
- 利用者ごとのワークスペース作成
- 投稿本文、予約日時、投稿先、ステータスの保存
- 投稿履歴の閲覧
- 非公開Supabase Storageへの添付ファイル保存
- 期限付きURLによるファイルダウンロード
- SNS連携設定のメタデータ保存
- SNS APIシークレットのブラウザ非公開保存
- 全利用者、投稿、ファイル、操作履歴を確認する管理者画面
- 管理者画面からの管理者権限付与・解除
- 最後の管理者を削除できないDB保護
- 管理者権限変更を含む監査ログ
- GitHub、Dropbox、Sitesへの引き継ぎ経路

現時点では実際のSNS公開処理、コメント・DM同期、Webhook受信、各SNSの分析値取得は未実装。各SNSの開発者アプリ審査、OAuth認可、公開API実装が別途必要。

## 本番データのスナップショット

2026-07-26 21:49 JSTに本番DBへ直接照会した結果。

| 対象 | 件数 |
| --- | ---: |
| Supabase Auth利用者 | 1 |
| 管理者 | 1 |
| 公開プロフィール | 1 |
| ワークスペース | 1 |
| ワークスペースメンバー | 0 |
| 投稿 | 0 |
| 投稿先チャンネル | 0 |
| ファイルメタデータ | 0 |
| Storage内ファイル | 0 |
| SNS連携設定 | 0 |
| SNS連携シークレット行 | 0 |
| 監査ログ | 0 |

投稿、ファイル、SNS連携、監査ログが0件なのは、まだ実データ操作が行われていないためであり、読み込み失敗ではない。

## 技術構成

### フロントエンド

- React 19
- Next.js 16互換のVinext
- Vite 8
- TypeScript
- HeroUI v3
- Lucide React
- Cloudflare Workers互換のビルド出力

主要ファイル:

- `app/page.tsx`: 通常画面のルート
- `app/social-console.tsx`: 通常のSNS運用画面
- `app/admin/page.tsx`: 管理者画面のルート
- `app/admin/admin-console.tsx`: 管理者画面
- `app/lib/supabase.ts`: ブラウザ用Supabaseクライアント
- `app/globals.css`: 通常画面、認証画面、管理者画面の共通スタイル
- `app/layout.tsx`: メタデータ、フォント、OG設定

### バックエンド

- Supabase Postgres
- Supabase Auth
- Supabase Storage
- Supabase Edge Functions
- Row Level Security
- `private`スキーマ内のSecurity Definer関数

### ホスティング

- OpenAI Sites
- Sites project ID: `appgprj_6a65e85b2c6c8191b197204738f2e23f`
- `.openai/hosting.json`にproject IDを保存
- アクセスモード: 所有者のみのカスタムアクセス
- 最新Sitesバージョン: v7
- v7のsource commit: `04b3451445a82d1a3ad3a69d039b6aa1f702ccc9`
- v7は本番公開済み

## 通常画面の機能

### 投稿

- 本文を最大2200文字で入力
- Instagram、TikTok、X、Threadsを複数選択
- 公開予定日時を設定
- 下書きまたは予約投稿としてPostgresへ保存
- 投稿タイトルは本文から生成
- 投稿の作成者をAuth user IDで保存

### 添付ファイル

- 1投稿につき最大4ファイル
- 1ファイル20MBまで
- ファイル本体は非公開Storage bucket `post-files`へ保存
- ファイル名、MIME type、サイズ、Storage pathは`social_post_files`へ保存
- ダウンロード時だけ60秒の署名付きURLを生成

### 予約

- `scheduled`状態の投稿を一覧表示
- 予約日時、投稿先、担当者を確認

### 履歴

- 保存済み投稿を新しい順に表示
- 本文、ステータス、投稿先、保存日時、添付ファイルを確認
- 投稿本文の検索

### 受信箱

- 画面枠は存在する
- 実際のコメント・DM API同期は未実装
- 実データ風のダミー値は表示しない

### 分析

- 保存済み投稿の内部件数を集計
- 実際のSNSインプレッション、反応数、フォロワー推移は未取得

### 連携

- Instagram、TikTok、X、Threadsごとの設定画面
- App ID、Callback URL、Scopes、接続状態を`social_integrations`へ保存
- Client Secret、Access Token、Refresh Token、Webhook SecretはEdge Function経由で`social_integration_secrets`へ保存
- 保存済みシークレットの値はブラウザへ返さず、登録有無だけ返す

## 認証

### 有効なログイン方式

- メールアドレスとパスワード
- Google OAuth

### 現在の保護

- 未ログイン時は通常画面の業務データを表示しない
- 投稿、履歴、ファイル、SNS設定はSupabase RLSで保護
- UIを直接操作しなくても、Data API側で権限を拒否
- 新規登録画面は12文字以上のパスワードを要求
- Google OAuthのClient SecretはSupabase AuthenticationとGoogle Auth Platformにのみ保存

### Supabase Auth URL設定

- Site URL: 本番Sites URL
- Redirect URL: 本番URL配下
- Redirect URL: `http://localhost:3000/**`

### 既知のAuth警告

Supabase Advisorsは`Leaked Password Protection Disabled`を1件報告している。HaveIBeenPwned連携による漏洩パスワード保護はSupabase Proプラン向けのため、Freeプラン中は有効化できない。現在はアプリ側の12文字制限を維持する。

## 管理者画面

### アクセス

- ルート: `/admin`
- `social_admin_users`にAuth user IDが存在する利用者だけアクセス可能
- 一般利用者がURLを直接開いても管理データは取得できない
- 通常画面の「管理者」リンクも管理者にだけ表示

### 全体管理

- 全利用者数
- 全ワークスペース数
- 全投稿数
- 全ファイル数
- 設定済みSNS連携数
- 利用者、投稿、ファイルの横断検索

### 投稿管理

- 全ワークスペースの投稿を確認
- 利用者、ワークスペース、投稿先、公開予定を表示
- 投稿ステータスを下書き、予約済み、公開済み、失敗へ変更
- 管理者画面には投稿削除機能を置いていない

### ファイル管理

- 全ワークスペースのファイルメタデータを確認
- 投稿、作成者、ワークスペース、保存日時を表示
- 非公開Storageから期限付きURLで取得
- 管理者画面にはファイル削除機能を置いていない

### 操作履歴

- 作成、更新、削除を監査ログへ保存
- 対象種別、対象ID、表示名、実行者、日時を記録
- 投稿本文は監査ログへ複製しない
- SNSシークレットは監査ログへ複製しない
- 監査対象:
  - ワークスペース
  - ワークスペースメンバー
  - 投稿
  - 投稿先
  - ファイルメタデータ
  - SNS連携メタデータ
  - 管理者権限

### 利用者管理

- 登録済み利用者を一覧表示
- 登録日時、最終ログイン、ワークスペース数、投稿数、ファイル数を表示
- 管理者と一般利用者を区別
- 一般利用者を「管理者にする」
- 管理者の「権限を解除」
- 現在ログイン中の管理者は画面から自分自身を解除できない
- DB側でも最後の管理者1名は削除できない
- 権限付与・解除は監査ログへ保存
- 管理者へ変更できるのは、事前に一度登録済みの利用者のみ

## Supabaseテーブル

### `social_workspaces`

- ワークスペース
- `created_by`で作成者を保持
- 作成者またはメンバーが通常画面から閲覧
- 管理者は管理者画面から全件閲覧

### `social_workspace_members`

- ワークスペースと利用者の所属
- roleは`owner`、`admin`、`member`、`viewer`
- ワークスペース所有者だけがメンバーを管理

### `social_posts`

- 投稿本文、タイトル、公開予定、ステータス、形式、作成者
- ステータスは`draft`、`scheduled`、`published`、`failed`
- 通常利用者は所属ワークスペース内だけ操作
- アプリ管理者は全件閲覧とステータス更新が可能

### `social_post_channels`

- 投稿とSNSチャンネルの多対多情報
- チャンネルは`instagram`、`tiktok`、`x`、`threads`

### `social_post_files`

- Storage内ファイルのメタデータ
- Storage pathは一意
- ファイルサイズは0以上

### `social_integrations`

- SNS連携の公開可能なメタデータ
- App ID、Callback URL、Scopes、Status
- シークレット値は保存しない

### `social_integration_secrets`

- Client Secret
- Access Token
- Refresh Token
- Webhook Secret
- ブラウザロール`anon`、`authenticated`へ権限を付与しない
- `service_role`とEdge Functionのみが操作

### `social_admin_users`

- アプリ全体の管理者
- Auth user IDを主キーとして保持
- 付与者と付与日時を保持
- RLSにより管理者だけが全管理者を閲覧・変更
- 最後の管理者削除を拒否

### `social_user_profiles`

- `auth.users`を直接Data APIへ公開しないための管理者向けディレクトリ
- email、登録日時、最終ログインを同期
- `auth.users`のInsert、email更新、last sign-in更新で自動同期
- 管理者だけが全件閲覧

### `social_audit_logs`

- 操作履歴
- workspace ID、actor user ID、action、entity type、entity ID、label、metadata、日時
- 管理者だけが閲覧
- 本文やシークレットを保存しない

## Supabase Storage

- Bucket ID: `post-files`
- Public設定: false
- 1ファイル上限: 20MB
- 通常利用者は所属ワークスペースのファイルだけ操作可能
- アプリ管理者は全ファイルを読み取り可能
- ファイルの更新・削除権限は管理者へ自動拡張していない

## Supabase Edge Function

### `integration-secrets`

- 状態: ACTIVE
- バージョン: 1
- JWT検証: 有効
- 役割:
  - SNSシークレット保存
  - 保存済みシークレットの有無確認
  - SNSシークレット削除
- シークレット値をブラウザへ返さない

## 適用済みマイグレーション

ローカルと本番が一致している。

### `20260726102900_social_ops_storage.sql`

- SNS運用の基本テーブル作成
- 投稿、チャンネル、ファイル、連携設定
- 非公開Storage bucket作成
- 初期RLSと権限

### `20260726103150_consolidate_social_rls_policies.sql`

- 初期RLSの重複整理

### `20260726104635_secure_integration_secrets.sql`

- サーバー専用シークレットテーブル
- browser roleからシークレットテーブル権限を削除
- Storageの20MB制限

### `20260726111630_fix_social_rls_recursion.sql`

- `private`スキーマ作成
- Security Definerによる所有者・メンバー判定
- 循環RLSによるログイン後読み込み失敗を修正

### `20260726114941_allow_workspace_owner_returning.sql`

- 新規ワークスペース作成直後の`insert ... returning`を所有者が読めるよう修正

### `20260726121622_add_social_admin_console.sql`

- 管理者テーブル
- 利用者プロフィール同期
- 監査ログ
- 管理者の全体閲覧RLS
- 投稿ステータス更新

### `20260726122528_consolidate_social_admin_rls.sql`

- 管理者用RLSを既存ポリシーへ統合
- 複数Permissive Policy警告を解消
- 管理者の権限を閲覧と投稿更新へ限定

### `20260726124138_manage_social_administrators.sql`

- 管理者による管理者権限付与・解除
- 最後の管理者保護
- 管理者変更の監査ログ

## RLS検証結果

2026-07-26に本番DB上でロールとJWT subjectを切り替え、トランザクションをRollbackして検証。

- 管理者は全利用者、ワークスペース、投稿、ファイル、監査ログを閲覧可能
- 一般利用者相当では管理者一覧、利用者ディレクトリ、監査ログが0件
- 管理者でない利用者は管理者削除判定がfalse
- 最後の管理者をDELETEしても1名が残る
- 管理者ロールには管理者テーブルのINSERT、DELETE grantが存在
- 実際の変更可否はRLSで管理者だけに制限
- 投稿の作成・更新・削除の監査テストで3操作を記録
- 監査テストで投稿本文がログへ混入しないことを確認

## Gitの状態

記録作成直前の状態:

- ブランチ: `main`
- HEAD: `04b3451445a82d1a3ad3a69d039b6aa1f702ccc9`
- Working tree: clean
- Remote: `origin`
- Remote URL: `https://github.com/MARUGO-s/sms-management.git`

直近のコミット:

| Commit | 日時 | 内容 |
| --- | --- | --- |
| `04b3451` | 2026-07-26 21:45 JST | Manage administrators from admin console |
| `06be302` | 2026-07-26 21:38 JST | Document Dropbox secret handoff |
| `c86dece` | 2026-07-26 21:31 JST | Add administrator operations console |
| `db7f506` | 2026-07-26 21:07 JST | Show authenticated storage access state |
| `e219e84` | 2026-07-26 21:02 JST | Keep existing password sign-ins compatible |
| `1f56eec` | 2026-07-26 20:58 JST | Add Google authentication flow |
| `0998b66` | 2026-07-26 20:21 JST | Fix authenticated workspace loading |
| `4ac36e8` | 2026-07-26 20:10 JST | Document production deployment handoff |

この進行記録を追加するとHEADは変わるため、次回はこの文書の記録時HEADと現在HEADを比較すること。

## Dropbox

### ソース引き継ぎ

パス:

`/Users/yoshito/Library/CloudStorage/Dropbox/web/instatic-talksx/`

この文書を同期する直前のファイル数: 60

この文書を含めた同期後の想定ファイル数: 61

含むもの:

- アプリソース
- Supabase migrations
- Supabase Edge Functionソース
- README
- AI_HANDOFF
- この進行記録

除外するもの:

- `.git`
- `node_modules`
- `dist`
- `.next`
- `.wrangler`
- `.env*`
- `supabase/.temp`
- coverage、outputs、work

### 秘密情報引き継ぎ

パス:

`/Users/yoshito/Library/CloudStorage/Dropbox/web/instatic-talksx-secrets/`

記録時のファイル数: 2

- `.env.local`: 現在のブラウザ実行設定
- `README.md`: 秘密情報引き継ぎ方針

`.env.local`に存在する変数名:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `DROPBOX_BACKUP_DIR`

秘密値はこの文書へ記載しない。

`SUPABASE_SECRET_KEY`または`SUPABASE_SERVICE_ROLE_KEY`は記録時点でローカルenvに存在しない。入手した場合はGitソース外のDropbox secretsフォルダに`server.env`として保存する。

### 実データバックアップ

既定パス:

`/Users/yoshito/Library/CloudStorage/Dropbox/web/instatic-talksx-backups/`

記録時のバックアップフォルダ数: 0

`npm run backup:dropbox`は以下をバックアップする設計:

- 全業務テーブル
- 管理者テーブル
- 利用者プロフィール
- 監査ログ
- SNS連携シークレット
- `post-files`のファイル本体

実行には`SUPABASE_SECRET_KEY`と`DROPBOX_BACKUP_DIR`が必要。現在はserver-only keyがないため、実データバックアップは未実行。

## 秘密情報の方針

所有者の指示により、秘密情報はAI引き継ぎ目的でDropbox専用secretsフォルダへ保存してよい。

保存してよい場所:

- Supabase
- Google Auth Platform
- 所有者のDropbox secretsフォルダ
- 所有者のDropbox backupフォルダ

保存しない場所:

- Git
- GitHub issue、PR本文
- アプリのブラウザStorage
- チャット本文
- スクリーンショット
- `AI_HANDOFF.md`
- `PROJECT_PROGRESS.md`
- Dropboxのソースミラー

公開可能なSupabase Publishable Keyと、server-onlyのSecret Keyを混同しないこと。Publishable KeyだけではRLSを回避できない。

## 確認済みテスト

### コード

- `npm run lint`
- `npm test`
- `npm run build`
- `node --test tests/rendered-html.test.mjs`
- `git diff --check`

結果:

- Build成功
- `/`のサーバーレンダリング成功
- `/admin`のサーバーレンダリング成功
- スタータープレビューが残っていないことを確認
- ESLint error 0

### 実画面

- 本番通常画面へGoogle OAuthでログイン
- 通常画面に管理者リンクが管理者だけ表示
- `/admin`の全体件数を表示
- 投稿、ファイル、操作履歴、利用者タブを切り替え
- 利用者タブに管理者1名を表示
- 現在の管理者に解除ボタンが出ないことを確認
- デスクトップ表示を確認
- 390 x 844のモバイル表示を確認
- 表はモバイルで横スクロールし、画面全体を押し広げない

## 既知の警告と環境上の注意

### Supabase Advisors

- `Leaked Password Protection Disabled`が1件
- Freeプランでは有効化不可
- 他のRLS重複・スキーマ警告は解消済み

### ESLint

- `supabase/functions/integration-secrets/index.ts`のanonymous default export warningが1件
- errorではなく、機能やデプロイを阻害していない

### Docker

- Docker Desktopは記録時に起動していない
- `supabase db push --linked`のマイグレーション適用自体は成功
- 適用後のローカルmigration catalog cache生成だけがDocker未起動警告を出す
- ローカルSupabase stackを起動する場合はDocker Desktopが必要

### ローカル開発サーバー

- 記録時点で`127.0.0.1:3000`にNodeプロセスがLISTEN中
- PIDは一時的な値なので引き継ぎ判断には使用しない
- 必要に応じて`npm run dev`を実行

## 現時点の未実装範囲

### SNS連携

- 各SNSのOAuth認可開始・Callback処理
- Access Token更新
- 実際の投稿公開
- 動画アップロード処理
- 公開結果の取得
- 公開失敗時の再試行
- Rate limit制御
- Webhook署名検証

### 受信箱

- コメント取得
- DM取得
- コメント返信
- DM返信
- 既読・担当者管理

### 分析

- SNS APIからの実績取得
- 投稿別インプレッション
- エンゲージメント
- フォロワー推移
- CSV出力

### 運用

- 定期実行ワーカー
- 予約時刻になった投稿の自動公開
- Dropboxバックアップの自動実行
- 障害通知
- メール通知
- 監査ログの保持期間設定
- 大量データ向けページネーション

### 管理

- 利用者停止
- パスワードリセットの管理者実行
- ワークスペース割当UI
- 管理者による投稿本文編集
- 管理者による安全な論理削除

## 次に着手する優先順位

### 優先度1: SNS OAuth

1. 連携対象SNSを1つに絞る
2. 開発者アプリのClient ID、Client Secretを準備
3. 認可開始URLをEdge Functionで生成
4. Callbackを受けてTokenをserver-only領域へ保存
5. Token更新処理を実装

最初はInstagramまたはThreadsを推奨。複数SNSを同時に実装しない。

### 優先度2: 実際の投稿公開

1. 画像のみの投稿から開始
2. Provider APIへ公開
3. Provider側post IDを保存する列を追加
4. 成功時に`published`
5. 失敗時に`failed`と安全なエラーコードを保存
6. Retry可能な状態を設計

### 優先度3: 予約実行

1. 実行対象投稿を取得するserver-only処理
2. 重複実行防止
3. ロックまたはidempotency key
4. 実行履歴
5. 失敗通知

### 優先度4: バックアップ

1. Dropbox secretsフォルダへserver-only keyを配置
2. `npm run backup:dropbox`を手動実行
3. manifestとファイル数を確認
4. 定期実行方法を決定

## 作業再開手順

1. `/Users/yoshito/Documents/New project`を開く。
2. `git status --short`で利用者の未コミット変更を確認する。
3. `git pull --ff-only origin main`で最新化する。
4. `AI_HANDOFF.md`と`PROJECT_PROGRESS.md`を読む。
5. `.env.local`がない場合はDropbox secretsフォルダの`.env.local`を利用する。値はチャットへ表示しない。
6. `npm install`が必要か確認する。
7. `npm run dev`でローカル起動する。
8. `npm test`で現在の基準状態を確認する。
9. DB変更前に`supabase migration new <name>`を実行する。
10. `supabase db push --linked --dry-run`で確認する。
11. 本番適用後にRollback前提のSQLでRLSを検証する。
12. `supabase db advisors --linked --type all --level warn --fail-on none`を実行する。
13. UI変更時は実画面をデスクトップとモバイルで確認する。
14. Gitへcommit、pushする。
15. Dropboxソースミラーを更新する。
16. `.openai/hosting.json`が存在するため、Sitesで本番公開まで完了する。

## 変更時に守ること

- 秘密値をGitへ入れない。
- `social_integration_secrets`をブラウザへ直接公開しない。
- RLSを無効化しない。
- 管理者画面を隠すだけの認可にしない。必ずDB側でも拒否する。
- 最後の管理者保護を削除しない。
- 投稿本文やシークレットを監査ログへ複製しない。
- 管理者権限をemail文字列で判定しない。Auth user IDを使用する。
- 本番DBへテストデータを残さない。検証はTransactionとRollbackを使用する。
- 利用者の既存Git変更を勝手に戻さない。
- Supabaseのマイグレーション履歴を直接書き換えない。
- Sites ID、version ID、deployment IDを推測しない。

## よく使うコマンド

```bash
npm install
npm run dev
npm run lint
npm test
npm run build
npm run backup:dropbox
supabase migration new <name>
supabase db push --linked --dry-run
supabase db push --linked
supabase migration list --linked
supabase db lint --linked --level warning
supabase db advisors --linked --type all --level warn --fail-on none
supabase functions list --project-ref xpdrewhzisycjdtcvvey
supabase functions deploy integration-secrets --use-api
```

## 完了条件の基準

今後の機能追加は、最低限以下を満たして完了とする。

- TypeScript build成功
- 既存テスト成功
- 新機能のRLSまたはserver-side認可確認
- 一般利用者の拒否確認
- 秘密情報のGit混入なし
- デスクトップ表示確認
- モバイル表示確認
- Git commitとpush
- Dropboxソース同期
- Supabase変更の本番適用
- Sites変更の本番公開
- この進行記録または`AI_HANDOFF.md`の更新
