# Phase 3: 履歴・保存機能

## 概要

選択履歴表示と保存機能、履歴パネルUIの実装を行います。

**前提条件**: Phase 1、Phase 2が完了していること

## 実装タスク

### 3.1 選択履歴表示と保存機能（UPDATE04_1）

#### 目標
選択した主菜・副菜・汁物を視覚的に確認でき、任意のタイミングで献立をDBに保存できる。

#### 実装内容

**ファイル**: `/app/Morizo-mobile/components/SelectedRecipeCard.tsx` (新規作成)

```typescript
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { RecipeCandidate } from '../types/menu';

interface SelectedRecipeCardProps {
  main?: RecipeCandidate;
  sub?: RecipeCandidate;
  soup?: RecipeCandidate;
  onSave?: () => void;
  isSaving?: boolean;
  savedMessage?: string;
}

const SelectedRecipeCard: React.FC<SelectedRecipeCardProps> = ({
  main,
  sub,
  soup,
  onSave,
  isSaving = false,
  savedMessage
}) => {
  const isComplete = main && sub && soup;
  const stage = main && !sub ? 'main' : main && sub && !soup ? 'sub' : 'completed';
  
  const getTitle = () => {
    if (isComplete) return '🎉 献立が完成しました！';
    if (sub) return '✅ 副菜が確定しました';
    if (main) return '✅ 主菜が確定しました';
    return '';
  };
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{getTitle()}</Text>
      
      {isComplete && (
        <View style={styles.completeContainer}>
          <Text style={styles.completeText}>📅 今日の献立</Text>
        </View>
      )}
      
      <View style={styles.recipeList}>
        {main && (
          <View style={styles.recipeCard}>
            <Text style={styles.emoji}>🍖</Text>
            <View style={styles.recipeContent}>
              <Text style={styles.recipeTitle}>主菜: {main.title}</Text>
              {main.ingredients && main.ingredients.length > 0 && (
                <Text style={styles.ingredients}>
                  食材: {main.ingredients.join(', ')}
                </Text>
              )}
            </View>
          </View>
        )}
        
        {sub && (
          <View style={styles.recipeCard}>
            <Text style={styles.emoji}>🥗</Text>
            <View style={styles.recipeContent}>
              <Text style={styles.recipeTitle}>副菜: {sub.title}</Text>
              {sub.ingredients && sub.ingredients.length > 0 && (
                <Text style={styles.ingredients}>
                  食材: {sub.ingredients.join(', ')}
                </Text>
              )}
            </View>
          </View>
        )}
        
        {soup && (
          <View style={styles.recipeCard}>
            <Text style={styles.emoji}>🍲</Text>
            <View style={styles.recipeContent}>
              <Text style={styles.recipeTitle}>汁物: {soup.title}</Text>
              {soup.ingredients && soup.ingredients.length > 0 && (
                <Text style={styles.ingredients}>
                  食材: {soup.ingredients.join(', ')}
                </Text>
              )}
            </View>
          </View>
        )}
      </View>
      
      {onSave && (
        <TouchableOpacity
          onPress={onSave}
          disabled={isSaving}
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
        >
          <Text style={styles.saveButtonText}>
            {isSaving ? '保存中...' : '献立を保存'}
          </Text>
        </TouchableOpacity>
      )}
      
      {savedMessage && (
        <View style={styles.messageContainer}>
          <Text style={styles.messageText}>{savedMessage}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#22c55e',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 12,
    textAlign: 'center',
  },
  completeContainer: {
    marginBottom: 12,
  },
  completeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  recipeList: {
    gap: 12,
    marginBottom: 16,
  },
  recipeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    backgroundColor: '#ffffff',
    borderRadius: 8,
  },
  emoji: {
    fontSize: 24,
    marginRight: 12,
  },
  recipeContent: {
    flex: 1,
  },
  recipeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  ingredients: {
    fontSize: 14,
    color: '#6b7280',
  },
  saveButton: {
    backgroundColor: '#22c55e',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  messageContainer: {
    marginTop: 12,
    padding: 8,
    backgroundColor: '#dbeafe',
    borderRadius: 8,
  },
  messageText: {
    fontSize: 14,
    color: '#1e40af',
  },
});

export default SelectedRecipeCard;
```

**ファイル**: `/app/Morizo-mobile/api/menu-api.ts` (新規作成)

```typescript
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';

const getApiUrl = () => {
  if (Platform.OS === 'web') {
    return 'http://localhost:3000/api';
  } else {
    return 'http://192.168.1.12:3000/api';
  }
};

// 認証付きfetch関数
async function authenticatedFetch(url: string, options: RequestInit = {}) {
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

// 献立保存API
export async function saveMenu(sseSessionId: string): Promise<any> {
  const apiUrl = `${getApiUrl()}/menu/save`;
  
  const response = await authenticatedFetch(apiUrl, {
    method: 'POST',
    body: JSON.stringify({
      sse_session_id: sseSessionId
    })
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return await response.json();
}
```

