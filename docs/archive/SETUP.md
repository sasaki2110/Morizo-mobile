# Morizo Mobile - セットアップ手順

## 前提条件

### **必要なソフトウェア**
- Node.js 18.0.0以上
- npm または yarn
- Git
- Expo CLI
- テキストエディタ（VS Code推奨）

### **必要なアカウント**
- Supabaseアカウント
- Expoアカウント（開発用）
- Googleアカウント（OAuth認証用）

### **開発環境**
- **iOS**: macOS + Xcode（iOS実機テスト用）
- **Android**: Android Studio（Android実機テスト用）
- **Web**: 任意のブラウザ

## 1. プロジェクトのクローン

```bash
# リポジトリをクローン
git clone <repository-url>
cd Morizo-mobile

# 依存関係をインストール
npm install
```

## 2. 環境変数の設定

### **環境変数ファイルの作成**
```bash
# .envファイルを作成
cp env.example .env
```

### **必要な環境変数**
```bash
# Supabase設定
EXPO_PUBLIC_SUPABASE_URL=your-supabase-project-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# 開発環境設定
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_WEB_API_URL=http://192.168.1.12:3000
```

### **環境変数の取得方法**

#### **Supabase設定**
1. [Supabase](https://supabase.com)にログイン
2. プロジェクトを作成または選択
3. Settings → API から以下を取得：
   - Project URL → `EXPO_PUBLIC_SUPABASE_URL`
   - anon public key → `EXPO_PUBLIC_SUPABASE_ANON_KEY`

#### **Google OAuth設定**
1. [Google Cloud Console](https://console.cloud.google.com)にログイン
2. プロジェクトを作成または選択
3. APIs & Services → Credentials からOAuth 2.0クライアントIDを作成
4. Supabase Dashboard → Authentication → Providers → Google で設定

## 3. Supabaseデータベース設定

### **テーブル作成**
```sql
-- 在庫管理テーブル
CREATE TABLE inventory (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit TEXT NOT NULL DEFAULT '個',
  storage_location TEXT NOT NULL DEFAULT '冷蔵庫',
  purchase_date DATE,
  expiry_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Row Level Security設定
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のデータのみアクセス可能
CREATE POLICY "Users can view own inventory" ON inventory
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own inventory" ON inventory
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own inventory" ON inventory
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own inventory" ON inventory
  FOR DELETE USING (auth.uid() = user_id);
```

### **認証設定**
1. Supabase Dashboard → Authentication → Settings
2. Site URL: `exp://192.168.1.12:8081` (開発環境)
3. Redirect URLs: `exp://192.168.1.12:8081/**`
4. Google認証を有効にする場合：
   - Google OAuth設定を追加
   - Client IDとClient Secretを設定

## 4. 開発サーバーの起動

### **Expo開発サーバー**
```bash
# 開発サーバーを起動
npm start

# または特定のプラットフォームで起動
npm run android
npm run ios
npm run web
```

### **Morizo Web APIサーバー（別ターミナル）**
```bash
# Morizo Webディレクトリに移動
cd ../Morizo-web

# 依存関係をインストール
npm install

# 開発サーバーを起動
npm run dev
```

## 5. 動作確認

### **1. 認証テスト**
1. Expo GoアプリでQRコードをスキャン
2. 「アカウント作成」でユーザー登録
3. メール認証を完了
4. ログインしてメイン画面が表示されることを確認

### **2. API接続テスト**
1. ログイン後、「API確認」ボタンをクリック
2. 成功レスポンスが表示されることを確認

### **3. Google認証テスト**
1. 「Googleでログイン」ボタンをクリック
2. Google認証画面が表示されることを確認
3. 認証完了後、メイン画面に遷移することを確認

## 6. トラブルシューティング

### **よくある問題と解決方法**

#### **認証エラー**
```bash
# エラー: 認証に失敗しました
# 解決方法:
1. Supabaseの環境変数が正しく設定されているか確認
2. Supabaseプロジェクトがアクティブか確認
3. ネットワーク接続を確認
4. Expo Goアプリを再起動
```

#### **API接続エラー**
```bash
# エラー: Morizo Web APIとの通信に失敗しました
# 解決方法:
1. Morizo Web APIサーバーが起動しているか確認 (http://localhost:3000)
2. ネットワーク設定を確認
3. ファイアウォール設定を確認
4. API URLが正しく設定されているか確認
```

#### **Expo Go接続エラー**
```bash
# エラー: Expo Goでアプリが起動しない
# 解決方法:
1. Expo Goアプリを最新版に更新
2. ネットワーク接続を確認
3. QRコードを再スキャン
4. 開発サーバーを再起動
```

#### **環境変数エラー**
```bash
# エラー: 環境変数が見つかりません
# 解決方法:
1. .envファイルが存在するか確認
2. 環境変数名が正しいか確認
3. 開発サーバーを再起動
4. Expo CLIを再起動
```

### **ログの確認**
```bash
# Expo開発サーバーのログ
npm start

# ブラウザの開発者ツール（Web版）
F12 → Console タブ

# Supabaseのログ
Supabase Dashboard → Logs
```

## 7. 本番環境へのデプロイ

### **Expo Application Services (EAS)**
```bash
# EAS CLIをインストール
npm install -g @expo/eas-cli

# EASにログイン
eas login

# ビルド設定
eas build:configure

# 本番ビルド
eas build --platform all

# アプリストアに提出
eas submit --platform all
```

### **環境変数の本番設定**
- EAS Dashboard → Project Settings → Environment Variables
- 本番用のSupabase URLとキーを設定
- 本番用のAPI URLを設定

### **Supabase本番設定**
- Site URL: `https://your-app-domain.com`
- Redirect URLs: `https://your-app-domain.com/**`

## 8. 開発時のベストプラクティス

### **コード品質**
```bash
# TypeScript型チェック
npx tsc --noEmit

# ESLintチェック
npx eslint .

# Prettierフォーマット
npx prettier --write .
```

### **Git管理**
```bash
# .gitignoreに追加すべきファイル
.env
.env.local
.env.production
node_modules/
.expo/
dist/
```

### **セキュリティ**
- 環境変数は絶対にコミットしない
- APIキーは定期的にローテーション
- SupabaseのRLS設定を適切に行う

## 9. 追加設定

### **PWA対応**
```bash
# PWAプラグインをインストール
npm install expo-pwa

# app.jsonに設定を追加
{
  "expo": {
    "web": {
      "bundler": "metro"
    }
  }
}
```

### **プッシュ通知**
```bash
# プッシュ通知プラグインをインストール
npm install expo-notifications

# 設定を追加
expo install expo-device expo-constants
```

### **カメラ機能**
```bash
# カメラプラグインをインストール
npm install expo-camera

# 権限設定
expo install expo-camera expo-media-library
```

## 10. 開発環境の最適化

### **パフォーマンス**
- 不要な依存関係の削除
- バンドルサイズの最適化
- メモリ使用量の監視

### **デバッグ**
- React Native Debuggerの使用
- Flipperの使用
- ログレベルの設定

### **テスト**
- Jestテストの設定
- E2Eテストの設定
- ユニットテストの実装

---

**最終更新**: 2025年1月27日  
**バージョン**: 1.0  
**作成者**: Morizo Mobile開発チーム
