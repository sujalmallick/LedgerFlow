import { OCRResult } from './ocr';

export type CanonicalFieldKey =
  | 'vehicle_number'
  | 'challan_number'
  | 'driver_name'
  | 'date'
  | 'amount'
  | 'invoice_number'
  | 'vendor_name'
  | 'gstin'
  | 'tax_amount'
  | 'items_summary'
  | 'serial_number'
  | 'quantity'
  | 'hsd';

export interface ExtractedFieldValue {
  value: string | number;
  confidence?: number;
  rawText?: string;
}

export interface ExtractionResult {
  fields: {
    [fieldKey: string]: ExtractedFieldValue;
  };
}

export interface FieldExtractor {
  extract(
    ocrResult: OCRResult,
    expectedFields?: string[],
    mode?: 'DOCUMENT' | 'RECEIPT' | 'BATCH'
  ): Promise<ExtractionResult>;
}