**ChatScreen.tsxの拡張**:

1. **インポートの追加**:
```typescript
import SelectedRecipeCard from '../components/SelectedRecipeCard';
import { saveMenu } from '../api/menu-api';
```

2. **状態管理の追加**:
```typescript
const [selectedRecipes, setSelectedRecipes] = useState<{
  main?: RecipeCandidate;
  sub?: RecipeCandidate;
  soup?: RecipeCandidate;
}>({});
const [isSavingMenu, setIsSavingMenu] = useState(false);
const [savedMessage, setSavedMessage] = useState<string>('');
```

3. **選択処理の拡張**:
```typescript
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
```

4. **保存機能の実装**:
```typescript
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
```

5. **UI表示の追加**（チャット履歴のレンダリング部分）:
```typescript
{(selectedRecipes.main || selectedRecipes.sub || selectedRecipes.soup) && (
  <SelectedRecipeCard
    main={selectedRecipes.main}
    sub={selectedRecipes.sub}
    soup={selectedRecipes.soup}
    onSave={handleSaveMenu}
    isSaving={isSavingMenu}
    savedMessage={savedMessage}
  />
)}
```

6. **チャット履歴クリア時の処理拡張**:
```typescript
const clearChatHistory = () => {
  setChatMessages([]);
  setAwaitingConfirmation(false);
  setConfirmationSessionId(null);
  setAwaitingSelection(false);
  setSelectedRecipes({});
  setSavedMessage('');
};
```

#### 手順
1. `SelectedRecipeCard.tsx`を新規作成
2. `menu-api.ts`を新規作成
3. `ChatScreen.tsx`に状態管理と処理を追加
4. UI表示を追加
5. 動作確認

#### 確認項目
- [ ] 主菜選択時にSelectedRecipeCardが表示される
- [ ] 副菜選択時に副菜情報が追加される
- [ ] 汁物選択時に献立完成メッセージが表示される
- [ ] 「献立を保存」ボタンで保存ができる
- [ ] 保存成功メッセージが表示される

---

### 3.2 履歴パネルUIの実装（UPDATE04_2）

#### 目標
過去に保存した献立履歴を閲覧できるドロワー型のUIパネルを実装する。

#### 実装内容

**ファイル**: `/app/Morizo-mobile/api/menu-api.ts` (拡張)

```typescript
// 履歴取得API
export async function getMenuHistory(days: number = 14, category?: string): Promise<any> {
  const queryParams = new URLSearchParams();
  queryParams.append('days', days.toString());
  if (category) {
    queryParams.append('category', category);
  }
  
  const apiUrl = `${getApiUrl()}/menu/history?${queryParams.toString()}`;
  
  const response = await authenticatedFetch(apiUrl, {
    method: 'GET',
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  const result = await response.json();
  if (result.success) {
    return result.data;
  }
  
  throw new Error(result.error || '履歴取得に失敗しました');
}
```

**ファイル**: `/app/Morizo-mobile/components/HistoryPanel.tsx` (新規作成)

React Nativeの`Modal`コンポーネントを使用して実装。

