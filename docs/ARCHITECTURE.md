# Morizo Mobile - アーキテクチャ設計

## 全体アーキテクチャ

### **現在のアーキテクチャ（Expo React Native）**
```
Morizo Mobile Application
├── Frontend (Expo React Native)
│   ├── App.tsx (メインアプリケーション)
│   ├── Screens
│   │   ├── LoginScreen.tsx (ログイン画面)
│   │   └── MainScreen.tsx (メイン画面)
│   ├── Components
│   │   └── SplashScreen.tsx (スプラッシュ画面)
│   ├── Contexts
│   │   └── AuthContext.tsx (認証状態管理)
│   ├── Lib
│   │   └── supabase.ts (Supabaseクライアント)
│   ├── Utils
│   │   └── alert.ts (アラートユーティリティ)
│   └── API
│       └── test/ (APIテスト用)
├── External Services
│   ├── Morizo Web API (Next.js - localhost:3000)
│   ├── Supabase (認証・データベース)
│   └── Expo Go (開発環境)
└── Platform Support
    ├── iOS (Expo Go)
    ├── Android (Expo Go)
    └── Web (React Native Web)
```

## データフロー

### **1. 認証フロー**
```
ユーザー → LoginScreen → AuthContext → Supabase Auth → MainScreen
```

### **2. API呼び出しフロー**
```
MainScreen → Supabase認証トークン → Morizo Web API → レスポンス表示
```

### **3. セッション管理フロー**
```
AuthContext → AsyncStorage (モバイル) / localStorage (Web) → セッション永続化
```

## コンポーネント設計

### **アプリケーションコンポーネント**
- **App.tsx**: メインアプリケーション（認証状態に基づく画面切り替え）

### **画面コンポーネント**
- **LoginScreen.tsx**: ログイン・サインアップ画面
- **MainScreen.tsx**: メイン画面（API呼び出し・ユーザー情報表示）

### **機能コンポーネント**
- **SplashScreen.tsx**: スプラッシュ画面
- **AuthContext.tsx**: 認証状態のグローバル管理

### **ユーティリティ**
- **supabase.ts**: Supabaseクライアント設定
- **alert.ts**: アラート表示ユーティリティ

## API設計

### **外部API連携**
- **Morizo Web API**: http://localhost:3000/api/test (開発環境)
- **Supabase**: 認証・データベース操作

### **API認証フロー**
```
モバイルアプリ → Supabase認証トークン → Morizo Web API (Bearer Token) → レスポンス
```

## 認証システム

### **Supabase認証**
- メール/パスワード認証
- Google OAuth認証
- JWT トークンベース認証

### **認証フロー**
1. ユーザーがLoginScreenでログイン
2. Supabaseが認証処理
3. AuthContextが認証状態を管理
4. App.tsxが画面アクセスを制御
5. API呼び出し時にJWTトークンを付与

### **セッション管理**
- **モバイル**: AsyncStorageを使用したセッション永続化
- **Web**: localStorageを使用したセッション永続化
- **自動更新**: トークンの自動リフレッシュ機能

## 状態管理

### **認証状態**
- AuthContextによるグローバル状態管理
- セッション永続化
- 認証状態のリアルタイム更新

### **アプリケーション状態**
- ローカル状態（useState）でUI状態管理
- ローディング状態の管理
- エラー状態の管理

## プラットフォーム対応

### **Expo React Native**
- iOS・Android・Web対応
- Expo Goによる開発環境
- プラットフォーム固有の機能対応

### **プラットフォーム固有の処理**
- **ストレージ**: AsyncStorage (モバイル) / localStorage (Web)
- **API URL**: プラットフォームに応じたURL設定
- **UI**: プラットフォーム固有のスタイリング

## セキュリティ

### **認証・認可**
- Supabase Row Level Security (RLS)
- JWT トークンベース認証
- API認証の二重チェック

### **データ保護**
- 環境変数による機密情報管理
- HTTPS通信
- セッション管理の適切な実装

## パフォーマンス

### **最適化**
- Expo React Native
- プラットフォーム固有の最適化
- メモリ効率の良い状態管理

### **バンドル最適化**
- Expoの自動最適化
- プラットフォーム固有のコード分割
- 動的インポート

## 拡張性

### **モジュラー設計**
- コンポーネント分離
- 画面分離
- ユーティリティ関数分離

### **将来の拡張**
- ネイティブ機能連携
- プッシュ通知
- オフライン機能
- リアルタイム機能

## 開発・デプロイ

### **開発環境**
- Expo CLI
- Expo Go
- TypeScript型チェック
- Hot Reload

### **本番環境**
- Expo Application Services (EAS)
- App Store / Google Play Store
- 環境変数管理
- パフォーマンス監視

## 技術スタック

### **フロントエンド**
- **Expo**: モバイルアプリ開発フレームワーク
- **React Native**: クロスプラットフォーム開発
- **TypeScript**: 型安全な開発

### **バックエンド連携**
- **Supabase**: 認証・データベース
- **Morizo Web API**: Next.js API

### **開発ツール**
- **Expo CLI**: 開発・ビルドツール
- **Expo Go**: 開発環境
- **AsyncStorage**: ローカルストレージ

## アーキテクチャの特徴

### **1. 認証中心設計**
- Supabase認証を中心とした設計
- セッション管理の堅牢性
- プラットフォーム対応の認証

### **2. API連携設計**
- Morizo Web APIとの連携
- 認証付きAPI呼び出し
- エラーハンドリング

### **3. プラットフォーム対応**
- iOS・Android・Web対応
- プラットフォーム固有の最適化
- 統一されたユーザー体験

### **4. 拡張性重視**
- モジュラー設計
- 将来の機能追加に対応
- 保守性の高い構造

---

**最終更新**: 2025年1月27日  
**バージョン**: 1.0  
**作成者**: Morizo Mobile開発チーム
