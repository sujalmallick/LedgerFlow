export type ColumnType = 'text' | 'number' | 'date' | 'currency' | 'boolean';

export interface ColumnDefinition {
  id: string;
  name: string;
  type: ColumnType;
}

export interface RowData {
  id: string;
  values: Record<string, unknown>;
}

export interface WorksheetData {
  name: string;
  columns: ColumnDefinition[];
  rows: RowData[];
}

export interface WorkbookData {
  fileUri?: string;
  fileName: string;
  sheets: WorksheetData[];
  activeSheetIndex: number;
}

export interface ISpreadsheetService {
  addColumn(column: ColumnDefinition): void;
  deleteColumn(columnId: string): void;
  renameColumn(columnId: string, newName: string): void;
  reorderColumn(columnId: string, newIndex: number): void;
  addRow(values: Record<string, unknown>): void;
  deleteRow(rowId: string): void;
  updateCell(rowId: string, columnId: string, value: unknown): void;
}
