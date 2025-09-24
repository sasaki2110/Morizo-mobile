/**
 * Morizo Mobile - 簡略化ログストレージ管理
 * 
 * 問題特定用の簡略化版
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { LogEntry } from '../types';

// 簡略化されたログストレージクラス
export class SimpleLogStorage {
  private static instance: SimpleLogStorage;
  private storageKey = 'morizo_simple_logs';

  private constructor() {}

  public static getInstance(): SimpleLogStorage {
    if (!SimpleLogStorage.instance) {
      SimpleLogStorage.instance = new SimpleLogStorage();
    }
    return SimpleLogStorage.instance;
  }

  // ログを保存
  public async saveLog(logEntry: LogEntry): Promise<void> {
    try {
      const existingLogs = await this.getLogs();
      const updatedLogs = [...existingLogs, logEntry];
      await AsyncStorage.setItem(this.storageKey, JSON.stringify(updatedLogs));
    } catch (error) {
      console.error('ログ保存エラー:', error);
      throw error;
    }
  }

  // ログを取得
  public async getLogs(): Promise<LogEntry[]> {
    try {
      const logsJson = await AsyncStorage.getItem(this.storageKey);
      if (!logsJson) {
        return [];
      }
      return JSON.parse(logsJson) as LogEntry[];
    } catch (error) {
      console.error('ログ取得エラー:', error);
      return [];
    }
  }

  // ログをクリア
  public async clearLogs(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.storageKey);
    } catch (error) {
      console.error('ログクリアエラー:', error);
      throw error;
    }
  }
}

// シングルトンインスタンスをエクスポート
export const simpleLogStorage = SimpleLogStorage.getInstance();
