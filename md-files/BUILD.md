# Build & Share the APK (Bare React Native)

This project is bare React Native (not Expo), which is required because ML Kit Text Recognition and the file/camera access this app needs are native modules — bare RN gives full control over the native Android project.

## One-time machine setup (you do this locally, not in this chat)

1. Install **Android Studio** (includes the Android SDK, platform tools, an emulator, and Gradle wrapper support).
2. Install **Node.js LTS** and either `npm` or `yarn`.
3. Install a **JDK** (17 is the current default for RN's Gradle setup).
4. In Android Studio → SDK Manager, make sure you have:
   - Android SDK Platform matching the project's `compileSdkVersion`
   - Android SDK Build-Tools
   - An Android Virtual Device (optional, for testing without a physical phone)
5. Set `ANDROID_HOME` / `ANDROID_SDK_ROOT` environment variables (Android Studio's setup wizard usually does this for you).

## Getting the project running

```bash
npm install
npx react-native run-android      # builds a debug APK and installs it on a connected device/emulator
```

## Building a release APK to send to your client

A release APK needs to be signed. Steps:

1. **Generate a signing key** (once):
   ```bash
   keytool -genkeypair -v -keystore ledgerflow-release.keystore \
     -alias ledgerflow -keyalg RSA -keysize 2048 -validity 10000
   ```
   Keep this file and its passwords safe — you need the same key for every future update of the app.

2. **Point Gradle at the keystore** — in `android/gradle.properties` (create it if it doesn't exist, and do **not** commit real passwords to git):
   ```properties
   LEDGERFLOW_UPLOAD_STORE_FILE=ledgerflow-release.keystore
   LEDGERFLOW_UPLOAD_KEY_ALIAS=ledgerflow
   LEDGERFLOW_UPLOAD_STORE_PASSWORD=your-store-password
   LEDGERFLOW_UPLOAD_KEY_PASSWORD=your-key-password
   ```

3. **Wire signing config into `android/app/build.gradle`** (added once during Phase 1 scaffolding):
   ```groovy
   android {
     signingConfigs {
       release {
         storeFile file(LEDGERFLOW_UPLOAD_STORE_FILE)
         storePassword LEDGERFLOW_UPLOAD_STORE_PASSWORD
         keyAlias LEDGERFLOW_UPLOAD_KEY_ALIAS
         keyPassword LEDGERFLOW_UPLOAD_KEY_PASSWORD
       }
     }
     buildTypes {
       release {
         signingConfig signingConfigs.release
       }
     }
   }
   ```

4. **Build it**:
   ```bash
   cd android
   ./gradlew assembleRelease
   ```
   The signed APK lands at:
   ```
   android/app/build/outputs/apk/release/app-release.apk
   ```

5. **Share it with your client** — that single `.apk` file can be sent directly (email, Drive, WhatsApp, etc.). Android will warn about installing from an unknown source unless it's distributed through the Play Store; your client just needs to allow that once in Settings.

## Sanity checks before sending to a client

- Install the release APK on a real device (not just an emulator) — camera and OCR behavior can differ.
- Test the full offline flow with Wi-Fi/mobile data off — nothing in the app should require a network call.
- Confirm the review screen blocks a commit until the user explicitly confirms.

## Notes

- Each phase in `PHASES.md` should still produce a build that runs with `npx react-native run-android`. You don't need to redo the signing setup after every phase — only when you're ready to hand a build to the client.
- If ML Kit's Gradle dependencies need Google's Maven repository, that's declared in `android/build.gradle`'s `allprojects.repositories` — this is normal for RN + ML Kit and is resolved on your machine, not in this chat's sandbox.