```typescript
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet, Modal } from 'react-native';
import { getMenuHistory } from '../api/menu-api';
import { Picker } from '@react-native-picker/picker';

interface HistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({ isOpen, onClose }) => {
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [days, setDays] = useState(14);
  const [categoryFilter, setCategoryFilter] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen, days, categoryFilter]);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const data = await getMenuHistory(days, categoryFilter || undefined);
      setHistory(data);
    } catch (error) {
      console.error('History load failed:', error);
      setHistory([]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()} (${days[date.getDay()]})`;
  };

  const getCategoryIcon = (category: string | null) => {
    if (category === 'main') return '🍖';
    if (category === 'sub') return '🥗';
    if (category === 'soup') return '🍲';
    return '🍽️';
  };

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* ヘッダー */}
        <View style={styles.header}>
          <Text style={styles.title}>📅 献立履歴</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeButton}>✕</Text>
          </TouchableOpacity>
        </View>
        
        {/* フィルター */}
        <View style={styles.filters}>
          {/* 期間フィルター */}
          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>期間: {days}日間</Text>
            <View style={styles.buttonGroup}>
              {[7, 14, 30].map((d) => (
                <TouchableOpacity
                  key={d}
                  onPress={() => setDays(d)}
                  style={[styles.filterButton, days === d && styles.filterButtonActive]}
                >
                  <Text style={[styles.filterButtonText, days === d && styles.filterButtonTextActive]}>
                    {d}日
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          {/* カテゴリフィルター */}
          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>カテゴリ</Text>
            <Picker
              selectedValue={categoryFilter}
              onValueChange={(value) => setCategoryFilter(value)}
              style={styles.picker}
            >
              <Picker.Item label="全て" value="" />
              <Picker.Item label="主菜" value="main" />
              <Picker.Item label="副菜" value="sub" />
              <Picker.Item label="汁物" value="soup" />
            </Picker>
          </View>
        </View>
        
        {/* 履歴リスト */}
        <ScrollView style={styles.content}>
          {isLoading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color="#2563eb" />
              <Text style={styles.loadingText}>読み込み中...</Text>
            </View>
          ) : history.length === 0 ? (
            <View style={styles.centerContainer}>
              <Text style={styles.emptyText}>履歴がありません</Text>
            </View>
          ) : (
            <View style={styles.historyList}>
              {history.map((entry, index) => (
                <View key={index} style={styles.historyEntry}>
                  <Text style={styles.dateText}>📆 {formatDate(entry.date)}</Text>
                  {entry.recipes.map((recipe: any, recipeIndex: number) => (
                    <View
                      key={recipeIndex}
                      style={[
                        styles.recipeCard,
                        recipe.duplicate_warning && styles.recipeCardWarning
                      ]}
                    >
                      <Text style={styles.categoryIcon}>{getCategoryIcon(recipe.category)}</Text>
                      <View style={styles.recipeContent}>
                        <Text style={styles.recipeTitle}>
                          {recipe.title.replace(/^(主菜|副菜|汁物):\s*/, '')}
                        </Text>
                        {recipe.duplicate_warning && (
                          <Text style={styles.warningText}>
                            ⚠️ 重複警告（{recipe.duplicate_warning}）
                          </Text>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          )}
        </ScrollView>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  closeButton: {
    fontSize: 24,
    color: '#6b7280',
  },
  filters: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filterGroup: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 8,
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#e5e7eb',
  },
  filterButtonActive: {
    backgroundColor: '#2563eb',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#374151',
  },
  filterButtonTextActive: {
    color: '#ffffff',
  },
  picker: {
    height: 50,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#4b5563',
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
  },
  historyList: {
    gap: 16,
  },
  historyEntry: {
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  dateText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4b5563',
    marginBottom: 8,
  },
  recipeCard: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f9fafb',
    marginBottom: 8,
  },
  recipeCardWarning: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fbbf24',
  },
  categoryIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  recipeContent: {
    flex: 1,
  },
  recipeTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
  },
  warningText: {
    fontSize: 12,
    color: '#92400e',
    marginTop: 4,
  },
});

export default HistoryPanel;
```

**依存パッケージのインストール**:
```bash
npm install @react-native-picker/picker
```

**ChatScreen.tsxの統合**:

1. **インポートの追加**:
```typescript
import HistoryPanel from '../components/HistoryPanel';
```

2. **状態管理の追加**:
```typescript
const [isHistoryPanelOpen, setIsHistoryPanelOpen] = useState(false);
```

3. **履歴ボタンの追加**（プロフィールセクション）:
```typescript
<TouchableOpacity
  onPress={() => setIsHistoryPanelOpen(true)}
  style={styles.historyButton}
>
  <Text style={styles.historyButtonText}>📅 履歴</Text>
</TouchableOpacity>
```

4. **スタイルの追加**:
```typescript
const styles = StyleSheet.create({
  // ...既存のスタイル
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
});
```

5. **HistoryPanelコンポーネントの表示**:
```typescript
<HistoryPanel
  isOpen={isHistoryPanelOpen}
  onClose={() => setIsHistoryPanelOpen(false)}
/>
```

#### 手順
1. `menu-api.ts`に履歴取得機能を追加
2. `@react-native-picker/picker`をインストール
3. `HistoryPanel.tsx`を新規作成
4. `ChatScreen.tsx`に統合
5. 動作確認

#### 確認項目
- [ ] 履歴ボタンが表示される
- [ ] 履歴パネルが開閉できる
- [ ] 履歴データが正しく表示される
- [ ] 期間フィルターが動作する
- [ ] カテゴリフィルターが動作する
- [ ] ローディング状態が正しく表示される
- [ ] 空の状態が正しく表示される

---

## Phase 3 完了後の確認

Phase 3の実装が完了したら、以下の項目を確認してください：

### 動作確認
- [ ] 選択履歴が正しく表示される
- [ ] 献立保存機能が正常に動作する
- [ ] 履歴パネルが正常に動作する
- [ ] フィルター機能が正常に動作する

### 次のステップ
Phase 3が完了したら、必要に応じて`plan-phase4.md`を参照してPhase 4（リファクタリング）の実装に進んでください。

---

**作成日**: 2025年1月31日  
**最終更新**: 2025年1月31日

