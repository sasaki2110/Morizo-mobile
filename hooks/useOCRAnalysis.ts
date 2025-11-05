import { useState } from 'react';
import { Alert } from 'react-native';
import { analyzeReceiptOCR, OCRItem, OCRResult } from '../api/inventory-api';

/**
 * OCR解析処理を管理するカスタムフック
 * 
 * @returns OCR解析結果、解析中状態、解析関数、編集可能なアイテムリスト
 */
export function useOCRAnalysis() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [editableItems, setEditableItems] = useState<OCRItem[]>([]);

  /**
   * 画像をOCR解析する
   * @param imageUri 画像のURI
   */
  const analyzeImage = async (imageUri: string) => {
    if (!imageUri) {
      Alert.alert('エラー', '画像ファイルを選択してください');
      return;
    }

    setIsAnalyzing(true);
    setOcrResult(null);

    try {
      const result = await analyzeReceiptOCR(imageUri);
      setOcrResult(result);
      
      // 編集可能なアイテムリストを作成
      if (result.items && result.items.length > 0) {
        setEditableItems([...result.items]);
      } else {
        Alert.alert('情報', 'OCR解析でアイテムが抽出されませんでした');
        setEditableItems([]);
      }
    } catch (error) {
      console.error('OCR analysis failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'OCR解析に失敗しました';
      Alert.alert('エラー', errorMessage);
      setOcrResult(null);
      setEditableItems([]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  /**
   * OCR解析結果とアイテムリストをリセットする
   */
  const clearResult = () => {
    setOcrResult(null);
    setEditableItems([]);
  };

  return {
    ocrResult,
    isAnalyzing,
    analyzeImage,
    editableItems,
    setEditableItems,
    clearResult,
  };
}

