# Phase 2: 在庫一覧表示機能の実装

## 概要

Web版で実装された在庫ビューアー機能（UPDATE08_1）をモバイル版に取り込みます。

**ドキュメント**: `/app/Morizo-web/docs/web2mobile/UPDATE08_1.md`  
**実装基準**: ドキュメントは参考として、**Web版のソースコードを正とする**

---

## 改修内容

### UPDATE08_1: 在庫ビューアー実装（Phase 1-1, 1-2）
- **在庫一覧表示**: フィルター・ソート機能付き
- **ドロワー型UI**: 履歴パネルと同様のUI

---

## 実装詳細

**優先度**: 中  
**工数**: 高  
**リスク**: 中

### 新規作成ファイル

1. **InventoryPanel.tsx**: 在庫一覧表示コンポーネント
   - ファイル: `/app/Morizo-mobile/components/InventoryPanel.tsx`（新規作成）
   - ドロワー型UI: `HistoryPanel`と同様の実装パターン
   - フィルター機能: 保管場所、検索
   - ソート機能: 登録日、アイテム名、数量、保管場所、消費期限

2. **api/inventory-api.ts**: 在庫API呼び出し関数（新規作成）
   - ファイル: `/app/Morizo-mobile/api/inventory-api.ts`
   - `getInventoryList(sortBy, sortOrder)`: 在庫一覧取得

### 修正ファイル

1. **useModalManagement.ts**: 在庫パネルの開閉状態管理を追加
   - ファイル: `/app/Morizo-mobile/hooks/useModalManagement.ts`
   - `isInventoryPanelOpen`, `openInventoryPanel`, `closeInventoryPanel`を追加

2. **ChatInput.tsx**: 在庫ボタンを追加
   - ファイル: `/app/Morizo-mobile/components/ChatInput.tsx`
   - 「📦 在庫」ボタンを追加（履歴ボタンの横）

3. **ChatScreen.tsx**: InventoryPanelコンポーネントを追加
   - ファイル: `/app/Morizo-mobile/screens/ChatScreen.tsx`
   - `InventoryPanel`コンポーネントをインポートし、表示処理を追加

---

## 実装のポイント

- `HistoryPanel`の実装パターンを参考にする
- テーブル表示はReact Nativeの`FlatList`または`ScrollView` + `View`を使用
- フィルターはフロントエンド側で実装（Web版と同様）

---

## 確認事項

- バックエンドAPI（`/api/inventory/list`）が正しく動作することを確認
- 認証トークンが正しく渡されているか確認

---

## 実装チェックリスト

- [ ] `InventoryPanel.tsx`: 新規作成
- [ ] `useModalManagement.ts`: 在庫パネル管理を追加
- [ ] `api/inventory-api.ts`: 在庫一覧取得API関数を追加
- [ ] `ChatInput.tsx`: 在庫ボタンを追加
- [ ] `ChatScreen.tsx`: `InventoryPanel`コンポーネントを追加
- [ ] 動作確認: 在庫一覧が正しく表示されることを確認
- [ ] 動作確認: フィルター機能が動作することを確認
- [ ] 動作確認: ソート機能が動作することを確認

---

## 実装時の注意事項

### 1. Web版ソースコードを正とする
- ドキュメントより、実際のWeb版ソースコードを参照して実装
- ドキュメント記載後に修正が入っている可能性があるため、必ずソースコードを確認

### 2. React Nativeへの変換
- **HTML要素 → React Nativeコンポーネント**:
  - `div` → `View`
  - `button` → `TouchableOpacity` / `Pressable`
  - `input` → `TextInput`
  - `select` → `Picker` (または `@react-native-picker/picker`)
  - `table` → `FlatList` または `ScrollView` + `View`

- **CSS → StyleSheet**:
  - Tailwind CSSクラスを`StyleSheet.create()`で定義
  - レスポンシブデザインは`Dimensions` APIを使用

- **イベントハンドリング**:
  - `onClick` → `onPress`
  - `onChange` → `onChangeText` (TextInputの場合)

### 3. 認証とAPI呼び出し
- 既存の`authenticatedFetch`関数を使用
- 認証トークンは自動的に付与されることを確認
- APIエンドポイントは環境変数または定数で管理

### 4. エラーハンドリング
- ネットワークエラー、認証エラー、バリデーションエラーを適切に処理
- ユーザーフレンドリーなエラーメッセージを表示
- `Alert.alert`を使用してエラーを通知

### 5. 状態管理
- 既存のカスタムフック（`useModalManagement`など）のパターンに従う
- グローバル状態は必要に応じてContext APIを使用

### 6. テスト
- Phase完了後に動作確認を実施
- Android実機でのテストを優先（README.mdに記載の通り）
- エッジケース（空データ、エラー状態など）も確認

---

## 参考情報

### Web版ソースコードの場所
- `/app/Morizo-web/components/InventoryPanel.tsx`
- `/app/Morizo-web/hooks/useModalManagement.ts`

### ドキュメント
- `/app/Morizo-web/docs/web2mobile/UPDATE08_1.md`

---

**作成日**: 2025年1月27日  
**最終更新**: 2025年1月27日  
**作成者**: AI Assistant

