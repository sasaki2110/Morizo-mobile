import { useEffect, useRef } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../supabase';
import { showErrorAlert } from '../../utils/alert';
import { safeLog, LogCategory } from '../logging';
import { isSessionValid } from './session-manager';

interface UseAuthStateListenerParams {
  setSession: (session: Session | null) => void;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setInitialized: (initialized: boolean) => void;
  handleClearInvalidSession: () => Promise<void>;
}

/**
 * 認証状態の監視と初期セッション取得を行うカスタムフック
 */
export const useAuthStateListener = ({
  setSession,
  setUser,
  setLoading,
  setInitialized,
  handleClearInvalidSession,
}: UseAuthStateListenerParams) => {
  // 初期セッション取得が実行済みかどうかを追跡
  const initialSessionFetched = useRef(false);

  useEffect(() => {
    // 初期セッションの取得（1回だけ実行）
    const getInitialSession = async () => {
      if (initialSessionFetched.current) {
        safeLog.debug(LogCategory.AUTH, '初期セッション取得は既に実行済みのためスキップ');
        return;
      }

      initialSessionFetched.current = true;

      try {
        console.log('初期セッション取得開始...');
        
        const { data: { session }, error } = await supabase.auth.getSession();
        
        console.log('初期セッション取得結果:', { session, error });
        
        if (error) {
          console.error('初期セッション取得エラー:', error);
          showErrorAlert(`認証エラー: ${error.message}`);
          await handleClearInvalidSession();
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
          await handleClearInvalidSession();
        }
        
        setInitialized(true);
        setLoading(false);
        
        console.log('認証状態設定完了:', { 
          hasSession: !!session, 
          hasUser: !!session?.user,
          userEmail: session?.user?.email 
        });
      } catch (error: any) {
        console.error('初期セッション取得で予期しないエラー:', error);
        showErrorAlert('認証の初期化に失敗しました');
        await handleClearInvalidSession();
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
        
        // INITIAL_SESSIONイベントは初期セッション取得と重複するため、スキップ
        if (event === 'INITIAL_SESSION') {
          safeLog.debug(LogCategory.AUTH, 'INITIAL_SESSIONイベントをスキップ（初期セッション取得で処理済み）');
          if (session && isSessionValid(session)) {
            setSession(session);
            setUser(session.user);
            setLoading(false);
          }
          return;
        }
        
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
              await handleClearInvalidSession();
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
              await handleClearInvalidSession();
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
  }, [handleClearInvalidSession]); // setState関数は安定しているため依存配列から削除
};

