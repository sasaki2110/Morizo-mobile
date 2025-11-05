# 取り込み計画 Phase 2: レシートOCR機能（UPDATE09_2）

## 概要

Web版で実装された在庫レシートOCR機能をモバイルアプリに取り込みます。

## 実装日時

計画作成日: 2025年1月29日

## 実装内容

### 1. 必要なパッケージの追加

**ファイル**: `package.json`

以下のパッケージを追加（Phase 1で追加済みの場合はスキップ）：
- `expo-image-picker`: レシート画像選択用（カメラまたはフォトライブラリ）

```bash
npm install expo-image-picker
```

**注意**: カメラ機能を使用する場合は、`expo-camera`も必要ですが、まずはフォトライブラリからの選択のみ実装

### 2. API関数の追加

**ファイル**: `/app/Morizo-mobile/api/inventory-api.ts`

#### 追加する関数

```typescript
// OCR解析結果の型定義
export interface OCRItem {
  item_name: string;
  quantity: number;
  unit: string;
  storage_location: string | null;
  expiry_date: string | null;
}

export interface OCRResult {
  success: boolean;
  items: OCRItem[];
  registered_count: number;
  errors: string[];
}

// レシートOCR解析API
export async function analyzeReceiptOCR(imageUri: string): Promise<OCRResult> {
  const apiUrl = `${getApiUrl()}/inventory/ocr-receipt`;
  
  // FormDataを作成
  const formData = new FormData();
  
  // 画像ファイル名を取得（URIから）
  const filename = imageUri.split('/').pop() || 'receipt.jpg';
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : 'image/jpeg';
  
  formData.append('image', {
    uri: imageUri,
    type: type,
    name: filename,
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
- OCR解析は時間がかかる可能性があるため、タイムアウト設定（3分）を考慮
- 画像はJPEG/PNG形式のみ対応
- ファイルサイズ制限（10MB）を確認

### 3. InventoryOCRModalコンポーネントの作成

**ファイル**: `/app/Morizo-mobile/components/InventoryOCRModal.tsx`（新規作成）

#### 実装内容

- **モーダルUI**: React Nativeの`Modal`コンポーネントを使用
- **画像選択**: `expo-image-picker`を使用してレシート画像を選択
- **画像プレビュー**: `Image`コンポーネントを使用
- **OCR解析進捗**: `ActivityIndicator`を使用
- **解析結果の編集UI**: 
  - `FlatList`でアイテム一覧を表示
  - 各アイテムを編集可能（`TextInput`、`Picker`、日付ピッカー）
  - チェックボックスでアイテムを選択（`Switch`コンポーネント）
  - 全選択/全解除機能

#### 主な機能

1. **画像選択**
   - `expo-image-picker`でレシート画像を選択
   - ファイル形式の検証（JPEG/PNGのみ）
   - ファイルサイズ制限（10MB）
   - 画像プレビュー表示

2. **OCR解析**
   - 画像をアップロードしてOCR解析を実行
   - 進捗表示（`ActivityIndicator`）
   - タイムアウト処理（3分）

3. **解析結果の確認・編集**
   - 抽出されたアイテムの一覧表示（`FlatList`）
   - 各アイテムの編集機能：
     - アイテム名（`TextInput`）
     - 数量（`TextInput`、数値入力）
     - 単位（`Picker`）
     - 保管場所（`Picker`）
     - 消費期限（日付ピッカー、将来実装または`TextInput`で日付入力）
   - アイテムの選択機能（`Switch`）
   - 全選択/全解除機能

4. **登録処理**
   - 選択したアイテムのみを登録
   - 個別登録API（`/api/inventory/add`）を使用
   - 登録結果の表示（成功件数、エラー件数）

#### UIコンポーネント

- `Modal`: モーダル表示
- `ScrollView`: スクロール可能なコンテンツ
- `Image`: 画像プレビュー
- `TouchableOpacity`: ボタン
- `ActivityIndicator`: ローディング表示
- `FlatList`: アイテム一覧表示
- `TextInput`: テキスト入力（アイテム名、数量）
- `Picker`: 単位・保管場所選択
- `Switch`: チェックボックス
- `View`: レイアウト

#### 状態管理

- `file`: 選択した画像ファイル
- `previewUrl`: 画像プレビューURL
- `isAnalyzing`: OCR解析中フラグ
- `ocrResult`: OCR解析結果
- `editableItems`: 編集可能なアイテムリスト
- `selectedItems`: 選択されたアイテムのインデックス（`Set<number>`）
- `isRegistering`: 登録中フラグ

### 4. InventoryPanelコンポーネントの拡張

**ファイル**: `/app/Morizo-mobile/components/InventoryPanel.tsx`

#### 変更箇所

1. **インポート追加**（ファイル先頭）
```typescript
import InventoryOCRModal from './InventoryOCRModal';
```

2. **状態管理追加**（`InventoryPanel`コンポーネント内）
```typescript
const [isOCRModalOpen, setIsOCRModalOpen] = useState(false);
```

3. **ボタン追加**（「CSVアップロード」ボタンの下）
```typescript
<TouchableOpacity
  onPress={() => setIsOCRModalOpen(true)}
  style={styles.ocrButton}
