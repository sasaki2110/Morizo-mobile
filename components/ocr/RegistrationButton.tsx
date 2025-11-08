import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';

interface RegistrationButtonProps {
  selectedCount: number;
  onRegister: () => void;
  disabled: boolean;
  isRegistering: boolean;
}

/**
 * 登録ボタンコンポーネント
 * 
 * 責任: 選択されたアイテムの登録ボタンを提供
 * 
 * @param selectedCount - 選択されたアイテム数
 * @param onRegister - 登録実行時のコールバック
 * @param disabled - ボタンの無効状態
 * @param isRegistering - 登録中の状態
 */
const RegistrationButton: React.FC<RegistrationButtonProps> = ({
  selectedCount,
  onRegister,
  disabled,
  isRegistering,
}) => {
  return (
    <View style={styles.section}>
      <TouchableOpacity
        onPress={onRegister}
        disabled={disabled}
        style={[styles.registerButton, disabled && styles.registerButtonDisabled]}
      >
        {isRegistering ? (
          <ActivityIndicator size="small" color="#ffffff" />
        ) : (
          <Text style={styles.registerButtonText}>
            選択したアイテムを登録 ({selectedCount}件)
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: 20,
  },
  registerButton: {
    backgroundColor: '#10b981',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  registerButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  registerButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default RegistrationButton;

