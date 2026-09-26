import { Share as RNShare, Platform, Alert } from 'react-native';
import RNFS from 'react-native-fs';
import * as XLSX from 'xlsx';
import { WorkbookData } from '../../types/spreadsheet';
import { SpreadsheetService } from '../excel/SpreadsheetService';

let NativeShare: any = null;
try {
  NativeShare = require('react-native-share').default;
} catch {
  // Graceful fallback to React Native built-in Share
}

export class ExportShareService {
  /**
   * Exports and shares a workbook as an .xlsx file using Android's native share sheet
   */
  public static async shareXlsx(workbook: WorkbookData): Promise<boolean> {
    try {
      const base64Data = SpreadsheetService.exportToXlsxBase64(workbook);
      const cleanFileName = workbook.fileName.endsWith('.xlsx')
        ? workbook.fileName.replace(/[\\/:*?"<>|]/g, '_')
        : `${workbook.fileName.replace(/[\\/:*?"<>|]/g, '_')}.xlsx`;
      const tempPath = `${RNFS.CachesDirectoryPath}/${cleanFileName}`;

      await RNFS.writeFile(tempPath, base64Data, 'base64');
      const fileUri = Platform.OS === 'android' ? `file://${tempPath}` : tempPath;

      if (NativeShare && NativeShare.open) {
        await NativeShare.open({
          url: fileUri,
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          title: `Share ${cleanFileName}`,
          filename: cleanFileName,
        });
        return true;
      } else {
        await RNShare.share({
          title: `Share ${cleanFileName}`,
          message: `LedgerFlow Workbook: ${cleanFileName}`,
          url: fileUri,
        });
        return true;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('dismissed') || msg.includes('cancel') || msg.includes('User did not share')) {
        return false;
      }
      console.warn('Share error:', msg);
      Alert.alert('Share', `Sharing prepared for: ${workbook.fileName}`);
      return false;
    }
  }

  /**
   * Exports and shares the active sheet as a .csv file
   */
  public static async shareCsv(
    workbook: WorkbookData,
    sheetIndex: number = 0
  ): Promise<boolean> {
    try {
      const targetSheet = workbook.sheets[sheetIndex];
      if (!targetSheet) {
        throw new Error('Sheet not found');
      }

      // Convert sheet data to CSV using SheetJS with formula injection sanitization
      const headerRow = targetSheet.columns.map((c) =>
        String(SpreadsheetService.sanitizeCellValueForExport(c.name || 'Column'))
      );
      const dataRows = targetSheet.rows.map((row) =>
        targetSheet.columns.map((col) =>
          SpreadsheetService.sanitizeCellValueForExport(row.values[col.id] ?? '')
        )
      );
      const ws = XLSX.utils.aoa_to_sheet([headerRow, ...dataRows]);
      const csvContent = XLSX.utils.sheet_to_csv(ws);

      const baseName = workbook.fileName.replace(/\.xlsx$/i, '').replace(/[\\/:*?"<>|]/g, '_');
      const safeSheetName = targetSheet.name.replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, '_');
      const csvFileName = `${baseName}_${safeSheetName}.csv`;
      const tempPath = `${RNFS.CachesDirectoryPath}/${csvFileName}`;

      await RNFS.writeFile(tempPath, csvContent, 'utf8');
      const fileUri = Platform.OS === 'android' ? `file://${tempPath}` : tempPath;

      if (NativeShare && NativeShare.open) {
        await NativeShare.open({
          url: fileUri,
          type: 'text/csv',
          title: `Share ${csvFileName}`,
          filename: csvFileName,
        });
        return true;
      } else {
        await RNShare.share({
          title: `Share ${csvFileName}`,
          message: csvContent,
        });
        return true;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('dismissed') || msg.includes('cancel')) {
        return false;
      }
      console.warn('CSV Share error:', msg);
      return false;
    }
  }
}
