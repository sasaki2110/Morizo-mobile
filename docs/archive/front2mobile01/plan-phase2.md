# Phase 2: 選択機能の拡張

## 概要

段階的選択UIの実装とレシピ採用機能の実装を行います。

**前提条件**: Phase 1が完了していること

## 実装タスク

### 2.1 段階的選択UIの実装

#### 目標
主菜→副菜→汁物の段階的選択に対応し、段階情報（主菜/副菜/汁物）と使い残し食材を表示する。

#### 実装内容

**ファイル**: `/app/Morizo-mobile/components/SelectionOptions.tsx` (拡張)

**追加するProps**:
```typescript
interface SelectionOptionsProps {
  // ...既存のProps
  currentStage?: 'main' | 'sub' | 'soup';
  usedIngredients?: string[];
  menuCategory?: 'japanese' | 'western' | 'chinese';
}
```

**追加するUI**:
- 段階情報バッジ（主菜/副菜/汁物）
- カテゴリ情報バッジ（和食/洋食/中華）
- 使い残し食材リスト

**実装例**:
```typescript
// Phase 3D: 段階名の表示テキスト
const stageLabel = currentStage === 'main' ? '主菜' : currentStage === 'sub' ? '副菜' : currentStage === 'soup' ? '汁物' : '';
const menuCategoryLabel = menuCategory === 'japanese' ? '和食' : menuCategory === 'western' ? '洋食' : menuCategory === 'chinese' ? '中華' : '';

return (
  <View style={styles.container}>
    {/* Phase 3D: 段階情報の表示 */}
    {(currentStage || menuCategory) && (
      <View style={styles.stageContainer}>
        <View style={styles.badgeContainer}>
          {currentStage && (
            <View style={[styles.badge, styles.mainBadge]}>
              <Text style={styles.badgeText}>
                {stageLabel}を選んでください
              </Text>
            </View>
          )}
          {menuCategory && (
            <View style={[styles.badge, styles.categoryBadge]}>
              <Text style={styles.badgeText}>
                {menuCategoryLabel}
              </Text>
            </View>
          )}
        </View>
      </View>
    )}
    
    {/* Phase 3D: 使い残し食材の表示 */}
    {usedIngredients && usedIngredients.length > 0 && (
      <View style={styles.ingredientsContainer}>
        <Text style={styles.ingredientsTitle}>
          📦 使える食材:
        </Text>
        <Text style={styles.ingredientsList}>
          {usedIngredients.join(', ')}
        </Text>
      </View>
    )}
    
    {/* 既存のレシピ選択UI */}
    {/* ... */}
  </View>
);
```

**スタイルの追加**:
```typescript
const styles = StyleSheet.create({
  // ...既存のスタイル
  stageContainer: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  badgeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  mainBadge: {
    backgroundColor: '#2563eb',
  },
  categoryBadge: {
    backgroundColor: '#4f46e5',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  ingredientsContainer: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#fef9c3',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fde047',
  },
  ingredientsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  ingredientsList: {
    fontSize: 14,
    color: '#6b7280',
  },
});
```

**ChatScreen.tsxの拡張**:

1. **ChatMessage型の確認**: `currentStage`, `usedIngredients`, `menuCategory`が含まれていることを確認（Phase 1で追加済み）

2. **SSE処理の拡張**:
```typescript
// resultから段階情報を取得
const typedResult = result as {
  // ...既存のフィールド
  current_stage?: 'main' | 'sub' | 'soup';
  used_ingredients?: string[];
  menu_category?: 'japanese' | 'western' | 'chinese';
} | undefined;

// 選択要求時に段階情報も含める
if (typedResult?.requires_selection && typedResult?.candidates && typedResult?.task_id) {
  setChatMessages(prev => 
    prev.map((msg, idx) => 
      idx === index
        ? { 
            // ...既存のフィールド
            currentStage: typedResult.current_stage,
            usedIngredients: typedResult.used_ingredients,
            menuCategory: typedResult.menu_category
          }
        : msg
    )
  );
}
```

3. **SelectionOptionsへのProps渡し**:
```typescript
<SelectionOptions
  // ...既存のProps
  currentStage={message.currentStage}
  usedIngredients={message.usedIngredients}
  menuCategory={message.menuCategory}
/>
```

#### 手順
1. `SelectionOptions.tsx`に段階情報表示UIを追加
2. `ChatScreen.tsx`のSSE処理で段階情報を取得
3. `SelectionOptions`に段階情報を渡す
4. スタイルを追加（StyleSheet）
5. 動作確認

#### 確認項目
- [ ] 段階情報（主菜/副菜/汁物）が表示される
- [ ] カテゴリ情報（和食/洋食/中華）が表示される
- [ ] 使い残し食材が表示される
- [ ] 段階情報がない場合でもエラーにならない

