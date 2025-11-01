/**
 * Morizo Mobile - チャット画面
 * 
 * Phase 4: リファクタリング完了
 * カスタムフックとUIコンポーネントに分割して保守性を向上
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
import { Audio } from 'expo-av';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { showErrorAlert } from '../utils/alert';
import { logComponent, LogCategory } from '../lib/logging';
import RecipeViewerScreen from './RecipeViewerScreen';
import RecipeListModal from '../components/RecipeListModal';
import HistoryPanel from '../components/HistoryPanel';
import UserProfileModal from '../components/UserProfileModal';
import ChatInput from '../components/ChatInput';
import ChatMessageList from '../components/ChatMessageList';
import { useModalManagement } from '../hooks/useModalManagement';
import { useRecipeSelection } from '../hooks/useRecipeSelection';
import { useChatMessages } from '../hooks/useChatMessages';
import { useSSEHandling } from '../hooks/useSSEHandling';
import { ChatMessage } from '../types/chat';

export default function ChatScreen() {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isTextChatLoading, setIsTextChatLoading] = useState(false);
  const [isVoiceChatLoading, setIsVoiceChatLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
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

  // 音声認識完了時の処理
  const handleVoiceTranscription = async (text: string) => {
    setIsVoiceChatLoading(true);
    
      // ユーザーメッセージを追加
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: text,
      timestamp: new Date(),
    };
    setChatMessages(prev => [...prev, userMessage]);
    
    // スクロールを最下部に移動
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
    
    try {
      const apiUrl = `${chatMessagesHook.getApiUrl()}/chat`;
      
      // 認証トークンを取得
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      if (!currentSession?.access_token) {
        throw new Error('認証トークンが取得できません');
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentSession.access_token}`,
        },
        body: JSON.stringify({ message: text }),
      });

      if (!response.ok) {
        throw new Error(`チャットAPI エラー: ${response.status}`);
      }

      const data = await response.json();
      
      // AIレスポンスを追加
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: data.response,
        timestamp: new Date(),
      };
      setChatMessages(prev => [...prev, aiMessage]);
      
      // スクロールを最下部に移動
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '不明なエラー';
      
      // エラーメッセージを追加
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: `エラー: ${errorMessage}`,
        timestamp: new Date(),
      };
      setChatMessages(prev => [...prev, errorMsg]);
      
      showErrorAlert(`音声チャット送信に失敗しました: ${errorMessage}`);
    } finally {
      setIsVoiceChatLoading(false);
    }
  };

  // 音声録音開始
  const startRecording = async () => {
    try {
      // 前回の音声処理が完了していない場合は録音を開始しない
      if (isVoiceChatLoading) {
        logComponent('ChatScreen', 'recording_blocked', { reason: '前回の音声処理中' });
        showErrorAlert('前回の音声処理が完了するまでお待ちください');
        return;
      }

      logComponent('ChatScreen', 'start_recording');
      
      // 録音権限のリクエスト
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        throw new Error('録音権限が許可されていません');
      }

      // 録音設定
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // 録音開始
      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      setRecording(newRecording);
      setIsRecording(true);
      
      logComponent('ChatScreen', 'recording_started');
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '不明なエラー';
      logComponent('ChatScreen', 'recording_start_error', { error: errorMessage });
      showErrorAlert(`録音開始に失敗しました: ${errorMessage}`);
    }
  };

  // 音声録音停止
  const stopRecording = async () => {
    try {
      logComponent('ChatScreen', 'stop_recording');
      
      if (!recording) {
        throw new Error('録音オブジェクトが見つかりません');
      }

      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      
      const uri = recording.getURI();
      if (!uri) {
        throw new Error('録音ファイルのURIが取得できません');
      }

      logComponent('ChatScreen', 'recording_stopped', { uri });
      
      // Whisper APIで音声をテキストに変換
      await transcribeAudio(uri);
      
      setRecording(null);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '不明なエラー';
      logComponent('ChatScreen', 'recording_stop_error', { error: errorMessage });
      showErrorAlert(`録音停止に失敗しました: ${errorMessage}`);
      setIsRecording(false);
      setRecording(null);
    }
  };

  // Whisper APIで音声をテキストに変換
  const transcribeAudio = async (audioUri: string) => {
    try {
      setIsVoiceChatLoading(true);
      logComponent('ChatScreen', 'transcribe_audio_start', { uri: audioUri });

      const apiUrl = `${chatMessagesHook.getApiUrl()}/whisper`;
      logComponent('ChatScreen', 'whisper_api_url', { apiUrl });
      
      // 認証トークンを取得
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      if (!currentSession?.access_token) {
        throw new Error('認証トークンが取得できません');
      }

      // FormDataで音声ファイルを送信
      const formData = new FormData();
      formData.append('audio', {
        uri: audioUri,
        type: 'audio/m4a',
        name: 'recording.m4a',
      } as any);

      // リトライ機能付きWhisper API呼び出し
      let response: Response;
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        try {
          logComponent('ChatScreen', 'whisper_api_attempt', { 
            attempt: retryCount + 1, 
            maxRetries,
            apiUrl 
          });

          // React Native対応のタイムアウト実装
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Request timeout')), 30000); // 30秒タイムアウト
          });

          const fetchPromise = fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${currentSession.access_token}`,
              'Content-Type': 'multipart/form-data',
            },
            body: formData,
          });

          response = await Promise.race([fetchPromise, timeoutPromise]) as Response;

          // 成功した場合はループを抜ける
          break;
          
        } catch (error) {
          retryCount++;
          const errorMessage = error instanceof Error ? error.message : '不明なエラー';
          
          logComponent('ChatScreen', 'whisper_api_retry', { 
            attempt: retryCount, 
            maxRetries, 
            error: errorMessage 
          });

          if (retryCount >= maxRetries) {
            throw error; // 最大リトライ回数に達した場合はエラーを投げる
          }

          // リトライ前に少し待機
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
      }

      if (!response.ok) {
        throw new Error(`Whisper API エラー: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.text && data.text.trim()) {
        // 音声認識成功 - テキストをチャットに送信
        await handleVoiceTranscription(data.text);
        logComponent('ChatScreen', 'transcribe_audio_success', { text: data.text });
      } else {
        throw new Error('音声からテキストを認識できませんでした');
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '不明なエラー';
      const errorDetails = {
        error: errorMessage,
        errorType: error instanceof Error ? error.constructor.name : 'Unknown',
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString()
      };
      
      logComponent('ChatScreen', 'transcribe_audio_error', errorDetails);
      
      // Whisper APIエンドポイントが存在しない場合の一時的な処理
      if (errorMessage.includes('Network request failed')) {
        const fallbackMessage = '音声認識機能は準備中です。テキストチャットをご利用ください。';
        await handleVoiceTranscription(fallbackMessage);
        logComponent('ChatScreen', 'whisper_api_fallback', { message: fallbackMessage });
      } else {
        // 音声認識エラー時の処理
        const errorMsg: ChatMessage = {
          id: Date.now().toString(),
          type: 'ai',
          content: `音声認識エラー: ${errorMessage}`,
          timestamp: new Date(),
        };
        setChatMessages(prev => [...prev, errorMsg]);
        
        logComponent('ChatScreen', 'voice_error', { error: errorMessage });
        showErrorAlert(`音声認識エラー: ${errorMessage}`);
      }
    } finally {
      setIsVoiceChatLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
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
          onOpenHistory={modalManagement.openHistoryPanel}
        />

        {/* 音声チャット欄 */}
        <View style={styles.voiceSection}>
          <Text style={styles.voiceSectionTitle}>音声チャット</Text>
          <TouchableOpacity
            style={[
              styles.voiceButton,
              isRecording && styles.voiceButtonRecording,
              (isVoiceChatLoading || isTextChatLoading) && styles.voiceButtonDisabled
            ]}
            onPress={isRecording ? stopRecording : startRecording}
            disabled={isVoiceChatLoading || isTextChatLoading}
          >
            <Text style={[
              styles.voiceButtonText,
              isRecording && styles.voiceButtonTextRecording
            ]}>
              {isVoiceChatLoading ? '音声処理中...' : 
               isRecording ? '⏹️ 録音停止' : '🎤 音声録音'}
            </Text>
          </TouchableOpacity>
          {isRecording && (
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

      {/* UI改善: ユーザープロフィールモーダル */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onOpenHistory={() => {
          setIsProfileModalOpen(false);
          modalManagement.openHistoryPanel();
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
    marginBottom: 15,
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
