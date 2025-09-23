# Morizo Mobile - ロギング設定

## 概要

Morizo Mobileアプリケーションのロギングシステム設定ファイル。
**web版の成功パターンを参考に、mobile版に最適化されたロギングシステムを実装しています。**

## 実装完了機能

### ✅ **モバイルロギング** (`lib/logging/mobile-logger.ts`)
- AsyncStorage（モバイル）・localStorage（Web）対応
- プラットフォーム自動検出
- ログローテーション（自動バックアップ）
- セキュリティ配慮（個人情報マスキング）
- パフォーマンス測定（タイマー機能）

### ✅ **統一ロギングインターフェース** (`lib/logging/logging-utils.ts`)
- プラットフォーム自動判定
- 環境に応じた適切なログ出力
- エラー耐性のある実装
- 専用ログ関数（認証・API・コンポーネント等）

### ✅ **ログフォーマット最適化**
- カテゴリ・レベル5文字パディング
- 視認性の高い整列フォーマット
- 絵文字による視覚的識別
- プラットフォーム情報付きログ

## 環境変数

### **ログレベル設定**
```bash
# ログレベル (0=DEBUG, 1=INFO, 2=WARN, 3=ERROR)
LOG_LEVEL=1

# コンソール出力の有効/無効
LOG_CONSOLE=true

# ストレージ出力の有効/無効
LOG_STORAGE=true
```

### **ログストレージ設定**
```bash
# 最大ストレージサイズ (MB)
LOG_MAX_STORAGE_SIZE=5

# 最大ストレージファイル数
LOG_MAX_STORAGE_FILES=3
```

## ログカテゴリ

### **MAIN**
- アプリケーション起動・終了
- モジュール初期化
- 全般的な処理フロー

### **AUTH**
- 認証・認可処理
- ログイン・ログアウト
- トークン検証
- セキュリティ関連

### **API**
- API呼び出し
- リクエスト・レスポンス
- 外部サービス連携
- エラーハンドリング

### **VOICE**
- 音声録音
- Whisper API連携
- 音声認識処理
- 音声エラー

### **CHAT**
- チャットメッセージ
- AI応答
- チャットエラー
- セッション管理

### **SESSION**
- セッション開始・終了
- セッション更新
- セッションエラー

### **COMPONENT**
- React Nativeコンポーネント
- UI操作
- ユーザーインタラクション

### **NAVIGATION**
- 画面遷移
- ナビゲーション処理
- ルーティング

### **STORAGE**
- AsyncStorage操作
- localStorage操作
- データ永続化

### **NETWORK**
- ネットワーク通信
- 接続状態
- 通信エラー

## ログフォーマット

### **標準フォーマット（パディング適用済み）**
```
YYYY-MM-DDTHH:mm:ss.sssZ - CATEGORY - LEVEL  - EMOJI MESSAGE | Data: {...}
```

### **実際の出力例**
```
2025-01-27T12:39:55.229Z - MAIN  - INFO  - ℹ️ Morizo Mobile アプリケーション起動
2025-01-27T12:39:55.230Z - AUTH  - DEBUG - 🔍 認証トークン抽出開始
2025-01-27T12:39:55.417Z - AUTH  - INFO  - ℹ️ 認証成功 | Data: {"userId":"d0e0d523-1831-4541-bd67-f312386db951","emailMasked":"t*********1@gmail.com"}
2025-01-27T12:40:02.825Z - MAIN  - INFO  - ℹ️ Timer: api-call | Data: {"duration":"7596ms"}
```

### **パディング仕様**
- **カテゴリ**: 5文字右パディング（`MAIN `, `API  `, `AUTH `, `VOICE`）
- **レベル**: 5文字右パディング（`INFO `, `DEBUG`, `WARN `, `ERROR`）
- **視認性**: 完璧に整列された読みやすいフォーマット

## セキュリティ

### **個人情報マスキング**
- メールアドレス: `t***@example.com`
- トークン: `eyJhbGciOiJIUzI1NiIs...`
- パスワード: 完全に除外
- URL: クエリパラメータのマスキング

### **ストレージ保護**
- 適切なストレージ権限設定
- 本番環境での機密情報除外
- ログローテーション

## パフォーマンス

