import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Alert, ActivityIndicator, ScrollView, Image } from 'react-native';
import { OCRItem } from '../api/inventory-api';
import { UNITS, STORAGE_LOCATIONS } from '../lib/utils/ocr-constants';
import { useImagePicker } from '../hooks/useImagePicker';
import { useOCRAnalysis } from '../hooks/useOCRAnalysis';
import { useItemSelection } from '../hooks/useItemSelection';
import { useItemRegistration } from '../hooks/useItemRegistration';
import EditableItemList from './ocr/EditableItemList';

interface InventoryOCRModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete: () => void;
}

const InventoryOCRModal: React.FC<InventoryOCRModalProps> = ({
  isOpen,
  onClose,
  onUploadComplete,
}) => {
  const { imageUri, selectImage, clearImage } = useImagePicker();
  const { ocrResult, isAnalyzing, analyzeImage, editableItems, setEditableItems, clearResult } = useOCRAnalysis();
  const { selectedItems, toggleItem, selectAll, clearSelection } = useItemSelection(editableItems);
  const { isRegistering, registerItems } = useItemRegistration(onUploadComplete);
  const previousImageUriRef = useRef<string | null>(null);
  const previousItemsLengthRef = useRef<number>(0);

  const handleImageSelect = async () => {
    await selectImage();
  };

  // 画像選択時に他の状態をリセット（新しい画像が選択されたとき）
  useEffect(() => {
    // 新しい画像が選択された場合（前回がnullで今回がnull以外、または前回がnull以外で今回もnull以外かつ値が変わった場合）
    if (imageUri !== null && (previousImageUriRef.current === null || previousImageUriRef.current !== imageUri)) {
      clearResult();
      clearSelection();
      previousItemsLengthRef.current = 0;
    }
    previousImageUriRef.current = imageUri;
  }, [imageUri, clearResult, clearSelection]);

  // OCR解析が完了してアイテムが抽出されたとき、すべてのアイテムを選択状態にする
  // アイテム数が0から1以上に変わったときのみ全選択（編集による変更では全選択しない）
  useEffect(() => {
    const previousLength = previousItemsLengthRef.current;
    const currentLength = editableItems.length;
    
    if (previousLength === 0 && currentLength > 0) {
      // OCR解析が完了してアイテムが抽出されたとき
      selectAll(true);
    }
    
    previousItemsLengthRef.current = currentLength;
  }, [editableItems.length, selectAll]);

  const handleAnalyze = async () => {
    if (!imageUri) {
      Alert.alert('エラー', '画像ファイルを選択してください');
      return;
    }
    await analyzeImage(imageUri);
  };

  const handleItemEdit = (index: number, field: keyof OCRItem, value: string | number | null) => {
    const updated = [...editableItems];
    updated[index] = { ...updated[index], [field]: value };
    setEditableItems(updated);
  };


  const handleRegister = async () => {
    const itemsToRegister = Array.from(selectedItems).map(idx => editableItems[idx]);
    await registerItems(itemsToRegister, handleClose);
  };

  const handleClose = () => {
    clearImage();
    clearResult();
    clearSelection();
    onClose();
  };

  if (!isOpen) return null;

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
            <Text style={styles.title}>レシートOCR</Text>
            <TouchableOpacity onPress={handleClose}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {/* ステップ1: 画像選択 */}
            {!ocrResult && (
              <>
                {/* 画像選択 */}
                <View style={styles.section}>
                  <Text style={styles.label}>レシート画像を選択</Text>
                  <TouchableOpacity
                    onPress={handleImageSelect}
                    disabled={isAnalyzing}
                    style={[styles.imageButton, isAnalyzing && styles.imageButtonDisabled]}
                  >
                    <Text style={styles.imageButtonText}>画像を選択</Text>
                  </TouchableOpacity>
                  {imageUri && (
                    <Text style={styles.fileInfo}>
                      画像が選択されました
                    </Text>
                  )}
                </View>

                {/* 画像プレビュー */}
                {imageUri && (
                  <View style={styles.section}>
                    <Text style={styles.label}>プレビュー:</Text>
                    <Image
                      source={{ uri: imageUri }}
                      style={styles.previewImage}
                      resizeMode="contain"
                    />
                  </View>
                )}

                {/* OCR解析ボタン */}
                <View style={styles.section}>
                  <TouchableOpacity
                    onPress={handleAnalyze}
                    disabled={!imageUri || isAnalyzing}
                    style={[
                      styles.analyzeButton,
                      (!imageUri || isAnalyzing) && styles.analyzeButtonDisabled
                    ]}
                  >
                    {isAnalyzing ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text style={styles.analyzeButtonText}>OCR解析を実行</Text>
                    )}
                  </TouchableOpacity>
                </View>

                {/* 進捗表示 */}
                {isAnalyzing && (
                  <View style={styles.progressSection}>
                    <ActivityIndicator size="large" color="#8b5cf6" />
                    <Text style={styles.progressText}>OCR解析中... しばらくお待ちください</Text>
                  </View>
                )}
              </>
            )}

            {/* ステップ2: 解析結果の確認・編集 */}
            {ocrResult && editableItems.length > 0 && (
              <>
                {/* 結果サマリー */}
                <View style={[
                  styles.resultBox,
                  ocrResult.success ? styles.resultBoxSuccess : styles.resultBoxError
                ]}>
                  <Text style={styles.resultTitle}>
                    {ocrResult.success ? '✅ OCR解析完了' : '❌ OCR解析失敗'}
                  </Text>
                  <Text style={styles.resultText}>
                    抽出されたアイテム: {editableItems.length}件
                  </Text>
                  {ocrResult.errors && ocrResult.errors.length > 0 && (
                    <View style={styles.errorList}>
                      <Text style={styles.errorTitle}>エラー:</Text>
                      {ocrResult.errors.map((error, idx) => (
                        <Text key={idx} style={styles.errorText}>• {error}</Text>
                      ))}
                    </View>
                  )}
                </View>

                {/* アイテム一覧（編集可能） */}
                <EditableItemList
                  items={editableItems}
                  onItemEdit={handleItemEdit}
                  selectedItems={selectedItems}
                  onToggleItem={toggleItem}
                  onSelectAll={selectAll}
                  units={UNITS}
                  storageLocations={STORAGE_LOCATIONS}
                />

                {/* 登録ボタン */}
                <View style={styles.section}>
                  <TouchableOpacity
                    onPress={handleRegister}
                    disabled={selectedItems.size === 0 || isRegistering}
                    style={[
                      styles.registerButton,
                      (selectedItems.size === 0 || isRegistering) && styles.registerButtonDisabled
                    ]}
                  >
                    {isRegistering ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text style={styles.registerButtonText}>
                        選択したアイテムを登録 ({selectedItems.size}件)
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
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
    maxWidth: 800,
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
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  imageButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  imageButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  imageButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  fileInfo: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 8,
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  analyzeButton: {
    backgroundColor: '#8b5cf6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  analyzeButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  analyzeButtonText: {
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
  resultBox: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  resultBoxSuccess: {
    backgroundColor: '#d1fae5',
  },
  resultBoxError: {
    backgroundColor: '#fee2e2',
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
  errorList: {
    marginTop: 8,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#dc2626',
    marginBottom: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#dc2626',
    marginBottom: 2,
  },
  registerButton: {
    backgroundColor: '#10b981',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  registerButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  registerButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
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

export default InventoryOCRModal;

