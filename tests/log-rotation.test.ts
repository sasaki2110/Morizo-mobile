/**
 * Morizo Mobile - ログローテーションテスト
 * 
 * ログローテーション機能のテスト関数
 */

import { LogEntry, LogLevel, LogCategory } from '../lib/logging/types';
import { logRotation, RotationConfig } from '../lib/logging/storage/log-rotation';
import { logStorage } from '../lib/logging/storage/log-storage';

// テスト用のログエントリを作成
const createTestLogEntry = (index: number, daysAgo: number = 0): LogEntry => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  
  return {
    timestamp: date.toISOString(),
    category: LogCategory.API,
    level: LogLevel.INFO,
    message: `テストログメッセージ ${index}`,
    data: { testData: `test-${index}`, index, daysAgo },
    platform: 'test',
  };
};

// テスト用のログエントリ配列を作成
const createTestLogEntries = (count: number, daysAgo: number = 0): LogEntry[] => {
  return Array.from({ length: count }, (_, index) => createTestLogEntry(index, daysAgo));
};

/**
 * ログローテーション基本機能テスト
 */
export const testLogRotationBasic = async (): Promise<void> => {
  console.log('🧪 ログローテーション基本機能テスト開始');
  
  try {
    // テスト前にログをクリア
    await logStorage.clearLogs();
    
    // テスト用の設定を適用
    const testConfig: Partial<RotationConfig> = {
      maxSizeMB: 1,        // 1MB
      maxEntries: 10,      // 10件
      maxAgeDays: 3,       // 3日
      backupCount: 2,      // 2つのバックアップ
      autoRotation: true,  // 自動ローテーション有効
    };
    
    await logRotation.saveConfig(testConfig);
    console.log('✅ ローテーション設定テスト: 設定を保存');
    
    // 設定を取得・検証
    const config = logRotation.getConfig();
    console.log(`✅ ローテーション設定取得テスト: maxSizeMB=${config.maxSizeMB}, maxEntries=${config.maxEntries}`);
    
    // テストログを作成・保存
    const testLogs = createTestLogEntries(5);
    await logStorage.saveLogs(testLogs);
    
    // ローテーションを実行
    const result = await logRotation.rotate();
    console.log(`✅ ローテーション実行テスト: ${result.removedEntries}件削除, ${result.totalSizeAfter}バイト`);
    
    // ローテーション履歴を取得
    const history = await logRotation.getRotationHistory();
    console.log(`✅ ローテーション履歴取得テスト: ${history.length}件の履歴`);
    
    // ローテーション統計を取得
    const stats = await logRotation.getRotationStats();
    console.log(`✅ ローテーション統計取得テスト: ${stats.totalRotations}回のローテーション`);
    
    console.log('🎉 ログローテーション基本機能テスト完了');
    
  } catch (error) {
    console.error('❌ ログローテーション基本機能テストエラー:', error);
    throw error;
  }
};

/**
 * ログローテーションサイズ制限テスト
 */
export const testLogRotationSizeLimits = async (): Promise<void> => {
  console.log('🧪 ログローテーションサイズ制限テスト開始');
  
  try {
    // テスト前にログをクリア
    await logStorage.clearLogs();
    
    // サイズ制限を厳しく設定
    const testConfig: Partial<RotationConfig> = {
      maxSizeMB: 0.1,      // 0.1MB（非常に小さい）
      maxEntries: 5,       // 5件
      maxAgeDays: 30,      // 30日
      autoRotation: true,
    };
    
    await logRotation.saveConfig(testConfig);
    
    // 大量のログを作成（サイズ制限を超える）
    const largeLogs = createTestLogEntries(20);
    await logStorage.saveLogs(largeLogs);
    
    // ローテーション前のサイズを確認
    const sizeBefore = await logStorage.getStorageSize();
    console.log(`✅ ローテーション前サイズ: ${sizeBefore.sizeMB}MB, ${sizeBefore.entryCount}件`);
    
    // ローテーションを実行
    const result = await logRotation.rotate();
    console.log(`✅ サイズ制限ローテーション: ${result.removedEntries}件削除`);
    
    // ローテーション後のサイズを確認
    const sizeAfter = await logStorage.getStorageSize();
    console.log(`✅ ローテーション後サイズ: ${sizeAfter.sizeMB}MB, ${sizeAfter.entryCount}件`);
    
    console.log('🎉 ログローテーションサイズ制限テスト完了');
    
  } catch (error) {
    console.error('❌ ログローテーションサイズ制限テストエラー:', error);
    throw error;
  }
};

/**
 * ログローテーション年齢制限テスト
 */
