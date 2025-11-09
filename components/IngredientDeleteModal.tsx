import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  Switch,
  Alert,
} from 'react-native';
import { getDeleteCandidates, deleteIngredients, IngredientDeleteCandidate, DeleteIngredientItem } from '../api/menu-api';

interface IngredientDeleteModalProps {
  date: string; // YYYY-MM-DD形式
  isOpen: boolean;
  onClose: () => void;
  onDeleteComplete: () => void;
}

const IngredientDeleteModal: React.FC<IngredientDeleteModalProps> = ({
  date,
  isOpen,
  onClose,
  onDeleteComplete,
}) => {
  const [candidates, setCandidates] = useState<IngredientDeleteCandidate[]>([]);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // モーダルが開いたときに候補を取得
  useEffect(() => {
    if (isOpen && date) {
      loadCandidates();
    } else {
      // モーダルが閉じられたときに状態をリセット
      setCandidates([]);
      setCheckedItems({});
      setQuantities({});
      setError(null);
    }
  }, [isOpen, date]);

  const loadCandidates = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getDeleteCandidates(date);
      setCandidates(result);
      // 初期状態: すべてチェック、変更後数量 = 変更前数量 - 1（最小0）
      const initialChecked: Record<string, boolean> = {};
      const initialQuantities: Record<string, number> = {};
      result.forEach((candidate) => {
        initialChecked[candidate.inventory_id] = true;
        // 変更前数量 - 1、最小0
        const newQuantity = Math.max(0, candidate.current_quantity - 1);
        initialQuantities[candidate.inventory_id] = newQuantity;
      });
      setCheckedItems(initialChecked);
      setQuantities(initialQuantities);
    } catch (err) {
      console.error('Failed to load candidates:', err);
      const errorMessage = err instanceof Error ? err.message : '削除候補の取得に失敗しました';
      setError(errorMessage);
      setCandidates([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckChange = (inventoryId: string, checked: boolean) => {
    setCheckedItems((prev) => ({
      ...prev,
      [inventoryId]: checked,
    }));
  };

  const handleQuantityChange = (inventoryId: string, quantity: string) => {
    const numValue = parseFloat(quantity) || 0;
    setQuantities((prev) => ({
      ...prev,
      [inventoryId]: Math.max(0, numValue),
    }));
  };

  const handleDelete = async () => {
    // チェックされているアイテムを抽出して送信
    const itemsToDelete: DeleteIngredientItem[] = [];

    candidates.forEach((candidate) => {
      const isChecked = checkedItems[candidate.inventory_id];
      if (!isChecked) {
        return; // チェックされていない場合はスキップ
      }

      const newQuantity = quantities[candidate.inventory_id] ?? 0;
      itemsToDelete.push({
        item_name: candidate.item_name,
        quantity: newQuantity,
        inventory_id: candidate.inventory_id,
      });
    });

    if (itemsToDelete.length === 0) {
      Alert.alert('エラー', '処理対象がありません');
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      const result = await deleteIngredients(date, itemsToDelete);
      Alert.alert(
        '処理完了',
        `処理が完了しました。\n削除: ${result.deleted_count}件\n更新: ${result.updated_count}件`,
        [
          {
            text: 'OK',
            onPress: () => {
              onDeleteComplete();
              onClose();
            },
          },
        ]
      );
    } catch (err) {
      console.error('Failed to delete ingredients:', err);
      const errorMessage = err instanceof Error ? err.message : '食材削除に失敗しました';
      setError(errorMessage);
      Alert.alert('エラー', errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()} (${days[date.getDay()]})`;
  };

  if (!isOpen) return null;

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
          {/* ヘッダー */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>🗑️ 食材削除 - {formatDate(date)}</Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              disabled={isDeleting}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* コンテンツ */}
          <ScrollView style={styles.content}>
            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>⚠️ {error}</Text>
              </View>
            )}

            {isLoading ? (
              <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#2563eb" />
                <Text style={styles.loadingText}>読み込み中...</Text>
              </View>
            ) : candidates.length === 0 ? (
              <View style={styles.centerContainer}>
                <Text style={styles.emptyText}>削除候補がありません</Text>
              </View>
            ) : (
              <View style={styles.tableContainer}>
                {/* テーブルヘッダー */}
                <View style={styles.tableHeader}>
                  <View style={styles.headerCellProcess}>
                    <Text style={styles.headerText}>処理</Text>
                  </View>
                  <View style={styles.headerCellName}>
                    <Text style={styles.headerText}>アイテム名</Text>
                  </View>
                  <View style={styles.headerCellQuantity}>
                    <Text style={styles.headerText}>変更前</Text>
                  </View>
                  <View style={styles.headerCellQuantity}>
                    <Text style={styles.headerText}>変更後</Text>
                  </View>
                </View>

                {/* テーブルボディ */}
                {candidates.map((candidate) => {
                  const isChecked = checkedItems[candidate.inventory_id] ?? false;
                  const newQuantity = quantities[candidate.inventory_id] ?? 0;

                  return (
                    <View key={candidate.inventory_id} style={styles.tableRow}>
                      <View style={styles.cellProcess}>
                        <Switch
                          value={isChecked}
                          onValueChange={(checked) =>
                            handleCheckChange(candidate.inventory_id, checked)
                          }
                          disabled={isDeleting}
                        />
                      </View>
                      <View style={styles.cellName}>
                        <Text style={styles.itemNameText}>{candidate.item_name}</Text>
                      </View>
                      <View style={styles.cellQuantity}>
                        <Text style={styles.quantityText}>
                          {candidate.current_quantity} {candidate.unit}
                        </Text>
                      </View>
                      <View style={styles.cellQuantity}>
                        <TextInput
                          style={[
                            styles.quantityInput,
                            !isChecked && styles.quantityInputDisabled,
                          ]}
                          value={isChecked ? newQuantity.toString() : ''}
                          onChangeText={(value) =>
                            handleQuantityChange(candidate.inventory_id, value)
                          }
                          editable={isChecked && !isDeleting}
                          keyboardType="numeric"
                          placeholder={isChecked ? '数量' : ''}
                          placeholderTextColor="#999"
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </ScrollView>

          {/* フッター */}
          <View style={styles.footer}>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.button, styles.cancelButton]}
              disabled={isDeleting}
            >
              <Text style={styles.cancelButtonText}>キャンセル</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleDelete}
              style={[
                styles.button,
                styles.deleteButton,
                (isDeleting || isLoading || candidates.length === 0) &&
                  styles.deleteButtonDisabled,
              ]}
              disabled={isDeleting || isLoading || candidates.length === 0}
            >
              <Text style={styles.deleteButtonText}>
                {isDeleting ? '処理中...' : '削除実行'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
    width: '100%',
    height: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#6b7280',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  errorContainer: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#dc2626',
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
  tableContainer: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerCellProcess: {
    width: 80,
    padding: 12,
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
  },
  headerCellName: {
    flex: 1,
    padding: 12,
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
  },
  headerCellQuantity: {
    width: 100,
    padding: 12,
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
  },
  headerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  cellProcess: {
    width: 80,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
  },
  cellName: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
  },
  cellQuantity: {
    width: 100,
    padding: 12,
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
  },
  itemNameText: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '500',
  },
  quantityText: {
    fontSize: 14,
    color: '#4b5563',
  },
  quantityInput: {
    fontSize: 14,
    padding: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 4,
    backgroundColor: '#ffffff',
    color: '#1f2937',
  },
  quantityInputDisabled: {
    backgroundColor: '#f3f4f6',
    color: '#9ca3af',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 100,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#e5e7eb',
  },
  cancelButtonText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  deleteButton: {
    backgroundColor: '#dc2626',
  },
  deleteButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  deleteButtonText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
  },
});

export default IngredientDeleteModal;

