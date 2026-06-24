/** HEIC/HEIF detection and browser-side conversion before Supabase upload. */

const HEIC_EXTENSIONS = new Set(["heic", "heif"]);
const HEIC_MIME_TYPES = new Set([
  "image/heic",
  "image/heif",
  "image/heic-sequence",
  "image/heif-sequence",
]);

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

/**
 * Convert HEIC/HEIF to JPEG so previews and storage work in all browsers.
 * Other image types pass through unchanged.
 */
export async function prepareImageForUpload(file: File): Promise<File> {
  if (!isHeicFile(file)) return file;

  const heic2any = (await import("heic2any")).default;
  const converted = await heic2any({
    blob: file,
    toType: "image/jpeg",
    quality: 0.9,
  });
  const blob = Array.isArray(converted) ? converted[0] : converted;
  const baseName = file.name.replace(/\.(heic|heif)$/i, "") || "photo";
  return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
}

export const IMAGE_UPLOAD_ACCEPT =
  "image/*,.heic,.heif,image/heic,image/heif";
