import * as XLSX from 'xlsx';
import {
  ColumnDefinition,
  ColumnType,
  RowData,
  WorksheetData,
  WorkbookData,
} from '../../types/spreadsheet';
import { CANONICAL_FIELDS } from '../../constants/fields';

export class SpreadsheetService {
  private static activeWorkbook: WorkbookData | null = null;

  public static setActiveWorkbook(wb: WorkbookData | null): void {
    this.activeWorkbook = wb;
  }

  public static getActiveWorkbook(): WorkbookData | null {
    return this.activeWorkbook;
  }

  /**
   * Sanitizes sheet names for strict Microsoft Excel specification compatibility.
   * Disallows \ / ? * [ ] : and limits length to 31 chars.
   */
  public static sanitizeSheetName(name: string, fallbackIndex: number = 0): string {
    const cleaned = (name || '')
      .replace(/[\\/?*:[\]]/g, ' ')
      .trim()
      .slice(0, 31);
    return cleaned || `Sheet${fallbackIndex + 1}`;
  }

  /**
   * Safely retrieves a shallow copy of target sheet with valid columns and rows arrays.
   */
  private static getSafeSheet(
    workbook: WorkbookData,
    sheetIndex: number
  ): { targetSheet: WorksheetData; safeIndex: number } | null {
    if (!workbook.sheets || workbook.sheets.length === 0) return null;
    const safeIndex =
      sheetIndex >= 0 && sheetIndex < workbook.sheets.length
        ? sheetIndex
        : workbook.activeSheetIndex >= 0 &&
          workbook.activeSheetIndex < workbook.sheets.length
        ? workbook.activeSheetIndex
        : 0;
    const existing = workbook.sheets[safeIndex];
    if (!existing) return null;

    return {
      targetSheet: {
        name: existing.name || `Sheet${safeIndex + 1}`,
        columns: Array.isArray(existing.columns) ? [...existing.columns] : [],
        rows: Array.isArray(existing.rows) ? [...existing.rows] : [],
      },
      safeIndex,
    };
  }

  /**
   * Generates a stable unique column ID from a column name and index
   */
  private static generateColumnId(name: string, index: number): string {
    const cleanName = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
    return `col_${cleanName || 'col'}_${index}`;
  }

