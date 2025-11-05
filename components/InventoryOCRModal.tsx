import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Alert, ActivityIndicator, ScrollView, FlatList, Image, TextInput, Switch } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { OCRItem, addInventoryItem } from '../api/inventory-api';
import { UNITS, STORAGE_LOCATIONS } from '../lib/utils/ocr-constants';
import { useImagePicker } from '../hooks/useImagePicker';
import { useOCRAnalysis } from '../hooks/useOCRAnalysis';

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
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [isRegistering, setIsRegistering] = useState(false);
  const previousImageUriRef = useRef<string | null>(null);

  const handleImageSelect = async () => {
    await selectImage();
  };

  // 画像選択時に他の状態をリセット（新しい画像が選択されたとき）
  useEffect(() => {
    // 新しい画像が選択された場合（前回がnullで今回がnull以外、または前回がnull以外で今回もnull以外かつ値が変わった場合）
    if (imageUri !== null && (previousImageUriRef.current === null || previousImageUriRef.current !== imageUri)) {
      clearResult();
      setSelectedItems(new Set());
    }
    previousImageUriRef.current = imageUri;
  }, [imageUri, clearResult]);

  // OCR解析が完了してアイテムが抽出されたとき、すべてのアイテムを選択状態にする
  useEffect(() => {
    if (editableItems.length > 0) {
      setSelectedItems(new Set(editableItems.map((_, idx) => idx)));
    }
  }, [editableItems]);

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

  const handleItemToggle = (index: number) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedItems(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(new Set(editableItems.map((_, idx) => idx)));
    } else {
      setSelectedItems(new Set());
    }
  };

  const handleRegister = async () => {
    if (selectedItems.size === 0) {
      Alert.alert('エラー', '登録するアイテムを選択してください');
      return;
    }

    setIsRegistering(true);

    try {
      // 選択されたアイテムのみを登録
      const itemsToRegister = Array.from(selectedItems).map(idx => editableItems[idx]);
      
      // 個別登録APIを呼び出す
      let successCount = 0;
      const errors: string[] = [];

      for (const item of itemsToRegister) {
        try {
          await addInventoryItem(item);
          successCount++;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : '登録失敗';
          errors.push(`${item.item_name}: ${errorMessage}`);
        }
      }

      if (successCount > 0) {
        Alert.alert(
          '成功',
          `${successCount}件のアイテムを登録しました${errors.length > 0 ? `\nエラー: ${errors.length}件` : ''}`,
          [
            {
              text: 'OK',
              onPress: () => {
                onUploadComplete();
                handleClose();
              },
            },
          ]
        );
      } else {
        Alert.alert('エラー', `登録に失敗しました: ${errors.join(', ')}`);
      }
    } catch (error) {
      console.error('Registration failed:', error);
      Alert.alert('エラー', '登録に失敗しました');
    } finally {
      setIsRegistering(false);
    }
  };

  const handleClose = () => {
    clearImage();
    clearResult();
    setSelectedItems(new Set());
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
                <View style={styles.section}>
                  <Text style={styles.label}>抽出されたアイテム（編集・選択可能）</Text>
                  
                  {/* 全選択/全解除 */}
                  <View style={styles.selectAllRow}>
                    <Text style={styles.selectAllLabel}>全選択</Text>
                    <Switch
                      value={selectedItems.size === editableItems.length && editableItems.length > 0}
                      onValueChange={handleSelectAll}
                    />
                  </View>

                  {/* アイテムリスト */}
                  <FlatList
                    data={editableItems}
                    keyExtractor={(_, index) => `item-${index}`}
                    scrollEnabled={false}
                    renderItem={({ item, index }) => (
                      <View style={styles.itemRow}>
                        {/* 選択チェックボックス */}
                        <View style={styles.checkboxCell}>
                          <Switch
                            value={selectedItems.has(index)}
                            onValueChange={() => handleItemToggle(index)}
                          />
                        </View>

                        {/* アイテム名 */}
                        <View style={styles.itemNameCell}>
                          <TextInput
                            style={styles.itemInput}
                            value={item.item_name}
                            onChangeText={(value) => handleItemEdit(index, 'item_name', value)}
                            placeholder="アイテム名"
                            placeholderTextColor="#999"
                          />
                        </View>

                        {/* 数量 */}
                        <View style={styles.quantityCell}>
                          <TextInput
                            style={styles.itemInput}
                            value={item.quantity.toString()}
                            onChangeText={(value) => {
                              const num = parseFloat(value);
                              handleItemEdit(index, 'quantity', isNaN(num) ? 0 : num);
                            }}
                            keyboardType="numeric"
                            placeholder="0"
                            placeholderTextColor="#999"
                          />
                        </View>

                        {/* 単位 */}
                        <View style={styles.unitCell}>
                          <Picker
                            selectedValue={item.unit}
                            onValueChange={(value) => handleItemEdit(index, 'unit', value)}
                            style={styles.itemPicker}
                          >
                            {UNITS.map(u => (
                              <Picker.Item key={u} label={u} value={u} />
                            ))}
                          </Picker>
                        </View>

                        {/* 保管場所 */}
                        <View style={styles.locationCell}>
                          <Picker
                            selectedValue={item.storage_location || '冷蔵庫'}
                            onValueChange={(value) => handleItemEdit(index, 'storage_location', value)}
                            style={styles.itemPicker}
                          >
                            {STORAGE_LOCATIONS.map(loc => (
                              <Picker.Item key={loc} label={loc} value={loc} />
                            ))}
                          </Picker>
                        </View>

                        {/* 消費期限 */}
                        <View style={styles.dateCell}>
                          <TextInput
                            style={styles.itemInput}
                            value={item.expiry_date || ''}
                            onChangeText={(value) => handleItemEdit(index, 'expiry_date', value || null)}
                            placeholder="YYYY-MM-DD"
                            placeholderTextColor="#999"
                          />
                        </View>
                      </View>
                    )}
                    ListHeaderComponent={() => (
                      <View style={styles.tableHeader}>
                        <View style={styles.checkboxCell} />
                        <View style={styles.itemNameCell}><Text style={styles.headerText}>アイテム名</Text></View>
                        <View style={styles.quantityCell}><Text style={styles.headerText}>数量</Text></View>
                        <View style={styles.unitCell}><Text style={styles.headerText}>単位</Text></View>
                        <View style={styles.locationCell}><Text style={styles.headerText}>保管場所</Text></View>
                        <View style={styles.dateCell}><Text style={styles.headerText}>消費期限</Text></View>
                      </View>
                    )}
                  />
                </View>

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
  selectAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  selectAllLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: 2,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  headerText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#4b5563',
  },
  itemRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    alignItems: 'center',
  },
  checkboxCell: {
    width: 50,
    alignItems: 'center',
  },
  itemNameCell: {
    flex: 2,
    marginRight: 4,
  },
  quantityCell: {
    flex: 1,
    marginRight: 4,
  },
  unitCell: {
    flex: 1,
    marginRight: 4,
  },
  locationCell: {
    flex: 1.5,
    marginRight: 4,
  },
  dateCell: {
    flex: 1.5,
  },
  itemInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: '#ffffff',
    fontSize: 12,
    color: '#1f2937',
  },
  itemPicker: {
    height: 40,
    backgroundColor: '#ffffff',
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

