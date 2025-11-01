# Morizo Mobile - コンポーネント設計

## 概要

Morizo Mobileアプリケーションのコンポーネント設計と実装について記載。

## コンポーネント階層

### **アプリケーション階層**
```
App.tsx
├── AuthProvider (AuthContext)
│   ├── AppContent
│   │   ├── CustomSplashScreen (初期表示)
│   │   ├── LoginScreen (未認証時)
│   │   └── MainScreen (認証済み時)
│   └── AuthContext.Provider
```

## 画面コンポーネント

### **LoginScreen.tsx**
**目的**: ユーザー認証（ログイン・サインアップ・Google認証）

**主要機能**:
- メール/パスワード認証
- Google OAuth認証
- ログイン・サインアップ切り替え
- エラーハンドリング
- ローディング状態管理

**Props**:
```typescript
// 外部から受け取るPropsなし（useAuthフックを使用）
```

**State**:
```typescript
const [email, setEmail] = useState('');
const [password, setPassword] = useState('');
const [isSignUp, setIsSignUp] = useState(false);
const [loading, setLoading] = useState(false);
```

**主要メソッド**:
- `handleAuth()`: メール/パスワード認証
- `handleGoogleSignIn()`: Google認証
- `setIsSignUp()`: ログイン/サインアップ切り替え

**スタイリング**:
- KeyboardAvoidingView: キーボード対応
- ScrollView: スクロール対応
- レスポンシブデザイン
- プラットフォーム固有のスタイリング

### **MainScreen.tsx**
**目的**: 認証済みユーザーのメイン画面

**主要機能**:
- ユーザー情報表示
- API呼び出しテスト
- ログアウト機能
- 認証状態確認

**Props**:
```typescript
// 外部から受け取るPropsなし（useAuthフックを使用）
```

**State**:
```typescript
const [isLoading, setIsLoading] = useState(false);
const [apiResponse, setApiResponse] = useState<string>('');
```

**主要メソッド**:
- `getApiUrl()`: プラットフォームに応じたAPI URL取得
- `callAPI()`: Morizo Web API呼び出し
- `handleSignOut()`: ログアウト処理

**スタイリング**:
- 中央配置レイアウト
- レスポンシブデザイン
- プラットフォーム固有のスタイリング

## 機能コンポーネント

### **SplashScreen.tsx**
**目的**: アプリ起動時のスプラッシュ画面

**主要機能**:
- アプリ起動時の表示
- 認証状態確認中の表示
- スムーズな画面遷移

**Props**:
```typescript
interface SplashScreenProps {
  onFinish: () => void;
}
```

**State**:
```typescript
// 内部状態管理なし（外部から制御）
```

**主要メソッド**:
- `onFinish()`: スプラッシュ画面終了コールバック

**スタイリング**:
- 全画面表示
- ブランドカラー使用
- アニメーション効果

## コンテキストコンポーネント

### **AuthContext.tsx**
**目的**: 認証状態のグローバル管理

**主要機能**:
- 認証状態の管理
- セッション管理
- 認証メソッドの提供
- プラットフォーム対応のストレージ管理

**Context Type**:
```typescript
interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  initialized: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  clearSession: () => void;
}
```

**State**:
```typescript
const [session, setSession] = useState<Session | null>(null);
const [user, setUser] = useState<User | null>(null);
const [loading, setLoading] = useState(true);
const [initialized, setInitialized] = useState(false);
```

**主要メソッド**:
- `isSessionValid()`: セッション有効性チェック
- `clearInvalidSession()`: 無効セッションクリア
- `getInitialSession()`: 初期セッション取得
- `signIn()`: サインイン
- `signUp()`: サインアップ
- `signInWithGoogle()`: Google認証
- `signOut()`: サインアウト

**プラットフォーム対応**:
- **Web**: localStorage使用
- **Mobile**: AsyncStorage使用
- 自動的なプラットフォーム検出

## ユーティリティコンポーネント

### **supabase.ts**
**目的**: Supabaseクライアントの設定と管理

**主要機能**:
- Supabaseクライアント作成
- プラットフォーム対応のストレージ設定
- 環境変数管理
- セッション管理設定

**設定**:
```typescript
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    storage: Platform.OS === 'web' ? webStorage : mobileStorage,
  },
});
```

**プラットフォーム対応**:
- **Web**: localStorage使用
- **Mobile**: AsyncStorage使用
- 期限切れトークンの自動削除

### **alert.ts**
**目的**: アラート表示の統一

**主要機能**:
- エラーアラート表示
- 成功アラート表示
- プラットフォーム対応のアラート

**主要メソッド**:
- `showErrorAlert()`: エラーアラート表示
- `showSuccessAlert()`: 成功アラート表示

## スタイリング設計

### **デザインシステム**
- **カラーパレット**: ブランドカラー中心
- **タイポグラフィ**: システムフォント使用
- **スペーシング**: 8px基準のグリッド
- **ボーダー**: 8px角丸統一

### **レスポンシブデザイン**
- 画面サイズに応じたレイアウト調整
- プラットフォーム固有のスタイリング
- キーボード対応

### **アクセシビリティ**
- スクリーンリーダー対応
- カラーコントラスト配慮
- タッチターゲットサイズ最適化

## コンポーネント設計原則

### **1. 単一責任の原則**
- 各コンポーネントは一つの責任を持つ
- 機能の分離と明確化

### **2. 再利用性**
- 汎用的なコンポーネントの作成
- Propsによる柔軟な設定

### **3. 保守性**
- 明確な命名規則
- 適切なコメント
- 型安全性の確保

### **4. パフォーマンス**
- 不要な再レンダリングの回避
- メモ化の適切な使用
- 効率的な状態管理

## 将来の拡張予定

### **チャット機能**
- `ChatScreen.tsx`: チャット画面
- `MessageBubble.tsx`: メッセージ表示
- `MessageInput.tsx`: メッセージ入力

### **在庫管理機能**
- `InventoryScreen.tsx`: 在庫一覧画面
- `InventoryItem.tsx`: 在庫アイテム表示
- `InventoryForm.tsx`: 在庫追加・編集フォーム

### **レシピ機能**
- `RecipeScreen.tsx`: レシピ一覧画面
- `RecipeCard.tsx`: レシピカード表示
- `RecipeDetail.tsx`: レシピ詳細画面

### **共通コンポーネント**
- `Button.tsx`: 統一されたボタン
- `Input.tsx`: 統一された入力フィールド
- `Card.tsx`: 統一されたカード
- `Loading.tsx`: 統一されたローディング

## テスト戦略

### **ユニットテスト**
- 各コンポーネントの個別テスト
- PropsとStateのテスト
- メソッドのテスト

### **統合テスト**
- コンポーネント間の連携テスト
- 認証フローのテスト
- API連携のテスト

### **E2Eテスト**
- ユーザーフローのテスト
- プラットフォーム固有のテスト
- パフォーマンステスト

## パフォーマンス最適化

### **レンダリング最適化**
- React.memoの使用
- useMemoの適切な使用
- useCallbackの適切な使用

### **バンドル最適化**
- 動的インポート
- コード分割
- 不要な依存関係の削除

### **メモリ最適化**
- 適切なクリーンアップ
- メモリリークの防止
- 効率的な状態管理

---

**最終更新**: 2025年1月27日  
**バージョン**: 1.0  
**作成者**: Morizo Mobile開発チーム
