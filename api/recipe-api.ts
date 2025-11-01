import { RecipeAdoptionRequest, RecipeAdoptionItem, SelectionRequest, SelectionResponse } from '../types/menu';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

// レシピ採用API呼び出し
export async function adoptRecipes(recipes: RecipeAdoptionItem[]): Promise<any> {
  if (recipes.length === 0) {
    return {
      success: false,
      message: '採用するレシピが選択されていません',
      error: 'NO_RECIPES_SELECTED'
    };
  }

  const apiUrl = `${getApiUrl()}/recipe/adopt`;
  
  try {
    const response = await authenticatedFetch(apiUrl, {
      method: 'POST',
      body: JSON.stringify({
        recipes: recipes
      } as RecipeAdoptionRequest)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = 'レシピの採用に失敗しました';
      
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.message || errorMessage;
      } catch {
        // JSONパースに失敗した場合はテキストをそのまま使用
        if (errorText.trim()) {
          errorMessage = errorText;
        }
      }
      
      return {
        success: false,
        message: errorMessage,
        error: `HTTP_${response.status}`
      };
    }
    
    const result = await response.json();
    
    if (result.success) {
      // 成功時は採用済みレシピをAsyncStorageに保存
      await saveAdoptedRecipes(recipes);
      
      return {
        success: true,
        message: result.message || `${recipes.length}つのレシピを採用しました`
      };
    } else {
      return {
        success: false,
        message: result.message || 'レシピの採用に失敗しました',
        error: 'API_ERROR'
      };
    }
  } catch (error) {
    console.error('レシピ採用エラー:', error);
    
    if (error instanceof Error) {
      return {
        success: false,
        message: error.message || 'ネットワークエラーが発生しました',
        error: 'NETWORK_ERROR'
      };
    }
    
    return {
      success: false,
      message: '予期しないエラーが発生しました',
      error: 'UNKNOWN_ERROR'
    };
  }
}

// AsyncStorageのキー名
const ADOPTED_RECIPES_KEY = 'morizo_adopted_recipes';

// 採用済みレシピをAsyncStorageに保存
export async function saveAdoptedRecipes(recipes: RecipeAdoptionItem[]): Promise<void> {
  try {
    const existing = await getAdoptedRecipes();
    const newRecipes = recipes.map(recipe => recipe.title);
    
    // 重複を避けて追加
    const allRecipes = [...new Set([...existing, ...newRecipes])];
    
    await AsyncStorage.setItem(ADOPTED_RECIPES_KEY, JSON.stringify(allRecipes));
    
    // デバッグログ: 保存された内容を確認
    console.log('[DEBUG] AsyncStorageに保存完了:', {
      newRecipes: newRecipes,
      existingCount: existing.length,
      totalCount: allRecipes.length,
      allRecipes: allRecipes
    });
  } catch (error) {
    console.error('AsyncStorageへの保存に失敗:', error);
  }
}

// AsyncStorageから採用済みレシピ一覧を取得
export async function getAdoptedRecipes(): Promise<string[]> {
  try {
    const data = await AsyncStorage.getItem(ADOPTED_RECIPES_KEY);
    const recipes = data ? JSON.parse(data) : [];
    
    // デバッグログ: 読み込んだ内容を確認
    console.log('[DEBUG] AsyncStorageから読み込み:', {
      hasData: !!data,
      count: recipes.length,
      recipes: recipes
    });
    
    return recipes;
  } catch (error) {
    console.error('AsyncStorageからの読み込みに失敗:', error);
    return [];
  }
}

// 指定したレシピが採用済みかチェック
export async function isRecipeAdopted(recipeTitle: string): Promise<boolean> {
  const adopted = await getAdoptedRecipes();
  return adopted.includes(recipeTitle);
}

// AsyncStorageから採用済みレシピ情報をクリア
export async function clearAdoptedRecipes(): Promise<void> {
  try {
    await AsyncStorage.removeItem(ADOPTED_RECIPES_KEY);
  } catch (error) {
    console.error('AsyncStorageのクリアに失敗:', error);
  }
}

