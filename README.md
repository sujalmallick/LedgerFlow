# LedgerFlow

> **Scan paper bills & challans → Extract data → Save to Excel — 100% offline, on-device.**

LedgerFlow is an offline-first Android app built with React Native + TypeScript. It lets field workers photograph paper delivery challans or bills, extracts structured data using on-device OCR (Google ML Kit), lets you review and correct the results, and appends the confirmed row directly into an `.xlsx` spreadsheet stored on your device — no internet, no cloud, no accounts required.

---

## Screenshots

| Splash | Dashboard | Camera | Review | Spreadsheet |
|--------|-----------|--------|--------|-------------|
| ![Splash](docs/splash.png) | ![Home](docs/home.png) | ![Camera](docs/camera.png) | ![Review](docs/review.png) | ![Sheet](docs/sheet.png) |

---

## Features

- 📷 **Scan bills & challans** — camera capture or gallery import
- 🔍 **On-device OCR** — Google ML Kit, no network required
- ✏️ **Human-in-the-loop** — always review & edit before committing to Excel
- 📊 **Excel compatible** — read and write real `.xlsx` files via SheetJS
- 📁 **Local-first storage** — files stay on your device
- 🔒 **Fully offline** — zero internet usage, zero cloud dependencies
- 📤 **Share** — export and share `.xlsx` via Android share sheet

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React Native 0.74 + TypeScript |
| JS Engine | Hermes |
| Navigation | React Navigation v6 (Native Stack) |
| OCR | `@react-native-ml-kit/text-recognition` (stub; real integration ready) |
| Spreadsheets | SheetJS (`xlsx`) |
| File I/O | `react-native-fs` + `react-native-document-picker` |
| Storage | `@react-native-async-storage/async-storage` |
| Permissions | Custom `PermissionService` (Camera + Storage, API 33+ aware) |

---

## Project Structure

```
LedgerFlow/
├── android/              # Native Android project (Kotlin)
│   ├── app/
│   │   ├── src/main/
│   │   │   ├── java/com/ledgerflow/
│   │   │   │   ├── MainActivity.kt
│   │   │   │   └── MainApplication.kt
│   │   │   ├── res/
│   │   │   └── AndroidManifest.xml
│   │   └── build.gradle
│   └── gradle.properties
├── src/
│   ├── screens/          # HomeScreen, CameraScreen, ReviewScreen, WorkbookScreen, SplashScreen
│   ├── services/         # SpreadsheetService, FileService, PermissionService, OCR services
│   ├── components/       # Reusable UI components (Icon, Button, Card, ErrorBoundary…)
│   ├── hooks/            # useCameraPermission, useMLKitOCR
│   ├── navigation/       # RootNavigator
│   ├── theme/            # colors, spacing, typography, responsive
│   └── types/            # TypeScript interfaces
├── .github/workflows/    # CI — builds debug APK on every push
├── App.tsx               # Root component
└── index.js              # Entry point
```

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **JDK 17** (OpenJDK / Temurin recommended)
- **Android Studio** with Android SDK (API 34)
- **Android device or emulator** (API 24+)

### Setup

```bash
# 1. Clone the repo
git clone https://github.com/YOUR_USERNAME/LedgerFlow.git
cd LedgerFlow

# 2. Install JS dependencies
npm install

# 3. Create android/local.properties (point to your SDK)
echo "sdk.dir=$ANDROID_SDK_ROOT" > android/local.properties
# Or on Windows:
echo sdk.dir=C:/Users/YourName/AppData/Local/Android/Sdk > android/local.properties

# 4. Build and install debug APK
cd android
./gradlew assembleDebug          # Windows: .\gradlew assembleDebug

# 5. Or run directly on connected device/emulator
cd ..
npx react-native run-android
```

The debug APK is self-contained (JS bundle included) — no Metro server needed to run.

### APK Outputs

After `assembleDebug`, find APKs at `android/app/build/outputs/apk/debug/`:

| File | Architecture | Use for |
|------|-------------|---------|
| `app-arm64-v8a-debug.apk` | arm64 | Most modern Android phones (2017+) |
| `app-armeabi-v7a-debug.apk` | 32-bit ARM | Older phones |
| `app-x86_64-debug.apk` | x86_64 | Android emulator |
| `app-universal-debug.apk` | All | Any device (largest) |

---

## Signing a Release Build

1. Generate a keystore:
   ```bash
   keytool -genkeypair -v -storetype PKCS12 \
     -keystore ledgerflow-release.keystore \
     -alias ledgerflow -keyalg RSA -keysize 2048 -validity 10000
   ```

2. Set environment variables (or `gradle.properties` — **never commit passwords**):
   ```
   LEDGERFLOW_UPLOAD_STORE_FILE=/path/to/ledgerflow-release.keystore
   LEDGERFLOW_UPLOAD_STORE_PASSWORD=your_password
   LEDGERFLOW_UPLOAD_KEY_ALIAS=ledgerflow
   LEDGERFLOW_UPLOAD_KEY_PASSWORD=your_password
   ```

3. Build:
   ```bash
   cd android && ./gradlew assembleRelease
   ```

---

## CI / GitHub Actions

Every push to `main`/`master` automatically builds the debug APK via GitHub Actions (`.github/workflows/build.yml`). The arm64 and universal APKs are uploaded as workflow artifacts.

---

## Security Notes

- `android/local.properties` — machine-specific SDK path, **gitignored**
- `*.keystore` / `*.jks` — **gitignored** (except the standard `debug.keystore`)
- `debug.keystore` — the standard Android SDK default keystore (`password: android`). Safe to include; used only for debug builds
- Release signing credentials are **never** stored in the repo — use environment variables or CI secrets

---

## License

MIT — see [LICENSE](LICENSE)
