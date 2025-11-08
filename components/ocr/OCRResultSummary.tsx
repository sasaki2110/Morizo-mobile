import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { OCRResult } from '../../api/inventory-api';

interface OCRResultSummaryProps {
  ocrResult: OCRResult;
  itemCount: number;
}

/**
 * OCR解析結果サマリー表示コンポーネント
 * 
 * 責任: OCR解析結果の成功/失敗状態とサマリー情報を表示
 * 
 * @param ocrResult - OCR解析結果
 * @param itemCount - 抽出されたアイテム数
 */
const OCRResultSummary: React.FC<OCRResultSummaryProps> = ({
  ocrResult,
  itemCount,
}) => {
  return (
    <View style={[
      styles.resultBox,
      ocrResult.success ? styles.resultBoxSuccess : styles.resultBoxError
    ]}>
      <Text style={styles.resultTitle}>
        {ocrResult.success ? '✅ OCR解析完了' : '❌ OCR解析失敗'}
      </Text>
      <Text style={styles.resultText}>
        抽出されたアイテム: {itemCount}件
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
  );
};

const styles = StyleSheet.create({
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
});

export default OCRResultSummary;

