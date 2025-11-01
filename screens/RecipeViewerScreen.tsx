/**
 * レシピビューアー画面
 * React Native環境向けに調整（Modal化）
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Modal,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MenuViewer } from '../components/MenuViewer';
import { MenuViewerProps, SelectedRecipes, RecipeCard, RecipeSelection, RecipeAdoptionItem } from '../types/menu';
import { adoptRecipes } from '../api/recipe-api';

interface RecipeViewerScreenProps extends MenuViewerProps {
  visible: boolean;
  onClose: () => void;
}

export default function RecipeViewerScreen({ 
  visible,
  response, 
  result, 
  onClose 
}: RecipeViewerScreenProps) {
  // Phase 2.2: 選択状態の管理
  const [selectedRecipes, setSelectedRecipes] = useState<SelectedRecipes>({
    main_dish: null,
    side_dish: null,
    soup: null
  });

  // 選択されたレシピのセクション情報を管理
  const [recipeSelections, setRecipeSelections] = useState<RecipeSelection[]>([]);

  // ローディング状態
  const [isAdopting, setIsAdopting] = useState(false);

  // Phase 2.2: レシピ選択ハンドラー（相互排他）
  const handleRecipeSelect = (recipe: RecipeCard, category: 'main_dish' | 'side_dish' | 'soup', section: 'innovative' | 'traditional') => {
    setSelectedRecipes(prev => ({
      ...prev,
      [category]: prev[category]?.title === recipe.title ? null : recipe
    }));

    // セクション情報も更新
    setRecipeSelections(prev => {
      const filtered = prev.filter(sel => sel.category !== category);
      if (prev.find(sel => sel.category === category && sel.recipe.title === recipe.title)) {
        // 同じレシピをクリックした場合は選択解除
        return filtered;
      } else {
        // 新しいレシピを選択
        return [...filtered, { recipe, category, section }];
      }
    });
  };

  // Phase 2.2: 採用ボタンのクリックハンドラー
  const handleAdoptRecipes = async () => {
    const recipesToAdopt: RecipeAdoptionItem[] = [];
    
    // 選択されたレシピを配列に変換
    recipeSelections.forEach(selection => {
      const { recipe, category, section } = selection;
      recipesToAdopt.push({
        title: recipe.title,
        category: category,
        menu_source: section === 'innovative' ? 'llm_menu' : 'rag_menu',
        url: recipe.urls[0]?.url // 最初のURLを使用
      });
    });

    if (recipesToAdopt.length === 0) {
      Alert.alert('エラー', '採用するレシピを選択してください');
      return;
    }

    setIsAdopting(true);
    
    try {
      const result = await adoptRecipes(recipesToAdopt);
      
      if (result.success) {
        Alert.alert('成功', result.message);
        // 成功時は選択状態をリセット
        setSelectedRecipes({
          main_dish: null,
          side_dish: null,
          soup: null
        });
        setRecipeSelections([]);
      } else {
        Alert.alert('エラー', result.message || 'レシピの採用に失敗しました');
      }
    } catch (error) {
      console.error('レシピ採用エラー:', error);
      Alert.alert('エラー', 'レシピの採用に失敗しました');
    } finally {
      setIsAdopting(false);
    }
  };

  // 選択されたレシピ数を計算
  const selectedCount = Object.values(selectedRecipes).filter(Boolean).length;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        
        {/* ヘッダー */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>レシピビューアー</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* スクロール可能なコンテンツ */}
        <ScrollView 
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={true}
        >
          <MenuViewer 
            response={response} 
            result={result}
            selectedRecipes={selectedRecipes}
            onRecipeSelect={handleRecipeSelect}
          />
        </ScrollView>

        {/* Phase 2.2: フッター（選択状態と採用ボタン） */}
        <View style={styles.footer}>
          <View style={styles.footerInfo}>
            <Text style={styles.footerText}>MorizoAI レシピ専用ビューアー</Text>
            {selectedCount > 0 && (
              <Text style={styles.selectedCountText}>
                {selectedCount}件選択中
              </Text>
            )}
          </View>
          <View style={styles.footerButtons}>
            <TouchableOpacity
              onPress={handleAdoptRecipes}
              disabled={selectedCount === 0 || isAdopting}
              style={[
                styles.adoptButton,
                (selectedCount === 0 || isAdopting) && styles.adoptButtonDisabled
              ]}
            >
              {isAdopting ? (
                <View style={styles.adoptButtonContent}>
                  <ActivityIndicator size="small" color="#ffffff" />
                  <Text style={[styles.adoptButtonText, { marginLeft: 8 }]}>採用中...</Text>
                </View>
              ) : (
                <Text style={styles.adoptButtonText}>この献立を採用</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeFooterButton}
            >
              <Text style={styles.closeFooterButtonText}>閉じる</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 20,
  },
  // Phase 2.2: フッターのスタイル
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  footerInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  footerText: {
    fontSize: 12,
    color: '#6B7280',
  },
  selectedCountText: {
    fontSize: 12,
    color: '#2563eb',
    fontWeight: '600',
  },
  footerButtons: {
    flexDirection: 'row',
  },
  adoptButton: {
    flex: 1,
    backgroundColor: '#10b981',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adoptButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  adoptButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  adoptButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  closeFooterButton: {
    flex: 1,
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  closeFooterButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});
