# Morizo Mobile 移植プラン: Web機能の段階的移植

## 概要

Morizo Web側で実装された以下の機能を、モバイルアプリに段階的に移植します。

- **UPDATE01**: レシピ選択UI機能（チェックボックス選択、採用API）
- **UPDATE02**: 主菜5件の選択UI（SelectionOptions、RecipeListModal）
- **UPDATE03**: 段階的選択UI（主菜→副菜→汁物の段階表示）
- **UPDATE04_1**: 選択履歴表示と保存機能（SelectedRecipeCard）
- **UPDATE04_2**: 履歴パネルUI（HistoryPanel）
- **UPDATE05**: ChatSectionリファクタリング（カスタムフック分離）

## 移植方針

- **Web版を正として扱う**: ドキュメントよりWebのソースコードを優先
- **段階的移植**: 小さな単位で実装し、動作確認しながら進める
- **React Native対応**: Tailwind CSS → StyleSheet、HTML要素 → React Nativeコンポーネント
- **コンテキストウィンドウ管理**: Phase単位で実装を進める

---

## Phase 概要

### Phase 1: 基盤整備

**目標**: 型定義の同期、API呼び出し関数の実装、最小限の選択UI実装

**実装内容**:
1. **型定義の同期**: Web側の型定義をモバイル側に同期
2. **API呼び出し関数**: レシピ選択に関するAPI呼び出し関数を実装
3. **最小限の選択UI**: 主菜5件の選択UI（SelectionOptions）の最小実装

**詳細**: `plan-phase1.md`を参照

### Phase 2: 選択機能の拡張

**目標**: 段階的選択UIの実装、レシピ採用機能の実装

**実装内容**:
1. **段階的選択UI**: 主菜→副菜→汁物の段階的選択に対応
2. **レシピ採用機能**: レシピモーダルにチェックボックス選択機能を追加

**詳細**: `plan-phase2.md`を参照

### Phase 3: 履歴・保存機能

**目標**: 選択履歴表示と保存機能、履歴パネルUIの実装

**実装内容**:
1. **選択履歴表示**: 選択した主菜・副菜・汁物を視覚的に確認、献立をDBに保存
2. **履歴パネルUI**: 過去に保存した献立履歴を閲覧できるUIパネル

**詳細**: `plan-phase3.md`を参照

### Phase 4: リファクタリング（任意）

**目標**: `ChatScreen.tsx`のカスタムフックとUIコンポーネントへの分割

**実装内容**:
1. **ChatSectionリファクタリング**: カスタムフックとUIコンポーネントに分割

**詳細**: `plan-phase4.md`を参照

---

## 実装の進め方

### ステップ1: Phase 1の実装
1. 型定義の同期（1.1）
2. API呼び出し関数の実装（1.2）
3. 最小限の選択UI実装（1.3）

### ステップ2: 動作確認
- Phase 1の各機能が正常に動作することを確認
- バグや不具合があれば修正

### ステップ3: Phase 2の実装
1. 段階的選択UIの実装（2.1）
2. レシピ採用機能の実装（2.2）

### ステップ4: Phase 3の実装
1. 選択履歴表示と保存機能（3.1）
2. 履歴パネルUIの実装（3.2）

### ステップ5: Phase 4の実装（任意）
1. ChatSectionリファクタリング（4.1）

---

## 注意事項

### React Native対応のポイント
1. **スタイリング**: Tailwind CSS → `StyleSheet.create()`
2. **イベントハンドリング**: `onChange` → `onPress`等
3. **モーダル**: HTMLの`<dialog>` → React Nativeの`Modal`
4. **ストレージ**: `sessionStorage` → `AsyncStorage`
5. **アラート**: `alert()` → `Alert.alert()`

### 認証処理
- Web版の`authenticatedFetch`と同じロジックを使用
- Supabaseの認証トークンをヘッダーに含める

### API URL
- Webエミュレーター: `http://localhost:3000/api`
- Expo Go実機: `http://192.168.1.12:3000/api`
- Platform.OSに応じて切り替え

### エラーハンドリング
- ネットワークエラー、認証エラー、APIエラーを適切に処理
- ユーザーに分かりやすいエラーメッセージを表示

### テスト
- 各Phaseの実装後に動作確認を実施
- Webエミュレーターと実機の両方でテスト（可能な場合）

---

## 参考資料

- `/app/Morizo-web/docs/web2mobile/UPDATE01.md`
- `/app/Morizo-web/docs/web2mobile/UPDATE02.md`
- `/app/Morizo-web/docs/web2mobile/UPDATE03.md`
- `/app/Morizo-web/docs/web2mobile/UPDATE04_1.md`
- `/app/Morizo-web/docs/web2mobile/UPDATE04_2.md`
- `/app/Morizo-web/docs/web2mobile/UPDATE05.md`

---

## プラン分割

詳細な実装内容は以下のファイルに分割されています：

- **plan-phase1.md**: Phase 1（基盤整備）の詳細実装内容
- **plan-phase2.md**: Phase 2（選択機能の拡張）の詳細実装内容
- **plan-phase3.md**: Phase 3（履歴・保存機能）の詳細実装内容
- **plan-phase4.md**: Phase 4（リファクタリング）の詳細実装内容

各Phaseの実装を進める際は、対応する詳細プランファイルを参照してください。

---

**作成日**: 2025年1月31日  
**最終更新**: 2025年1月31日
