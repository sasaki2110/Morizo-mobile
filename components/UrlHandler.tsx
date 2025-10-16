/**
 * URL選択コンポーネント
 * React Native環境向けに調整
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, Alert, Modal } from 'react-native';
import { RecipeUrl } from '../types/menu';

/**
 * URLアイテムコンポーネント（単一URL表示）
 */
interface UrlItemProps {
  url: RecipeUrl;
  index: number;
  onUrlClick?: (url: string) => void;
}

export function UrlItem({ url, index, onUrlClick }: UrlItemProps) {
  const handleClick = async () => {
    try {
      if (onUrlClick) {
        onUrlClick(url.url);
        return;
      }

      // URLをブラウザ用に正規化
      const normalizedUrl = normalizeUrl(url.url);
      
      console.log('Opening URL:', normalizedUrl);
      
      // URLを開く前にチェック
      const supported = await Linking.canOpenURL(normalizedUrl);
      console.log('Linking.canOpenURL result:', supported);
      
      if (supported) {
        // supportedがtrueの場合は通常通り開く
        await Linking.openURL(normalizedUrl);
        console.log('✅ URL opened successfully (supported=true)');
      } else {
        // supportedがfalseでも試してみる（Expo Goの制限を回避）
        console.warn('⚠️ canOpenURL returned false, but trying to open anyway...');
        try {
          await Linking.openURL(normalizedUrl);
          console.log('✅ URL opened successfully (supported=false, but forced)');
        } catch (openError) {
          // 本当に開けない場合のみエラー表示
          console.error('❌ Failed to open URL:', openError);
          const errorMessage = openError instanceof Error ? openError.message : '不明なエラー';
          Alert.alert(
            'URLを開けませんでした', 
            `このURLを開くことができません。\n\nURL: ${normalizedUrl}\nエラー: ${errorMessage}`,
            [{ text: 'OK' }]
          );
        }
      }
    } catch (error) {
      console.error('❌ URL Open Error (outer catch):', error);
      const errorMessage = error instanceof Error ? error.message : '不明なエラー';
      Alert.alert(
        'エラー',
        `URLを開く際にエラーが発生しました。\n\nURL: ${url.url}\nエラー: ${errorMessage}`,
        [{ text: 'OK' }]
      );
    }
  };

  // URLを正規化する関数
  const normalizeUrl = (url: string): string => {
    // すでにHTTP/HTTPSスキームで始まっている場合はそのまま
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    
    // カスタムスキーム（cookpad://など）をWeb URLに変換
    // 例: cookpad://recipe/123 → https://cookpad.com/recipe/123
    if (url.startsWith('cookpad://')) {
      return url.replace('cookpad://', 'https://cookpad.com/');
    }
    
    // その他のケースはhttpsを追加
    return `https://${url}`;
  };

  return (
    <TouchableOpacity
      style={styles.urlButton}
      onPress={handleClick}
      activeOpacity={0.7}
    >
      <View style={styles.urlContent}>
        <Text style={styles.urlTitle}>{url.title}</Text>
        <Text style={styles.urlDomain}>{url.domain}</Text>
      </View>
    </TouchableOpacity>
  );
}

/**
 * プルダウンメニューコンポーネント（複数URL選択）
 */
interface UrlDropdownProps {
  urls: RecipeUrl[];
  onUrlClick?: (url: string) => void;
  onDropdownOpen?: (isOpen: boolean) => void;
}

