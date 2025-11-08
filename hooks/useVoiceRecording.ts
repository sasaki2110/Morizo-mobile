import { useState } from 'react';
import { ScrollView } from 'react-native';
import { Audio } from 'expo-av';
import { supabase } from '../lib/supabase';
import { showErrorAlert } from '../utils/alert';
import { logComponent } from '../lib/logging';
import { ChatMessage } from '../types/chat';
import { generateSSESessionId } from '../lib/session-manager';
import { normalizeSpeechText } from '../lib/utils/speech-normalizer';

/**
 * 音声録音機能を管理するカスタムフック
 * 
 * 音声録音、Whisper APIでの音声認識、チャット送信を統合的に管理
 */
export function useVoiceRecording(
  chatMessages: ChatMessage[],
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>,
  isVoiceChatLoading: boolean,
  setIsVoiceChatLoading: React.Dispatch<React.SetStateAction<boolean>>,
  scrollViewRef: React.RefObject<ScrollView>,
  chatMessagesHook: ReturnType<typeof useChatMessages>,
  getApiUrl: () => string
) {
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);

  // 音声認識完了時の処理
  const handleVoiceTranscription = async (text: string) => {
    setIsVoiceChatLoading(true);
    
    // 音声認識結果を正規化（ひらがな→漢字など）
    const normalizedText = normalizeSpeechText(text);
    
    // 正規化が行われた場合にログを出力
    if (normalizedText !== text) {
      console.log('[DEBUG] Voice: Text normalization applied', { 
        original: text, 
        normalized: normalizedText 
      });
      logComponent('ChatScreen', 'voice_text_normalized', {
        original: text,
        normalized: normalizedText
      });
    }
    
    // ユーザーメッセージを追加（正規化後のテキストを表示）
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: normalizedText,
      timestamp: new Date(),
    };
    setChatMessages(prev => [...prev, userMessage]);
    
    // スクロールを最下部に移動
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
    
    // SSEセッションIDの決定と送信時の確認応答フラグを記録
    // テキスト入力と同じロジックを使用
    let sseSessionId: string;
    const isConfirmationRequest = chatMessagesHook.awaitingConfirmation && !!chatMessagesHook.confirmationSessionId;

    if (isConfirmationRequest) {
      // 曖昧性確認中の場合は既存のセッションIDを使用
      sseSessionId = chatMessagesHook.confirmationSessionId!;
      console.log('[DEBUG] Voice: Using existing session ID:', sseSessionId);
    } else {
      // 新規リクエストの場合は新しいセッションIDを生成
      sseSessionId = generateSSESessionId();
      console.log('[DEBUG] Voice: Generated new session ID:', sseSessionId);
    }
    
    console.log('[DEBUG] Voice: Sending request with:', {
      message: normalizedText,
      original_message: text,
      sse_session_id: sseSessionId,
      confirm: isConfirmationRequest,
      awaitingConfirmation: chatMessagesHook.awaitingConfirmation,
      confirmationSessionId: chatMessagesHook.confirmationSessionId
    });
    
    // ストリーミング進捗表示を追加（テキスト入力と同じ処理）
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

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentSession.access_token}`,
        },
        body: JSON.stringify({ 
          message: normalizedText,  // 正規化後のテキストを送信
          sse_session_id: sseSessionId,
          confirm: isConfirmationRequest
        }),
      });

      if (!response.ok) {
        throw new Error(`チャットAPI エラー: ${response.status}`);
      }

      const data = await response.json();
      
      console.log('[DEBUG] Voice: HTTP Response received (for reference only):', {
        success: data.success,
        has_response: !!data.response
      });
      
      // 確認応答を送信した場合のみ、状態をリセット
      if (isConfirmationRequest && data.success && !data.requires_confirmation) {
        console.log('[DEBUG] Voice: Confirmation response completed, resetting confirmation state');
        chatMessagesHook.setAwaitingConfirmation(false);
        chatMessagesHook.setConfirmationSessionId(null);
      }
      
      // StreamingProgressがSSE接続を処理するため、ここではHTTPレスポンスの処理は不要
      // SSEのcompleteイベントでonCompleteハンドラが呼ばれ、選択欄が表示される
      
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
      chatMessagesHook.setAwaitingConfirmation(false);
      chatMessagesHook.setConfirmationSessionId(null);
      
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

  return {
    isRecording,
    startRecording,
    stopRecording,
  };
}

