import { PermissionsAndroid, Platform, Alert, Linking } from 'react-native';

export class PermissionService {
  /**
   * Checks if Camera permission is granted
   */
  public static async checkCameraPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;
    try {
      return await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CAMERA);
    } catch {
      return false;
    }
  }

  /**
   * Requests Camera permission with explanation
   */
  public static async requestCameraPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;
    try {
      const already = await this.checkCameraPermission();
      if (already) return true;

      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: 'Camera Access Needed',
          message:
            'LedgerFlow uses the camera to scan paper challans, bills, and receipts for on-device data extraction.',
          buttonPositive: 'Grant Access',
          buttonNegative: 'Not Now',
        }
      );
      
      if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
        this.showSettingsAlert('Camera');
        return false;
      }
      
      return result === PermissionsAndroid.RESULTS.GRANTED;
    } catch {
      return false;
    }
  }

  /**
   * Checks if device has camera hardware
   */
  public static async hasCameraHardware(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;
    return true; // Simplified for this context
  }

  /**
   * Checks if Storage / Media Images permission is granted
   */
  public static async checkStoragePermission(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;
    try {
      const sdkVersion =
        typeof Platform.Version === 'number'
          ? Platform.Version
          : parseInt(String(Platform.Version), 10);
      if (sdkVersion >= 33) {
        return await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES || 'android.permission.READ_MEDIA_IMAGES'
        );
      } else if (sdkVersion < 29) {
        return await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
        );
      } else {
        return await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE
        );
      }
    } catch {
      return false;
    }
  }

  /**
   * Requests Storage / Media Images permission
   */
  public static async requestStoragePermission(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;
    try {
      const already = await this.checkStoragePermission();
      if (already) return true;

      const sdkVersion =
        typeof Platform.Version === 'number'
          ? Platform.Version
          : parseInt(String(Platform.Version), 10);
      let perm = PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
      if (sdkVersion >= 33) {
        perm = PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES || 'android.permission.READ_MEDIA_IMAGES' as any;
      } else if (sdkVersion < 29) {
        perm = PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE;
      }

      const result = await PermissionsAndroid.request(perm, {
        title: 'Photos & Files Access Needed',
        message:
          'LedgerFlow needs access to pick document photos from your gallery and import Excel spreadsheets.',
        buttonPositive: 'Grant Access',
        buttonNegative: 'Not Now',
      });
      return result === PermissionsAndroid.RESULTS.GRANTED;
    } catch {
      return false;
    }
  }

  /**
   * Requests all required permissions on initial app launch
   */
  public static async requestInitialPermissions(): Promise<{
    camera: boolean;
    storage: boolean;
  }> {
    if (Platform.OS !== 'android') {
      return { camera: true, storage: true };
    }

    try {
      const sdkVersion =
        typeof Platform.Version === 'number'
          ? Platform.Version
          : parseInt(String(Platform.Version), 10);
      let storagePerm = PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
      if (sdkVersion >= 33) {
        storagePerm = PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES || 'android.permission.READ_MEDIA_IMAGES' as any;
      } else if (sdkVersion < 29) {
        storagePerm = PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE;
      }

      const permissionsToRequest: Array<any> = [];

      const hasCamera = await this.checkCameraPermission();
      if (!hasCamera) permissionsToRequest.push(PermissionsAndroid.PERMISSIONS.CAMERA);

      const hasStorage = await this.checkStoragePermission();
      if (!hasStorage) permissionsToRequest.push(storagePerm);

      if (permissionsToRequest.length === 0) {
        return { camera: true, storage: true };
      }

      const results = await PermissionsAndroid.requestMultiple(permissionsToRequest);

      const cameraGranted =
        hasCamera ||
        results[PermissionsAndroid.PERMISSIONS.CAMERA] ===
          PermissionsAndroid.RESULTS.GRANTED;
      const storageGranted =
        hasStorage || results[storagePerm] === PermissionsAndroid.RESULTS.GRANTED;

      return {
        camera: cameraGranted,
        storage: storageGranted,
      };
    } catch (err) {
      console.warn('Initial permissions request error:', err);
      return { camera: false, storage: false };
    }
  }

  /**
   * Shows a prompt directing user to App Settings if permission was permanently denied
   */
  public static showSettingsAlert(featureName: string): void {
    Alert.alert(
      `${featureName} Permission Required`,
      `LedgerFlow needs ${featureName.toLowerCase()} permission to function properly. Please grant this permission in your device App Settings.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
      ]
    );
  }
}
