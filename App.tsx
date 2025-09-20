import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginScreen from './screens/LoginScreen';
import MainScreen from './screens/MainScreen';
import CustomSplashScreen from './components/SplashScreen';

// スプラッシュ画面の自動非表示を防ぐ
SplashScreen.preventAutoHideAsync();

function AppContent() {
  const { user, session, loading, initialized } = useAuth();
  const [showSplash, setShowSplash] = useState(true);

  // デバッグ用ログ
  console.log('AppContent - loading:', loading, 'initialized:', initialized, 'session:', !!session, 'user:', user?.email || 'null');
  console.log('AppContent - user詳細:', user);
  console.log('AppContent - session詳細:', session);

  // スプラッシュ画面を表示中
  if (showSplash) {
    return (
      <CustomSplashScreen 
        onFinish={() => {
          console.log('スプラッシュ画面終了');
          setShowSplash(false);
        }} 
      />
    );
  }

  if (loading || !initialized) {
    console.log('AppContent - ローディング中または初期化中...');
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  // より厳密な認証状態の判定
  const isAuthenticated = !!(session && user && session.user?.id === user.id);
  console.log('AppContent - 認証状態:', isAuthenticated);

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