export const testLogRotationAgeLimits = async (): Promise<void> => {
  console.log('🧪 ログローテーション年齢制限テスト開始');
  
  try {
    // テスト前にログをクリア
    await logStorage.clearLogs();
    
    // 年齢制限を厳しく設定
    const testConfig: Partial<RotationConfig> = {
      maxSizeMB: 10,       // 10MB（大きめ）
      maxEntries: 100,     // 100件
      maxAgeDays: 1,       // 1日（非常に短い）
      autoRotation: true,
    };
    
    await logRotation.saveConfig(testConfig);
    
    // 古いログと新しいログを作成
    const oldLogs = createTestLogEntries(5, 2);  // 2日前のログ
    const newLogs = createTestLogEntries(5, 0);  // 今日のログ
    const allLogs = [...oldLogs, ...newLogs];
    
    await logStorage.saveLogs(allLogs);
    
    // ローテーション前のログ数を確認
    const logsBefore = await logStorage.getLogs();
    console.log(`✅ ローテーション前ログ数: ${logsBefore.length}件`);
    
    // ローテーションを実行
    const result = await logRotation.rotate();
    console.log(`✅ 年齢制限ローテーション: ${result.removedEntries}件削除`);
    
    // ローテーション後のログ数を確認
    const logsAfter = await logStorage.getLogs();
    console.log(`✅ ローテーション後ログ数: ${logsAfter.length}件`);
    
    console.log('🎉 ログローテーション年齢制限テスト完了');
    
  } catch (error) {
    console.error('❌ ログローテーション年齢制限テストエラー:', error);
    throw error;
  }
};

/**
 * 自動ローテーションチェックテスト
 */
export const testLogRotationAutoCheck = async (): Promise<void> => {
  console.log('🧪 自動ローテーションチェックテスト開始');
  
  try {
    // テスト前にログをクリア
    await logStorage.clearLogs();
    
    // 自動ローテーションを有効に設定
    const testConfig: Partial<RotationConfig> = {
      maxSizeMB: 0.1,      // 0.1MB（小さい）
      maxEntries: 5,       // 5件
      maxAgeDays: 1,       // 1日
      autoRotation: true,  // 自動ローテーション有効
    };
    
    await logRotation.saveConfig(testConfig);
    
    // 少量のログを作成（制限内）
    const smallLogs = createTestLogEntries(3);
    await logStorage.saveLogs(smallLogs);
    
    // 自動ローテーションが必要かチェック
    const needsRotation1 = await logRotation.checkAutoRotation();
    console.log(`✅ 少量ログ自動ローテーションチェック: ${needsRotation1 ? '必要' : '不要'}`);
    
    // 大量のログを作成（制限を超える）
    const largeLogs = createTestLogEntries(20);
    await logStorage.saveLogs(largeLogs);
    
    // 自動ローテーションが必要かチェック
    const needsRotation2 = await logRotation.checkAutoRotation();
    console.log(`✅ 大量ログ自動ローテーションチェック: ${needsRotation2 ? '必要' : '不要'}`);
    
    // 古いログを作成
    const oldLogs = createTestLogEntries(5, 2);
    await logStorage.saveLogs(oldLogs);
    
    // 自動ローテーションが必要かチェック
    const needsRotation3 = await logRotation.checkAutoRotation();
    console.log(`✅ 古いログ自動ローテーションチェック: ${needsRotation3 ? '必要' : '不要'}`);
    
    console.log('🎉 自動ローテーションチェックテスト完了');
    
  } catch (error) {
    console.error('❌ 自動ローテーションチェックテストエラー:', error);
    throw error;
  }
};

/**
 * 手動ローテーションテスト
 */
export const testLogRotationManual = async (): Promise<void> => {
  console.log('🧪 手動ローテーションテスト開始');
  
  try {
    // テスト前にログをクリア
    await logStorage.clearLogs();
    
    // テストログを作成
    const testLogs = createTestLogEntries(10);
    await logStorage.saveLogs(testLogs);
    
    // 手動ローテーションを実行
    const result = await logRotation.manualRotate();
    console.log(`✅ 手動ローテーション実行: ${result.removedEntries}件削除`);
    
    // 最後のローテーション日時を取得
    const lastRotationDate = await logRotation.getLastRotationDate();
    console.log(`✅ 最後のローテーション日時: ${lastRotationDate?.toISOString()}`);
    
    console.log('🎉 手動ローテーションテスト完了');
    
  } catch (error) {
    console.error('❌ 手動ローテーションテストエラー:', error);
    throw error;
  }
};

/**
 * 設定リセットテスト
 */
export const testLogRotationConfigReset = async (): Promise<void> => {
  console.log('🧪 ログローテーション設定リセットテスト開始');
  
  try {
    // カスタム設定を適用
    const customConfig: Partial<RotationConfig> = {
      maxSizeMB: 2,
      maxEntries: 20,
      maxAgeDays: 5,
      backupCount: 1,
      autoRotation: false,
    };
    
    await logRotation.saveConfig(customConfig);
    const customConfigResult = logRotation.getConfig();
    console.log(`✅ カスタム設定適用: maxSizeMB=${customConfigResult.maxSizeMB}`);
    
    // 設定をリセット
    await logRotation.resetConfig();
    const resetConfigResult = logRotation.getConfig();
    console.log(`✅ 設定リセット: maxSizeMB=${resetConfigResult.maxSizeMB}`);
    
    console.log('🎉 ログローテーション設定リセットテスト完了');
    
  } catch (error) {
    console.error('❌ ログローテーション設定リセットテストエラー:', error);
    throw error;
  }
};

/**
 * 全テストを実行
 */
export const runAllLogRotationTests = async (): Promise<void> => {
  console.log('🚀 ログローテーション全テスト開始');
  
  try {
    await testLogRotationBasic();
    await testLogRotationSizeLimits();
    await testLogRotationAgeLimits();
    await testLogRotationAutoCheck();
    await testLogRotationManual();
    await testLogRotationConfigReset();
    
    console.log('🎉 ログローテーション全テスト完了');
    
  } catch (error) {
    console.error('❌ ログローテーション全テストエラー:', error);
    throw error;
  }
};
