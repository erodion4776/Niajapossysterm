
/**
 * Processes a File or Blob, resizes it to 500px width, 
 * and compresses it to a lightweight Base64 string.
 */
export async function processImage(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 500; // Standardized to 500px
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height = (MAX_WIDTH / width) * height;
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context failed'));
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);
        
        // Output as 60% quality for lightweight storage
        const dataUrl = canvas.toDataURL('image/webp', 0.6);
        const finalUrl = dataUrl.includes('image/webp') 
          ? dataUrl 
          : canvas.toDataURL('image/jpeg', 0.6);
          
        resolve(finalUrl);
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
}
