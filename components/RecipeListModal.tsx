/**
 * RecipeListModal - レシピ一覧モーダル
 * Phase 2.3: レシピ一覧表示機能
 */

import React from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
} from 'react-native';
import { RecipeCandidate } from '../types/menu';
import ImageHandler from './ImageHandler';

interface RecipeListModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidates: RecipeCandidate[];
  currentStage?: 'main' | 'sub' | 'soup';
}

const RecipeListModal: React.FC<RecipeListModalProps> = ({
  isOpen,
  onClose,
  candidates,
  currentStage
}) => {
  const stageLabel = currentStage === 'main' ? '主菜' : currentStage === 'sub' ? '副菜' : currentStage === 'soup' ? '汁物' : '';
  
  const getTitle = () => {
    if (stageLabel) {
      return `${stageLabel}の提案（${candidates.length}件）`;
    }
    return `レシピ提案（${candidates.length}件）`;
  };

  if (!isOpen) return null;

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* ヘッダー */}
        <View style={styles.header}>
          <Text style={styles.title}>{getTitle()}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* レシピリスト */}
        <ScrollView style={styles.content}>
          <View style={styles.grid}>
            {candidates.map((candidate, index) => (
              <View key={index} style={styles.recipeCard}>
                {/* 画像表示 */}
                {candidate.urls && candidate.urls.length > 0 && (
                  <View style={styles.imageContainer}>
                    <ImageHandler
                      urls={candidate.urls}
                      title={candidate.title}
                      onUrlClick={(url) => Linking.openURL(url)}
                    />
                  </View>
                )}
                
                {/* レシピタイトル */}
                <Text style={styles.recipeTitle}>
                  {index + 1}. {candidate.title}
                </Text>
                
                {/* 食材情報 */}
                {candidate.ingredients && candidate.ingredients.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionLabel}>📋 使用食材</Text>
                    <Text style={styles.sectionContent}>
                      {candidate.ingredients.join(', ')}
                    </Text>
                  </View>
                )}
                
                {/* 調理時間 */}
                {candidate.cooking_time && (
                  <View style={styles.section}>
                    <Text style={styles.sectionLabel}>⏱️ 調理時間</Text>
                    <Text style={styles.sectionContent}>
                      {candidate.cooking_time}
                    </Text>
                  </View>
                )}
                
                {/* 説明 */}
                {candidate.description && (
                  <Text style={styles.description}>
                    {candidate.description}
                  </Text>
                )}
                
                {/* ソース情報 */}
                {candidate.source && (
                  <View style={styles.sourceContainer}>
                    <Text style={[
                      styles.sourceBadge,
                      candidate.source === 'llm' && styles.sourceBadgeLLM,
                      candidate.source === 'rag' && styles.sourceBadgeRAG,
                      candidate.source === 'web' && styles.sourceBadgeWeb
                    ]}>
                      {candidate.source === 'llm' ? 'LLM提案' : 
                       candidate.source === 'rag' ? 'RAG検索' : 'Web検索'}
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        </ScrollView>

        {/* フッター */}
        <View style={styles.footer}>
          <TouchableOpacity onPress={onClose} style={styles.closeFooterButton}>
            <Text style={styles.closeFooterButtonText}>閉じる</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
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
    fontSize: 20,
    color: '#6B7280',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  grid: {
    padding: 16,
  },
  recipeCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  imageContainer: {
    marginBottom: 12,
  },
  recipeTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  section: {
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  sectionContent: {
    fontSize: 14,
    color: '#374151',
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
    marginBottom: 12,
  },
  sourceContainer: {
    marginTop: 8,
  },
  sourceBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
    alignSelf: 'flex-start',
  },
  sourceBadgeLLM: {
    backgroundColor: '#9333EA',
  },
  sourceBadgeRAG: {
    backgroundColor: '#22C55E',
  },
  sourceBadgeWeb: {
    backgroundColor: '#3B82F6',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  closeFooterButton: {
    backgroundColor: '#9CA3AF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeFooterButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default RecipeListModal;
