import { VALID_IMAGE_EXTENSIONS, MAX_FILE_SIZE } from './ocr-constants';

/**
 * 画像ファイルの形式を検証する
 * @param uri 画像ファイルのURI
 * @returns 有効な形式の場合true、それ以外はfalse
 */
export function validateImageFormat(uri: string): boolean {
  const fileName = uri.toLowerCase();
  return VALID_IMAGE_EXTENSIONS.some(ext => fileName.endsWith(ext));
}

/**
 * 画像ファイルのサイズを検証する
 * @param fileSize ファイルサイズ（バイト単位）、undefinedの場合は検証をスキップ
 * @returns 有効なサイズの場合true、それ以外はfalse
 */
export function validateImageSize(fileSize: number | undefined): boolean {
  if (fileSize === undefined) {
    // ファイルサイズが不明な場合は検証をスキップ（trueを返す）
    return true;
  }
  return fileSize <= MAX_FILE_SIZE;
}

/**
 * 画像ファイルの形式とサイズの両方を検証する
 * @param uri 画像ファイルのURI
 * @param fileSize ファイルサイズ（バイト単位）、undefinedの場合はサイズ検証をスキップ
 * @returns 検証結果オブジェクト
 */
export function validateImage(uri: string, fileSize?: number): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!validateImageFormat(uri)) {
    errors.push('JPEGまたはPNGファイルのみアップロード可能です');
  }

  if (!validateImageSize(fileSize)) {
    errors.push('ファイルサイズは10MB以下にしてください');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

