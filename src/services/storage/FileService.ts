import DocumentPicker, {
  types,
} from 'react-native-document-picker';
import RNFS from 'react-native-fs';
import { WorkbookData } from '../../types/spreadsheet';
import { SpreadsheetService } from '../excel/SpreadsheetService';

export class FileService {
  // Sequential promise queue to serialize concurrent file writes and prevent zip corruption
  private static saveQueue: Promise<unknown> = Promise.resolve();

  /**
   * Cleans a filename by stripping path traversal, null bytes, and invalid filesystem characters.
   * Limits base name to 80 characters and guarantees a valid .xlsx extension.
   */
  public static sanitizeFileName(fileName: string): string {
    if (!fileName || !fileName.trim()) {
      return `Workbook_${Date.now()}.xlsx`;
    }

    let clean = fileName
      .replace(/\0/g, '') // Strip null bytes
      .replace(/^[.\\\/]+/, '') // Strip leading dots and slashes
      .replace(/[\\/:*?"<>|\r\n\t]/g, '_') // Replace filesystem delimiters
      .replace(/\.{2,}/g, '.') // Replace multiple consecutive dots
      .trim();

    // Strip .xlsx extension if present before checking length
    clean = clean.replace(/\.xlsx$/i, '');
    if (!clean) {
      clean = `Workbook_${Date.now()}`;
    }

    // Limit base filename to 80 chars
    clean = clean.slice(0, 80);
    return `${clean}.xlsx`;
  }

  /**
   * Cleans up stale .tmp files in DocumentDirectoryPath and CachesDirectoryPath.
   * Safe to run on app startup; purges .tmp staging files older than 1 hour.
   */
  public static async cleanStaleTempFiles(): Promise<void> {
    try {
      const dirs = [RNFS.DocumentDirectoryPath, RNFS.CachesDirectoryPath];
      const oneHourAgo = Date.now() - 60 * 60 * 1000;

      for (const dir of dirs) {
        const exists = await RNFS.exists(dir);
        if (!exists) continue;

        const files = await RNFS.readDir(dir);
        for (const file of files) {
          if (file.name.includes('.tmp.') || file.name.endsWith('.tmp')) {
            const mtime = file.mtime ? new Date(file.mtime).getTime() : 0;
            if (mtime === 0 || mtime < oneHourAgo) {
              await RNFS.unlink(file.path).catch(() => {});
            }
          }
        }
      }
    } catch {
      // Ignore background cleanup errors
    }
  }

  /**
   * Normalizes a file URI for RNFS on Android.
   */
  private static normalizeUri(uri: string): string {
    let clean = decodeURIComponent(uri);
    if (clean.startsWith('file://')) {
      clean = clean.replace('file://', '');
    }
    return clean;
  }

  /**
   * Opens Android document picker for Excel files (.xlsx, .xls)
   */
  public static async pickAndReadXlsx(): Promise<WorkbookData | null> {
    try {
      const res = await DocumentPicker.pickSingle({
        type: [types.xls, types.xlsx],
        copyTo: 'cachesDirectory',
      });

      const rawUri = res.fileCopyUri || res.uri;
      if (!rawUri) {
        throw new Error('Selected file could not be accessed.');
      }

      const normalizedPath = this.normalizeUri(rawUri);
      const fileName = this.sanitizeFileName(res.name || 'Imported_Workbook.xlsx');

      // Verify file existence prior to reading
      const exists = await RNFS.exists(normalizedPath);
      const readPath = exists ? normalizedPath : rawUri;

      // Read file in base64 format via RNFS
      const base64Content = await RNFS.readFile(readPath, 'base64');
      if (!base64Content || base64Content.length === 0) {
        throw new Error('Selected Excel file is empty.');
      }

      const workbook = SpreadsheetService.parseXlsx(base64Content, fileName, 'base64');
      workbook.fileUri = rawUri;

      // Cache as active workbook
      SpreadsheetService.setActiveWorkbook(workbook);

      return workbook;
    } catch (err: unknown) {
      if (DocumentPicker.isCancel(err)) {
        return null;
      }
      throw err;
    }
  }

  /**
   * Saves a workbook atomically to device storage using a serialized write queue.
   */
  public static async saveWorkbook(
    workbook: WorkbookData,
    destinationPath?: string
  ): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      FileService.saveQueue = FileService.saveQueue
        .catch(() => {}) // Prevent previous queue failure from blocking subsequent saves
        .then(async () => {
          try {
            const savedPath = await FileService.executeAtomicSave(
              workbook,
              destinationPath
            );
            resolve(savedPath);
          } catch (err) {
            reject(err);
          }
        });
    });
  }

  /**
   * Executes atomic file writing using a temporary file to prevent file corruption.
   */
  private static async executeAtomicSave(
    workbook: WorkbookData,
    destinationPath?: string
  ): Promise<string> {
    const cleanFileName = this.sanitizeFileName(workbook.fileName);
    const targetDir = RNFS.DocumentDirectoryPath;

    // Ensure document directory exists
    const dirExists = await RNFS.exists(targetDir);
    if (!dirExists) {
      await RNFS.mkdir(targetDir);
    }

    const targetPath = destinationPath || `${targetDir}/${cleanFileName}`;
    const tempPath = `${targetPath}.tmp.${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

    const base64Data = SpreadsheetService.exportToXlsxBase64(workbook);

    try {
      // Pre-check available device storage
      try {
        const fsInfo = await RNFS.getFSInfo();
        if (fsInfo && typeof fsInfo.freeSpace === 'number' && fsInfo.freeSpace < 2 * 1024 * 1024) {
          throw new Error('Device storage is critically low (less than 2MB free). Please free up space and try again.');
        }
      } catch (fsErr) {
        if (fsErr instanceof Error && fsErr.message.includes('critically low')) {
          throw fsErr;
        }
      }

      // 1. Write to temporary staging file
      await RNFS.writeFile(tempPath, base64Data, 'base64');

      // 2. Verify temporary file was written and is not empty
      const stat = await RNFS.stat(tempPath);
      if (Number(stat.size) <= 0) {
        throw new Error('Saved file size is 0 bytes. Disk may be full.');
      }

      // 3. Atomically replace target file
      const targetExists = await RNFS.exists(targetPath);
      if (targetExists) {
        await RNFS.unlink(targetPath);
      }
      await RNFS.moveFile(tempPath, targetPath);

      // Keep in-memory cache synchronized
      SpreadsheetService.setActiveWorkbook(workbook);

      // Automatically persist saved file metadata to DatabaseService
      try {
        const { DatabaseService } = require('./DatabaseService');
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const now = new Date();
        const formattedDate = `${now.getDate().toString().padStart(2, '0')} ${months[now.getMonth()]} ${now.getFullYear()}`;
        const rowCount = workbook.sheets?.reduce((acc: number, s: any) => acc + (s.rows?.length || 0), 0) || 0;
        await DatabaseService.addOrUpdateRecentFile({
          fileName: cleanFileName,
          filePath: targetPath,
          lastOpenedTs: Date.now(),
          lastOpened: formattedDate,
          rowCount,
        });
      } catch (dbErr) {
        console.warn('DatabaseService auto-record error:', dbErr);
      }

      return targetPath;
    } catch (err) {
      // Clean up temporary file if write or move failed
      try {
        const tempStillExists = await RNFS.exists(tempPath);
        if (tempStillExists) {
          await RNFS.unlink(tempPath);
        }
      } catch {
        // Ignore temp cleanup errors
      }
      throw err;
    }
  }
}

