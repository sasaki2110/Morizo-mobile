import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface ImageSelectorProps {
  imageUri: string | null;
  onSelect: () => void;
  disabled?: boolean;
}

/**
 * 画像選択UIコンポーネント
 * 
 * 責任: レシート画像の選択UIを提供
 * 
 * @param imageUri - 選択された画像のURI
 * @param onSelect - 画像選択時のコールバック
 * @param disabled - 無効状態
 */
const ImageSelector: React.FC<ImageSelectorProps> = ({
  imageUri,
  onSelect,
  disabled = false,
}) => {
  return (
    <View style={styles.section}>
      <Text style={styles.label}>レシート画像を選択</Text>
      <TouchableOpacity
        onPress={onSelect}
        disabled={disabled}
        style={[styles.imageButton, disabled && styles.imageButtonDisabled]}
      >
        <Text style={styles.imageButtonText}>画像を選択</Text>
      </TouchableOpacity>
      {imageUri && (
        <Text style={styles.fileInfo}>画像が選択されました</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
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
});

export default ImageSelector;

