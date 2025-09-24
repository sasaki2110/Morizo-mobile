/**
 * Morizo Mobile - 修正版ログストレージ管理
 * 
 * 問題を修正したログストレージ機能
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { LogEntry, LogLevel } from '../types';

// ストレージキー
const STORAGE_KEYS = {
  LOGS: 'morizo_logs',
  LOGS_BACKUP: 'morizo_logs_backup',
  LOGS_METADATA: 'morizo_logs_metadata',
} as const;

// ストレージ設定
const STORAGE_CONFIG = {
  MAX_SIZE_MB: 5, // 最大ストレージサイズ（MB）
  MAX_ENTRIES: 1000, // 最大ログエントリ数
  BACKUP_COUNT: 3, // バックアップファイル数
} as const;

// ログメタデータ型
interface LogMetadata {
  totalEntries: number;
  totalSizeBytes: number;
  lastUpdated: string;
  version: string;
}

/**
 * ログストレージ管理クラス（修正版）
 */
export class LogStorageFixed {
  private static instance: LogStorageFixed;
  private metadata: LogMetadata | null = null;

  private constructor() {}

  /**
   * シングルトンインスタンス取得
   */
  public static getInstance(): LogStorageFixed {
    if (!LogStorageFixed.instance) {
      LogStorageFixed.instance = new LogStorageFixed();
    }
    return LogStorageFixed.instance;
  }

  /**
   * ログを保存
   */
  public async saveLog(logEntry: LogEntry): Promise<void> {
    try {
      // 既存のログを取得
      const existingLogs = await this.getLogs();
      
      // 新しいログを追加
      const updatedLogs = [...existingLogs, logEntry];
      
      // ストレージサイズ制限チェック
      const limitedLogs = await this.enforceStorageLimits(updatedLogs);
      
      // ログを保存
      await this.saveLogsToStorage(limitedLogs);
      
      // メタデータを更新
      await this.updateMetadata(limitedLogs);
      
    } catch (error) {
      console.error('ログ保存エラー:', error);
      throw error;
    }
  }

  /**
   * ログを一括保存
   */
  public async saveLogs(logs: LogEntry[]): Promise<void> {
    try {
      // ストレージサイズ制限チェック
      const limitedLogs = await this.enforceStorageLimits(logs);
      
      // ログを保存
      await this.saveLogsToStorage(limitedLogs);
      
      // メタデータを更新
      await this.updateMetadata(limitedLogs);
      
    } catch (error) {
      console.error('ログ一括保存エラー:', error);
      throw error;
    }
  }

  /**
   * ログを取得
   */
  public async getLogs(): Promise<LogEntry[]> {
    try {
      const logsJson = await AsyncStorage.getItem(STORAGE_KEYS.LOGS);
      if (!logsJson) {
        return [];
      }
      
      const logs = JSON.parse(logsJson) as LogEntry[];
      return logs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      
    } catch (error) {
      console.error('ログ取得エラー:', error);
      return [];
    }
  }

  /**
   * ログをフィルタリングして取得（簡略化版）
   */
  public async getFilteredLogs(filters: {
    level?: string; // LogLevelではなくstringに変更
    category?: string;
    searchText?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<LogEntry[]> {
    try {
      const allLogs = await this.getLogs();
      
      return allLogs.filter(log => {
        // レベルフィルタ（string比較に変更）
        if (filters.level && log.level.toString() !== filters.level) {
          return false;
        }
        
        // カテゴリフィルタ
        if (filters.category && log.category !== filters.category) {
          return false;
        }
        
        // テキスト検索
        if (filters.searchText) {
          const searchLower = filters.searchText.toLowerCase();
          const messageMatch = log.message.toLowerCase().includes(searchLower);
          const dataMatch = log.data ? JSON.stringify(log.data).toLowerCase().includes(searchLower) : false;
          if (!messageMatch && !dataMatch) {
            return false;
          }
        }
        
        // 日付フィルタ
        if (filters.startDate) {
          const logDate = new Date(log.timestamp);
          if (logDate < filters.startDate) {
            return false;
          }
        }
        
        if (filters.endDate) {
          const logDate = new Date(log.timestamp);
          if (logDate > filters.endDate) {
            return false;
          }
        }
        
        return true;
      });
      
    } catch (error) {
      console.error('ログフィルタリングエラー:', error);
      return [];
    }
  }

  /**
   * ログを削除
   */
  public async clearLogs(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.LOGS);
      await AsyncStorage.removeItem(STORAGE_KEYS.LOGS_METADATA);
      await this.updateMetadata([]);
    } catch (error) {
      console.error('ログ削除エラー:', error);
      throw error;
    }
  }

  /**
   * ストレージサイズを取得
   */
  public async getStorageSize(): Promise<{ sizeBytes: number; sizeMB: number; entryCount: number }> {
    try {
      const metadata = await this.getMetadata();
      return {
        sizeBytes: metadata.totalSizeBytes,
        sizeMB: Math.round(metadata.totalSizeBytes / 1024 / 1024 * 100) / 100,
        entryCount: metadata.totalEntries,
      };
    } catch (error) {
      console.error('ストレージサイズ取得エラー:', error);
      return { sizeBytes: 0, sizeMB: 0, entryCount: 0 };
    }
  }