### **非同期ログ**
- UIをブロックしない
- バックグラウンド処理
- エラーハンドリング

### **ストレージサイズ管理**
- 自動ローテーション
- 古いログの削除
- ストレージ容量監視

## プラットフォーム対応

### **iOS・Android**
- AsyncStorage使用
- ネイティブログ出力
- プラットフォーム固有の最適化

### **Web**
- localStorage使用
- ブラウザコンソール出力
- Web環境での最適化

### **自動検出**
- Platform.OSによる自動判定
- 環境に応じた適切な処理
- 統一されたインターフェース

## 監視・アラート

### **エラー監視**
- エラー率の追跡
- 異常なエラー発生時のアラート
- パフォーマンス低下の検出

### **ログ分析**
- ユーザー行動分析
- 機能利用率
- エラーパターン分析

## 開発・本番環境

### **開発環境**
- コンソール + ストレージ出力
- DEBUGレベル
- 詳細なログ

### **本番環境**
- ストレージ出力のみ
- INFOレベル以上
- 機密情報除外

## Morizo Mobile実装の特徴

### **ファイル構成**
```
lib/logging/
├── types.ts              # 型定義・定数
├── mobile-logger.ts      # モバイルロギングクラス
├── logging-utils.ts      # 統一インターフェース・専用関数
└── index.ts              # 統一エクスポート
```

### **実装のポイント**

#### **1. プラットフォーム対応**
- **iOS・Android**: AsyncStorage使用
- **Web**: localStorage使用
- **自動検出**: Platform.OSによる環境判定

#### **2. エラー耐性**
```typescript
// ログ出力時のtry-catch
try {
  await log.info(LogCategory.API, 'API呼び出し開始');
} catch (error) {
  console.error('ログ出力エラー:', error);
}
```

#### **3. パディング実装**
```typescript
const paddedCategory = category.padEnd(5, ' ');
const paddedLevel = levelName.padEnd(5, ' ');
```

#### **4. ストレージローテーション**
- 自動バックアップ機能
- ストレージサイズ制限
- 古いログの削除

### **使用方法**

#### **基本的な使用方法**
```typescript
import { log, LogCategory } from '@/lib/logging';

// 情報ログ
log.info(LogCategory.API, 'API呼び出し開始');

// エラーログ
log.error(LogCategory.AUTH, '認証失敗', { error: 'Invalid token' });

// パフォーマンス測定
const timer = log.timer('api-call');
// ... 処理 ...
timer();
```

#### **専用ログ関数**
```typescript
import { logAuth, logAPI, logComponent } from '@/lib/logging';

// 認証ログ
logAuth('login', 'user@example.com', true);

// APIログ
logAPI('GET', 'https://api.example.com', 200);

// コンポーネントログ
logComponent('MainScreen', 'button_clicked');
```

#### **安全なログ出力**
```typescript
import { safeLog } from '@/lib/logging';

// エラーハンドリング付きログ
safeLog.info(LogCategory.API, 'API呼び出し開始');
safeLog.error(LogCategory.AUTH, '認証エラー', { error: error.message });
```

## トラブルシューティング

### **ログが出力されない場合**
1. ログレベル `LOG_LEVEL` を確認
2. ストレージ権限を確認
3. ストレージ容量を確認

### **ストレージが大きくなりすぎる場合**
1. `LOG_MAX_STORAGE_SIZE` を調整
2. ログローテーション設定を確認
3. 古いログを手動削除

### **パフォーマンス問題**
1. ログレベルを上げる（DEBUG → INFO）
2. コンソール出力を無効化
3. ログ出力頻度を調整

### **プラットフォーム固有の問題**
1. iOS・Android: AsyncStorageの権限確認
2. Web: localStorageの制限確認
3. プラットフォーム検出の確認

## 今後の拡張予定

### **1. 外部サービス連携**
- Sentry連携
- Firebase Analytics連携
- ログアグリゲーション

### **2. リアルタイム監視**
- ダッシュボード
- アラート機能
- メトリクス収集

### **3. 高度な分析**
- ユーザー行動分析
- パフォーマンス分析
- エラーパターン分析

---

**最終更新**: 2025年1月27日  
**バージョン**: 1.0  
**作成者**: Morizo Mobile開発チーム
