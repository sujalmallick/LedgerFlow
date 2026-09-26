import AsyncStorage from '@react-native-async-storage/async-storage';

export type ScanMode = 'DOCUMENT' | 'RECEIPT' | 'BATCH';

export interface AppSettingsData {
  vibrateOnScan: boolean;
  defaultFileName: string;
  currency: string;
  ocrLanguage: string;
  confirmBeforeAdd: boolean;
  defaultScanMode: ScanMode;
  // Legacy fields kept optional for backwards compatibility
  autoCropEnabled?: boolean;
  soundOnScan?: boolean;
  keepScreenOn?: boolean;
}

const SETTINGS_KEY = '@ledgerflow_settings';

const DEFAULT_SETTINGS: AppSettingsData = {
  vibrateOnScan: true,
  defaultFileName: '',          // empty = prompt user each time
  currency: '₹ INR',
  ocrLanguage: 'English',
  confirmBeforeAdd: true,
  defaultScanMode: 'DOCUMENT',
};

export class AppSettings {
  private static cache: AppSettingsData | null = null;

  static async load(): Promise<AppSettingsData> {
    if (this.cache) return this.cache;
    try {
      const raw = await AsyncStorage.getItem(SETTINGS_KEY);
      if (raw) {
        this.cache = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
      } else {
        this.cache = { ...DEFAULT_SETTINGS };
      }
    } catch {
      this.cache = { ...DEFAULT_SETTINGS };
    }
    return this.cache!;
  }

  static async save(settings: Partial<AppSettingsData>): Promise<void> {
    const current = await this.load();
    this.cache = { ...current, ...settings };
    try {
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(this.cache));
    } catch (e) {
      console.warn('AppSettings save error:', e);
    }
  }

  static async get<K extends keyof AppSettingsData>(key: K): Promise<AppSettingsData[K]> {
    const s = await this.load();
    return s[key];
  }

  static async reset(): Promise<void> {
    this.cache = { ...DEFAULT_SETTINGS };
    try {
      await AsyncStorage.removeItem(SETTINGS_KEY);
    } catch {}
  }
}
