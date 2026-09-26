# Data Models

## Spreadsheet model

```ts
interface ColumnDefinition {
  id: string;
  name: string;
  type: "text" | "number" | "date" | "currency" | "boolean";
}
```

Columns are never referenced by spreadsheet letters (A/B/C) internally — always by `id`.

### Spreadsheet service operations

- `addColumn(column: ColumnDefinition): void`
- `deleteColumn(columnId: string): void`
- `renameColumn(columnId: string, newName: string): void`
- `reorderColumn(columnId: string, newIndex: number): void`
- `addRow(values: Record<string, unknown>): void`
- `deleteRow(rowId: string): void`
- `updateCell(rowId: string, columnId: string, value: unknown): void`

## OCR

```ts
interface OCRService {
  recognize(imagePath: string): Promise<OCRResult>;
}

interface OCRResult {
  fullText: string;
  blocks: {
    text: string;
    boundingBox?: { x: number; y: number; width: number; height: number };
    confidence?: number;
  }[];
}
```

Implementation: Google ML Kit Text Recognition (on-device). Bounding boxes and per-block confidence are preserved when ML Kit provides them.

## Field extraction

```ts
interface FieldExtractor {
  extract(
    ocrResult: OCRResult,
    expectedFields?: string[]
  ): Promise<ExtractionResult>;
}

interface ExtractionResult {
  fields: {
    [fieldKey: string]: {
      value: string | number;
      confidence?: number;
    };
  };
}
```

Example extraction result:

```json
{
  "challan_number": "10245",
  "date": "25/09/2026",
  "vehicle_number": "OD02AB1234",
  "driver_name": "Rakesh Kumar",
  "amount": 1850
}
```

Initial implementation: rule-based (regex + heuristics). No local LLM unless proven necessary. Interface is designed so a future ONNX/TFLite local model can be swapped in without changing the spreadsheet or UI layers.

## Field mapping

Maps extraction field keys to the user's actual column names, e.g.:

- `challan_number` → `Challan No`
- `vehicle_number` → `Vehicle Number`
- `driver_name` → `Driver Name`

See `FIELD_MAPPING.md` for the alias-matching strategy.

## SQLite schema (local metadata only — not the workbook itself)

```sql
CREATE TABLE recent_workbooks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_uri TEXT NOT NULL,
  display_name TEXT,
  last_opened_at TEXT NOT NULL
);

CREATE TABLE scan_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workbook_id INTEGER REFERENCES recent_workbooks(id),
  scanned_at TEXT NOT NULL,
  extraction_json TEXT NOT NULL,
  committed INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE field_mappings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workbook_id INTEGER REFERENCES recent_workbooks(id),
  field_key TEXT NOT NULL,
  column_id TEXT NOT NULL
);

CREATE TABLE column_aliases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  canonical_field TEXT NOT NULL,
  alias TEXT NOT NULL
);

CREATE TABLE user_preferences (
  key TEXT PRIMARY KEY,
  value TEXT
);
```
