import { useState, useCallback } from 'react';
import { ExtractionResult } from '../types/extraction';
import { MLKitOCRService } from '../services/ocr/MLKitOCRService';
import { RuleBasedFieldExtractor } from '../services/extraction/RuleBasedFieldExtractor';

export type ScanMode = 'DOCUMENT' | 'RECEIPT' | 'BATCH';

export interface MLKitOCRState {
  isProcessing: boolean;
  scanImage: (uri: string, mode?: ScanMode) => Promise<ExtractionResult | null>;
}

const ocrService = new MLKitOCRService();
const extractor = new RuleBasedFieldExtractor();

/**
 * ML Kit OCR hook — real implementation.
 * Passes the image URI to MLKitOCRService (on-device Google ML Kit),
 * then runs RuleBasedFieldExtractor to produce structured ExtractionResult fields.
 */
export const useMLKitOCR = (): MLKitOCRState => {
  const [isProcessing, setIsProcessing] = useState(false);

  const scanImage = useCallback(
    async (uri: string, mode: ScanMode = 'DOCUMENT'): Promise<ExtractionResult | null> => {
      setIsProcessing(true);
      try {
        // 1. Run on-device OCR (Google ML Kit Text Recognition)
        const ocrResult = await ocrService.recognize(uri);

        // 2. Extract structured fields from raw OCR text with active mode priority
        const extractionResult = await extractor.extract(ocrResult, undefined, mode);

        return extractionResult;
      } catch (err) {
        console.error('OCR scan failed:', err);
        return null;
      } finally {
        setIsProcessing(false);
      }
    },
    []
  );

  return { isProcessing, scanImage };
};
