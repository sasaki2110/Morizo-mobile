# Phase 4: リファクタリング（任意）

## 概要

`ChatScreen.tsx`が肥大化している場合、カスタムフックとUIコンポーネントに分割して保守性を向上させます。

**前提条件**: Phase 1、Phase 2、Phase 3が完了していること  
**注意**: このPhaseは任意の実装です。コードの保守性を向上させたい場合のみ実施してください。

## 実装タスク

### 4.1 ChatSectionリファクタリング（UPDATE05）

#### 目標
`ChatScreen.tsx`をカスタムフックとUIコンポーネントに分割し、保守性・テスタビリティ・再利用性を向上させる。

#### 実装内容

Web版と同様に以下のカスタムフックを作成:

1. **useModalManagement**: モーダル状態管理
2. **useRecipeSelection**: レシピ選択と保存
3. **useChatMessages**: メッセージ送信と履歴管理
4. **useSSEHandling**: SSE処理

UIコンポーネント:
1. **ChatInput**: テキスト入力UI
2. **ChatMessageList**: メッセージリスト表示

**注意**: React Nativeの特性を考慮し、Web版とは異なる実装になる可能性があります。

#### 実装例

**ファイル**: `/app/Morizo-mobile/hooks/useModalManagement.ts` (新規作成)

```typescript
import { useState } from 'react';
import { RecipeCandidate } from '../types/menu';

export function useModalManagement() {
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeCandidate | null>(null);
  const [isListModalOpen, setIsListModalOpen] = useState(false);
  const [listModalCandidates, setListModalCandidates] = useState<RecipeCandidate[]>([]);
  const [isHistoryPanelOpen, setIsHistoryPanelOpen] = useState(false);

  const handleViewDetails = (recipe: RecipeCandidate) => {
    setSelectedRecipe(recipe);
    setIsDetailModalOpen(true);
  };

  const closeDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedRecipe(null);
  };

  const handleViewList = (candidates: RecipeCandidate[]) => {
    setListModalCandidates(candidates);
    setIsListModalOpen(true);
  };

  const closeListModal = () => {
    setIsListModalOpen(false);
    setListModalCandidates([]);
  };

  const openHistoryPanel = () => {
    setIsHistoryPanelOpen(true);
  };

  const closeHistoryPanel = () => {
    setIsHistoryPanelOpen(false);
  };

  return {
    isDetailModalOpen,
    selectedRecipe,
    handleViewDetails,
    closeDetailModal,
    isListModalOpen,
    listModalCandidates,
    handleViewList,
    closeListModal,
    isHistoryPanelOpen,
    openHistoryPanel,
    closeHistoryPanel,
  };
}
```

**ファイル**: `/app/Morizo-mobile/hooks/useRecipeSelection.ts` (新規作成)

```typescript
import { useState } from 'react';
import { RecipeCandidate } from '../types/menu';
import { ChatMessage } from '../types/chat';
import { saveMenu } from '../api/menu-api';
import { Alert } from 'react-native';

export function useRecipeSelection(
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>,
  setAwaitingSelection: React.Dispatch<React.SetStateAction<boolean>>,
  chatMessages: ChatMessage[]
) {
  const [selectedRecipes, setSelectedRecipes] = useState<{
    main?: RecipeCandidate;
    sub?: RecipeCandidate;
    soup?: RecipeCandidate;
  }>({});

  const [isSavingMenu, setIsSavingMenu] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string>('');

  const handleSelection = (selection: number, selectionResult?: any) => {
    // 選択したレシピ情報を取得して状態に保存
    if (selectionResult && selectionResult.selected_recipe) {
      const { category, recipe } = selectionResult.selected_recipe;
      const categoryKey = category === 'main' ? 'main' : category === 'sub' ? 'sub' : 'soup';
      
      setSelectedRecipes(prev => ({
        ...prev,
        [categoryKey]: recipe
      }));
    }
    
    setAwaitingSelection(false);
    
    // 選択結果メッセージを追加
    setChatMessages(prev => [...prev, {
      id: Date.now().toString(),
      type: 'user',
      content: `${selection}番を選択しました`,
      timestamp: new Date(),
    }]);
  };

  const handleSaveMenu = async () => {
    if (!selectedRecipes.main && !selectedRecipes.sub && !selectedRecipes.soup) {
      Alert.alert('エラー', '保存するレシピがありません');
      return;
    }
    
    setIsSavingMenu(true);
    setSavedMessage('');
    
    try {
      const currentSseSessionId = chatMessages
        .find(msg => msg.sseSessionId)?.sseSessionId || '';
      
      if (!currentSseSessionId || currentSseSessionId === 'unknown') {
        throw new Error('セッション情報が取得できません');
      }
      
      const result = await saveMenu(currentSseSessionId);
      
      if (result.success) {
        setSavedMessage(result.message || `${result.total_saved}つのレシピが保存されました`);
        
        setTimeout(() => {
          setSavedMessage('');
        }, 5000);
      } else {
        throw new Error(result.message || '保存に失敗しました');
      }
    } catch (error) {
      console.error('Menu save failed:', error);
      Alert.alert('エラー', '献立の保存に失敗しました。もう一度お試しください。');
      setSavedMessage('');
    } finally {
      setIsSavingMenu(false);
    }
  };

  const clearSelectedRecipes = () => {
    setSelectedRecipes({});
    setSavedMessage('');
  };

  return {
    selectedRecipes,
    isSavingMenu,
    savedMessage,
    handleSelection,
    handleSaveMenu,
    clearSelectedRecipes,
  };
}
```

