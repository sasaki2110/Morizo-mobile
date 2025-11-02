import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, ActivityIndicator } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import * as Clipboard from 'expo-clipboard';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenHistory: () => void;
  onOpenInventory: () => void;
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose, onOpenHistory, onOpenInventory }) => {
  const { user, session, signOut } = useAuth();
  const [loading, setLoading] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await signOut();
    } catch (error) {
      console.error('ログアウトエラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyToken = async () => {
    try {
      if (session?.access_token) {
        await Clipboard.setStringAsync(session.access_token);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      }
    } catch (error) {
      console.error('トークンコピーエラー:', error);
    }
  };

  return (
    <Modal
      visible={isOpen}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity 
          style={styles.overlayTouchable}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.modalContent}>
          {/* ヘッダー */}
          <View style={styles.header}>
            <Text style={styles.title}>プロフィール</Text>
            <TouchableOpacity 
              onPress={onClose}
              style={styles.closeButtonTouchable}
            >
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>
          
          {/* プロフィール情報 */}
          <View style={styles.profileInfo}>
            <View style={styles.avatarLarge}>
              <Text style={styles.avatarTextLarge}>
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
            <Text style={styles.statusText}>ログイン中</Text>
            <Text style={styles.emailText}>{user?.email}</Text>
          </View>

          {/* 履歴ボタン */}
          <TouchableOpacity
            style={styles.historyButton}
            onPress={() => {
              onOpenHistory();
              onClose(); // プロフィールモーダルを閉じて履歴モーダルを開く
            }}
          >
            <Text style={styles.historyButtonText}>📅 履歴</Text>
          </TouchableOpacity>

          {/* 在庫ボタン */}
          <TouchableOpacity
            style={styles.inventoryButton}
            onPress={() => {
              onOpenInventory();
              onClose(); // プロフィールモーダルを閉じて在庫モーダルを開く
            }}
          >
            <Text style={styles.inventoryButtonText}>📦 在庫</Text>
          </TouchableOpacity>

          {/* トークンコピーボタン */}
          <TouchableOpacity
            style={styles.copyButton}
            onPress={handleCopyToken}
          >
            <Text style={styles.copyButtonText}>トークンをコピー</Text>
          </TouchableOpacity>
          
          {copySuccess && (
            <Text style={styles.copySuccessText}>✓ コピーしました！</Text>
          )}

          {/* ログアウトボタン */}
          <TouchableOpacity
            style={styles.signOutButton}
            onPress={handleSignOut}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.signOutButtonText}>ログアウト</Text>
            )}
          </TouchableOpacity>

          {/* 閉じるボタン（下部） */}
          <TouchableOpacity
            style={styles.closeButtonBottom}
            onPress={onClose}
          >
            <Text style={styles.closeButtonBottomText}>閉じる</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  overlayTouchable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  closeButtonTouchable: {
    padding: 8,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButton: {
    fontSize: 28,
    color: '#6b7280',
    fontWeight: 'bold',
  },
  closeButtonBottom: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: '#e5e7eb',
    width: '100%',
    alignItems: 'center',
  },
  closeButtonBottomText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  profileInfo: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarLarge: {
    width: 80,
    height: 80,
    backgroundColor: '#dbeafe',
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarTextLarge: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  statusText: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 8,
  },
  emailText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  historyButton: {
    backgroundColor: '#d1d5db',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  historyButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  inventoryButton: {
    backgroundColor: '#d1d5db',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  inventoryButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  copyButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
    marginBottom: 8,
  },
  copyButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  copySuccessText: {
    color: '#22c55e',
    fontSize: 14,
    marginBottom: 12,
  },
  signOutButton: {
    backgroundColor: '#dc2626',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
    marginTop: 8,
  },
  signOutButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default UserProfileModal;

