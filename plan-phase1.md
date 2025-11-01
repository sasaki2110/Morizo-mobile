# Phase 1: 基盤整備

## 概要

Web側の型定義をモバイル側に同期し、レシピ選択に関するAPI呼び出し関数を実装し、最小限の選択UIを実装します。

## 実装タスク

### 1.1 型定義の同期

#### 目標
Web側の型定義をモバイル側に同期し、以降の実装の基盤を整える。

#### 実装内容

**ファイル**: `/app/Morizo-mobile/types/menu.ts`

**追加する型定義**:
```typescript
// UPDATE01, UPDATE02用
export interface RecipeAdoptionRequest {
  recipes: RecipeAdoptionItem[];
}

export interface RecipeAdoptionItem {
  title: string;
  category: "main_dish" | "side_dish" | "soup";
  menu_source: "llm_menu" | "rag_menu" | "manual";
  url?: string;
}

export interface SelectedRecipes {
  main_dish: RecipeCard | null;
  side_dish: RecipeCard | null;
  soup: RecipeCard | null;
}

export interface RecipeSelection {
  recipe: RecipeCard;
  category: 'main_dish' | 'side_dish' | 'soup';
  section: 'innovative' | 'traditional';
}

// UPDATE02用
export interface RecipeCandidate {
  title: string;
  ingredients: string[];
  cooking_time?: string;
  description?: string;
  category?: 'main' | 'sub' | 'soup';
  source?: 'llm' | 'rag' | 'web';
  urls?: RecipeUrl[];
}

export interface SelectionRequest {
  task_id: string;
  selection: number;
  sse_session_id: string;  // Phase 2Cで追加
}

export interface SelectionResponse {
  success: boolean;
  message?: string;
  error?: string;
  next_step?: string;
  selected_recipe?: {  // Phase 5B-2で追加
    category: string;
    recipe: RecipeCandidate;
  };
  requires_next_stage?: boolean;  // Phase 3C-3で追加
}
```

**修正する型定義**:
```typescript
// RecipeCardPropsに追加（UPDATE01）
export interface RecipeCardProps {
  recipe: RecipeCard;
  onUrlClick?: (url: string) => void;
  isSelected?: boolean;        // 新規追加
  onSelect?: (recipe: RecipeCard) => void;  // 新規追加
  isAdopted?: boolean;         // 新規追加
}

// MenuViewerPropsに追加（UPDATE01）
export interface MenuViewerProps {
  response: string;
  result?: unknown;
  style?: any;
  selectedRecipes?: SelectedRecipes;  // 新規追加
  onRecipeSelect?: (recipe: RecipeCard, category: 'main_dish' | 'side_dish' | 'soup', section: 'innovative' | 'traditional') => void;  // 新規追加
}
```

**ファイル**: `/app/Morizo-mobile/types/chat.ts` (新規作成)

```typescript
import { RecipeCandidate } from './menu';

export interface ChatMessage {
  id: string;
  type: 'user' | 'ai' | 'streaming';
  content: string;
  timestamp: Date;
  sseSessionId?: string;
  result?: unknown;
  requiresConfirmation?: boolean;
  requiresSelection?: boolean;  // Phase 2Bで追加
  candidates?: RecipeCandidate[];  // Phase 2Bで追加
  taskId?: string;  // Phase 2Bで追加
  // Phase 3D: 段階情報
  currentStage?: 'main' | 'sub' | 'soup';
  usedIngredients?: string[];
  menuCategory?: 'japanese' | 'western' | 'chinese';
  selectedRecipe?: {  // Phase 5B-2で追加
    main?: RecipeCandidate;
    sub?: RecipeCandidate;
    soup?: RecipeCandidate;
  };
}
```

#### 手順
1. `/app/Morizo-mobile/types/menu.ts`を開く
2. Web版(`/app/Morizo-web/types/menu.ts`)と比較し、不足している型定義を追加
3. `/app/Morizo-mobile/types/chat.ts`を新規作成（Web版を参考に）
4. TypeScriptコンパイルエラーがないことを確認

#### 確認項目
- [ ] `RecipeCandidate`型が定義されている
- [ ] `SelectionRequest`型が定義されている
- [ ] `SelectionResponse`型が定義されている
- [ ] `ChatMessage`型が拡張されている
- [ ] TypeScriptコンパイルエラーがない

---

### 1.2 API呼び出し関数の実装

#### 目標
レシピ選択と採用に関するAPI呼び出し関数を実装する。

#### 実装内容

**ファイル**: `/app/Morizo-mobile/api/recipe-api.ts` (新規作成)

