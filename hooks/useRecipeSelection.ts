import { useState } from 'react';
import { RecipeCandidate } from '../types/menu';
import { ChatMessage } from '../types/chat';
import { saveMenu } from '../api/menu-api';
import { Alert } from 'react-native';

/**
 * レシピ選択管理フック
 * レシピの選択状態と献立保存機能を管理
 */
export function useRecipeSelection(
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>,
  setAwaitingSelection: React.Dispatch<React.SetStateAction<boolean>>
) {
  // Phase 3.1: 選択済みレシピの状態管理
  const [selectedRecipes, setSelectedRecipes] = useState<{
    main?: RecipeCandidate;
    sub?: RecipeCandidate;
    soup?: RecipeCandidate;
  }>({});

  const [isSavingMenu, setIsSavingMenu] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string>('');

  const handleSelection = (selection: number, selectionResult?: any) => {
    // Phase 3.1: 選択したレシピ情報を取得して状態に保存
    if (selectionResult && selectionResult.selected_recipe) {
      const { category, recipe } = selectionResult.selected_recipe;
      const categoryKey = category === 'main' ? 'main' : category === 'sub' ? 'sub' : 'soup';
      
      setSelectedRecipes(prev => ({
        ...prev,
        [categoryKey]: recipe
      }));
    }
    
    setAwaitingSelection(false);
    
    // 選択結果メッセージを追加（ユニークID生成）
    const userMessageId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setChatMessages(prev => [...prev, {
      id: userMessageId,
      type: 'user',
      content: `${selection}番を選択しました`,
      timestamp: new Date(),
    }]);
  };

  // Phase 3.1: 献立保存機能の実装
  const handleSaveMenu = async () => {
    if (!selectedRecipes.main && !selectedRecipes.sub && !selectedRecipes.soup) {
      Alert.alert('エラー', '保存するレシピがありません');
      return;
    }
    
    setIsSavingMenu(true);
    setSavedMessage('');
    
    try {
      console.log('[DEBUG] Saving menu with selectedRecipes:', selectedRecipes);
      
      // Web版と同じ方式: selectedRecipesを直接送信
      const recipesToSave: { main?: any; sub?: any; soup?: any } = {};
      
      if (selectedRecipes.main) {
        recipesToSave.main = {
          title: selectedRecipes.main.title,
          source: selectedRecipes.main.source || 'web',
          url: selectedRecipes.main.urls && selectedRecipes.main.urls.length > 0 
            ? selectedRecipes.main.urls[0].url 
            : undefined,
          ingredients: selectedRecipes.main.ingredients || []
        };
      }
      
      if (selectedRecipes.sub) {
        recipesToSave.sub = {
          title: selectedRecipes.sub.title,
          source: selectedRecipes.sub.source || 'web',
          url: selectedRecipes.sub.urls && selectedRecipes.sub.urls.length > 0 
            ? selectedRecipes.sub.urls[0].url 
            : undefined,
          ingredients: selectedRecipes.sub.ingredients || []
        };
      }
      
      if (selectedRecipes.soup) {
        recipesToSave.soup = {
          title: selectedRecipes.soup.title,
          source: selectedRecipes.soup.source || 'web',
          url: selectedRecipes.soup.urls && selectedRecipes.soup.urls.length > 0 
            ? selectedRecipes.soup.urls[0].url 
            : undefined,
          ingredients: selectedRecipes.soup.ingredients || []
        };
      }
      
      console.log('[DEBUG] Prepared recipes to save:', recipesToSave);
      
      const result = await saveMenu(recipesToSave);
      
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

