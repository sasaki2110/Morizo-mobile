import { useState } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { validateImage } from '../lib/utils/image-validation';

/**
 * 画像選択とバリデーションを管理するカスタムフック
 * 
 * @returns 画像URI、選択関数、クリア関数
 */
export function useImagePicker() {
  const [imageUri, setImageUri] = useState<string | null>(null);

  /**
   * 画像を選択する
   */
  const selectImage = async () => {
    try {
      // 権限をリクエスト
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('エラー', 'フォトライブラリへのアクセス権限が必要です');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedImage = result.assets[0];
        
        // ファイル形式とサイズの検証
        const validation = validateImage(selectedImage.uri, selectedImage.fileSize);
        if (!validation.isValid) {
          Alert.alert('エラー', validation.errors[0]);
          return;
        }

        setImageUri(selectedImage.uri);
      }
    } catch (error) {
      console.error('Image selection failed:', error);
      const errorMessage = error instanceof Error ? error.message : '画像選択に失敗しました';
      Alert.alert('エラー', errorMessage);
    }
  };

  /**
   * 選択した画像をクリアする
   */
  const clearImage = () => {
    setImageUri(null);
  };

  return {
    imageUri,
    selectImage,
    clearImage,
  };
}

