"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, Loader2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

/**
 * Uploads one or more images to a public Supabase Storage bucket and keeps an
 * ordered list of public URLs. Serializes the list as JSON into a hidden input
 * (for forms) and/or reports via `onChange`. The first photo is the primary one.
 */
export function MultiImageUpload({
  name,
  bucket,
  defaultValue,
  max = 8,
  onChange,
}: {
  name?: string;
  bucket: "covers" | "products" | "avatars";
  defaultValue?: string[] | null;
  max?: number;
  onChange?: (urls: string[]) => void;
}) {
  const [urls, setUrlsState] = useState<string[]>(defaultValue ?? []);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function setUrls(next: string[]) {
    setUrlsState(next);
    onChange?.(next);
  }

  async function uploadFiles(files: FileList | File[]) {
    setError(null);
    const list = Array.from(files);
    const room = max - urls.length;
    if (room <= 0) {
      setError(`Up to ${max} photos.`);
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
      const added: string[] = [];
      for (const file of list.slice(0, room)) {
        if (!file.type.startsWith("image/")) continue;
        if (file.size > 5 * 1024 * 1024) {
          setError("Each image must be under 5MB.");
          continue;
        }
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(path, file, { cacheControl: "3600", upsert: false });
        if (uploadError) {
          setError(uploadError.message);
          continue;
        }
        const {
          data: { publicUrl },
        } = supabase.storage.from(bucket).getPublicUrl(path);
        added.push(publicUrl);
      }
      if (added.length) setUrls([...urls, ...added]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  function removeAt(i: number) {
    setUrls(urls.filter((_, idx) => idx !== i));
  }

  return (
    <div className="space-y-2">
      {name && <input type="hidden" name={name} value={JSON.stringify(urls)} />}

      <div className="flex flex-wrap gap-2">
        {urls.map((url, i) => (
          <div key={url} className="relative h-20 w-20 overflow-hidden rounded-md border border-border bg-muted">
            <Image src={url} alt={`Photo ${i + 1}`} fill className="object-cover" />
            {i === 0 && (
              <span className="absolute left-0 top-0 bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                Cover
              </span>
            )}
            <button
              type="button"
              onClick={() => removeAt(i)}
              className="absolute right-0.5 top-0.5 rounded-full bg-background/80 p-0.5 hover:bg-background"
              aria-label="Remove photo"
            >
              <X className="size-3" />
            </button>
          </div>
        ))}

        {urls.length < max && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              if (e.dataTransfer.files?.length) void uploadFiles(e.dataTransfer.files);
            }}
            className={cn(
              "flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-md border border-dashed text-[10px] text-muted-foreground transition-colors hover:text-foreground",
              dragging ? "border-primary bg-primary/5" : "border-border",
            )}
          >
            {uploading ? <Loader2 className="size-5 animate-spin" /> : <ImagePlus className="size-5" />}
            {uploading ? "Uploading" : "Add photo"}
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) void uploadFiles(e.target.files);
          e.target.value = "";
        }}
      />
      {error && <p className="text-sm text-live">{error}</p>}
    </div>
  );
}
