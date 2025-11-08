import React from 'react';
import { Platform } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { logComponent } from '../lib/logging';

interface AuthGuardProps {
  children: React.ReactNode;
}

/**
 * 認証ガードコンポーネント
 * 認証済みユーザーのみ子コンポーネントを表示する
 */
export function AuthGuard({ children }: AuthGuardProps) {
  const { user, session } = useAuth();
  const isAuthenticated = !!(session && user && session.user?.id === user.id);

  React.useEffect(() => {
    logComponent('AuthGuard', 'component_mounted', { 
      hasUser: !!user, 
      hasSession: !!session,
      platform: Platform.OS 
    });
  }, []);

  if (!isAuthenticated) {
    logComponent('AuthGuard', 'auth_not_authenticated');
    return null;
  }

  return <>{children}</>;
}

