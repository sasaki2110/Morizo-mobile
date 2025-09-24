/**
 * Morizo Mobile - ログストレージテスト
 * 
 * ログストレージ機能のテスト関数
 */

import { LogEntry, LogLevel, LogCategory } from '../lib/logging/types';
import { logStorage } from '../lib/logging/storage/log-storage';

// テスト用のログエントリを作成
const createTestLogEntry = (index: number): LogEntry => ({
  timestamp: new Date(Date.now() - index * 1000).toISOString(),
  category: LogCategory.API,
  level: LogLevel.INFO,
  message: `テストログメッセージ ${index}`,
  data: { testData: `test-${index}`, index },
  platform: 'test',
});

// テスト用のログエントリ配列を作成
const createTestLogEntries = (count: number): LogEntry[] => {
  return Array.from({ length: count }, (_, index) => createTestLogEntry(index));
};

/**
 * ログストレージの基本機能テスト
 */
export const testLogStorageBasic = async (): Promise<void> => {
  console.log('🧪 ログストレージ基本機能テスト開始');
  
  try {
    // テスト前にログをクリア
    await logStorage.clearLogs();
    
    // テストログを作成・保存
    const testLogs = createTestLogEntries(5);
    for (const log of testLogs) {
      await logStorage.saveLog(log);
    }
    
    // ログを取得・検証
    const retrievedLogs = await logStorage.getLogs();
    console.log(`✅ ログ保存・取得テスト: ${retrievedLogs.length}件のログを取得`);
    
    // ストレージサイズを取得
    const storageSize = await logStorage.getStorageSize();
    console.log(`✅ ストレージサイズ取得テスト: ${storageSize.sizeMB}MB, ${storageSize.entryCount}件`);
    
    // ログをクリア
    await logStorage.clearLogs();
    const clearedLogs = await logStorage.getLogs();
    console.log(`✅ ログクリアテスト: ${clearedLogs.length}件のログが残存`);
    
    console.log('🎉 ログストレージ基本機能テスト完了');
    
  } catch (error) {
    console.error('❌ ログストレージ基本機能テストエラー:', error);
    throw error;
  }
};

/**
 * ログフィルタリング機能テスト
 */
export const testLogStorageFiltering = async (): Promise<void> => {
  console.log('🧪 ログフィルタリング機能テスト開始');
  
  try {
    // テスト前にログをクリア
    await logStorage.clearLogs();
    
    // 異なるレベル・カテゴリのログを作成
    const testLogs: LogEntry[] = [
      {
        timestamp: new Date().toISOString(),
        category: LogCategory.API,
        level: LogLevel.INFO,
        message: 'API呼び出し成功',
        data: { status: 200 },
        platform: 'test',
      },
      {
        timestamp: new Date().toISOString(),
        category: LogCategory.AUTH,
        level: LogLevel.ERROR,
        message: '認証エラー',
        data: { error: 'Invalid token' },
        platform: 'test',
      },
      {
        timestamp: new Date().toISOString(),
        category: LogCategory.API,
        level: LogLevel.WARN,
        message: 'API応答が遅い',
        data: { responseTime: 5000 },
        platform: 'test',
      },
    ];
    
    // ログを保存
    await logStorage.saveLogs(testLogs);
    
    // レベルフィルタリングテスト
    const infoLogs = await logStorage.getFilteredLogs({ level: LogLevel.INFO });
    console.log(`✅ レベルフィルタリングテスト: INFOレベル ${infoLogs.length}件`);
    
    // カテゴリフィルタリングテスト
    const apiLogs = await logStorage.getFilteredLogs({ category: LogCategory.API });
    console.log(`✅ カテゴリフィルタリングテスト: APIカテゴリ ${apiLogs.length}件`);
    
    // テキスト検索テスト
    const searchLogs = await logStorage.getFilteredLogs({ searchText: 'API' });
    console.log(`✅ テキスト検索テスト: 'API'を含むログ ${searchLogs.length}件`);
    
    // 日付フィルタリングテスト
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const recentLogs = await logStorage.getFilteredLogs({ startDate: yesterday });
    console.log(`✅ 日付フィルタリングテスト: 昨日以降のログ ${recentLogs.length}件`);
    
    console.log('🎉 ログフィルタリング機能テスト完了');
    
  } catch (error) {
    console.error('❌ ログフィルタリング機能テストエラー:', error);
    throw error;
  }
};

/**
 * ログストレージサイズ制限テスト
 */
export const testLogStorageSizeLimits = async (): Promise<void> => {
  console.log('🧪 ログストレージサイズ制限テスト開始');
  
  try {
    // テスト前にログをクリア
    await logStorage.clearLogs();
    
    // 大量のログを作成（サイズ制限をテスト）
    const largeLogs = createTestLogEntries(100);
    await logStorage.saveLogs(largeLogs);
    
    // ストレージサイズを確認
    const storageSize = await logStorage.getStorageSize();
    console.log(`✅ 大量ログ保存テスト: ${storageSize.sizeMB}MB, ${storageSize.entryCount}件`);
    
    // ログをクリア
    await logStorage.clearLogs();
    
    console.log('🎉 ログストレージサイズ制限テスト完了');
    
  } catch (error) {
    console.error('❌ ログストレージサイズ制限テストエラー:', error);
    throw error;
  }
};

/**
 * バックアップ機能テスト
 */
export const testLogStorageBackup = async (): Promise<void> => {
  console.log('🧪 バックアップ機能テスト開始');
  
  try {
    // テスト前にログをクリア
    await logStorage.clearLogs();
    
    // テストログを作成・保存
    const testLogs = createTestLogEntries(10);
    await logStorage.saveLogs(testLogs);
    
    // バックアップを作成
    await logStorage.createBackup();
    console.log('✅ バックアップ作成テスト: バックアップを作成');
    
    // 利用可能なバックアップを取得
    const backups = await logStorage.getAvailableBackups();
    console.log(`✅ バックアップ一覧取得テスト: ${backups.length}個のバックアップ`);
    
    // ログをクリア
    await logStorage.clearLogs();
    const clearedLogs = await logStorage.getLogs();
    console.log(`✅ ログクリア後の確認: ${clearedLogs.length}件のログが残存`);
    
    // バックアップから復元（バックアップがある場合）
    if (backups.length > 0) {
      await logStorage.restoreFromBackup(backups[0]);
      const restoredLogs = await logStorage.getLogs();
      console.log(`✅ バックアップ復元テスト: ${restoredLogs.length}件のログを復元`);
    }
    
    console.log('🎉 バックアップ機能テスト完了');
    
  } catch (error) {
    console.error('❌ バックアップ機能テストエラー:', error);
    throw error;
  }
};

/**
 * 全テストを実行
 */
export const runAllLogStorageTests = async (): Promise<void> => {
  console.log('🚀 ログストレージ全テスト開始');
  
  try {
    await testLogStorageBasic();
    await testLogStorageFiltering();
    await testLogStorageSizeLimits();
    await testLogStorageBackup();
    
    console.log('🎉 ログストレージ全テスト完了');
    
  } catch (error) {
    console.error('❌ ログストレージ全テストエラー:', error);
    throw error;
  }
};
