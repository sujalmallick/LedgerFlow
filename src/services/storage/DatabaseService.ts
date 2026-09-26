import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  RecentWorkbookRecord,
  ScanHistoryRecord,
  FieldMappingRecord,
  ColumnAliasRecord,
} from '../../types/database';
import { ExtractionResult } from '../../types/extraction';

export interface RecentFile {
  id: string;
  fileName: string;
  filePath: string;      // absolute path on device
  lastOpened: string;    // human-readable e.g. '26 Sep 2026'
  lastOpenedTs: number;  // timestamp ms for sorting
  rowCount: number;
}

const STORAGE_KEYS = {
  RECENT_FILES: '@ledgerflow_recent_files',
  RECENT_WORKBOOKS: '@ledgerflow_recent_workbooks',
  SCAN_HISTORY: '@ledgerflow_scan_history',
  FIELD_MAPPINGS: '@ledgerflow_field_mappings',
  COLUMN_ALIASES: '@ledgerflow_column_aliases',
  USER_PREFERENCES: '@ledgerflow_user_preferences',
};

const MAX_RECENT = 20;

export class DatabaseService {
  // ── Recent Files (Used by HomeScreen & FileService) ──
  public static async getRecentFiles(): Promise<RecentFile[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.RECENT_FILES);
      if (!data) return [];
      const parsed: RecentFile[] = JSON.parse(data);
      return parsed.sort((a, b) => b.lastOpenedTs - a.lastOpenedTs);
    } catch {
      return [];
    }
  }

  public static async addOrUpdateRecentFile(
    file: Omit<RecentFile, 'id'> & { id?: string }
  ): Promise<void> {
    try {
      const current = await this.getRecentFiles();
      const id = file.id || Date.now().toString();

      const newFile: RecentFile = {
        ...file,
        id,
      };

      const existingIndex = current.findIndex((f) => f.id === id || f.fileName === file.fileName);
      if (existingIndex >= 0) {
        current[existingIndex] = { ...current[existingIndex], ...newFile };
      } else {
        current.push(newFile);
      }

      current.sort((a, b) => b.lastOpenedTs - a.lastOpenedTs);
      const trimmed = current.slice(0, MAX_RECENT);
      await AsyncStorage.setItem(STORAGE_KEYS.RECENT_FILES, JSON.stringify(trimmed));
    } catch (e) {
      console.warn('Failed to add/update recent file:', e);
    }
  }

  public static async removeRecentFile(id: string): Promise<void> {
    try {
      const current = await this.getRecentFiles();
      const updated = current.filter((f) => f.id !== id);
      await AsyncStorage.setItem(STORAGE_KEYS.RECENT_FILES, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to remove recent file:', e);
    }
  }

  public static async renameRecentFile(
    id: string,
    newFileName: string,
    newFilePath?: string
  ): Promise<void> {
    try {
      const current = await this.getRecentFiles();
      const file = current.find((f) => f.id === id);
      if (file) {
        file.fileName = newFileName;
        if (newFilePath) {
          file.filePath = newFilePath;
        }
        await AsyncStorage.setItem(STORAGE_KEYS.RECENT_FILES, JSON.stringify(current));
      }
    } catch (e) {
      console.warn('Failed to rename recent file:', e);
    }
  }

  public static async clearAllRecent(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.RECENT_FILES);
    } catch (e) {
      console.warn('Failed to clear recent files:', e);
    }
  }

  // ── Recent Workbooks (Legacy / Database Record Type) ──
  public static async getRecentWorkbooks(): Promise<RecentWorkbookRecord[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.RECENT_WORKBOOKS);
      if (!data) return [];
      return JSON.parse(data) as RecentWorkbookRecord[];
    } catch {
      return [];
    }
  }

  public static async saveRecentWorkbook(
    fileUri: string,
    displayName: string
  ): Promise<RecentWorkbookRecord> {
    const list = await this.getRecentWorkbooks();
    const existingIndex = list.findIndex(
      (item) => item.file_uri === fileUri || item.display_name === displayName
    );

    const now = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    let updatedRecord: RecentWorkbookRecord;

    if (existingIndex >= 0) {
      updatedRecord = {
        ...list[existingIndex],
        last_opened_at: `Today, ${now}`,
      };
      list.splice(existingIndex, 1);
      list.unshift(updatedRecord);
    } else {
      updatedRecord = {
        id: Date.now(),
        file_uri: fileUri,
        display_name: displayName,
        last_opened_at: `Today, ${now}`,
      };
      list.unshift(updatedRecord);
    }

    const trimmed = list.slice(0, 15);
    await AsyncStorage.setItem(
      STORAGE_KEYS.RECENT_WORKBOOKS,
      JSON.stringify(trimmed)
    );
    return updatedRecord;
  }

  public static async removeRecentWorkbook(id: number): Promise<void> {
    try {
      const list = await this.getRecentWorkbooks();
      const filtered = list.filter((item) => item.id !== id);
      await AsyncStorage.setItem(
        STORAGE_KEYS.RECENT_WORKBOOKS,
        JSON.stringify(filtered)
      );
    } catch (err) {
      console.warn('Failed to remove recent workbook:', err);
    }
  }

  // ── Scan History ──
  public static async recordScan(
    workbookId: number,
    extraction: ExtractionResult,
    committed: boolean = false
  ): Promise<ScanHistoryRecord> {
    const history = await this.getScanHistory();
    const record: ScanHistoryRecord = {
      id: Date.now(),
      workbook_id: workbookId,
      scanned_at: new Date().toISOString(),
      extraction_json: JSON.stringify(extraction),
      committed: committed ? 1 : 0,
    };

    history.unshift(record);
    const trimmed = history.slice(0, 100);
    await AsyncStorage.setItem(
      STORAGE_KEYS.SCAN_HISTORY,
      JSON.stringify(trimmed)
    );
    return record;
  }

  public static async markScanCommitted(scanId: number): Promise<void> {
    const history = await this.getScanHistory();
    const updated = history.map((item) =>
      item.id === scanId ? { ...item, committed: 1 } : item
    );
    await AsyncStorage.setItem(
      STORAGE_KEYS.SCAN_HISTORY,
      JSON.stringify(updated)
    );
  }

  public static async getScanHistory(
    workbookId?: number
  ): Promise<ScanHistoryRecord[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.SCAN_HISTORY);
      if (!data) return [];
      const list = JSON.parse(data) as ScanHistoryRecord[];
      if (workbookId !== undefined) {
        return list.filter((item) => item.workbook_id === workbookId);
      }
      return list;
    } catch {
      return [];
    }
  }

  // ── Field Mappings ──
  public static async saveFieldMapping(
    workbookId: number,
    fieldKey: string,
    columnId: string
  ): Promise<void> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.FIELD_MAPPINGS);
      let mappings: FieldMappingRecord[] = data ? JSON.parse(data) : [];

      const existingIndex = mappings.findIndex(
        (m) => m.workbook_id === workbookId && m.field_key === fieldKey
      );

      if (existingIndex >= 0) {
        mappings[existingIndex].column_id = columnId;
      } else {
        mappings.push({
          id: Date.now(),
          workbook_id: workbookId,
          field_key: fieldKey,
          column_id: columnId,
        });
      }

      await AsyncStorage.setItem(
        STORAGE_KEYS.FIELD_MAPPINGS,
        JSON.stringify(mappings)
      );
    } catch (err) {
      console.warn('Failed to save field mapping:', err);
    }
  }

  public static async getFieldMappings(
    workbookId: number
  ): Promise<FieldMappingRecord[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.FIELD_MAPPINGS);
      if (!data) return [];
      const mappings: FieldMappingRecord[] = JSON.parse(data);
      return mappings.filter((m) => m.workbook_id === workbookId);
    } catch {
      return [];
    }
  }

  // ── Column Aliases ──
  public static async saveColumnAlias(
    canonicalField: string,
    alias: string
  ): Promise<void> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.COLUMN_ALIASES);
      let aliases: ColumnAliasRecord[] = data ? JSON.parse(data) : [];

      const exists = aliases.some(
        (a) =>
          a.canonical_field === canonicalField &&
          a.alias.toLowerCase() === alias.toLowerCase()
      );

      if (!exists) {
        aliases.push({
          id: Date.now(),
          canonical_field: canonicalField,
          alias,
        });
        await AsyncStorage.setItem(
          STORAGE_KEYS.COLUMN_ALIASES,
          JSON.stringify(aliases)
        );
      }
    } catch (err) {
      console.warn('Failed to save column alias:', err);
    }
  }

  public static async getColumnAliases(): Promise<ColumnAliasRecord[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.COLUMN_ALIASES);
      if (!data) return [];
      return JSON.parse(data) as ColumnAliasRecord[];
    } catch {
      return [];
    }
  }

  // ── User Preferences ──
  public static async setPreference(key: string, value: string): Promise<void> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.USER_PREFERENCES);
      let prefs: Record<string, string> = data ? JSON.parse(data) : {};
      prefs[key] = value;
      await AsyncStorage.setItem(
        STORAGE_KEYS.USER_PREFERENCES,
        JSON.stringify(prefs)
      );
    } catch (err) {
      console.warn('Failed to set preference:', err);
    }
  }

  public static async getPreference(key: string): Promise<string | null> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.USER_PREFERENCES);
      if (!data) return null;
      const prefs: Record<string, string> = JSON.parse(data);
      return prefs[key] || null;
    } catch {
      return null;
    }
  }
}
