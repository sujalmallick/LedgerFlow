# Architecture

## Build tooling

Bare React Native CLI (not Expo-managed). This is required because ML Kit Text Recognition, the file picker (Storage Access Framework), and native camera access all need native Android modules with full Gradle control. Local build and signed-APK steps are in `BUILD.md`.

## Layers

- **UI** — screens/navigation (home, workbook viewer, camera, review)
- **Spreadsheet/Excel service** — workbook model, cell/column/row operations, read/write `.xlsx`
- **Camera/document scanner** — capture challan image
- **OCR service** — on-device text recognition (ML Kit), returns raw OCR result
- **Field extraction** — regex/heuristic parsing of OCR text into structured fields
- **Field mapping** — maps extracted field names to the user's actual column names (with aliases)
- **Local database (SQLite)** — recent workbooks, scan history, mappings, aliases, preferences
- **Export service** — `.xlsx`/`.csv` export + native share

## Design rule: OCR/extraction is independent of Excel

The scanner pipeline never writes directly to a workbook. It only ever returns a structured `ExtractionResult`. The Excel layer is the only thing that mutates a workbook, and only after explicit user confirmation.

## Data flow

```
Camera
  → OCR service (ML Kit)              → OCRResult
  → Field extraction (regex/heuristic) → ExtractionResult
  → Field mapping (aliases)            → mapped column values
  → Review screen                      → user edits/confirms
  → User confirmation
  → Spreadsheet service.addRow()
  → Save workbook
```

Low-confidence fields (from OCR confidence scores or weak regex matches) are flagged for visual highlighting on the review screen.

## Module boundaries (why they're separated)

- Swapping ML Kit for another OCR engine should only touch the OCR service.
- Swapping rule-based extraction for a future local ONNX/TFLite model should only touch the Field extraction module — the `FieldExtractor` interface stays the same, and neither the spreadsheet layer nor the UI needs to change.
- The Excel service knows nothing about OCR, cameras, or extraction — it only understands `ColumnDefinition`, rows, and cells.

## Key interfaces

See `DATA_MODELS.md` for the concrete TypeScript interfaces (`ColumnDefinition`, `OCRService`, `OCRResult`, `FieldExtractor`, `ExtractionResult`) and the spreadsheet operation set (`addColumn`, `deleteColumn`, `renameColumn`, `reorderColumn`, `addRow`, `deleteRow`, `updateCell`).

## Local database vs. workbook

SQLite is metadata-only:
- recent workbooks (paths, last-opened)
- scan history (per-workbook, per-scan)
- field mappings (per-workbook column-to-field associations)
- column aliases (global alias dictionary)
- user preferences

The `.xlsx` file remains the single source of truth for the user's actual data.
