"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Move, ZoomIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cropImageToBlob, drawCroppedImage, type CropTransform } from "@/lib/image-crop";

export function ImageCropDialog({
  file,
  aspect,
  title = "Crop image",
  onCancel,
  onConfirm,
}: {
  file: File;
  aspect: number;
  title?: string;
  onCancel: () => void;
  onConfirm: (cropped: Blob) => void;
}) {
  const previewUrl = useMemo(() => URL.createObjectURL(file), [file]);
  const [transform, setTransform] = useState<CropTransform>({
    offsetX: 0,
    offsetY: 0,
    scale: 1,
  });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, offsetX: 0, offsetY: 0 });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const paintPreview = useCallback(() => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image) return;
    const rect = canvas.getBoundingClientRect();
    const width = Math.round(rect.width);
    const height = Math.round(rect.height);
    if (width === 0 || height === 0) return;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawCroppedImage(ctx, image, width, height, transform);
  }, [transform]);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      paintPreview();
    };
    img.src = previewUrl;
    return () => {
      imageRef.current = null;
      URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl, paintPreview]);

  useEffect(() => {
    paintPreview();
  }, [paintPreview]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      event.currentTarget.setPointerCapture(event.pointerId);
      setDragging(true);
      dragStart.current = {
        x: event.clientX,
        y: event.clientY,
        offsetX: transform.offsetX,
        offsetY: transform.offsetY,
      };
    },
    [transform.offsetX, transform.offsetY],
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (!dragging) return;
      const dx = event.clientX - dragStart.current.x;
      const dy = event.clientY - dragStart.current.y;
      setTransform((prev) => ({
        ...prev,
        offsetX: dragStart.current.offsetX + dx,
        offsetY: dragStart.current.offsetY + dy,
      }));
    },
    [dragging],
  );

  const onPointerUp = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    setDragging(false);
    event.currentTarget.releasePointerCapture(event.pointerId);
  }, []);

  async function handleConfirm() {
    setError(null);
    setPending(true);
    try {
      const cropped = await cropImageToBlob(file, aspect, transform);
      onConfirm(cropped);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not crop image.");
    } finally {
      setPending(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4">
      <div className="w-full max-w-2xl rounded-xl border border-border bg-card p-5 shadow-xl">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Drag to reposition and zoom so the banner looks right in your shop preview.
        </p>

        <div className="relative mt-4 overflow-hidden rounded-lg border border-border bg-black">
          <canvas
            ref={canvasRef}
            className="aspect-[16/6] w-full touch-none cursor-move"
            style={{ aspectRatio: String(aspect) }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          />
          <div className="pointer-events-none absolute bottom-2 left-2 flex items-center gap-1 rounded bg-background/80 px-2 py-1 text-xs text-muted-foreground">
            <Move className="size-3" />
            Drag to move
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <Label htmlFor="crop-zoom" className="flex items-center gap-2 text-sm">
            <ZoomIn className="size-4" />
            Zoom
          </Label>
          <input
            id="crop-zoom"
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={transform.scale}
            onChange={(e) =>
              setTransform((prev) => ({ ...prev, scale: Number(e.target.value) }))
            }
            className="w-full"
          />
        </div>

        {error && <p className="mt-3 text-sm text-live">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void handleConfirm()} disabled={pending}>
            {pending ? "Saving…" : "Use crop"}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
