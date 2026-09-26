export interface OCRBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface OCRBlock {
  text: string;
  boundingBox?: OCRBoundingBox;
  confidence?: number;
}

export interface OCRResult {
  fullText: string;
  blocks: OCRBlock[];
}

export interface OCRService {
  recognize(imagePath: string): Promise<OCRResult>;
}
