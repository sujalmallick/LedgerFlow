import { OCRResult, OCRBlock } from '../../types/ocr';
import {
  FieldExtractor,
  ExtractionResult,
  ExtractedFieldValue,
} from '../../types/extraction';

export class RuleBasedFieldExtractor implements FieldExtractor {
  /**
   * Extracts structured fields from OCR result using regex patterns and spatial heuristics
   */
  public async extract(
    ocrResult: OCRResult,
    expectedFields?: string[],
    mode: 'DOCUMENT' | 'RECEIPT' | 'BATCH' = 'DOCUMENT'
  ): Promise<ExtractionResult> {
    const fullText = ocrResult.fullText || '';
    const blocks = ocrResult.blocks || [];

    const fields: Record<string, ExtractedFieldValue> = {};

    // 1. Date (universal)
    const dateVal = this.extractDate(fullText, blocks);
    if (dateVal) fields.date = dateVal;

    // 2. Amount & Tax (universal)
    const amountVal = this.extractAmount(fullText, blocks);
    if (amountVal) fields.amount = amountVal;

    const taxVal = this.extractTaxAmount(fullText, blocks);
    if (taxVal) fields.tax_amount = taxVal;

    // 3. GSTIN (universal for commercial docs)
    const gstinVal = this.extractGSTIN(fullText, blocks);
    if (gstinVal) fields.gstin = gstinVal;

    // 4. Vendor / Supplier Name
    const vendorVal = this.extractVendorName(fullText, blocks);
    if (vendorVal) fields.vendor_name = vendorVal;

    if (mode === 'RECEIPT') {
      // Prioritize Bill / Invoice number
      const invoiceVal = this.extractInvoiceNumber(fullText, blocks);
      if (invoiceVal) fields.invoice_number = invoiceVal;
    } else {
      // Prioritize Challan & Transport fields for DOCUMENT / BATCH
      const challanVal = this.extractChallanNumber(fullText, blocks);
      if (challanVal) {
        fields.challan_number = challanVal;
      } else {
        // Fallback to invoice number if challan number not explicitly found
        const invoiceVal = this.extractInvoiceNumber(fullText, blocks);
        if (invoiceVal) fields.invoice_number = invoiceVal;
      }

      const vehicleVal = this.extractVehicleNumber(fullText, blocks);
      if (vehicleVal) fields.vehicle_number = vehicleVal;

      const driverVal = this.extractDriverName(fullText, blocks);
      if (driverVal) fields.driver_name = driverVal;

      // Quantity (MT) / Weight
      const qtyVal = this.extractQuantity(fullText, blocks);
      if (qtyVal) fields.quantity = qtyVal;

      // HSD / Diesel
      const hsdVal = this.extractHSD(fullText, blocks);
      if (hsdVal) fields.hsd = hsdVal;

      // Serial Number
      const slVal = this.extractSerialNumber(fullText, blocks);
      if (slVal) fields.serial_number = slVal;
    }

    // If expectedFields filter is specified, retain only requested fields
    if (expectedFields && expectedFields.length > 0) {
      const filtered: Record<string, ExtractedFieldValue> = {};
      expectedFields.forEach((key) => {
        if (fields[key]) filtered[key] = fields[key];
      });
      return { fields: filtered };
    }

    return { fields };
  }

