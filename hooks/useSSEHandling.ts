import { useRef } from 'react';
import { Alert, Platform } from 'react-native';
import { ChatMessage } from '../types/chat';
import { RecipeCandidate } from '../types/menu';
import { supabase } from '../lib/supabase';

/**
 * SSE処理フック
 * ストリーミング更新、選択要求、確認要求の処理を管理
 * React Native対応版
 */
export function useSSEHandling(
  chatMessages: ChatMessage[],
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>,
  setIsTextChatLoading: React.Dispatch<React.SetStateAction<boolean>>,
  setAwaitingConfirmation: React.Dispatch<React.SetStateAction<boolean>>,
  setConfirmationSessionId: React.Dispatch<React.SetStateAction<string | null>>,
  setAwaitingSelection: React.Dispatch<React.SetStateAction<boolean>>,
  scrollViewRef: React.RefObject<any>,
  getApiUrl: () => string
) {
  const handleRequestMore = (sseSessionId: string) => {
    // 新しいstreamingメッセージを追加（SSEセッションIDはSelectionOptionsから渡される）
    const streamingMessage: ChatMessage = {
      id: `streaming-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'streaming',
      content: '追加提案を取得中...',
      timestamp: new Date(),
      sseSessionId: sseSessionId,
    };
    setChatMessages(prev => [...prev, streamingMessage]);
    
    // スクロールを最下部に移動
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
    
    console.log('[DEBUG] Added streaming message for additional proposal with SSE session:', sseSessionId);
  };

  // Phase 3C-3: 次の段階の提案を要求
  const handleNextStageRequested = async () => {
    // 最後のメッセージからSSEセッションIDを取得
    const lastMessage = chatMessages[chatMessages.length - 1];
    const currentSseSessionId = lastMessage.sseSessionId || 'unknown';
    
    if (currentSseSessionId === 'unknown') {
      console.error('[DEBUG] No SSE session ID found for next stage request');
      Alert.alert('エラー', 'セッション情報が見つかりませんでした');
      return;
    }

    console.log('[DEBUG] Next stage requested, SSE session ID:', currentSseSessionId);
    
    // ユニークID生成（重複を防ぐ）
    const streamingMessageId = `streaming-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // 新しいstreamingメッセージを追加
    const streamingMessage: ChatMessage = {
      id: streamingMessageId,
      type: 'streaming',
      content: '次段階の提案を取得中...',
      timestamp: new Date(),
      sseSessionId: currentSseSessionId,
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
      
      // スペース1つのメッセージで/api/chatを呼び出す（バックエンドが自動的に次の提案を開始）
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentSession.access_token}`,
        },
        body: JSON.stringify({
          message: ' ', // スペース1つ（バックエンドがセッションから次の提案を読み取る）
          sse_session_id: currentSseSessionId,
          confirm: false
        }),
      });

      if (!response.ok) {
        throw new Error(`チャットAPI エラー: ${response.status}`);
      }

      const data = await response.json();
      console.log('[DEBUG] Next stage request sent successfully');
      
      // SSEのStreamingProgressが処理するため、ここでは何もしない
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '不明なエラー';
      console.error('[DEBUG] Next stage request failed:', errorMessage);
      
      // エラー時はストリーミング進捗表示をエラーメッセージに置き換え
      setChatMessages(prev => prev.map((msg) => 
        msg.id === streamingMessageId
          ? { 
              id: msg.id,
              type: 'ai', 
              content: `エラー: ${errorMessage}`,
              timestamp: msg.timestamp
            }
          : msg
      ));
      
      Alert.alert('エラー', `次段階の提案の取得に失敗しました: ${errorMessage}`);
    }
  };

  // StreamingProgressのonCompleteコールバック（最も複雑なロジック）
  const createOnCompleteHandler = (message: ChatMessage, messageIndex: number) => {
    return (result: unknown) => {
      console.log('[DEBUG] StreamingProgress onComplete called:', result);
      
      // resultから確認情報を取得
      const typedResult = result as {
        response: string;
        menu_data?: {
          requires_selection?: boolean;
          candidates?: RecipeCandidate[];
          task_id?: string;
          message?: string;
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
      
      // 選択要求が必要な場合
      if (typedResult?.menu_data?.requires_selection && typedResult?.menu_data?.candidates && typedResult?.menu_data?.task_id) {
        console.log('[DEBUG] Setting awaitingSelection from SSE');
        setAwaitingSelection(true);
        
        // ストリーミング進捗表示をAIレスポンスに置き換え（選択要求フラグ付き）
        setChatMessages(prev => 
          prev.map((msg, idx) => 
            idx === messageIndex
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
            idx === messageIndex
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
            idx === messageIndex
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
    };
  };

  // StreamingProgressのonErrorコールバック
  const createOnErrorHandler = (message: ChatMessage, messageIndex: number) => {
    return (error: string) => {
      // エラー時はエラーメッセージに置き換え
      setChatMessages(prev => prev.map((msg, idx) => 
        idx === messageIndex
          ? { 
              id: msg.id,
              type: 'ai', 
              content: `エラー: ${error}`,
              timestamp: msg.timestamp
            }
          : msg
      ));
    };
  };

  // StreamingProgressのonTimeoutコールバック
  const createOnTimeoutHandler = (message: ChatMessage, messageIndex: number) => {
    return () => {
      // タイムアウト時はタイムアウトメッセージに置き換え
      setChatMessages(prev => prev.map((msg, idx) => 
        idx === messageIndex
          ? { 
              id: msg.id,
              type: 'ai', 
              content: '処理がタイムアウトしました。しばらく時間をおいて再試行してください。',
              timestamp: msg.timestamp
            }
          : msg
      ));
    };
  };

  // StreamingProgressのonProgressコールバック
  const createOnProgressHandler = () => {
    return () => {
      // 進捗更新時に自動スクロールを実行
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    };
  };

  return {
    handleRequestMore,
    handleNextStageRequested,
    createOnCompleteHandler,
    createOnErrorHandler,
    createOnTimeoutHandler,
    createOnProgressHandler,
  };
}

