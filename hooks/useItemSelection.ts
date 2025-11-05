import { useState, useEffect, useCallback } from 'react';

/**
 * アイテム選択管理を処理するカスタムフック
 * 
 * @param items 選択対象のアイテムリスト（アイテム数に基づいて選択状態を管理）
 * @returns 選択状態、個別選択/解除関数、全選択/全解除関数、クリア関数
 */
export function useItemSelection(items: unknown[]) {
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());

  // アイテムリストが変更されたときに、選択状態をリセット
  useEffect(() => {
    // アイテム数が減った場合、存在しないインデックスを選択状態から削除
    const maxIndex = items.length - 1;
    setSelectedItems(prev => {
      const newSelected = new Set<number>();
      prev.forEach(index => {
        if (index <= maxIndex) {
          newSelected.add(index);
        }
      });
      return newSelected;
    });
  }, [items.length]);

  /**
   * 個別アイテムの選択状態を切り替える
   * @param index アイテムのインデックス
   */
  const toggleItem = (index: number) => {
    setSelectedItems(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(index)) {
        newSelected.delete(index);
      } else {
        newSelected.add(index);
      }
      return newSelected;
    });
  };

  /**
   * すべてのアイテムを選択/解除する
   * @param checked trueの場合は全選択、falseの場合は全解除
   */
  const selectAll = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedItems(new Set(items.map((_, idx) => idx)));
    } else {
      setSelectedItems(new Set());
    }
  }, [items]);

  /**
   * 選択状態をクリアする
   */
  const clearSelection = () => {
    setSelectedItems(new Set());
  };

  return {
    selectedItems,
    toggleItem,
    selectAll,
    clearSelection,
  };
}

