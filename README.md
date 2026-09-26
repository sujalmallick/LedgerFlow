# LedgerFlow

An offline Android app for scanning paper delivery challans and bills, extracting the data with on-device OCR, and saving it directly into an Excel spreadsheet on your device.

No internet. No cloud. No accounts.

---

## What it does

- Scan a paper challan or bill using the camera or gallery
- Extract fields automatically — challan number, date, vehicle number, driver name, amount
- Review and correct any extracted values before saving
- Append the confirmed row into an `.xlsx` file stored on the device
- Open and edit existing Excel files
- Share spreadsheets via Android share sheet

---

## Screens

| Splash | Dashboard | Camera | Review | Spreadsheet |
|--------|-----------|--------|--------|-------------|
| App launch | Open/create files, scan | Document scanner viewfinder | Edit OCR results | Full spreadsheet editor |

---

## Tech Stack

| | |
|---|---|
| Framework | React Native 0.74, TypeScript, Hermes |
| Navigation | React Navigation v6 (Native Stack) |
| OCR | Google ML Kit Text Recognition (on-device) |
| Spreadsheets | SheetJS (`xlsx`) |
| File I/O | `react-native-fs`, `react-native-document-picker` |
| Camera / Gallery | `react-native-image-picker` |
| Storage | `@react-native-async-storage/async-storage` |
| Native | Kotlin (MainActivity, MainApplication) |

---

## Requirements

- Node.js 18+
- JDK 17
- Android SDK (API 34)
- Android device or emulator (API 24+, Android 7.0+)

---

## Setup

```bash
git clone https://github.com/sujalmallick/LedgerFlow.git
cd LedgerFlow
npm install
```

Create `android/local.properties` pointing to your Android SDK:

```
sdk.dir=C:/Users/YourName/AppData/Local/Android/Sdk
```

Build the debug APK:

```bash
cd android
.\gradlew assembleDebug          # Windows
./gradlew assembleDebug          # macOS / Linux
```

APKs are written to `android/app/build/outputs/apk/debug/`.

| APK | Use for |
|-----|---------|
| `app-arm64-v8a-debug.apk` | Most modern Android phones |
| `app-armeabi-v7a-debug.apk` | Older 32-bit phones |
| `app-x86_64-debug.apk` | Android emulator |
| `app-universal-debug.apk` | Any device (largest size) |

Install directly:

```bash
adb install android/app/build/outputs/apk/debug/app-arm64-v8a-debug.apk
```

Or transfer and sideload manually — no ADB required.

---

## Run on device during development

```bash
npx react-native run-android
```

The debug APK bundles the JS at build time, so it also runs standalone without Metro.

---

## Release Build

Generate a keystore:

```bash
keytool -genkeypair -v -storetype PKCS12 \
  -keystore ledgerflow-release.keystore \
  -alias ledgerflow -keyalg RSA -keysize 2048 -validity 10000
```

Set signing credentials as environment variables (never commit these):

```
LEDGERFLOW_UPLOAD_STORE_FILE=/path/to/ledgerflow-release.keystore
LEDGERFLOW_UPLOAD_STORE_PASSWORD=your_password
LEDGERFLOW_UPLOAD_KEY_ALIAS=ledgerflow
LEDGERFLOW_UPLOAD_KEY_PASSWORD=your_password
```

Build:

```bash
cd android && .\gradlew assembleRelease
```

---

## Project Structure

```
LedgerFlow/
├── android/                        # Native Android project (Kotlin)
│   └── app/src/main/java/com/ledgerflow/
│       ├── MainActivity.kt
│       └── MainApplication.kt
├── src/
│   ├── screens/                    # HomeScreen, CameraScreen, ReviewScreen, WorkbookScreen, SplashScreen
│   ├── services/                   # SpreadsheetService, FileService, PermissionService, OCR services
│   ├── components/common/          # Icon, Button, Card, ErrorBoundary, AppLogo
│   ├── hooks/                      # useCameraPermission, useMLKitOCR
│   ├── navigation/                 # RootNavigator
│   ├── theme/                      # colors, spacing, typography, responsive scaling
│   └── types/                      # TypeScript interfaces
├── App.tsx
└── index.js
```

---

## License

MIT
