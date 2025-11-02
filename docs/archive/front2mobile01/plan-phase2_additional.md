# Phase 2 追加実装: レシピ選択UIの拡張機能

## 概要

Phase 2の基本実装完了後、SelectionOptionsコンポーネントに以下の機能を追加します。

- **📋 レシピ一覧を見る**: 候補レシピの詳細情報をモーダルで表示
- **他の提案を見る**: 追加のレシピ候補を取得して表示

## 実装タスク

### 2.3 レシピ一覧表示機能（📋 レシピ一覧を見る）

#### 目標
選択候補として表示されているレシピの詳細情報（画像、食材、調理時間など）をモーダルで確認できるようにする。

#### 実装内容

**ファイル**: `/app/Morizo-mobile/components/RecipeListModal.tsx` (新規作成)

React Nativeの`Modal`コンポーネントを使用して実装。

**主な機能**:
- 候補レシピの一覧をグリッド表示
- 各レシピの詳細情報（画像、食材、調理時間、説明、ソース）を表示
- モバイル環境に最適化されたレイアウト

**実装例**:
```typescript
import React from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Linking,
} from 'react-native';
import { RecipeCandidate } from '../types/menu';
import ImageHandler from './ImageHandler';

interface RecipeListModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidates: RecipeCandidate[];
  currentStage?: 'main' | 'sub' | 'soup';
}

const RecipeListModal: React.FC<RecipeListModalProps> = ({
  isOpen,
  onClose,
  candidates,
  currentStage
}) => {
  const stageLabel = currentStage === 'main' ? '主菜' : currentStage === 'sub' ? '副菜' : currentStage === 'soup' ? '汁物' : '';
  
  const getTitle = () => {
    return `${stageLabel}の提案（${candidates.length}件）`;
  };

  if (!isOpen) return null;

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* ヘッダー */}
        <View style={styles.header}>
          <Text style={styles.title}>{getTitle()}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* レシピリスト */}
        <ScrollView style={styles.content}>
          <View style={styles.grid}>
            {candidates.map((candidate, index) => (
              <View key={index} style={styles.recipeCard}>
                {/* 画像表示 */}
                {candidate.urls && candidate.urls.length > 0 && (
                  <View style={styles.imageContainer}>
                    <ImageHandler
                      urls={candidate.urls}
                      title={candidate.title}
                      onUrlClick={(url) => Linking.openURL(url)}
                    />
                  </View>
                )}
                
                {/* レシピタイトル */}
                <Text style={styles.recipeTitle}>
                  {index + 1}. {candidate.title}
                </Text>
                
                {/* 食材情報 */}
                {candidate.ingredients && candidate.ingredients.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionLabel}>📋 使用食材</Text>
                    <Text style={styles.sectionContent}>
                      {candidate.ingredients.join(', ')}
                    </Text>
                  </View>
                )}
                
                {/* 調理時間 */}
                {candidate.cooking_time && (
                  <View style={styles.section}>
                    <Text style={styles.sectionLabel}>⏱️ 調理時間</Text>
                    <Text style={styles.sectionContent}>
                      {candidate.cooking_time}
                    </Text>
                  </View>
                )}
                
                {/* 説明 */}
                {candidate.description && (
                  <Text style={styles.description}>
                    {candidate.description}
                  </Text>
                )}
                
                {/* ソース情報 */}
                {candidate.source && (
                  <View style={styles.sourceContainer}>
                    <Text style={[
                      styles.sourceBadge,
                      candidate.source === 'llm' && styles.sourceBadgeLLM,
                      candidate.source === 'rag' && styles.sourceBadgeRAG,
                      candidate.source === 'web' && styles.sourceBadgeWeb
                    ]}>
                      {candidate.source === 'llm' ? 'LLM提案' : 
                       candidate.source === 'rag' ? 'RAG検索' : 'Web検索'}
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        </ScrollView>

        {/* フッター */}
        <View style={styles.footer}>
          <TouchableOpacity onPress={onClose} style={styles.closeFooterButton}>
            <Text style={styles.closeFooterButtonText}>閉じる</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: '#6B7280',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  grid: {
    padding: 16,
  },
  recipeCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  imageContainer: {
    marginBottom: 12,
  },
  recipeTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  section: {
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  sectionContent: {
    fontSize: 14,
    color: '#374151',
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
    marginBottom: 12,
  },
  sourceContainer: {
    marginTop: 8,
  },
  sourceBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
    alignSelf: 'flex-start',
  },
  sourceBadgeLLM: {
    backgroundColor: '#9333EA',
  },
  sourceBadgeRAG: {
    backgroundColor: '#22C55E',
  },
  sourceBadgeWeb: {
    backgroundColor: '#3B82F6',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  closeFooterButton: {
    backgroundColor: '#9CA3AF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeFooterButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default RecipeListModal;
```

