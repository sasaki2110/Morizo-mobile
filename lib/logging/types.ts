// Morizo Mobile - ログカテゴリ定義
export enum LogCategory {
  MAIN = 'MAIN',
  AUTH = 'AUTH',
  API = 'API',
  VOICE = 'VOICE',
  CHAT = 'CHAT',
  SESSION = 'SESSION',
  COMPONENT = 'COMPONENT',
  NAVIGATION = 'NAVIGATION',
  STORAGE = 'STORAGE',
  NETWORK = 'NETWORK',
}

// ログレベル定義
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

// ログレベル名
export const LogLevelNames = {
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.ERROR]: 'ERROR',
};

// ログレベル絵文字
export const LogLevelEmojis = {
  [LogLevel.DEBUG]: '🔍',
  [LogLevel.INFO]: 'ℹ️',
  [LogLevel.WARN]: '⚠️',
  [LogLevel.ERROR]: '❌',
};

// ログ設定インターフェース
export interface LogConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableStorage: boolean;
  maxStorageSize: number; // MB
  maxStorageFiles: number;
}

// デフォルト設定
export const DEFAULT_LOG_CONFIG: LogConfig = {
  level: LogLevel.INFO,
  enableConsole: true,
  enableStorage: true,
  maxStorageSize: 5, // 5MB
  maxStorageFiles: 3,
};

// ログエントリインターフェース
export interface LogEntry {
  timestamp: string;
  category: LogCategory;
  level: LogLevel;
  message: string;
  data?: any;
  platform?: string;
}

// タイマーインターフェース
export interface LogTimer {
  (): void;
}
