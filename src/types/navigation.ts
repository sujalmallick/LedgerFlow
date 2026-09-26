import { ExtractionResult } from './extraction';
import { WorkbookData } from './spreadsheet';

export type RootStackParamList = {
  Home: undefined;
  Workbook: { fileUri?: string; fileName?: string; initialWorkbook?: WorkbookData } | undefined;
  Camera: { workbookId?: number; targetWorkbook?: WorkbookData; fileName?: string } | undefined;
  Review: {
    ocrResult?: import('./ocr').OCRResult;
    extractionResult?: ExtractionResult;
    imageUri?: string;
    targetWorkbook?: WorkbookData;
    fileName?: string;
  };
  Settings: undefined;
  HowToUse: undefined;
};
