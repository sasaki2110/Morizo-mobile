# ChatScreen リファクタリングプラン

**作成日**: 2025年1月23日  
**対象ファイル**: `screens/ChatScreen.tsx` (652行)  
**目的**: 責任の分離原則に従った安全なリファクタリングの実施

---

## 0. スコープ

### 0.1 リファクタリング対象

このリファクタリングプランは、**モバイル版（morizo-mobile）のみ**を対象としています。

- **対象リポジトリ**: `morizo-mobile` のみ
- **対象ファイル**: `screens/ChatScreen.tsx` および関連するモバイル版のファイル
- **Web版（morizo-web）への影響**: **なし**

### 0.2 プロジェクト構造

```
morizo/
├── morizo-web/          # Next.js 15 Webアプリ（別リポジトリ）
│   └── （このリファクタリングの対象外）
│
└── morizo-mobile/       # Expo モバイルアプリ（このリファクタリングの対象）
    └── screens/
        └── ChatScreen.tsx  ← リファクタリング対象
```

### 0.3 独立性

- **モバイル版とWeb版は独立したリポジトリ**です
- **モバイル版はWeb版のAPIを呼び出すクライアント**として動作します
- **このリファクタリングはモバイル版の内部構造の改善**であり、Web版には影響しません

### 0.4 API連携への影響

- **APIエンドポイント**: 変更なし（`/api/chat`, `/api/whisper` など）
- **APIリクエスト/レスポンス形式**: 変更なし
- **認証方式**: 変更なし（Supabase認証トークンの使用）

---

## 1. 現状把握

### 1.1 ファイル概要

- **総行数**: 652行
- **コンポーネント**: 1つの大きな画面コンポーネント
- **状態管理**: 8つのuseStateフック + 1つのuseRef
- **主要機能**: チャット画面の統合管理、音声録音、テキストチャット、モーダル管理

### 1.2 現在の責任領域

このコンポーネントは以下の複数の責任を持っています：

1. **認証チェックと初期化** (52-69行)
   - 認証状態の確認
   - コンポーネント初期化ログ
   - 未認証時の早期リターン

2. **カスタムフックの統合** (71-89行)
   - useModalManagement
   - useRecipeSelection
   - useChatMessages
   - useSSEHandling

3. **チャット履歴管理** (91-110行)
   - 履歴クリア処理
   - 確認ダイアログ

4. **音声録音機能** (112-448行) - **約336行**
   - 音声認識完了時の処理（handleVoiceTranscription）
   - 録音開始（startRecording）
   - 録音停止（stopRecording）
   - Whisper APIでの音声テキスト変換（transcribeAudio）
   - リトライ機能付きAPI呼び出し

5. **UIレイアウト** (450-575行)
   - プロフィールセクション
   - チャットメッセージリスト
   - テキスト入力欄
   - 音声録音セクション
   - 各種モーダル（レシピビューアー、レシピ一覧、履歴、在庫、プロフィール）

6. **スタイル定義** (578-652行)
   - 74行のスタイル定義

### 1.3 使用箇所

- `App.tsx` (63行): 認証済みユーザーのメイン画面として使用

### 1.4 既存のリファクタリング状況

既に以下のカスタムフックとコンポーネントに分割済み：
- ✅ `hooks/useModalManagement.ts` - モーダル管理
- ✅ `hooks/useRecipeSelection.ts` - レシピ選択管理
- ✅ `hooks/useChatMessages.ts` - チャットメッセージ管理
- ✅ `hooks/useSSEHandling.ts` - SSE処理
- ✅ `components/ChatInput.tsx` - テキスト入力
- ✅ `components/ChatMessageList.tsx` - メッセージリスト

---

## 2. 問題点の分析

### 2.1 単一責任原則（SRP）違反

現在のコンポーネントは以下の6つの異なる責任を持っており、明確にSRPに違反しています：

1. **認証チェックと初期化** - 別のレイヤーに分離可能
2. **音声録音機能** - カスタムフックに分離可能（約336行）
3. **UIレイアウト** - セクションごとにコンポーネント化可能
4. **チャット履歴管理** - 既存のuseChatMessagesに統合可能
5. **スタイル定義** - 別ファイルに分離可能
6. **統合管理** - これがChatScreenの本来の責任

### 2.2 テスタビリティの問題

