import { useState, useCallback, useEffect } from 'react';
import { PermissionService } from '../services/permissions/PermissionService';

export interface CameraPermissionState {
  hasPermission: boolean | null;
  requestPermission: () => Promise<boolean>;
}

/**
 * Manages camera permission state.
 * On Android, camera permission must be requested at runtime.
 */
export const useCameraPermission = (): CameraPermissionState => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  useEffect(() => {
    PermissionService.checkCameraPermission().then(setHasPermission);
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    const granted = await PermissionService.requestCameraPermission();
    setHasPermission(granted);
    return granted;
  }, []);

  return { hasPermission, requestPermission };
};
