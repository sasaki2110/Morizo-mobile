/**
 * Morizo Mobile - チャット画面
 * 
 * Phase 4: チャット機能実装
 * Web版を参考にしたモバイル版チャット画面
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
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { showErrorAlert, showSuccessAlert } from '../utils/alert';
import { logAPI, logComponent, LogCategory } from '../lib/logging';

interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

export default function ChatScreen() {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [textMessage, setTextMessage] = useState<string>('');
  const [isTextChatLoading, setIsTextChatLoading] = useState(false);
  const [isVoiceChatLoading, setIsVoiceChatLoading] = useState(false);
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

  // テキストメッセージ送信
  const sendTextMessage = async () => {
    if (!textMessage.trim()) return;

    setIsTextChatLoading(true);
    
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

      logAPI('sendTextMessage', 'POST', apiUrl, { message: currentMessage }, 0, 'テキストチャット送信開始');

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentSession.access_token}`,
        },
        body: JSON.stringify({ message: currentMessage }),
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
      
      logAPI('sendTextMessage', 'POST', apiUrl, {}, response.status, 'テキストチャット送信成功');
      
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
      
      logAPI('sendTextMessage', 'POST', `${getApiUrl()}/chat`, {}, 500, `テキストチャット送信エラー: ${errorMessage}`);
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

      logAPI('handleVoiceTranscription', 'POST', apiUrl, { message: text }, 0, '音声チャット送信開始');

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
      
      logAPI('handleVoiceTranscription', 'POST', apiUrl, {}, response.status, '音声チャット送信成功');
      
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
      
      logAPI('handleVoiceTranscription', 'POST', `${getApiUrl()}/chat`, {}, 500, `音声チャット送信エラー: ${errorMessage}`);
      showErrorAlert(`音声チャット送信に失敗しました: ${errorMessage}`);
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

  // ログアウト処理
  const handleSignOut = async () => {
    try {
      logComponent('ChatScreen', 'signout_button_clicked');
      await signOut();
      logComponent('ChatScreen', 'signout_completed');
    } catch (error) {
      logComponent('ChatScreen', 'signout_error', { error: error.message });
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
              chatMessages.map((message) => (
                <View
                  key={message.id}
                  style={[
                    styles.messageContainer,
                    message.type === 'user' ? styles.userMessage : styles.aiMessage,
                  ]}
                >
                  <View style={styles.messageHeader}>
                    <Text style={styles.messageSender}>
                      {message.type === 'user' ? 'あなた' : 'Morizo AI'}
                    </Text>
                    <Text style={styles.messageTime}>
                      {message.timestamp.toLocaleTimeString()}
                    </Text>
                  </View>
                  <Text style={styles.messageContent}>
                    {message.content}
                  </Text>
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
              editable={!isTextChatLoading && !isVoiceChatLoading}
            />
            <TouchableOpacity
              style={styles.sendButton}
              onPress={sendTextMessage}
              disabled={isTextChatLoading || !textMessage.trim()}
            >
              <Text style={styles.sendButtonText}>
                {isTextChatLoading ? '送信中...' : '送信'}
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
            style={styles.voiceButton}
            onPress={() => {
              // TODO: 音声録音機能を実装
              showErrorAlert('音声録音機能は準備中です');
            }}
            disabled={isVoiceChatLoading}
          >
            <Text style={styles.voiceButtonText}>
              {isVoiceChatLoading ? '音声処理中...' : '🎤 音声録音'}
            </Text>
          </TouchableOpacity>
        </View>

        <StatusBar style="auto" />
      </KeyboardAvoidingView>
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
});
