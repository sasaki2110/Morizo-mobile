/**
 * メニュービューアーコンポーネント
 * React Native環境向けに調整
 */

import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { MenuViewerProps, MenuResponse, RecipeCard } from '../types/menu';
import { parseMenuResponse, isMenuResponse, parseMenuResponseUnified } from '../lib/menu-parser';
import { RecipeCardComponent, RecipeCardSkeleton, RecipeCardError } from './RecipeCard';

/**
 * セクションタイトルコンポーネント
 */
interface SectionTitleProps {
  title: string;
}

function SectionTitle({ title }: SectionTitleProps) {
  return (
    <View style={styles.sectionTitleContainer}>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

/**
 * レシピグリッドコンポーネント（型定義は上に移動）
 */

interface RecipeGridProps {
  recipes: RecipeCard[];
  category: string;
  emoji: string;
  selectedRecipes?: import('../types/menu').SelectedRecipes;
  onRecipeSelect?: (recipe: RecipeCard, category: 'main_dish' | 'side_dish' | 'soup', section: 'innovative' | 'traditional') => void;
  section?: 'innovative' | 'traditional';
}

function RecipeGrid({ recipes, category, emoji, selectedRecipes, onRecipeSelect, section }: RecipeGridProps) {
  if (recipes.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyEmoji}>{emoji}</Text>
        <Text style={styles.emptyText}>このカテゴリにはレシピがありません</Text>
      </View>
    );
  }

  // カテゴリマッピング
  const categoryMap: Record<string, 'main_dish' | 'side_dish' | 'soup'> = {
    main: 'main_dish',
    side: 'side_dish',
    soup: 'soup'
  };

  const mappedCategory = categoryMap[category] || 'main_dish';
  const isSelected = (recipe: RecipeCard) => {
    if (!selectedRecipes) return false;
    const selected = selectedRecipes[mappedCategory];
    return selected?.title === recipe.title;
  };

  return (
    <>
      {recipes.map((recipe, index) => (
        <View key={`${category}-${index}`} style={styles.gridItem}>
          <RecipeCardComponent
            recipe={recipe}
            isSelected={isSelected(recipe)}
            onSelect={onRecipeSelect && section ? (r) => onRecipeSelect(r, mappedCategory, section) : undefined}
          />
        </View>
      ))}
    </>
  );
}

/**
 * セクション情報を取得するヘルパー関数
 */
function getSectionInfo(parseResult: MenuResponse) {
  const innovative = parseResult.innovative.title;
  const traditional = parseResult.traditional.title;
  
  const innovativeRecipes = {
    main: parseResult.innovative.recipes.main,
    side: parseResult.innovative.recipes.side,
    soup: parseResult.innovative.recipes.soup,
  };
  
  const traditionalRecipes = {
    main: parseResult.traditional.recipes.main,
    side: parseResult.traditional.recipes.side,
    soup: parseResult.traditional.recipes.soup,
  };
  
  return {
    innovative,
    traditional,
    innovativeRecipes,
    traditionalRecipes,
  };
}

/**
 * レシピ数を計算するヘルパー関数
 */
function getTotalRecipeCount(recipes: { main: RecipeCard[]; side: RecipeCard[]; soup: RecipeCard[] }) {
  return recipes.main.length + recipes.side.length + recipes.soup.length;
}

/**
 * メニュービューアーのメインコンポーネント
 */
