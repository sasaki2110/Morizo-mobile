import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';

interface OCRAnalysisButtonProps {
  onAnalyze: () => void;
  disabled: boolean;
  isAnalyzing: boolean;
}

/**
 * OCR解析ボタンコンポーネント
 * 
 * 責任: OCR解析の実行ボタンと進捗表示を提供
 * 
 * @param onAnalyze - OCR解析実行時のコールバック
 * @param disabled - ボタンの無効状態
 * @param isAnalyzing - 解析中の状態
 */
const OCRAnalysisButton: React.FC<OCRAnalysisButtonProps> = ({
  onAnalyze,
  disabled,
  isAnalyzing,
}) => {
  return (
    <>
      <View style={styles.section}>
        <TouchableOpacity
          onPress={onAnalyze}
          disabled={disabled}
          style={[styles.analyzeButton, disabled && styles.analyzeButtonDisabled]}
        >
          {isAnalyzing ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.analyzeButtonText}>OCR解析を実行</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* OCR解析進捗表示 */}
      {isAnalyzing && (
        <View style={styles.progressSection}>
          <ActivityIndicator size="large" color="#8b5cf6" />
          <Text style={styles.progressText}>OCR解析中... しばらくお待ちください</Text>
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: 20,
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
});

export default OCRAnalysisButton;

