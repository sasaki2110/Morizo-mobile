import { Session } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../supabase';
import { logSession, logStorage, safeLog, LogCategory } from '../logging';

/**
 * セッションの有効性をチェック
 * @param session チェックするセッション
 * @returns セッションが有効な場合true
 */
export const isSessionValid = (session: Session | null): boolean => {
  if (!session?.access_token || !session?.expires_at) return false;
  
  // 有効期限チェック（5分のマージンを設ける）
  const now = Date.now() / 1000;
  const expiresAt = session.expires_at;
  const margin = 5 * 60; // 5分
  
  const isValid = expiresAt > (now + margin);
  
  // ログ出力
  safeLog.debug(LogCategory.AUTH, 'セッション有効性チェック', { 
    expiresAt, 
    now, 
    margin, 
    isValid 
  });
  
  return isValid;
};

/**
 * 無効なセッションをクリア
 * 注意: この関数は状態更新を行わないため、呼び出し元で状態を更新する必要があります
 */
export const clearInvalidSession = async (): Promise<void> => {
  safeLog.info(LogCategory.AUTH, '無効セッションをクリアします');
  try {
    await supabase.auth.signOut();
    await logSession('clear_invalid_session');
  } catch (error: any) {
    safeLog.error(LogCategory.AUTH, 'セッションクリアエラー', { error: error.message });
  }
};

/**
 * セッションを強制クリア（デバッグ用）
 * 注意: この関数は状態更新を行わないため、呼び出し元で状態を更新する必要があります
 */
export const clearSession = async (): Promise<void> => {
  safeLog.info(LogCategory.AUTH, 'セッションを強制クリアします');
  
  // プラットフォーム対応のストレージクリア
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    localStorage.removeItem('sb-pidcexsxgyfsnosglzjt-auth-token');
    localStorage.removeItem('supabase.auth.token');
    await logStorage('clear_localStorage', 'auth-token');
  } else {
    // モバイル版ではAsyncStorageをクリア
    try {
      await AsyncStorage.removeItem('sb-pidcexsxgyfsnosglzjt-auth-token');
      await AsyncStorage.removeItem('supabase.auth.token');
      await logStorage('clear_AsyncStorage', 'auth-token');
      safeLog.info(LogCategory.AUTH, 'AsyncStorageからセッションをクリアしました');
    } catch (error: any) {
      safeLog.error(LogCategory.AUTH, 'AsyncStorageクリアエラー', { error: error.message });
    }
  }
};

