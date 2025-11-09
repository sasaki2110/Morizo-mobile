import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet, Modal } from 'react-native';
import { getMenuHistory } from '../api/menu-api';
import { Picker } from '@react-native-picker/picker';
import IngredientDeleteModal from './IngredientDeleteModal';

interface HistoryRecipe {
  category: string | null;
  title: string;
  source: string;
  url?: string;
  history_id: string;
  duplicate_warning?: string;
}

interface HistoryEntry {
  date: string;
  recipes: HistoryRecipe[];
  ingredients_deleted?: boolean; // 食材削除済みフラグ（オプショナル）
}

interface HistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({ isOpen, onClose }) => {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [days, setDays] = useState(14);
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen, days, categoryFilter]);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const data = await getMenuHistory(days, categoryFilter || undefined);
      setHistory(data);
    } catch (error) {
      console.error('History load failed:', error);
      setHistory([]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()} (${days[date.getDay()]})`;
  };

  const getCategoryIcon = (category: string | null) => {
    if (category === 'main') return '🍖';
    if (category === 'sub') return '🥗';
    if (category === 'soup') return '🍲';
    return '🍽️';
  };

  const handleDeleteClick = (date: string) => {
    setSelectedDate(date);
    setDeleteModalOpen(true);
  };

  const handleDeleteComplete = () => {
    // 削除完了後、該当日付のingredients_deletedフラグを更新
    setHistory((prevHistory) =>
      prevHistory.map((entry) =>
        entry.date === selectedDate
          ? { ...entry, ingredients_deleted: true }
          : entry
      )
    );
  };

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* ヘッダー */}
        <View style={styles.header}>
          <Text style={styles.title}>📅 献立履歴</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeButton}>✕</Text>
          </TouchableOpacity>
        </View>
        
        {/* フィルター */}
        <View style={styles.filters}>
          {/* 期間フィルター */}
          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>期間: {days}日間</Text>
            <View style={styles.buttonGroup}>
              {[7, 14, 30].map((d) => (
                <TouchableOpacity
                  key={d}
                  onPress={() => setDays(d)}
                  style={[styles.filterButton, days === d && styles.filterButtonActive]}
                >
                  <Text style={[styles.filterButtonText, days === d && styles.filterButtonTextActive]}>
                    {d}日
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          {/* カテゴリフィルター */}
          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>カテゴリ</Text>
            <Picker
              selectedValue={categoryFilter}
              onValueChange={(value) => setCategoryFilter(value)}
              style={styles.picker}
            >
              <Picker.Item label="全て" value="" />
              <Picker.Item label="主菜" value="main" />
              <Picker.Item label="副菜" value="sub" />
              <Picker.Item label="汁物" value="soup" />
            </Picker>
          </View>
        </View>
        
        {/* 履歴リスト */}
        <ScrollView style={styles.content}>
          {isLoading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color="#2563eb" />
              <Text style={styles.loadingText}>読み込み中...</Text>
            </View>
          ) : history.length === 0 ? (
            <View style={styles.centerContainer}>
              <Text style={styles.emptyText}>履歴がありません</Text>
            </View>
          ) : (
            <View style={styles.historyList}>
              {history.map((entry, index) => (
                <View key={index} style={styles.historyEntry}>
                  <View style={styles.dateRow}>
                    <Text style={styles.dateText}>📆 {formatDate(entry.date)}</Text>
                    {entry.ingredients_deleted ? (
                      <View style={styles.deletedBadge}>
                        <Text style={styles.deletedBadgeText}>削除済み</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        onPress={() => handleDeleteClick(entry.date)}
                        style={styles.deleteButton}
                      >
                        <Text style={styles.deleteButtonText}>食材削除</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  {entry.recipes.map((recipe: any, recipeIndex: number) => (
                    <View
                      key={recipeIndex}
                      style={[
                        styles.recipeCard,
                        recipe.duplicate_warning && styles.recipeCardWarning
                      ]}
                    >
                      <Text style={styles.categoryIcon}>{getCategoryIcon(recipe.category)}</Text>
                      <View style={styles.recipeContent}>
                        <Text style={styles.recipeTitle}>
                          {recipe.title.replace(/^(主菜|副菜|汁物):\s*/, '')}
                        </Text>
                        {recipe.duplicate_warning && (
                          <Text style={styles.warningText}>
                            ⚠️ 重複警告（{recipe.duplicate_warning}）
                          </Text>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </View>

      {/* 食材削除モーダル */}
      <IngredientDeleteModal
        date={selectedDate}
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onDeleteComplete={handleDeleteComplete}
      />
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
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  closeButton: {
    fontSize: 24,
    color: '#6b7280',
  },
  filters: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filterGroup: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 8,
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#e5e7eb',
  },
  filterButtonActive: {
    backgroundColor: '#2563eb',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#374151',
  },
  filterButtonTextActive: {
    color: '#ffffff',
  },
  picker: {
    height: 50,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#4b5563',
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
  },
  historyList: {
    gap: 16,
  },
  historyEntry: {
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  dateText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4b5563',
    flex: 1,
  },
  deleteButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
  },
  deleteButtonText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '500',
  },
  deletedBadge: {
    backgroundColor: '#e5e7eb',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
  },
  deletedBadgeText: {
    fontSize: 12,
    color: '#6b7280',
  },
  recipeCard: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f9fafb',
    marginBottom: 8,
  },
  recipeCardWarning: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fbbf24',
  },
  categoryIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  recipeContent: {
    flex: 1,
  },
  recipeTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
  },
  warningText: {
    fontSize: 12,
    color: '#92400e',
    marginTop: 4,
  },
});

export default HistoryPanel;

