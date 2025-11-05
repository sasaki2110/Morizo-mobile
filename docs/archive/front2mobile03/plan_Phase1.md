# 取り込み計画 Phase 1: CSVアップロード機能（UPDATE09_1）

## 概要

Web版で実装された在庫CSVアップロード機能をモバイルアプリに取り込みます。

## 実装日時

計画作成日: 2025年1月29日

## 実装内容

### 1. 必要なパッケージの追加

**ファイル**: `package.json`

以下のパッケージを追加：
- `expo-document-picker`: CSVファイル選択用

```bash
npm install expo-document-picker
```

### 2. API関数の追加

**ファイル**: `/app/Morizo-mobile/api/inventory-api.ts`

#### 追加する関数

```typescript
// CSVアップロード結果の型定義
export interface CSVUploadResult {
  success: boolean;
  total: number;
  success_count: number;
  error_count: number;
  errors: Array<{
    row: number;
    item_name?: string;
    error: string;
  }>;
}

// CSVアップロードAPI
export async function uploadInventoryCSV(fileUri: string): Promise<CSVUploadResult> {
  const apiUrl = `${getApiUrl()}/inventory/upload-csv`;
  
  // FormDataを作成
  const formData = new FormData();
  formData.append('file', {
    uri: fileUri,
    type: 'text/csv',
    name: 'inventory.csv',
  } as any);

  // 認証トークンを取得
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.access_token) {
    throw new Error('認証トークンが取得できません');
  }

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      // Content-TypeはFormDataの場合自動設定されるため指定しない
    },
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
  }

  const result = await response.json();
  return result;
}
```

**注意**: 
- `authenticatedFetch`は`Content-Type: application/json`を自動設定するため、FormDataの場合は直接`fetch`を使用
- React NativeのFormDataでは、ファイルは`{ uri, type, name }`形式で指定

### 3. InventoryCSVUploadModalコンポーネントの作成

**ファイル**: `/app/Morizo-mobile/components/InventoryCSVUploadModal.tsx`（新規作成）

#### 実装内容

- **モーダルUI**: React Nativeの`Modal`コンポーネントを使用
- **ファイル選択**: `expo-document-picker`を使用してCSVファイルを選択
- **進捗表示**: `ActivityIndicator`を使用
- **結果表示**: 
  - 成功件数・エラー件数の表示
  - エラー詳細のテーブル表示（`FlatList`を使用）
  - 部分成功の処理

#### 主な機能

1. **ファイル選択**
   - `expo-document-picker`でCSVファイルを選択
   - ファイル形式の検証（.csvのみ）
   - ファイルサイズ表示

2. **CSVフォーマット説明**
   - CSVフォーマットの説明を表示
   - サンプル形式を表示

3. **アップロード処理**
   - FormDataでCSVファイルをアップロード
   - 進捗表示（`ActivityIndicator`）
   - エラーハンドリング

4. **結果表示**
   - 成功件数・エラー件数の表示
   - エラー詳細テーブル（`FlatList`を使用）
   - 部分成功の処理

#### UIコンポーネント

- `Modal`: モーダル表示
- `ScrollView`: スクロール可能なコンテンツ
- `TouchableOpacity`: ボタン
- `TextInput`: テキスト入力（使用しないが参考）
- `ActivityIndicator`: ローディング表示
- `FlatList`: エラー詳細テーブル

### 4. InventoryPanelコンポーネントの拡張

**ファイル**: `/app/Morizo-mobile/components/InventoryPanel.tsx`

#### 変更箇所

1. **インポート追加**（ファイル先頭）
```typescript
import InventoryCSVUploadModal from './InventoryCSVUploadModal';
```

2. **状態管理追加**（`InventoryPanel`コンポーネント内）
```typescript
const [isCSVUploadModalOpen, setIsCSVUploadModalOpen] = useState(false);
```

3. **ボタン追加**（「新規追加」ボタンの下）
```typescript
<TouchableOpacity
  onPress={() => setIsCSVUploadModalOpen(true)}
  style={styles.csvUploadButton}
>
  <Text style={styles.csvUploadButtonText}>📄 CSVアップロード</Text>
</TouchableOpacity>
```