**ChatScreen.tsxの拡張**:

1. **状態管理の追加**:
```typescript
const [isListModalOpen, setIsListModalOpen] = useState(false);
const [listModalCandidates, setListModalCandidates] = useState<RecipeCandidate[]>([]);
```

2. **ハンドラー関数の追加**:
```typescript
const handleViewList = (candidates: RecipeCandidate[]) => {
  setListModalCandidates(candidates);
  setIsListModalOpen(true);
};

const closeListModal = () => {
  setIsListModalOpen(false);
  setListModalCandidates([]);
};
```

3. **SelectionOptionsへのProps追加**:
```typescript
<SelectionOptions
  // ...既存のProps
  onViewList={handleViewList}
/>
```

4. **RecipeListModalコンポーネントの追加**:
```typescript
<RecipeListModal
  isOpen={isListModalOpen}
  onClose={closeListModal}
  candidates={listModalCandidates}
  currentStage={/* 現在の段階情報を取得 */}
/>
```

#### 手順
1. `RecipeListModal.tsx`を新規作成
2. `ChatScreen.tsx`に状態管理とハンドラーを追加
3. `SelectionOptions.tsx`に`onViewList`のPropsを追加
4. UIに`RecipeListModal`を追加
5. 動作確認

#### 確認項目
- [ ] 「📋 レシピ一覧を見る」ボタンが表示される
- [ ] ボタンをクリックしてモーダルが開く
- [ ] レシピの詳細情報が正しく表示される
- [ ] モーダルを閉じることができる

---

### 2.4 他の提案を見る機能

#### 目標
現在表示されているレシピ候補以外の追加候補を取得して表示できるようにする。

#### 実装内容

**ファイル**: `/app/Morizo-mobile/components/SelectionOptions.tsx` (拡張)

**追加するProps**:
```typescript
interface SelectionOptionsProps {
  // ...既存のProps
  onRequestMore?: (sseSessionId: string) => void;
  isLatestSelection?: boolean;
  proposalRound?: number;
}
```

**追加する状態管理**:
```typescript
const [isRequestingMore, setIsRequestingMore] = useState(false);
```

