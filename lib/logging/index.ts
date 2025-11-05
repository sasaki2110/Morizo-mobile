// Morizo Mobile - ロギングシステム統一エクスポート

export * from './types';
export * from './mobile-logger';
export * from './logging-utils';

// Phase 3.1: Expo Go実機対応ログ採取機能
// export * from './storage/log-storage-fixed';
// export * from './storage/log-export';
export * from './storage/log-rotation';

// メインエクスポート
export { log, mobileLogger } from './logging-utils';
export { LogCategory, LogLevel } from './types';
export { 
  logAuth, 
  logVoice, 
  logChat, 
  logAPI, 
  logSession, 
  logComponent, 
  logNavigation, 
  logStorage, 
  logNetwork,
  safeLog,
  logWithPlatform 
} from './logging-utils';

// Phase 3.1: ログストレージ機能エクスポート（一時的に無効化）
// export { 
//   logStorageFixed as logStorage,
//   saveLog,
//   getLogs,
//   getFilteredLogs,
//   clearLogs,
//   getStorageSize,
//   createBackup,
//   getAvailableBackups
// } from './storage/log-storage-fixed';

// Phase 3.1: ログエクスポート機能エクスポート（一時的に無効化）
// export { 
//   logExport,
//   exportLogs,
//   sendLogsByEmail,
//   shareLogs,
//   ExportFormat
// } from './storage/log-export';

// Phase 3.1: ログローテーション機能エクスポート
export { 
  logRotation,
  rotateLogs,
  checkAutoRotation,
  getRotationStats,
  manualRotate,
  getRotationConfig,
  updateRotationConfig
} from './storage/log-rotation';
