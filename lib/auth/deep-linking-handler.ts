import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import { supabase } from '../supabase';
import { logAuth, safeLog, LogCategory } from '../logging';
import { isSessionValid } from './session-manager';
import { extractTokensAndSetSession } from './token-extractor';

/**
 * Deep Linking処理を行うカスタムフック
 * OAuth認証後のリダイレクトURLを処理
 */
export const useDeepLinkingHandler = () => {
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
        
        // 共通関数を使用してトークンを抽出してセッションを設定
        const tokenResult = await extractTokensAndSetSession(url, 'Deep Linking');
        
        if (tokenResult.success && tokenResult.session) {
          safeLog.info(LogCategory.AUTH, 'Deep Linking: セッション設定成功', {
            userId: tokenResult.session.user?.id,
            email: tokenResult.session.user?.email?.replace(/(.{2}).*(@.*)/, '$1***$2')
          });
          await logAuth('google_signin', undefined, true);
          // セッションはonAuthStateChangeで自動的に設定される
        } else {
          safeLog.warn(LogCategory.AUTH, 'Deep Linking: URLからトークンを抽出できませんでした', {
            urlPreview: url.substring(0, 200),
            error: tokenResult.error
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
      } catch (error: any) {
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
    }).catch((error: any) => {
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
};

