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

