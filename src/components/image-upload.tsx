"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, Loader2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  IMAGE_UPLOAD_ACCEPT,
  isAcceptableImageFile,
  prepareImageForUpload,
} from "@/lib/image-upload-client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ImageCropDialog } from "@/components/image-crop-dialog";

/**
 * Uploads an image to a public Supabase Storage bucket under the current
 * user's folder and writes the resulting public URL into a hidden input so
 * it submits with the surrounding form.
 */
export function ImageUpload({
  name,
  bucket,
  defaultValue,
  aspect = "video",
  label = "Upload image",
  onChange,
  cropAspect,
}: {
  name: string;
  bucket: "covers" | "products" | "avatars";
  defaultValue?: string | null;
  aspect?: "video" | "square";
  label?: string;
  onChange?: (url: string) => void;
  /** When set, opens a zoom/pan crop dialog before upload (e.g. 16/6 for banners). */
  cropAspect?: number;
}) {
  const [url, setUrlState] = useState<string>(defaultValue ?? "");
  const setUrl = (next: string) => {
    setUrlState(next);
    onChange?.(next);
  };
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function uploadPrepared(prepared: File) {
    if (prepared.size > 5 * 1024 * 1024) {
      setError("Image must be under 5MB.");
      return;
    }

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("You must be logged in to upload.");
      return;
    }
    const ext = prepared.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, prepared, { cacheControl: "3600", upsert: false });
    if (uploadError) {
      setError(uploadError.message);
      return;
    }
    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(path);
    setUrl(publicUrl);
  }

  async function onFile(file: File) {
    setError(null);
    if (!isAcceptableImageFile(file)) {
      setError("Please choose an image file (JPEG, PNG, WebP, or HEIC).");
      return;
    }

    setUploading(true);
    try {
      const prepared = await prepareImageForUpload(file);
      if (cropAspect) {
        setCropFile(prepared);
        return;
      }
      await uploadPrepared(prepared);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function onCropConfirm(blob: Blob) {
    setCropFile(null);
    setUploading(true);
    try {
      await uploadPrepared(new File([blob], "banner.jpg", { type: "image/jpeg" }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <input type="hidden" name={name} value={url} />
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file) void onFile(file);
        }}
        className={cn(
          "relative flex w-full items-center justify-center overflow-hidden rounded-lg border border-dashed bg-muted transition-colors",
          dragging ? "border-primary bg-primary/5" : "border-border",
          aspect === "video" ? "aspect-[16/6]" : "aspect-square max-w-xs",
        )}
      >
        {url ? (
          <>
            <Image src={url} alt="Preview" fill className="object-cover" />
            <button
              type="button"
              onClick={() => setUrl("")}
              className="absolute right-2 top-2 rounded-full bg-background/80 p-1 text-foreground hover:bg-background"
              aria-label="Remove image"
            >
              <X className="size-4" />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex flex-col items-center gap-2 p-6 text-sm text-muted-foreground hover:text-foreground"
          >
            {uploading ? (
              <Loader2 className="size-6 animate-spin" />
            ) : (
              <ImagePlus className="size-6" />
            )}
            {uploading ? "Uploading…" : label}
          </button>
        )}
      </div>

      {url && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          Replace image
        </Button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={IMAGE_UPLOAD_ACCEPT}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void onFile(file);
          e.target.value = "";
        }}
      />
      {error && <p className="text-sm text-live">{error}</p>}

      {cropFile && cropAspect && (
        <ImageCropDialog
          file={cropFile}
          aspect={cropAspect}
          title="Crop shop banner"
          onCancel={() => {
            setCropFile(null);
            setUploading(false);
          }}
          onConfirm={(blob) => void onCropConfirm(blob)}
        />
      )}
    </div>
  );
}
