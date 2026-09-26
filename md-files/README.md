# LedgerFlow

An offline-first Android app (React Native + TypeScript) for scanning paper challans and appending the extracted data as new rows in an existing Excel workbook.

## What it does

- Create or open `.xlsx` workbooks stored on the device
- View and edit worksheet data (columns, rows, cells)
- Photograph a challan and run on-device OCR
- Extract structured fields (challan number, date, vehicle number, driver name, amount, etc.)
- Map extracted fields to the user's own column names (with alias support)
- Review and correct extracted values before anything is written
- Append the confirmed row to the workbook
- Export as `.xlsx` / `.csv` and share via Android's native share sheet

## Hard constraints

- **Fully offline.** No network calls for OCR, extraction, or storage.
- **No cloud AI.** No OpenAI/Gemini/any external API for OCR or document processing.
- **No backend.** Everything runs on-device.
- **On-device OCR only** — Google ML Kit Text Recognition.
- **No silent writes.** OCR results are never auto-committed to the workbook; there is always a review/confirmation step.
- **No auto-upload** of images or OCR data anywhere.

## Tech stack

- React Native + TypeScript
- Google ML Kit Text Recognition (on-device)
- SQLite (recent workbooks, scan history, field mappings, aliases, preferences — **not** a replacement for the Excel file)
- Android Storage Access Framework (file picker, import/export)
- Android native share intent

## Documents in this set

| File | Contents |
|---|---|
| `REQUIREMENTS.md` | Full functional requirement list |
| `ARCHITECTURE.md` | Layers, module boundaries, data flow |
| `DATA_MODELS.md` | TypeScript interfaces, SQLite schema, example payloads |
| `FIELD_MAPPING.md` | Column alias strategy and matching rules |
| `PHASES.md` | 10-phase incremental build plan with exit criteria |
| `BUILD.md` | How to build a signed, shareable release APK locally |

## Build target: bare React Native

This is a **bare** React Native project (not Expo-managed), because ML Kit Text Recognition and the file/camera access it needs are native modules requiring full control over the Android project. The app is compiled to a `.apk` locally via Android Studio + Gradle — see `BUILD.md` for the exact steps to produce a signed APK you can hand to a client.

## Build approach

The project is built in the 10 phases described in `PHASES.md`. After every phase the app must remain buildable and testable via `npx react-native run-android`. Phase 1 (project scaffold, navigation, home screen) is the starting point.
