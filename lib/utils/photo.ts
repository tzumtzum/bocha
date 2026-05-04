/**
 * Compress and resize an image using HTMLCanvasElement.
 * Returns a Blob ready for upload.
 */
export function compressImage(
  file: File,
  options: { maxWidth?: number; maxHeight?: number; quality?: number } = {}
): Promise<Blob> {
  const { maxWidth = 1200, maxHeight = 1200, quality = 0.8 } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Canvas toBlob failed"));
        },
        "image/jpeg",
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };

    img.src = url;
  });
}

/**
 * Count photos for a given bird in demo mode.
 */
export function getBirdPhotoCount(birdId: string): number {
  try {
    const raw = localStorage.getItem("bobo_demo_photos");
    if (!raw) return 0;
    const photos = JSON.parse(raw) as { path: string }[];
    return photos.filter((p) => p.path.startsWith(`${birdId}/`)).length;
  } catch {
    return 0;
  }
}

/**
 * Get public URL for a photo in demo mode.
 * In real Supabase this would use getPublicUrl; in demo mode we return the data URL directly.
 */
export function getDemoPhotoUrl(path: string): string | null {
  try {
    const raw = localStorage.getItem("bobo_demo_photos");
    if (!raw) return null;
    const photos = JSON.parse(raw) as { path: string; dataUrl: string }[];
    return photos.find((p) => p.path === path)?.dataUrl || null;
  } catch {
    return null;
  }
}
