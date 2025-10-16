# Morizo Web機能移植プラン

## 目的

Morizo Webのチャットストリーミングとレシピビューアー機能をMorizo Mobileに移植し、React Native環境でSSE対応とレシピ表示機能を実装する。

## 実装方針

### 1. SSEストリーミング機能の実装

Web版のSSE（Server-Sent Events）ストリーミング機能をReact Native環境向けに移植。EventSourceポリフィルまたはfetch APIを使用してリアルタイム進捗表示を実現する。

### 2. レシピビューアー機能の実装

Web版のレシピモーダルをReact Nativeの全画面表示として移植。メニューパーサー、RecipeCard、MenuViewerを実装する。

### 3. 既存チャット機能の拡張

現在のChatScreenをWeb版と同等の機能に拡張。ストリーミング進捗表示とレシピビューアーを統合する。

## 実装ステップ

### Phase 1: 型定義とユーティリティの移植

#### 1.1 メニュー関連の型定義
- `types/menu.ts` を作成
- RecipeUrl, RecipeCard, MenuSection, MenuResponse, ParseResult等の型を定義
- RECIPE_EMOJI_MAP, CATEGORY_EMOJI_MAPを定義

#### 1.2 ストリーミング関連の型定義
- `lib/streaming/types.ts` を作成
- ProgressData, StreamingMessage, StreamingState等の型を定義

#### 1.3 セッション管理機能
- `lib/session-manager.ts` を作成
- generateSSESessionId関数を実装（React Native対応）
- UUID生成ロジックを実装

### Phase 2: メニューパーサーの実装

#### 2.1 パーサーユーティリティ
- `lib/menu-parser/utils.ts` を作成
- isMenuResponse, parseUrls, extractDomain, splitResponseIntoSections関数を実装

#### 2.2 バリデーター
- `lib/menu-parser/validator.ts` を作成
- validateMenuSection, validateRecipeCard, validateRecipeUrl関数を実装

#### 2.3 メインパーサー
- `lib/menu-parser/parser.ts` を作成
- parseMenuFromJson, parseMenuSection, parseMenuResponse, parseMenuResponseUnified関数を実装

#### 2.4 インデックスファイル
- `lib/menu-parser/index.ts` を作成
- 主要関数をエクスポート

### Phase 3: SSEストリーミング機能の実装

#### 3.1 SSE接続管理フック
- `lib/streaming/useStreamingConnection.ts` を作成
- React NativeのfetchでSSE接続を実装
- メッセージタイプ別処理（connected, start, progress, complete, error, timeout, close）
- AbortControllerによる接続管理

#### 3.2 進捗表示コンポーネント
- `components/streaming/ProgressDisplay.tsx` を作成
- React NativeのViewコンポーネントで進捗バー、タスク表示、アニメーションを実装
- エラー表示、接続中表示、完了表示

#### 3.3 ストリーミング進捗コンポーネント
- `components/streaming/StreamingProgress.tsx` を作成
- useStreamingConnectionとProgressDisplayを統合

### Phase 4: レシピビューアーの実装

#### 4.1 RecipeCardコンポーネント
- `components/RecipeCard.tsx` を作成
- React Nativeで個別レシピカード表示
- URL一覧表示、カテゴリ表示、絵文字表示
- RecipeCardSkeleton, RecipeCardError コンポーネント

#### 4.2 MenuViewerコンポーネント
- `components/MenuViewer.tsx` を作成
- セクション別レシピ表示（斬新な提案、伝統的な提案）
- ScrollViewでレシピグリッド表示
- parseMenuResponseUnifiedでJSON優先解析

#### 4.3 レシピビューアー画面
- `screens/RecipeViewerScreen.tsx` を作成
- 全画面でMenuViewerを表示
- 閉じるボタン、スクロール機能

### Phase 5: ChatScreenの拡張

#### 5.1 ストリーミング対応チャット機能
- `screens/ChatScreen.tsx` を更新
- SSEセッションID生成を統合
- StreamingProgressコンポーネントを統合
- メッセージタイプに'streaming'を追加

#### 5.2 レシピ表示機能の統合
- レシピレスポンス検出ロジック
- レシピビューアー画面への遷移ボタン
- isMenuResponse、parseMenuResponseUnifiedの活用

#### 5.3 UI/UX改善
- ストリーミング進捗の視覚的フィードバック
- レシピ表示ボタンのデザイン
- エラーハンドリングの強化

### Phase 6: API連携の実装

#### 6.1 chat-stream API呼び出し
- `/api/chat-stream/[sseSessionId]` エンドポイントへの接続
- SSE形式のレスポンス処理
- タイムアウト、リトライ機能

#### 6.2 認証トークン管理
- Supabase認証トークンの取得
- Authorizationヘッダーの設定

### Phase 7: テストと最適化

#### 7.1 機能テスト
- テキストチャット + ストリーミング
- 音声チャット + ストリーミング
- レシピ表示機能

#### 7.2 エラーハンドリング
- ネットワークエラー
- SSE接続エラー
- パースエラー

#### 7.3 パフォーマンス最適化
- メモリ管理
- コンポーネントの最適化
- 不要な再レンダリング防止

## 主要ファイル

