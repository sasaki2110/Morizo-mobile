import React, { useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { ChatMessage } from '../types/chat';
import { RecipeCandidate } from '../types/menu';
import StreamingProgress from './streaming/StreamingProgress';
import SelectionOptions from './SelectionOptions';
import SelectedRecipeCard from './SelectedRecipeCard';
import { isMenuResponse } from '../lib/menu-parser';

interface ChatMessageListProps {
  chatMessages: ChatMessage[];
  scrollViewRef: React.RefObject<ScrollView>;
  isTextChatLoading: boolean;
  awaitingSelection: boolean;
  selectedRecipes: {
    main?: RecipeCandidate;
    sub?: RecipeCandidate;
    soup?: RecipeCandidate;
  };
  isSavingMenu: boolean;
  savedMessage: string;
  onSaveMenu: () => void;
  onClearHistory: () => void;
  onSelect: (selection: number, selectionResult?: any) => void;
  onViewList: (candidates: RecipeCandidate[], currentStage?: 'main' | 'sub' | 'soup') => void;
  onRequestMore: (sseSessionId: string) => void;
  onNextStageRequested: (sseSessionId?: string) => void;
  onOpenRecipeViewer: (response: string, result?: unknown) => void;
  createOnCompleteHandler: (message: ChatMessage, messageIndex: number) => (result: unknown) => void;
  createOnErrorHandler: (message: ChatMessage, messageIndex: number) => (error: string) => void;
  createOnTimeoutHandler: (message: ChatMessage, messageIndex: number) => () => void;
  createOnProgressHandler: () => () => void;
}

const ChatMessageList: React.FC<ChatMessageListProps> = ({
  chatMessages,
  scrollViewRef,
  isTextChatLoading,
  awaitingSelection,
  selectedRecipes,
  isSavingMenu,
  savedMessage,
  onSaveMenu,
  onClearHistory,
  onSelect,
  onViewList,
  onRequestMore,
  onNextStageRequested,
  onOpenRecipeViewer,
  createOnCompleteHandler,
  createOnErrorHandler,
  createOnTimeoutHandler,
  createOnProgressHandler,
}) => {
  // 自動スクロール処理
  useEffect(() => {
    if (scrollViewRef.current && chatMessages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [chatMessages, scrollViewRef]);

  return (
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
                        onSelect={onSelect}
                        taskId={message.taskId}
                        sseSessionId={message.sseSessionId || 'unknown'}
                        isLoading={isTextChatLoading}
                        currentStage={message.currentStage}
                        usedIngredients={message.usedIngredients}
                        menuCategory={message.menuCategory}
                        onNextStageRequested={onNextStageRequested}
                        onViewList={(candidates) => onViewList(candidates, message.currentStage)}
                        onRequestMore={onRequestMore}
                        isLatestSelection={index === chatMessages.length - 1 || chatMessages.slice(index + 1).every(msg => !msg.requiresSelection)}
                      />
                    </View>
                  )}
                  
                  {/* レシピレスポンスの場合はレシピ表示ボタンを追加（選択要求がない場合のみ） */}
                  {!message.requiresSelection && (message.result?.menu_data || isMenuResponse(message.content)) && (
                    <TouchableOpacity
                      style={styles.recipeButton}
                      onPress={() => onOpenRecipeViewer(message.content, message.result)}
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
                    onComplete={createOnCompleteHandler(message, index)}
                    onError={createOnErrorHandler(message, index)}
                    onTimeout={createOnTimeoutHandler(message, index)}
                    onProgress={createOnProgressHandler()}
                  />
                </View>
              )}
            </View>
          ))
        )}
        
        {/* Phase 3.1: 選択済みレシピの表示 */}
        {(selectedRecipes.main || selectedRecipes.sub || selectedRecipes.soup) && (
          <SelectedRecipeCard
            main={selectedRecipes.main}
            sub={selectedRecipes.sub}
            soup={selectedRecipes.soup}
            onSave={onSaveMenu}
            onViewList={(candidates) => onViewList(candidates)}
            isSaving={isSavingMenu}
            savedMessage={savedMessage}
          />
        )}
      </ScrollView>
      
      {/* クリアボタン */}
      {chatMessages.length > 0 && (
        <View style={styles.clearButtonContainer}>
          <TouchableOpacity
            style={styles.clearButton}
            onPress={onClearHistory}
          >
            <Text style={styles.clearButtonText}>🗑️ クリア</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
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
  streamingContainer: {
    marginVertical: 8,
  },
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
  clearButtonContainer: {
    alignItems: 'flex-end',
    paddingTop: 8,
    paddingRight: 8,
  },
  clearButton: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  clearButtonText: {
    color: '#dc2626',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default ChatMessageList;

