import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { RecipeCandidate } from '../types/menu';

interface SelectedRecipeCardProps {
  main?: RecipeCandidate;
  sub?: RecipeCandidate;
  soup?: RecipeCandidate;
  onSave?: () => void;
  isSaving?: boolean;
  savedMessage?: string;
}

const SelectedRecipeCard: React.FC<SelectedRecipeCardProps> = ({
  main,
  sub,
  soup,
  onSave,
  isSaving = false,
  savedMessage
}) => {
  const isComplete = main && sub && soup;
  const [isExpanded, setIsExpanded] = useState(false);
  
  // 献立が完成したら自動で開く
  useEffect(() => {
    if (isComplete) {
      setIsExpanded(true);
    }
  }, [isComplete]);
  
  const getTitle = () => {
    if (isComplete) return '🎉 献立が完成しました！';
    if (sub) return '✅ 副菜が確定しました';
    if (main) return '✅ 主菜が確定しました';
    return '';
  };
  
  return (
    <View style={styles.container}>
      {/* ヘッダー部分（常に表示） */}
      <View style={styles.header}>
        <Text style={styles.title}>{getTitle()}</Text>
        <TouchableOpacity
          onPress={() => setIsExpanded(!isExpanded)}
          style={styles.toggleButton}
        >
          <Text style={styles.toggleButtonText}>
            {isExpanded ? '▼' : '▲'}
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* 内容部分（展開時のみ表示） */}
      {isExpanded && (
        <>
          {isComplete && (
            <View style={styles.completeContainer}>
              <Text style={styles.completeText}>📅 今日の献立</Text>
            </View>
          )}
          
          <View style={styles.recipeList}>
            {main && (
              <View style={styles.recipeCard}>
                <Text style={styles.emoji}>🍖</Text>
                <View style={styles.recipeContent}>
                  <Text style={styles.recipeTitle}>主菜: {main.title}</Text>
                  {main.ingredients && main.ingredients.length > 0 && (
                    <Text style={styles.ingredients}>
                      食材: {main.ingredients.join(', ')}
                    </Text>
                  )}
                </View>
              </View>
            )}
            
            {sub && (
              <View style={styles.recipeCard}>
                <Text style={styles.emoji}>🥗</Text>
                <View style={styles.recipeContent}>
                  <Text style={styles.recipeTitle}>副菜: {sub.title}</Text>
                  {sub.ingredients && sub.ingredients.length > 0 && (
                    <Text style={styles.ingredients}>
                      食材: {sub.ingredients.join(', ')}
                    </Text>
                  )}
                </View>
              </View>
            )}
            
            {soup && (
              <View style={styles.recipeCard}>
                <Text style={styles.emoji}>🍲</Text>
                <View style={styles.recipeContent}>
                  <Text style={styles.recipeTitle}>汁物: {soup.title}</Text>
                  {soup.ingredients && soup.ingredients.length > 0 && (
                    <Text style={styles.ingredients}>
                      食材: {soup.ingredients.join(', ')}
                    </Text>
                  )}
                </View>
              </View>
            )}
          </View>
          
          {onSave && (
            <TouchableOpacity
              onPress={onSave}
              disabled={isSaving}
              style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
            >
              <Text style={styles.saveButtonText}>
                {isSaving ? '保存中...' : '献立を保存'}
              </Text>
            </TouchableOpacity>
          )}
          
          {savedMessage && (
            <View style={styles.messageContainer}>
              <Text style={styles.messageText}>{savedMessage}</Text>
            </View>
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#22c55e',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
    flex: 1,
    textAlign: 'center',
  },
  toggleButton: {
    padding: 4,
    minWidth: 32,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleButtonText: {
    fontSize: 20,
    color: '#6b7280',
    fontWeight: 'bold',
  },
  completeContainer: {
    marginBottom: 12,
  },
  completeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  recipeList: {
    gap: 12,
    marginBottom: 16,
  },
  recipeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    backgroundColor: '#ffffff',
    borderRadius: 8,
  },
  emoji: {
    fontSize: 24,
    marginRight: 12,
  },
  recipeContent: {
    flex: 1,
  },
  recipeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  ingredients: {
    fontSize: 14,
    color: '#6b7280',
  },
  saveButton: {
    backgroundColor: '#22c55e',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  messageContainer: {
    marginTop: 12,
    padding: 8,
    backgroundColor: '#dbeafe',
    borderRadius: 8,
  },
  messageText: {
    fontSize: 14,
    color: '#1e40af',
  },
});

export default SelectedRecipeCard;

