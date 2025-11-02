import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet, Modal, TextInput } from 'react-native';
import { getInventoryList, InventoryItem } from '../api/inventory-api';
import { Picker } from '@react-native-picker/picker';

interface InventoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const InventoryPanel: React.FC<InventoryPanelProps> = ({ isOpen, onClose }) => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [storageLocationFilter, setStorageLocationFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<string>('desc');

  useEffect(() => {
    if (isOpen) {
      loadInventory();
    }
  }, [isOpen, sortBy, sortOrder]);

  const loadInventory = async () => {
    setIsLoading(true);
    try {
      const data = await getInventoryList(sortBy, sortOrder);
      setInventory(data);
    } catch (error) {
      console.error('Inventory load failed:', error);
      setInventory([]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
  };

  // フィルター適用
  const filteredInventory = inventory.filter(item => {
    const matchesStorage = !storageLocationFilter || item.storage_location === storageLocationFilter;
    const matchesSearch = !searchQuery || 
      item.item_name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStorage && matchesSearch;
  });

  // 保管場所の一意リストを取得
  const storageLocations = Array.from(new Set(
    inventory.map(item => item.storage_location).filter(Boolean) as string[]
  ));

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
          <Text style={styles.title}>📦 在庫管理</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeButton}>✕</Text>
          </TouchableOpacity>
        </View>
        
        {/* フィルター */}
        <View style={styles.filters}>
          {/* 保管場所フィルター */}
          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>保管場所</Text>
            <Picker
              selectedValue={storageLocationFilter}
              onValueChange={(value) => setStorageLocationFilter(value)}
              style={styles.picker}
            >
              <Picker.Item label="全て" value="" />
              {storageLocations.map(location => (
                <Picker.Item key={location} label={location} value={location} />
              ))}
            </Picker>
          </View>
          
          {/* 検索フィルター */}
          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>検索</Text>
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="アイテム名で検索..."
              placeholderTextColor="#999"
            />
          </View>
          
          {/* ソート */}
          <View style={styles.sortGroup}>
            <View style={styles.sortItem}>
              <Text style={styles.filterLabel}>並び順</Text>
              <Picker
                selectedValue={sortBy}
                onValueChange={(value) => setSortBy(value)}
                style={styles.picker}
              >
                <Picker.Item label="登録日" value="created_at" />
                <Picker.Item label="アイテム名" value="item_name" />
                <Picker.Item label="数量" value="quantity" />
                <Picker.Item label="保管場所" value="storage_location" />
                <Picker.Item label="消費期限" value="expiry_date" />
              </Picker>
            </View>
            
            <View style={styles.sortItem}>
              <Text style={styles.filterLabel}>順序</Text>
              <Picker
                selectedValue={sortOrder}
                onValueChange={(value) => setSortOrder(value)}
                style={styles.picker}
              >
                <Picker.Item label="降順" value="desc" />
                <Picker.Item label="昇順" value="asc" />
              </Picker>
            </View>
          </View>
        </View>
        
        {/* 在庫リスト */}
        <ScrollView style={styles.content}>
          {isLoading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color="#2563eb" />
              <Text style={styles.loadingText}>読み込み中...</Text>
            </View>
          ) : filteredInventory.length === 0 ? (
            <View style={styles.centerContainer}>
              <Text style={styles.emptyText}>
                {inventory.length === 0 ? '在庫がありません' : '該当する在庫がありません'}
              </Text>
            </View>
          ) : (
            <View style={styles.inventoryList}>
              {/* テーブルヘッダー */}
              <View style={styles.tableHeader}>
                <Text style={[styles.headerCell, styles.headerCellName]}>アイテム名</Text>
                <Text style={[styles.headerCell, styles.headerCellQuantity]}>数量</Text>
                <Text style={[styles.headerCell, styles.headerCellUnit]}>単位</Text>
                <Text style={[styles.headerCell, styles.headerCellLocation]}>場所</Text>
                <Text style={[styles.headerCell, styles.headerCellDate]}>登録日</Text>
              </View>
              
              {/* 在庫アイテム */}
              {filteredInventory.map((item) => (
                <View key={item.id} style={styles.inventoryRow}>
                  <Text style={[styles.cell, styles.cellName]}>{item.item_name}</Text>
                  <Text style={[styles.cell, styles.cellQuantity]}>{item.quantity}</Text>
                  <Text style={[styles.cell, styles.cellUnit]}>{item.unit}</Text>
                  <Text style={[styles.cell, styles.cellLocation]}>
                    {item.storage_location || '-'}
                  </Text>
                  <Text style={[styles.cell, styles.cellDate]}>
                    {formatDate(item.created_at)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
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
  picker: {
    height: 50,
    backgroundColor: '#f9fafb',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#ffffff',
    fontSize: 14,
  },
  sortGroup: {
    flexDirection: 'row',
  },
  sortItem: {
    flex: 1,
    marginRight: 12,
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
  inventoryList: {
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 2,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  headerCell: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#4b5563',
  },
  headerCellName: {
    flex: 2,
  },
  headerCellQuantity: {
    flex: 1,
    textAlign: 'right',
  },
  headerCellUnit: {
    flex: 0.8,
    textAlign: 'center',
  },
  headerCellLocation: {
    flex: 1.2,
    textAlign: 'left',
  },
  headerCellDate: {
    flex: 1.5,
    textAlign: 'left',
  },
  inventoryRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  cell: {
    fontSize: 14,
    color: '#1f2937',
  },
  cellName: {
    flex: 2,
  },
  cellQuantity: {
    flex: 1,
    textAlign: 'right',
  },
  cellUnit: {
    flex: 0.8,
    textAlign: 'center',
    color: '#6b7280',
  },
  cellLocation: {
    flex: 1.2,
    color: '#6b7280',
  },
  cellDate: {
    flex: 1.5,
    color: '#6b7280',
  },
});

export default InventoryPanel;

