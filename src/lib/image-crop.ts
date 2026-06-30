export type CropTransform = {
  /** Horizontal pan in viewport pixels (positive moves image right). */
  offsetX: number;
  /** Vertical pan in viewport pixels (positive moves image down). */
  offsetY: number;
  /** Zoom multiplier applied to the fitted base scale. */
  scale: number;
};

export function drawCroppedImage(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  viewportWidth: number,
  viewportHeight: number,
  transform: CropTransform,
) {
  const baseScale = Math.max(viewportWidth / image.width, viewportHeight / image.height);
  const scale = baseScale * transform.scale;
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  const x = (viewportWidth - drawWidth) / 2 + transform.offsetX;
  const y = (viewportHeight - drawHeight) / 2 + transform.offsetY;

  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, viewportWidth, viewportHeight);
  ctx.drawImage(image, x, y, drawWidth, drawHeight);
}

/** Render a cropped region to a JPEG blob for upload. */
export async function cropImageToBlob(
  source: File | string,
  aspect: number,
  transform: CropTransform,
  outputWidth = 1600,
): Promise<Blob> {
  const image = await loadImage(source);
  const viewportWidth = outputWidth;
  const viewportHeight = Math.round(outputWidth / aspect);

  const canvas = document.createElement("canvas");
  canvas.width = viewportWidth;
  canvas.height = viewportHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not prepare image crop.");

  drawCroppedImage(ctx, image, viewportWidth, viewportHeight, transform);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.92),
  );
  if (!blob) throw new Error("Could not export cropped image.");
  return blob;
}

function loadImage(source: File | string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onerror = () => reject(new Error("Could not load image."));
    if (typeof source === "string") {
      img.onload = () => resolve(img);
      img.src = source;
    } else {
      const url = URL.createObjectURL(source);
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.src = url;
    }
  });
}
