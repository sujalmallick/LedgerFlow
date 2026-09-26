# Requirements

## Functional

1. Create a new Excel workbook.
2. Open an existing `.xlsx` workbook from Android storage.
3. Select a worksheet within a workbook.
4. View and edit spreadsheet data.
5. Add, delete, rename, and reorder columns.
6. Add, edit, and delete rows.
7. Open the camera and photograph a challan.
8. Perform OCR completely on-device.
9. Extract structured fields from the OCR result.
10. Map extracted fields to the user's existing Excel columns.
11. Show extracted data in a review screen before committing it.
12. Allow the user to manually correct extracted values.
13. Add the confirmed data as a new row.
14. Save the workbook.
15. Export the workbook as `.xlsx` or `.csv`.
16. Share the exported file via Android's native share functionality.

## Non-functional / constraints

- Core app must work with no internet connection.
- No cloud OCR/AI APIs (OpenAI, Gemini, or otherwise).
- On-device OCR via Google ML Kit Text Recognition.
- No backend server of any kind.
- No automatic upload of scanned images or OCR data.
- No automatic commit of OCR results to a workbook — a review/confirmation step is mandatory.
- OCR/extraction system is independent of the Excel system (scanner returns structured results, never writes to a workbook directly).
- Columns are identified by stable internal IDs, never by spreadsheet letters (A/B/C).
- SQLite stores app-local metadata only (recent workbooks, scan history, mappings, aliases, preferences) — it is never a substitute for the `.xlsx` document itself.
