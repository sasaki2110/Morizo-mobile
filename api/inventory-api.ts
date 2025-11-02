import { Platform } from 'react-native';
import { authenticatedFetch } from './recipe-api';

const getApiUrl = () => {
  if (Platform.OS === 'web') {
    return 'http://localhost:3000/api';
  } else {
    return 'http://192.168.1.12:3000/api';
  }
};

export interface InventoryItem {
  id: string;
  item_name: string;
  quantity: number;
  unit: string;
  storage_location: string | null;
  expiry_date: string | null;
  created_at: string;
  updated_at: string;
}

// 在庫一覧取得API
export async function getInventoryList(
  sortBy: string = 'created_at',
  sortOrder: string = 'desc'
): Promise<InventoryItem[]> {
  const apiUrl = `${getApiUrl()}/inventory/list?sort_by=${sortBy}&sort_order=${sortOrder}`;
  
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
  
  throw new Error(result.error || '在庫一覧取得に失敗しました');
}

