import { WorkbookData } from '../../types/spreadsheet';

/**
 * In-memory session store for active workbooks.
 * Prevents Android `TransactionTooLargeException` by allowing screens to share
 * workbook references via session keys rather than serializing huge objects into navigation params.
 */
export class WorkbookSessionStore {
  private static store = new Map<string, WorkbookData>();
  private static activeKey: string | null = null;

  /**
   * Sets or updates a workbook in the session store
   */
  public static set(key: string, workbook: WorkbookData): void {
    if (!key) return;
    this.store.set(key, workbook);
    this.activeKey = key;
  }

  /**
   * Gets a workbook by key, or falls back to active workbook if key is omitted
   */
  public static get(key?: string): WorkbookData | undefined {
    if (key && this.store.has(key)) {
      return this.store.get(key);
    }
    if (this.activeKey && this.store.has(this.activeKey)) {
      return this.store.get(this.activeKey);
    }
    return undefined;
  }

  /**
   * Sets the globally active workbook
   */
  public static setActive(workbook: WorkbookData): string {
    const key = workbook.fileName || `session_${Date.now()}`;
    this.set(key, workbook);
    return key;
  }

  /**
   * Gets the globally active workbook
   */
  public static getActive(): WorkbookData | undefined {
    return this.get();
  }

  /**
   * Removes a specific workbook from the session store
   */
  public static remove(key: string): void {
    this.store.delete(key);
    if (this.activeKey === key) {
      this.activeKey = null;
    }
  }

  /**
   * Clears all workbooks from the session store
   */
  public static clear(): void {
    this.store.clear();
    this.activeKey = null;
  }
}