```typescript
import { RecipeAdoptionRequest, RecipeAdoptionItem, SelectionRequest, SelectionResponse } from '../types/menu';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';

const getApiUrl = () => {
  if (Platform.OS === 'web') {
    // Web版（Webエミュレーター）
    return 'http://localhost:3000/api';
  } else {
    // Expo Go版（実機）
    return 'http://192.168.1.12:3000/api';
  }
};

// 認証付きfetch関数
async function authenticatedFetch(url: string, options: RequestInit = {}) {
  // 認証トークンを取得
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.access_token) {
    throw new Error('認証トークンが取得できません');
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      ...options.headers,
    },
  });

  return response;
}

// レシピ選択API呼び出し
export async function sendSelection(
  taskId: string,
  selection: number,
  sseSessionId: string
): Promise<SelectionResponse> {
  const apiUrl = `${getApiUrl()}/chat/selection`;
  
  const response = await authenticatedFetch(apiUrl, {
    method: 'POST',
    body: JSON.stringify({
      task_id: taskId,
      selection: selection,
      sse_session_id: sseSessionId
    } as SelectionRequest)
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return await response.json();
}

// レシピ採用API呼び出し（Phase 1では未実装、Phase 2で実装予定）
export async function adoptRecipes(recipes: RecipeAdoptionItem[]): Promise<any> {
  // Phase 2で実装
}
```

**ファイル**: `/app/Morizo-mobile/lib/session-manager.ts` (既存ファイルの確認)

既存の`generateSSESessionId`関数が存在することを確認。存在しない場合は実装。

#### 手順
1. `/app/Morizo-mobile/api/recipe-api.ts`を新規作成
2. `ChatScreen.tsx`の認証ロジックを確認し、同じ実装を使用
3. `sendSelection`関数を実装
4. 必要に応じて`lib/session-manager.ts`を確認・拡張

#### 確認項目
- [ ] `sendSelection`関数が実装されている
- [ ] 認証処理が正しく実装されている
- [ ] API URLの取得ロジックが正しい

---

### 1.3 最小限の選択UI実装

#### 目標
主菜5件の選択UI（SelectionOptions）の最小実装を行う。段階情報の表示は後回し。

#### 実装内容

**ファイル**: `/app/Morizo-mobile/components/SelectionOptions.tsx` (新規作成)

**実装内容（最小版）**:
- ラジオボタンで5件のレシピ候補を表示
- 選択確定ボタン
- API呼び出し処理
- ローディング状態の表示

**React Native対応ポイント**:
- `<input type="radio">` → `TouchableOpacity` + 選択状態管理
- Tailwind CSS → `StyleSheet.create()`
- `alert()` → React Nativeの`Alert` API

**実装例**:
```typescript
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { RecipeCandidate } from '../types/menu';
import { sendSelection } from '../api/recipe-api';

interface SelectionOptionsProps {
  candidates: RecipeCandidate[];
  onSelect: (selection: number, selectionResult?: any) => void;
  taskId: string;
  sseSessionId: string;
  isLoading?: boolean;
}

const SelectionOptions: React.FC<SelectionOptionsProps> = ({
  candidates,
  onSelect,
  taskId,
  sseSessionId,
  isLoading = false
}) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  const handleConfirm = async () => {
    if (isLoading || selectedIndex === null) return;
    
    if (!sseSessionId || sseSessionId === 'unknown') {
      Alert.alert('エラー', 'セッション情報が無効です。');
      return;
    }
    
    setIsConfirming(true);
    
    try {
      const result = await sendSelection(taskId, selectedIndex + 1, sseSessionId);
      
      if (result.success) {
        onSelect(selectedIndex + 1, result);
      } else {
        throw new Error(result.error || 'Selection failed');
      }
    } catch (error) {
      console.error('Selection failed:', error);
      Alert.alert('エラー', '選択に失敗しました。もう一度お試しください。');
      setSelectedIndex(null);
    } finally {
      setIsConfirming(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>選択を処理中...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        採用したいレシピを選んでください
      </Text>
      
      {candidates.map((candidate, index) => (
        <TouchableOpacity
          key={index}
          onPress={() => setSelectedIndex(index)}
          style={[
            styles.recipeItem,
            selectedIndex === index && styles.recipeItemSelected
          ]}
        >
          <View style={styles.radioContainer}>
            <View style={[
              styles.radio,
              selectedIndex === index && styles.radioSelected
            ]}>
              {selectedIndex === index && <View style={styles.radioInner} />}
            </View>
            <Text style={styles.recipeTitle}>
              {index + 1}. {candidate.title}
            </Text>
          </View>
        </TouchableOpacity>
      ))}
      
      <TouchableOpacity
        onPress={handleConfirm}
        disabled={selectedIndex === null || isLoading || isConfirming}
        style={[
          styles.confirmButton,
          (selectedIndex === null || isLoading || isConfirming) && styles.confirmButtonDisabled
        ]}
      >
        <Text style={styles.confirmButtonText}>
          {isConfirming ? '確定中...' : '確定'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
    marginBottom: 16,
  },
  recipeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  recipeItemSelected: {
    backgroundColor: '#dbeafe',
    borderColor: '#3b82f6',
    borderWidth: 2,
  },
  radioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#9ca3af',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: {
    borderColor: '#2563eb',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2563eb',
  },
  recipeTitle: {
    fontSize: 16,
    color: '#374151',
    flex: 1,
  },
  confirmButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  confirmButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  confirmButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
});

export default SelectionOptions;
```

