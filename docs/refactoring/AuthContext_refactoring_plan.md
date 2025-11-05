# AuthContext.tsx リファクタリングプラン

## 現状分析

### ファイルサイズ
- **総行数**: 1,098行
- **問題点**: 単一ファイルに複数の責任が混在

### 現在の責任領域

1. **セッション管理** (約150行)
   - セッション有効性チェック
   - セッションクリア処理
   - ストレージ管理（AsyncStorage/localStorage）

2. **認証メソッド** (約200行)
   - `signIn`: メール/パスワード認証
   - `signUp`: 新規登録
   - `signOut`: ログアウト

3. **Google認証** (約550行)
   - `signInWithGoogle`: 複雑なOAuthフロー
   - プラットフォーム対応（Web/モバイル）
   - セッション検出ポーリング
   - ブラウザ認証セッション管理

4. **Deep Linking処理** (約130行)
   - OAuth認証後のリダイレクトURL処理
   - URLからトークン抽出

5. **認証状態監視** (約100行)
   - `onAuthStateChange`イベントハンドリング
   - 認証イベントの処理

6. **トークン抽出** (約60行)
   - URLからアクセストークン/リフレッシュトークン抽出
   - 複数のフォーマット対応

7. **コンテキスト管理** (約30行)
   - React Context定義
   - プロバイダーコンポーネント

## 分割戦略

### 原則
1. **単一責任の原則**: 各モジュールは1つの明確な責任を持つ
2. **段階的リファクタリング**: 既存APIを維持しながら段階的に分割
3. **デグレード防止**: 既存の使用箇所に影響を与えない
4. **テスト容易性**: 各モジュールを独立してテスト可能に

### 分割後の構造

```
lib/auth/
├── types.ts                    # 型定義（新規）
├── session-manager.ts          # セッション管理（新規）
├── auth-methods.ts             # 基本認証メソッド（新規）
├── google-auth.ts              # Google認証（新規）
├── deep-linking-handler.ts     # Deep Linking処理（新規）
├── token-extractor.ts          # トークン抽出（新規）
├── auth-state-listener.ts      # 認証状態監視（新規）
└── index.ts                    # エクスポート集約（新規）

contexts/
└── AuthContext.tsx             # コンテキスト定義（大幅縮小）
```

## 詳細分割プラン

### Phase 1: 型定義とセッション管理の分離

#### 1.1 `lib/auth/types.ts` (新規作成)
**責任**: 認証関連の型定義を集約

**内容**:
- `AuthContextType`インターフェース
- `AuthProviderProps`インターフェース
- その他の認証関連型定義

**影響範囲**: なし（新規ファイル）

#### 1.2 `lib/auth/session-manager.ts` (新規作成)
**責任**: セッションの有効性チェック、クリア、ストレージ管理

**抽出する関数**:
- `isSessionValid(session: Session | null): boolean`
- `clearInvalidSession(): Promise<void>`
- `clearSession(): Promise<void>`

**依存関係**:
- `lib/supabase.ts`
- `lib/logging`
- `@react-native-async-storage/async-storage`
- `react-native` (Platform)

**エクスポート**:
```typescript
export {
  isSessionValid,
  clearInvalidSession,
  clearSession,
};
```

### Phase 2: 基本認証メソッドの分離

#### 2.1 `lib/auth/auth-methods.ts` (新規作成)
**責任**: メール/パスワード認証とサインアウト

**抽出する関数**:
- `signIn(email: string, password: string): Promise<{ error: any }>`
- `signUp(email: string, password: string): Promise<{ error: any }>`
- `signOut(): Promise<void>`

**依存関係**:
- `lib/supabase.ts`
- `lib/logging`
- `@react-native-async-storage/async-storage`

**エクスポート**:
```typescript
export {
  signIn,
  signUp,
  signOut,
};
```

**注意点**:
- これらの関数は状態更新（setSession, setUser）を行わない
- 状態更新は呼び出し元（AuthContext）で行う

### Phase 3: トークン抽出ロジックの分離

#### 3.1 `lib/auth/token-extractor.ts` (新規作成)
**責任**: URLからトークンを抽出する処理

