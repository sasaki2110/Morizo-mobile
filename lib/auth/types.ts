import { ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';

/**
 * 認証コンテキストの型定義
 */
export interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  initialized: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  clearSession: () => void;
}

/**
 * 認証プロバイダーのプロパティ
 */
export interface AuthProviderProps {
  children: ReactNode;
}

