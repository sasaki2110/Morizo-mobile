# Phase 1: レシピボタンと確認ステップの実装

## 概要

Web版で実装された以下の改修をモバイル版に取り込みます。

**ドキュメント**: `/app/Morizo-web/docs/web2mobile/`  
**実装基準**: ドキュメントは参考として、**Web版のソースコードを正とする**

---

## 改修内容

### UPDATE06: レシピを見るボタンの追加・変更
- **ボタンテキスト変更**: 「レシピ一覧を見る」→「レシピを見る」
- **SelectedRecipeCardにボタン追加**: 選択済みレシピからもレシピ一覧を表示可能に

### UPDATE07: 主菜⇒副菜⇒汁物選択フローの確認ステップ追加
- **確認ダイアログ追加**: 主菜・副菜確定時に確認を表示
- **バックエンド連携**: `requires_stage_confirmation`フラグに対応

---

## 実装詳細

### 1. UPDATE06: レシピを見るボタンの変更

**優先度**: 高  
**工数**: 低  
**リスク**: 低

#### 変更箇所

1. **SelectionOptions.tsx**: ボタンテキストを「レシピ一覧を見る」→「レシピを見る」に変更
   - ファイル: `/app/Morizo-mobile/components/SelectionOptions.tsx`
   - 行番号: 227行目付近

2. **SelectedRecipeCard.tsx**: `onViewList`プロップを追加し、「レシピを見る」ボタンを追加
   - ファイル: `/app/Morizo-mobile/components/SelectedRecipeCard.tsx`
   - Propsインターフェースに`onViewList?: (candidates: RecipeCandidate[]) => void;`を追加
   - 保存ボタンと同じ行に「レシピを見る」ボタンを追加

3. **ChatMessageList.tsx**: `SelectedRecipeCard`に`onViewList`プロップを渡す
   - ファイル: `/app/Morizo-mobile/components/ChatMessageList.tsx`
   - 既に`onViewList`は存在するので、`SelectedRecipeCard`に渡すように修正

#### 実装のポイント
- Web版の実装をReact Nativeのスタイルに変換
- ボタンのスタイルは既存の`viewListButton`スタイルを参考に

#### 確認事項
- `useModalManagement`フックに`handleViewList`関数が実装されているか確認
- `RecipeListModal`コンポーネントが正しく動作するか確認

---

### 2. UPDATE07: 確認ステップ追加

**優先度**: 中  
**工数**: 中  
**リスク**: 中

#### 変更箇所

1. **SelectionOptions.tsx**: 確認ダイアログ用の状態管理と処理を追加
   - ファイル: `/app/Morizo-mobile/components/SelectionOptions.tsx`
   - 状態管理: `showStageConfirmation`, `confirmationData`を追加
   - `handleConfirm`関数: `requires_stage_confirmation`フラグのチェックと確認ダイアログ表示処理を追加

2. **確認ダイアログUI**: React Nativeの`Modal`または`Alert.alert`を使用
   - オプション1: `Alert.alert`を使用（シンプル）
   - オプション2: `Modal`コンポーネントを使用（カスタマイズ性が高い）

#### 実装のポイント
- Web版の`handleConfirm`関数のロジックを参考に実装
- バックエンドから返される`requires_stage_confirmation`フラグを確認
- 後方互換性を維持（`requires_next_stage`フラグの処理も維持）

#### 確認事項
- バックエンドAPIが`requires_stage_confirmation`フラグを返すことを確認
- 確認ダイアログのUIがモバイルに適しているか確認

---

## 実装チェックリスト

### UPDATE06（レシピを見るボタン）
- [ ] `SelectionOptions.tsx`: ボタンテキストを「レシピを見る」に変更
- [ ] `SelectedRecipeCard.tsx`: `onViewList`プロップを追加
- [ ] `SelectedRecipeCard.tsx`: 「レシピを見る」ボタンを追加
- [ ] `ChatMessageList.tsx`: `SelectedRecipeCard`に`onViewList`プロップを渡す
- [ ] 動作確認: 選択済みレシピからレシピ一覧が表示されることを確認

### UPDATE07（確認ステップ）
- [ ] `SelectionOptions.tsx`: 確認ダイアログ用の状態管理を追加
- [ ] `SelectionOptions.tsx`: `handleConfirm`関数に`requires_stage_confirmation`処理を追加
- [ ] `SelectionOptions.tsx`: 確認ダイアログUIを追加（`Modal`または`Alert.alert`）
- [ ] 動作確認: 主菜・副菜確定時に確認ダイアログが表示されることを確認
- [ ] 動作確認: 「進む」ボタンで次の段階に進むことを確認
- [ ] 動作確認: 「キャンセル」ボタンで現在の段階に留まることを確認

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
- `/app/Morizo-web/components/SelectionOptions.tsx`
- `/app/Morizo-web/components/SelectedRecipeCard.tsx`
- `/app/Morizo-web/components/ChatMessageList.tsx`

### ドキュメント
- `/app/Morizo-web/docs/web2mobile/UPDATE06.md`
- `/app/Morizo-web/docs/web2mobile/UPDATE07.md`

---

**作成日**: 2025年1月27日  
**最終更新**: 2025年1月27日  
**作成者**: AI Assistant

