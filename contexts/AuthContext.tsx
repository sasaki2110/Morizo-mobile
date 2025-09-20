import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { showErrorAlert } from '../utils/alert';

// 認証コンテキストの型定義
interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  initialized: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  clearSession: () => void;
}

// コンテキストの作成
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// プロバイダーコンポーネント
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  // セッション有効性チェック関数
  const isSessionValid = (session: Session | null) => {
    if (!session?.access_token || !session?.expires_at) return false;
    
    // 有効期限チェック（5分のマージンを設ける）
    const now = Date.now() / 1000;
    const expiresAt = session.expires_at;
    const margin = 5 * 60; // 5分
    
    const isValid = expiresAt > (now + margin);
    console.log('セッション有効性チェック:', { 
      expiresAt, 
      now, 
      margin, 
      isValid 
    });
    
    return isValid;
  };

  // 無効セッションクリア関数
  const clearInvalidSession = async () => {
    console.log('無効セッションをクリアします');
    setSession(null);
    setUser(null);
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('セッションクリアエラー:', error);
    }
  };

  // セッション強制クリア関数（デバッグ用）
  const clearSession = async () => {
    console.log('セッションを強制クリアします');
    setSession(null);
    setUser(null);
    
    // プラットフォーム対応のストレージクリア
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      localStorage.removeItem('sb-pidcexsxgyfsnosglzjt-auth-token');
      localStorage.removeItem('supabase.auth.token');
    } else {
      // モバイル版ではAsyncStorageをクリア
      try {
        await AsyncStorage.removeItem('sb-pidcexsxgyfsnosglzjt-auth-token');
        await AsyncStorage.removeItem('supabase.auth.token');
        console.log('AsyncStorageからセッションをクリアしました');
      } catch (error) {
        console.error('AsyncStorageクリアエラー:', error);
      }
    }
  };

  useEffect(() => {
    // 初期セッションの取得
    const getInitialSession = async () => {
      try {
        console.log('初期セッション取得開始...');
        
        const { data: { session }, error } = await supabase.auth.getSession();
        
        console.log('初期セッション取得結果:', { session, error });
        
        if (error) {
          console.error('初期セッション取得エラー:', error);
          showErrorAlert(`認証エラー: ${error.message}`);
          await clearInvalidSession();
          setInitialized(true);
          setLoading(false);
          return;
        }
        
        // セッションの有効性をチェック
        if (session && isSessionValid(session)) {
          console.log('有効なセッションを設定:', session.user?.email);
          console.log('セッション詳細:', {
            expires_at: session.expires_at,
            expires_in: session.expires_in,
            access_token_length: session.access_token?.length
          });
          setSession(session);
          setUser(session.user);
        } else {
          console.log('無効なセッションをクリア');
          await clearInvalidSession();
        }
        
        setInitialized(true);
        setLoading(false);
        
        console.log('認証状態設定完了:', { 
          hasSession: !!session, 
          hasUser: !!session?.user,
          userEmail: session?.user?.email 
        });
      } catch (error) {
        console.error('初期セッション取得で予期しないエラー:', error);
        showErrorAlert('認証の初期化に失敗しました');
        await clearInvalidSession();
        setInitialized(true);
        setLoading(false);
      }
    };

    getInitialSession();

    // 認証状態の変更を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        console.log('Session:', session);
        
        switch (event) {
          case 'SIGNED_IN':
            if (session && isSessionValid(session)) {
              console.log('ログイン成功:', session.user?.email);
              setSession(session);
              setUser(session.user);
            } else {
              console.log('無効なログインセッション');
              await clearInvalidSession();
            }
            break;
            
          case 'SIGNED_OUT':
            console.log('ユーザーがログアウトしました');
            setSession(null);
            setUser(null);
            break;
            
          case 'TOKEN_REFRESHED':
            if (session && isSessionValid(session)) {
              console.log('トークン更新成功:', session.user?.email);
              setSession(session);
              setUser(session.user);
            } else {
              console.log('無効な更新トークン');
              await clearInvalidSession();
            }
            break;
            
          case 'USER_UPDATED':
            if (session?.user) {
              console.log('ユーザー情報更新:', session.user.email);
              setUser(session.user);
            }
            break;
            
          default:
            console.log('その他の認証イベント:', event);
            if (session && isSessionValid(session)) {
              setSession(session);
              setUser(session.user);
            } else {
              setSession(null);
              setUser(null);
            }
        }
        
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // サインイン関数
  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  // サインアップ関数
  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { error };
  };

  // Google認証関数
  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
    });
    return { error };
  };

  // サインアウト関数
  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('サインアウトエラー:', error);
        showErrorAlert(`ログアウトに失敗しました: ${error.message}`);
        return;
      }
      // ログアウト成功時は状態を即座にクリア
      setSession(null);
      setUser(null);
      console.log('ログアウト成功');
    } catch (error) {
      console.error('サインアウトで予期しないエラー:', error);
      showErrorAlert('ログアウトに失敗しました');
    }
  };

  const value: AuthContextType = {
    session,
    user,
    loading,
    initialized,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    clearSession,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// カスタムフック
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
