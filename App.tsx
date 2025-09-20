import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginScreen from './screens/LoginScreen';
import MainScreen from './screens/MainScreen';

function AppContent() {
  const { user, session, loading, initialized } = useAuth();

  // デバッグ用ログ
  console.log('AppContent - loading:', loading, 'initialized:', initialized, 'session:', !!session, 'user:', user?.email || 'null');
  console.log('AppContent - user詳細:', user);
  console.log('AppContent - session詳細:', session);

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
