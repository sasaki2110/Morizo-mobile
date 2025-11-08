import React from 'react';
import { View, Text, FlatList, TextInput, Switch, StyleSheet } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { OCRItem } from '../../api/inventory-api';
import { UNITS, STORAGE_LOCATIONS } from '../../lib/utils/ocr-constants';

interface EditableItemListProps {
  items: OCRItem[];
  onItemEdit: (index: number, field: keyof OCRItem, value: string | number | null) => void;
  selectedItems: Set<number>;
  onToggleItem: (index: number) => void;
  onSelectAll: (value: boolean) => void;
  units?: readonly string[];
  storageLocations?: readonly string[];
}

/**
 * 編集可能なアイテムリストコンポーネント
 * 
 * 責任: OCR解析結果のアイテム一覧を編集可能なテーブル形式で表示し、選択機能を提供
 * 
 * @param items - 編集可能なアイテムリスト
 * @param onItemEdit - アイテム編集時のコールバック
 * @param selectedItems - 選択されたアイテムのインデックスセット
 * @param onToggleItem - アイテム選択/解除時のコールバック
 * @param onSelectAll - 全選択/全解除時のコールバック
 * @param units - 単位の配列（デフォルト: UNITS）
 * @param storageLocations - 保管場所の配列（デフォルト: STORAGE_LOCATIONS）
 */
const EditableItemList: React.FC<EditableItemListProps> = ({
  items,
  onItemEdit,
  selectedItems,
  onToggleItem,
  onSelectAll,
  units = UNITS,
  storageLocations = STORAGE_LOCATIONS,
}) => {
  const allSelected = selectedItems.size === items.length && items.length > 0;

  return (
    <View style={styles.section}>
      <Text style={styles.label}>抽出されたアイテム（編集・選択可能）</Text>
      
      {/* 全選択/全解除 */}
      <View style={styles.selectAllRow}>
        <Text style={styles.selectAllLabel}>全選択</Text>
        <Switch
          value={allSelected}
          onValueChange={onSelectAll}
        />
      </View>

      {/* アイテムリスト */}
      <FlatList
        data={items}
        keyExtractor={(_, index) => `item-${index}`}
        scrollEnabled={false}
        renderItem={({ item, index }) => (
          <View style={styles.itemRow}>
            {/* 選択チェックボックス */}
            <View style={styles.checkboxCell}>
              <Switch
                value={selectedItems.has(index)}
                onValueChange={() => onToggleItem(index)}
              />
            </View>

            {/* アイテム名 */}
            <View style={styles.itemNameCell}>
              <TextInput
                style={styles.itemInput}
                value={item.item_name}
                onChangeText={(value) => onItemEdit(index, 'item_name', value)}
                placeholder="アイテム名"
                placeholderTextColor="#999"
              />
            </View>

            {/* 数量 */}
            <View style={styles.quantityCell}>
              <TextInput
                style={styles.itemInput}
                value={item.quantity.toString()}
                onChangeText={(value) => {
                  const num = parseFloat(value);
                  onItemEdit(index, 'quantity', isNaN(num) ? 0 : num);
                }}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#999"
              />
            </View>

            {/* 単位 */}
            <View style={styles.unitCell}>
              <Picker
                selectedValue={item.unit}
                onValueChange={(value) => onItemEdit(index, 'unit', value)}
                style={styles.itemPicker}
              >
                {units.map(u => (
                  <Picker.Item key={u} label={u} value={u} />
                ))}
              </Picker>
            </View>

            {/* 保管場所 */}
            <View style={styles.locationCell}>
              <Picker
                selectedValue={item.storage_location || '冷蔵庫'}
                onValueChange={(value) => onItemEdit(index, 'storage_location', value)}
                style={styles.itemPicker}
              >
                {storageLocations.map(loc => (
                  <Picker.Item key={loc} label={loc} value={loc} />
                ))}
              </Picker>
            </View>

            {/* 消費期限 */}
            <View style={styles.dateCell}>
              <TextInput
                style={styles.itemInput}
                value={item.expiry_date || ''}
                onChangeText={(value) => onItemEdit(index, 'expiry_date', value || null)}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#999"
              />
            </View>
          </View>
        )}
        ListHeaderComponent={() => (
          <View style={styles.tableHeader}>
            <View style={styles.checkboxCell} />
            <View style={styles.itemNameCell}><Text style={styles.headerText}>アイテム名</Text></View>
            <View style={styles.quantityCell}><Text style={styles.headerText}>数量</Text></View>
            <View style={styles.unitCell}><Text style={styles.headerText}>単位</Text></View>
            <View style={styles.locationCell}><Text style={styles.headerText}>保管場所</Text></View>
            <View style={styles.dateCell}><Text style={styles.headerText}>消費期限</Text></View>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  selectAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  selectAllLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: 2,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  headerText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#4b5563',
  },
  itemRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    alignItems: 'center',
  },
  checkboxCell: {
    width: 50,
    alignItems: 'center',
  },
  itemNameCell: {
    flex: 2,
    marginRight: 4,
  },
  quantityCell: {
    flex: 1,
    marginRight: 4,
  },
  unitCell: {
    flex: 1,
    marginRight: 4,
  },
  locationCell: {
    flex: 1.5,
    marginRight: 4,
  },
  dateCell: {
    flex: 1.5,
  },
  itemInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: '#ffffff',
    fontSize: 12,
    color: '#1f2937',
  },
  itemPicker: {
    height: 40,
    backgroundColor: '#ffffff',
  },
});

export default EditableItemList;

