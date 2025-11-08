import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface ChatInputProps {
  textMessage: string;
  setTextMessage: React.Dispatch<React.SetStateAction<string>>;
  onSend: () => void;
  isTextChatLoading: boolean;
  awaitingSelection: boolean;
  currentStage?: 'main' | 'sub' | 'soup';
  isVoiceChatLoading?: boolean;
  isRecording?: boolean;
  onStartRecording?: () => void;
  onStopRecording?: () => void;
}

const ChatInput: React.FC<ChatInputProps> = ({
  textMessage,
  setTextMessage,
  onSend,
  isTextChatLoading,
  awaitingSelection,
  currentStage,
  isVoiceChatLoading = false,
  isRecording = false,
  onStartRecording,
  onStopRecording,
}) => {
  // ステージに応じたメッセージを取得
  const getSelectionMessage = (): string => {
    if (!currentStage) {
      return '主菜を選択してください...';
    }
    switch (currentStage) {
      case 'main':
        return '主菜を選択してください...';
      case 'sub':
        return '副菜を選択してください...';
      case 'soup':
        return '汁物を選択してください...';
      default:
        return '選択してください...';
    }
  };

  return (
    <View style={styles.container}>
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
          style={[
            styles.sendButton,
            (isTextChatLoading || !textMessage.trim() || awaitingSelection) && styles.sendButtonDisabled
          ]}
          onPress={onSend}
          disabled={isTextChatLoading || !textMessage.trim() || awaitingSelection}
        >
          <Text style={styles.sendButtonText}>
            {isTextChatLoading ? '送信中...' : awaitingSelection ? '選択中...' : '送信'}
          </Text>
        </TouchableOpacity>
        {onStartRecording && onStopRecording && (
          <TouchableOpacity
            style={[
              styles.micButton,
              isRecording && styles.micButtonRecording,
              (isVoiceChatLoading || isTextChatLoading) && styles.micButtonDisabled
            ]}
            onPress={isRecording ? onStopRecording : onStartRecording}
            disabled={isVoiceChatLoading || isTextChatLoading}
          >
            <MaterialIcons
              name={isRecording ? 'stop' : 'mic'}
              size={24}
              color={isRecording ? '#fff' : (isVoiceChatLoading || isTextChatLoading ? '#999' : '#fff')}
            />
          </TouchableOpacity>
        )}
      </View>
      
      {isRecording && (
        <Text style={styles.recordingStatusText}>
          ● 録音中... タップして停止
        </Text>
      )}
      
      {(isTextChatLoading || isVoiceChatLoading) && (
        <Text style={styles.statusText}>
          Morizo AIが応答を生成中...
        </Text>
      )}
      
      {awaitingSelection && (
        <Text style={styles.statusText}>
          {getSelectionMessage()}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
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
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  micButton: {
    backgroundColor: '#4caf50',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  micButtonRecording: {
    backgroundColor: '#f44336',
  },
  micButtonDisabled: {
    backgroundColor: '#ccc',
  },
  statusText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
  },
  recordingStatusText: {
    fontSize: 12,
    color: '#f44336',
    textAlign: 'center',
    marginTop: 10,
    fontWeight: 'bold',
  },
});

export default ChatInput;

