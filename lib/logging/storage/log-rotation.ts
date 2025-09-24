/**
 * Morizo Mobile - ログローテーション機能
 * 
 * Expo Go実機対応のログローテーション機能
 * ストレージサイズ制限・古いログの自動削除・バックアップ管理
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { LogEntry } from '../types';
import { logStorage } from './log-storage';

// ローテーション設定
export interface RotationConfig {
  maxSizeMB: number;           // 最大ストレージサイズ（MB）
  maxEntries: number;          // 最大ログエントリ数
  maxAgeDays: number;          // ログの最大保持期間（日）
  backupCount: number;         // バックアップファイル数
  autoRotation: boolean;       // 自動ローテーション有効/無効
  compressionEnabled: boolean; // 圧縮有効/無効
}

// ローテーション結果
export interface RotationResult {
  removedEntries: number;     // 削除されたログエントリ数
  removedSizeBytes: number;    // 削除されたサイズ（バイト）
  backupCreated: boolean;      // バックアップが作成されたか
  backupSizeBytes: number;     // バックアップサイズ（バイト）
  totalSizeBefore: number;     // ローテーション前の総サイズ
  totalSizeAfter: number;      // ローテーション後の総サイズ
}

// デフォルト設定
const DEFAULT_CONFIG: RotationConfig = {
  maxSizeMB: 5,                // 5MB
  maxEntries: 1000,           // 1000件
  maxAgeDays: 7,              // 7日間
  backupCount: 3,             // 3つのバックアップ
  autoRotation: true,         // 自動ローテーション有効
  compressionEnabled: false,   // 圧縮無効（将来の拡張用）
};

// ストレージキー
const ROTATION_KEYS = {
  CONFIG: 'morizo_rotation_config',
  LAST_ROTATION: 'morizo_last_rotation',
  ROTATION_HISTORY: 'morizo_rotation_history',
} as const;

/**
 * ログローテーションクラス
 */
export class LogRotation {
  private static instance: LogRotation;
  private config: RotationConfig;

  private constructor() {
    this.config = DEFAULT_CONFIG;
  }

  /**
   * シングルトンインスタンス取得
   */
  public static getInstance(): LogRotation {
    if (!LogRotation.instance) {
      LogRotation.instance = new LogRotation();
    }
    return LogRotation.instance;
  }

  /**
   * 設定を読み込み
   */
  public async loadConfig(): Promise<void> {
    try {
      const configJson = await AsyncStorage.getItem(ROTATION_KEYS.CONFIG);
      if (configJson) {
        this.config = { ...DEFAULT_CONFIG, ...JSON.parse(configJson) };
      }
    } catch (error) {
      console.error('ローテーション設定読み込みエラー:', error);
      this.config = DEFAULT_CONFIG;
    }
  }

  /**
   * 設定を保存
   */
  public async saveConfig(config: Partial<RotationConfig>): Promise<void> {
    try {
      this.config = { ...this.config, ...config };
      await AsyncStorage.setItem(ROTATION_KEYS.CONFIG, JSON.stringify(this.config));
    } catch (error) {
      console.error('ローテーション設定保存エラー:', error);
      throw error;
    }
  }

  /**
   * 現在の設定を取得
   */
  public getConfig(): RotationConfig {
    return { ...this.config };
  }

  /**
   * ローテーションを実行
   */
  public async rotate(): Promise<RotationResult> {
    try {
      await this.loadConfig();
      
      const allLogs = await logStorage.getLogs();
      const totalSizeBefore = this.calculateLogsSize(allLogs);
      
      let result: RotationResult = {
        removedEntries: 0,
        removedSizeBytes: 0,
        backupCreated: false,
        backupSizeBytes: 0,
        totalSizeBefore,
        totalSizeAfter: totalSizeBefore,
      };

      // バックアップを作成
      if (this.config.autoRotation && allLogs.length > 0) {
        await this.createBackup(allLogs);
        result.backupCreated = true;
        result.backupSizeBytes = this.calculateLogsSize(allLogs);
      }

      // ログをフィルタリング（古いログを削除）
      const filteredLogs = this.filterLogsByAge(allLogs);
      result.removedEntries = allLogs.length - filteredLogs.length;
      result.removedSizeBytes = totalSizeBefore - this.calculateLogsSize(filteredLogs);

      // サイズ制限を適用
      const sizeLimitedLogs = this.applySizeLimits(filteredLogs);
      const additionalRemoved = filteredLogs.length - sizeLimitedLogs.length;
      result.removedEntries += additionalRemoved;
      result.removedSizeBytes += this.calculateLogsSize(filteredLogs) - this.calculateLogsSize(sizeLimitedLogs);

      // ログを保存
      await logStorage.saveLogs(sizeLimitedLogs);
      result.totalSizeAfter = this.calculateLogsSize(sizeLimitedLogs);

      // ローテーション履歴を記録
      await this.recordRotationHistory(result);

      // 古いバックアップを削除
      await this.cleanupOldBackups();

      return result;

    } catch (error) {
      console.error('ローテーション実行エラー:', error);
      throw error;
    }
  }

