import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';

interface VoiceSectionProps {
  isRecording: boolean;
  isVoiceChatLoading: boolean;
  isTextChatLoading: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
}

export function VoiceSection({
  isRecording,
  isVoiceChatLoading,
  isTextChatLoading,
  onStartRecording,
  onStopRecording,
}: VoiceSectionProps) {
  return (
    <View style={styles.voiceSection}>
      <Text style={styles.voiceSectionTitle}>音声チャット</Text>
      <TouchableOpacity
        style={[
          styles.voiceButton,
          isRecording && styles.voiceButtonRecording,
          (isVoiceChatLoading || isTextChatLoading) && styles.voiceButtonDisabled
        ]}
        onPress={isRecording ? onStopRecording : onStartRecording}
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
  );
}

const styles = StyleSheet.create({
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

