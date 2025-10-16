/**
 * メニューパーサーのユーティリティ関数
 * React Native環境向けに調整
 */

/**
 * URLを抽出する関数
 * Markdown形式と括弧形式の両方に対応
 * @param text - URLを含むテキスト
 * @returns RecipeUrl配列
 */
export function parseUrls(text: string): Array<{ title: string; url: string; domain: string }> {
  const urls: Array<{ title: string; url: string; domain: string }> = [];
  
  if (!text || typeof text !== 'string') {
    return urls;
  }

  // Markdown形式のリンク: [タイトル](URL)
  const markdownPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match;
  
  while ((match = markdownPattern.exec(text)) !== null) {
    const title = match[1].trim();
    const url = match[2].trim();
    const domain = extractDomain(url);
    
    if (url && isValidUrl(url)) {
      urls.push({ title, url, domain });
    }
  }

  // 括弧形式のURL: (URL)
  const bracketPattern = /\(([^)]+)\)/g;
  while ((match = bracketPattern.exec(text)) !== null) {
    const url = match[1].trim();
    const domain = extractDomain(url);
    
    if (url && isValidUrl(url) && !urls.some(u => u.url === url)) {
      urls.push({ title: domain, url, domain });
    }
  }

  return urls;
}

/**
 * URLからドメイン名を抽出する
 * @param url - URL文字列
 * @returns ドメイン名
 */
export function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    // URLが無効な場合は元の文字列を返す
    return url;
  }
}

/**
 * URLが有効かどうかを判定する
 * @param url - URL文字列
 * @returns 有効かどうか
 */
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * レスポンスがメニュー提案かどうかを判定する
 * @param response - APIレスポンス
 * @returns メニュー提案かどうか
 */
export function isMenuResponse(response: string): boolean {
  if (!response || typeof response !== 'string') {
    return false;
  }
  
  // 献立提案特有のパターンをチェック
  return /📝.*斬新な提案|📚.*伝統的な提案|🍽️.*斬新な提案|🍽️.*伝統的な提案/.test(response);
}

/**
 * レスポンスをセクションに分割する
 * @param response - APIレスポンス
 * @returns セクション別のテキスト
 */
export function splitResponseIntoSections(response: string): {
  innovative?: string;
  traditional?: string;
} {
  const sections: { innovative?: string; traditional?: string } = {};
  
  if (!response || typeof response !== 'string') {
    return sections;
  }

  // 斬新な提案セクションを抽出
  const innovativeMatch = response.match(/\*\*📝.*斬新な提案.*\*\*([\s\S]*?)(?=\*\*📚.*伝統的な提案.*\*\*|$)/);
  if (innovativeMatch) {
    sections.innovative = innovativeMatch[1].trim();
  }

  // 伝統的な提案セクションを抽出
  const traditionalMatch = response.match(/\*\*📚.*伝統的な提案.*\*\*([\s\S]*?)$/);
  if (traditionalMatch) {
    sections.traditional = traditionalMatch[1].trim();
  }

  return sections;
}
