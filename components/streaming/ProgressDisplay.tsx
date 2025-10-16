/**
 * 進捗表示コンポーネント
 * React Native環境向けに調整
 */

import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { ProgressData, AnimationStage, ProgressDisplayProps } from './types';

export function ProgressDisplay({ progress, message, isConnected, error }: ProgressDisplayProps) {
  // アニメーション段階の判定
  const getAnimationStage = (progress: ProgressData): AnimationStage => {
    if (progress.total_tasks === 0) return 'gradient'; // 0/0 → 0/4: グラデーション
    if (progress.completed_tasks === 0) return 'pulse'; // 0/4 → 1/4: パルス
    return 'sparkle'; // 1/4 → 4/4: スパークル
  };

  const animationStage = getAnimationStage(progress);

  // アニメーション色の生成
  const getAnimationColor = (stage: AnimationStage) => {
    switch (stage) {
      case 'gradient':
        return '#3B82F6'; // blue-500
      case 'pulse':
        return '#10B981'; // emerald-500
      case 'sparkle':
        return '#F59E0B'; // amber-500
      default:
        return '#9CA3AF'; // gray-400
    }
  };

  // エラー表示
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <View style={styles.errorContent}>
          <Text style={styles.errorIcon}>❌</Text>
          <View style={styles.errorTextContainer}>
            <Text style={styles.errorTitle}>エラーが発生しました</Text>
            <Text style={styles.errorMessage}>{error}</Text>
          </View>
        </View>
      </View>
    );
  }

  // 接続状態表示
  if (!isConnected) {
    return (
      <View style={styles.connectingContainer}>
        <View style={styles.connectingContent}>
          <Text style={styles.connectingIcon}>⏳</Text>
          <View style={styles.connectingTextContainer}>
            <Text style={styles.connectingTitle}>接続中...</Text>
            <Text style={styles.connectingMessage}>サーバーに接続しています...</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <Text style={styles.title}>🚀 処理進捗</Text>
        <View style={styles.statusContainer}>
          <View style={[styles.statusDot, { backgroundColor: getAnimationColor(animationStage) }]} />
          <Text style={styles.statusText}>{animationStage}</Text>
        </View>
      </View>

      {/* タスク数と進捗バー */}
      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>進捗</Text>
          <Text style={styles.progressValue}>
            {progress.total_tasks === 0 
              ? `初期化中 (${progress.progress_percentage}%)`
              : `${progress.completed_tasks}/${progress.total_tasks} 完了 (${progress.progress_percentage}%)`
            }
          </Text>
        </View>
        <View style={styles.progressBarContainer}>
          <View 
            style={[
              styles.progressBar, 
              { 
                width: `${progress.progress_percentage}%`,
                backgroundColor: getAnimationColor(animationStage)
              }
            ]}
          />
        </View>
      </View>

      {/* 現在のタスク */}
      {progress.current_task && (
        <View style={styles.currentTaskContainer}>
          <Text style={styles.currentTaskLabel}>現在のタスク</Text>
          <Text style={styles.currentTaskText}>{progress.current_task}</Text>
        </View>
      )}

      {/* メッセージ */}
      {message && (
        <View style={styles.messageContainer}>
          <Text style={styles.messageText}>{message}</Text>
        </View>
      )}

      {/* 完了状態 */}
      {progress.is_complete && (
        <View style={styles.completeContainer}>
          <Text style={styles.completeIcon}>✅</Text>
          <Text style={styles.completeText}>処理が完了しました！</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusText: {
    fontSize: 12,
    color: '#6B7280',
  },
  progressSection: {
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  progressValue: {
    fontSize: 14,
    color: '#6B7280',
  },
  progressBarContainer: {
    width: '100%',
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  currentTaskContainer: {
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  currentTaskLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2563EB',
    marginBottom: 4,
  },
  currentTaskText: {
    fontSize: 14,
    color: '#1E40AF',
  },
  messageContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  messageText: {
    fontSize: 14,
    color: '#6B7280',
  },
  completeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    padding: 12,
  },
  completeIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  completeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#166534',
  },
  errorContainer: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    marginVertical: 8,
  },
  errorContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  errorIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  errorTextContainer: {
    flex: 1,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#991B1B',
    marginBottom: 4,
  },
  errorMessage: {
    fontSize: 14,
    color: '#B91C1C',
  },
  connectingContainer: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    marginVertical: 8,
  },
  connectingContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  connectingIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  connectingTextContainer: {
    flex: 1,
  },
  connectingTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#92400E',
    marginBottom: 4,
  },
  connectingMessage: {
    fontSize: 14,
    color: '#B45309',
  },
});