**抽出する関数**:
- `extractTokensFromUrl(url: string): { accessToken: string | null; refreshToken: string | null }`
- `extractTokensAndSetSession(url: string, source: string): Promise<{ success: boolean; session?: Session; error?: string }>`

**依存関係**:
- `lib/supabase.ts`
- `lib/logging`

**エクスポート**:
```typescript
export {
  extractTokensFromUrl,
  extractTokensAndSetSession,
};
```

### Phase 4: Deep Linking処理の分離

#### 4.1 `lib/auth/deep-linking-handler.ts` (新規作成)
**責任**: OAuth認証後のDeep Linking処理

**抽出する内容**:
- `handleAuthCallback`関数
- Deep Linkingの初期化と監視ロジック
- `useEffect`フックとして実装

**依存関係**:
- `lib/auth/token-extractor.ts`
- `lib/auth/session-manager.ts`
- `expo-linking`
- `lib/logging`

**エクスポート**:
```typescript
export {
  useDeepLinkingHandler,
};
```

**注意点**:
- カスタムフックとして実装し、AuthContextで使用
- `isSessionValid`関数へのアクセスが必要

### Phase 5: 認証状態監視の分離

#### 5.1 `lib/auth/auth-state-listener.ts` (新規作成)
**責任**: `onAuthStateChange`イベントの処理

**抽出する内容**:
- 認証状態変更のハンドリングロジック
- `useEffect`フックとして実装

**依存関係**:
- `lib/auth/session-manager.ts`
- `lib/supabase.ts`
- `lib/logging`

**エクスポート**:
```typescript
export {
  useAuthStateListener,
};
```

**注意点**:
- カスタムフックとして実装
- 状態更新関数（setSession, setUser）を引数で受け取る

### Phase 6: Google認証の分離

#### 6.1 `lib/auth/google-auth.ts` (新規作成)
**責任**: Google OAuth認証の複雑な処理

**抽出する関数**:
- `signInWithGoogle(): Promise<{ error: any }>`

**依存関係**:
- `lib/auth/session-manager.ts`
- `lib/auth/token-extractor.ts`
- `expo-auth-session`
- `expo-web-browser`
- `lib/supabase.ts`
- `lib/logging`
- `react-native` (Platform)

**エクスポート**:
```typescript
export {
  signInWithGoogle,
};
```

**注意点**:
- 最も複雑な処理（約550行）
- 状態更新は行わず、戻り値で結果を返す
- 状態更新は呼び出し元で行う

### Phase 7: コンテキストの整理

#### 7.1 `contexts/AuthContext.tsx` (大幅縮小)
**責任**: React Context定義とプロバイダーコンポーネント

**残す内容**:
- Context定義
- プロバイダーコンポーネント
- 状態管理（useState）
- 各モジュールの統合

**削減後の想定行数**: 約200-250行

**統合ロジック**:
```typescript
// 各モジュールをインポート
import { isSessionValid, clearInvalidSession, clearSession } from '../lib/auth/session-manager';
import { signIn, signUp, signOut } from '../lib/auth/auth-methods';
import { signInWithGoogle } from '../lib/auth/google-auth';
import { useDeepLinkingHandler } from '../lib/auth/deep-linking-handler';
import { useAuthStateListener } from '../lib/auth/auth-state-listener';

// プロバイダー内で統合
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // 状態管理
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  // 各モジュールを使用
  useAuthStateListener({ setSession, setUser, setLoading, isSessionValid, clearInvalidSession });
  useDeepLinkingHandler({ isSessionValid });
  
  // 認証メソッドをラップ（状態更新を追加）
  const handleSignIn = async (email: string, password: string) => {
    const result = await signIn(email, password);
    // 状態更新はonAuthStateChangeで自動的に行われる
    return result;
  };
  
  // ... 他のメソッドも同様
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
```

## 実装手順（段階的アプローチ）

### ステップ1: 準備
1. `lib/auth/`ディレクトリを作成
2. 既存の`AuthContext.tsx`をバックアップ（念のため）

### ステップ2: 型定義の分離（Phase 1.1）
1. `lib/auth/types.ts`を作成
2. 型定義を移動
3. `AuthContext.tsx`でインポートして使用
4. **動作確認**: 既存機能が正常に動作することを確認

