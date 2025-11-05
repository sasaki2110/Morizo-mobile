import { useState } from 'react';
import { Alert } from 'react-native';
import { OCRItem, addInventoryItem } from '../api/inventory-api';

/**
 * アイテム登録処理を管理するカスタムフック
 * 
 * @param onUploadComplete 登録成功時のコールバック
 * @returns 登録中状態、登録関数
 */
export function useItemRegistration(onUploadComplete: () => void) {
  const [isRegistering, setIsRegistering] = useState(false);

  /**
   * 選択されたアイテムを登録する
   * @param items 登録するアイテムの配列
   * @param onSuccess 登録成功時に呼び出されるコールバック（オプション）
   */
  const registerItems = async (items: OCRItem[], onSuccess?: () => void) => {
    if (items.length === 0) {
      Alert.alert('エラー', '登録するアイテムを選択してください');
      return;
    }

    setIsRegistering(true);

    try {
      // 個別登録APIを呼び出す
      let successCount = 0;
      const errors: string[] = [];

      for (const item of items) {
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
                onSuccess?.();
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

  return {
    isRegistering,
    registerItems,
  };
}

