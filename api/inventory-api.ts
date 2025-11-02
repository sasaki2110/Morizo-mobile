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

// 在庫追加API
export interface InventoryItemData {
  item_name: string;
  quantity: number;
  unit: string;
  storage_location: string | null;
  expiry_date: string | null;
}

export async function addInventoryItem(data: InventoryItemData): Promise<InventoryItem> {
  const apiUrl = `${getApiUrl()}/inventory/add`;
  
  const response = await authenticatedFetch(apiUrl, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
  }
  
  const result = await response.json();
  if (result.success) {
    return result.data;
  }
  
  throw new Error(result.error || '在庫追加に失敗しました');
}

// 在庫更新API
export async function updateInventoryItem(itemId: string, data: InventoryItemData): Promise<InventoryItem> {
  const apiUrl = `${getApiUrl()}/inventory/update/${itemId}`;
  
  const response = await authenticatedFetch(apiUrl, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
  }
  
  const result = await response.json();
  if (result.success) {
    return result.data;
  }
  
  throw new Error(result.error || '在庫更新に失敗しました');
}

// 在庫削除API
export async function deleteInventoryItem(itemId: string): Promise<void> {
  const apiUrl = `${getApiUrl()}/inventory/delete/${itemId}`;
  
  const response = await authenticatedFetch(apiUrl, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
  }
  
  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || '在庫削除に失敗しました');
  }
}

