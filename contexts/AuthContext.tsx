import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { showErrorAlert } from '../utils/alert';
import { logAuth, logSession, logStorage, safeLog, LogCategory } from '../lib/logging';

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

  // ロギング初期化
  useEffect(() => {
    safeLog.info(LogCategory.AUTH, 'AuthProvider初期化開始');
  }, []);

  // セッション有効性チェック関数
  const isSessionValid = (session: Session | null) => {
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

  // 無効セッションクリア関数
  const clearInvalidSession = async () => {
    safeLog.info(LogCategory.AUTH, '無効セッションをクリアします');
    setSession(null);
    setUser(null);
    try {
      await supabase.auth.signOut();
      await logSession('clear_invalid_session');
    } catch (error) {
      safeLog.error(LogCategory.AUTH, 'セッションクリアエラー', { error: error.message });
    }
  };

  // セッション強制クリア関数（デバッグ用）
  const clearSession = async () => {
    safeLog.info(LogCategory.AUTH, 'セッションを強制クリアします');
    setSession(null);
    setUser(null);
    
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
      } catch (error) {
        safeLog.error(LogCategory.AUTH, 'AsyncStorageクリアエラー', { error: error.message });
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
        const maskedEmail = session?.user?.email?.replace(/(.{2}).*(@.*)/, '$1***$2');
        safeLog.debug(LogCategory.AUTH, 'Auth state changed', { event, email: maskedEmail });
        
        switch (event) {
          case 'SIGNED_IN':
            if (session && isSessionValid(session)) {
              safeLog.info(LogCategory.AUTH, 'ログイン成功', { email: maskedEmail });
              setSession(session);
              setUser(session.user);
            } else {
              safeLog.warn(LogCategory.AUTH, '無効なログインセッション');
              await clearInvalidSession();
            }
            break;
            
          case 'SIGNED_OUT':
            safeLog.info(LogCategory.AUTH, 'ユーザーがログアウトしました');
            setSession(null);
            setUser(null);
            break;
            
          case 'TOKEN_REFRESHED':
            if (session && isSessionValid(session)) {
              safeLog.info(LogCategory.AUTH, 'トークン更新成功', { email: maskedEmail });
              setSession(session);
              setUser(session.user);
            } else {
              safeLog.warn(LogCategory.AUTH, '無効な更新トークン');
              await clearInvalidSession();
            }
            break;
            
          case 'USER_UPDATED':
            if (session?.user) {
              safeLog.info(LogCategory.AUTH, 'ユーザー情報更新', { email: maskedEmail });
              setUser(session.user);
            }
            break;
            
          default:
            safeLog.debug(LogCategory.AUTH, 'その他の認証イベント', { event });
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
    const timer = safeLog.timer('sign-in');
    try {
      safeLog.info(LogCategory.AUTH, 'サインイン処理開始', { email: email.replace(/(.{2}).*(@.*)/, '$1***$2') });
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        await logAuth('signin', email, false, { error: error.message });
        safeLog.error(LogCategory.AUTH, 'サインイン失敗', { error: error.message });
      } else {
        await logAuth('signin', email, true);
        safeLog.info(LogCategory.AUTH, 'サインイン成功');
      }
      
      timer();
      return { error };
    } catch (error) {
      await logAuth('signin', email, false, { error: error.message });
      safeLog.error(LogCategory.AUTH, 'サインイン処理エラー', { error: error.message });
      timer();
      return { error };
    }
  };

  // サインアップ関数
  const signUp = async (email: string, password: string) => {
    const timer = safeLog.timer('sign-up');
    try {
      safeLog.info(LogCategory.AUTH, 'サインアップ処理開始', { email: email.replace(/(.{2}).*(@.*)/, '$1***$2') });
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (error) {
        await logAuth('signup', email, false, { error: error.message });
        safeLog.error(LogCategory.AUTH, 'サインアップ失敗', { error: error.message });
      } else {
        await logAuth('signup', email, true);
        safeLog.info(LogCategory.AUTH, 'サインアップ成功');
      }
      
      timer();
      return { error };
    } catch (error) {
      await logAuth('signup', email, false, { error: error.message });
      safeLog.error(LogCategory.AUTH, 'サインアップ処理エラー', { error: error.message });
      timer();
      return { error };
    }
  };

  // Google認証関数
  const signInWithGoogle = async () => {
    const timer = safeLog.timer('google-signin');
    try {
      safeLog.info(LogCategory.AUTH, 'Google認証処理開始');
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
      });
      
      if (error) {
        await logAuth('google_signin', undefined, false, { error: error.message });
        safeLog.error(LogCategory.AUTH, 'Google認証失敗', { error: error.message });
      } else {
        await logAuth('google_signin', undefined, true);
        safeLog.info(LogCategory.AUTH, 'Google認証成功');
      }
      
      timer();
      return { error };
    } catch (error) {
      await logAuth('google_signin', undefined, false, { error: error.message });
      safeLog.error(LogCategory.AUTH, 'Google認証処理エラー', { error: error.message });
      timer();
      return { error };
    }
  };

  // サインアウト関数
  const signOut = async () => {
    const timer = safeLog.timer('sign-out');
    try {
      safeLog.info(LogCategory.AUTH, 'サインアウト処理開始');
      
      // まず状態を即座にクリア（エラーが出てもログアウトを確実に実行）
      setSession(null);
      setUser(null);
      
      // Supabaseのサインアウトを試みる
      const { error } = await supabase.auth.signOut();
      if (error) {
        safeLog.warn(LogCategory.AUTH, 'Supabaseサインアウトエラー（状態はクリア済み）', { error: error.message });
        // エラーが出てもローカルストレージをクリア
        try {
          await AsyncStorage.removeItem('supabase.auth.token');
          await AsyncStorage.clear(); // 全クリア
        } catch (storageError) {
          safeLog.error(LogCategory.AUTH, 'ストレージクリアエラー', { error: storageError.message });
        }
        // エラーを表示するがログアウトは完了
        // showErrorAlert(`ログアウトに失敗しましたが、ローカルセッションはクリアされました`);
      }
      
      await logAuth('signout', user?.email, true);
      await logSession('signout', 'cleared');
      safeLog.info(LogCategory.AUTH, 'ログアウト成功');
      timer();
    } catch (error) {
      safeLog.error(LogCategory.AUTH, 'サインアウトで予期しないエラー', { error: error.message });
      // エラーが出てもセッションをクリア
      setSession(null);
      setUser(null);
      // showErrorAlert('ログアウトに失敗しましたが、ローカルセッションはクリアされました');
      timer();
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
