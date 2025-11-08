/**
 * Morizo Mobile - チャット画面
 * 
 * Phase 1: 音声録音機能の分離完了
 * 音声録音機能をuseVoiceRecordingフックに分離して保守性を向上
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  Platform,
  KeyboardAvoidingView,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../contexts/AuthContext';
import { logComponent } from '../lib/logging';
import RecipeViewerScreen from './RecipeViewerScreen';
import RecipeListModal from '../components/RecipeListModal';
import HistoryPanel from '../components/HistoryPanel';
import InventoryPanel from '../components/InventoryPanel';
import UserProfileModal from '../components/UserProfileModal';
import ChatInput from '../components/ChatInput';
import ChatMessageList from '../components/ChatMessageList';
import { useModalManagement } from '../hooks/useModalManagement';
import { useRecipeSelection } from '../hooks/useRecipeSelection';
import { useChatMessages } from '../hooks/useChatMessages';
import { useSSEHandling } from '../hooks/useSSEHandling';
import { useVoiceRecording } from '../hooks/useVoiceRecording';
import { ChatMessage } from '../types/chat';

export default function ChatScreen() {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isTextChatLoading, setIsTextChatLoading] = useState(false);
  const [isVoiceChatLoading, setIsVoiceChatLoading] = useState(false);
  const [awaitingSelection, setAwaitingSelection] = useState<boolean>(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const { user, session, signOut } = useAuth();

  // 認証状態の確認
  const isAuthenticated = !!(session && user && session.user?.id === user.id);

  // コンポーネント初期化ログ
  React.useEffect(() => {
    logComponent('ChatScreen', 'component_mounted', { 
      hasUser: !!user, 
      hasSession: !!session,
      platform: Platform.OS 
    });
  }, []);


  // 未認証の場合は何もしない
  if (!isAuthenticated) {
    logComponent('ChatScreen', 'auth_not_authenticated');
    return null;
  }

  // カスタムフック
  const modalManagement = useModalManagement();
  const recipeSelection = useRecipeSelection(setChatMessages, setAwaitingSelection);
  const chatMessagesHook = useChatMessages(
    chatMessages,
    setChatMessages,
    setIsTextChatLoading,
    scrollViewRef
  );
  const sseHandling = useSSEHandling(
    chatMessages,
    setChatMessages,
    setIsTextChatLoading,
    chatMessagesHook.setAwaitingConfirmation,
    chatMessagesHook.setConfirmationSessionId,
    setAwaitingSelection,
    scrollViewRef,
    chatMessagesHook.getApiUrl
  );

  // 音声録音機能
  const voiceRecording = useVoiceRecording(
    chatMessages,
    setChatMessages,
    isVoiceChatLoading,
    setIsVoiceChatLoading,
    scrollViewRef,
    chatMessagesHook,
    chatMessagesHook.getApiUrl
  );

  // チャット履歴クリア処理
  const handleClearHistory = () => {
    Alert.alert(
      'チャット履歴をクリア',
      'チャット履歴と選択済みレシピを削除しますか？',
      [
        {
          text: 'キャンセル',
          style: 'cancel',
        },
        {
          text: 'クリア',
          style: 'destructive',
          onPress: () => {
            chatMessagesHook.clearChatHistory(setAwaitingSelection, recipeSelection.clearSelectedRecipes);
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* ユーザープロフィールセクション（アバターアイコンのみ） */}
        <View style={styles.profileSection}>
          <TouchableOpacity
            style={styles.avatarButton}
            onPress={() => setIsProfileModalOpen(true)}
          >
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* チャット履歴エリア */}
        <ChatMessageList
          chatMessages={chatMessages}
          scrollViewRef={scrollViewRef}
          isTextChatLoading={isTextChatLoading}
          awaitingSelection={awaitingSelection}
          selectedRecipes={recipeSelection.selectedRecipes}
          isSavingMenu={recipeSelection.isSavingMenu}
          savedMessage={recipeSelection.savedMessage}
          onSaveMenu={recipeSelection.handleSaveMenu}
          onClearHistory={handleClearHistory}
          onSelect={recipeSelection.handleSelection}
          onViewList={modalManagement.handleViewList}
          onRequestMore={sseHandling.handleRequestMore}
          onNextStageRequested={sseHandling.handleNextStageRequested}
          onOpenRecipeViewer={modalManagement.openRecipeViewer}
          createOnCompleteHandler={sseHandling.createOnCompleteHandler}
          createOnErrorHandler={sseHandling.createOnErrorHandler}
          createOnTimeoutHandler={sseHandling.createOnTimeoutHandler}
          createOnProgressHandler={sseHandling.createOnProgressHandler}
        />

        {/* テキストチャット入力欄 */}
        <ChatInput
          textMessage={chatMessagesHook.textMessage}
          setTextMessage={chatMessagesHook.setTextMessage}
          onSend={chatMessagesHook.sendTextMessage}
          isTextChatLoading={isTextChatLoading}
          awaitingSelection={awaitingSelection}
          isVoiceChatLoading={isVoiceChatLoading}
        />

        {/* 音声チャット欄 */}
        <View style={styles.voiceSection}>
          <Text style={styles.voiceSectionTitle}>音声チャット</Text>
          <TouchableOpacity
            style={[
              styles.voiceButton,
              voiceRecording.isRecording && styles.voiceButtonRecording,
              (isVoiceChatLoading || isTextChatLoading) && styles.voiceButtonDisabled
            ]}
            onPress={voiceRecording.isRecording ? voiceRecording.stopRecording : voiceRecording.startRecording}
            disabled={isVoiceChatLoading || isTextChatLoading}
          >
            <Text style={[
              styles.voiceButtonText,
              voiceRecording.isRecording && styles.voiceButtonTextRecording
            ]}>
              {isVoiceChatLoading ? '音声処理中...' : 
               voiceRecording.isRecording ? '⏹️ 録音停止' : '🎤 音声録音'}
            </Text>
          </TouchableOpacity>
          {voiceRecording.isRecording && (
            <Text style={styles.recordingStatusText}>
              ● 録音中... タップして停止
            </Text>
          )}
        </View>

        <StatusBar style="auto" />
      </KeyboardAvoidingView>

      {/* レシピビューアー画面 */}
      <RecipeViewerScreen
        visible={modalManagement.showRecipeViewer && !!modalManagement.recipeViewerData}
        response={modalManagement.recipeViewerData?.response || ''}
        result={modalManagement.recipeViewerData?.result}
        onClose={modalManagement.closeRecipeViewer}
      />

      {/* Phase 2.3: レシピ一覧モーダル */}
      <RecipeListModal
        isOpen={modalManagement.isListModalOpen}
        onClose={modalManagement.closeListModal}
        candidates={modalManagement.listModalCandidates}
        currentStage={modalManagement.listModalCurrentStage}
      />

      {/* Phase 3.2: 履歴パネル */}
      <HistoryPanel
        isOpen={modalManagement.isHistoryPanelOpen}
        onClose={modalManagement.closeHistoryPanel}
      />

      {/* Phase 2: 在庫パネル */}
      <InventoryPanel
        isOpen={modalManagement.isInventoryPanelOpen}
        onClose={modalManagement.closeInventoryPanel}
      />

      {/* UI改善: ユーザープロフィールモーダル */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onOpenHistory={() => {
          setIsProfileModalOpen(false);
          modalManagement.openHistoryPanel();
        }}
        onOpenInventory={() => {
          setIsProfileModalOpen(false);
          modalManagement.openInventoryPanel();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  profileSection: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 8 : 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    alignItems: 'flex-end',
  },
  avatarButton: {
    padding: 8,
    marginTop: Platform.OS === 'android' ? 4 : 0,
  },
  avatarContainer: {
    width: 44,
    height: 44,
    backgroundColor: '#e3f2fd',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1976d2',
  },
  voiceSection: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginBottom: Platform.OS === 'ios' ? 0 : 10,
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
  },
  voiceSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  voiceButton: {
    backgroundColor: '#4caf50',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  voiceButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  voiceButtonRecording: {
    backgroundColor: '#f44336',
  },
  voiceButtonTextRecording: {
    color: '#fff',
  },
  voiceButtonDisabled: {
    backgroundColor: '#ccc',
  },
  recordingStatusText: {
    fontSize: 12,
    color: '#f44336',
    marginTop: 8,
    fontWeight: 'bold',
  },
});