  /**
   * バックアップを作成
   */
  public async createBackup(): Promise<void> {
    try {
      const logs = await this.getLogs();
      const backupKey = `${STORAGE_KEYS.LOGS_BACKUP}_${Date.now()}`;
      
      await AsyncStorage.setItem(backupKey, JSON.stringify(logs));
      
      // 古いバックアップを削除
      await this.cleanupOldBackups();
      
    } catch (error) {
      console.error('バックアップ作成エラー:', error);
      throw error;
    }
  }

  /**
   * 利用可能なバックアップ一覧を取得
   */
  public async getAvailableBackups(): Promise<string[]> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      return keys.filter(key => key.startsWith(STORAGE_KEYS.LOGS_BACKUP));
    } catch (error) {
      console.error('バックアップ一覧取得エラー:', error);
      return [];
    }
  }

  /**
   * ストレージサイズ制限を適用
   */
  private async enforceStorageLimits(logs: LogEntry[]): Promise<LogEntry[]> {
    // エントリ数制限
    let limitedLogs = logs.slice(-STORAGE_CONFIG.MAX_ENTRIES);
    
    // ストレージサイズ制限
    const sizeBytes = this.calculateLogsSize(limitedLogs);
    const sizeMB = sizeBytes / 1024 / 1024;
    
    if (sizeMB > STORAGE_CONFIG.MAX_SIZE_MB) {
      // サイズ制限を超える場合、古いログから削除
      limitedLogs = this.trimLogsToSize(limitedLogs, STORAGE_CONFIG.MAX_SIZE_MB);
    }
    
    return limitedLogs;
  }

  /**
   * ログをストレージに保存
   */
  private async saveLogsToStorage(logs: LogEntry[]): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs));
  }

  /**
   * メタデータを更新
   */
  private async updateMetadata(logs: LogEntry[]): Promise<void> {
    const metadata: LogMetadata = {
      totalEntries: logs.length,
      totalSizeBytes: this.calculateLogsSize(logs),
      lastUpdated: new Date().toISOString(),
      version: '1.0.0',
    };
    
    await AsyncStorage.setItem(STORAGE_KEYS.LOGS_METADATA, JSON.stringify(metadata));
    this.metadata = metadata;
  }

  /**
   * メタデータを取得
   */
  private async getMetadata(): Promise<LogMetadata> {
    if (this.metadata) {
      return this.metadata;
    }
    
    try {
      const metadataJson = await AsyncStorage.getItem(STORAGE_KEYS.LOGS_METADATA);
      if (metadataJson) {
        this.metadata = JSON.parse(metadataJson) as LogMetadata;
        return this.metadata;
      }
    } catch (error) {
      console.error('メタデータ取得エラー:', error);
    }
    
    // デフォルトメタデータ
    const defaultMetadata: LogMetadata = {
      totalEntries: 0,
      totalSizeBytes: 0,
      lastUpdated: new Date().toISOString(),
      version: '1.0.0',
    };
    
    this.metadata = defaultMetadata;
    return defaultMetadata;
  }

  /**
   * ログサイズを計算
   */
  private calculateLogsSize(logs: LogEntry[]): number {
    return JSON.stringify(logs).length;
  }

  /**
   * ログをサイズ制限内にトリム
   */
  private trimLogsToSize(logs: LogEntry[], maxSizeMB: number): LogEntry[] {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    let currentSize = 0;
    const trimmedLogs: LogEntry[] = [];
    
    // 新しいログから順に追加
    for (let i = logs.length - 1; i >= 0; i--) {
      const log = logs[i];
      const logSize = JSON.stringify(log).length;
      
      if (currentSize + logSize > maxSizeBytes) {
        break;
      }
      
      trimmedLogs.unshift(log);
      currentSize += logSize;
    }
    
    return trimmedLogs;
  }

  /**
   * 古いバックアップを削除
   */
  private async cleanupOldBackups(): Promise<void> {
    try {
      const backupKeys = await this.getAvailableBackups();
      
      if (backupKeys.length > STORAGE_CONFIG.BACKUP_COUNT) {
        // タイムスタンプでソートして古いものを削除
        const sortedKeys = backupKeys.sort();
        const keysToDelete = sortedKeys.slice(0, backupKeys.length - STORAGE_CONFIG.BACKUP_COUNT);
        
        await AsyncStorage.multiRemove(keysToDelete);
      }
    } catch (error) {
      console.error('バックアップクリーンアップエラー:', error);
    }
  }
}

// シングルトンインスタンスをエクスポート
export const logStorageFixed = LogStorageFixed.getInstance();

// 便利な関数をエクスポート
export const saveLog = (logEntry: LogEntry) => logStorageFixed.saveLog(logEntry);
export const getLogs = () => logStorageFixed.getLogs();
export const getFilteredLogs = (filters: Parameters<typeof logStorageFixed.getFilteredLogs>[0]) => 
  logStorageFixed.getFilteredLogs(filters);
export const clearLogs = () => logStorageFixed.clearLogs();
export const getStorageSize = () => logStorageFixed.getStorageSize();
export const createBackup = () => logStorageFixed.createBackup();
export const getAvailableBackups = () => logStorageFixed.getAvailableBackups();