  /**
   * Generates a unique row ID
   */
  public static generateRowId(): string {
    return `row_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }


  /**
   * Creates a blank workbook with optional default columns
   */
  public static createBlankWorkbook(
    fileName: string = 'Untitled_Workbook.xlsx',
    sheetName: string = 'Sheet1',
    initialColumns?: ColumnDefinition[]
  ): WorkbookData {
    const defaultCols: ColumnDefinition[] = initialColumns || [
      { id: 'col_challan_no_0', name: 'Challan No', type: 'text' },
      { id: 'col_date_1', name: 'Date', type: 'date' },
      { id: 'col_vehicle_no_2', name: 'Vehicle Number', type: 'text' },
      { id: 'col_driver_name_3', name: 'Driver Name', type: 'text' },
      { id: 'col_amount_4', name: 'Amount', type: 'currency' },
    ];

    return {
      fileName,
      activeSheetIndex: 0,
      sheets: [
        {
          name: sheetName,
          columns: defaultCols,
          rows: [],
        },
      ],
    };
  }

  /**
   * Creates a blank workbook tailored for purchase bills and commercial invoices
   */
  public static createInvoiceWorkbook(
    fileName: string = 'Invoices_Register.xlsx',
    sheetName: string = 'Invoices'
  ): WorkbookData {
    const defaultCols: ColumnDefinition[] = [
      { id: 'col_inv_no_0', name: 'Invoice No', type: 'text' },
      { id: 'col_date_1', name: 'Date', type: 'date' },
      { id: 'col_vendor_2', name: 'Vendor Name', type: 'text' },
      { id: 'col_gstin_3', name: 'GSTIN', type: 'text' },
      { id: 'col_tax_4', name: 'Tax Amount', type: 'currency' },
      { id: 'col_amount_5', name: 'Total Amount', type: 'currency' },
      { id: 'col_items_6', name: 'Items / Description', type: 'text' },
    ];

    return {
      fileName,
      activeSheetIndex: 0,
      sheets: [
        {
          name: sheetName,
          columns: defaultCols,
          rows: [],
        },
      ],
    };
  }

  /**
   * Creates a workbook tailored for CHALLAN_SATYABHAMA with columns:
   * Date, Sl. No., Challan No., Vehicle No., Quantity (MT), HSD
   */
  public static createSatyabhamaWorkbook(
    fileName: string = 'CHALLAN_SATYABHAMA.xlsx',
    sheetName: string = 'CHALLAN_SATYABHAMA'
  ): WorkbookData {
    const defaultCols: ColumnDefinition[] = [
      { id: 'col_date_0', name: 'Date', type: 'date' },
      { id: 'col_sl_no_1', name: 'Sl. No.', type: 'number' },
      { id: 'col_challan_no_2', name: 'Challan No.', type: 'text' },
      { id: 'col_vehicle_no_3', name: 'Vehicle No.', type: 'text' },
      { id: 'col_qty_mt_4', name: 'Quantity (MT)', type: 'number' },
      { id: 'col_hsd_5', name: 'HSD', type: 'number' },
    ];

    return {
      fileName,
      activeSheetIndex: 0,
      sheets: [
        {
          name: sheetName,
          columns: defaultCols,
          rows: [],
        },
      ],
    };
  }

  /**
   * Creates a pre-populated sample challan workbook for testing
   */
  public static createSampleWorkbook(): WorkbookData {
    const columns: ColumnDefinition[] = [
      { id: 'col_challan_no_0', name: 'Challan No', type: 'text' },
      { id: 'col_date_1', name: 'Date', type: 'date' },
      { id: 'col_vehicle_no_2', name: 'Vehicle Number', type: 'text' },
      { id: 'col_driver_name_3', name: 'Driver Name', type: 'text' },
      { id: 'col_amount_4', name: 'Amount', type: 'currency' },
    ];

    const sampleRows: RowData[] = [
      {
        id: 'row_sample_1',
        values: {
          col_challan_no_0: 'CH-10240',
          col_date_1: '23/09/2026',
          col_vehicle_no_2: 'OD02AB1234',
          col_driver_name_3: 'Rakesh Kumar',
          col_amount_4: 1850,
        },
      },
      {
        id: 'row_sample_2',
        values: {
          col_challan_no_0: 'CH-10241',
          col_date_1: '24/09/2026',
          col_vehicle_no_2: 'MH12DE5678',
          col_driver_name_3: 'Suresh Patil',
          col_amount_4: 2400,
        },
      },
      {
        id: 'row_sample_3',
        values: {
          col_challan_no_0: 'CH-10242',
          col_date_1: '25/09/2026',
          col_vehicle_no_2: 'DL01CD9988',
          col_driver_name_3: 'Amit Singh',
          col_amount_4: 950,
        },
      },
    ];

    return {
      fileName: 'Sample_Challans.xlsx',
      activeSheetIndex: 0,
      sheets: [
        {
          name: 'Challan Records',
          columns,
          rows: sampleRows,
        },
        {
          name: 'Summary',
          columns: [
            { id: 'col_category_0', name: 'Category', type: 'text' },
            { id: 'col_total_1', name: 'Total', type: 'number' },
          ],
          rows: [
            {
              id: 'row_sum_1',
              values: {
                col_category_0: 'Total Entries',
                col_total_1: 3,
              },
            },
          ],
        },
      ],
    };
  }

  /**
   * Parses an Excel binary/base64 string into our normalized WorkbookData model
   */
  public static parseXlsx(
    data: string | ArrayBuffer,
    fileName: string = 'Imported_Workbook.xlsx',
    type: 'base64' | 'binary' | 'buffer' | 'array' = 'base64'
  ): WorkbookData {
    if (!data || (typeof data === 'string' && data.trim() === '')) {
      throw new Error('This Excel file could not be opened. It is empty or contains zero bytes.');
    }

    let wb: XLSX.WorkBook;
    try {
      wb = XLSX.read(data, {
        type,
        cellDates: true,
        cellNF: true,
        cellText: true,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('password') || msg.includes('encrypted')) {
        throw new Error('This Excel file is password-protected or encrypted. Please open an unencrypted workbook.');
      }
      throw new Error('This Excel file could not be opened. It may be corrupted, encrypted, or unsupported.');
    }

    const sheets: WorksheetData[] = [];

    if (!wb || !wb.SheetNames || wb.SheetNames.length === 0) {
      return {
        fileName,
        activeSheetIndex: 0,
        sheets: [{ name: 'Sheet1', columns: [], rows: [] }],
      };
    }

    wb.SheetNames.forEach((sheetName) => {
      const ws = wb.Sheets[sheetName];
      if (!ws) {
        sheets.push({
          name: sheetName,
          columns: [],
          rows: [],
        });
        return;
      }

      const rawRows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

      if (!rawRows || rawRows.length === 0) {
        sheets.push({
          name: sheetName,
          columns: [],
          rows: [],
        });
        return;
      }

      // First row represents column headers
      const rawHeaders = (rawRows[0] as unknown[]) || [];
      const columns: ColumnDefinition[] = rawHeaders.map((header, idx) => {
        const headerName =
          header !== undefined && header !== null && String(header).trim() !== ''
            ? String(header).trim()
            : `Column ${idx + 1}`;
        const colId = this.generateColumnId(headerName, idx);
        return {
          id: colId,
          name: headerName,
          type: this.inferColumnType(rawRows.slice(1), idx, headerName),
        };
      });

      // Subsequent rows are data
      const rows: RowData[] = [];
      for (let r = 1; r < rawRows.length; r++) {
        const rowArray = rawRows[r] as unknown[];
        if (!rowArray || rowArray.length === 0) continue;

        const rowValues: Record<string, unknown> = {};
        let hasValue = false;

        columns.forEach((col, cIdx) => {
          const val = rowArray[cIdx];
          const cellRef = XLSX.utils.encode_cell({ r, c: cIdx });
          const rawCell = ws ? ws[cellRef] : undefined;
          const normalized = this.normalizeCellValue(val, rawCell, col.name, col.type);

          if (normalized !== undefined && normalized !== null && normalized !== '') {
            rowValues[col.id] = normalized;
            hasValue = true;
          } else {
            rowValues[col.id] = '';
          }
        });

        if (hasValue) {
          rows.push({
            id: this.generateRowId(),
            values: rowValues,
          });
        }
      }

      sheets.push({
        name: sheetName,
        columns,
        rows,
      });
    });

    return {
      fileName,
      activeSheetIndex: 0,
      sheets: sheets.length > 0 ? sheets : [
        { name: 'Sheet1', columns: [], rows: [] },
      ],
    };
  }

  /**
   * Normalizes an individual cell value, formatting Excel dates, numbers with units, etc.
   */
  public static normalizeCellValue(
    val: unknown,
    cell: XLSX.CellObject | undefined,
    colName: string,
    colType: ColumnType
  ): unknown {
    if (val === undefined || val === null) return '';

    const isDateCol =
      colType === 'date' ||
      /\b(date|dt|dated)\b/i.test(colName) ||
      (cell?.z ? XLSX.SSF.is_date(cell.z) : false) ||
      cell?.t === 'd';

    // 1. JS Date object (e.g. from XLSX cellDates: true)
    if (val instanceof Date) {
      if (isNaN(val.getTime())) return '';
      const day = String(val.getUTCDate()).padStart(2, '0');
      const month = String(val.getUTCMonth() + 1).padStart(2, '0');
      const year = val.getUTCFullYear();
      return `${day}/${month}/${year}`;
    }

    // 2. Excel serial number in a date column or cell with date format
    if (typeof val === 'number') {
      if (isDateCol && val >= 10000 && val <= 90000) {
        try {
          const parsed = XLSX.SSF.parse_date_code(val);
          if (parsed && parsed.y && parsed.m && parsed.d) {
            const day = String(parsed.d).padStart(2, '0');
            const month = String(parsed.m).padStart(2, '0');
            return `${day}/${month}/${parsed.y}`;
          }
        } catch {
          // Ignore
        }
      }
    }

    // 3. String containing a 5-digit number in a date column
    if (typeof val === 'string' && isDateCol && /^\d{5}$/.test(val.trim())) {
      const num = parseInt(val.trim(), 10);
      if (num >= 10000 && num <= 90000) {
        try {
          const parsed = XLSX.SSF.parse_date_code(num);
          if (parsed && parsed.y && parsed.m && parsed.d) {
            const day = String(parsed.d).padStart(2, '0');
            const month = String(parsed.m).padStart(2, '0');
            return `${day}/${month}/${parsed.y}`;
          }
        } catch {
          // Ignore
        }
      }
    }

    // 4. Formatted string with metric/unit in cell.w (e.g. '13,500 Ltr' while cell.v is 13500)
    if (cell && cell.w && typeof cell.v === 'number' && typeof cell.w === 'string') {
      if (/[a-zA-Z]/.test(cell.w)) {
        return cell.w.trim();
      }
    }

    return val;
  }

  /**
   * Infers column data type based on sample values and header name
   */
  private static inferColumnType(
    sampleRows: unknown[][],
    colIndex: number,
    headerName?: string
  ): ColumnType {
    const cleanHeader = (headerName || '').trim().toLowerCase();

    // 1. Explicit Date column
    if (/\b(date|dt|dated)\b/i.test(cleanHeader)) {
      return 'date';
    }

    // 2. Identifier / sequence column -> treat as text so it's not summed
    if (
      /\b(sl|s\.no|sl\.no|sr\.no|no|num|number|challan\s*no|invoice\s*no|bill\s*no|token|id|code|phone|mobile|pin|zip|vehicle)\b/i.test(
        cleanHeader
      ) &&
      !/\b(amount|amt|price|cost|qty|quantity|weight|total)\b/i.test(cleanHeader)
    ) {
      return 'text';
    }

    // 3. Currency column: has currency header without physical metric units
    const hasCurrencyHeader =
      /\b(amount|amt|price|cost|fee|fine|fare|salary|balance|debit|credit|paid|due|rupee|inr|rs|₹|\$|€|£)\b/i.test(
        cleanHeader
      ) &&
      !/\b(mt|kg|ltr|ltrs|ton|tons|qty|quantity|count|nos|pcs|hours|hrs|meter|mtr)\b/i.test(
        cleanHeader
      );

    let numberCount = 0;
    let booleanCount = 0;
    let dateCount = 0;
    let currencyCount = 0;
    let totalChecked = 0;

    for (const row of sampleRows.slice(0, 30)) {
      if (!row || row[colIndex] === undefined || row[colIndex] === null || row[colIndex] === '') {
        continue;
      }
      totalChecked++;
      const val = row[colIndex];
      const strVal = String(val).trim();

      if (val instanceof Date) {
        dateCount++;
      } else if (
        typeof val === 'string' &&
        (/^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/.test(strVal) || /^\d{4}[/-]\d{2}[/-]\d{2}$/.test(strVal))
      ) {
        dateCount++;
      } else if (typeof val === 'number') {
        numberCount++;
      } else if (typeof val === 'boolean') {
        booleanCount++;
      } else if (typeof val === 'string') {
        if (/^[₹$€£]\s*[\d,]+(\.\d+)?$/.test(strVal) || /^(rs|inr)\.?\s*[\d,]+(\.\d+)?$/i.test(strVal)) {
          currencyCount++;
        } else if (/^-?[\d,]+(\.\d+)?\s*(ltr|ltrs|mt|kg|g|pcs|nos|hrs)?$/i.test(strVal)) {
          numberCount++;
        }
      }
    }

    if (totalChecked > 0 && dateCount / totalChecked > 0.5) return 'date';
    if (hasCurrencyHeader || (totalChecked > 0 && currencyCount / totalChecked > 0.5)) return 'currency';
    if (totalChecked > 0 && numberCount / totalChecked > 0.6) return 'number';
    if (totalChecked > 0 && booleanCount / totalChecked > 0.8) return 'boolean';

    return 'text';
  }

  /**
   * Sanitizes a cell value for safe export, preventing CSV/Excel Formula Injection (CWE-1236).
   * Distinguishes between legitimate negative numeric values and formula triggers (=, +, -, @, \t, \r).
   */
  public static sanitizeCellValueForExport(val: unknown): unknown {
    if (val === undefined || val === null) {
      return '';
    }
    if (typeof val === 'number' || typeof val === 'boolean') {
      return val;
    }
    const str = String(val);
    if (!str) return '';

    // Check if the string is a pure valid number (including negative numbers like "-500" or "-500.25")
    const isPureNumber = /^-?\d+(\.\d+)?$/.test(str.trim());
    if (isPureNumber) {
      return str;
    }

    const firstChar = str.charAt(0);
    const trimmed = str.trimStart();
    const firstTrimmedChar = trimmed.charAt(0);

    if (
      firstChar === '\t' ||
      firstChar === '\r' ||
      firstTrimmedChar === '=' ||
      firstTrimmedChar === '+' ||
      firstTrimmedChar === '-' ||
      firstTrimmedChar === '@'
    ) {
      return `'${str}`;
    }

