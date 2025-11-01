import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { RecipeCandidate } from '../types/menu';
import { sendSelection } from '../api/recipe-api';

interface SelectionOptionsProps {
  candidates: RecipeCandidate[];
  onSelect: (selection: number, selectionResult?: any) => void;
  taskId: string;
  sseSessionId: string;
  isLoading?: boolean;
}

const SelectionOptions: React.FC<SelectionOptionsProps> = ({
  candidates,
  onSelect,
  taskId,
  sseSessionId,
  isLoading = false
}) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  const handleConfirm = async () => {
    if (isLoading || selectedIndex === null) return;
    
    if (!sseSessionId || sseSessionId === 'unknown') {
      Alert.alert('エラー', 'セッション情報が無効です。');
      return;
    }
    
    setIsConfirming(true);
    
    try {
      const result = await sendSelection(taskId, selectedIndex + 1, sseSessionId);
      
      if (result.success) {
        onSelect(selectedIndex + 1, result);
      } else {
        throw new Error(result.error || 'Selection failed');
      }
    } catch (error) {
      console.error('Selection failed:', error);
      Alert.alert('エラー', '選択に失敗しました。もう一度お試しください。');
      setSelectedIndex(null);
    } finally {
      setIsConfirming(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>選択を処理中...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        採用したいレシピを選んでください
      </Text>
      
      {candidates.map((candidate, index) => (
        <TouchableOpacity
          key={index}
          onPress={() => setSelectedIndex(index)}
          style={[
            styles.recipeItem,
            selectedIndex === index && styles.recipeItemSelected
          ]}
        >
          <View style={styles.radioContainer}>
            <View style={[
              styles.radio,
              selectedIndex === index && styles.radioSelected
            ]}>
              {selectedIndex === index && <View style={styles.radioInner} />}
            </View>
            <Text style={styles.recipeTitle}>
              {index + 1}. {candidate.title}
            </Text>
          </View>
        </TouchableOpacity>
      ))}
      
      <TouchableOpacity
        onPress={handleConfirm}
        disabled={selectedIndex === null || isLoading || isConfirming}
        style={[
          styles.confirmButton,
          (selectedIndex === null || isLoading || isConfirming) && styles.confirmButtonDisabled
        ]}
      >
        <Text style={styles.confirmButtonText}>
          {isConfirming ? '確定中...' : '確定'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
    marginBottom: 16,
  },
  recipeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  recipeItemSelected: {
    backgroundColor: '#dbeafe',
    borderColor: '#3b82f6',
    borderWidth: 2,
  },
  radioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#9ca3af',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: {
    borderColor: '#2563eb',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2563eb',
  },
  recipeTitle: {
    fontSize: 16,
    color: '#374151',
    flex: 1,
  },
  confirmButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  confirmButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  confirmButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
});

export default SelectionOptions;

