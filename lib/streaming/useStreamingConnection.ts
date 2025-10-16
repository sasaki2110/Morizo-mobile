/**
 * SSE接続管理のカスタムフック
 * React Native環境向けに調整
 */

import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { supabase } from '../supabase';
import { StreamingMessage, StreamingState, ProgressData, UseStreamingConnectionProps } from './types';

export function useStreamingConnection({
  sseSessionId,
  onComplete,
  onError,
  onTimeout,
  onProgress
}: UseStreamingConnectionProps): StreamingState {
  const [state, setState] = useState<StreamingState>({
    progress: {
      completed_tasks: 0,
      total_tasks: 0,
      progress_percentage: 0,
      current_task: '',
      remaining_tasks: 0,
      is_complete: false
    },
    message: '',
    isConnected: false,
    error: '',
    lastValidResult: null
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const lastValidResultRef = useRef<unknown>(null);
  const isConnectingRef = useRef<boolean>(false);
  const isAbortedRef = useRef<boolean>(false);

  useEffect(() => {
    // Hot Reloadによる重複実行を防ぐ
    if (isConnectingRef.current) {
      console.log('🔍 [useStreamingConnection] Already connecting, skipping');
      return;
    }

    const connectToStream = async () => {
      // 既存の接続をクリーンアップ
      if (abortControllerRef.current) {
        isAbortedRef.current = true;
        abortControllerRef.current.abort();
      }

      isConnectingRef.current = true;
      isAbortedRef.current = false;

      try {
        console.log('🔍 [useStreamingConnection] Getting auth token');
        
        // Supabaseから認証トークンを取得
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          throw new Error('認証トークンが取得できませんでした');
        }
        
        console.log('🔍 [useStreamingConnection] Auth token obtained');

        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        // API URL設定
        const getApiUrl = () => {
          if (Platform.OS === 'web') {
            return 'http://localhost:3000/api';
          } else {
            return 'http://192.168.1.12:3000/api';
          }
        };

        const apiUrl = `${getApiUrl()}/chat-stream/${sseSessionId}`;
        console.log('🔍 [useStreamingConnection] Fetching SSE endpoint:', apiUrl);
        console.log('🔍 [useStreamingConnection] About to call fetch...');
        
        // SSEメッセージ処理（共通ロジック）
        const processSSEMessages = (chunk: string) => {
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const jsonData = line.slice(6).trim();
              
              if (jsonData === '[DONE]') {
                continue;
              }

              try {
                const data: StreamingMessage = JSON.parse(jsonData);
                handleSSEMessage(data);
              } catch (parseError) {
                console.error('メッセージ解析エラー:', parseError);
              }
            }
          }
        };

        // SSEメッセージタイプ別処理（共通ロジック）
        const handleSSEMessage = (data: StreamingMessage) => {
          switch (data.type) {
            case 'connected':
              setState(prev => ({
                ...prev,
                isConnected: true,
                message: data.message || '接続が確立されました'
              }));
              break;

            case 'start':
              setState(prev => ({
                ...prev,
                message: data.message || '処理を開始しました'
              }));
              break;

            case 'progress':
              if (data.progress) {
                setState(prev => ({
                  ...prev,
                  progress: data.progress,
                  message: data.message || ''
                }));
                // 進捗更新時にコールバックを実行
                onProgress?.(data.progress);
              }
              break;

            case 'complete':
              if (data.result) {
                // デバッグログ: 確認情報の存在をチェック
                console.log('[DEBUG] SSE complete event received:', {
                  requires_confirmation: data.result.requires_confirmation,
                  confirmation_session_id: data.result.confirmation_session_id
                });
                
                lastValidResultRef.current = data.result;
                setState(prev => ({
                  ...prev,
                  progress: {
                    ...prev.progress,
                    is_complete: true
                  },
                  lastValidResult: data.result
                }));
              }
              break;

            case 'error':
              setState(prev => ({
                ...prev,
                error: data.error?.message || data.message || 'エラーが発生しました'
              }));
              onError(data.error?.message || data.message || 'エラーが発生しました');
              break;

            case 'timeout':
              setState(prev => ({
                ...prev,
                error: 'タイムアウトが発生しました'
              }));
              onTimeout();
              break;

            case 'close':
              setState(prev => ({
                ...prev,
                isConnected: false,
                message: '接続が閉じられました'
              }));
              break;

            default:
              console.warn(`未知のメッセージタイプ [${data.type}]:`, data);
              break;
          }
        };

        // ストリーミングエラーハンドリング（共通ロジック）
        const handleStreamError = (streamError: unknown) => {
          // Hot Reloadによる中断は無視
          if (!isAbortedRef.current && !(streamError instanceof DOMException && streamError.name === 'AbortError')) {
            console.error('ストリーミング処理エラー:', streamError);
            setState(prev => ({
              ...prev,
              error: streamError instanceof Error ? streamError.message : 'ストリーミング処理でエラーが発生しました'
            }));
            onError(streamError instanceof Error ? streamError.message : 'ストリーミング処理でエラーが発生しました');
          }
        };

        // Web環境用: ReadableStream処理
        const processStreamWithReader = async (reader: ReadableStreamDefaultReader<Uint8Array>) => {
          try {
            while (true) {
              const { done, value } = await reader.read();
              
              if (done) {
                const finalResult = lastValidResultRef.current;
                if (finalResult) {
                  onComplete(finalResult);
                } else {
                  console.warn('ストリーミング終了: 有効なレスポンスが見つかりませんでした');
                  onError('ストリーミングが完了しましたが、有効なレスポンスがありませんでした');
                }
                break;
              }

              const chunk = new TextDecoder().decode(value);
              processSSEMessages(chunk);
            }
          } catch (streamError) {
            handleStreamError(streamError);
          }
        };

        // Native環境用: XMLHttpRequest処理
        const processStreamWithXHR = async (url: string, token: string, abortController: AbortController): Promise<void> => {
          return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            let processedLength = 0;
            let incompleteBuffer = ''; // 不完全な行を保持するバッファ

            // AbortControllerとの統合
            const abortHandler = () => {
              xhr.abort();
            };
            abortController.signal.addEventListener('abort', abortHandler);

            xhr.open('GET', url, true);
            xhr.setRequestHeader('Authorization', `Bearer ${token}`);
            xhr.setRequestHeader('Accept', 'text/event-stream');
            xhr.setRequestHeader('Cache-Control', 'no-cache');
            xhr.timeout = 30000; // 30秒タイムアウト

            xhr.onprogress = () => {
              try {
                const newData = xhr.responseText.substring(processedLength);
                processedLength = xhr.responseText.length;
                
                if (newData) {
                  // バッファに追加
                  const fullData = incompleteBuffer + newData;
                  
                  // 改行で分割
                  const lines = fullData.split('\n');
                  
                  // 最後の要素が不完全な可能性があるため保持
                  incompleteBuffer = lines.pop() || '';
                  
                  // 完全な行のみを処理
                  const completeData = lines.join('\n');
                  if (completeData) {
                    processSSEMessages(completeData + '\n');
                  }
                }
              } catch (error) {
                console.error('XHR progress処理エラー:', error);
              }
            };

            xhr.onload = () => {
              abortController.signal.removeEventListener('abort', abortHandler);
              
              // 最後に残った不完全なバッファを処理
              if (incompleteBuffer) {
                try {
                  processSSEMessages(incompleteBuffer);
                } catch (error) {
                  console.error('バッファ処理エラー:', error);
                }
              }
              
              if (xhr.status >= 200 && xhr.status < 300) {
                const finalResult = lastValidResultRef.current;
                if (finalResult) {
                  onComplete(finalResult);
                } else {
                  console.warn('XHRストリーミング終了: 有効なレスポンスが見つかりませんでした');
                  onError('ストリーミングが完了しましたが、有効なレスポンスがありませんでした');
                }
                resolve();
              } else {
                reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
              }
            };

            xhr.onerror = () => {
              abortController.signal.removeEventListener('abort', abortHandler);
              reject(new Error('ネットワークエラーが発生しました'));
            };

            xhr.ontimeout = () => {
              abortController.signal.removeEventListener('abort', abortHandler);
              reject(new Error('タイムアウトが発生しました'));
            };

            xhr.onabort = () => {
              abortController.signal.removeEventListener('abort', abortHandler);
              resolve(); // 中断は正常終了として扱う
            };

            xhr.send();
          });
        };

        // Platform判定でSSE実装を切り替え
        if (Platform.OS === 'web') {
          // Web環境: fetch + ReadableStream実装
          const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Accept': 'text/event-stream',
              'Cache-Control': 'no-cache',
            },
            signal: abortController.signal,
          });
          
          console.log('🔍 [useStreamingConnection] Fetch completed!');
          console.log('🔍 [useStreamingConnection] SSE response status:', response.status);
          console.log('🔍 [useStreamingConnection] SSE response ok:', response.ok);

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const reader = response.body?.getReader();
          if (!reader) {
            throw new Error('ストリームリーダーが取得できませんでした');
          }

          await processStreamWithReader(reader);
        } else {
          // Native環境（Android/iOS）: XMLHttpRequest実装
          await processStreamWithXHR(apiUrl, session.access_token, abortController);
        }


      } catch (error) {
        console.log('🔍 [useStreamingConnection] Error caught:', error);
        // Hot Reloadによる中断は無視
        if (!isAbortedRef.current && !(error instanceof DOMException && error.name === 'AbortError')) {
          console.error('ストリーミング接続エラー:', error);
          setState(prev => ({
            ...prev,
            error: error instanceof Error ? error.message : '接続エラーが発生しました'
          }));
          onError(error instanceof Error ? error.message : '接続エラーが発生しました');
        } else {
          console.log('🔍 [useStreamingConnection] AbortError ignored (likely Hot Reload)');
        }
      } finally {
        console.log('🔍 [useStreamingConnection] Finally block executed');
        isConnectingRef.current = false;
      }
    };

    connectToStream();

    // クリーンアップ関数
    return () => {
      if (abortControllerRef.current) {
        isAbortedRef.current = true;
        abortControllerRef.current.abort();
      }
    };
  }, [sseSessionId, onComplete, onError, onTimeout]);

  return state;
}