- 音声録音機能がコンポーネント内に密結合
- 各機能を個別にテストすることが困難
- モック作成が複雑（特にAudio API）

### 2.3 再利用性の問題

- 音声録音機能を他のコンポーネントで再利用できない
- プロフィールセクションを他の場所で利用できない
- 音声セクションを他の場所で再利用できない

### 2.4 保守性の問題

- 652行のファイルは理解が困難
- 音声録音機能の変更時に影響範囲が広い
- バグ修正時のリスクが高い

### 2.5 可読性の問題

- ファイルが長すぎて全体像の把握が困難
- 音声録音機能が約336行と非常に長い
- 責任が混在しており、コードの流れが追いにくい

---

## 3. リファクタリング方針

### 3.1 基本原則

1. **責任の分離原則（SRP）に従う**
   - 各モジュールは単一の責任のみを持つ
   - 機能ごとに明確に分離

2. **デグレード防止**
   - 段階的なリファクタリング
   - 各段階で動作確認
   - 既存のテスト（あれば）を維持
   - 機能の動作を保証

3. **後方互換性の維持**
   - 既存のAPIインターフェースを維持
   - 段階的な移行を可能にする

### 3.2 リファクタリング戦略

**段階的アプローチ**を採用：
1. 音声録音機能の分離（最優先）
2. UIセクションのコンポーネント化
3. 認証チェックの分離
4. スタイルの分離（オプション）

---

## 4. 詳細なリファクタリングプラン

### Phase 1: 音声録音機能の分離

#### 4.1.1 目的
音声録音機能（約336行）をカスタムフック `useVoiceRecording` に分離する。

#### 4.1.2 対象コード
- `handleVoiceTranscription` (112-251行) - 140行
- `startRecording` (254-292行) - 39行
- `stopRecording` (295-325行) - 31行
- `transcribeAudio` (328-448行) - 121行

#### 4.1.3 新しいフック設計

**ファイル**: `hooks/useVoiceRecording.ts`

```typescript
export function useVoiceRecording(
  chatMessages: ChatMessage[],
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>,
  setIsVoiceChatLoading: React.Dispatch<React.SetStateAction<boolean>>,
  scrollViewRef: React.RefObject<ScrollView>,
  chatMessagesHook: ReturnType<typeof useChatMessages>,
  getApiUrl: () => string
) {
  // 状態管理
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);

  // メソッド
  const startRecording = async () => { /* ... */ };
  const stopRecording = async () => { /* ... */ };
  const transcribeAudio = async (audioUri: string) => { /* ... */ };
  const handleVoiceTranscription = async (text: string) => { /* ... */ };

  return {
    isRecording,
    isVoiceChatLoading, // 状態を返す
    startRecording,
    stopRecording,
  };
}
```

#### 4.1.4 移行手順

1. **Step 1-1: 新しいフックファイルの作成**
   - `hooks/useVoiceRecording.ts` を作成
   - 音声録音関連の状態とメソッドを移動
   - 依存関係を適切に注入

2. **Step 1-2: ChatScreenでの使用**
   - `useVoiceRecording` をインポート
   - 既存の音声録音コードを削除
   - フックの戻り値を使用

3. **Step 1-3: 動作確認**
   - 音声録音機能のテスト
   - エラーハンドリングの確認
   - ログ出力の確認

#### 4.1.5 期待される効果

- **行数削減**: 約336行 → 約50行（ChatScreen内）
- **テスタビリティ向上**: 音声録音機能を独立してテスト可能
- **再利用性向上**: 他のコンポーネントでも音声録音機能を利用可能

---

### Phase 2: UIセクションのコンポーネント化

#### 4.2.1 目的
UIセクションを個別のコンポーネントに分離し、ChatScreenをシンプルにする。

#### 4.2.2 対象コード

1. **プロフィールセクション** (458-469行) - 12行
2. **音声セクション** (504-528行) - 25行

#### 4.2.3 新しいコンポーネント設計

**ファイル**: `components/ProfileSection.tsx`

```typescript
interface ProfileSectionProps {
  userEmail: string | undefined;
  onPress: () => void;
}

export function ProfileSection({ userEmail, onPress }: ProfileSectionProps) {
  return (
    <View style={styles.profileSection}>
      <TouchableOpacity style={styles.avatarButton} onPress={onPress}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>
            {userEmail?.charAt(0).toUpperCase() || 'U'}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}
```

