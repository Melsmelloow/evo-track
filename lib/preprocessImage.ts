export function preprocessImage(file: File): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.src = url;

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;

      // Scale up for better OCR accuracy
      const scale = 2;
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        // Convert to grayscale
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        // Boost contrast — push darks darker, lights lighter
        const contrasted = gray < 100 ? 0 : gray > 160 ? 255 : gray;
        data[i] = data[i + 1] = data[i + 2] = contrasted;
      }

      ctx.putImageData(imageData, 0, 0);
      URL.revokeObjectURL(url);

      canvas.toBlob((blob) => resolve(blob!), "image/png");
    };
  });
}