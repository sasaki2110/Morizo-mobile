import { Platform } from 'react-native';
import { LogCategory, LogLevel } from './types';
import { mobileLogger } from './mobile-logger';

// 統一ロギングインターフェース
export interface Logger {
  debug(category: LogCategory, message: string, data?: any): Promise<void>;
  info(category: LogCategory, message: string, data?: any): Promise<void>;
  warn(category: LogCategory, message: string, data?: any): Promise<void>;
  error(category: LogCategory, message: string, data?: any): Promise<void>;
  timer(name: string): () => void;
}

// 統一ロガーインスタンス
export const log: Logger = mobileLogger;

// 専用ログ関数（web版と同様のインターフェース）

// 認証ログ
export const logAuth = async (action: string, email?: string, success?: boolean, data?: any): Promise<void> => {
  const message = success ? `認証成功: ${action}` : `認証失敗: ${action}`;
  const logData = {
    action,
    email: email ? maskEmail(email) : undefined,
    success,
    ...data,
  };
  
  if (success) {
    await log.info(LogCategory.AUTH, message, logData);
  } else {
    await log.error(LogCategory.AUTH, message, logData);
  }
};

// 音声ログ
export const logVoice = async (action: string, data?: any): Promise<void> => {
  await log.info(LogCategory.VOICE, `音声処理: ${action}`, data);
};

// チャットログ
export const logChat = async (action: string, messageLength?: number, data?: any): Promise<void> => {
  const logData = {
    action,
    messageLength,
    ...data,
  };
  await log.info(LogCategory.CHAT, `チャット: ${action}`, logData);
};

// APIログ
export const logAPI = async (method: string, url: string, status?: number, data?: any): Promise<void> => {
  const message = status ? `API呼び出し成功: ${method} ${url}` : `API呼び出し開始: ${method} ${url}`;
  const logData = {
    method,
    url: maskUrl(url),
    status,
    ...data,
  };
  
  if (status && status >= 400) {
    await log.error(LogCategory.API, message, logData);
  } else {
    await log.info(LogCategory.API, message, logData);
  }
};

// セッションログ
export const logSession = async (action: string, sessionId?: string, data?: any): Promise<void> => {
  const logData = {
    action,
    sessionId,
    ...data,
  };
  await log.info(LogCategory.SESSION, `セッション: ${action}`, logData);
};

// コンポーネントログ
export const logComponent = async (componentName: string, action: string, data?: any): Promise<void> => {
  const logData = {
    component: componentName,
    action,
    ...data,
  };
  await log.info(LogCategory.COMPONENT, `コンポーネント: ${componentName} - ${action}`, logData);
};

// ナビゲーションログ
export const logNavigation = async (from: string, to: string, data?: any): Promise<void> => {
  const logData = {
    from,
    to,
    ...data,
  };
  await log.info(LogCategory.NAVIGATION, `ナビゲーション: ${from} → ${to}`, logData);
};

// ストレージログ
export const logStorage = async (action: string, key?: string, data?: any): Promise<void> => {
  const logData = {
    action,
    key: key ? maskKey(key) : undefined,
    ...data,
  };
  await log.info(LogCategory.STORAGE, `ストレージ: ${action}`, logData);
};

// ネットワークログ
export const logNetwork = async (action: string, url?: string, data?: any): Promise<void> => {
  const logData = {
    action,
    url: url ? maskUrl(url) : undefined,
    ...data,
  };
  await log.info(LogCategory.NETWORK, `ネットワーク: ${action}`, logData);
};

// セキュリティ関数

// メールアドレスマスキング
function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return email;
  
  const [localPart, domain] = email.split('@');
  if (localPart.length <= 2) return email;
  
  const maskedLocal = localPart.charAt(0) + '*'.repeat(localPart.length - 2) + localPart.charAt(localPart.length - 1);
  return `${maskedLocal}@${domain}`;
}

// URLマスキング
function maskUrl(url: string): string {
  if (!url) return url;
  
  try {
    const urlObj = new URL(url);
    if (urlObj.searchParams.has('token') || urlObj.searchParams.has('key')) {
      const maskedParams = new URLSearchParams(urlObj.searchParams);
      maskedParams.set('token', '***');
      maskedParams.set('key', '***');
      urlObj.search = maskedParams.toString();
    }
    return urlObj.toString();
  } catch {
    return url;
  }
}

// キーマスキング
function maskKey(key: string): string {
  if (!key) return key;
  
  if (key.includes('token') || key.includes('key') || key.includes('password')) {
    return key.replace(/(token|key|password)=[^&]*/gi, '$1=***');
  }
  
  return key;
}

// エラーハンドリング付きログ関数
export const safeLog = {
  async info(category: LogCategory, message: string, data?: any): Promise<void> {
    try {
      await log.info(category, message, data);
    } catch (error) {
      console.error('ログ出力エラー:', error);
    }
  },
  
  async error(category: LogCategory, message: string, data?: any): Promise<void> {
    try {
      await log.error(category, message, data);
    } catch (error) {
      console.error('ログ出力エラー:', error);
    }
  },
  
  async warn(category: LogCategory, message: string, data?: any): Promise<void> {
    try {
      await log.warn(category, message, data);
    } catch (error) {
      console.error('ログ出力エラー:', error);
    }
  },
  
  async debug(category: LogCategory, message: string, data?: any): Promise<void> {
    try {
      await log.debug(category, message, data);
    } catch (error) {
      console.error('ログ出力エラー:', error);
    }
  },

  // timerメソッドを追加
  timer(name: string): () => void {
    try {
      return log.timer(name);
    } catch (error) {
      console.error('タイマー初期化エラー:', error);
      // フォールバック: 何もしない関数を返す
      return () => {};
    }
  },
};

// プラットフォーム情報付きログ
export const logWithPlatform = async (
  category: LogCategory, 
  level: LogLevel, 
  message: string, 
  data?: any
): Promise<void> => {
  const platformData = {
    platform: Platform.OS,
    version: Platform.Version,
    ...data,
  };
  
  switch (level) {
    case LogLevel.DEBUG:
      await log.debug(category, message, platformData);
      break;
    case LogLevel.INFO:
      await log.info(category, message, platformData);
      break;
    case LogLevel.WARN:
      await log.warn(category, message, platformData);
      break;
    case LogLevel.ERROR:
      await log.error(category, message, platformData);
      break;
  }
};
