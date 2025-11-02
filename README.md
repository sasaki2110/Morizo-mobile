# Morizo - 開発環境

3つのリポジトリに対応したDocker開発環境

## リポジトリ構成

- **morizo** - この開発環境構築用リポジトリ
- **morizo-web** - Next.js 15 Webアプリ（Vercelデプロイ用）
- **morizo-mobile** - Expo モバイルアプリ（API呼び出し用）

## サービス構成

- **morizo-web** - Next.js 15環境（ポート3000）
- **morizo-mobile** - Expo環境（ポート8081, 19000-19001, 19006）

## クラウドサービス

- **Vercel Postgres** - データベース（クラウド）
- **Supabase** - 認証・リアルタイム機能（クラウド）

## セットアップ

### 1. 開発環境の起動

```bash
# Docker Composeで開発環境を起動
cd docker
docker-compose up -d
```

### 2. アプリケーションの作成

#### Webアプリ（morizo-web）

```bash
# Webコンテナに接続
docker-compose exec morizo-web bash

# /app フォルダで Next.js 15アプリを作成
cd /app
npx create-next-app@latest . --typescript --tailwind --eslint --app

# 依存関係をインストール
npm install

# 開発サーバーを起動
npm run dev
```

#### モバイルアプリ（morizo-mobile）

```bash
# モバイルコンテナに接続
docker-compose exec morizo-mobile bash

# /app フォルダで Expoアプリを作成
cd /app
npx create-expo-app@latest . --template blank-typescript

# 依存関係をインストール
npm install

# 開発サーバーを起動
# Expo Goで実機確認する場合（Android/iOS端末）
npx expo start --tunnel

# Webブラウザで簡易確認する場合
npx expo start --web
```

## アクセス先

- **Webアプリ**: http://localhost:3000
- **Expo DevTools**: http://localhost:19000
- **Vercel Postgres**: クラウド（接続情報は環境変数で設定）
- **Supabase**: クラウド（接続情報は環境変数で設定）

## 開発コマンド

```bash
# 開発環境の起動
docker-compose up -d

# 開発環境の停止
docker-compose down

# ログの確認
docker-compose logs -f

# 特定のサービスのログ
docker-compose logs -f morizo-web
docker-compose logs -f morizo-mobile
```

## 注意事項

- WebアプリはVercelにデプロイ可能
- モバイルアプリはWebアプリのAPIを呼び出す
- 各アプリは独立したコンテナで動作
- データベースと認証はクラウドサービスを使用
- 開発環境は軽量化され、必要なサービスのみ起動

## 実装完了機能

### Phase 3.1: Expo Go実機対応ログ採取 ✅ **完了**

#### **実装完了機能**
- ✅ **基本ロギング機能**: 完全動作
- ✅ **ログ生成**: API、Component、Errorログが正常生成
- ✅ **ログローテーション**: ストレージサイズ制限対応
- ✅ **ログフィルタリング**: レベル・カテゴリ・検索・日付フィルタ
- ✅ **ターミナルログ**: 開発環境でのログ確認が可能

### Phase 4.1: テキストチャット ✅ **完了（2025年1月27日）**

#### **実装完了機能**
- ✅ **チャット画面**: Web版を参考にしたモバイル版UI
- ✅ **ユーザープロフィール**: アバター、メール表示、ログアウト機能
- ✅ **チャット履歴**: メッセージ表示、タイムスタンプ、スクロール
- ✅ **テキスト入力**: メッセージ入力・送信、文字数制限
- ✅ **API連携**: Morizo Web APIとの認証付き通信
- ✅ **メッセージ管理**: ユーザー・AIメッセージの表示・管理
- ✅ **エラーハンドリング**: 適切なエラー処理・表示
- ✅ **ログ機能**: チャット操作のログ記録

### Phase 4.2: 音声チャット ✅ **完了（2025年1月27日）**

#### **実装完了機能**
- ✅ **音声録音**: Expo AVによる高品質音声録音
- ✅ **録音権限管理**: 自動的な録音権限リクエスト
- ✅ **Whisper API連携**: 音声→テキスト変換機能
- ✅ **音声認識**: NEXT版Morizoの`/api/whisper`エンドポイント使用
- ✅ **リトライ機能**: 最大3回の自動リトライ機能
- ✅ **タイムアウト制御**: React Native対応の30秒タイムアウト
- ✅ **UI/UX改善**: 録音状態の視覚的フィードバック
- ✅ **連続処理対応**: 複数回の音声チャットが安定動作
- ✅ **エラーハンドリング**: 適切なエラー処理・フォールバック機能

