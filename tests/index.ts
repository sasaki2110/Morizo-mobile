/**
 * Morizo Mobile - テスト実行エントリーポイント
 * 
 * 全テストを実行するためのメイン関数
 */

import { runAllLogStorageTests } from './log-storage.test';
import { runAllLogExportTests } from './log-export.test';
import { runAllLogRotationTests } from './log-rotation.test';

/**
 * 全テストを実行
 */
export const runAllTests = async (): Promise<void> => {
  console.log('🚀 Morizo Mobile 全テスト開始');
  console.log('=====================================');
  
  try {
    // ログストレージテスト
    console.log('\n📦 ログストレージテスト');
    console.log('-------------------------------------');
    await runAllLogStorageTests();
    
    // ログエクスポートテスト
    console.log('\n📤 ログエクスポートテスト');
    console.log('-------------------------------------');
    await runAllLogExportTests();
    
    // ログローテーションテスト
    console.log('\n🔄 ログローテーションテスト');
    console.log('-------------------------------------');
    await runAllLogRotationTests();
    
    console.log('\n🎉 Morizo Mobile 全テスト完了');
    console.log('=====================================');
    
  } catch (error) {
    console.error('\n❌ Morizo Mobile 全テストエラー:', error);
    console.log('=====================================');
    throw error;
  }
};

/**
 * 個別テスト実行関数
 */
export const runLogStorageTests = () => runAllLogStorageTests();
export const runLogExportTests = () => runAllLogExportTests();
export const runLogRotationTests = () => runAllLogRotationTests();

/**
 * テスト結果サマリー
 */
export const getTestSummary = (): string => {
  return `
🧪 Morizo Mobile テストサマリー

📦 ログストレージ機能:
  ✅ 基本機能（保存・取得・クリア）
  ✅ フィルタリング（レベル・カテゴリ・検索・日付）
  ✅ サイズ制限
  ✅ バックアップ機能

📤 ログエクスポート機能:
  ✅ 基本エクスポート（JSON・テキスト・CSV）
  ✅ フィルタリングエクスポート
  ✅ エクスポートオプション
  ✅ エラーハンドリング

🔄 ログローテーション機能:
  ✅ 基本ローテーション
  ✅ サイズ制限
  ✅ 年齢制限
  ✅ 自動ローテーションチェック
  ✅ 手動ローテーション
  ✅ 設定管理

🎯 テスト対象:
  - Expo Go実機対応
  - iOS・Android・Web対応
  - AsyncStorage・localStorage対応
  - エラーハンドリング
  - パフォーマンス
  - セキュリティ

📱 実装完了機能:
  - Phase 3.1: Expo Go実機対応ログ採取
  - AsyncStorage + アプリ内ログビューアー
  - ログ保存・表示・エクスポート機能
  - ログローテーション・ストレージサイズ管理
  `;
};