### ステップ3: セッション管理の分離（Phase 1.2）
1. `lib/auth/session-manager.ts`を作成
2. セッション関連関数を移動
3. `AuthContext.tsx`でインポートして使用
4. **動作確認**: 既存機能が正常に動作することを確認

### ステップ4: 基本認証メソッドの分離（Phase 2）
1. `lib/auth/auth-methods.ts`を作成
2. `signIn`, `signUp`, `signOut`を移動
3. 状態更新ロジックを`AuthContext.tsx`に残す
4. `AuthContext.tsx`でインポートして使用
5. **動作確認**: 既存機能が正常に動作することを確認

### ステップ5: トークン抽出の分離（Phase 3）
1. `lib/auth/token-extractor.ts`を作成
2. トークン抽出関数を移動
3. `AuthContext.tsx`でインポートして使用
4. **動作確認**: 既存機能が正常に動作することを確認

### ステップ6: Deep Linking処理の分離（Phase 4）
1. `lib/auth/deep-linking-handler.ts`を作成
2. Deep Linking処理をカスタムフックとして実装
3. `AuthContext.tsx`で使用
4. **動作確認**: Deep Linkingが正常に動作することを確認

### ステップ7: 認証状態監視の分離（Phase 5）
1. `lib/auth/auth-state-listener.ts`を作成
2. 認証状態監視をカスタムフックとして実装
3. `AuthContext.tsx`で使用
4. **動作確認**: 認証状態変更が正常に処理されることを確認

### ステップ8: Google認証の分離（Phase 6）
1. `lib/auth/google-auth.ts`を作成
2. `signInWithGoogle`関数を移動
3. 状態更新ロジックを`AuthContext.tsx`に残す
4. `AuthContext.tsx`でインポートして使用
5. **動作確認**: Google認証が正常に動作することを確認

### ステップ9: エクスポートの整理（Phase 7）
1. `lib/auth/index.ts`を作成
2. すべてのモジュールを再エクスポート
3. `AuthContext.tsx`を整理
4. **最終動作確認**: すべての機能が正常に動作することを確認

### ステップ10: クリーンアップ
1. 未使用のインポートを削除
2. コメントを整理
3. コードフォーマット
4. **最終テスト**: 全機能の動作確認

## デグレード防止策

### 1. 段階的実装
- 一度にすべてを変更せず、1つのモジュールずつ分割
- 各ステップで動作確認を実施

### 2. API互換性の維持
- `AuthContextType`インターフェースは変更しない
- `useAuth`フックの戻り値は変更しない
- 既存の使用箇所に影響を与えない

### 3. テスト戦略
- 各ステップ後に以下をテスト:
  - ログイン（メール/パスワード）
  - 新規登録
  - Google認証（Web版）
  - Google認証（モバイル版）
  - ログアウト
  - セッション復元
  - Deep Linking処理

### 4. ロールバック計画
- 各ステップでGitコミット
- 問題発生時は即座にロールバック可能に

## 期待される効果

### コード品質
- **可読性向上**: 各ファイルが明確な責任を持つ
- **保守性向上**: 変更箇所が特定しやすい
- **テスト容易性**: 各モジュールを独立してテスト可能

### ファイルサイズ
- `AuthContext.tsx`: 1,098行 → 約200-250行（約77%削減）
- 各モジュール: 100-200行程度（管理しやすいサイズ）

### 開発効率
- バグ修正や機能追加が容易
- 新規開発者の理解が容易
- コードレビューが容易

## リスクと対策

### リスク1: 状態管理の複雑さ
**対策**: 状態更新は`AuthContext.tsx`に集約し、各モジュールは純粋関数またはカスタムフックとして実装

### リスク2: 循環依存
**対策**: 依存関係を明確に定義し、`lib/auth/index.ts`で適切にエクスポート

### リスク3: 既存機能の破壊
**対策**: 段階的実装と各ステップでの動作確認

### リスク4: Google認証の複雑さ
**対策**: Google認証は最後に分割し、十分なテストを実施

## 次のステップ

1. このプランの承認を得る
2. ステップ1から順次実装
3. 各ステップで動作確認
4. 完了後にドキュメント更新

---

**作成日**: 2025年1月27日  
**対象ファイル**: `contexts/AuthContext.tsx` (1,098行)  
**目標**: 責任の分離による保守性向上