**ファイル**: `components/VoiceSection.tsx`

```typescript
interface VoiceSectionProps {
  isRecording: boolean;
  isVoiceChatLoading: boolean;
  isTextChatLoading: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
}

export function VoiceSection({
  isRecording,
  isVoiceChatLoading,
  isTextChatLoading,
  onStartRecording,
  onStopRecording,
}: VoiceSectionProps) {
  return (
    <View style={styles.voiceSection}>
      <Text style={styles.voiceSectionTitle}>音声チャット</Text>
      <TouchableOpacity
        style={[
          styles.voiceButton,
          isRecording && styles.voiceButtonRecording,
          (isVoiceChatLoading || isTextChatLoading) && styles.voiceButtonDisabled
        ]}
        onPress={isRecording ? onStopRecording : onStartRecording}
        disabled={isVoiceChatLoading || isTextChatLoading}
      >
        <Text style={[
          styles.voiceButtonText,
          isRecording && styles.voiceButtonTextRecording
        ]}>
          {isVoiceChatLoading ? '音声処理中...' : 
           isRecording ? '⏹️ 録音停止' : '🎤 音声録音'}
        </Text>
      </TouchableOpacity>
      {isRecording && (
        <Text style={styles.recordingStatusText}>
          ● 録音中... タップして停止
        </Text>
      )}
    </View>
  );
}
```

#### 4.2.4 移行手順

1. **Step 2-1: ProfileSectionコンポーネントの作成**
   - `components/ProfileSection.tsx` を作成
   - プロフィールセクションのUIを移動
   - スタイルも一緒に移動

2. **Step 2-2: VoiceSectionコンポーネントの作成**
   - `components/VoiceSection.tsx` を作成
   - 音声セクションのUIを移動
   - スタイルも一緒に移動

3. **Step 2-3: ChatScreenでの使用**
   - 新しいコンポーネントをインポート
   - 既存のUIコードを削除
   - コンポーネントを使用

4. **Step 2-4: 動作確認**
   - UI表示の確認
   - イベントハンドラーの動作確認

#### 4.2.5 期待される効果

- **行数削減**: 約37行 → 約10行（ChatScreen内）
- **可読性向上**: UIセクションが明確に分離
- **再利用性向上**: 他の画面でも利用可能

---

### Phase 3: 認証チェックの分離

#### 4.3.1 目的
認証チェックと初期化ログを別のレイヤーに分離する。

#### 4.3.2 対象コード
- 認証チェック (52-69行) - 18行

#### 4.3.3 新しいコンポーネント設計

**オプション1: HOC（Higher Order Component）**

```typescript
// components/withAuth.tsx
export function withAuth<P extends object>(
  Component: React.ComponentType<P>
) {
  return function AuthenticatedComponent(props: P) {
    const { user, session } = useAuth();
    const isAuthenticated = !!(session && user && session.user?.id === user.id);

    React.useEffect(() => {
      logComponent('AuthenticatedComponent', 'component_mounted', { 
        hasUser: !!user, 
        hasSession: !!session,
        platform: Platform.OS 
      });
    }, []);

    if (!isAuthenticated) {
      logComponent('AuthenticatedComponent', 'auth_not_authenticated');
      return null;
    }

    return <Component {...props} />;
  };
}
```

**オプション2: ラッパーコンポーネント（推奨）**

```typescript
// components/AuthGuard.tsx
interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, session } = useAuth();
  const isAuthenticated = !!(session && user && session.user?.id === user.id);

  React.useEffect(() => {
    logComponent('AuthGuard', 'component_mounted', { 
      hasUser: !!user, 
      hasSession: !!session,
      platform: Platform.OS 
    });
  }, []);

  if (!isAuthenticated) {
    logComponent('AuthGuard', 'auth_not_authenticated');
    return null;
  }

  return <>{children}</>;
}
```

#### 4.3.4 移行手順

1. **Step 3-1: AuthGuardコンポーネントの作成**
   - `components/AuthGuard.tsx` を作成
   - 認証チェックロジックを移動

2. **Step 3-2: ChatScreenでの使用**
   - `AuthGuard` で `ChatScreen` をラップ
   - 認証チェックコードを削除

