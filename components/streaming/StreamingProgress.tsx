/**
 * ストリーミング進捗表示コンポーネント
 * React Native環境向けに調整
 */

import React from 'react';
import { StreamingProgressProps } from '../../lib/streaming/types';
import { useStreamingConnection } from '../../lib/streaming/useStreamingConnection';
import { ProgressDisplay } from './ProgressDisplay';

export default function StreamingProgress({
  sseSessionId,
  onComplete,
  onError,
  onTimeout,
  onProgress
}: StreamingProgressProps) {
  const state = useStreamingConnection({
    sseSessionId,
    onComplete,
    onError,
    onTimeout,
    onProgress
  });

  return (
    <ProgressDisplay
      progress={state.progress}
      message={state.message}
      isConnected={state.isConnected}
      error={state.error}
    />
  );
}