#### ChatScreen.tsxへの統合

**修正箇所**: `/app/Morizo-mobile/screens/ChatScreen.tsx`

1. **インポートの追加**:
```typescript
import SelectionOptions from '../components/SelectionOptions';
import { RecipeCandidate } from '../types/menu';
```

2. **状態管理の追加**:
```typescript
const [awaitingSelection, setAwaitingSelection] = useState<boolean>(false);
```

3. **選択処理の追加**:
```typescript
const handleSelection = (selection: number, selectionResult?: any) => {
  setAwaitingSelection(false);
  
  // 選択結果メッセージを追加
  setChatMessages(prev => [...prev, {
    id: Date.now().toString(),
    type: 'user',
    content: `${selection}番を選択しました`,
    timestamp: new Date(),
  }]);
};
```

4. **SSE処理の拡張**（StreamingProgressのonComplete内）:
```typescript
// resultから選択要求情報を取得
const typedResult = result as {
  response: string;
  menu_data?: unknown;
  requires_confirmation?: boolean;
  confirmation_session_id?: string;
  requires_selection?: boolean;  // 新規追加
  candidates?: RecipeCandidate[];  // 新規追加
  task_id?: string;  // 新規追加
} | undefined;

// 選択要求が必要な場合
if (typedResult?.requires_selection && typedResult?.candidates && typedResult?.task_id) {
  setAwaitingSelection(true);
  
  // ストリーミング進捗表示をAIレスポンスに置き換え（選択要求フラグ付き）
  setChatMessages(prev => 
    prev.map((msg, idx) => 
      idx === index
        ? { 
            id: msg.id,
            type: 'ai', 
            content: typedResult.response, 
            timestamp: msg.timestamp,
            result: typedResult,
            requiresSelection: true,
            candidates: typedResult.candidates,
            taskId: typedResult.task_id,
            sseSessionId: msg.sseSessionId
          }
        : msg
    )
  );
  
  setIsTextChatLoading(false);
}
```

5. **UI表示の追加**（チャット履歴のレンダリング部分）:
```typescript
{/* 選択UI表示 */}
{message.type === 'ai' && message.requiresSelection && message.candidates && message.taskId && (
  <View style={styles.selectionContainer}>
    <SelectionOptions
      candidates={message.candidates}
      onSelect={handleSelection}
      taskId={message.taskId}
      sseSessionId={message.sseSessionId || 'unknown'}
      isLoading={isTextChatLoading}
    />
  </View>
)}
```

6. **入力制御の追加**:
```typescript
<TextInput
  // ...既存のprops
  editable={!isTextChatLoading && !isVoiceChatLoading && !awaitingSelection}
/>

<TouchableOpacity
  // ...既存のprops
  disabled={isTextChatLoading || !textMessage.trim() || awaitingSelection}
>
  <Text>
    {isTextChatLoading ? '送信中...' : awaitingSelection ? '選択中...' : '送信'}
  </Text>
</TouchableOpacity>
```

7. **スタイルの追加**:
```typescript
const styles = StyleSheet.create({
  // ...既存のスタイル
  selectionContainer: {
    marginVertical: 8,
  },
});
```

#### 手順
1. `/app/Morizo-mobile/components/SelectionOptions.tsx`を新規作成
2. `ChatScreen.tsx`にインポートと状態管理を追加
3. SSE処理の拡張を実装
4. UI表示部分を追加
5. 入力制御を追加
6. 動作確認

#### 確認項目
- [ ] SelectionOptionsコンポーネントが表示される
- [ ] ラジオボタンでレシピを選択できる
- [ ] 確定ボタンで選択が送信される
- [ ] 選択中はテキスト入力が無効化される
- [ ] エラーハンドリングが正しく動作する

---

## Phase 1 完了後の確認

Phase 1の実装が完了したら、以下の項目を確認してください：

### 動作確認
- [ ] 型定義が正しく同期されている
- [ ] API呼び出しが正常に動作する
- [ ] 選択UIが表示される
- [ ] 選択機能が正常に動作する

### 次のステップ
Phase 1が完了したら、`plan-phase2.md`を参照してPhase 2の実装に進んでください。

---

**作成日**: 2025年1月31日  
**最終更新**: 2025年1月31日

