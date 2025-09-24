/**
 * Morizo Mobile - ログビューアー画面
 * 
 * Expo Go実機対応のログ表示・管理画面
 * AsyncStorageからログを読み込み、表示・フィルタリング・エクスポート機能を提供
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  Platform,
  RefreshControl,
  Modal,
  SafeAreaView,
} from 'react-native';
import { LogEntry, LogLevel, LogCategory } from '../types';
import { logStorageFixed } from '../storage/log-storage-fixed';
// import { logExport } from '../storage/log-export';

// ログレベル表示設定
const LOG_LEVEL_CONFIG = {
  [LogLevel.DEBUG]: { label: 'DEBUG', color: '#6B7280', emoji: '🔍' },
  [LogLevel.INFO]: { label: 'INFO', color: '#3B82F6', emoji: 'ℹ️' },
  [LogLevel.WARN]: { label: 'WARN', color: '#F59E0B', emoji: '⚠️' },
  [LogLevel.ERROR]: { label: 'ERROR', color: '#EF4444', emoji: '❌' },
} as const;

// フィルタオプション
interface FilterOptions {
  level: LogLevel | 'ALL';
  category: string | 'ALL';
  searchText: string;
}

// ログ詳細モーダル用のProps
interface LogDetailModalProps {
  visible: boolean;
  log: LogEntry | null;
  onClose: () => void;
}

/**
 * ログ詳細モーダルコンポーネント
 */
