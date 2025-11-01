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
  throw new Error('adoptRecipes is not implemented yet');
}