  /**
   * Invoice / Bill number extraction
   */
  private extractInvoiceNumber(
    fullText: string,
    blocks: OCRBlock[]
  ): ExtractedFieldValue | null {
    const invalidKeywords = /^(?:date|total|amount|rupees|tax|cash|credit|gst|copy|original|duplicate)$/i;

    // Priority 1: Labeled pattern "Invoice No: 1234", "Bill No: 994", "Inv #: 2026/01"
    const labeledRegex = /(?:tax\s+)?(?:invoice|bill|memo|receipt|inv)\s*(?:no|num|number|#)?[:.\s-]*([A-Z0-9\/-]{2,25})/i;
    const match = fullText.match(labeledRegex);
    if (match && match[1]) {
      const cleaned = match[1].trim();
      if (!invalidKeywords.test(cleaned) && cleaned.length >= 2) {
        return {
          value: cleaned,
          confidence: 0.98,
          rawText: match[0],
        };
      }
    }

    // Priority 2: Scan individual blocks
    for (const b of blocks) {
      const bMatch = b.text.match(labeledRegex);
      if (bMatch && bMatch[1]) {
        const cleaned = bMatch[1].trim();
        if (!invalidKeywords.test(cleaned) && cleaned.length >= 2) {
          return {
            value: cleaned,
            confidence: b.confidence ?? 0.94,
            rawText: bMatch[0],
          };
        }
      }
    }

    return null;
  }

  /**
   * Challan number extraction
   */
  private extractChallanNumber(
    fullText: string,
    blocks: OCRBlock[]
  ): ExtractedFieldValue | null {
    const invalidKeywords = /^(?:receipt|notice|copy|department|memo|book)$/i;

    // Priority 1: Explicit labeled pattern: "Challan No: ...", "Challan Number: ...", "DC No: ..."
    const explicitRegex = /(?:delivery\s*)?(?:challan|dc)\s*(?:number|num|no|#)?\s*[:.-]?\s*([A-Z0-9\/-]{3,25})/i;
    const match = fullText.match(explicitRegex);
    if (match && match[1]) {
      const cleaned = match[1].trim();
      if (!invalidKeywords.test(cleaned)) {
        return {
          value: cleaned,
          confidence: 0.98,
          rawText: match[0],
        };
      }
    }

    // Priority 2: Scan individual blocks for labeled patterns
    for (const b of blocks) {
      const bMatch = b.text.match(explicitRegex);
      if (bMatch && bMatch[1]) {
        const cleaned = bMatch[1].trim();
        if (!invalidKeywords.test(cleaned)) {
          return {
            value: cleaned,
            confidence: b.confidence ?? 0.92,
            rawText: bMatch[0],
          };
        }
      }
    }

    return null;
  }

  /**
   * Indian GSTIN Extraction (15 character alphanumeric format)
   * e.g. 27AAAAA0000A1Z5
   */
  private extractGSTIN(
    fullText: string,
    blocks: OCRBlock[]
  ): ExtractedFieldValue | null {
    const gstinRegex = /\b([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1})\b/i;

    const labeledRegex = /(?:gstin|gst\s*no|gst\s*number|gst)[:.\s-]*([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1})/i;
    const labeledMatch = fullText.match(labeledRegex);
    if (labeledMatch && labeledMatch[1]) {
      return {
        value: labeledMatch[1].toUpperCase(),
        confidence: 0.99,
        rawText: labeledMatch[0],
      };
    }

    // Standalone match
    for (const b of blocks) {
      const bMatch = b.text.match(gstinRegex);
      if (bMatch && bMatch[1]) {
        return {
          value: bMatch[1].toUpperCase(),
          confidence: 0.96,
          rawText: bMatch[0],
        };
      }
    }

    const match = fullText.match(gstinRegex);
    if (match && match[1]) {
      return {
        value: match[1].toUpperCase(),
        confidence: 0.93,
        rawText: match[0],
      };
    }

    return null;
  }

  /**
   * Vendor / Supplier / Shop Name Extraction
   */
  private extractVendorName(
    fullText: string,
    blocks: OCRBlock[]
  ): ExtractedFieldValue | null {
    // Priority 1: Labeled e.g. "M/s ABC Enterprises", "Vendor: XYZ Traders", "Supplier: ..."
    const labeledRegex = /(?:m\/s|vendor|supplier|seller|from|party\s*name)[:.\s-]*([A-Za-z0-9\s.,&'-]{3,40})/i;
    const match = fullText.match(labeledRegex);
    if (match && match[1]) {
      const cleaned = match[1].split(/[\n\r]/)[0].trim();
      if (cleaned.length >= 3 && !/^(?:name|vendor|supplier|from)$/i.test(cleaned)) {
        return {
          value: cleaned,
          confidence: 0.94,
          rawText: match[0],
        };
      }
    }

    // Priority 2: Top header block heuristic (First non-keyword block on document header)
    const skipHeaders = /^(?:tax\s+invoice|invoice|delivery\s+challan|challan|bill|cash\s+memo|receipt|original|copy|date)$/i;
    for (let i = 0; i < Math.min(blocks.length, 3); i++) {
      const text = blocks[i].text.split(/[\n\r]/)[0].trim();
      if (text.length >= 4 && text.length <= 40 && !skipHeaders.test(text) && !/^\d+$/.test(text)) {
        return {
          value: text,
          confidence: 0.86,
          rawText: blocks[i].text,
        };
      }
    }

    return null;
  }

  /**
   * Date extraction (DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD)
   */
  private extractDate(
    fullText: string,
    blocks: OCRBlock[]
  ): ExtractedFieldValue | null {
    const labeledDateRegex = /(?:date|dated|dt)[:.\s-]*(\d{1,2}[-\/.]\d{1,2}[-\/.]\d{2,4}|\d{4}[-\/.]\d{1,2}[-\/.]\d{1,2})/i;
    const match = fullText.match(labeledDateRegex);
    if (match && match[1]) {
      return {
        value: this.normalizeDate(match[1]),
        confidence: 0.97,
        rawText: match[0],
      };
    }

    const standaloneDateRegex = /\b(\d{1,2}[-\/.]\d{1,2}[-\/.]\d{4})\b/;
    const standaloneMatch = fullText.match(standaloneDateRegex);
    if (standaloneMatch && standaloneMatch[1]) {
      return {
        value: this.normalizeDate(standaloneMatch[1]),
        confidence: 0.91,
        rawText: standaloneMatch[0],
      };
    }

    return null;
  }

  private normalizeDate(raw: string): string {
    return raw.replace(/[-.]/g, '/').trim();
  }

  /**
   * Indian vehicle registration plate extraction
   */
  private extractVehicleNumber(
    fullText: string,
    blocks: OCRBlock[]
  ): ExtractedFieldValue | null {
    const plateRegex = /\b([A-Z]{2}[-\s]?[0-9]{1,2}[-\s]?[A-Z]{0,3}[-\s]?[0-9]{4})\b/i;
    const bhPlateRegex = /\b([0-9]{2}[-\s]?BH[-\s]?[0-9]{4}[-\s]?[A-Z]{1,2})\b/i;

    const labeledPlateRegex = /(?:vehicle|truck|lorry|tempo|regn?|reg|rc)\s*(?:no|num|number)?[:.\s-]*([A-Z0-9\s-]{8,15})/i;
    const labeledMatch = fullText.match(labeledPlateRegex);
    if (labeledMatch && labeledMatch[1]) {
      const candidate = labeledMatch[1].replace(/[\s-]/g, '').toUpperCase();
      if (plateRegex.test(candidate) || bhPlateRegex.test(candidate)) {
        return {
          value: candidate,
          confidence: 0.98,
          rawText: labeledMatch[0],
        };
      }
    }

    for (const b of blocks) {
      const match = b.text.match(plateRegex);
      if (match && match[1]) {
        const cleaned = match[1].replace(/[\s-]/g, '').toUpperCase();
        if (cleaned.length >= 9 && cleaned.length <= 11) {
          return {
            value: cleaned,
            confidence: 0.92,
            rawText: match[0],
          };
        }
      }
    }

    return null;
  }

  /**
   * Driver / Transporter name extraction
   */
  private extractDriverName(
    fullText: string,
    blocks: OCRBlock[]
  ): ExtractedFieldValue | null {
    const nameRegex = /(?:driver\s*name|driver|transporter|transport\s*name|carrier|delivered\s*by)\s*[:.-]\s*([A-Za-z\s.]{3,35})/i;
    const match = fullText.match(nameRegex);
    if (match && match[1]) {
      let nameCandidate = match[1].split(/[\n\r]/)[0].trim();
      nameCandidate = nameCandidate
        .replace(/(?:vehicle|amount|total|date|time|status|signature).*/i, '')
        .trim();

      if (nameCandidate.length >= 3 && !/^(?:name|driver|transporter)$/i.test(nameCandidate)) {
        return {
          value: nameCandidate,
          confidence: 0.90,
          rawText: match[0],
        };
      }
    }

    return null;
  }

  /**
   * Tax / GST amount extraction
   */
  private extractTaxAmount(
    fullText: string,
    blocks: OCRBlock[]
  ): ExtractedFieldValue | null {
    const taxRegex = /(?:total\s+tax|tax\s+amount|gst\s+amount|cgst|sgst|igst|tax)[:.\s-]*(?:rs\.?|inr|₹)?\s*([0-9,]+(?:\.[0-9]{2})?)/i;
    const match = fullText.match(taxRegex);
    if (match && match[1]) {
      const numStr = match[1].replace(/,/g, '');
      const num = parseFloat(numStr);
      if (!isNaN(num) && num > 0) {
        return {
          value: num,
          confidence: 0.94,
          rawText: match[0],
        };
      }
    }
    return null;
  }

  /**
   * Monetary amount extraction (Total / Grand Total / Bill Amount)
   */
  private extractAmount(
    fullText: string,
    blocks: OCRBlock[]
  ): ExtractedFieldValue | null {
    // Priority 1: Labeled total amount
    const labeledAmountRegex = /(?:grand\s*total|net\s*amount|total\s*amount|bill\s*amount|invoice\s*total|total|amount)[:.\s-]*(?:rs\.?|inr|₹)?\s*([0-9,]+(?:\.[0-9]{2})?)/i;
    const match = fullText.match(labeledAmountRegex);
    if (match && match[1]) {
      const numStr = match[1].replace(/,/g, '');
      const num = parseFloat(numStr);
      if (!isNaN(num) && num > 0) {
        return {
          value: num,
          confidence: 0.97,
          rawText: match[0],
        };
      }
    }

    // Priority 2: Standalone currency with "Rs. <digits>" or "₹ <digits>"
    const currencyRegex = /(?:rs\.?|₹)\s*([0-9,]+(?:\.[0-9]{2})?)/i;
    const currencyMatch = fullText.match(currencyRegex);
    if (currencyMatch && currencyMatch[1]) {
      const num = parseFloat(currencyMatch[1].replace(/,/g, ''));
      if (!isNaN(num) && num > 0) {
        return {
          value: num,
          confidence: 0.88,
          rawText: currencyMatch[0],
        };
      }
    }

    return null;
  }

  /**
   * Quantity (MT) / Weight extraction
   */
  private extractQuantity(
    fullText: string,
    blocks: OCRBlock[]
  ): ExtractedFieldValue | null {
    const qtyRegex = /(?:quantity|qty|net\s*wt|net\s*weight|weight|metric\s*ton|gross\s*wt)[:.\s-]*([0-9]+(?:\.[0-9]{1,3})?)\s*(?:mt|tons?|tonnes?|kg)?/i;
    const match = fullText.match(qtyRegex);
    if (match && match[1]) {
      const num = parseFloat(match[1]);
      if (!isNaN(num) && num > 0) {
        return {
          value: num,
          confidence: 0.94,
          rawText: match[0],
        };
      }
    }

    for (const b of blocks) {
      const bMatch = b.text.match(qtyRegex);
      if (bMatch && bMatch[1]) {
        const num = parseFloat(bMatch[1]);
        if (!isNaN(num) && num > 0) {
          return {
            value: num,
            confidence: 0.90,
            rawText: bMatch[0],
          };
        }
      }
    }

    return null;
  }

  /**
   * HSD (High Speed Diesel) extraction
   */
  private extractHSD(
    fullText: string,
    blocks: OCRBlock[]
  ): ExtractedFieldValue | null {
    const hsdRegex = /(?:h\.?s\.?d\.?|diesel|fuel)\s*(?:qty|ltrs?|amount|litres?)?[:.\s-]*([0-9]+(?:\.[0-9]{1,2})?)/i;
    const match = fullText.match(hsdRegex);
    if (match && match[1]) {
      const num = parseFloat(match[1]);
      if (!isNaN(num) && num > 0) {
        return {
          value: num,
          confidence: 0.93,
          rawText: match[0],
        };
      }
    }

    for (const b of blocks) {
      const bMatch = b.text.match(hsdRegex);
      if (bMatch && bMatch[1]) {
        const num = parseFloat(bMatch[1]);
        if (!isNaN(num) && num > 0) {
          return {
            value: num,
            confidence: 0.89,
            rawText: bMatch[0],
          };
        }
      }
    }

    return null;
  }

  /**
   * Serial Number (Sl. No.) extraction
   */
  private extractSerialNumber(
    fullText: string,
    blocks: OCRBlock[]
  ): ExtractedFieldValue | null {
    const slRegex = /(?:sl\.?\s*no\.?|sr\.?\s*no\.?|s\.?\s*no\.?)[:.\s-]*([0-9]+)/i;
    const match = fullText.match(slRegex);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > 0) {
        return {
          value: num,
          confidence: 0.95,
          rawText: match[0],
        };
      }
    }

    return null;
  }
}

export const fieldExtractor = new RuleBasedFieldExtractor();