3. **Step 3-3: 動作確認**
   - 認証済みユーザーでの動作確認
   - 未認証ユーザーでの動作確認

#### 4.3.5 期待される効果

- **行数削減**: 約18行削減
- **再利用性向上**: 他の画面でも認証チェックを再利用可能
- **関心の分離**: 認証ロジックが独立

---

### Phase 4: チャット履歴管理の統合

#### 4.4.1 目的
チャット履歴クリア処理を既存の `useChatMessages` フックに統合する。

#### 4.4.2 対象コード
- `handleClearHistory` (91-110行) - 20行

#### 4.4.3 統合方法

`useChatMessages` フックに `clearChatHistory` メソッドが既に存在するため、`handleClearHistory` を削除し、直接 `clearChatHistory` を使用する。

#### 4.4.4 移行手順

1. **Step 4-1: ChatScreenでの使用変更**
   - `handleClearHistory` を削除
   - `chatMessagesHook.clearChatHistory` を直接使用

2. **Step 4-2: 動作確認**
   - チャット履歴クリア機能のテスト

#### 4.4.5 期待される効果

- **行数削減**: 約20行削減
- **コード重複の削減**: 既存のメソッドを活用

---

## 5. リファクタリング後の構造

### 5.1 ファイル構成

```
screens/
  └── ChatScreen.tsx (約200-250行) ← 大幅に削減

hooks/
  ├── useChatMessages.ts (既存)
  ├── useSSEHandling.ts (既存)
  ├── useModalManagement.ts (既存)
  ├── useRecipeSelection.ts (既存)
  └── useVoiceRecording.ts (新規) ← 約300行

components/
  ├── ChatInput.tsx (既存)
  ├── ChatMessageList.tsx (既存)
  ├── ProfileSection.tsx (新規) ← 約50行
  ├── VoiceSection.tsx (新規) ← 約80行
  └── AuthGuard.tsx (新規) ← 約40行
```

### 5.2 ChatScreenの最終的な構造

```typescript
export default function ChatScreen() {
  // カスタムフック
  const modalManagement = useModalManagement();
  const recipeSelection = useRecipeSelection(setChatMessages, setAwaitingSelection);
  const chatMessagesHook = useChatMessages(/* ... */);
  const sseHandling = useSSEHandling(/* ... */);
  const voiceRecording = useVoiceRecording(/* ... */);

  // 状態管理（最小限）
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isTextChatLoading, setIsTextChatLoading] = useState(false);
  const [awaitingSelection, setAwaitingSelection] = useState<boolean>(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const { user } = useAuth();

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={styles.keyboardAvoidingView} /* ... */>
        <ProfileSection
          userEmail={user?.email}
          onPress={() => setIsProfileModalOpen(true)}
        />

        <ChatMessageList /* ... */ />

        <ChatInput /* ... */ />

        <VoiceSection
          isRecording={voiceRecording.isRecording}
          isVoiceChatLoading={voiceRecording.isVoiceChatLoading}
          isTextChatLoading={isTextChatLoading}
          onStartRecording={voiceRecording.startRecording}
          onStopRecording={voiceRecording.stopRecording}
        />
      </KeyboardAvoidingView>

      {/* 各種モーダル */}
    </SafeAreaView>
  );
}
```

### 5.3 期待される行数削減

- **現在**: 652行
- **Phase 1後**: 約316行（-336行）
- **Phase 2後**: 約279行（-37行）
- **Phase 3後**: 約261行（-18行）
- **Phase 4後**: 約241行（-20行）
- **最終**: 約200-250行（約60%削減）

---

## 6. デグレード防止策

### 6.1 段階的な実装

1. **各Phaseを独立して実装**
   - 1つのPhaseが完了してから次のPhaseに進む
   - 各Phaseで動作確認を実施

2. **既存の動作を維持**
   - 既存のAPIインターフェースを維持
   - 既存の動作を変更しない

3. **テストの実施**
   - 各Phaseで機能テストを実施
   - エッジケースのテストも実施

### 6.2 動作確認チェックリスト

#### Phase 1: 音声録音機能
- [ ] 録音開始が正常に動作する
- [ ] 録音停止が正常に動作する
- [ ] 音声認識が正常に動作する
- [ ] エラーハンドリングが正常に動作する
- [ ] リトライ機能が正常に動作する
- [ ] ログ出力が正常に動作する