>
  <Text style={styles.ocrButtonText}>📷 レシートOCR</Text>
</TouchableOpacity>
```

4. **モーダル追加**（`InventoryCSVUploadModal`の下）
```typescript
<InventoryOCRModal
  isOpen={isOCRModalOpen}
  onClose={() => setIsOCRModalOpen(false)}
  onUploadComplete={loadInventory}
/>
```

5. **スタイル追加**（`StyleSheet`内）
```typescript
ocrButton: {
  backgroundColor: '#8b5cf6',
  paddingVertical: 12,
  paddingHorizontal: 16,
  borderRadius: 8,
  alignItems: 'center',
  marginTop: 8,
},
ocrButtonText: {
  color: '#ffffff',
  fontSize: 14,
  fontWeight: '600',
},
```

### 5. 日付ピッカーの実装

**注意**: React Nativeには標準の日付ピッカーがないため、以下のいずれかを実装：

1. **`@react-native-community/datetimepicker`を使用**（推奨）
   ```bash
   npm install @react-native-community/datetimepicker
   ```
   - iOS/Androidのネイティブ日付ピッカーを使用
   - プラットフォーム固有のUI

2. **`TextInput`で日付入力**（簡易実装）
   - ユーザーが`YYYY-MM-DD`形式で入力
   - バリデーションを実装

**Phase 2では簡易実装（`TextInput`）を採用**し、将来的に日付ピッカーを追加可能にする

### 6. 既存ファイルの確認

**ファイル**: `/app/Morizo-mobile/api/inventory-api.ts`

- `addInventoryItem`関数が存在することを確認（登録処理で使用）
- `supabase`のインポートが必要

## 実装手順

### ステップ1: パッケージの追加

```bash
cd /app/Morizo-mobile
npm install expo-image-picker
```

### ステップ2: API関数の追加

1. `api/inventory-api.ts`を開く
2. `OCRItem`、`OCRResult`インターフェースを追加
3. `analyzeReceiptOCR`関数を追加

### ステップ3: InventoryOCRModalコンポーネントの作成

1. `components/InventoryOCRModal.tsx`を新規作成
2. Web版の実装を参考に、React Native版に適応
3. `expo-image-picker`を使用して画像選択
4. `Image`コンポーネントで画像プレビュー
5. `ActivityIndicator`で進捗表示
6. `FlatList`でアイテム一覧表示
7. 各アイテムの編集UIを実装
8. `Switch`でアイテム選択機能
9. 登録処理を実装

### ステップ4: InventoryPanelの拡張

1. `components/InventoryPanel.tsx`を開く
2. `InventoryOCRModal`をインポート
3. 状態管理を追加
4. レシートOCRボタンを追加
5. モーダルを追加
6. スタイルを追加

### ステップ5: テスト

1. アプリを起動
2. 在庫パネルを開く
3. 「レシートOCR」ボタンをタップ
4. レシート画像を選択
5. OCR解析を実行
6. 解析結果を確認・編集
7. アイテムを選択して登録
8. 登録結果を確認

## 技術的な注意点

### 1. 画像の処理

- **画像プレビュー**: `Image`コンポーネントで`source={{ uri: imageUri }}`を使用
- **メモリリーク対策**: モーダルを閉じる際に画像URIをクリア（必要に応じて）
- **ファイル形式**: JPEG/PNGのみ対応
- **ファイルサイズ**: 10MB制限（クライアント側とサーバー側の両方で検証）

### 2. OCR解析の処理時間

- **処理時間**: 数秒〜数十秒かかる可能性がある
- **タイムアウト**: 3分のタイムアウトを設定（必要に応じて）
- **進捗表示**: 解析中は`ActivityIndicator`を表示
- **エラーハンドリング**: タイムアウトやAPIエラーを適切に処理

### 3. 解析結果の編集UI

- **`FlatList`の使用**: 大量のアイテム（50件以上）に対応
- **編集可能項目**: アイテム名、数量、単位、保管場所、消費期限
- **選択機能**: `Switch`コンポーネントでアイテムを選択
- **全選択/全解除**: ヘッダーの`Switch`で一括選択
- **デフォルト値**: すべてのアイテムを初期選択状態にする

### 4. 登録処理

- **個別登録**: 選択したアイテムを個別登録API（`/api/inventory/add`）で登録
- **部分成功の処理**: 一部のアイテムが失敗しても、成功したものは登録
- **エラー表示**: 登録に失敗したアイテムのエラーメッセージを表示
- **登録完了後の処理**: 在庫一覧を自動再読み込み

### 5. バックエンドAPIの動作について

**重要**: 現在のバックエンドAPI `/api/inventory/ocr-receipt` は解析と同時に自動登録も行います。フロントエンドでは解析結果を表示・編集・選択してから個別登録APIで登録するため、重複登録の可能性があります。

**対処方法**:
1. バックエンドAPIを修正して、解析のみを返すエンドポイントを追加
2. 既存エンドポイントに登録をスキップするオプションを追加
3. フロントエンドで既存の登録済みアイテムをチェックしてスキップ

**Phase 2では、実装を進めつつ、実際の動作確認時に重複登録が発生する場合は、上記の対処方法を検討**

### 6. 日付入力の実装

- **簡易実装**: `TextInput`で`YYYY-MM-DD`形式で入力
- **バリデーション**: 日付形式の検証を実装
- **将来的な改善**: `@react-native-community/datetimepicker`を追加

## 関連ドキュメント

- **UPDATE09_2.md**: Web版の実装内容
- **UPDATE09_1.md**: CSVアップロード機能の実装内容
- **UPDATE08_1.md**: 在庫一覧表示機能の実装内容
- **UPDATE08_2.md**: 在庫CRUD操作機能の実装内容

## 実装完了後の確認項目

- [ ] レシート画像選択が正常に動作する
- [ ] 画像プレビューが正常に表示される
- [ ] OCR解析が正常に実行される
- [ ] 解析結果が正常に表示される
- [ ] アイテムの編集が正常に動作する
- [ ] アイテムの選択が正常に動作する
- [ ] 全選択/全解除が正常に動作する
- [ ] 登録処理が正常に実行される
- [ ] 登録完了後に在庫一覧が自動再読み込みされる
- [ ] モーダルを閉じた際に状態がリセットされる
- [ ] メモリリークが発生しない（画像プレビューのクリーンアップ）

---

**作成者**: AI Assistant  
**ステータス**: 計画作成完了  
**前フェーズ**: Phase 1（CSVアップロード機能）