  /**
   * 自動ローテーションをチェック
   */
  public async checkAutoRotation(): Promise<boolean> {
    try {
      await this.loadConfig();
      
      if (!this.config.autoRotation) {
        return false;
      }

      const allLogs = await logStorage.getLogs();
      const totalSizeMB = this.calculateLogsSize(allLogs) / 1024 / 1024;
      
      // サイズ制限チェック
      if (totalSizeMB > this.config.maxSizeMB) {
        return true;
      }
      
      // エントリ数制限チェック
      if (allLogs.length > this.config.maxEntries) {
        return true;
      }
      
      // 古いログチェック
      const hasOldLogs = allLogs.some(log => this.isLogTooOld(log));
      if (hasOldLogs) {
        return true;
      }

      return false;

    } catch (error) {
      console.error('自動ローテーションチェックエラー:', error);
      return false;
    }
  }

  /**
   * ローテーション履歴を取得
   */
  public async getRotationHistory(): Promise<RotationResult[]> {
    try {
      const historyJson = await AsyncStorage.getItem(ROTATION_KEYS.ROTATION_HISTORY);
      if (!historyJson) {
        return [];
      }
      
      return JSON.parse(historyJson) as RotationResult[];
    } catch (error) {
      console.error('ローテーション履歴取得エラー:', error);
      return [];
    }
  }

  /**
   * ローテーション統計を取得
   */
  public async getRotationStats(): Promise<{
    totalRotations: number;
    totalRemovedEntries: number;
    totalRemovedSizeMB: number;
    lastRotation: string | null;
    averageRotationInterval: number;
  }> {
    try {
      const history = await this.getRotationHistory();
      
      if (history.length === 0) {
        return {
          totalRotations: 0,
          totalRemovedEntries: 0,
          totalRemovedSizeMB: 0,
          lastRotation: null,
          averageRotationInterval: 0,
        };
      }

      const totalRemovedEntries = history.reduce((sum, result) => sum + result.removedEntries, 0);
      const totalRemovedSizeMB = history.reduce((sum, result) => sum + result.removedSizeBytes, 0) / 1024 / 1024;
      
      // 最後のローテーション日時
      const lastRotation = history[history.length - 1] ? 
        new Date().toISOString() : null;
      
      // 平均ローテーション間隔（日）
      const averageRotationInterval = history.length > 1 ? 
        this.calculateAverageInterval(history) : 0;

      return {
        totalRotations: history.length,
        totalRemovedEntries,
        totalRemovedSizeMB: Math.round(totalRemovedSizeMB * 100) / 100,
        lastRotation,
        averageRotationInterval,
      };

    } catch (error) {
      console.error('ローテーション統計取得エラー:', error);
      return {
        totalRotations: 0,
        totalRemovedEntries: 0,
        totalRemovedSizeMB: 0,
        lastRotation: null,
        averageRotationInterval: 0,
      };
    }
  }

  /**
   * ログを年齢でフィルタリング
   */
  private filterLogsByAge(logs: LogEntry[]): LogEntry[] {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.maxAgeDays);
    
