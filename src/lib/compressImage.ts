import imageCompression from "browser-image-compression";

const DEFAULT_OPTIONS = {
  maxSizeMB: 0.4,
  maxWidthOrHeight: 1200,
  useWebWorker: true,
  initialQuality: 0.85,
  fileType: "image/webp" as const,
};

/**
 * Compress an image file before upload to reduce storage and egress.
 * Resizes to max 1200px, converts to WebP, targets ~400KB.
 */
export async function compressImageForUpload(file: File): Promise<File> {
  const opts = { ...DEFAULT_OPTIONS };
  try {
    const compressed = await imageCompression(file, opts);
    const name = file.name.replace(/\.[^.]+$/, "") || "image";
    return new File([compressed], `${name}.webp`, {
      type: "image/webp",
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
}
