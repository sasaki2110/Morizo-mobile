import { Platform } from 'react-native';
import { authenticatedFetch } from './recipe-api';

const getApiUrl = () => {
  if (Platform.OS === 'web') {
    return 'http://localhost:3000/api';
  } else {
    return 'http://192.168.1.12:3000/api';
  }
};

// 献立保存API（選択済みレシピを直接送信）
export async function saveMenu(recipes: {
  main?: {
    title: string;
    source?: string;
    url?: string;
    ingredients: string[];
  };
  sub?: {
    title: string;
    source?: string;
    url?: string;
    ingredients: string[];
  };
  soup?: {
    title: string;
    source?: string;
    url?: string;
    ingredients: string[];
  };
}): Promise<any> {
  const apiUrl = `${getApiUrl()}/menu/save`;
  
  const response = await authenticatedFetch(apiUrl, {
    method: 'POST',
    body: JSON.stringify({
      recipes: recipes
    })
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return await response.json();
}

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

// 削除候補取得API
export interface IngredientDeleteCandidate {
  inventory_id: string;
  item_name: string;
  current_quantity: number;
  unit: string;
}

export async function getDeleteCandidates(date: string): Promise<IngredientDeleteCandidate[]> {
  const apiUrl = `${getApiUrl()}/recipe/ingredients/delete-candidates/${date}`;
  
  const response = await authenticatedFetch(apiUrl, {
    method: 'GET',
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
  }
  
  const result = await response.json();
  if (result.success) {
    return result.candidates || [];
  }
  
  throw new Error('削除候補の取得に失敗しました');
}

// 食材削除実行API
export interface DeleteIngredientItem {
  item_name: string;
  quantity: number;
  inventory_id?: string;
}

export interface DeleteIngredientsResponse {
  success: boolean;
  deleted_count: number;
  updated_count: number;
  failed_items: string[];
}

export async function deleteIngredients(
  date: string,
  ingredients: DeleteIngredientItem[]
): Promise<DeleteIngredientsResponse> {
  const apiUrl = `${getApiUrl()}/recipe/ingredients/delete`;
  
  const response = await authenticatedFetch(apiUrl, {
    method: 'POST',
    body: JSON.stringify({
      date: date,
      ingredients: ingredients,
    }),
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
  }
  
  const result = await response.json();
  if (result.success) {
    return result;
  }
  
  throw new Error('食材削除に失敗しました');
}

