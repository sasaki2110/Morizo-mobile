import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Modal, Alert, ScrollView } from 'react-native';
import { OCRItem } from '../api/inventory-api';
import { UNITS, STORAGE_LOCATIONS } from '../lib/utils/ocr-constants';
import { useImagePicker } from '../hooks/useImagePicker';
import { useOCRAnalysis } from '../hooks/useOCRAnalysis';
import { useItemSelection } from '../hooks/useItemSelection';
import { useItemRegistration } from '../hooks/useItemRegistration';
import ImageSelector from './ocr/ImageSelector';
import ImagePreview from './ocr/ImagePreview';
import OCRAnalysisButton from './ocr/OCRAnalysisButton';
import OCRResultSummary from './ocr/OCRResultSummary';
import EditableItemList from './ocr/EditableItemList';
import RegistrationButton from './ocr/RegistrationButton';
import { styles } from './ocr/styles';

interface InventoryOCRModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete: () => void;
}

/**
 * レシートOCRモーダルコンポーネント
 * 
 * 責任: レシート画像のOCR解析と在庫アイテムの登録を統合的に管理
 * 
 * このコンポーネントは以下のフックとコンポーネントを使用して実装されています：
 * - useImagePicker: 画像選択とバリデーション
 * - useOCRAnalysis: OCR解析処理
 * - useItemSelection: アイテム選択管理
 * - useItemRegistration: アイテム登録処理
 * - EditableItemList: 編集可能なアイテムリスト
 */
const InventoryOCRModal: React.FC<InventoryOCRModalProps> = ({
  isOpen,
  onClose,
  onUploadComplete,
}) => {
  // カスタムフックの使用
  const { imageUri, selectImage, clearImage } = useImagePicker();
  const { ocrResult, isAnalyzing, analyzeImage, editableItems, setEditableItems, clearResult } = useOCRAnalysis();
  const { selectedItems, toggleItem, selectAll, clearSelection } = useItemSelection(editableItems);
  const { isRegistering, registerItems } = useItemRegistration(onUploadComplete);

  // 前回の状態を追跡するためのref
  const previousImageUriRef = useRef<string | null>(null);
  const previousItemsLengthRef = useRef<number>(0);

  // 画像選択時にOCR結果と選択状態をリセット
  useEffect(() => {
    if (imageUri !== null && (previousImageUriRef.current === null || previousImageUriRef.current !== imageUri)) {
      clearResult();
      clearSelection();
      previousItemsLengthRef.current = 0;
    }
    previousImageUriRef.current = imageUri;
  }, [imageUri, clearResult, clearSelection]);

  // OCR解析完了時にすべてのアイテムを自動選択
  useEffect(() => {
    const previousLength = previousItemsLengthRef.current;
    const currentLength = editableItems.length;
    
    if (previousLength === 0 && currentLength > 0) {
      selectAll(true);
    }
    
    previousItemsLengthRef.current = currentLength;
  }, [editableItems.length, selectAll]);

  // イベントハンドラー
  const handleImageSelect = async () => {
    await selectImage();
  };

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
            {/* ステップ1: 画像選択とOCR解析 */}
            {!ocrResult && (
              <>
                <ImageSelector
                  imageUri={imageUri}
                  onSelect={handleImageSelect}
                  disabled={isAnalyzing}
                />

                {imageUri && <ImagePreview imageUri={imageUri} />}

                <OCRAnalysisButton
                  onAnalyze={handleAnalyze}
                  disabled={!imageUri || isAnalyzing}
                  isAnalyzing={isAnalyzing}
                />
              </>
            )}

            {/* ステップ2: OCR解析結果の確認・編集・登録 */}
            {ocrResult && editableItems.length > 0 && (
              <>
                <OCRResultSummary
                  ocrResult={ocrResult}
                  itemCount={editableItems.length}
                />

                <EditableItemList
                  items={editableItems}
                  onItemEdit={handleItemEdit}
                  selectedItems={selectedItems}
                  onToggleItem={toggleItem}
                  onSelectAll={selectAll}
                  units={UNITS}
                  storageLocations={STORAGE_LOCATIONS}
                />

                <RegistrationButton
                  selectedCount={selectedItems.size}
                  onRegister={handleRegister}
                  disabled={selectedItems.size === 0 || isRegistering}
                  isRegistering={isRegistering}
                />
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

export default InventoryOCRModal;

