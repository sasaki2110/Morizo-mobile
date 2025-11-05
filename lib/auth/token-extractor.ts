import { Session } from '@supabase/supabase-js';
import { supabase } from '../supabase';
import { safeLog, LogCategory } from '../logging';

/**
 * URLからトークンを抽出
 * @param url トークンを含むURL
 * @returns アクセストークンとリフレッシュトークン
 */
export const extractTokensFromUrl = (url: string): { accessToken: string | null; refreshToken: string | null } => {
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
  
  return { accessToken, refreshToken };
};

/**
 * URLからトークンを抽出してセッションを設定
 * @param url トークンを含むURL
 * @param source 処理のソース（ログ用）
 * @returns セッション設定の結果
 */
export const extractTokensAndSetSession = async (
  url: string,
  source: string
): Promise<{ success: boolean; session?: Session; error?: string }> => {
  safeLog.info(LogCategory.AUTH, `トークン抽出開始（${source}）`, {
    urlPreview: url.substring(0, 100)
  });
  
  const { accessToken, refreshToken } = extractTokensFromUrl(url);
  
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

