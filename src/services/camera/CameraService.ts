import { PermissionsAndroid, Platform } from 'react-native';
import {
  launchCamera,
  launchImageLibrary,
  CameraOptions,
  ImageLibraryOptions,
} from 'react-native-image-picker';

export interface CapturedImage {
  uri: string;
  width?: number;
  height?: number;
  fileName?: string;
  fileSize?: number;
}

export class CameraService {
  /**
   * Requests Android CAMERA runtime permission
   */
  public static async requestCameraPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;

    try {
      const alreadyGranted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.CAMERA
      );
      if (alreadyGranted) return true;

      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: 'LedgerFlow Camera Permission',
          message:
            'LedgerFlow needs camera access to photograph paper challans for on-device OCR.',
          buttonPositive: 'Allow',
          buttonNegative: 'Cancel',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch {
      return false;
    }
  }

  /**
   * Launches native camera to capture a challan photo
   */
  public static async capturePhoto(): Promise<CapturedImage | null> {
    const hasPermission = await this.requestCameraPermission();
    if (!hasPermission) {
      throw new Error('Camera permission denied.');
    }

    const options: CameraOptions = {
      mediaType: 'photo',
      cameraType: 'back',
      quality: 0.9,
      maxWidth: 2048,
      maxHeight: 2048,
      saveToPhotos: false,
      includeBase64: false,
    };

    const result = await launchCamera(options);

    if (result.errorCode) {
      if (result.errorCode === 'camera_unavailable') {
        throw new Error('Camera hardware is currently unavailable or in use by another app.');
      } else if (result.errorCode === 'permission') {
        throw new Error('Camera permission was not granted.');
      }
      throw new Error(result.errorMessage || `Camera error: ${result.errorCode}`);
    }

    if (result.didCancel || !result.assets || result.assets.length === 0) {
      return null;
    }

    const asset = result.assets[0];
    if (!asset.uri) {
      return null;
    }

    return {
      uri: asset.uri,
      width: asset.width,
      height: asset.height,
      fileName: asset.fileName,
      fileSize: asset.fileSize,
    };
  }

  /**
   * Launches gallery picker to select an existing challan photo
   */
  public static async pickFromGallery(): Promise<CapturedImage | null> {
    const options: ImageLibraryOptions = {
      mediaType: 'photo',
      quality: 0.9,
      maxWidth: 2048,
      maxHeight: 2048,
      selectionLimit: 1,
      includeBase64: false,
    };

    const result = await launchImageLibrary(options);

    if (result.errorCode) {
      throw new Error(result.errorMessage || `Gallery picker error: ${result.errorCode}`);
    }

    if (result.didCancel || !result.assets || result.assets.length === 0) {
      return null;
    }

    const asset = result.assets[0];
    if (!asset.uri) {
      return null;
    }

    return {
      uri: asset.uri,
      width: asset.width,
      height: asset.height,
      fileName: asset.fileName,
      fileSize: asset.fileSize,
    };
  }
}

