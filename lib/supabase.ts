import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Supabase設定
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

console.log('Supabase設定:', { 
  url: supabaseUrl, 
  hasKey: !!supabaseAnonKey,
  keyLength: supabaseAnonKey?.length 
});

// Supabaseクライアントの作成
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // 適切なセッション管理を有効化
    autoRefreshToken: true,        // トークン自動更新を有効化
    persistSession: true,           // セッション永続化を有効化
    detectSessionInUrl: false,      // URL検出は無効のまま
    // プラットフォーム対応のストレージ設定
    storage: Platform.OS === 'web' ? {
      getItem: (key) => {
        const item = localStorage.getItem(key);
        if (item) {
          try {
            const parsed = JSON.parse(item);
            if (parsed.expires_at && Date.now() > parsed.expires_at * 1000) {
              // 期限切れの場合は削除
              console.log('期限切れトークンを削除:', key);
              localStorage.removeItem(key);
              return null;
            }
          } catch (error) {
            console.error('トークンパースエラー:', error);
            localStorage.removeItem(key);
            return null;
          }
        }
        return item;
      },
      setItem: (key, value) => {
        console.log('トークンを保存:', key.replace(/token|key|password/gi, '***'));
        localStorage.setItem(key, value);
      },
      removeItem: (key) => {
        console.log('トークンを削除:', key.replace(/token|key|password/gi, '***'));
        localStorage.removeItem(key);
      },
    } : {
      // モバイル版ではAsyncStorageを使用
      getItem: async (key) => {
        try {
          const item = await AsyncStorage.getItem(key);
          if (item) {
            const parsed = JSON.parse(item);
            if (parsed.expires_at && Date.now() > parsed.expires_at * 1000) {
              // 期限切れの場合は削除
              console.log('期限切れトークンを削除:', key);
              await AsyncStorage.removeItem(key);
              return null;
            }
          }
          return item;
        } catch (error) {
          console.error('AsyncStorage getItem エラー:', error);
          return null;
        }
      },
      setItem: async (key, value) => {
        try {
          console.log('トークンを保存:', key.replace(/token|key|password/gi, '***'));
          await AsyncStorage.setItem(key, value);
        } catch (error) {
          console.error('AsyncStorage setItem エラー:', error);
        }
      },
      removeItem: async (key) => {
        try {
          console.log('トークンを削除:', key.replace(/token|key|password/gi, '***'));
          await AsyncStorage.removeItem(key);
        } catch (error) {
          console.error('AsyncStorage removeItem エラー:', error);
        }
      },
    },
  },
});

// 型定義（必要に応じて拡張）
export type Database = {
  // データベースの型定義をここに追加
};