**追加提案リクエストの実装**:
```typescript
const handleRequestMore = async () => {
  if (isLoading || isConfirming || isRequestingMore) return;
  
  // 新しいSSEセッションIDを生成（既存のSSEセッションは切断済みのため）
  const newSseSessionId = `additional-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  console.log('[DEBUG] Generated new SSE session for additional proposal:', newSseSessionId);
  console.log('[DEBUG] Old SSE session ID:', sseSessionId);
  
  setIsRequestingMore(true);
  
  // 先にコールバックを呼び出してChatScreenにstreamingメッセージを追加してもらう
  if (onRequestMore) {
    onRequestMore(newSseSessionId);
  }
  
  try {
    const apiUrl = `${getApiUrl()}/chat/selection`;
    
    // バックエンドに追加提案を要求（新しいSSEセッションID + 旧セッションIDを送信）
    const response = await authenticatedFetch(apiUrl, {
      method: 'POST',
      body: JSON.stringify({
        task_id: taskId,
        selection: 0, // 0 = 追加提案要求
        sse_session_id: newSseSessionId,  // 新しいSSEセッションID
        old_sse_session_id: sseSessionId  // 旧セッションID（コンテキスト復元用）
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('[DEBUG] Request more response:', result);
    
    if (result.success) {
      setSelectedIndex(null); // 選択状態をリセット
    } else {
      throw new Error(result.error || 'Request failed');
    }
  } catch (error) {
    console.error('Request more failed:', error);
    Alert.alert('エラー', '追加提案の要求に失敗しました。');
  } finally {
    setIsRequestingMore(false);
  }
};
```

**UIの追加**:
```typescript
{/* 他の提案を見るボタン - 最新の選択候補のみ表示 */}
{isLatestSelection !== false && onRequestMore && (
  <TouchableOpacity
    onPress={handleRequestMore}
    disabled={isLoading || isConfirming || isRequestingMore}
    style={[
      styles.requestMoreButton,
      (isLoading || isConfirming || isRequestingMore) && styles.requestMoreButtonDisabled
    ]}
  >
    <Text style={styles.requestMoreButtonText}>
      他の提案を見る
    </Text>
  </TouchableOpacity>
)}

{isRequestingMore && (
  <View style={styles.requestingMoreContainer}>
    <ActivityIndicator size="small" color="#2563eb" />
    <Text style={styles.requestingMoreText}>追加提案を取得中...</Text>
  </View>
)}
```

**ChatScreen.tsxの拡張**:

1. **ハンドラー関数の追加**:
```typescript
const handleRequestMore = (sseSessionId: string) => {
  // 新しいstreamingメッセージを追加（SSEセッションIDはSelectionOptionsから渡される）
  const streamingMessage: ChatMessage = {
    id: `streaming-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: 'streaming',
    content: '追加提案を取得中...',
    timestamp: new Date(),
    sseSessionId: sseSessionId,
  };
  setChatMessages(prev => [...prev, streamingMessage]);
  
  console.log('[DEBUG] Added streaming message for additional proposal with SSE session:', sseSessionId);
};
```

2. **SelectionOptionsへのProps追加**:
```typescript
<SelectionOptions
  // ...既存のProps
  onRequestMore={handleRequestMore}
  isLatestSelection={/* 最新の選択候補かどうかを判定 */}
/>
```

3. **`recipe-api.ts`の拡張**（必要に応じて）:
```typescript
// authenticatedFetchをexportする必要がある場合
export { authenticatedFetch };
```

#### 手順
1. `SelectionOptions.tsx`に`onRequestMore`関連のPropsとUIを追加
2. `handleRequestMore`関数を実装
3. `ChatScreen.tsx`に`handleRequestMore`ハンドラーを追加
4. `SelectionOptions`に`onRequestMore`と`isLatestSelection`を渡す
5. スタイルを追加
6. 動作確認

#### 確認項目
- [ ] 「他の提案を見る」ボタンが表示される（最新の選択候補のみ）
- [ ] ボタンをクリックして追加提案をリクエストできる
- [ ] ローディング状態が正しく表示される
- [ ] 追加提案が正しく表示される
- [ ] エラーハンドリングが正しく動作する

---

## 実装の注意点

### React Native対応のポイント

1. **Modal**: 
   - Web版の`<div>`ベースのモーダル → React Nativeの`Modal`コンポーネント
   - `presentationStyle="pageSheet"`でモバイル向けの表示

2. **スタイリング**:
   - Tailwind CSS → `StyleSheet.create()`
   - `gap`プロパティは使えないため、`margin`や`padding`で対応

3. **画像表示**:
   - `ImageHandler`コンポーネントを再利用
   - `Linking.openURL()`でURLを開く

4. **SSEセッション管理**:
   - 追加提案用に新しいSSEセッションIDを生成
   - 旧セッションIDを`old_sse_session_id`として送信（コンテキスト復元用）

### API仕様

**追加提案リクエスト** (`/api/chat/selection`):
```json
{
  "task_id": "string",
  "selection": 0,  // 0 = 追加提案要求
  "sse_session_id": "string",  // 新しいSSEセッションID
  "old_sse_session_id": "string"  // 旧セッションID（コンテキスト復元用）
}
```

### 状態管理

- `isLatestSelection`: 最新の選択候補かどうかを判定（過去の選択候補には「他の提案を見る」ボタンを表示しない）
- `proposalRound`: 同じ段階内での提案バッチ番号（将来的に使用）

---

## 実装順序

1. **2.3 レシピ一覧表示機能**の実装
2. **2.4 他の提案を見る機能**の実装
3. 動作確認

両機能は独立して実装可能ですが、ユーザー体験の観点から「レシピ一覧を見る」機能を先に実装することを推奨します。

---

**作成日**: 2025年1月31日  
**最終更新**: 2025年1月31日