#### **実装ファイル**
- `screens/ChatScreen.tsx` - メインチャット画面（音声録音・Whisper API連携含む）
- `App.tsx` - チャット画面への遷移設定
- `screens/MainScreen.tsx` - チャット画面への遷移ボタン
- `package.json` - Expo AVパッケージ追加

#### **テスト完了環境**
- ✅ **Webエミュレーター**: テキストチャット正常動作（音声録音は制限あり）
- ✅ **Android実機**: テキスト・音声チャット両方正常動作
- ⏳ **iOS実機**: 未テスト（将来テスト予定）

#### **APIエンドポイント**
- **テキストチャット**: `http://192.168.1.12:3000/api/chat`
- **音声認識**: `http://192.168.1.12:3000/api/whisper`

#### **開発環境でのログ確認**
```bash
# ターミナルでログを確認
npm start
# Expo Goでアプリを操作すると、ターミナルにログが出力される
```

#### **開発環境でのチャット確認**
```bash
# Webエミュレーターでテキストチャットをテスト
npx expo start --web

# Expo Go実機でテキスト・音声チャットをテスト
npx expo start --tunnel
```

### Phase 2: 在庫一覧表示機能 ✅ **完了（2025年1月27日）**

#### **実装完了機能**
- ✅ **在庫一覧表示**: フィルター・ソート機能付き
- ✅ **ドロワー型UI**: 履歴パネルと同様のUIパターン
- ✅ **フィルター機能**: 保管場所、検索（アイテム名）
- ✅ **ソート機能**: 登録日、アイテム名、数量、保管場所、消費期限（昇順/降順）
- ✅ **API連携**: Morizo Web APIとの認証付き通信
- ✅ **エラーハンドリング**: 適切なエラー処理・表示

#### **実装ファイル**
- `components/InventoryPanel.tsx` - 在庫一覧表示コンポーネント
- `api/inventory-api.ts` - 在庫一覧取得API関数
- `components/ChatInput.tsx` - 在庫ボタンを追加
- `screens/ChatScreen.tsx` - InventoryPanelコンポーネントを追加
- `hooks/useModalManagement.ts` - 在庫パネル管理を追加

### Phase 3: 在庫CRUD操作機能 ✅ **完了（2025年1月27日）**

#### **実装完了機能**
- ✅ **在庫追加**: モーダル型UIで新規在庫を追加
- ✅ **在庫編集**: モーダル型UIで在庫情報を編集
- ✅ **在庫削除**: 確認ダイアログ付きで在庫を削除
- ✅ **バリデーション**: 必須項目チェック、数量の正の値チェック
- ✅ **エラーハンドリング**: 適切なエラー処理・表示
- ✅ **UI改善**: 登録日表示を月/日形式に最適化

#### **実装ファイル**
- `components/InventoryEditModal.tsx` - 在庫追加・編集モーダル
- `api/inventory-api.ts` - CRUD操作API関数（add, update, delete）
- `components/InventoryPanel.tsx` - 編集・削除ボタン、新規追加ボタンを追加

#### **APIエンドポイント**
- **在庫一覧取得**: `http://192.168.1.12:3000/api/inventory/list`
- **在庫追加**: `http://192.168.1.12:3000/api/inventory/add`
- **在庫更新**: `http://192.168.1.12:3000/api/inventory/update/:id`
- **在庫削除**: `http://192.168.1.12:3000/api/inventory/delete/:id`

#### **音声チャットの技術仕様**
- **録音品質**: `Audio.RecordingOptionsPresets.HIGH_QUALITY`
- **音声形式**: M4A形式
- **タイムアウト**: 30秒（React Native対応）
- **リトライ**: 最大3回自動リトライ
- **音声認識**: OpenAI Whisper API経由

### Phase 4.3: Googleログイン ✅ **完了（2025年1月27日）**

#### **実装完了機能**
- ✅ **Google OAuth認証**: expo-auth-sessionを使用したモバイル対応実装
- ✅ **Deep Linking設定**: app.jsonにscheme設定を追加
- ✅ **プラットフォーム対応**: Web版とモバイル版で異なるOAuthフローを実装
- ✅ **セッション管理**: OAuth認証後のセッション自動設定
- ✅ **エラーハンドリング**: 適切なエラー処理・表示

#### **実装ファイル**
- `contexts/AuthContext.tsx` - Google認証関数（モバイル対応）
- `screens/LoginScreen.tsx` - GoogleログインボタンUI
- `app.json` - Deep linking設定（scheme: morizo-mobile）
- `package.json` - expo-auth-session, expo-web-browserパッケージ追加

