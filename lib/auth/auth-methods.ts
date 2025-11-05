import { supabase } from '../supabase';
import { logAuth, logSession, safeLog, LogCategory } from '../logging';

/**
 * メール/パスワードでサインイン
 * @param email メールアドレス
 * @param password パスワード
 * @returns エラー情報を含むオブジェクト
 */
export const signIn = async (email: string, password: string): Promise<{ error: any }> => {
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
  } catch (error: any) {
    await logAuth('signin', email, false, { error: error.message });
    safeLog.error(LogCategory.AUTH, 'サインイン処理エラー', { error: error.message });
    timer();
    return { error };
  }
};

/**
 * 新規ユーザー登録
 * @param email メールアドレス
 * @param password パスワード
 * @returns エラー情報を含むオブジェクト
 */
export const signUp = async (email: string, password: string): Promise<{ error: any }> => {
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
  } catch (error: any) {
    await logAuth('signup', email, false, { error: error.message });
    safeLog.error(LogCategory.AUTH, 'サインアップ処理エラー', { error: error.message });
    timer();
    return { error };
  }
};

/**
 * サインアウト
 * 注意: この関数は状態更新を行わないため、呼び出し元で状態を更新する必要があります
 * @param userEmail ユーザーのメールアドレス（ログ用）
 * @returns Promise<void>
 */
export const signOut = async (userEmail?: string): Promise<void> => {
  const timer = safeLog.timer('sign-out');
  try {
    safeLog.info(LogCategory.AUTH, 'サインアウト処理開始');
    
    // Supabaseのサインアウトを試みる
    const { error } = await supabase.auth.signOut();
    if (error) {
      safeLog.warn(LogCategory.AUTH, 'Supabaseサインアウトエラー', { error: error.message });
    }
    
    await logAuth('signout', userEmail, true);
    await logSession('signout', 'cleared');
    safeLog.info(LogCategory.AUTH, 'ログアウト成功');
    timer();
  } catch (error: any) {
    safeLog.error(LogCategory.AUTH, 'サインアウトで予期しないエラー', { error: error.message });
    timer();
  }
};

