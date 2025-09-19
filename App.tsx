import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, Alert } from 'react-native';
import { useState } from 'react';

export default function App() {
  const [isLoading, setIsLoading] = useState(false);
  const [apiResponse, setApiResponse] = useState<string>('');

  const callAPI = async () => {
    setIsLoading(true);
    setApiResponse('');
    
    try {
      // Next.jsのAPIエンドポイントを呼び出し
      // 開発環境: http://localhost:3000/api/test
      // 本番環境: https://morizo-web.vercel.app/api/test
      const response = await fetch('http://localhost:3000/api/test', {
      //const response = await fetch('https://morizo-web.vercel.app/api/test', {
          method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setApiResponse(JSON.stringify(data, null, 2));
      Alert.alert('成功', 'API呼び出しが成功しました！');
    } catch (error) {
      console.error('API呼び出しエラー:', error);
      Alert.alert('エラー', `API呼び出しに失敗しました: ${error.message}`);
      setApiResponse(`エラー: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ようこそMorizoへ</Text>
      
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
