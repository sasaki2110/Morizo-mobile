/**
 * メニューパーサーのバリデーション関数
 * React Native環境向けに調整
 */

import { MenuSection, RecipeCard, RecipeUrl } from '../../types/menu';

/**
 * メニューセクションをバリデーションする
 * @param section - バリデーション対象のセクション
 * @returns バリデーション結果
 */
export function validateMenuSection(section: unknown): { success: boolean; data?: MenuSection; error?: string } {
  if (!section || typeof section !== 'object') {
    return {
      success: false,
      error: 'セクションがオブジェクトではありません'
    };
  }

  const sectionObj = section as Record<string, unknown>;

  // titleフィールドのチェック
  if (!sectionObj.title || typeof sectionObj.title !== 'string') {
    return {
      success: false,
      error: 'titleフィールドが存在しないか、文字列ではありません'
    };
  }

  // recipesフィールドのチェック
  if (!sectionObj.recipes || typeof sectionObj.recipes !== 'object') {
    return {
      success: false,
      error: 'recipesフィールドが存在しないか、オブジェクトではありません'
    };
  }

  const recipesObj = sectionObj.recipes as Record<string, unknown>;

  // 各カテゴリのバリデーション
  const categories = ['main', 'side', 'soup'] as const;
  const validatedRecipes: MenuSection['recipes'] = {
    main: [],
    side: [],
    soup: []
  };

  for (const category of categories) {
    if (!recipesObj[category] || !Array.isArray(recipesObj[category])) {
      return {
        success: false,
        error: `${category}フィールドが存在しないか、配列ではありません`
      };
    }

    const categoryRecipes = recipesObj[category] as unknown[];
    for (const recipe of categoryRecipes) {
      const recipeValidation = validateRecipeCard(recipe);
      if (!recipeValidation.success) {
        return {
          success: false,
          error: `${category}カテゴリのレシピバリデーションエラー: ${recipeValidation.error}`
        };
      }
      validatedRecipes[category].push(recipeValidation.data!);
    }
  }

  return {
    success: true,
    data: {
      title: sectionObj.title,
      recipes: validatedRecipes
    }
  };
}

/**
 * レシピカードをバリデーションする
 * @param recipe - バリデーション対象のレシピ
 * @returns バリデーション結果
 */
export function validateRecipeCard(recipe: unknown): { success: boolean; data?: RecipeCard; error?: string } {
  if (!recipe || typeof recipe !== 'object') {
    return {
      success: false,
      error: 'レシピがオブジェクトではありません'
    };
  }

  const recipeObj = recipe as Record<string, unknown>;

  // titleフィールドのチェック
  if (!recipeObj.title || typeof recipeObj.title !== 'string') {
    return {
      success: false,
      error: 'titleフィールドが存在しないか、文字列ではありません'
    };
  }

  // urlsフィールドのチェック
  if (!recipeObj.urls || !Array.isArray(recipeObj.urls)) {
    return {
      success: false,
      error: 'urlsフィールドが存在しないか、配列ではありません'
    };
  }

  // categoryフィールドのチェック
  if (!recipeObj.category || typeof recipeObj.category !== 'string') {
    return {
      success: false,
      error: 'categoryフィールドが存在しないか、文字列ではありません'
    };
  }

  const validCategories = ['main', 'side', 'soup'];
  if (!validCategories.includes(recipeObj.category)) {
    return {
      success: false,
      error: `categoryフィールドが無効です: ${recipeObj.category}`
    };
  }

  // emojiフィールドのチェック
  if (!recipeObj.emoji || typeof recipeObj.emoji !== 'string') {
    return {
      success: false,
      error: 'emojiフィールドが存在しないか、文字列ではありません'
    };
  }

  // URLsのバリデーション
  const validatedUrls: RecipeUrl[] = [];
  const urlsArray = recipeObj.urls as unknown[];
  
  for (const url of urlsArray) {
    const urlValidation = validateRecipeUrl(url);
    if (!urlValidation.success) {
      return {
        success: false,
        error: `URLバリデーションエラー: ${urlValidation.error}`
      };
    }
    validatedUrls.push(urlValidation.data!);
  }

  return {
    success: true,
    data: {
      title: recipeObj.title,
      urls: validatedUrls,
      category: recipeObj.category as 'main' | 'side' | 'soup',
      emoji: recipeObj.emoji
    }
  };
}

/**
 * レシピURLをバリデーションする
 * @param url - バリデーション対象のURL
 * @returns バリデーション結果
 */
export function validateRecipeUrl(url: unknown): { success: boolean; data?: RecipeUrl; error?: string } {
  if (!url || typeof url !== 'object') {
    return {
      success: false,
      error: 'URLがオブジェクトではありません'
    };
  }

  const urlObj = url as Record<string, unknown>;

  // titleフィールドのチェック
  if (!urlObj.title || typeof urlObj.title !== 'string') {
    return {
      success: false,
      error: 'titleフィールドが存在しないか、文字列ではありません'
    };
  }

  // urlフィールドのチェック
  if (!urlObj.url || typeof urlObj.url !== 'string') {
    return {
      success: false,
      error: 'urlフィールドが存在しないか、文字列ではありません'
    };
  }

  // domainフィールドのチェック
  if (!urlObj.domain || typeof urlObj.domain !== 'string') {
    return {
      success: false,
      error: 'domainフィールドが存在しないか、文字列ではありません'
    };
  }

  // URLの形式チェック
  try {
    new URL(urlObj.url);
  } catch {
    return {
      success: false,
      error: 'URLの形式が無効です'
    };
  }

  return {
    success: true,
    data: {
      title: urlObj.title,
      url: urlObj.url,
      domain: urlObj.domain
    }
  };
}
