import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Alert, ActivityIndicator, ScrollView, FlatList } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { uploadInventoryCSV, CSVUploadResult } from '../api/inventory-api';

interface InventoryCSVUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete: () => void;
}

const InventoryCSVUploadModal: React.FC<InventoryCSVUploadModalProps> = ({
  isOpen,
  onClose,
  onUploadComplete,
}) => {
  const [file, setFile] = useState<DocumentPicker.DocumentPickerResult | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<CSVUploadResult | null>(null);

  const handleFileSelect = async () => {
    try {
      // すべてのファイルタイプを許可し、後でCSVファイルであることをチェック
      // Android 11+のScoped Storage制約に対応するため、広範囲のファイルタイプを許可
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*', // すべてのファイルタイプを許可
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedFile = result.assets[0];
        // ファイル名の拡張子でチェック
        const fileName = selectedFile.name.toLowerCase();
        if (!fileName.endsWith('.csv')) {
          Alert.alert('エラー', 'CSVファイルのみアップロード可能です。\n選択されたファイル: ' + selectedFile.name);
          return;
        }
        setFile(result);
        setUploadResult(null);
      }
    } catch (error) {
      console.error('File selection failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'ファイル選択に失敗しました';
      Alert.alert('エラー', errorMessage);
    }
  };

  const handleUpload = async () => {
    if (!file || file.canceled || !file.assets || file.assets.length === 0) {
      Alert.alert('エラー', 'ファイルを選択してください');
      return;
    }

    setIsUploading(true);
    setUploadResult(null);

    try {
      const fileUri = file.assets[0].uri;
      const result = await uploadInventoryCSV(fileUri);
      setUploadResult(result);

      if (result.success && result.error_count === 0) {
        // 成功した場合、在庫一覧を再読み込み
        onUploadComplete();
      }
    } catch (error) {
      console.error('CSV Upload failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'アップロードに失敗しました';
      Alert.alert('エラー', errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setUploadResult(null);
    onClose();
  };

  if (!isOpen) return null;

  const fileSize = file && !file.canceled && file.assets && file.assets.length > 0
    ? (file.assets[0].size / 1024).toFixed(2)
    : null;

  return (
    <Modal
      visible={isOpen}
      animationType="fade"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* ヘッダー */}
          <View style={styles.header}>
            <Text style={styles.title}>CSVアップロード</Text>
            <TouchableOpacity onPress={handleClose}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {/* CSVフォーマット説明 */}
            <View style={styles.formatInfo}>
              <Text style={styles.formatTitle}>CSVフォーマット:</Text>
              <Text style={styles.formatText}>
                item_name,quantity,unit,storage_location,expiry_date
              </Text>
              <Text style={styles.formatExample}>
                例: りんご,5,個,冷蔵庫,2024-02-15
              </Text>
            </View>

            {/* ファイル選択 */}
            <View style={styles.fileSection}>
              <Text style={styles.label}>CSVファイルを選択</Text>
              <TouchableOpacity
                onPress={handleFileSelect}
                disabled={isUploading}
                style={[styles.fileButton, isUploading && styles.fileButtonDisabled]}
              >
                <Text style={styles.fileButtonText}>ファイルを選択</Text>
              </TouchableOpacity>
              {file && !file.canceled && file.assets && file.assets.length > 0 && (
                <Text style={styles.fileInfo}>
                  選択中のファイル: {file.assets[0].name} ({fileSize} KB)
                </Text>
              )}
            </View>

            {/* アップロードボタン */}
            <View style={styles.uploadSection}>
              <TouchableOpacity
                onPress={handleUpload}
                disabled={!file || file.canceled || isUploading}
                style={[
                  styles.uploadButton,
                  (!file || file.canceled || isUploading) && styles.uploadButtonDisabled
                ]}
              >
                {isUploading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.uploadButtonText}>アップロード</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* 進捗表示 */}
            {isUploading && (
              <View style={styles.progressSection}>
                <ActivityIndicator size="large" color="#2563eb" />
                <Text style={styles.progressText}>アップロード中...</Text>
              </View>
            )}

            {/* 結果表示 */}
            {uploadResult && (
              <View style={styles.resultSection}>
                <View style={[
                  styles.resultBox,
                  uploadResult.success && uploadResult.error_count === 0
                    ? styles.resultBoxSuccess
                    : styles.resultBoxWarning
                ]}>
                  <Text style={styles.resultTitle}>
                    {uploadResult.success && uploadResult.error_count === 0
                      ? '✅ アップロード成功'
                      : '⚠️ 部分成功'}
                  </Text>
                  <Text style={styles.resultText}>
                    総件数: {uploadResult.total}
                  </Text>
                  <Text style={styles.resultText}>
                    成功件数: {uploadResult.success_count}
                  </Text>
                  {uploadResult.error_count > 0 && (
                    <Text style={styles.resultErrorText}>
                      エラー件数: {uploadResult.error_count}
                    </Text>
                  )}
                </View>

                {/* エラー詳細 */}
                {uploadResult.errors && uploadResult.errors.length > 0 && (
                  <View style={styles.errorSection}>
                    <Text style={styles.errorTitle}>エラー詳細:</Text>
                    <FlatList
                      data={uploadResult.errors}
                      keyExtractor={(item, index) => `${item.row}-${index}`}
                      scrollEnabled={false}
                      renderItem={({ item }) => (
                        <View style={styles.errorRow}>
                          <Text style={styles.errorCellRow}>{item.row}</Text>
                          <Text style={styles.errorCellItem}>
                            {item.item_name || '-'}
                          </Text>
                          <Text style={styles.errorCellError} numberOfLines={2}>
                            {item.error}
                          </Text>
                        </View>
                      )}
                      ListHeaderComponent={() => (
                        <View style={styles.errorHeader}>
                          <Text style={styles.errorHeaderCell}>行</Text>
                          <Text style={styles.errorHeaderCell}>アイテム名</Text>
                          <Text style={styles.errorHeaderCell}>エラー</Text>
                        </View>
                      )}
                    />
                  </View>
                )}
              </View>
            )}
          </ScrollView>

          {/* 閉じるボタン */}
          <View style={styles.footer}>
            <TouchableOpacity
              onPress={handleClose}
              style={styles.closeButtonStyle}
            >
              <Text style={styles.closeButtonText}>閉じる</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    width: '100%',
    maxWidth: 600,
    maxHeight: '90%',
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  closeButton: {
    fontSize: 24,
    color: '#6b7280',
  },
  scrollView: {
    maxHeight: 500,
  },
  formatInfo: {
    backgroundColor: '#f3f4f6',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  formatTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  formatText: {
    fontSize: 12,
    color: '#6b7280',
    fontFamily: 'monospace',
  },
  formatExample: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  fileSection: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  fileButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  fileButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  fileButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  fileInfo: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 8,
  },
  uploadSection: {
    marginBottom: 20,
  },
  uploadButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  uploadButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  uploadButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  progressSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  progressText: {
    marginTop: 8,
    fontSize: 14,
    color: '#6b7280',
  },
  resultSection: {
    marginBottom: 20,
  },
  resultBox: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  resultBoxSuccess: {
    backgroundColor: '#d1fae5',
  },
  resultBoxWarning: {
    backgroundColor: '#fef3c7',
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  resultText: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
  },
  resultErrorText: {
    fontSize: 14,
    color: '#dc2626',
    marginTop: 4,
  },
  errorSection: {
    marginTop: 16,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  errorHeader: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 2,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  errorHeaderCell: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#4b5563',
  },
  errorRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  errorCellRow: {
    flex: 0.5,
    fontSize: 12,
    color: '#1f2937',
  },
  errorCellItem: {
    flex: 1,
    fontSize: 12,
    color: '#6b7280',
  },
  errorCellError: {
    flex: 2,
    fontSize: 12,
    color: '#dc2626',
  },
  footer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  closeButtonStyle: {
    backgroundColor: '#e5e7eb',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default InventoryCSVUploadModal;

