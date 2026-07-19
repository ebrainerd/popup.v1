/** HEIC/HEIF detection and browser-side conversion before Supabase upload. */

const HEIC_EXTENSIONS = new Set(["heic", "heif"]);
const HEIC_MIME_TYPES = new Set([
  "image/heic",
  "image/heif",
  "image/heic-sequence",
  "image/heif-sequence",
]);

export const HEIC_CONVERT_TIMEOUT_MS = 45_000;

const HEIC_CONVERT_ERROR =
  "Couldn't convert this iPhone photo. Try exporting it as JPEG in Photos, then upload again.";

export function isHeicFile(file: File): boolean {
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext && HEIC_EXTENSIONS.has(ext)) return true;
  return HEIC_MIME_TYPES.has(file.type.toLowerCase());
}

/** True for standard images and iPhone HEIC/HEIF captures. */
export function isAcceptableImageFile(file: File): boolean {
  if (isHeicFile(file)) return true;
  return file.type.startsWith("image/");
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T>((_, reject) => {
    timer = setTimeout(() => reject(new Error(HEIC_CONVERT_ERROR)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer !== undefined) clearTimeout(timer);
  });
}

async function convertHeicNative(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error(HEIC_CONVERT_ERROR);
    ctx.drawImage(bitmap, 0, 0);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.9),
    );
    if (!blob || blob.size === 0) throw new Error(HEIC_CONVERT_ERROR);
    return blob;
  } finally {
    bitmap.close();
  }
}

async function convertHeicWithLibrary(file: File): Promise<Blob> {
  const { heicTo } = await import("heic-to/csp");
  const blob = await heicTo({ blob: file, type: "image/jpeg", quality: 0.9 });
  if (!blob || blob.size === 0) throw new Error(HEIC_CONVERT_ERROR);
  return blob;
}

async function convertHeicToJpeg(file: File): Promise<Blob> {
  try {
    return await convertHeicNative(file);
  } catch {
    return await convertHeicWithLibrary(file);
  }
}

/**
 * Convert HEIC/HEIF to JPEG so previews and storage work in all browsers.
 * Other image types pass through unchanged.
 */
export async function prepareImageForUpload(file: File): Promise<File> {
  if (!isHeicFile(file)) return file;

  try {
    const blob = await withTimeout(convertHeicToJpeg(file), HEIC_CONVERT_TIMEOUT_MS);
    const baseName = file.name.replace(/\.(heic|heif)$/i, "") || "photo";
    return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
  } catch (e) {
    if (e instanceof Error && e.message === HEIC_CONVERT_ERROR) throw e;
    throw new Error(HEIC_CONVERT_ERROR);
  }
}

export const IMAGE_UPLOAD_ACCEPT =
  "image/*,.heic,.heif,image/heic,image/heif";
