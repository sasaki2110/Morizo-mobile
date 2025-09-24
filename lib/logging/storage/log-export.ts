/**
 * Morizo Mobile - ログエクスポート機能
 * 
 * Expo Go実機対応のログエクスポート機能
 * ファイル共有・メール送信によるログの外部共有
 */

import { Platform } from 'react-native';
import * as Sharing from 'expo-sharing';
import * as MailComposer from 'expo-mail-composer';
import { LogEntry } from '../types';

// エクスポート形式
export enum ExportFormat {
  JSON = 'json',
  TEXT = 'text',
  CSV = 'csv',
}

// エクスポートオプション
export interface ExportOptions {
  format: ExportFormat;
  includeMetadata?: boolean;
  filename?: string;
}

/**
 * ログエクスポートクラス
 */
export class LogExport {
  private static instance: LogExport;

  private constructor() {}

  /**
   * シングルトンインスタンス取得
   */
  public static getInstance(): LogExport {
    if (!LogExport.instance) {
      LogExport.instance = new LogExport();
    }
    return LogExport.instance;
  }

  /**
   * ログをエクスポート
   */
  public async exportLogs(
    logs: LogEntry[],
    format: ExportFormat = ExportFormat.JSON,
    options: Partial<ExportOptions> = {}
  ): Promise<void> {
    try {
      const exportOptions: ExportOptions = {
        format,
        includeMetadata: true,
        filename: this.generateFilename(format),
        ...options,
      };

      const exportData = await this.formatLogs(logs, exportOptions);
      const filename = exportOptions.filename || this.generateFilename(format);

      if (Platform.OS === 'web') {
        await this.exportForWeb(exportData, filename, format);
      } else {
        await this.exportForMobile(exportData, filename, format);
      }

    } catch (error) {
      console.error('ログエクスポートエラー:', error);
      throw error;
    }
  }

  /**
   * ログをメールで送信
   */
  public async sendLogsByEmail(
    logs: LogEntry[],
    format: ExportFormat = ExportFormat.JSON,
    options: Partial<ExportOptions> = {}
  ): Promise<void> {
    try {
      const exportOptions: ExportOptions = {
        format,
        includeMetadata: true,
        filename: this.generateFilename(format),
        ...options,
      };

      const exportData = await this.formatLogs(logs, exportOptions);
      const filename = exportOptions.filename || this.generateFilename(format);

      // メール送信
      const isAvailable = await MailComposer.isAvailableAsync();
      if (!isAvailable) {
        throw new Error('メール機能が利用できません');
      }

      await MailComposer.composeAsync({
        recipients: [],
        subject: `Morizo Mobile ログ - ${new Date().toLocaleDateString()}`,
        body: `Morizo Mobileアプリケーションのログファイルです。\n\n生成日時: ${new Date().toISOString()}\nログ件数: ${logs.length}件\n\n添付ファイルをご確認ください。`,
        attachments: [
          {
            uri: `data:text/plain;base64,${Buffer.from(exportData).toString('base64')}`,
            mimeType: this.getMimeType(format),
            filename: filename,
          },
        ],
      });

    } catch (error) {
      console.error('メール送信エラー:', error);
      throw error;
    }
  }

