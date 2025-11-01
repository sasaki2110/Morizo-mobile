import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Platform } from 'react-native';
import { RecipeCandidate } from '../types/menu';
import { sendSelection, authenticatedFetch } from '../api/recipe-api';

interface SelectionOptionsProps {
  candidates: RecipeCandidate[];
  onSelect: (selection: number, selectionResult?: any) => void;
  taskId: string;
  sseSessionId: string;
  isLoading?: boolean;
  // Phase 2.1: 段階情報
  currentStage?: 'main' | 'sub' | 'soup';
  usedIngredients?: string[];
  menuCategory?: 'japanese' | 'western' | 'chinese';
  // Phase 2.1修正: 次の段階リクエスト用のコールバック
  onNextStageRequested?: () => void;
  // Phase 2.3: レシピ一覧表示用のコールバック
  onViewList?: (candidates: RecipeCandidate[]) => void;
  // Phase 2.4: 他の提案を見る機能
  onRequestMore?: (sseSessionId: string) => void;
  isLatestSelection?: boolean;
  proposalRound?: number;
}

const SelectionOptions: React.FC<SelectionOptionsProps> = ({
  candidates,
  onSelect,
  taskId,
  sseSessionId,
  isLoading = false,
  currentStage,
  usedIngredients,
  menuCategory,
  onNextStageRequested,
  onViewList,
  onRequestMore,
  isLatestSelection,
  proposalRound
}) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isRequestingMore, setIsRequestingMore] = useState(false);

  // Phase 2.3: レシピ一覧を見るハンドラー
  const handleViewList = () => {
    if (onViewList) {
      onViewList(candidates);
    }
  };

  // Phase 2.4: 他の提案を見るハンドラー
  const handleRequestMore = async () => {
    if (isLoading || isConfirming || isRequestingMore) return;
    
    // 新しいSSEセッションIDを生成（既存のSSEセッションは切断済みのため）
    const newSseSessionId = `additional-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    console.log('[DEBUG] Generated new SSE session for additional proposal:', newSseSessionId);
    console.log('[DEBUG] Old SSE session ID:', sseSessionId);
    
    setIsRequestingMore(true);
    
    // 先にコールバックを呼び出してChatScreenにstreamingメッセージを追加してもらう
    if (onRequestMore) {
      onRequestMore(newSseSessionId);
    }
    
    try {
      // API URLを取得
      const getApiUrl = () => {
        if (Platform.OS === 'web') {
          return 'http://localhost:3000/api';
        } else {
          return 'http://192.168.1.12:3000/api';
        }
      };
      
      const apiUrl = `${getApiUrl()}/chat/selection`;
      
      // バックエンドに追加提案を要求（新しいSSEセッションID + 旧セッションIDを送信）
      const response = await authenticatedFetch(apiUrl, {
        method: 'POST',
        body: JSON.stringify({
          task_id: taskId,
          selection: 0, // 0 = 追加提案要求
          sse_session_id: newSseSessionId,  // 新しいSSEセッションID
          old_sse_session_id: sseSessionId  // 旧セッションID（コンテキスト復元用）
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('[DEBUG] Request more response:', result);
      
      if (result.success) {
        setSelectedIndex(null); // 選択状態をリセット
      } else {
        throw new Error(result.error || 'Request failed');
      }
    } catch (error) {
      console.error('Request more failed:', error);
      Alert.alert('エラー', '追加提案の要求に失敗しました。');
    } finally {
      setIsRequestingMore(false);
    }
  };

  const handleConfirm = async () => {
    if (isLoading || selectedIndex === null) return;
    
    if (!sseSessionId || sseSessionId === 'unknown') {
      Alert.alert('エラー', 'セッション情報が無効です。');
      return;
    }
    
    setIsConfirming(true);
    
    try {
      const result = await sendSelection(taskId, selectedIndex + 1, sseSessionId);
      
      if (result.success) {
        onSelect(selectedIndex + 1, result);
        
        // Phase 2.1修正: 次の段階の提案が要求されている場合はフラグをチェック
        if (result.requires_next_stage && onNextStageRequested) {
          console.log('[DEBUG] requires_next_stage flag detected, calling onNextStageRequested');
          onNextStageRequested();
        }
      } else {
        throw new Error(result.error || 'Selection failed');
      }
    } catch (error) {
      console.error('Selection failed:', error);
      Alert.alert('エラー', '選択に失敗しました。もう一度お試しください。');
      setSelectedIndex(null);
    } finally {
      setIsConfirming(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>選択を処理中...</Text>
      </View>
    );
  }

  // Phase 2.1: 段階名の表示テキスト
  const stageLabel = currentStage === 'main' ? '主菜' : currentStage === 'sub' ? '副菜' : currentStage === 'soup' ? '汁物' : '';
  const menuCategoryLabel = menuCategory === 'japanese' ? '和食' : menuCategory === 'western' ? '洋食' : menuCategory === 'chinese' ? '中華' : '';

  return (
    <View style={styles.container}>
      {/* Phase 2.1: 段階情報の表示 */}
      {(currentStage || menuCategory) && (
        <View style={styles.stageContainer}>
          <View style={styles.badgeContainer}>
            {currentStage && (
              <View style={[styles.badge, styles.mainBadge, { marginRight: 8 }]}>
                <Text style={styles.badgeText}>
                  {stageLabel}を選んでください
                </Text>
              </View>
            )}
            {menuCategory && (
              <View style={[styles.badge, styles.categoryBadge, { marginRight: 8 }]}>
                <Text style={styles.badgeText}>
                  {menuCategoryLabel}
                </Text>
              </View>
            )}
          </View>
        </View>
      )}
      
      {/* Phase 2.1: 使い残し食材の表示 */}
      {usedIngredients && usedIngredients.length > 0 && (
        <View style={styles.ingredientsContainer}>
          <Text style={styles.ingredientsTitle}>
            📦 使える食材:
          </Text>
          <Text style={styles.ingredientsList}>
            {usedIngredients.join(', ')}
          </Text>
        </View>
      )}
      
      <Text style={styles.title}>
        採用したいレシピを選んでください
      </Text>
      
      {candidates.map((candidate, index) => (
        <TouchableOpacity
          key={index}
          onPress={() => setSelectedIndex(index)}
          style={[
            styles.recipeItem,
            selectedIndex === index && styles.recipeItemSelected
          ]}
        >
          <View style={styles.radioContainer}>
            <View style={[
              styles.radio,
              selectedIndex === index && styles.radioSelected
            ]}>
              {selectedIndex === index && <View style={styles.radioInner} />}
            </View>
            <Text style={styles.recipeTitle}>
              {index + 1}. {candidate.title}
            </Text>
          </View>
        </TouchableOpacity>
      ))}
      
      {/* Phase 2.3: レシピ一覧を見るボタン */}
      {onViewList && candidates.length > 0 && (
        <TouchableOpacity
          onPress={handleViewList}
          style={styles.viewListButton}
        >
          <Text style={styles.viewListButtonText}>
            📋 レシピ一覧を見る
          </Text>
        </TouchableOpacity>
      )}

      {/* Phase 2.4: 他の提案を見るボタン - 最新の選択候補のみ表示 */}
      {isLatestSelection !== false && onRequestMore && (
        <TouchableOpacity
          onPress={handleRequestMore}
          disabled={isLoading || isConfirming || isRequestingMore}
          style={[
            styles.requestMoreButton,
            (isLoading || isConfirming || isRequestingMore) && styles.requestMoreButtonDisabled
          ]}
        >
          <Text style={styles.requestMoreButtonText}>
            他の提案を見る
          </Text>
        </TouchableOpacity>
      )}

      {isRequestingMore && (
        <View style={styles.requestingMoreContainer}>
          <ActivityIndicator size="small" color="#2563eb" />
          <Text style={styles.requestingMoreText}>追加提案を取得中...</Text>
        </View>
      )}

      <TouchableOpacity
        onPress={handleConfirm}
        disabled={selectedIndex === null || isLoading || isConfirming}
        style={[
          styles.confirmButton,
          (selectedIndex === null || isLoading || isConfirming) && styles.confirmButtonDisabled
        ]}
      >
        <Text style={styles.confirmButtonText}>
          {isConfirming ? '確定中...' : '確定'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
    marginBottom: 16,
  },
  recipeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  recipeItemSelected: {
    backgroundColor: '#dbeafe',
    borderColor: '#3b82f6',
    borderWidth: 2,
  },
  radioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#9ca3af',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: {
    borderColor: '#2563eb',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2563eb',
  },
  recipeTitle: {
    fontSize: 16,
    color: '#374151',
    flex: 1,
  },
  confirmButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  confirmButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  confirmButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  // Phase 2.1: 段階情報のスタイル
  stageContainer: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  badgeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  mainBadge: {
    backgroundColor: '#2563eb',
  },
  categoryBadge: {
    backgroundColor: '#4f46e5',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  ingredientsContainer: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#fef9c3',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fde047',
  },
  ingredientsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  ingredientsList: {
    fontSize: 14,
    color: '#6b7280',
  },
  // Phase 2.3: レシピ一覧を見るボタンのスタイル
  viewListButton: {
    backgroundColor: '#10b981',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  viewListButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Phase 2.4: 他の提案を見るボタンのスタイル
  requestMoreButton: {
    backgroundColor: '#6366f1',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  requestMoreButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  requestMoreButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  requestingMoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  requestingMoreText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#6b7280',
  },
});

export default SelectionOptions;

