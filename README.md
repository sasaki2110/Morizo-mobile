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

#### **音声チャットの技術仕様**
- **録音品質**: `Audio.RecordingOptionsPresets.HIGH_QUALITY`
- **音声形式**: M4A形式
- **タイムアウト**: 30秒（React Native対応）
- **リトライ**: 最大3回自動リトライ
- **音声認識**: OpenAI Whisper API経由

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