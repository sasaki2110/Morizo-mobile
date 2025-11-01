/**
 * レシピカードコンポーネント
 * React Native環境向けに調整（画像表示機能付き）
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { RecipeCardProps, RecipeCard } from '../../types/menu';
import ImageHandler from './ImageHandler';
import UrlHandler from './UrlHandler';

/**
 * レシピカードコンポーネント
 */
export function RecipeCardComponent({ 
  recipe, 
  onUrlClick, 
  isSelected = false, 
  onSelect, 
  isAdopted = false 
}: RecipeCardProps) {
  const { title, urls, emoji } = recipe;
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // 複数URLの場合はプルダウンメニューを表示
  const hasMultipleUrls = urls.length > 1;

  // チェックボックスの変更ハンドラー
  const handleCheckboxPress = () => {
    if (onSelect) {
      onSelect(recipe);
    }
  };

  return (
    <View style={[
      styles.container, 
      isDropdownOpen && { zIndex: 1000 },
      isSelected && styles.containerSelected
    ]}>
      {/* チェックボックス（左上） */}
      {onSelect && (
        <TouchableOpacity
          style={[
            styles.checkbox,
            isSelected && styles.checkboxSelected
          ]}
          onPress={handleCheckboxPress}
        >
          {isSelected && <Text style={styles.checkmark}>✓</Text>}
        </TouchableOpacity>
      )}

      {/* 採用済みバッジ（右上） */}
      {isAdopted && (
        <View style={styles.adoptedBadge}>
          <Text style={styles.adoptedBadgeText}>✓ 採用済み</Text>
        </View>
      )}

      {/* 画像表示（クリック可能） */}
      <ImageHandler
        urls={urls}
        title={title}
        onUrlClick={onUrlClick}
      />

      {/* カードヘッダー */}
      <View style={styles.header}>
        <Text style={styles.emoji}>{emoji}</Text>
        <Text style={styles.title}>{title}</Text>
        {hasMultipleUrls && (
          <View style={styles.urlCountBadge}>
            <Text style={styles.urlCountText}>{urls.length}件</Text>
          </View>
        )}
      </View>

      {/* URL一覧 */}
      <UrlHandler
        urls={urls}
        onUrlClick={onUrlClick}
        onDropdownOpen={setIsDropdownOpen}
      />

      {/* フッター情報 */}
      <View style={styles.footer}>
        <Text style={styles.categoryText}>レシピカテゴリ: {recipe.category}</Text>
        <Text style={styles.urlCountText}>{urls.length}個のレシピ</Text>
      </View>
    </View>
  );
}

/**
 * レシピカードのスケルトンローダー
 */
export function RecipeCardSkeleton() {
  return (
    <View style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <View style={styles.skeletonEmoji} />
        <View style={styles.skeletonTitle} />
      </View>

      {/* URL部分 */}
      <View style={styles.urlContainer}>
        <View style={styles.skeletonUrl} />
      </View>

      {/* フッター */}
      <View style={styles.footer}>
        <View style={styles.skeletonFooter} />
      </View>
    </View>
  );
}

/**
 * エラー状態のレシピカード
 */
interface RecipeCardErrorProps {
  title: string;
  error: string;
}

export function RecipeCardError({ title, error }: RecipeCardErrorProps) {
  return (
    <View style={styles.errorContainer}>
      <View style={styles.errorHeader}>
        <Text style={styles.errorEmoji}>❌</Text>
        <Text style={styles.errorTitle}>{title}</Text>
      </View>
      <Text style={styles.errorMessage}>{error}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    zIndex: 1, // 基本的なzIndex
  },
  containerSelected: {
    borderColor: '#3b82f6',
    borderWidth: 2,
    backgroundColor: '#dbeafe',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  emoji: {
    fontSize: 24,
    marginRight: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    flex: 1,
  },
  urlCountBadge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  urlCountText: {
    fontSize: 12,
    color: '#1E40AF',
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  categoryText: {
    fontSize: 12,
    color: '#6B7280',
  },
  // スケルトンローダーのスタイル
  skeletonEmoji: {
    width: 24,
    height: 24,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    marginRight: 12,
  },
  skeletonTitle: {
    height: 20,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    flex: 1,
  },
  skeletonUrl: {
    height: 48,
    backgroundColor: '#E5E7EB',
    borderRadius: 8,
  },
  skeletonFooter: {
    height: 12,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    flex: 1,
  },
  // エラー状態のスタイル
  errorContainer: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    marginVertical: 8,
  },
  errorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  errorEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#991B1B',
  },
  errorMessage: {
    fontSize: 14,
    color: '#B91C1C',
  },
  // Phase 2.2: チェックボックスと採用済みバッジのスタイル
  checkbox: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#9ca3af',
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  checkboxSelected: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  adoptedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#10b981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 10,
  },
  adoptedBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
});