**ファイル**: `/app/Morizo-mobile/components/ChatInput.tsx` (新規作成)

```typescript
import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';

interface ChatInputProps {
  textMessage: string;
  setTextMessage: React.Dispatch<React.SetStateAction<string>>;
  onSend: () => void;
  onKeyPress?: (e: any) => void;
  isTextChatLoading: boolean;
  awaitingSelection: boolean;
  onOpenHistory: () => void;
}

const ChatInput: React.FC<ChatInputProps> = ({
  textMessage,
  setTextMessage,
  onSend,
  onKeyPress,
  isTextChatLoading,
  awaitingSelection,
  onOpenHistory,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Morizo AI テキストチャット</Text>
        <TouchableOpacity
          onPress={onOpenHistory}
          style={styles.historyButton}
        >
          <Text style={styles.historyButtonText}>📅 履歴</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.inputRow}>
        <TextInput
          style={styles.textInput}
          value={textMessage}
          onChangeText={setTextMessage}
          placeholder="メッセージを入力してください..."
          placeholderTextColor="#999"
          multiline
          maxLength={1000}
          editable={!isTextChatLoading && !awaitingSelection}
        />
        <TouchableOpacity
          style={styles.sendButton}
          onPress={onSend}
          disabled={isTextChatLoading || !textMessage.trim() || awaitingSelection}
        >
          <Text style={styles.sendButtonText}>
            {isTextChatLoading ? '送信中...' : awaitingSelection ? '選択中...' : '送信'}
          </Text>
        </TouchableOpacity>
      </View>
      
      {(isTextChatLoading || awaitingSelection) && (
        <Text style={styles.statusText}>
          {isTextChatLoading ? 'Morizo AIが応答を生成中...' : '主菜を選択してください...'}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginBottom: 10,
    borderRadius: 10,
    padding: 15,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  historyButton: {
    backgroundColor: '#4b5563',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  historyButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#1976d2',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  statusText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
  },
});

export default ChatInput;
```

**ファイル**: `/app/Morizo-mobile/components/ChatMessageList.tsx` (新規作成)

メッセージリスト表示と選択UI表示を担当するコンポーネント。実装が複雑なため、既存の`ChatScreen.tsx`から該当部分を抽出して作成。

#### 手順
1. 各カスタムフックを新規作成
2. UIコンポーネント（ChatInput, ChatMessageList）を分離
3. `ChatScreen.tsx`をリファクタリングしてフックとコンポーネントを使用
4. 動作確認

#### 確認項目
- [ ] 既存機能が破壊されていない
- [ ] コードが読みやすくなった
- [ ] テストが容易になった
- [ ] カスタムフックが正しく動作する
- [ ] UIコンポーネントが正しく表示される

---

## Phase 4 完了後の確認

Phase 4の実装が完了したら、以下の項目を確認してください：

### 動作確認
- [ ] 既存の全機能が正常に動作する
- [ ] コードが整理されている
- [ ] 各フックとコンポーネントが独立して動作する

### メリット
- 保守性の向上: 各ファイルが単一の責任を担当
- テスタビリティの向上: 個別にテスト可能
- 再利用性の向上: フックとコンポーネントを他の画面でも利用可能

---

**作成日**: 2025年1月31日  
**最終更新**: 2025年1月31日