  /**
   * ログをファイル共有で送信
   */
  public async shareLogs(
    logs: LogEntry[],
    format: ExportFormat = ExportFormat.JSON,
    options: Partial<ExportOptions> = {}
  ): Promise<void> {
    try {
      const exportOptions: ExportOptions = {
        format,
        includeMetadata: true,
        filename: this.generateFilename(format),
        ...options,
      };

      const exportData = await this.formatLogs(logs, exportOptions);
      const filename = exportOptions.filename || this.generateFilename(format);

      // ファイル共有
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        throw new Error('ファイル共有機能が利用できません');
      }

      // 一時ファイルを作成（実際の実装では適切なファイルパスを使用）
      const fileUri = await this.createTempFile(exportData, filename);
      
      await Sharing.shareAsync(fileUri, {
        mimeType: this.getMimeType(format),
        dialogTitle: 'ログファイルを共有',
      });

    } catch (error) {
      console.error('ファイル共有エラー:', error);
      throw error;
    }
  }

  /**
   * ログをフォーマット
   */
  private async formatLogs(logs: LogEntry[], options: ExportOptions): Promise<string> {
    const metadata = options.includeMetadata ? {
      exportDate: new Date().toISOString(),
      logCount: logs.length,
      appVersion: '1.0.0',
      platform: Platform.OS,
    } : null;

    switch (options.format) {
      case ExportFormat.JSON:
        return this.formatAsJson(logs, metadata);
      
      case ExportFormat.TEXT:
        return this.formatAsText(logs, metadata);
      
      case ExportFormat.CSV:
        return this.formatAsCsv(logs, metadata);
      
      default:
        throw new Error(`サポートされていないフォーマット: ${options.format}`);
    }
  }

  /**
   * JSON形式でフォーマット
   */
  private formatAsJson(logs: LogEntry[], metadata: any): string {
    const exportData = {
      metadata,
      logs,
    };
    
    return JSON.stringify(exportData, null, 2);
  }

  /**
   * テキスト形式でフォーマット
   */
  private formatAsText(logs: LogEntry[], metadata: any): string {
    let text = '';
    
    if (metadata) {
      text += `# Morizo Mobile ログエクスポート\n`;
      text += `生成日時: ${metadata.exportDate}\n`;
      text += `ログ件数: ${metadata.logCount}件\n`;
      text += `アプリバージョン: ${metadata.appVersion}\n`;
      text += `プラットフォーム: ${metadata.platform}\n`;
      text += `\n`;
    }
    
    text += `# ログ一覧\n`;
    text += `\n`;
    
    logs.forEach((log, index) => {
      text += `## ログ ${index + 1}\n`;
      text += `タイムスタンプ: ${log.timestamp}\n`;
      text += `レベル: ${log.level}\n`;
      text += `カテゴリ: ${log.category}\n`;
      text += `メッセージ: ${log.message}\n`;
      
      if (log.data) {
        text += `データ: ${JSON.stringify(log.data, null, 2)}\n`;
      }
      
      text += `\n`;
    });
    
    return text;
  }

  /**
   * CSV形式でフォーマット
   */
  private formatAsCsv(logs: LogEntry[], metadata: any): string {
    let csv = '';
    
    // ヘッダー
    csv += 'Timestamp,Level,Category,Message,Data\n';
    
    // データ行
    logs.forEach(log => {
      const timestamp = log.timestamp;
      const level = log.level;
      const category = log.category;
      const message = this.escapeCsvField(log.message);
      const data = log.data ? this.escapeCsvField(JSON.stringify(log.data)) : '';
      
      csv += `${timestamp},${level},${category},"${message}","${data}"\n`;
    });
    
    return csv;
  }

  /**
   * CSVフィールドをエスケープ
   */
  private escapeCsvField(field: string): string {
    return field.replace(/"/g, '""').replace(/\n/g, ' ').replace(/\r/g, ' ');
  }

  /**
   * ファイル名を生成
   */
  private generateFilename(format: ExportFormat): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const extension = this.getFileExtension(format);
    return `morizo-mobile-logs-${timestamp}.${extension}`;
  }

  /**
   * ファイル拡張子を取得
   */
  private getFileExtension(format: ExportFormat): string {
    switch (format) {
      case ExportFormat.JSON:
        return 'json';
      case ExportFormat.TEXT:
        return 'txt';
      case ExportFormat.CSV:
        return 'csv';
      default:
        return 'txt';
    }
  }

  /**
   * MIMEタイプを取得
   */
  private getMimeType(format: ExportFormat): string {
    switch (format) {
      case ExportFormat.JSON:
        return 'application/json';
      case ExportFormat.TEXT:
        return 'text/plain';
      case ExportFormat.CSV:
        return 'text/csv';
      default:
        return 'text/plain';
    }
  }

  /**
   * Web用エクスポート
   */
  private async exportForWeb(data: string, filename: string, format: ExportFormat): Promise<void> {
    if (Platform.OS !== 'web') {
      throw new Error('Web用エクスポートはWebプラットフォームでのみ利用可能です');
    }

    // Blobを作成
    const blob = new Blob([data], { type: this.getMimeType(format) });
    
    // ダウンロードリンクを作成
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    
    // ダウンロードを実行
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // URLを解放
    URL.revokeObjectURL(url);
  }

  /**
   * モバイル用エクスポート
   */
  private async exportForMobile(data: string, filename: string, format: ExportFormat): Promise<void> {
    if (Platform.OS === 'web') {
      throw new Error('モバイル用エクスポートはモバイルプラットフォームでのみ利用可能です');
    }

    // 一時ファイルを作成
    const fileUri = await this.createTempFile(data, filename);
    
    // ファイル共有
    await Sharing.shareAsync(fileUri, {
      mimeType: this.getMimeType(format),
      dialogTitle: 'ログファイルを共有',
    });
  }

  /**
   * 一時ファイルを作成
   */
  private async createTempFile(data: string, filename: string): Promise<string> {
    // 実際の実装では、適切な一時ディレクトリにファイルを作成
    // ここでは簡略化のため、base64エンコードされたデータURIを返す
    const base64Data = Buffer.from(data).toString('base64');
    return `data:${this.getMimeType(ExportFormat.TEXT)};base64,${base64Data}`;
  }

  /**
   * ログをフィルタリングしてエクスポート
   */
  public async exportFilteredLogs(
    allLogs: LogEntry[],
    filters: {
      level?: string;
      category?: string;
      startDate?: Date;
      endDate?: Date;
    },
    format: ExportFormat = ExportFormat.JSON,
    options: Partial<ExportOptions> = {}
  ): Promise<void> {
    try {
      // フィルタリング
      const filteredLogs = allLogs.filter(log => {
        if (filters.level && log.level !== filters.level) {
          return false;
        }
        
        if (filters.category && log.category !== filters.category) {
          return false;
        }
        
        if (filters.startDate) {
          const logDate = new Date(log.timestamp);
          if (logDate < filters.startDate) {
            return false;
          }
        }
        
        if (filters.endDate) {
          const logDate = new Date(log.timestamp);
          if (logDate > filters.endDate) {
            return false;
          }
        }
        
        return true;
      });

      // エクスポート
      await this.exportLogs(filteredLogs, format, options);

    } catch (error) {
      console.error('フィルタリングエクスポートエラー:', error);
      throw error;
    }
  }
}

// シングルトンインスタンスをエクスポート
export const logExport = LogExport.getInstance();

// 便利な関数をエクスポート
export const exportLogs = (logs: LogEntry[], format: ExportFormat = ExportFormat.JSON) => 
  logExport.exportLogs(logs, format);

export const sendLogsByEmail = (logs: LogEntry[], format: ExportFormat = ExportFormat.JSON) => 
  logExport.sendLogsByEmail(logs, format);

export const shareLogs = (logs: LogEntry[], format: ExportFormat = ExportFormat.JSON) => 
  logExport.shareLogs(logs, format);
