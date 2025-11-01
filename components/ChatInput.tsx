import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';

interface ChatInputProps {
  textMessage: string;
  setTextMessage: React.Dispatch<React.SetStateAction<string>>;
  onSend: () => void;
  isTextChatLoading: boolean;
  awaitingSelection: boolean;
  isVoiceChatLoading?: boolean;
  onOpenHistory: () => void;
}

const ChatInput: React.FC<ChatInputProps> = ({
  textMessage,
  setTextMessage,
  onSend,
  isTextChatLoading,
  awaitingSelection,
  isVoiceChatLoading = false,
  onOpenHistory,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Morizo AI テキストチャット</Text>
        <TouchableOpacity
          onPress={onOpenHistory}
          style={styles.historyButton}
        >
          <Text style={styles.historyButtonText}>📅 履歴</Text>
        </TouchableOpacity>
      </View>
      
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
      </View>
      
      {(isTextChatLoading || isVoiceChatLoading) && (
        <Text style={styles.statusText}>
          Morizo AIが応答を生成中...
        </Text>
      )}
      
      {awaitingSelection && (
        <Text style={styles.statusText}>
          主菜を選択してください...
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  historyButton: {
    backgroundColor: '#4b5563',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  historyButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
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
  statusText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
  },
});

export default ChatInput;