#### Phase 2: UIセクション
- [ ] プロフィールセクションが正常に表示される
- [ ] プロフィールモーダルが正常に開く
- [ ] 音声セクションが正常に表示される
- [ ] 音声ボタンが正常に動作する
- [ ] スタイルが正常に適用される

#### Phase 3: 認証チェック
- [ ] 認証済みユーザーで正常に表示される
- [ ] 未認証ユーザーで正常に非表示になる
- [ ] 初期化ログが正常に出力される

#### Phase 4: チャット履歴管理
- [ ] チャット履歴クリアが正常に動作する
- [ ] 確認ダイアログが正常に表示される

### 6.3 ロールバック計画

各Phaseで問題が発生した場合：

1. **即座にロールバック**
   - Gitで前のコミットに戻す
   - 問題の原因を調査

2. **問題の修正**
   - 原因を特定
   - 修正を実施
   - 再度テスト

3. **再実装**
   - 修正後に再度実装
   - より慎重に進める

---

## 7. 実装スケジュール

### 7.1 推奨実装順序

1. **Phase 1: 音声録音機能の分離** (最優先)
   - 作業時間: 約2-3時間
   - リスク: 中（複雑なロジック）
   - 効果: 大（約336行削減）

2. **Phase 2: UIセクションのコンポーネント化**
   - 作業時間: 約1-2時間
   - リスク: 低（UIのみ）
   - 効果: 中（約37行削減）

3. **Phase 3: 認証チェックの分離**
   - 作業時間: 約1時間
   - リスク: 低（シンプルなロジック）
   - 効果: 小（約18行削減）

4. **Phase 4: チャット履歴管理の統合**
   - 作業時間: 約30分
   - リスク: 低（既存メソッドの使用）
   - 効果: 小（約20行削減）

### 7.2 総作業時間

- **合計**: 約4.5-6.5時間
- **テスト時間を含む**: 約6-8時間

---

## 8. リスク評価

### 8.1 高リスク項目

1. **音声録音機能の分離**
   - 複雑な状態管理
   - 複数の依存関係
   - エラーハンドリングの複雑さ

   **対策**:
   - 段階的な移行
   - 詳細なテスト
   - ロールバック計画の準備

### 8.2 中リスク項目

1. **UIセクションのコンポーネント化**
   - スタイルの移行
   - イベントハンドラーの連携

   **対策**:
   - スタイルの完全な移行
   - イベントハンドラーのテスト

### 8.3 低リスク項目

1. **認証チェックの分離**
   - シンプルなロジック
   - 既存のパターンに従う

2. **チャット履歴管理の統合**
   - 既存メソッドの使用
   - シンプルな変更

---

## 9. 成功基準

### 9.1 機能面

- [ ] すべての既存機能が正常に動作する
- [ ] エラーハンドリングが正常に動作する
- [ ] パフォーマンスが維持される

### 9.2 コード品質面

- [ ] ファイル行数が約60%削減される（652行 → 約250行）
- [ ] 各モジュールが単一責任を持つ
- [ ] コードの可読性が向上する
- [ ] テスタビリティが向上する

### 9.3 保守性面

- [ ] 各機能が独立してテスト可能
- [ ] 機能の追加・変更が容易になる
- [ ] バグ修正のリスクが低減する

---

## 10. 次のステップ

1. **プランのレビュー**
   - ユーザーによる確認と承認

2. **Phase 1の実装開始**
   - `hooks/useVoiceRecording.ts` の作成
   - 音声録音機能の移行

3. **段階的な実装とテスト**
   - 各Phaseを順次実装
   - 各Phaseで動作確認

4. **ドキュメント更新**
   - リファクタリング完了後のドキュメント更新
   - アーキテクチャドキュメントの更新

---

## 11. 参考資料

- 既存のリファクタリング分析: `docs/archive/refactoring/InventoryOCRModal_refactoring_analysis.md`
- 既存のカスタムフック:
  - `hooks/useChatMessages.ts`
  - `hooks/useSSEHandling.ts`
  - `hooks/useModalManagement.ts`
  - `hooks/useRecipeSelection.ts`

---

**最終更新**: 2025年1月23日  
**作成者**: AIエージェント協働チーム