    return logs.filter(log => {
      const logDate = new Date(log.timestamp);
      return logDate >= cutoffDate;
    });
  }

  /**
   * サイズ制限を適用
   */
  private applySizeLimits(logs: LogEntry[]): LogEntry[] {
    // エントリ数制限
    let limitedLogs = logs.slice(-this.config.maxEntries);
    
    // サイズ制限
    const sizeMB = this.calculateLogsSize(limitedLogs) / 1024 / 1024;
    if (sizeMB > this.config.maxSizeMB) {
      limitedLogs = this.trimLogsToSize(limitedLogs, this.config.maxSizeMB);
    }
    
    return limitedLogs;
  }

  /**
   * ログが古すぎるかチェック
   */
  private isLogTooOld(log: LogEntry): boolean {
    const logDate = new Date(log.timestamp);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.maxAgeDays);
    
    return logDate < cutoffDate;
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
   * バックアップを作成
   */
  private async createBackup(logs: LogEntry[]): Promise<void> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupKey = `morizo_logs_backup_${timestamp}`;
      
      await AsyncStorage.setItem(backupKey, JSON.stringify(logs));
      
    } catch (error) {
      console.error('バックアップ作成エラー:', error);
      throw error;
    }
  }

  /**
   * 古いバックアップを削除
   */
  private async cleanupOldBackups(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const backupKeys = keys.filter(key => key.startsWith('morizo_logs_backup_'));
      
      if (backupKeys.length > this.config.backupCount) {
        // タイムスタンプでソートして古いものを削除
        const sortedKeys = backupKeys.sort();
        const keysToDelete = sortedKeys.slice(0, backupKeys.length - this.config.backupCount);
        
        await AsyncStorage.multiRemove(keysToDelete);
      }
    } catch (error) {
      console.error('バックアップクリーンアップエラー:', error);
    }
  }

  /**
   * ローテーション履歴を記録
   */
  private async recordRotationHistory(result: RotationResult): Promise<void> {
    try {
      const history = await this.getRotationHistory();
      history.push(result);
      
      // 履歴は最大50件まで保持
      const limitedHistory = history.slice(-50);
      
      await AsyncStorage.setItem(ROTATION_KEYS.ROTATION_HISTORY, JSON.stringify(limitedHistory));
      
    } catch (error) {
      console.error('ローテーション履歴記録エラー:', error);
    }
  }

  /**
   * 平均ローテーション間隔を計算
   */
  private calculateAverageInterval(history: RotationResult[]): number {
    if (history.length < 2) {
      return 0;
    }
    
    // 簡略化のため、履歴の件数から平均を計算
    // 実際の実装では、ローテーション日時を記録して計算
    return Math.round(history.length / 7); // 週あたりの平均
  }

  /**
   * 手動でローテーションを実行
   */
  public async manualRotate(): Promise<RotationResult> {
    try {
      const result = await this.rotate();
      
      // ローテーション完了を記録
      await AsyncStorage.setItem(ROTATION_KEYS.LAST_ROTATION, new Date().toISOString());
      
      return result;
      
    } catch (error) {
      console.error('手動ローテーションエラー:', error);
      throw error;
    }
  }

  /**
   * 最後のローテーション日時を取得
   */
  public async getLastRotationDate(): Promise<Date | null> {
    try {
      const lastRotationJson = await AsyncStorage.getItem(ROTATION_KEYS.LAST_ROTATION);
      if (!lastRotationJson) {
        return null;
      }
      
      return new Date(lastRotationJson);
    } catch (error) {
      console.error('最後のローテーション日時取得エラー:', error);
      return null;
    }
  }

  /**
   * ローテーション設定をリセット
   */
  public async resetConfig(): Promise<void> {
    try {
      this.config = DEFAULT_CONFIG;
      await AsyncStorage.setItem(ROTATION_KEYS.CONFIG, JSON.stringify(this.config));
    } catch (error) {
      console.error('ローテーション設定リセットエラー:', error);
      throw error;
    }
  }
}

// シングルトンインスタンスをエクスポート
export const logRotation = LogRotation.getInstance();

// 便利な関数をエクスポート
export const rotateLogs = () => logRotation.rotate();
export const checkAutoRotation = () => logRotation.checkAutoRotation();
export const getRotationStats = () => logRotation.getRotationStats();
export const manualRotate = () => logRotation.manualRotate();
export const getRotationConfig = () => logRotation.getConfig();
export const updateRotationConfig = (config: Partial<RotationConfig>) => 
  logRotation.saveConfig(config);
