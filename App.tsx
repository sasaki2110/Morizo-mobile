import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginScreen from './screens/LoginScreen';
import MainScreen from './screens/MainScreen';
import CustomSplashScreen from './components/SplashScreen';
import { logComponent, safeLog, LogCategory } from './lib/logging';

// スプラッシュ画面の自動非表示を防ぐ
SplashScreen.preventAutoHideAsync();

function AppContent() {
  const { user, session, loading, initialized } = useAuth();
  const [showSplash, setShowSplash] = useState(true);

  // アプリ初期化ログ
  useEffect(() => {
    safeLog.info(LogCategory.MAIN, 'Morizo Mobile アプリケーション起動');
    logComponent('AppContent', 'component_mounted');
  }, []);

  // 認証状態ログ
  useEffect(() => {
    if (initialized) {
      safeLog.debug(LogCategory.AUTH, 'AppContent認証状態更新', {
        loading,
        initialized,
        hasSession: !!session,
        hasUser: !!user,
        userEmail: user?.email ? user.email.replace(/(.{2}).*(@.*)/, '$1***$2') : undefined
      });
    }
  }, [loading, initialized, session, user]);

  // スプラッシュ画面を表示中
  if (showSplash) {
    return (
      <CustomSplashScreen 
        onFinish={() => {
          safeLog.info(LogCategory.MAIN, 'スプラッシュ画面終了');
          logComponent('AppContent', 'splash_screen_finished');
          setShowSplash(false);
        }} 
      />
    );
  }

  if (loading || !initialized) {
    safeLog.debug(LogCategory.MAIN, 'AppContent - ローディング中または初期化中');
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  // より厳密な認証状態の判定
  const isAuthenticated = !!(session && user && session.user?.id === user.id);
  safeLog.debug(LogCategory.AUTH, 'AppContent - 認証状態判定', { isAuthenticated });

  return isAuthenticated ? <MainScreen /> : <LoginScreen />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