export function MenuViewer({ response, result, style, selectedRecipes, onRecipeSelect }: MenuViewerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [parseError, setParseError] = useState<string | null>(null);

  // レスポンス解析（JSON形式を優先）
  const parseResult = useMemo(() => {
    setIsLoading(true);
    setParseError(null);

    try {
      // JSON形式を優先してレシピデータを解析
      const parseResponse = parseMenuResponseUnified(response, result);
      
      if (!parseResponse.success) {
        console.error('MenuViewer: 解析失敗', parseResponse.error);
        setParseError(parseResponse.error || '解析に失敗しました');
        return null;
      }
      
      return parseResponse.data;
    } catch (error) {
      console.error('MenuViewer: 解析エラー', error);
      setParseError(error instanceof Error ? error.message : 'Unknown error');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [response, result]);

  // エラー状態
  if (parseError || !parseResult) {
    return (
      <View style={[styles.container, style]}>
        <RecipeCardError
          title="メニュー解析エラー"
          error={parseError || 'レスポンスの解析に失敗しました'}
        />
      </View>
    );
  }

  // ローディング状態
  if (isLoading) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.skeletonGrid}>
          {Array.from({ length: 6 }).map((_, index) => (
            <RecipeCardSkeleton key={index} />
          ))}
        </View>
      </View>
    );
  }

  // セクション情報を取得
  const { innovative, traditional, innovativeRecipes, traditionalRecipes } = getSectionInfo(parseResult);

  // レシピ数を計算
  const innovativeCount = getTotalRecipeCount(innovativeRecipes);
  const traditionalCount = getTotalRecipeCount(traditionalRecipes);

  return (
    <ScrollView style={[styles.container, style]} showsVerticalScrollIndicator={true}>
      {/* 斬新な提案セクション */}
      {innovativeCount > 0 && (
        <View style={styles.section}>
          <SectionTitle title={innovative} />
          <View style={styles.grid}>
            <RecipeGrid 
              recipes={innovativeRecipes.main} 
              category="main" 
              emoji="🍖" 
              selectedRecipes={selectedRecipes}
              onRecipeSelect={onRecipeSelect}
              section="innovative"
            />
            <RecipeGrid 
              recipes={innovativeRecipes.side} 
              category="side" 
              emoji="🥗" 
              selectedRecipes={selectedRecipes}
              onRecipeSelect={onRecipeSelect}
              section="innovative"
            />
            <RecipeGrid 
              recipes={innovativeRecipes.soup} 
              category="soup" 
              emoji="🍵" 
              selectedRecipes={selectedRecipes}
              onRecipeSelect={onRecipeSelect}
              section="innovative"
            />
          </View>
        </View>
      )}

      {/* 伝統的な提案セクション */}
      {traditionalCount > 0 && (
        <View style={styles.section}>
          <SectionTitle title={traditional} />
          <View style={styles.grid}>
            <RecipeGrid 
              recipes={traditionalRecipes.main} 
              category="main" 
              emoji="🍖" 
              selectedRecipes={selectedRecipes}
              onRecipeSelect={onRecipeSelect}
              section="traditional"
            />
            <RecipeGrid 
              recipes={traditionalRecipes.side} 
              category="side" 
              emoji="🥗" 
              selectedRecipes={selectedRecipes}
              onRecipeSelect={onRecipeSelect}
              section="traditional"
            />
            <RecipeGrid 
              recipes={traditionalRecipes.soup} 
              category="soup" 
              emoji="🍵" 
              selectedRecipes={selectedRecipes}
              onRecipeSelect={onRecipeSelect}
              section="traditional"
            />
          </View>
        </View>
      )}

      {/* レシピがない場合 */}
      {innovativeCount === 0 && traditionalCount === 0 && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>🍽️</Text>
          <Text style={styles.emptyText}>レシピが見つかりませんでした</Text>
        </View>
      )}
    </ScrollView>
  );
}

/**
 * メニュービューアーのラッパーコンポーネント
 * レスポンスがメニュー提案かどうかを自動判定
 */
interface MenuViewerWrapperProps {
  response: string;
  result?: unknown;
  style?: any;
  fallbackComponent?: React.ReactNode;
}

export function MenuViewerWrapper({ 
  response, 
  result,
  style = {}, 
  fallbackComponent 
}: MenuViewerWrapperProps) {
  // メニュー提案かどうかを判定
  if (!isMenuResponse(response)) {
    return fallbackComponent ? <>{fallbackComponent}</> : null;
  }

  return <MenuViewer response={response} result={result} style={style} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitleContainer: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'center',
  },
  categoryContainer: {
    paddingHorizontal: 16,
  },
  grid: {
    paddingHorizontal: 16,
  },
  gridItem: {
    width: '100%', // 1列表示
    marginBottom: 16,
    zIndex: 1, // 各アイテムの基本zIndex
  },
  recipeGrid: {
    marginBottom: 16,
  },
  skeletonGrid: {
    paddingHorizontal: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
});
