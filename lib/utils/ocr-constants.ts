/**
 * OCR関連の定数定義
 */

// 単位のリスト
export const UNITS = ['個', 'kg', 'g', 'L', 'ml', '本', 'パック', '袋'] as const;

// 保管場所のリスト
export const STORAGE_LOCATIONS = ['冷蔵庫', '冷凍庫', '常温倉庫', '野菜室', 'その他'] as const;

// 最大ファイルサイズ（バイト単位、10MB）
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

// 有効な画像拡張子
export const VALID_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png'] as const;

// 型定義
export type Unit = typeof UNITS[number];
export type StorageLocation = typeof STORAGE_LOCATIONS[number];