4. **モーダル追加**（`InventoryEditModal`の下）
```typescript
<InventoryCSVUploadModal
  isOpen={isCSVUploadModalOpen}
  onClose={() => setIsCSVUploadModalOpen(false)}
  onUploadComplete={loadInventory}
/>
```

5. **スタイル追加**（`StyleSheet`内）
```typescript
csvUploadButton: {
  backgroundColor: '#10b981',
  paddingVertical: 12,
  paddingHorizontal: 16,
  borderRadius: 8,
  alignItems: 'center',
  marginTop: 8,
},
csvUploadButtonText: {
  color: '#ffffff',
  fontSize: 14,
  fontWeight: '600',
},
```

### 5. 既存ファイルの確認

**ファイル**: `/app/Morizo-mobile/api/inventory-api.ts`

- `getApiUrl()`関数が存在することを確認
- `supabase`のインポートが必要（`recipe-api.ts`から確認）

## 実装手順

### ステップ1: パッケージの追加

```bash
cd /app/Morizo-mobile
npm install expo-document-picker
```

### ステップ2: API関数の追加

1. `api/inventory-api.ts`を開く
2. `CSVUploadResult`インターフェースを追加
3. `uploadInventoryCSV`関数を追加
4. `supabase`のインポートを追加（`lib/supabase.ts`から）

### ステップ3: InventoryCSVUploadModalコンポーネントの作成

1. `components/InventoryCSVUploadModal.tsx`を新規作成
2. Web版の実装を参考に、React Native版に適応
3. `expo-document-picker`を使用してファイル選択
4. `ActivityIndicator`で進捗表示
5. `FlatList`でエラー詳細テーブル表示

### ステップ4: InventoryPanelの拡張

1. `components/InventoryPanel.tsx`を開く
2. `InventoryCSVUploadModal`をインポート
3. 状態管理を追加
4. CSVアップロードボタンを追加
5. モーダルを追加
6. スタイルを追加

### ステップ5: テスト

1. アプリを起動
2. 在庫パネルを開く
3. 「CSVアップロード」ボタンをタップ
4. CSVファイルを選択
5. アップロードを実行
6. 結果を確認

## 技術的な注意点

### 1. FormDataの扱い

- React Nativeでは、ファイルは`{ uri, type, name }`形式で指定
- `Content-Type`ヘッダーは自動設定されるため、明示的に指定しない
- `authenticatedFetch`は`Content-Type: application/json`を自動設定するため、FormDataの場合は直接`fetch`を使用

### 2. ファイル選択

- `expo-document-picker`を使用
- CSVファイルのみ選択可能にする（`type: 'text/csv'`）
- ファイルサイズ制限はバックエンド側で実装済み（10MB）

### 3. エラーハンドリング

- ネットワークエラー、JSONパースエラー、部分成功を適切に処理
- エラーメッセージは`Alert`で表示

### 4. UI/UX

- モーダルは既存の`InventoryEditModal`と同様のデザイン
- 進捗表示は`ActivityIndicator`を使用
- エラー詳細テーブルは`FlatList`を使用（大量データに対応）

## 関連ドキュメント

- **UPDATE09_1.md**: Web版の実装内容
- **UPDATE08_1.md**: 在庫一覧表示機能の実装内容
- **UPDATE08_2.md**: 在庫CRUD操作機能の実装内容

## 実装完了後の確認項目

- [ ] CSVファイル選択が正常に動作する
- [ ] アップロード進捗が表示される
- [ ] 成功時の結果表示が正常に動作する
- [ ] エラー時の結果表示が正常に動作する
- [ ] エラー詳細テーブルが正常に表示される
- [ ] アップロード完了後に在庫一覧が自動再読み込みされる
- [ ] モーダルを閉じた際に状態がリセットされる

---

**作成者**: AI Assistant  
**ステータス**: 計画作成完了  
**次フェーズ**: Phase 2（レシートOCR機能）

