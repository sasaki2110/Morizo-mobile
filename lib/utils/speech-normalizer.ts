/**
 * 音声認識結果の正規化ユーティリティ
 * 
 * Whisper APIなどの音声認識結果で、ひらがなや誤認識が発生した場合に
 * 正しい漢字や表記に置換するためのユーティリティ
 */

// 置換ルールの型定義
export interface ReplacementRule {
  from: string;  // 置換前のテキスト
  to: string;    // 置換後のテキスト
}

// 置換ルールの定義（拡張可能）
const REPLACEMENT_RULES: ReplacementRule[] = [
  { from: 'こんだて', to: '献立' },
  { from: '根立', to: '献立' },
  { from: 'おしえて', to: '教えて' },
  { from: '主催', to: '主菜' },
  { from: '取材', to: '主菜' },
  // 将来的に他のルールを追加可能
];

/**
 * 音声認識結果を正規化する関数
 * 
 * @param text 音声認識で取得されたテキスト
 * @returns 正規化されたテキスト
 */
export function normalizeSpeechText(text: string): string {
  if (!text || !text.trim()) {
    return text;
  }
  
  let normalizedText = text;
  
  // 1. 改行文字（\n, \r）の除去
  normalizedText = normalizedText.replace(/[\n\r]/g, '');
  
  // 2. 不要なカンマ（、）の除去
  // - 末尾のカンマを除去
  normalizedText = normalizedText.replace(/[、，]+$/g, '');
  // - 先頭のカンマを除去
  normalizedText = normalizedText.replace(/^[、，]+/g, '');
  // - 連続するカンマを1つに（念のため）
  normalizedText = normalizedText.replace(/[、，]{2,}/g, '、');
  
  // 3. 前後の空白文字のトリム
  normalizedText = normalizedText.trim();
  
  // 4. 各置換ルールを順番に適用（ひらがな→漢字など）
  REPLACEMENT_RULES.forEach(rule => {
    // すべての出現箇所を置換（gフラグ相当の動作）
    normalizedText = normalizedText.replace(new RegExp(rule.from, 'g'), rule.to);
  });
  
  return normalizedText;
}

/**
 * 置換ルールを取得する関数（デバッグ用）
 * 
 * @returns 現在の置換ルール一覧
 */
export function getReplacementRules(): ReplacementRule[] {
  return [...REPLACEMENT_RULES];
}
