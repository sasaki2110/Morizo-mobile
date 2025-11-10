import { Platform } from 'react-native';
import { authenticatedFetch } from './recipe-api';
import { supabase } from '../lib/supabase';

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

// CSVアップロード結果の型定義
export interface CSVUploadResult {
  success: boolean;
  total: number;
  success_count: number;
  error_count: number;
  errors: Array<{
    row: number;
    item_name?: string;
    error: string;
  }>;
}

// CSVアップロードAPI
export async function uploadInventoryCSV(fileUri: string): Promise<CSVUploadResult> {
  const apiUrl = `${getApiUrl()}/inventory/upload-csv`;
  
  console.log('📤 [CSV Upload] Starting upload:', { apiUrl, fileUri });

  // 認証トークンを取得
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.access_token) {
    console.error('❌ [CSV Upload] No session token');
    throw new Error('認証トークンが取得できません');
  }

  // リトライ機能を実装（1回目の失敗に対応）
  let retryCount = 0;
  const maxRetries = 3;
  
  while (retryCount < maxRetries) {
    try {
      console.log('📤 [CSV Upload] Attempt:', retryCount + 1, 'of', maxRetries);
      
      // FormDataを作成（リトライごとに再作成）
      const formData = new FormData();
      
      // expo-document-pickerから返されるURIはそのまま使用
      // copyToCacheDirectory: trueの場合、既に適切な形式のURIが返される
      formData.append('file', {
        uri: fileUri,
        type: 'text/csv',
        name: 'inventory.csv',
      } as any);

      // React Native対応のタイムアウト実装（30秒）
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 30000);
      });

      const fetchPromise = fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          // Content-TypeはFormDataの場合自動設定されるため指定しない
        },
        body: formData,
      });

      const response = await Promise.race([fetchPromise, timeoutPromise]) as Response;

      console.log('📥 [CSV Upload] Response status:', response.status, response.statusText);

      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorMessage;
          console.error('❌ [CSV Upload] Error response:', errorData);
        } catch (parseError) {
          const errorText = await response.text();
          console.error('❌ [CSV Upload] Error response (text):', errorText);
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('✅ [CSV Upload] Success:', result);
      return result;

    } catch (error) {
      retryCount++;
      const errorMessage = error instanceof Error ? error.message : '不明なエラー';
      
      console.error('❌ [CSV Upload] Attempt failed:', retryCount, '/', maxRetries, errorMessage);

      // ネットワークエラーの場合のみリトライ
      if (error instanceof TypeError && error.message === 'Network request failed') {
        if (retryCount >= maxRetries) {
          throw new Error('ネットワーク接続に失敗しました。インターネット接続を確認してください。');
        }
        // リトライ前に少し待機（指数バックオフ）
        const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 5000);
        console.log('⏳ [CSV Upload] Retrying after', delay, 'ms...');
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // その他のエラーは即座にスロー
      throw error;
    }
  }
  
  throw new Error('アップロードに失敗しました');
}

// OCR解析結果の型定義
export interface OCRItem {
  item_name: string;
  quantity: number;
  unit: string;
  storage_location: string | null;
  expiry_date: string | null;
  original_name?: string; // OCRで読み取られた元の名前（変換テーブル登録用）
}

export interface OCRResult {
  success: boolean;
  items: OCRItem[];
  registered_count: number;
  errors: string[];
}

// レシートOCR解析API
export async function analyzeReceiptOCR(imageUri: string): Promise<OCRResult> {
  const apiUrl = `${getApiUrl()}/inventory/ocr-receipt`;
  
  console.log('📤 [OCR] Starting OCR analysis:', { apiUrl, imageUri });

  // 認証トークンを取得
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.access_token) {
    console.error('❌ [OCR] No session token');
    throw new Error('認証トークンが取得できません');
  }

  // リトライ機能を実装
  let retryCount = 0;
  const maxRetries = 3;

  while (retryCount < maxRetries) {
    try {
      console.log('📤 [OCR] Attempt:', retryCount + 1, 'of', maxRetries);

      // FormDataを作成（リトライごとに再作成）
      const formData = new FormData();
      
      // 画像ファイル名を取得（URIから）
      const filename = imageUri.split('/').pop() || 'receipt.jpg';
      
      // 拡張子からMIMEタイプを判定
      const extension = filename.toLowerCase().split('.').pop();
      let mimeType = 'image/jpeg'; // デフォルト
      if (extension === 'png') {
        mimeType = 'image/png';
      } else if (extension === 'jpg' || extension === 'jpeg') {
        mimeType = 'image/jpeg';
      }
      
      // React NativeのFormDataでは、uriをそのまま使用
      // Android/iOSの両方で動作するように、uriをそのまま使用
      formData.append('image', {
        uri: imageUri,
        type: mimeType,
        name: filename,
      } as any);
      
      console.log('📤 [OCR] FormData prepared:', { uri: imageUri, type: mimeType, name: filename });

      // タイムアウト設定（3分）
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 180000);
      });

      const fetchPromise = fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          // Content-TypeはFormDataの場合自動設定されるため指定しない
        },
        body: formData,
      });

      const response = await Promise.race([fetchPromise, timeoutPromise]) as Response;

      console.log('📥 [OCR] Response status:', response.status, response.statusText);

      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorMessage;
          console.error('❌ [OCR] Error response:', errorData);
        } catch (parseError) {
          const errorText = await response.text();
          console.error('❌ [OCR] Error response (text):', errorText);
          errorMessage = errorText || errorMessage;
        }
        
        // 400エラー（Bad Request）の場合は、ユーザーフレンドリーなメッセージに変換
        if (response.status === 400) {
          // 技術的なエラーメッセージをユーザー向けに変換
          if (errorMessage.includes('JSON解析エラー') || 
              errorMessage.includes('Expecting value')) {
            errorMessage = 'レシート画像を選択してください。画像がレシートとして認識できませんでした。';
          }
        }
        
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('✅ [OCR] Success:', result);
      return result;

    } catch (error) {
      retryCount++;
      const errorMessage = error instanceof Error ? error.message : '不明なエラー';
      
      console.error('❌ [OCR] Attempt failed:', retryCount, '/', maxRetries, errorMessage);

      // 400エラー（Bad Request）の場合はリトライしない（クライアント側の問題なので）
      if (errorMessage.includes('レシート画像を選択してください') || 
          errorMessage.includes('HTTP error! status: 400')) {
        throw error;
      }

      // ネットワークエラーの場合のみリトライ
      if (error instanceof TypeError && (error.message === 'Network request failed' || error.message.includes('Network'))) {
        if (retryCount >= maxRetries) {
          throw new Error('ネットワーク接続に失敗しました。インターネット接続を確認してください。');
        }
        // リトライ前に少し待機（指数バックオフ）
        const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 5000);
        console.log('⏳ [OCR] Retrying after', delay, 'ms...');
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // その他のエラーは即座にスロー
      throw error;
    }
  }

  throw new Error('OCR解析に失敗しました');
}

// OCR変換テーブル登録API
export interface OCRMappingResponse {
  success: boolean;
  message: string;
  mapping_id?: string;
}

export async function registerOCRMapping(
  originalName: string,
  normalizedName: string
): Promise<OCRMappingResponse> {
  const apiUrl = `${getApiUrl()}/inventory/ocr-mapping`;
  
  const response = await authenticatedFetch(apiUrl, {
    method: 'POST',
    body: JSON.stringify({
      original_name: originalName,
      normalized_name: normalizedName,
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

  throw new Error('変換テーブルへの登録に失敗しました');
}

