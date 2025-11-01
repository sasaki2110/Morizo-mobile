import { useState } from 'react';
import { Platform } from 'react-native';
import { ChatMessage } from '../types/chat';
import { supabase } from '../lib/supabase';
import { generateSSESessionId } from '../lib/session-manager';
import { logAPI, logComponent } from '../lib/logging';
import { showErrorAlert } from '../utils/alert';

/**
 * チャットメッセージ管理フック
 * メッセージ送信、履歴管理、SSEセッション管理、確認要求の状態を管理
 */
export function useChatMessages(
  chatMessages: ChatMessage[],
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>,
  setIsTextChatLoading: React.Dispatch<React.SetStateAction<boolean>>,
  scrollViewRef: React.RefObject<any>
) {
  const [textMessage, setTextMessage] = useState<string>('');
  const [awaitingConfirmation, setAwaitingConfirmation] = useState<boolean>(false);
  const [confirmationSessionId, setConfirmationSessionId] = useState<string | null>(null);

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
      setChatMessages(prev => prev.map((msg) => 
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

  const clearChatHistory = (
    setAwaitingSelection: React.Dispatch<React.SetStateAction<boolean>>,
    clearSelectedRecipes: () => void
  ) => {
    setChatMessages([]);
    setAwaitingConfirmation(false);
    setConfirmationSessionId(null);
    setAwaitingSelection(false);
    // 選択済みレシピもクリア
    clearSelectedRecipes();
  };

  return {
    textMessage,
    setTextMessage,
    awaitingConfirmation,
    setAwaitingConfirmation,
    confirmationSessionId,
    setConfirmationSessionId,
    sendTextMessage,
    clearChatHistory,
    getApiUrl,
  };
}

