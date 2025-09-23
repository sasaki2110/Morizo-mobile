import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, Platform } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { showErrorAlert, showSuccessAlert } from '../utils/alert';
import { logAPI, logComponent, safeLog, LogCategory } from '../lib/logging';

export default function MainScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [apiResponse, setApiResponse] = useState<string>('');
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
  safeLog.debug(LogCategory.AUTH, 'MainScreen認証状態確認', { 
    isAuthenticated, 
    hasUser: !!user, 
    hasSession: !!session,
    userId: user?.id 
  });

  // 未認証の場合は何もしない（App.tsxでLoginScreenに遷移するはず）
  if (!isAuthenticated) {
    safeLog.warn(LogCategory.AUTH, 'MainScreen未認証のため何も表示しません');
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
    const timer = safeLog.timer('api-call');
    setIsLoading(true);
    setApiResponse('');
    
    try {
      const apiUrl = getApiUrl();
      safeLog.info(LogCategory.API, 'API呼び出し開始', { url: apiUrl });
      
      // 認証トークンを取得
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      if (!currentSession?.access_token) {
        const errorMsg = '認証トークンが取得できません';
        setApiResponse(errorMsg);
        showErrorAlert(errorMsg);
        safeLog.error(LogCategory.AUTH, '認証トークン取得失敗');
        timer();
        return;
      }

      safeLog.debug(LogCategory.AUTH, '認証トークン取得成功', { 
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
      
      timer();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '不明なエラー';
      safeLog.error(LogCategory.API, 'API呼び出しエラー', { error: errorMessage });
      showErrorAlert(`API呼び出しに失敗しました: ${errorMessage}`);
      setApiResponse(`エラー: ${errorMessage}`);
      timer();
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
      safeLog.error(LogCategory.AUTH, 'MainScreenログアウトエラー', { error: error.message });
      showErrorAlert('ログアウトに失敗しました');
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
      
      {apiResponse ? (
        <View style={styles.responseContainer}>
          <Text style={styles.responseTitle}>API応答:</Text>
          <Text style={styles.responseText}>{apiResponse}</Text>
        </View>
      ) : null}
      
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
});
