import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { supabase } from '../lib/supabase';
import { showErrorAlert } from '../utils/alert';
import { logAuth, logSession, logStorage, safeLog, LogCategory } from '../lib/logging';

// WebBrowserをクリーンアップ（メモリリーク防止）
WebBrowser.maybeCompleteAuthSession();

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
        safeLog.info(LogCategory.AUTH, 'Auth state changed', { 
          event, 
          email: maskedEmail,
          hasSession: !!session,
          userId: session?.user?.id,
          sessionValid: session ? isSessionValid(session) : false
        });
        
        switch (event) {
          case 'SIGNED_IN':
            if (session && isSessionValid(session)) {
              safeLog.info(LogCategory.AUTH, 'ログイン成功（onAuthStateChange）', { 
                email: maskedEmail,
                userId: session.user?.id
              });
              setSession(session);
              setUser(session.user);
            } else {
              safeLog.warn(LogCategory.AUTH, '無効なログインセッション', {
                hasSession: !!session,
                isValid: session ? isSessionValid(session) : false
              });
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

  // Deep Linking処理：OAuth認証後のリダイレクトURLを処理
  useEffect(() => {
    if (Platform.OS === 'web') {
      // Web版ではDeep Linkingは不要（通常のリダイレクトを使用）
      return;
    }

    // リダイレクトURLからトークンを抽出してセッションを設定する関数
    const handleAuthCallback = async (url: string) => {
      safeLog.info(LogCategory.AUTH, 'Deep Linking: 認証コールバックURL受信', { url });
      
      // morizo-mobile://auth/callback で始まるURLか確認
      if (!url.startsWith('morizo-mobile://auth/callback')) {
        safeLog.debug(LogCategory.AUTH, 'Deep Linking: 認証コールバック以外のURL', { url });
        return;
      }

      try {
        safeLog.info(LogCategory.AUTH, 'Deep Linking: 認証コールバックURL処理開始');
        
        // URLからアクセストークンとリフレッシュトークンを抽出
        let accessToken: string | null = null;
        let refreshToken: string | null = null;
        
        try {
          // URLコンストラクタを使用（React Nativeでも動作する場合がある）
          const urlObj = new URL(url);
          accessToken = urlObj.searchParams.get('access_token');
          refreshToken = urlObj.searchParams.get('refresh_token');
          
          // ハッシュ（#）からも取得を試みる（SupabaseのOAuthでは通常フラグメントを使用）
          if (!accessToken || !refreshToken) {
            const hash = urlObj.hash.substring(1); // #を削除
            const hashParams = new URLSearchParams(hash);
            accessToken = accessToken || hashParams.get('access_token');
            refreshToken = refreshToken || hashParams.get('refresh_token');
          }
        } catch (error) {
          // URLコンストラクタが失敗した場合、手動でパース
          safeLog.debug(LogCategory.AUTH, 'Deep Linking: URLコンストラクタ失敗、手動パースを試行');
          
          // クエリパラメータから取得
          const queryMatch = url.match(/[?&]access_token=([^&]+)/);
          const refreshMatch = url.match(/[?&]refresh_token=([^&]+)/);
          accessToken = queryMatch ? decodeURIComponent(queryMatch[1]) : null;
          refreshToken = refreshMatch ? decodeURIComponent(refreshMatch[1]) : null;
          
          // フラグメント（#）からも取得を試みる
          if (!accessToken || !refreshToken) {
            const hashMatch = url.match(/#access_token=([^&]+).*refresh_token=([^&]+)/);
            if (hashMatch) {
              accessToken = decodeURIComponent(hashMatch[1]);
              refreshToken = decodeURIComponent(hashMatch[2]);
            }
          }
        }
        
        safeLog.info(LogCategory.AUTH, 'Deep Linking: トークン抽出結果', {
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken,
          accessTokenLength: accessToken?.length || 0,
          refreshTokenLength: refreshToken?.length || 0
        });
        
        if (accessToken && refreshToken) {
          // セッションを設定
          const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          
          if (sessionError) {
            safeLog.error(LogCategory.AUTH, 'Deep Linking: セッション設定失敗', { 
              error: sessionError.message 
            });
            await logAuth('google_signin', undefined, false, { 
              error: `セッション設定失敗: ${sessionError.message}` 
            });
            return;
          }
          
          if (sessionData.session) {
            safeLog.info(LogCategory.AUTH, 'Deep Linking: セッション設定成功', {
              userId: sessionData.session.user?.id,
              email: sessionData.session.user?.email?.replace(/(.{2}).*(@.*)/, '$1***$2')
            });
            await logAuth('google_signin', undefined, true);
            // セッションはonAuthStateChangeで自動的に設定される
          }
        } else {
          safeLog.warn(LogCategory.AUTH, 'Deep Linking: URLからトークンを抽出できませんでした', {
            urlPreview: url.substring(0, 200)
          });
          // トークンが取得できない場合でも、Supabaseが自動的にセッションを検出する可能性がある
          // 少し待ってからセッションを確認
          setTimeout(async () => {
            const { data: { session: currentSession } } = await supabase.auth.getSession();
            if (currentSession && isSessionValid(currentSession)) {
              safeLog.info(LogCategory.AUTH, 'Deep Linking: セッション検出成功（フォールバック）');
              await logAuth('google_signin', undefined, true);
            }
          }, 1000);
        }
      } catch (error) {
        safeLog.error(LogCategory.AUTH, 'Deep Linking: 認証コールバック処理エラー', {
          error: error.message,
          urlPreview: url.substring(0, 200)
        });
      }
    };

    // アプリ起動時にURLをチェック（OAuth認証後、アプリが再起動された場合）
    Linking.getInitialURL().then((url) => {
      if (url) {
        safeLog.info(LogCategory.AUTH, 'Deep Linking: 起動時URL検出', { url });
        handleAuthCallback(url);
      }
    }).catch((error) => {
      safeLog.warn(LogCategory.AUTH, 'Deep Linking: 起動時URL取得エラー', { 
        error: error.message 
      });
    });

    // URL変更をリッスン（OAuth認証中、アプリが既に起動している場合）
    const subscription = Linking.addEventListener('url', (event) => {
      safeLog.info(LogCategory.AUTH, 'Deep Linking: URL変更イベント受信', { url: event.url });
      handleAuthCallback(event.url);
    });

    return () => {
      subscription.remove();
    };
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

  // URLからトークンを抽出してセッションを設定する共通関数
  const extractTokensAndSetSession = async (
    url: string,
    source: string
  ): Promise<{ success: boolean; session?: Session; error?: string }> => {
    safeLog.info(LogCategory.AUTH, `トークン抽出開始（${source}）`, {
      urlPreview: url.substring(0, 100)
    });
    
    let accessToken: string | null = null;
    let refreshToken: string | null = null;
    
    try {
      // まずURLコンストラクタを試す
      const urlObj = new URL(url);
      accessToken = urlObj.searchParams.get('access_token');
      refreshToken = urlObj.searchParams.get('refresh_token');
    } catch (error) {
      // URLコンストラクタが失敗した場合、手動でパース
      safeLog.debug(LogCategory.AUTH, 'URLコンストラクタ失敗、手動パースを試行');
      
      // クエリパラメータから取得を試みる
      const queryMatch = url.match(/[?&]access_token=([^&]+)/);
      const refreshMatch = url.match(/[?&]refresh_token=([^&]+)/);
      accessToken = queryMatch ? decodeURIComponent(queryMatch[1]) : null;
      refreshToken = refreshMatch ? decodeURIComponent(refreshMatch[1]) : null;
    }
    
    // フラグメント（#）からも取得を試みる（SupabaseのOAuthでは通常フラグメントを使用）
    if (!accessToken || !refreshToken) {
      const hashMatch = url.match(/#access_token=([^&]+).*refresh_token=([^&]+)/);
      if (hashMatch) {
        accessToken = decodeURIComponent(hashMatch[1]);
        refreshToken = decodeURIComponent(hashMatch[2]);
        safeLog.debug(LogCategory.AUTH, 'フラグメントからトークンを取得');
      }
    }
    
    if (accessToken && refreshToken) {
      safeLog.info(LogCategory.AUTH, 'トークン抽出成功、セッションを設定');
      const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      
      if (sessionError) {
        safeLog.error(LogCategory.AUTH, 'セッション設定失敗', { error: sessionError.message });
        return { success: false, error: sessionError.message };
      }
      
      if (sessionData.session) {
        safeLog.info(LogCategory.AUTH, `セッション設定成功（${source}）`);
        return { success: true, session: sessionData.session };
      }
      
      return { success: false, error: 'セッションが返されませんでした' };
    } else {
      safeLog.warn(LogCategory.AUTH, 'URLからトークンを抽出できませんでした', {
        urlPreview: url.substring(0, 200)
      });
      return { success: false, error: 'トークンが見つかりませんでした' };
    }
  };

  // Google認証関数
  const signInWithGoogle = async () => {
    const timer = safeLog.timer('google-signin');
    try {
      safeLog.info(LogCategory.AUTH, 'Google認証処理開始');
      
      // Web版の場合は通常のOAuthフローを使用
      if (Platform.OS === 'web') {
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
      }
      
      // モバイル版の場合はexpo-auth-sessionを使用
      // Expo Goを使用している場合は、プロキシを使用する必要がある可能性がある
      // まず、useProxy: falseでカスタムスキームを試す
      const redirectTo = AuthSession.makeRedirectUri({
        scheme: 'morizo-mobile',
        path: 'auth/callback',
        useProxy: false, // カスタムスキームを使用
      });
      
      // カスタムスキームが使えない場合は、固定のURLを使用
      let finalRedirectTo = redirectTo.startsWith('morizo-mobile://') 
        ? redirectTo 
        : 'morizo-mobile://auth/callback';
      
      // Expo Goを使用している場合（exp://で始まるURLが返された場合）、プロキシを使用
      if (redirectTo.startsWith('exp://')) {
        safeLog.info(LogCategory.AUTH, 'Expo Go検出: プロキシモードを使用');
        const proxyRedirectTo = AuthSession.makeRedirectUri({
          useProxy: true, // Expo Goのプロキシを使用
        });
        finalRedirectTo = proxyRedirectTo;
        safeLog.info(LogCategory.AUTH, 'プロキシリダイレクトURL生成', {
          original: redirectTo,
          proxy: proxyRedirectTo,
          final: finalRedirectTo
        });
      }
      
      safeLog.info(LogCategory.AUTH, 'OAuthリダイレクトURL生成', { 
        redirectTo: finalRedirectTo,
        originalRedirectTo: redirectTo,
        platform: Platform.OS,
        scheme: 'morizo-mobile',
        useProxy: finalRedirectTo.startsWith('exp://')
      });
      
      // Supabase側に明示的にリダイレクトURLを指定
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: finalRedirectTo, // カスタムスキームを使用
          skipBrowserRedirect: true, // ブラウザリダイレクトをスキップ
        },
      });
      
      // OAuth URLをログに出力（デバッグ用 - 完全なURLを表示）
      if (data?.url) {
        let redirectParam: string | null = null;
        try {
          // redirectToパラメータがURLに含まれているか確認
          const urlObj = new URL(data.url);
          redirectParam = urlObj.searchParams.get('redirect_to');
        } catch (error) {
          // URLパース失敗時は手動で検索
          const match = data.url.match(/[?&]redirect_to=([^&]+)/);
          redirectParam = match ? decodeURIComponent(match[1]) : null;
        }
        safeLog.info(LogCategory.AUTH, 'OAuth URL生成成功', { 
          oauthUrl: data.url, // 完全なURLを表示
          redirectToInParams: redirectParam,
          expectedRedirectTo: finalRedirectTo,
          matches: redirectParam === finalRedirectTo || redirectParam === encodeURIComponent(finalRedirectTo)
        });
      }
      
      if (oauthError || !data?.url) {
        const errorMessage = oauthError?.message || 'OAuth URL取得失敗';
        await logAuth('google_signin', undefined, false, { error: errorMessage });
        safeLog.error(LogCategory.AUTH, 'Google認証URL取得失敗', { error: errorMessage });
        timer();
        return { error: oauthError || new Error(errorMessage) };
      }
      
      // ブラウザで認証画面を開く
      // 注意: redirectUrlにはfinalRedirectTo（morizo-mobile://auth/callback）を指定
      safeLog.info(LogCategory.AUTH, 'ブラウザで認証画面を開く', {
        oauthUrl: data.url,
        redirectUrl: finalRedirectTo
      });
      
      // WebBrowser.openAuthSessionAsyncを実行（非同期で処理）
      // 注意: このPromiseは完了するまで待機するが、Deep Linkingで処理される場合もある
      safeLog.info(LogCategory.AUTH, 'WebBrowser.openAuthSessionAsync実行開始');
      const browserPromise = Promise.race([
        WebBrowser.openAuthSessionAsync(
          data.url,
          finalRedirectTo, // カスタムスキームを使用
          {
            preferEphemeralSession: false, // iOSでセッションを保持
          }
        ).then((result) => {
          safeLog.info(LogCategory.AUTH, 'WebBrowser.openAuthSessionAsync完了', {
            type: result.type,
            hasUrl: !!result.url,
            urlPreview: result.url ? result.url.substring(0, 100) : 'none'
          });
          return result;
        }).catch((error) => {
          safeLog.error(LogCategory.AUTH, 'WebBrowser.openAuthSessionAsyncエラー', {
            error: error.message
          });
          throw error;
        }),
        new Promise<{ type: 'timeout' }>((resolve) => {
          setTimeout(() => {
            safeLog.warn(LogCategory.AUTH, 'WebBrowser.openAuthSessionAsyncタイムアウト（60秒）');
            resolve({ type: 'timeout' as const });
          }, 60000); // 60秒でタイムアウト
        })
      ]);
      
      // セッション検出用のフラグ
      let sessionDetected = false;
      let sessionCheckInterval: NodeJS.Timeout | null = null;
      let sessionCheckTimeout: NodeJS.Timeout | null = null;
      
      // セッション検出のためのポーリング（0.5秒ごと）
      let pollCount = 0;
      const sessionPromise = new Promise<{ session: Session | null; detected: boolean }>((resolve) => {
        // 初期ログ
        safeLog.info(LogCategory.AUTH, 'セッション検出ポーリング開始', {
          interval: '500ms',
          timeout: '30s'
        });
        
        // 即座に1回チェック
        (async () => {
          try {
            pollCount++;
            safeLog.info(LogCategory.AUTH, 'セッション検出ポーリング（初期チェック開始）', { pollCount });
            const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
            safeLog.info(LogCategory.AUTH, 'セッション検出ポーリング（初期チェック完了）', {
              pollCount,
              hasSession: !!currentSession,
              error: sessionError?.message,
              isValid: currentSession ? isSessionValid(currentSession) : false
            });
            
            if (currentSession && isSessionValid(currentSession)) {
              safeLog.info(LogCategory.AUTH, 'セッションを検出しました（初期チェック）', {
                pollCount,
                userId: currentSession.user?.id,
                email: currentSession.user?.email?.replace(/(.{2}).*(@.*)/, '$1***$2')
              });
              if (sessionCheckInterval) clearInterval(sessionCheckInterval);
              if (sessionCheckTimeout) clearTimeout(sessionCheckTimeout);
              sessionDetected = true;
              resolve({ session: currentSession, detected: true });
              return;
            }
          } catch (error) {
            safeLog.error(LogCategory.AUTH, 'セッション検出ポーリング（初期チェック）エラー', {
              error: error.message,
              pollCount
            });
          }
        })();
        
        sessionCheckInterval = setInterval(async () => {
          try {
            pollCount++;
            const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
            
            // ログを出力（最初の5回はINFO、その後は10回ごとにINFO、それ以外はDEBUG）
            if (pollCount <= 5 || pollCount % 10 === 0) {
              safeLog.info(LogCategory.AUTH, 'セッション検出ポーリング', {
                pollCount,
                hasSession: !!currentSession,
                isValid: currentSession ? isSessionValid(currentSession) : false,
                error: sessionError?.message
              });
            } else {
              safeLog.debug(LogCategory.AUTH, 'セッション検出ポーリング', {
                pollCount,
                hasSession: !!currentSession,
                isValid: currentSession ? isSessionValid(currentSession) : false,
                error: sessionError?.message
              });
            }
            
            if (currentSession && isSessionValid(currentSession)) {
              safeLog.info(LogCategory.AUTH, 'セッションを検出しました（ポーリング）', {
                pollCount,
                userId: currentSession.user?.id,
                email: currentSession.user?.email?.replace(/(.{2}).*(@.*)/, '$1***$2')
              });
              if (sessionCheckInterval) clearInterval(sessionCheckInterval);
              if (sessionCheckTimeout) clearTimeout(sessionCheckTimeout);
              sessionDetected = true;
              resolve({ session: currentSession, detected: true });
            }
          } catch (error) {
            safeLog.error(LogCategory.AUTH, 'セッション検出ポーリングエラー', {
              error: error.message,
              pollCount
            });
          }
        }, 500); // 0.5秒ごとにチェック
        
        // 30秒後にタイムアウト
        sessionCheckTimeout = setTimeout(() => {
          safeLog.warn(LogCategory.AUTH, 'セッション検出タイムアウト（30秒）', {
            pollCount,
            sessionDetected
          });
          if (sessionCheckInterval) clearInterval(sessionCheckInterval);
          resolve({ session: null, detected: false });
        }, 30000);
      });
      
      // 並行して処理：セッション検出とブラウザ結果を待つ
      // 注意: セッション検出ポーリングは継続して動作し、Deep Linkingでも処理される
      safeLog.info(LogCategory.AUTH, '認証フロー開始: セッション検出とブラウザ結果を待機中');
      
      // まず、どちらかが完了するまで待つ（最大10秒でタイムアウト）
      // 注意: WebBrowser.openAuthSessionAsyncは長時間待機する可能性があるため、タイムアウトを長めに設定
      let raceResult: { type: 'session' | 'browser' | 'timeout'; result?: any } | null = null;
      try {
        safeLog.info(LogCategory.AUTH, 'Promise.race開始: セッション検出とブラウザ結果を待機（タイムアウト10秒）');
        
        const racePromise = Promise.race([
          sessionPromise.then(result => {
            safeLog.info(LogCategory.AUTH, 'Promise.race: セッション検出結果を受信', { detected: result.detected });
            return { type: 'session' as const, result };
          }).catch(error => {
            safeLog.error(LogCategory.AUTH, 'Promise.race: セッション検出エラー', { error: error.message });
            throw error;
          }),
          browserPromise.then(result => {
            safeLog.info(LogCategory.AUTH, 'Promise.race: ブラウザ結果を受信', { 
              type: result && typeof result === 'object' && 'type' in result ? result.type : 'unknown' 
            });
            return { type: 'browser' as const, result };
          }).catch(error => {
            safeLog.error(LogCategory.AUTH, 'Promise.race: ブラウザエラー', { error: error.message });
            throw error;
          }),
          new Promise<{ type: 'timeout' }>((resolve) => {
            setTimeout(() => {
              safeLog.warn(LogCategory.AUTH, '認証フロー: Promise.raceタイムアウト（10秒）- ポーリングとブラウザを継続');
              resolve({ type: 'timeout' as const });
            }, 10000); // 10秒でタイムアウト
          })
        ]);
        
        raceResult = await racePromise;
        safeLog.info(LogCategory.AUTH, '認証フロー: 最初の結果受信', { 
          type: raceResult.type,
          sessionDetected: raceResult.type === 'session' && raceResult.result ? raceResult.result.detected : false
        });
      } catch (error) {
        safeLog.error(LogCategory.AUTH, '認証フロー: Promise.raceエラー', { error: error.message });
        // エラーが発生しても、ポーリングとブラウザ結果を待つ
        raceResult = { type: 'timeout' as const };
      }
      
      // タイムアウトの場合は、まずセッションを確認してから継続処理を判断
      if (raceResult && raceResult.type === 'timeout') {
        safeLog.info(LogCategory.AUTH, '認証フロー: Promise.raceタイムアウト（10秒）- セッションを確認');
        // 即座にセッションを確認（Deep Linkingで既に設定されている可能性がある）
        const { data: { session: timeoutSession } } = await supabase.auth.getSession();
        if (timeoutSession && isSessionValid(timeoutSession)) {
          safeLog.info(LogCategory.AUTH, 'タイムアウト後、セッションを検出しました（即座に確認）');
          if (sessionCheckInterval) clearInterval(sessionCheckInterval);
          if (sessionCheckTimeout) clearTimeout(sessionCheckTimeout);
          await logAuth('google_signin', undefined, true);
          timer();
          return { error: null };
        }
        safeLog.info(LogCategory.AUTH, '認証フロー: タイムアウト後の継続処理（セッション未検出）');
        raceResult = null; // リセットして、後続の処理に進む
      }
      
      // セッションが既に検出されている場合
      if (raceResult && raceResult.type === 'session' && raceResult.result && raceResult.result.detected && raceResult.result.session) {
        safeLog.info(LogCategory.AUTH, 'セッション検出で認証成功', {
          sessionDetected: true,
          pollCount
        });
        // ポーリングとタイムアウトをクリーンアップ
        if (sessionCheckInterval) clearInterval(sessionCheckInterval);
        if (sessionCheckTimeout) clearTimeout(sessionCheckTimeout);
        await logAuth('google_signin', undefined, true);
        timer();
        return { error: null };
      }
      
      // ブラウザ結果が先に来た場合、URLからトークンを抽出してセッションを設定
      if (raceResult && raceResult.type === 'browser') {
        const browserResult = raceResult.result;
        safeLog.info(LogCategory.AUTH, 'ブラウザ結果が先に返りました', {
          type: browserResult && typeof browserResult === 'object' && 'type' in browserResult ? browserResult.type : 'unknown',
          hasUrl: browserResult && typeof browserResult === 'object' && 'url' in browserResult ? !!browserResult.url : false
        });
        
        // successタイプでURLが含まれている場合、URLからトークンを抽出してセッションを設定
        if (browserResult && typeof browserResult === 'object' && 'type' in browserResult && browserResult.type === 'success' && 'url' in browserResult && browserResult.url) {
          safeLog.info(LogCategory.AUTH, 'ブラウザ結果からURLを取得、トークン抽出開始', {
            urlPreview: browserResult.url.substring(0, 100)
          });
          
          const result = browserResult as { type: 'success'; url: string };
          
          // 共通関数を使用してトークンを抽出してセッションを設定
          const tokenResult = await extractTokensAndSetSession(result.url, 'ブラウザ結果');
          
          if (tokenResult.success && tokenResult.session) {
            if (sessionCheckInterval) clearInterval(sessionCheckInterval);
            if (sessionCheckTimeout) clearTimeout(sessionCheckTimeout);
            await logAuth('google_signin', undefined, true);
            timer();
            return { error: null };
          }
          
          // トークン抽出失敗時はログのみ（既にログは出力されている）
        }
        
        // トークン抽出に失敗した場合、セッション検出を少し待つ（Deep Linking経由で設定された可能性）
        safeLog.info(LogCategory.AUTH, 'セッション検出を待機（ブラウザ結果処理後）');
        await new Promise(resolve => setTimeout(resolve, 1000));
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (currentSession && isSessionValid(currentSession)) {
          safeLog.info(LogCategory.AUTH, 'セッション検出成功（ブラウザ結果後）');
          if (sessionCheckInterval) clearInterval(sessionCheckInterval);
          if (sessionCheckTimeout) clearTimeout(sessionCheckTimeout);
          await logAuth('google_signin', undefined, true);
          timer();
          return { error: null };
        }
        
        // セッションが見つからない場合のみ、フォールバック処理に進む
        safeLog.info(LogCategory.AUTH, 'セッション未検出のため、フォールバック処理に進みます');
      }
      
      // フォールバック処理: ブラウザ結果でトークン抽出に失敗した場合のみ実行
      // 最大10秒でタイムアウト（ブラウザ結果は既に取得済みの可能性があるため短縮）
      safeLog.info(LogCategory.AUTH, '認証フロー: フォールバック処理開始 - ブラウザとセッション結果を待機（タイムアウト10秒）');
      let browserResult: any = null;
      let sessionResult: { session: Session | null; detected: boolean } | null = null;
      
      try {
        const allResultsPromise = Promise.all([
          browserPromise,
          sessionPromise
        ]);
        
        const timeoutPromise = new Promise<{ type: 'timeout' }>((resolve) => {
          setTimeout(() => {
            safeLog.warn(LogCategory.AUTH, '認証フロー: Promise.allタイムアウト（10秒）');
            resolve({ type: 'timeout' as const });
          }, 10000); // 15秒から10秒に短縮（ブラウザ結果は既に取得済みの可能性が高い）
        });
        
        const allResults = await Promise.race([
          allResultsPromise.then(([browser, session]) => ({ type: 'success' as const, browser, session })),
          timeoutPromise
        ]);
        
        if (allResults.type === 'success') {
          browserResult = allResults.browser;
          sessionResult = allResults.session;
          safeLog.info(LogCategory.AUTH, '認証フロー: すべての結果を取得');
        } else {
          safeLog.warn(LogCategory.AUTH, '認証フロー: タイムアウト - 現在の状態を確認');
          // タイムアウトした場合でも、現在のセッションを確認
          const { data: { session: currentSession } } = await supabase.auth.getSession();
          if (currentSession && isSessionValid(currentSession)) {
            safeLog.info(LogCategory.AUTH, 'タイムアウト後、セッションを検出しました');
            if (sessionCheckInterval) clearInterval(sessionCheckInterval);
            if (sessionCheckTimeout) clearTimeout(sessionCheckTimeout);
            await logAuth('google_signin', undefined, true);
            timer();
            return { error: null };
          }
        }
      } catch (error) {
        safeLog.error(LogCategory.AUTH, '認証フロー: Promise.allエラー', { error: error.message });
        // エラーが発生しても、現在のセッションを確認
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (currentSession && isSessionValid(currentSession)) {
          safeLog.info(LogCategory.AUTH, 'エラー後、セッションを検出しました');
          if (sessionCheckInterval) clearInterval(sessionCheckInterval);
          if (sessionCheckTimeout) clearTimeout(sessionCheckTimeout);
          await logAuth('google_signin', undefined, true);
          timer();
          return { error: null };
        }
      }
      
      if (!sessionResult) {
        safeLog.warn(LogCategory.AUTH, '認証フロー: セッション結果が取得できませんでした');
        // ポーリングとタイムアウトをクリーンアップ
        if (sessionCheckInterval) clearInterval(sessionCheckInterval);
        if (sessionCheckTimeout) clearTimeout(sessionCheckTimeout);
        await logAuth('google_signin', undefined, false, { error: 'セッション結果取得失敗' });
        timer();
        return { error: new Error('認証処理がタイムアウトしました') };
      }
      
      // セッションが検出されていれば成功
      if (sessionResult && sessionResult.detected && sessionResult.session) {
        safeLog.info(LogCategory.AUTH, 'セッション検出で認証成功（フォールバック）', {
          sessionDetected: true,
          browserResultType: browserResult && typeof browserResult === 'object' && 'type' in browserResult ? browserResult.type : 'unknown'
        });
        if (sessionCheckInterval) clearInterval(sessionCheckInterval);
        if (sessionCheckTimeout) clearTimeout(sessionCheckTimeout);
        await logAuth('google_signin', undefined, true);
        timer();
        return { error: null };
      }
      
      // ブラウザ結果を処理（フォールバック）
      if (browserResult && typeof browserResult === 'object' && 'type' in browserResult && browserResult.type === 'timeout') {
        safeLog.warn(LogCategory.AUTH, 'ブラウザ認証がタイムアウトしましたが、セッション確認を継続します');
        // タイムアウト後もセッションを確認
        const { data: { session: timeoutSession } } = await supabase.auth.getSession();
        if (timeoutSession && isSessionValid(timeoutSession)) {
          safeLog.info(LogCategory.AUTH, 'タイムアウト後、セッションを検出しました');
          await logAuth('google_signin', undefined, true);
          timer();
          return { error: null };
        }
        await logAuth('google_signin', undefined, false, { error: '認証タイムアウト' });
        timer();
        return { error: new Error('認証がタイムアウトしました') };
      }
      
      const result = browserResult as Awaited<ReturnType<typeof WebBrowser.openAuthSessionAsync>>;
      
      safeLog.info(LogCategory.AUTH, '認証セッション結果', {
        type: result.type,
        url: result.url || 'none',
        urlLength: result.url?.length || 0,
        urlPreview: result.url ? result.url.substring(0, 100) : 'none'
      });
      
      if (result.type === 'cancel') {
        await logAuth('google_signin', undefined, false, { error: 'ユーザーがキャンセル' });
        safeLog.warn(LogCategory.AUTH, 'Google認証がキャンセルされました');
        timer();
        return { error: new Error('認証がキャンセルされました') };
      }
      
      if (result.type === 'dismiss') {
        // Expo GoでプロキシURLがSupabaseに登録されていない場合、dismissになる可能性がある
        safeLog.warn(LogCategory.AUTH, 'Google認証がdismissされました（プロキシURLがSupabaseに登録されていない可能性）', {
          redirectTo: finalRedirectTo,
          isExpoGo: finalRedirectTo.startsWith('exp://')
        });
        
        // 少し待ってからセッションを確認（Deep Linkingで処理された可能性がある）
        await new Promise(resolve => setTimeout(resolve, 2000));
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (currentSession && isSessionValid(currentSession)) {
          safeLog.info(LogCategory.AUTH, 'dismiss後、セッションを検出しました（Deep Linking経由）');
          await logAuth('google_signin', undefined, true);
          timer();
          return { error: null };
        }
        
        // セッションが検出できない場合、エラーメッセージを返す
        const errorMessage = finalRedirectTo.startsWith('exp://')
          ? 'SupabaseのRedirect URLsにプロキシURLを追加してください。詳細はREADME.mdを参照してください。'
          : '認証が中断されました';
        await logAuth('google_signin', undefined, false, { error: errorMessage });
        timer();
        return { error: new Error(errorMessage) };
      }
      
      if (result.type === 'success' && result.url) {
        safeLog.info(LogCategory.AUTH, '認証成功、URL解析開始（フォールバック）', { 
          resultUrl: result.url,
          startsWithExpected: result.url.startsWith(finalRedirectTo)
        });
        
        // 共通関数を使用してトークンを抽出してセッションを設定
        const tokenResult = await extractTokensAndSetSession(result.url, 'フォールバック処理');
        
        if (tokenResult.success && tokenResult.session) {
          await logAuth('google_signin', undefined, true);
          safeLog.info(LogCategory.AUTH, 'Google認証成功（フォールバック）');
          // セッションはonAuthStateChangeで自動的に設定される
          timer();
          return { error: null };
        }
        
        // トークン抽出失敗時は、通常のフローにフォールバック
        safeLog.debug(LogCategory.AUTH, 'URLパラメータからトークンを取得できませんでした。通常フローで処理します');
        
        // 少し待ってからセッションを確認
        await new Promise(resolve => setTimeout(resolve, 1000));
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        if (currentSession) {
          await logAuth('google_signin', undefined, true);
          safeLog.info(LogCategory.AUTH, 'Google認証成功（通常フロー）');
          timer();
          return { error: null };
        }
        
        await logAuth('google_signin', undefined, false, { error: tokenResult.error || 'セッション取得失敗' });
        safeLog.error(LogCategory.AUTH, 'セッション取得失敗', { error: tokenResult.error });
        timer();
        return { error: new Error(tokenResult.error || 'セッション取得に失敗しました') };
      } else {
        await logAuth('google_signin', undefined, false, { error: '予期しない結果' });
        safeLog.error(LogCategory.AUTH, 'Google認証で予期しない結果', { result });
        timer();
        return { error: new Error('認証に失敗しました') };
      }
      
      timer();
      return { error: null };
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
