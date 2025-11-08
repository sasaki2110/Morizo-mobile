import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

interface ImagePreviewProps {
  imageUri: string;
}

/**
 * 画像プレビュー表示コンポーネント
 * 
 * 責任: 選択されたレシート画像のプレビューを表示
 * 
 * @param imageUri - プレビュー用の画像URI
 */
const ImagePreview: React.FC<ImagePreviewProps> = ({ imageUri }) => {
  return (
    <View style={styles.section}>
      <Text style={styles.label}>プレビュー:</Text>
      <Image
        source={{ uri: imageUri }}
        style={styles.previewImage}
        resizeMode="contain"
      />
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
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
});

export default ImagePreview;

