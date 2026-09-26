# Build Phases

Build incrementally. After every phase the project must remain buildable and testable — no phase should leave the app in a broken state.

Before writing Phase 1 code: inspect the existing repository (if one exists) to identify current framework, package manager, Android configuration, and dependencies. Don't rewrite working infrastructure unnecessarily.

Target build tooling: **bare React Native CLI**, built and run via Android Studio/Gradle on your own machine (see `BUILD.md`). Every phase below should end in something runnable with `npx react-native run-android`.

- [x] **Phase 1 — Scaffold**
  Bare React Native CLI project setup (`npx react-native init`), Android configuration (min/target/compile SDK versions, package name), navigation shell, basic home screen. Confirms `npx react-native run-android` produces a working debug build before any feature work starts.

- [x] **Phase 2 — Workbook basics**
  Create/open `.xlsx`, read workbook, display a worksheet, edit individual cells.

- [x] **Phase 3 — Column & row editing**
  Add/delete/rename/reorder columns; add/delete rows.

- [x] **Phase 4 — Camera**
  Camera integration, image capture flow.

- [x] **Phase 5 — OCR**
  On-device OCR via ML Kit, wired through the `OCRService` interface.

- [x] **Phase 6 — Extraction**
  Rule-based challan field extraction (`FieldExtractor`), structured `ExtractionResult`.

- [x] **Phase 7 — Field mapping**
  Dynamic mapping of extracted fields to workbook columns, with alias support.

- [x] **Phase 8 — Review screen**
  Show extraction results with mapped columns, highlight low-confidence fields, allow manual correction.

- [x] **Phase 9 — Commit**
  Append confirmed row to the workbook via the spreadsheet service (`addRow`).

- [x] **Phase 10 — Save / export / share**
  Save workbook, export `.xlsx`/`.csv`, share via Android's native share sheet.

- [x] **Phase 11 — Release build**
  Generate the release signing keystore, wire it into `android/app/build.gradle`, produce a signed `app-release.apk` via `./gradlew assembleRelease`, and verify the offline flow end-to-end on a real device before sending it to the client. See `BUILD.md`.

## Exit criteria per phase

Each phase should end with:
1. A description of every file created or modified.
2. The app still building and running.
3. The new capability manually verifiable (even if the UI is rough).

Start with **Phase 1 only**.
