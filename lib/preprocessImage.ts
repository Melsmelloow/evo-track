// lib/preprocessImage.ts
export function preprocessImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    // Timeout fallback — if image doesn't load in 5s, reject
    const timeout = setTimeout(() => {
      URL.revokeObjectURL(url);
      reject(new Error("Image load timeout"));
    }, 5000);

    img.onload = () => {
      clearTimeout(timeout);
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          URL.revokeObjectURL(url);
          return reject(new Error("Canvas context unavailable"));
        }

        // Cap size — mobile images can be huge, scale down to max 2000px
        const MAX = 2000;
        const scale = Math.min(1, MAX / Math.max(img.width, img.height));
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
          const gray =
            0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          const contrasted = gray < 100 ? 0 : gray > 160 ? 255 : gray;
          data[i] = data[i + 1] = data[i + 2] = contrasted;
        }

        ctx.putImageData(imageData, 0, 0);
        URL.revokeObjectURL(url);

        canvas.toBlob(
          (blob) => {
            if (!blob) return reject(new Error("toBlob returned null"));
            resolve(blob);
          },
          "image/jpeg", // jpeg is faster than png on mobile
          0.9,
        );
      } catch (e) {
        URL.revokeObjectURL(url);
        reject(e);
      }
    };

    img.onerror = (e) => {
      clearTimeout(timeout);
      URL.revokeObjectURL(url);
      reject(new Error("Image failed to load"));
    };

    img.src = url;
  });
}