export function UrlDropdown({ urls, onUrlClick, onDropdownOpen }: UrlDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectedUrl = urls[selectedIndex];

  const handleUrlClick = async (url: string, index: number) => {
    // 選択状態を更新
    setSelectedIndex(index);
    
    try {
      if (onUrlClick) {
        onUrlClick(url);
        return;
      }

      // URLをブラウザ用に正規化
      const normalizedUrl = normalizeUrl(url);
      
      console.log('Opening URL:', normalizedUrl);
      
      // URLを開く前にチェック
      const supported = await Linking.canOpenURL(normalizedUrl);
      console.log('Linking.canOpenURL result:', supported);
      
      if (supported) {
        // supportedがtrueの場合は通常通り開く
        await Linking.openURL(normalizedUrl);
        console.log('✅ URL opened successfully (supported=true)');
      } else {
        // supportedがfalseでも試してみる（Expo Goの制限を回避）
        console.warn('⚠️ canOpenURL returned false, but trying to open anyway...');
        try {
          await Linking.openURL(normalizedUrl);
          console.log('✅ URL opened successfully (supported=false, but forced)');
        } catch (openError) {
          // 本当に開けない場合のみエラー表示
          console.error('❌ Failed to open URL:', openError);
          const errorMessage = openError instanceof Error ? openError.message : '不明なエラー';
          Alert.alert(
            'URLを開けませんでした', 
            `このURLを開くことができません。\n\nURL: ${normalizedUrl}\nエラー: ${errorMessage}`,
            [{ text: 'OK' }]
          );
        }
      }
    } catch (error) {
      console.error('❌ URL Open Error (outer catch):', error);
      const errorMessage = error instanceof Error ? error.message : '不明なエラー';
      Alert.alert(
        'エラー',
        `URLを開く際にエラーが発生しました。\n\nURL: ${url}\nエラー: ${errorMessage}`,
        [{ text: 'OK' }]
      );
    }
    
    setIsOpen(false);
    if (onDropdownOpen) {
      onDropdownOpen(false);
    }
  };

  const handleDropdownToggle = () => {
    const newState = !isOpen;
    setIsOpen(newState);
    if (onDropdownOpen) {
      onDropdownOpen(newState); // 親に状態を通知
    }
  };

  // URLを正規化する関数
  const normalizeUrl = (url: string): string => {
    // すでにHTTP/HTTPSスキームで始まっている場合はそのまま
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    
    // カスタムスキーム（cookpad://など）をWeb URLに変換
    // 例: cookpad://recipe/123 → https://cookpad.com/recipe/123
    if (url.startsWith('cookpad://')) {
      return url.replace('cookpad://', 'https://cookpad.com/');
    }
    
    // その他のケースはhttpsを追加
    return `https://${url}`;
  };

  return (
    <View style={styles.dropdownContainer}>
      {/* 選択されたURLの表示 */}
      <TouchableOpacity
        style={styles.dropdownButton}
        onPress={handleDropdownToggle}
        activeOpacity={0.7}
      >
        <View style={styles.dropdownContent}>
          <Text style={styles.dropdownTitle}>{selectedUrl.title}</Text>
          <View style={styles.dropdownRight}>
            <Text style={styles.dropdownDomain}>{selectedUrl.domain}</Text>
            <Text style={[styles.dropdownArrow, isOpen && styles.dropdownArrowOpen]}>
              ▼
            </Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Modalでドロップダウンメニュー */}
      <Modal
        visible={isOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setIsOpen(false);
          if (onDropdownOpen) {
            onDropdownOpen(false);
          }
        }}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => {
            setIsOpen(false);
            if (onDropdownOpen) {
              onDropdownOpen(false);
            }
          }}
        >
          <View style={styles.modalContent}>
            {urls.map((url, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dropdownItem,
                  index === selectedIndex && styles.dropdownItemSelected,
                ]}
                onPress={() => handleUrlClick(url.url, index)}
                activeOpacity={0.7}
              >
                <View style={styles.dropdownItemContent}>
                  <Text style={styles.dropdownItemTitle}>{url.title}</Text>
                  <Text style={styles.dropdownItemDomain}>{url.domain}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

/**
 * URLハンドラーコンポーネント（メイン）
 */
interface UrlHandlerProps {
  urls: RecipeUrl[];
  onUrlClick?: (url: string) => void;
  onDropdownOpen?: (isOpen: boolean) => void;
}

export default function UrlHandler({ urls, onUrlClick, onDropdownOpen }: UrlHandlerProps) {
  // 複数URLの場合はプルダウンメニューを表示
  const hasMultipleUrls = urls.length > 1;

  return (
    <View style={styles.container}>
      {hasMultipleUrls ? (
        <UrlDropdown urls={urls} onUrlClick={onUrlClick} onDropdownOpen={onDropdownOpen} />
      ) : (
        <UrlItem url={urls[0]} index={0} onUrlClick={onUrlClick} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  urlButton: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  urlContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  urlTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
    flex: 1,
  },
  urlDomain: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 8,
  },
  dropdownContainer: {
    position: 'relative',
    zIndex: 1000, // 他の要素より前面に表示
  },
  dropdownButton: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dropdownContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
    flex: 1,
  },
  dropdownRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dropdownDomain: {
    fontSize: 12,
    color: '#6B7280',
    marginRight: 8,
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#6B7280',
    transform: [{ rotate: '0deg' }],
  },
  dropdownArrowOpen: {
    transform: [{ rotate: '180deg' }],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  dropdownItem: {
    padding: 12,
  },
  dropdownItemSelected: {
    backgroundColor: '#DBEAFE',
  },
  dropdownItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownItemTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
    flex: 1,
  },
  dropdownItemDomain: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 8,
  },
});