    return str;
  }

  /**
   * Serializes WorkbookData into a base64 encoded .xlsx file
   */
  public static exportToXlsxBase64(workbook: WorkbookData): string {
    const wb = XLSX.utils.book_new();
    const usedSheetNames = new Set<string>();

    (workbook.sheets || []).forEach((sheet, sIdx) => {
      // Build 2D array: header row followed by data rows
      const headerRow = (sheet.columns || []).map((c) =>
        String(this.sanitizeCellValueForExport(c.name || 'Column'))
      );
      const dataRows = (sheet.rows || []).map((row) =>
        (sheet.columns || []).map((col) =>
          this.sanitizeCellValueForExport(row.values?.[col.id] ?? '')
        )
      );

      const sheetData = [headerRow, ...dataRows];
      const ws = XLSX.utils.aoa_to_sheet(sheetData);

      // Clean sheet name according to Excel rules
      let cleanName = this.sanitizeSheetName(sheet.name, sIdx);
      let uniqueName = cleanName;
      let counter = 1;
      while (usedSheetNames.has(uniqueName.toLowerCase())) {
        uniqueName = `${cleanName.slice(0, 27)}_${counter}`;
        counter++;
      }
      usedSheetNames.add(uniqueName.toLowerCase());

      XLSX.utils.book_append_sheet(wb, ws, uniqueName);
    });

    return XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
  }

  /**
   * Updates an individual cell value
   */
  public static updateCell(
    workbook: WorkbookData,
    sheetIndex: number,
    rowId: string,
    columnId: string,
    newValue: unknown
  ): WorkbookData {
    const safe = this.getSafeSheet(workbook, sheetIndex);
    if (!safe) return workbook;
    const { targetSheet, safeIndex } = safe;

    targetSheet.rows = targetSheet.rows.map((row) => {
      if (row.id === rowId) {
        return {
          ...row,
          values: {
            ...row.values,
            [columnId]: newValue,
          },
        };
      }
      return row;
    });

    const updatedSheets = [...workbook.sheets];
    updatedSheets[safeIndex] = targetSheet;

    return {
      ...workbook,
      sheets: updatedSheets,
    };
  }

  /**
   * Appends a new row to the active sheet
   */
  public static addRow(
    workbook: WorkbookData,
    sheetIndex: number,
    values: Record<string, unknown> = {}
  ): { updatedWorkbook: WorkbookData; newRow: RowData } {
    const safe = this.getSafeSheet(workbook, sheetIndex);
    const safeValues: Record<string, unknown> = { ...values };

    if (!safe) {
      const newRow: RowData = {
        id: this.generateRowId(),
        values: safeValues,
      };
      const defaultSheet: WorksheetData = {
        name: 'Sheet1',
        columns: [],
        rows: [newRow],
      };
      const updatedWb: WorkbookData = {
        ...workbook,
        sheets: [defaultSheet],
        activeSheetIndex: 0,
      };
      this.setActiveWorkbook(updatedWb);
      return {
        updatedWorkbook: updatedWb,
        newRow,
      };
    }

    const { targetSheet, safeIndex } = safe;

    // Automatically resolve column ID mappings if values were passed under field keys
    targetSheet.columns.forEach((col) => {
      if (safeValues[col.id] === undefined || safeValues[col.id] === null || safeValues[col.id] === '') {
        if (safeValues[col.name] !== undefined) {
          safeValues[col.id] = safeValues[col.name];
        } else {
          for (const [key, def] of Object.entries(CANONICAL_FIELDS)) {
            const matchesCol =
              col.name.toLowerCase() === def.label.toLowerCase() ||
              def.aliases.some((a) => a.toLowerCase() === col.name.toLowerCase()) ||
              col.id.toLowerCase().includes(key.toLowerCase());
            if (matchesCol && safeValues[key] !== undefined) {
              safeValues[col.id] = safeValues[key];
              break;
            }
          }
        }
      }
    });

    // Auto-populate Sl. No. if column exists and value not provided
    const slNoCol = targetSheet.columns.find((c) =>
      /\b(sl|s\.no|sl\.no|sr\.no)\b/i.test(c.name.toLowerCase())
    );
    if (
      slNoCol &&
      (safeValues[slNoCol.id] === undefined ||
        safeValues[slNoCol.id] === null ||
        safeValues[slNoCol.id] === '')
    ) {
      safeValues[slNoCol.id] = targetSheet.rows.length + 1;
    }

    const newRow: RowData = {
      id: this.generateRowId(),
      values: safeValues,
    };

    targetSheet.rows = [...targetSheet.rows, newRow];
    const updatedSheets = [...workbook.sheets];
    updatedSheets[safeIndex] = targetSheet;

    const updatedWorkbook: WorkbookData = {
      ...workbook,
      sheets: updatedSheets,
    };

    this.setActiveWorkbook(updatedWorkbook);

    return {
      updatedWorkbook,
      newRow,
    };
  }

  /**
   * Deletes a row by ID
   */
  public static deleteRow(
    workbook: WorkbookData,
    sheetIndex: number,
    rowId: string
  ): WorkbookData {
    const safe = this.getSafeSheet(workbook, sheetIndex);
    if (!safe) return workbook;
    const { targetSheet, safeIndex } = safe;

    targetSheet.rows = targetSheet.rows.filter((r) => r.id !== rowId);
    const updatedSheets = [...workbook.sheets];
    updatedSheets[safeIndex] = targetSheet;

    return {
      ...workbook,
      sheets: updatedSheets,
    };
  }

  /**
   * Adds a new column
   */
  public static addColumn(
    workbook: WorkbookData,
    sheetIndex: number,
    columnName: string,
    type: ColumnType = 'text'
  ): WorkbookData {
    const safe = this.getSafeSheet(workbook, sheetIndex);
    if (!safe) return workbook;
    const { targetSheet, safeIndex } = safe;
    let colId = this.generateColumnId(columnName, targetSheet.columns.length);
    const existingColIds = new Set(targetSheet.columns.map((c) => c.id));
    let colCounter = targetSheet.columns.length;
    while (existingColIds.has(colId)) {
      colCounter++;
      colId = this.generateColumnId(columnName, colCounter);
    }

    const newColumn: ColumnDefinition = {
      id: colId,
      name: columnName,
      type,
    };

    targetSheet.columns = [...targetSheet.columns, newColumn];
    const updatedSheets = [...workbook.sheets];
    updatedSheets[safeIndex] = targetSheet;

    return {
      ...workbook,
      sheets: updatedSheets,
    };
  }

  /**
   * Deletes a column and its cell values
   */
  public static deleteColumn(
    workbook: WorkbookData,
    sheetIndex: number,
    columnId: string
  ): WorkbookData {
    const safe = this.getSafeSheet(workbook, sheetIndex);
    if (!safe) return workbook;
    const { targetSheet, safeIndex } = safe;

    targetSheet.columns = targetSheet.columns.filter((c) => c.id !== columnId);
    targetSheet.rows = targetSheet.rows.map((row) => {
      const newVals = { ...row.values };
      delete newVals[columnId];
      return { ...row, values: newVals };
    });

    const updatedSheets = [...workbook.sheets];
    updatedSheets[safeIndex] = targetSheet;

    return {
      ...workbook,
      sheets: updatedSheets,
    };
  }

  /**
   * Renames a column
   */
  public static renameColumn(
    workbook: WorkbookData,
    sheetIndex: number,
    columnId: string,
    newName: string
  ): WorkbookData {
    const safe = this.getSafeSheet(workbook, sheetIndex);
    if (!safe) return workbook;
    const { targetSheet, safeIndex } = safe;

    targetSheet.columns = targetSheet.columns.map((c) =>
      c.id === columnId ? { ...c, name: newName } : c
    );

    const updatedSheets = [...workbook.sheets];
    updatedSheets[safeIndex] = targetSheet;

    return {
      ...workbook,
      sheets: updatedSheets,
    };
  }

  /**
   * Reorders a column to a new index position
   */
  public static reorderColumn(
    workbook: WorkbookData,
    sheetIndex: number,
    columnId: string,
    newIndex: number
  ): WorkbookData {
    const safe = this.getSafeSheet(workbook, sheetIndex);
    if (!safe) return workbook;
    const { targetSheet, safeIndex } = safe;

    const currentIndex = targetSheet.columns.findIndex((c) => c.id === columnId);
    if (currentIndex === -1 || newIndex < 0 || newIndex >= targetSheet.columns.length) {
      return workbook;
    }

    const columns = [...targetSheet.columns];
    const [movedCol] = columns.splice(currentIndex, 1);
    columns.splice(newIndex, 0, movedCol);

    targetSheet.columns = columns;
    const updatedSheets = [...workbook.sheets];
    updatedSheets[safeIndex] = targetSheet;

    return {
      ...workbook,
      sheets: updatedSheets,
    };
  }
}

