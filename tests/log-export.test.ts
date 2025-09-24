/**
 * Morizo Mobile - ログエクスポートテスト
 * 
 * ログエクスポート機能のテスト関数
 */

import { LogEntry, LogLevel, LogCategory } from '../lib/logging/types';
import { logExport, ExportFormat } from '../lib/logging/storage/log-export';

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
 * ログエクスポート基本機能テスト
 */
export const testLogExportBasic = async (): Promise<void> => {
  console.log('🧪 ログエクスポート基本機能テスト開始');
  
  try {
    // テストログを作成
    const testLogs = createTestLogEntries(5);
    
    // JSON形式でエクスポート
    console.log('✅ JSON形式エクスポートテスト: エクスポートを実行');
    await logExport.exportLogs(testLogs, ExportFormat.JSON);
    
    // テキスト形式でエクスポート
    console.log('✅ テキスト形式エクスポートテスト: エクスポートを実行');
    await logExport.exportLogs(testLogs, ExportFormat.TEXT);
    
    // CSV形式でエクスポート
    console.log('✅ CSV形式エクスポートテスト: エクスポートを実行');
    await logExport.exportLogs(testLogs, ExportFormat.CSV);
    
    console.log('🎉 ログエクスポート基本機能テスト完了');
    
  } catch (error) {
    console.error('❌ ログエクスポート基本機能テストエラー:', error);
    throw error;
  }
};

/**
 * ログエクスポートフィルタリングテスト
 */
export const testLogExportFiltering = async (): Promise<void> => {
  console.log('🧪 ログエクスポートフィルタリングテスト開始');
  
  try {
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
    
    // レベルフィルタリングでエクスポート
    console.log('✅ レベルフィルタリングエクスポートテスト: INFOレベルのみ');
    await logExport.exportFilteredLogs(
      testLogs,
      { level: LogLevel.INFO },
      ExportFormat.JSON
    );
    
    // カテゴリフィルタリングでエクスポート
    console.log('✅ カテゴリフィルタリングエクスポートテスト: APIカテゴリのみ');
    await logExport.exportFilteredLogs(
      testLogs,
      { category: LogCategory.API },
      ExportFormat.TEXT
    );
    
    // 日付フィルタリングでエクスポート
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    console.log('✅ 日付フィルタリングエクスポートテスト: 昨日以降のログ');
    await logExport.exportFilteredLogs(
      testLogs,
      { startDate: yesterday },
      ExportFormat.CSV
    );
    
    console.log('🎉 ログエクスポートフィルタリングテスト完了');
    
  } catch (error) {
    console.error('❌ ログエクスポートフィルタリングテストエラー:', error);
    throw error;
  }
};

/**
 * ログエクスポートオプションテスト
 */
export const testLogExportOptions = async (): Promise<void> => {
  console.log('🧪 ログエクスポートオプションテスト開始');
  
  try {
    // テストログを作成
    const testLogs = createTestLogEntries(3);
    
    // メタデータなしでエクスポート
    console.log('✅ メタデータなしエクスポートテスト');
    await logExport.exportLogs(testLogs, ExportFormat.JSON, {
      includeMetadata: false,
    });
    
    // カスタムファイル名でエクスポート
    console.log('✅ カスタムファイル名エクスポートテスト');
    await logExport.exportLogs(testLogs, ExportFormat.TEXT, {
      filename: 'custom-test-logs.txt',
    });
    
    // メタデータありでエクスポート
    console.log('✅ メタデータありエクスポートテスト');
    await logExport.exportLogs(testLogs, ExportFormat.JSON, {
      includeMetadata: true,
    });
    
    console.log('🎉 ログエクスポートオプションテスト完了');
    
  } catch (error) {
    console.error('❌ ログエクスポートオプションテストエラー:', error);
    throw error;
  }
};

/**
 * ログエクスポートエラーハンドリングテスト
 */
export const testLogExportErrorHandling = async (): Promise<void> => {
  console.log('🧪 ログエクスポートエラーハンドリングテスト開始');
  
  try {
    // 空のログ配列でエクスポート
    console.log('✅ 空ログ配列エクスポートテスト');
    try {
      await logExport.exportLogs([], ExportFormat.JSON);
      console.log('✅ 空ログ配列エクスポート: 正常に処理されました');
    } catch (error) {
      console.log('✅ 空ログ配列エクスポート: エラーが適切に処理されました');
    }
    
    // 無効なフォーマットでエクスポート
    console.log('✅ 無効フォーマットエクスポートテスト');
    try {
      await logExport.exportLogs(createTestLogEntries(1), 'invalid' as ExportFormat);
      console.log('❌ 無効フォーマットエクスポート: エラーが発生すべきでした');
    } catch (error) {
      console.log('✅ 無効フォーマットエクスポート: エラーが適切に処理されました');
    }
    
    console.log('🎉 ログエクスポートエラーハンドリングテスト完了');
    
  } catch (error) {
    console.error('❌ ログエクスポートエラーハンドリングテストエラー:', error);
    throw error;
  }
};

/**
 * 全テストを実行
 */
export const runAllLogExportTests = async (): Promise<void> => {
  console.log('🚀 ログエクスポート全テスト開始');
  
  try {
    await testLogExportBasic();
    await testLogExportFiltering();
    await testLogExportOptions();
    await testLogExportErrorHandling();
    
    console.log('🎉 ログエクスポート全テスト完了');
    
  } catch (error) {
    console.error('❌ ログエクスポート全テストエラー:', error);
    throw error;
  }
};