const LogDetailModal: React.FC<LogDetailModalProps> = ({ visible, log, onClose }) => {
  if (!log) return null;

  const copyToClipboard = async () => {
    try {
      const logText = `${log.timestamp} - ${log.category} - ${log.level} - ${log.message}${log.data ? ` | Data: ${JSON.stringify(log.data, null, 2)}` : ''}`;
      // クリップボードにコピー（React Nativeの場合はClipboard APIを使用）
      if (Platform.OS === 'web') {
        await navigator.clipboard.writeText(logText);
        Alert.alert('成功', 'ログをクリップボードにコピーしました');
      } else {
        // モバイルの場合は後で実装
        Alert.alert('情報', 'モバイルでのクリップボード機能は後で実装予定です');
      }
    } catch (error) {
      Alert.alert('エラー', 'クリップボードへのコピーに失敗しました');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>ログ詳細</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>閉じる</Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.modalContent}>
          <View style={styles.logDetailContainer}>
            <View style={styles.logDetailRow}>
              <Text style={styles.logDetailLabel}>タイムスタンプ:</Text>
              <Text style={styles.logDetailValue}>{log.timestamp}</Text>
            </View>
            
            <View style={styles.logDetailRow}>
              <Text style={styles.logDetailLabel}>レベル:</Text>
              <Text style={[styles.logDetailValue, { color: LOG_LEVEL_CONFIG[log.level].color }]}>
                {LOG_LEVEL_CONFIG[log.level].emoji} {LOG_LEVEL_CONFIG[log.level].label}
              </Text>
            </View>
            
            <View style={styles.logDetailRow}>
              <Text style={styles.logDetailLabel}>カテゴリ:</Text>
              <Text style={styles.logDetailValue}>{log.category}</Text>
            </View>
            
            <View style={styles.logDetailRow}>
              <Text style={styles.logDetailLabel}>メッセージ:</Text>
              <Text style={styles.logDetailValue}>{log.message}</Text>
            </View>
            
            {log.data && (
              <View style={styles.logDetailRow}>
                <Text style={styles.logDetailLabel}>データ:</Text>
                <Text style={styles.logDetailValue}>
                  {JSON.stringify(log.data, null, 2)}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
        
        <View style={styles.modalFooter}>
          <TouchableOpacity onPress={copyToClipboard} style={styles.copyButton}>
            <Text style={styles.copyButtonText}>コピー</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

/**
 * ログビューアー画面メインコンポーネント
 */
interface LogViewerScreenProps {
  visible?: boolean;
  onClose?: () => void;
}

const LogViewerScreen: React.FC<LogViewerScreenProps> = ({ visible = true, onClose }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [storageInfo, setStorageInfo] = useState({ sizeMB: 0, entryCount: 0 });
  
  // フィルタ状態
  const [filters, setFilters] = useState<FilterOptions>({
    level: 'ALL',
    category: 'ALL',
    searchText: '',
  });

  // ログを読み込み
  const loadLogs = useCallback(async () => {
    try {
      setLoading(true);
      console.log('=== ログビューアー: ログ読み込み開始 ===');
      const allLogs = await logStorageFixed.getLogs();
      console.log('読み込まれたログ数:', allLogs.length);
      console.log('ログ内容:', allLogs);
      setLogs(allLogs);
      
      // ストレージ情報を取得
      const storageSize = await logStorageFixed.getStorageSize();
      console.log('ストレージサイズ:', storageSize);
      setStorageInfo(storageSize);
      
    } catch (error) {
      console.error('ログ読み込みエラー:', error);
      Alert.alert('エラー', 'ログの読み込みに失敗しました');
    } finally {
      setLoading(false);
      console.log('=== ログビューアー: ログ読み込み完了 ===');
    }
  }, []);

  // フィルタリング
  const applyFilters = useCallback(async () => {
    try {
      const filterParams: any = {};
      
      if (filters.level !== 'ALL') {
        filterParams.level = filters.level;
      }
      
      if (filters.category !== 'ALL') {
        filterParams.category = filters.category;
      }
      
      if (filters.searchText.trim()) {
        filterParams.searchText = filters.searchText.trim();
      }
      
      const filtered = await logStorageFixed.getFilteredLogs(filterParams);
      setFilteredLogs(filtered);
      
    } catch (error) {
      console.error('フィルタリングエラー:', error);
      Alert.alert('エラー', 'フィルタリングに失敗しました');
    }
  }, [filters]);

  // ログをエクスポート（一時的に無効化）
  const handleExport = async () => {
    try {
      const logsToExport = filteredLogs.length > 0 ? filteredLogs : logs;
      
      if (logsToExport.length === 0) {
        Alert.alert('情報', 'エクスポートするログがありません');
        return;
      }
      
      // await logExport.exportLogs(logsToExport, 'json');
      Alert.alert('情報', 'エクスポート機能は一時的に無効化されています');
      
    } catch (error) {
      console.error('エクスポートエラー:', error);
      Alert.alert('エラー', 'ログのエクスポートに失敗しました');
    }
  };

  // ログをクリア
  const handleClearLogs = () => {
    Alert.alert(
      '確認',
      'すべてのログを削除しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            try {
              await logStorageFixed.clearLogs();
              await loadLogs();
              Alert.alert('成功', 'ログを削除しました');
            } catch (error) {
              console.error('ログ削除エラー:', error);
              Alert.alert('エラー', 'ログの削除に失敗しました');
            }
          },
        },
      ]
    );
  };

  // ログ詳細を表示
  const showLogDetail = (log: LogEntry) => {
    setSelectedLog(log);
    setShowDetailModal(true);
  };

  // プルリフレッシュ
  const onRefresh = async () => {
    setRefreshing(true);
    await loadLogs();
    setRefreshing(false);
  };

  // 初期化
  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  // フィルタ変更時に適用
  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  // ログレベル選択ボタン
  const renderLevelFilter = () => (
    <View style={styles.filterRow}>
      <Text style={styles.filterLabel}>レベル:</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
        {['ALL', LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR].map((level) => (
          <TouchableOpacity
            key={level}
            style={[
              styles.filterButton,
              filters.level === level && styles.filterButtonActive,
            ]}
            onPress={() => setFilters(prev => ({ ...prev, level: level as any }))}
          >
            <Text style={[
              styles.filterButtonText,
              filters.level === level && styles.filterButtonTextActive,
            ]}>
              {level === 'ALL' ? 'ALL' : LOG_LEVEL_CONFIG[level as LogLevel].emoji} {level === 'ALL' ? 'ALL' : LOG_LEVEL_CONFIG[level as LogLevel].label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  // カテゴリ選択ボタン
  const renderCategoryFilter = () => {
    const categories = ['ALL', ...Object.values(LogCategory)];
    
    return (
      <View style={styles.filterRow}>
        <Text style={styles.filterLabel}>カテゴリ:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {categories.map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                styles.filterButton,
                filters.category === category && styles.filterButtonActive,
              ]}
              onPress={() => setFilters(prev => ({ ...prev, category }))}
            >
              <Text style={[
                styles.filterButtonText,
                filters.category === category && styles.filterButtonTextActive,
              ]}>
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  // ログアイテム
  const renderLogItem = (log: LogEntry, index: number) => {
    const levelConfig = LOG_LEVEL_CONFIG[log.level];
    
    return (
      <TouchableOpacity
        key={`${log.timestamp}-${index}`}
        style={styles.logItem}
        onPress={() => showLogDetail(log)}
      >
        <View style={styles.logHeader}>
          <Text style={[styles.logLevel, { color: levelConfig.color }]}>
            {levelConfig.emoji} {levelConfig.label}
          </Text>
          <Text style={styles.logCategory}>{log.category}</Text>
          <Text style={styles.logTimestamp}>
            {new Date(log.timestamp).toLocaleTimeString()}
          </Text>
        </View>
        
        <Text style={styles.logMessage} numberOfLines={2}>
          {log.message}
        </Text>
        
        {log.data && (
          <Text style={styles.logData} numberOfLines={1}>
            Data: {JSON.stringify(log.data)}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>ログを読み込み中...</Text>
      </View>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        {/* ヘッダー */}
        <View style={styles.header}>
          <Text style={styles.title}>ログビューアー</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={handleExport} style={styles.actionButton}>
              <Text style={styles.actionButtonText}>エクスポート</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleClearLogs} style={[styles.actionButton, styles.clearButton]}>
              <Text style={styles.actionButtonText}>クリア</Text>
            </TouchableOpacity>
            {onClose && (
              <TouchableOpacity onPress={onClose} style={[styles.actionButton, styles.closeButton]}>
                <Text style={styles.actionButtonText}>閉じる</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

      {/* ストレージ情報 */}
      <View style={styles.storageInfo}>
        <Text style={styles.storageText}>
          ログ数: {storageInfo.entryCount}件 | サイズ: {storageInfo.sizeMB}MB
        </Text>
      </View>

      {/* フィルタ */}
      <View style={styles.filterContainer}>
        {renderLevelFilter()}
        {renderCategoryFilter()}
        
        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            placeholder="ログを検索..."
            value={filters.searchText}
            onChangeText={(text) => setFilters(prev => ({ ...prev, searchText: text }))}
          />
        </View>
      </View>

      {/* ログリスト */}
      <ScrollView
        style={styles.logList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredLogs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {logs.length === 0 ? 'ログがありません' : 'フィルタに一致するログがありません'}
            </Text>
          </View>
        ) : (
          filteredLogs.map((log, index) => renderLogItem(log, index))
        )}
      </ScrollView>

        {/* ログ詳細モーダル */}
        <LogDetailModal
          visible={showDetailModal}
          log={selectedLog}
          onClose={() => setShowDetailModal(false)}
        />
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#3B82F6',
    borderRadius: 6,
  },
  clearButton: {
    backgroundColor: '#EF4444',
  },
  closeButton: {
    backgroundColor: '#6B7280',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  storageInfo: {
    padding: 12,
    backgroundColor: '#F3F4F6',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  storageText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  filterContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterRow: {
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  filterScroll: {
    flexDirection: 'row',
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: '#3B82F6',
  },
  filterButtonText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  searchRow: {
    marginTop: 8,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    backgroundColor: '#FFFFFF',
  },
  logList: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  logItem: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  logLevel: {
    fontSize: 12,
    fontWeight: '600',
  },
  logCategory: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  logTimestamp: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  logMessage: {
    fontSize: 14,
    color: '#111827',
    lineHeight: 20,
  },
  logData: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  closeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#6B7280',
    borderRadius: 6,
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  logDetailContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 16,
  },
  logDetailRow: {
    marginBottom: 12,
  },
  logDetailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  logDetailValue: {
    fontSize: 14,
    color: '#111827',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  copyButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  copyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default LogViewerScreen;