### 新規作成ファイル
- `types/menu.ts` - メニュー関連型定義
- `lib/streaming/types.ts` - ストリーミング関連型定義
- `lib/session-manager.ts` - SSEセッション管理
- `lib/menu-parser/utils.ts` - パーサーユーティリティ
- `lib/menu-parser/validator.ts` - バリデーター
- `lib/menu-parser/parser.ts` - メインパーサー
- `lib/menu-parser/index.ts` - パーサーエクスポート
- `lib/streaming/useStreamingConnection.ts` - SSE接続フック
- `components/streaming/ProgressDisplay.tsx` - 進捗表示
- `components/streaming/StreamingProgress.tsx` - ストリーミング進捗
- `components/RecipeCard.tsx` - レシピカード
- `components/MenuViewer.tsx` - メニュービューアー
- `screens/RecipeViewerScreen.tsx` - レシピビューアー画面

### 更新ファイル
- `screens/ChatScreen.tsx` - ストリーミング対応、レシピ表示統合
- `package.json` - 必要に応じて依存パッケージ追加

## 技術仕様

### SSEストリーミング
- React NativeのfetchでSSE接続
- ReadableStreamによるチャンク処理
- AbortControllerによる接続管理
- タイムアウト: 30秒

### レシピパーサー
- JSON形式優先（menu_data）
- フォールバック: 文字列解析
- マルチラインパターンマッチング
- URL抽出（Markdown形式、括弧形式）

### UI/UXデザイン
- React NativeのView, Text, ScrollView
- ストリーミング進捗アニメーション
- レシピカードのグリッド表示
- エラー・ローディング状態表示

## 成功基準

1. ✅ テキストチャットでストリーミング進捗が表示される
2. ✅ 音声チャットでストリーミング進捗が表示される
3. ✅ レシピレスポンスが正しく解析される
4. ✅ レシピビューアー画面が正しく表示される
5. ✅ Android実機で正常動作
6. ✅ Webエミュレーターで正常動作（音声録音を除く）
7. ✅ エラーハンドリングが適切に機能する

## 実装進捗

### Phase 1: 型定義とユーティリティの移植 ✅ **完了**
- [x] 1.1 メニュー関連の型定義（types/menu.ts）
- [x] 1.2 ストリーミング関連の型定義（lib/streaming/types.ts）
- [x] 1.3 セッション管理機能（lib/session-manager.ts）

### Phase 2: メニューパーサーの実装 ✅ **完了**
- [x] 2.1 パーサーユーティリティ（lib/menu-parser/utils.ts）
- [x] 2.2 バリデーター（lib/menu-parser/validator.ts）
- [x] 2.3 メインパーサー（lib/menu-parser/parser.ts）
- [x] 2.4 インデックスファイル（lib/menu-parser/index.ts）

### Phase 3: SSEストリーミング機能の実装 ✅ **完了**
- [x] 3.1 SSE接続管理フック（lib/streaming/useStreamingConnection.ts）
- [x] 3.2 進捗表示コンポーネント（components/streaming/ProgressDisplay.tsx）
- [x] 3.3 ストリーミング進捗コンポーネント（components/streaming/StreamingProgress.tsx）

### Phase 4: レシピビューアーの実装 ✅ **完了**
- [x] 4.1 RecipeCardコンポーネント（components/RecipeCard.tsx）
- [x] 4.2 MenuViewerコンポーネント（components/MenuViewer.tsx）
- [x] 4.3 レシピビューアー画面（screens/RecipeViewerScreen.tsx）

### Phase 5: ChatScreenの拡張 ✅ **完了**
- [x] 5.1 ストリーミング対応チャット機能
- [x] 5.2 レシピ表示機能の統合
- [x] 5.3 UI/UX改善

### Phase 6: API連携の実装 ✅ **完了**
- [x] 6.1 chat-stream API呼び出し
- [x] 6.2 認証トークン管理

### Phase 7: テストと最適化 ✅ **完了**
- [x] 7.1 機能テスト
- [x] 7.2 エラーハンドリング
- [x] 7.3 パフォーマンス最適化

## 参考資料

### Web版の主要ファイル
- `/app/Morizo-web/components/ChatSection.tsx` - チャット機能の参考
- `/app/Morizo-web/components/streaming/StreamingProgress.tsx` - ストリーミング進捗
- `/app/Morizo-web/components/streaming/useStreamingConnection.ts` - SSE接続フック
- `/app/Morizo-web/components/MenuViewer.tsx` - メニュービューアー
- `/app/Morizo-web/components/RecipeCard.tsx` - レシピカード
- `/app/Morizo-web/lib/menu-parser/` - メニューパーサー
- `/app/Morizo-web/lib/session-manager.ts` - セッション管理
- `/app/Morizo-web/types/menu.ts` - メニュー型定義

## 注意事項

1. **React Native特有の制約**
   - Web版のCSSクラスはReact NativeのStyleSheetに変換
   - `react-markdown`はReact Nativeで動作しないため、シンプルなText表示で代替
   - SSEはfetch APIで実装（EventSourceはReact Nativeで非対応）

2. **API URL設定**
   - Web版: `http://localhost:3000/api`
   - Mobile版（実機）: `http://192.168.1.12:3000/api`
   - Platform.OSで環境判定

3. **認証トークン管理**
   - Supabaseの`getSession()`で取得
   - Authorizationヘッダーに`Bearer ${token}`形式で設定

4. **エラーハンドリング**
   - ネットワークエラー、タイムアウト、パースエラーを適切に処理
   - ユーザーフレンドリーなエラーメッセージを表示

---

**最終更新**: 2025年1月16日  
**バージョン**: 1.0  
**作成者**: AIエージェント協働チーム

