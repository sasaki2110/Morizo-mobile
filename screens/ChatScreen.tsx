/**
 * Morizo Mobile - チャット画面
 * 
 * Phase 5: ストリーミング対応チャット機能実装
 * Web版を参考にしたモバイル版チャット画面（SSE + レシピ表示対応）
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  KeyboardAvoidingView,
  SafeAreaView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Audio } from 'expo-av';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { showErrorAlert, showSuccessAlert } from '../utils/alert';
import { logAPI, logComponent, LogCategory } from '../lib/logging';
import { generateSSESessionId } from '../lib/session-manager';
import { isMenuResponse, parseMenuResponseUnified } from '../lib/menu-parser';
import StreamingProgress from '../components/streaming/StreamingProgress';
import RecipeViewerScreen from './RecipeViewerScreen';
import SelectionOptions from '../components/SelectionOptions';
import { RecipeCandidate } from '../types/menu';
import { ChatMessage } from '../types/chat';

export default function ChatScreen() {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [textMessage, setTextMessage] = useState<string>('');
  const [isTextChatLoading, setIsTextChatLoading] = useState(false);
  const [isVoiceChatLoading, setIsVoiceChatLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState<boolean>(false);
  const [confirmationSessionId, setConfirmationSessionId] = useState<string | null>(null);
  const [awaitingSelection, setAwaitingSelection] = useState<boolean>(false);
  const [showRecipeViewer, setShowRecipeViewer] = useState(false);
  const [recipeViewerData, setRecipeViewerData] = useState<{ response: string; result?: unknown } | null>(null);
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

  // API URL設定
  const getApiUrl = () => {
    if (Platform.OS === 'web') {
      // Web版（Webエミュレーター）
      return 'http://localhost:3000/api';
    } else {
      // Expo Go版（実機）
      return 'http://192.168.1.12:3000/api';
    }
  };

  // テキストメッセージ送信（ストリーミング対応）
  const sendTextMessage = async () => {
    if (!textMessage.trim()) return;

    setIsTextChatLoading(true);
    
    // デバッグログ: 状態を確認
    console.log('[DEBUG] awaitingConfirmation:', awaitingConfirmation);
    console.log('[DEBUG] confirmationSessionId:', confirmationSessionId);
    
    // ユーザーメッセージを追加
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: textMessage,
      timestamp: new Date(),
    };
    setChatMessages(prev => [...prev, userMessage]);
    
    const currentMessage = textMessage;
    setTextMessage(''); // 入力フィールドをクリア
    
    // SSEセッションIDの決定と送信時の確認応答フラグを記録
    let sseSessionId: string;
    const isConfirmationRequest = awaitingConfirmation && !!confirmationSessionId;

    if (isConfirmationRequest) {
      // 曖昧性確認中の場合は既存のセッションIDを使用
      sseSessionId = confirmationSessionId;
      console.log('[DEBUG] Using existing session ID:', sseSessionId);
    } else {
      // 新規リクエストの場合は新しいセッションIDを生成
      sseSessionId = generateSSESessionId();
      console.log('[DEBUG] Generated new session ID:', sseSessionId);
    }
    
    console.log('[DEBUG] Sending request with:', {
      message: currentMessage,
      sse_session_id: sseSessionId,
      confirm: isConfirmationRequest,
      awaitingConfirmation: awaitingConfirmation,
      confirmationSessionId: confirmationSessionId
    });
    
    // ストリーミング進捗表示を追加
    const streamingMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      type: 'streaming',
      content: '',
      timestamp: new Date(),
      sseSessionId: sseSessionId,
    };
    setChatMessages(prev => [...prev, streamingMessage]);
    
    // スクロールを最下部に移動
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
    
    try {
      const apiUrl = `${getApiUrl()}/chat`;
      
      // 認証トークンを取得
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      if (!currentSession?.access_token) {
        throw new Error('認証トークンが取得できません');
      }

      logAPI('POST', apiUrl, 0, { message: currentMessage, action: 'テキストチャット送信開始' });

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentSession.access_token}`,
        },
        body: JSON.stringify({ 
          message: currentMessage,
          sse_session_id: sseSessionId,
          confirm: isConfirmationRequest
        }),
      });

      if (!response.ok) {
        throw new Error(`チャットAPI エラー: ${response.status}`);
      }

      const data = await response.json();
      
      console.log('[DEBUG] HTTP Response received (for reference only):', {
        success: data.success,
        has_response: !!data.response
      });
      
      // 確認応答を送信した場合のみ、状態をリセット
      if (isConfirmationRequest && data.success && !data.requires_confirmation) {
        console.log('[DEBUG] Confirmation response completed, resetting confirmation state');
        setAwaitingConfirmation(false);
        setConfirmationSessionId(null);
      }
      
      logAPI('POST', apiUrl, response.status, { action: 'テキストチャット送信成功' });
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '不明なエラー';
      
      // エラー時はストリーミング進捗表示をエラーメッセージに置き換え
      setChatMessages(prev => prev.map((msg, index) => 
        msg.type === 'streaming' && msg.sseSessionId === sseSessionId
          ? { 
              id: msg.id,
              type: 'ai', 
              content: `エラー: ${errorMessage}`,
              timestamp: msg.timestamp
            }
          : msg
      ));
      
      // エラー時は確認状態をリセット
      setAwaitingConfirmation(false);
      setConfirmationSessionId(null);
      
      logAPI('POST', `${getApiUrl()}/chat`, 500, { action: `テキストチャット送信エラー: ${errorMessage}` });
      showErrorAlert(`チャット送信に失敗しました: ${errorMessage}`);
    } finally {
      setIsTextChatLoading(false);
    }
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
      const apiUrl = `${getApiUrl()}/chat`;
      
      // 認証トークンを取得
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      if (!currentSession?.access_token) {
        throw new Error('認証トークンが取得できません');
      }

      logAPI('POST', apiUrl, 0, { message: text, action: '音声チャット送信開始' });

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
      
      logAPI('POST', apiUrl, response.status, { action: '音声チャット送信成功' });
      
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
      
      logAPI('POST', `${getApiUrl()}/chat`, 500, { action: `音声チャット送信エラー: ${errorMessage}` });
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

      const apiUrl = `${getApiUrl()}/whisper`;
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

      // Whisper API呼び出しログ
      logAPI('POST', apiUrl, 0, { action: 'Whisper API呼び出し開始', audioUri });

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

      // Whisper APIレスポンスログ
      logAPI('POST', apiUrl, response!.status, { action: 'Whisper APIレスポンス受信' });

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
        handleVoiceError(errorMessage);
      }
    } finally {
      setIsVoiceChatLoading(false);
    }
  };

  // 音声認識エラー時の処理
  const handleVoiceError = (error: string) => {
    const errorMsg: ChatMessage = {
      id: Date.now().toString(),
      type: 'ai',
      content: `音声認識エラー: ${error}`,
      timestamp: new Date(),
    };
    setChatMessages(prev => [...prev, errorMsg]);
    
    logComponent('ChatScreen', 'voice_error', { error });
    showErrorAlert(`音声認識エラー: ${error}`);
  };

  // レシピビューアーを開く
  const openRecipeViewer = (response: string, result?: unknown) => {
    setRecipeViewerData({ response, result });
    setShowRecipeViewer(true);
  };

  // レシピビューアーを閉じる
  const closeRecipeViewer = () => {
    setShowRecipeViewer(false);
    setRecipeViewerData(null);
  };

  // レシピ選択処理
  const handleSelection = (selection: number, selectionResult?: any) => {
    setAwaitingSelection(false);
    
    // 選択結果メッセージを追加
    setChatMessages(prev => [...prev, {
      id: Date.now().toString(),
      type: 'user',
      content: `${selection}番を選択しました`,
      timestamp: new Date(),
    }]);
  };

  // ログアウト処理
  const handleSignOut = async () => {
    try {
      logComponent('ChatScreen', 'signout_button_clicked');
      await signOut();
      logComponent('ChatScreen', 'signout_completed');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '不明なエラー';
      logComponent('ChatScreen', 'signout_error', { error: errorMessage });
      showErrorAlert('ログアウトに失敗しました');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* ユーザープロフィールセクション */}
        <View style={styles.profileSection}>
          <View style={styles.profileContainer}>
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
            <Text style={styles.welcomeText}>ようこそMorizoへ</Text>
            <Text style={styles.emailText}>{user?.email}</Text>
            <TouchableOpacity
              style={styles.signOutButton}
              onPress={handleSignOut}
            >
              <Text style={styles.signOutButtonText}>ログアウト</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* チャット履歴エリア */}
        <View style={styles.chatHistoryContainer}>
          <Text style={styles.chatHistoryTitle}>チャット履歴</Text>
          <ScrollView
            ref={scrollViewRef}
            style={styles.chatScrollView}
            contentContainerStyle={styles.chatScrollContent}
            showsVerticalScrollIndicator={true}
          >
            {chatMessages.length === 0 ? (
              <View style={styles.emptyChatContainer}>
                <Text style={styles.emptyChatText}>
                  Morizo AIとチャットを開始しましょう！
                </Text>
              </View>
            ) : (
              chatMessages.map((message, index) => (
                <View key={message.id}>
                  {/* ユーザーメッセージ */}
                  {message.type === 'user' && (
                    <View style={[styles.messageContainer, styles.userMessage]}>
                      <View style={styles.messageHeader}>
                        <Text style={styles.messageSender}>あなた</Text>
                        <Text style={styles.messageTime}>
                          {message.timestamp.toLocaleTimeString()}
                        </Text>
                      </View>
                      <Text style={styles.messageContent}>{message.content}</Text>
                    </View>
                  )}
                  
                  {/* AIメッセージ */}
                  {message.type === 'ai' && (
                    <View style={[styles.messageContainer, styles.aiMessage]}>
                      <View style={styles.messageHeader}>
                        <Text style={styles.messageSender}>Morizo AI</Text>
                        <Text style={styles.messageTime}>
                          {message.timestamp.toLocaleTimeString()}
                        </Text>
                      </View>
                      <Text style={styles.messageContent}>{message.content}</Text>
                      
                      {/* 選択UI表示（優先） */}
                      {message.requiresSelection && message.candidates && message.taskId && (
                        <View style={styles.selectionContainer}>
                          <SelectionOptions
                            candidates={message.candidates}
                            onSelect={handleSelection}
                            taskId={message.taskId}
                            sseSessionId={message.sseSessionId || 'unknown'}
                            isLoading={isTextChatLoading}
                          />
                        </View>
                      )}
                      
                      {/* レシピレスポンスの場合はレシピ表示ボタンを追加（選択要求がない場合のみ） */}
                      {!message.requiresSelection && (message.result?.menu_data || isMenuResponse(message.content)) && (
                        <TouchableOpacity
                          style={styles.recipeButton}
                          onPress={() => openRecipeViewer(message.content, message.result)}
                        >
                          <Text style={styles.recipeButtonText}>🍽️ レシピを表示</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                  
                  {/* ストリーミング進捗表示 */}
                  {message.type === 'streaming' && message.sseSessionId && (
                    <View style={styles.streamingContainer}>
                      <StreamingProgress
                        sseSessionId={message.sseSessionId}
                        onComplete={(result) => {
                          console.log('[DEBUG] StreamingProgress onComplete called:', result);
                          
                          // resultから確認情報を取得
                          const typedResult = result as {
                            response: string;
                            menu_data?: {
                              requires_selection?: boolean;
                              candidates?: RecipeCandidate[];
                              task_id?: string;
                              current_stage?: 'main' | 'sub' | 'soup';
                              used_ingredients?: string[];
                              menu_category?: 'japanese' | 'western' | 'chinese';
                            };
                            requires_confirmation?: boolean;
                            confirmation_session_id?: string;
                          } | undefined;
                          
                          console.log('[DEBUG] Checking requires_confirmation:', typedResult?.requires_confirmation);
                          console.log('[DEBUG] Checking confirmation_session_id:', typedResult?.confirmation_session_id);
                          console.log('[DEBUG] Checking menu_data:', typedResult?.menu_data);
                          console.log('[DEBUG] Checking requires_selection:', typedResult?.menu_data?.requires_selection);
                          console.log('[DEBUG] Checking candidates:', typedResult?.menu_data?.candidates);
                          console.log('[DEBUG] Checking task_id:', typedResult?.menu_data?.task_id);
                          
                          // 選択要求が必要な場合
                          if (typedResult?.menu_data?.requires_selection && typedResult?.menu_data?.candidates && typedResult?.menu_data?.task_id) {
                            console.log('[DEBUG] Setting awaitingSelection from SSE');
                            setAwaitingSelection(true);
                            
                            // ストリーミング進捗表示をAIレスポンスに置き換え（選択要求フラグ付き）
                            setChatMessages(prev => 
                              prev.map((msg, idx) => 
                                idx === index
                                  ? { 
                                      id: msg.id,
                                      type: 'ai', 
                                      content: typedResult.response, 
                                      timestamp: msg.timestamp,
                                      result: typedResult,
                                      requiresSelection: true,
                                      candidates: typedResult.menu_data?.candidates,
                                      taskId: typedResult.menu_data?.task_id,
                                      sseSessionId: msg.sseSessionId,
                                      currentStage: typedResult.menu_data?.current_stage,
                                      usedIngredients: typedResult.menu_data?.used_ingredients,
                                      menuCategory: typedResult.menu_data?.menu_category
                                    }
                                  : msg
                              )
                            );
                            
                            // 選択要求時はローディング状態を終了
                            setIsTextChatLoading(false);
                          } else if (typedResult?.requires_confirmation && typedResult?.confirmation_session_id) {
                            // 曖昧性確認が必要な場合
                            console.log('[DEBUG] Setting awaitingConfirmation from SSE');
                            setAwaitingConfirmation(true);
                            setConfirmationSessionId(typedResult.confirmation_session_id);
                            
                            // ストリーミング進捗表示をAIレスポンスに置き換え（曖昧性確認フラグ付き）
                            setChatMessages(prev => 
                              prev.map((msg, idx) => 
                                idx === index
                                  ? { 
                                      id: msg.id,
                                      type: 'ai', 
                                      content: typedResult.response, 
                                      timestamp: msg.timestamp,
                                      result: typedResult,
                                      requiresConfirmation: true 
                                    }
                                  : msg
                              )
                            );
                            
                            // 曖昧性確認時はローディング状態を維持（ユーザー入力を受け付ける）
                            setIsTextChatLoading(false);
                          } else {
                            // 通常の完了処理
                            setChatMessages(prev => 
                              prev.map((msg, idx) => 
                                idx === index
                                  ? { 
                                      id: msg.id,
                                      type: 'ai', 
                                      content: typedResult?.response || '処理が完了しました', 
                                      timestamp: msg.timestamp,
                                      result: typedResult 
                                    }
                                  : msg
                              )
                            );
                            
                            // 通常の完了時のみローディング終了
                            setIsTextChatLoading(false);
                          }
                        }}
                        onError={(error) => {
                          // エラー時はエラーメッセージに置き換え
                          setChatMessages(prev => prev.map((msg, idx) => 
                            idx === index
                              ? { 
                                  id: msg.id,
                                  type: 'ai', 
                                  content: `エラー: ${error}`,
                                  timestamp: msg.timestamp
                                }
                              : msg
                          ));
                        }}
                        onTimeout={() => {
                          // タイムアウト時はタイムアウトメッセージに置き換え
                          setChatMessages(prev => prev.map((msg, idx) => 
                            idx === index
                              ? { 
                                  id: msg.id,
                                  type: 'ai', 
                                  content: '処理がタイムアウトしました。しばらく時間をおいて再試行してください。',
                                  timestamp: msg.timestamp
                                }
                              : msg
                          ));
                        }}
                        onProgress={() => {
                          // 進捗更新時に自動スクロールを実行
                          setTimeout(() => {
                            scrollViewRef.current?.scrollToEnd({ animated: true });
                          }, 100);
                        }}
                      />
                    </View>
                  )}
                </View>
              ))
            )}
          </ScrollView>
        </View>

        {/* テキストチャット入力欄 */}
        <View style={styles.textInputContainer}>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.textInput}
              value={textMessage}
              onChangeText={setTextMessage}
              placeholder="メッセージを入力してください..."
              placeholderTextColor="#999"
              multiline
              maxLength={1000}
              editable={!isTextChatLoading && !isVoiceChatLoading && !awaitingSelection}
            />
            <TouchableOpacity
              style={styles.sendButton}
              onPress={sendTextMessage}
              disabled={isTextChatLoading || !textMessage.trim() || awaitingSelection}
            >
              <Text style={styles.sendButtonText}>
                {isTextChatLoading ? '送信中...' : awaitingSelection ? '選択中...' : '送信'}
              </Text>
            </TouchableOpacity>
          </View>
          
          {(isTextChatLoading || isVoiceChatLoading) && (
            <Text style={styles.loadingText}>
              Morizo AIが応答を生成中...
            </Text>
          )}
        </View>

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
        visible={showRecipeViewer && !!recipeViewerData}
        response={recipeViewerData?.response || ''}
        result={recipeViewerData?.result}
        onClose={closeRecipeViewer}
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
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  profileContainer: {
    alignItems: 'center',
  },
  avatarContainer: {
    width: 60,
    height: 60,
    backgroundColor: '#e3f2fd',
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1976d2',
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  emailText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  signOutButton: {
    backgroundColor: '#f44336',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  signOutButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  chatHistoryContainer: {
    flex: 1,
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginVertical: 10,
    borderRadius: 10,
    padding: 15,
  },
  chatHistoryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  chatScrollView: {
    flex: 1,
  },
  chatScrollContent: {
    paddingBottom: 10,
  },
  emptyChatContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyChatText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  messageContainer: {
    marginBottom: 15,
    padding: 12,
    borderRadius: 10,
    maxWidth: '85%',
  },
  userMessage: {
    backgroundColor: '#e3f2fd',
    alignSelf: 'flex-end',
    marginLeft: '15%',
  },
  aiMessage: {
    backgroundColor: '#f5f5f5',
    alignSelf: 'flex-start',
    marginRight: '15%',
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  messageSender: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
  },
  messageTime: {
    fontSize: 10,
    color: '#999',
  },
  messageContent: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  textInputContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginBottom: 10,
    borderRadius: 10,
    padding: 15,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#1976d2',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  loadingText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
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
  // ストリーミング関連のスタイル
  streamingContainer: {
    marginVertical: 8,
  },
  // レシピボタンのスタイル
  recipeButton: {
    backgroundColor: '#1976d2',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 8,
    alignItems: 'center',
  },
  recipeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  selectionContainer: {
    marginVertical: 8,
  },
});