---

### 2.2 レシピ採用機能の実装（UPDATE01）

#### 目標
レシピモーダルにチェックボックス選択機能を追加し、選択したレシピをバックエンドAPI（`/api/recipe/adopt`）に通知する。

#### 実装内容

**ファイル**: `/app/Morizo-mobile/api/recipe-api.ts` (拡張)

```typescript
export async function adoptRecipes(recipes: RecipeAdoptionItem[]): Promise<any> {
  const apiUrl = `${getApiUrl()}/recipe/adopt`;
  
  const response = await authenticatedFetch(apiUrl, {
    method: 'POST',
    body: JSON.stringify({
      recipes: recipes
    } as RecipeAdoptionRequest)
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return await response.json();
}

// セッションストレージの代わりにAsyncStorageを使用
import AsyncStorage from '@react-native-async-storage/async-storage';

export async function saveAdoptedRecipes(recipes: RecipeAdoptionItem[]): Promise<void> {
  try {
    const existing = await getAdoptedRecipes();
    const titles = [...existing, ...recipes.map(r => r.title)];
    await AsyncStorage.setItem('adopted_recipes', JSON.stringify(titles));
  } catch (error) {
    console.error('Failed to save adopted recipes:', error);
  }
}

export async function getAdoptedRecipes(): Promise<string[]> {
  try {
    const data = await AsyncStorage.getItem('adopted_recipes');
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to get adopted recipes:', error);
    return [];
  }
}

export async function isRecipeAdopted(recipeTitle: string): Promise<boolean> {
  const adopted = await getAdoptedRecipes();
  return adopted.includes(recipeTitle);
}

export async function clearAdoptedRecipes(): Promise<void> {
  await AsyncStorage.removeItem('adopted_recipes');
}
```

**依存パッケージのインストール**:
```bash
npm install @react-native-async-storage/async-storage
```

**ファイル**: `/app/Morizo-mobile/components/RecipeCard.tsx` (拡張)

既存の`RecipeCard.tsx`に以下を追加:

```typescript
import { TouchableOpacity } from 'react-native';

interface RecipeCardProps {
  recipe: RecipeCard;
  onUrlClick?: (url: string) => void;
  isSelected?: boolean;        // 新規追加
  onSelect?: (recipe: RecipeCard) => void;  // 新規追加
  isAdopted?: boolean;         // 新規追加
}

// レンダリング部分に追加
{isAdopted && (
  <View style={styles.adoptedBadge}>
    <Text style={styles.adoptedBadgeText}>✓ 採用済み</Text>
  </View>
)}

{onSelect && (
  <TouchableOpacity
    style={[
      styles.checkbox,
      isSelected && styles.checkboxSelected
    ]}
    onPress={() => onSelect(recipe)}
  >
    {isSelected && <Text style={styles.checkmark}>✓</Text>}
  </TouchableOpacity>
)}
```

**スタイルの追加**:
```typescript
const styles = StyleSheet.create({
  // ...既存のスタイル
  adoptedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#10b981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  adoptedBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  checkbox: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#9ca3af',
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
```

**ファイル**: `/app/Morizo-mobile/components/RecipeModal.tsx` (新規作成または拡張)

レシピモーダルに以下を実装:
- チェックボックス選択機能
- カテゴリ内で1つまで選択可能（相互排他）
- 「この献立を採用」ボタン
- 採用済みレシピのマーク表示

**注意**: 既存のRecipeViewerScreenがある場合は、それを拡張するか、別途RecipeModalを作成する。

#### 手順
1. `recipe-api.ts`に採用機能を追加
2. `AsyncStorage`をインストール（`npm install @react-native-async-storage/async-storage`）
3. `RecipeCard.tsx`を拡張
4. `RecipeModal.tsx`を実装または拡張
5. 動作確認

#### 確認項目
- [ ] レシピカードにチェックボックスが表示される
- [ ] チェックボックスをタップして選択/解除できる
- [ ] 同じカテゴリ内で1つまでしか選択できない
- [ ] 「この献立を採用」ボタンでAPI呼び出しができる
- [ ] 採用済みレシピに「✓ 採用済み」バッジが表示される

---

## Phase 2 完了後の確認

Phase 2の実装が完了したら、以下の項目を確認してください：

### 動作確認
- [ ] 段階情報が正しく表示される
- [ ] 使い残し食材が表示される
- [ ] レシピ採用機能が正常に動作する
- [ ] AsyncStorageへの保存が正常に動作する

### 次のステップ
Phase 2が完了したら、`plan-phase3.md`を参照してPhase 3の実装に進んでください。

---

**作成日**: 2025年1月31日  
**最終更新**: 2025年1月31日