#### **技術仕様**
- **OAuthフロー**: expo-auth-session + expo-web-browser
- **リダイレクトURL**: `morizo-mobile://auth/callback`
- **セッション管理**: Supabase自動セッション管理
- **プラットフォーム**: Web版は通常フロー、モバイル版はカスタムフロー

#### **Supabase設定要件**

**重要**: リダイレクトURLが`localhost:3000`になっている場合、以下の設定を確認してください。

1. **Supabase Dashboard** → **Authentication** → **URL Configuration**
   - **Site URL**: Web版のURL（例: `https://your-app.vercel.app`）を設定
   - **Redirect URLs**: 以下のURLを**必ず追加**してください：
     ```
     morizo-mobile://auth/callback
     exp://*.exp.direct
     exp://*.exp.direct/**
     ```
   - **注意**: 
     - `localhost:3000`がRedirect URLsに含まれている場合、**削除**してください
     - **Expo Goを使用している場合**、プロキシURL（`exp://*.exp.direct`）を追加する必要があります
     - ワイルドカード（`*`）を使用して、すべてのExpo GoプロキシURLに対応できます
     - または、モバイル用URLを**最初に**配置してください（優先順位の問題）
     - 設定を保存後、**数分待つ**必要があります（反映に時間がかかります）

2. **Google OAuth設定**: Web版と同じGoogle OAuth設定を使用
   - **注意**: Google Cloud Consoleで「Webアプリケーション」タイプのOAuth設定でも動作します
   - Android専用の設定は不要（ただし、将来的に追加しても問題ありません）

#### **トラブルシューティング**

**問題**: リダイレクト先が`localhost:3000`になる

**原因**: 
- Supabase DashboardのRedirect URLs設定が正しく反映されていない
- 生成されたリダイレクトURLがSupabaseに認識されていない

**デバッグ方法**:
1. ターミナルログで以下を確認：
   - `OAuthリダイレクトURL生成` - 生成されたURL（`morizo-mobile://auth/callback`であるべき）
   - `OAuth URL生成成功` - Supabaseが生成したOAuth URLに`redirect_to`パラメータが含まれているか確認
   - `matches: true`になっているか確認

2. **Supabase Dashboardでの確認**:
   - **Authentication** → **URL Configuration** → **Redirect URLs**
   - `morizo-mobile://auth/callback`が**確実に**追加されているか確認
   - `localhost:3000`が含まれている場合は削除

3. **解決策**:
   - Supabase Dashboardで設定を保存
   - **5-10分待つ**（設定反映に時間がかかる場合があります）
   - アプリを**完全に再起動**して再度試す
   - それでも解決しない場合は、Supabaseのサポートに問い合わせ

#### **使用方法**
```bash
# パッケージをインストール
npm install

# 開発サーバーを起動
npx expo start --tunnel

# ログイン画面で「Googleでログイン」ボタンをタップ
# ブラウザが開き、Google認証画面が表示される
# 認証完了後、自動的にアプリに戻りログイン完了
```

## 既知の問題

### iOS実機でのローカルLAN接続問題

**問題**: iOS実機（Expo Go）からローカル開発サーバー（`http://192.168.1.12:3000`）への接続が失敗する

**症状**: 
- Android実機では正常に動作
- iOS実機では「Network request failed」エラーが発生
- 基本的なHTTP接続テストも失敗

**原因**: 
- iOS App Transport Security (ATS) の制限
- Expo Goアプリの制限
- ネットワーク設定の問題
- 原因は特定できていない

**回避策**:
- Android実機での開発・テスト
- Web版での開発・テスト
- 開発ビルド（Development Build）の使用
- HTTPSサーバーの使用（要設定）

**影響範囲**:
- 開発環境でのAPI呼び出しのみ
- 本番環境への影響なし

### iOS実機でのログビューアー表示問題

**問題**: iOS実機でログビューアーが0件表示される

**症状**: 
- Android実機では正常にログが表示される
- iOS実機ではログビューアーが0件表示
- ターミナルログは正常に出力される

**原因**: 
- iOSでのメモリ管理の違い
- ログストレージ機能の互換性問題
- AsyncStorageの動作の違い

**回避策**:
- ターミナルログでの開発継続
- Android実機でのログビューアー確認
- 将来的な問題解決（商用化時）

**影響範囲**:
- 開発環境でのログビューアー表示のみ
- ログ生成機能には影響なし