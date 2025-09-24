import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, Platform } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { showErrorAlert, showSuccessAlert } from '../utils/alert';
import { logAPI, logComponent, LogCategory } from '../lib/logging';
import LogViewerScreen from '../lib/logging/viewer/LogViewerScreen';
// import { runAllTests } from '../tests';

export default function MainScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [apiResponse, setApiResponse] = useState<string>('');
  const [showLogViewer, setShowLogViewer] = useState(false);
  const { user, session, signOut } = useAuth();

  // コンポーネント初期化ログ
  React.useEffect(() => {
    logComponent('MainScreen', 'component_mounted', { 
      hasUser: !!user, 
      hasSession: !!session,
      platform: Platform.OS 
    });
  }, []);

  // 認証状態の確認
  const isAuthenticated = !!(session && user && session.user?.id === user.id);
  
  // 認証状態ログ
  logComponent('MainScreen', 'auth_status_check', { 
    isAuthenticated, 
    hasUser: !!user, 
    hasSession: !!session,
    userId: user?.id 
  });

  // 未認証の場合は何もしない（App.tsxでLoginScreenに遷移するはず）
  if (!isAuthenticated) {
    logComponent('MainScreen', 'auth_not_authenticated');
    return null;
  }

  // API URL設定
  const getApiUrl = () => {
    if (__DEV__) {
      // 開発環境
      if (Platform.OS === 'web') {
        // Webブラウザで実行中
        return 'http://localhost:3000/api/test';
      } else {
        // 実機で実行中（Expo Go）
        return 'http://192.168.1.12:3000/api/test';
      }
    } else {
      // 本番環境
      return 'https://morizo-web.vercel.app/api/test';
    }
  };

  const callAPI = async () => {
    // const timer = safeLog.timer('api-call');
    setIsLoading(true);
    setApiResponse('');
    
    try {
      const apiUrl = getApiUrl();
      logAPI('callAPI', 'GET', apiUrl, {}, 0, 'API呼び出し開始');
      
      // 認証トークンを取得
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      if (!currentSession?.access_token) {
        const errorMsg = '認証トークンが取得できません';
        setApiResponse(errorMsg);
        showErrorAlert(errorMsg);
        logAPI('callAPI', 'GET', apiUrl, {}, 401, '認証トークン取得失敗');
        // timer();
        return;
      }

      logComponent('MainScreen', 'auth_token_success', { 
        tokenLength: currentSession.access_token.length 
      });

      // Authorizationヘッダーにトークンを含めてAPIを呼び出し
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${currentSession.access_token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setApiResponse(JSON.stringify(data, null, 2));
      
      await logAPI('GET', apiUrl, response.status, { responseLength: JSON.stringify(data).length });
      showSuccessAlert(`API呼び出しが成功しました！\nURL: ${apiUrl}`);
      
      // timer();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '不明なエラー';
      logAPI('callAPI', 'GET', apiUrl, {}, 500, `API呼び出しエラー: ${errorMessage}`);
      showErrorAlert(`API呼び出しに失敗しました: ${errorMessage}`);
      setApiResponse(`エラー: ${errorMessage}`);
      // timer();
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      logComponent('MainScreen', 'signout_button_clicked');
      await signOut();
      logComponent('MainScreen', 'signout_completed');
    } catch (error) {
      logComponent('MainScreen', 'signout_error', { error: error.message });
      showErrorAlert('ログアウトに失敗しました');
    }
  };

  const handleShowLogViewer = () => {
    logComponent('MainScreen', 'log_viewer_button_clicked');
    setShowLogViewer(true);
  };

  const handleCloseLogViewer = () => {
    logComponent('MainScreen', 'log_viewer_closed');
    setShowLogViewer(false);
  };

  // iOS用ログ強制生成テスト
  const handleForceGenerateLogs = () => {
    console.log('=== iOS ログ強制生成開始 ===');
    console.log('Platform:', Platform.OS);
    console.log('Timestamp:', new Date().toISOString());
    
    logComponent('MainScreen', 'force_generate_logs_started', { platform: Platform.OS });
    
    // 複数のログレベルでテスト
    logAPI('test', 'GET', '/test-endpoint', { test: 'data' }, 200, 'Test response');
    logComponent('MainScreen', 'test_log_generated', { timestamp: new Date().toISOString() });
    logComponent('MainScreen', 'test_safe_log', { message: 'Test log message' });
    
    // エラーログも生成
    try {
      throw new Error('Test error for iOS logging');
    } catch (error) {
      logAPI('test', 'POST', '/error-endpoint', {}, 500, 'Test error response');
    }
    
    logComponent('MainScreen', 'force_generate_logs_completed', { 
      platform: Platform.OS,
      timestamp: new Date().toISOString()
    });
    
    console.log('=== iOS ログ強制生成完了 ===');
  };

  const handleRunTests = async () => {
    logComponent('MainScreen', 'test_button_clicked');
    setIsLoading(true);
    
    try {
      console.log('🧪 テスト実行開始...');
      // await runAllTests();
      showSuccessAlert('テスト機能は一時的に無効化されています');
      console.log('🎉 テスト実行完了');
    } catch (error) {
      console.error('❌ テスト実行エラー:', error);
      showErrorAlert(`テスト実行に失敗しました: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <View style={styles.container}>
      <Text style={styles.title}>ようこそMorizoへ</Text>
      
      {user && (
        <View style={styles.userInfo}>
          <Text style={styles.userEmail}>{user.email}</Text>
          <TouchableOpacity 
            style={styles.signOutButton} 
            onPress={handleSignOut}
          >
            <Text style={styles.signOutButtonText}>ログアウト</Text>
          </TouchableOpacity>
        </View>
      )}
      
      <TouchableOpacity 
        style={[styles.button, isLoading && styles.buttonDisabled]} 
        onPress={callAPI}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>
          {isLoading ? 'API確認中...' : 'API確認'}
        </Text>
      </TouchableOpacity>

        <TouchableOpacity
          style={styles.logViewerButton}
          onPress={handleShowLogViewer}
        >
          <Text style={styles.logViewerButtonText}>ログ確認</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.forceLogButton}
          onPress={handleForceGenerateLogs}
        >
          <Text style={styles.forceLogButtonText}>ログ強制生成</Text>
        </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.testButton, isLoading && styles.buttonDisabled]} 
        onPress={handleRunTests}
        disabled={isLoading}
      >
        <Text style={styles.testButtonText}>
          {isLoading ? 'テスト実行中...' : 'テスト実行'}
        </Text>
      </TouchableOpacity>
      
      {apiResponse ? (
        <View style={styles.responseContainer}>
          <Text style={styles.responseTitle}>API応答:</Text>
          <Text style={styles.responseText}>{apiResponse}</Text>
        </View>
      ) : null}
      
      {showLogViewer && (
        <LogViewerScreen 
          visible={showLogViewer}
          onClose={handleCloseLogViewer}
        />
      )}
      
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#333',
  },
  userInfo: {
    alignItems: 'center',
    marginBottom: 20,
  },
  userEmail: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
  },
  signOutButton: {
    backgroundColor: '#ff3b30',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 6,
  },
  signOutButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  responseContainer: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 8,
    width: '100%',
    maxHeight: 200,
  },
  responseTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  responseText: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
  },
  logViewerButton: {
    backgroundColor: '#34C759',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  logViewerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  forceLogButton: {
    backgroundColor: '#ff6b6b',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginVertical: 8,
    alignItems: 'center',
  },
  forceLogButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  testButton: {
    backgroundColor: '#FF9500',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  testButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
