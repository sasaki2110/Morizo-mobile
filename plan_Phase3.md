# Phase 3: 在庫CRUD操作機能の実装

## 概要

Web版で実装された在庫CRUD操作機能（UPDATE08_2）をモバイル版に取り込みます。

**ドキュメント**: `/app/Morizo-web/docs/web2mobile/UPDATE08_2.md`  
**実装基準**: ドキュメントは参考として、**Web版のソースコードを正とする**

---

## 改修内容

### UPDATE08_2: 在庫CRUD操作実装（Phase 2-1, 2-2）
- **在庫追加・編集・削除**: モーダル型UIで実装
- **完全なCRUD機能**: 一覧表示に加えて完全な管理機能

**前提条件**: Phase 2（在庫一覧表示機能）の実装が完了していること

---

## 実装詳細

**優先度**: 中  
**工数**: 高  
**リスク**: 中

### 新規作成ファイル

1. **InventoryEditModal.tsx**: 在庫追加・編集モーダル
   - ファイル: `/app/Morizo-mobile/components/InventoryEditModal.tsx`（新規作成）
   - 新規作成と編集を同一モーダルで処理
   - フォーム入力: アイテム名、数量、単位、保管場所、賞味期限

### 修正ファイル

1. **api/inventory-api.ts**: CRUD操作API呼び出し関数を追加
   - `addInventoryItem(data)`: 在庫追加
   - `updateInventoryItem(itemId, data)`: 在庫更新
   - `deleteInventoryItem(itemId)`: 在庫削除

2. **InventoryPanel.tsx**: CRUD操作機能を追加
   - 編集・削除ボタンを各行に追加
   - 新規追加ボタンを追加
   - `InventoryEditModal`との連携

---

## 実装のポイント

- 編集モーダルはReact Nativeの`Modal`コンポーネントを使用
- 削除確認は`Alert.alert`を使用
- バリデーション: 必須項目チェック、数量の正の値チェック

---

## 確認事項

- バックエンドAPI（`/api/inventory/add`, `/api/inventory/update/:id`, `/api/inventory/delete/:id`）が正しく動作することを確認
- エラーハンドリングが適切に実装されているか確認

---

## 実装チェックリスト

- [ ] `InventoryEditModal.tsx`: 新規作成
- [ ] `api/inventory-api.ts`: CRUD操作API関数を追加
- [ ] `InventoryPanel.tsx`: 編集・削除ボタンを追加
- [ ] `InventoryPanel.tsx`: 新規追加ボタンを追加
- [ ] 動作確認: 在庫追加が動作することを確認
- [ ] 動作確認: 在庫編集が動作することを確認
- [ ] 動作確認: 在庫削除が動作することを確認
- [ ] 動作確認: バリデーションが正しく動作することを確認

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
- `/app/Morizo-web/components/InventoryEditModal.tsx`
- `/app/Morizo-web/components/InventoryPanel.tsx`
- `/app/Morizo-web/api/inventory-api.ts`（または同等のAPI呼び出しファイル）

### ドキュメント
- `/app/Morizo-web/docs/web2mobile/UPDATE08_2.md`

---

**作成日**: 2025年1月27日  
**最終更新**: 2025年1月27日  
**作成者**: AI Assistant

