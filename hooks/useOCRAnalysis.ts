import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { analyzeReceiptOCR, OCRItem, OCRResult, registerOCRMapping } from '../api/inventory-api';

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
        // 各アイテムにoriginal_nameを設定（OCRで読み取られた元の名前を保持）
        const itemsWithOriginalName = result.items.map(item => ({
          ...item,
          original_name: item.item_name, // 初期値をoriginal_nameとして保持
        }));
        setEditableItems(itemsWithOriginalName);
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

  /**
   * 変換テーブル登録
   * エラーが発生しても既存機能に影響しないため、警告ログのみ
   */
  const registerMapping = useCallback(async (originalName: string, normalizedName: string) => {
    try {
      await registerOCRMapping(originalName, normalizedName);
      console.log(`OCR変換テーブルに登録しました: '${originalName}' -> '${normalizedName}'`);
    } catch (error) {
      // エラーが発生しても既存機能に影響しないため、警告ログのみ
      console.warn('OCR変換テーブル登録中にエラーが発生しました:', error);
    }
  }, []);

  return {
    ocrResult,
    isAnalyzing,
    analyzeImage,
    editableItems,
    setEditableItems,
    clearResult,
    registerMapping,
  };
}

