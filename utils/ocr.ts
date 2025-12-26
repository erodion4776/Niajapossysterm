import { createWorker } from 'tesseract.js';

/**
 * Pre-processes an image for better OCR results.
 * Converts to grayscale and boosts contrast.
 */
export async function preprocessImage(imageBlob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(URL.createObjectURL(imageBlob));

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Grayscale and Contrast boost
      const contrast = 50; // Boost contrast by 50
      const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));

      for (let i = 0; i < data.length; i += 4) {
        // Grayscale
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        
        // Contrast
        const val = factor * (avg - 128) + 128;
        
        data[i] = data[i + 1] = data[i + 2] = Math.min(255, Math.max(0, val));
      }

      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };
    img.src = URL.createObjectURL(imageBlob);
  });
}

/**
 * Extracts a date string from a messy OCR text using regex.
 * Supports: DD/MM/YYYY, MM/YY, DD-MM-YY, EXP: 2026, etc.
 */
export function extractExpiryDate(text: string): string | null {
  // Normalize text
  const clean = text.toUpperCase().replace(/\s+/g, ' ');

  // Regex patterns for dates
  const patterns = [
    // DD/MM/YYYY or DD/MM/YY
    /\b(\d{1,2})[\/\.\-](\d{1,2})[\/\.\-](\d{2,4})\b/,
    // MM/YYYY or MM/YY
    /\b(\d{1,2})[\/\.\-](\d{2,4})\b/,
    // YYYY-MM-DD
    /\b(\d{4})[\/\.\-](\d{1,2})[\/\.\-](\d{1,2})\b/,
    // Just Year (e.g. EXP 2026)
    /EXP:?\s*(\d{4})/
  ];

  for (const pattern of patterns) {
    const match = clean.match(pattern);
    if (match) {
      let day = '01';
      let month = '01';
      let year = '';

      if (pattern.source.includes('EXP:?')) {
        year = match[1];
      } else if (match.length === 4) {
        // D/M/Y or Y/M/D
        if (match[1].length === 4) {
          year = match[1];
          month = match[2];
          day = match[3];
        } else {
          day = match[1];
          month = match[2];
          year = match[3];
        }
      } else if (match.length === 3) {
        // M/Y
        month = match[1];
        year = match[2];
      }

      // Final normalization
      if (year.length === 2) year = '20' + year;
      month = month.padStart(2, '0');
      day = day.padStart(2, '0');

      // Validate month
      const m = parseInt(month);
      if (m < 1 || m > 12) continue;

      return `${year}-${month}-${day}`;
    }
  }

  return null;
}

let workerInstance: any = null;

export async function getOCRWorker(onProgress: (p: number) => void) {
  if (workerInstance) return workerInstance;

  const worker = await createWorker('eng', 1, {
    logger: m => {
      if (m.status === 'initializing api' || m.status === 'loading tesseract core' || m.status === 'loading language traineddata') {
        onProgress(Math.round(m.progress * 100));
      }
    },
  });
  
  workerInstance = worker;
  return worker;
}