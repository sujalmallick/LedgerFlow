# LedgerFlow

Offline-first Android app for scanning paper bills and challans, extracting data with on-device OCR, and saving it into Excel spreadsheets — no internet, no cloud, no accounts.

## What it does

- Photograph a delivery challan or bill
- Extract structured fields (challan number, date, vehicle, driver, amount) via on-device OCR
- Review and correct extracted values before saving
- Append confirmed rows to an `.xlsx` spreadsheet stored on device
- Open, edit, and share existing Excel files

## Tech Stack

- React Native 0.74 + TypeScript + Hermes
- Google ML Kit Text Recognition (on-device OCR)
- SheetJS for `.xlsx` read/write
- React Navigation v6
- `react-native-fs`, `react-native-document-picker`, `react-native-image-picker`

## Getting Started

**Requirements:** Node.js 18+, JDK 17, Android SDK (API 34), Android device or emulator (API 24+)

```bash
git clone https://github.com/sujalmallick/LedgerFlow.git
cd LedgerFlow
npm install
echo "sdk.dir=C:/Users/YourName/AppData/Local/Android/Sdk" > android/local.properties
cd android && .\gradlew assembleDebug
```

APKs are output to `android/app/build/outputs/apk/debug/`. Use `app-arm64-v8a-debug.apk` for most modern phones.

## Release Signing

Set these environment variables (never commit them):

```
LEDGERFLOW_UPLOAD_STORE_FILE=/path/to/release.keystore
LEDGERFLOW_UPLOAD_STORE_PASSWORD=...
LEDGERFLOW_UPLOAD_KEY_ALIAS=...
LEDGERFLOW_UPLOAD_KEY_PASSWORD=...
```

Then run `.\gradlew assembleRelease`.

## CI

GitHub Actions builds a debug APK on every push to `main`. See `.github/workflows/build.yml`.

## License

MIT
