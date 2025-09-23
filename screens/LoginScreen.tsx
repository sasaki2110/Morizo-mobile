import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { showErrorAlert, showSuccessAlert } from '../utils/alert';
import { logAuth, logComponent, safeLog, LogCategory } from '../lib/logging';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const { signIn, signUp, signInWithGoogle } = useAuth();

  // コンポーネント初期化ログ
  React.useEffect(() => {
    logComponent('LoginScreen', 'component_mounted');
  }, []);

  const handleAuth = async () => {
    if (!email || !password) {
      showErrorAlert('メールアドレスとパスワードを入力してください');
      return;
    }

    setLoading(true);
    try {
      logComponent('LoginScreen', 'auth_button_clicked', { 
        isSignUp, 
        email: email.replace(/(.{2}).*(@.*)/, '$1***$2') 
      });
      
      const { error } = isSignUp 
        ? await signUp(email, password)
        : await signIn(email, password);

      if (error) {
        await logAuth(isSignUp ? 'signup' : 'signin', email, false, { error: error.message });
        showErrorAlert(error.message);
      } else if (isSignUp) {
        await logAuth('signup', email, true);
        showSuccessAlert('アカウントを作成しました。メールを確認してください。');
      }
    } catch (error) {
      await logAuth(isSignUp ? 'signup' : 'signin', email, false, { error: error.message });
      showErrorAlert('認証に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      logComponent('LoginScreen', 'google_auth_button_clicked');
      
      const { error } = await signInWithGoogle();
      if (error) {
        await logAuth('google_signin', undefined, false, { error: error.message });
        showErrorAlert(error.message);
      }
    } catch (error) {
      await logAuth('google_signin', undefined, false, { error: error.message });
      showErrorAlert('Google認証に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.content}>
          <Text style={styles.title}>Morizo</Text>
          <Text style={styles.subtitle}>
            {isSignUp ? 'アカウントを作成' : 'ログイン'}
          </Text>

          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="メールアドレス"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <TextInput
              style={styles.input}
              placeholder="パスワード"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
            />

            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={handleAuth}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading 
                  ? '処理中...' 
                  : isSignUp 
                    ? 'アカウント作成' 
                    : 'ログイン'
                }
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.googleButton]}
              onPress={handleGoogleSignIn}
              disabled={loading}
            >
              <Text style={styles.googleButtonText}>
                Googleで{isSignUp ? 'サインアップ' : 'ログイン'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.switchButton}
              onPress={() => setIsSignUp(!isSignUp)}
            >
              <Text style={styles.switchButtonText}>
                {isSignUp 
                  ? '既にアカウントをお持ちの方はこちら' 
                  : 'アカウントをお持ちでない方はこちら'
                }
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 40,
  },
  form: {
    width: '100%',
    maxWidth: 300,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  button: {
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  googleButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  googleButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: 'bold',
  },
  switchButton: {
    marginTop: 10,
    alignItems: 'center',
  },
  switchButtonText: {
    color: '#007AFF',
    fontSize: 14,
  },
});
