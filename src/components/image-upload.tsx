"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, Loader2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
}: {
  name: string;
  bucket: "covers" | "products" | "avatars";
  defaultValue?: string | null;
  aspect?: "video" | "square";
  label?: string;
}) {
  const [url, setUrl] = useState<string>(defaultValue ?? "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function onFile(file: File) {
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be under 5MB.");
      return;
    }

    setUploading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("You must be logged in to upload.");
        return;
      }
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, file, { cacheControl: "3600", upsert: false });
      if (uploadError) {
        setError(uploadError.message);
        return;
      }
      const {
        data: { publicUrl },
      } = supabase.storage.from(bucket).getPublicUrl(path);
      setUrl(publicUrl);
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
        className={cn(
          "relative flex w-full items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-muted",
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
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void onFile(file);
          e.target.value = "";
        }}
      />
      {error && <p className="text-sm text-live">{error}</p>}
    </div>
  );
}
