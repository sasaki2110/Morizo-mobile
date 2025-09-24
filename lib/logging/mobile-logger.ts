import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LogEntry, LogCategory, LogLevel, LogConfig, DEFAULT_LOG_CONFIG } from './types';
// import { logStorageFixed } from './storage/log-storage-fixed';

// モバイル用ロギングクラス
export class MobileLogger {
  private config: LogConfig;
  private storageKey = 'morizo_mobile_logs';
  private timerKey = 'morizo_mobile_timer';

  constructor(config: LogConfig = DEFAULT_LOG_CONFIG) {
    this.config = config;
  }

  // ログ出力メイン関数
  private async log(level: LogLevel, category: LogCategory, message: string, data?: any): Promise<void> {
    // ログレベルチェック
    if (level < this.config.level) {
      return;
    }

    const timestamp = new Date().toISOString();
    const platform = Platform.OS;
    
    const logEntry: LogEntry = {
      timestamp,
      category,
      level,
      message,
      data,
      platform,
    };

    // コンソール出力
    if (this.config.enableConsole) {
      this.logToConsole(logEntry);
    }

    // ストレージ出力
    if (this.config.enableStorage) {
      await this.logToStorage(logEntry);
      // 修正版ログストレージにも保存（一時的に無効化）
      // try {
      //   await logStorageFixed.saveLog(logEntry);
      // } catch (error) {
      //   console.error('ログストレージ保存エラー:', error);
      // }
    }
  }

  // コンソール出力
  private logToConsole(entry: LogEntry): void {
    const { LogLevelNames, LogLevelEmojis } = require('./types');
    
    const paddedCategory = entry.category.padEnd(5, ' ');
    const paddedLevel = LogLevelNames[entry.level].padEnd(5, ' ');
    const emoji = LogLevelEmojis[entry.level];
    
    const logMessage = `${entry.timestamp} - ${paddedCategory} - ${paddedLevel} - ${emoji} ${entry.message}`;
    const dataMessage = entry.data ? ` | Data: ${JSON.stringify(entry.data)}` : '';
    
    const fullMessage = logMessage + dataMessage;
    
    // ログレベルに応じたコンソール出力
    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(fullMessage);
        break;
      case LogLevel.INFO:
        console.info(fullMessage);
        break;
      case LogLevel.WARN:
        console.warn(fullMessage);
        break;
      case LogLevel.ERROR:
        console.error(fullMessage);
        break;
    }
  }

  // ストレージ出力
  private async logToStorage(entry: LogEntry): Promise<void> {
    try {
      // 既存のログを取得
      const existingLogs = await this.getStoredLogs();
      
      // 新しいログを追加
      existingLogs.push(entry);
      
      // ストレージサイズチェック
      const logsString = JSON.stringify(existingLogs);
      const sizeInMB = new Blob([logsString]).size / (1024 * 1024);
      
      if (sizeInMB > this.config.maxStorageSize) {
        // 古いログを削除（最新の50%を保持）
        const keepCount = Math.floor(existingLogs.length * 0.5);
        const trimmedLogs = existingLogs.slice(-keepCount);
        await AsyncStorage.setItem(this.storageKey, JSON.stringify(trimmedLogs));
      } else {
        await AsyncStorage.setItem(this.storageKey, JSON.stringify(existingLogs));
      }
    } catch (error) {
      console.error('ログストレージ保存エラー:', error);
    }
  }

  // ストレージからログ取得
  private async getStoredLogs(): Promise<LogEntry[]> {
    try {
      const logsString = await AsyncStorage.getItem(this.storageKey);
      return logsString ? JSON.parse(logsString) : [];
    } catch (error) {
      console.error('ログストレージ取得エラー:', error);
      return [];
    }
  }

  // パブリックメソッド
  async debug(category: LogCategory, message: string, data?: any): Promise<void> {
    await this.log(LogLevel.DEBUG, category, message, data);
  }

  async info(category: LogCategory, message: string, data?: any): Promise<void> {
    await this.log(LogLevel.INFO, category, message, data);
  }

  async warn(category: LogCategory, message: string, data?: any): Promise<void> {
    await this.log(LogLevel.WARN, category, message, data);
  }

  async error(category: LogCategory, message: string, data?: any): Promise<void> {
    await this.log(LogLevel.ERROR, category, message, data);
  }

  // タイマー機能
  timer(name: string): () => void {
    const startTime = Date.now();
    
    return () => {
      const duration = Date.now() - startTime;
      this.info(LogCategory.MAIN, `Timer: ${name}`, { duration: `${duration}ms` });
    };
  }

  // 設定更新
  updateConfig(newConfig: Partial<LogConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  // ログクリア
  async clearLogs(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.storageKey);
      console.info('ログをクリアしました');
    } catch (error) {
      console.error('ログクリアエラー:', error);
    }
  }

  // ログ取得（デバッグ用）
  async getLogs(): Promise<LogEntry[]> {
    return await this.getStoredLogs();
  }

  // ログエクスポート（デバッグ用）
  async exportLogs(): Promise<string> {
    const logs = await this.getStoredLogs();
    return JSON.stringify(logs, null, 2);
  }
}

// シングルトンインスタンス
export const mobileLogger = new MobileLogger();
