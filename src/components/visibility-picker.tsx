"use client";

import { Globe, Lock } from "lucide-react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { ShopVisibility } from "@/lib/database.types";

export function VisibilityPicker({
  visibility,
  onChange,
}: {
  visibility: ShopVisibility;
  onChange: (v: ShopVisibility) => void;
}) {
  return (
    <fieldset className="space-y-2">
      <Label>Visibility</Label>
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => onChange("public")}
          className={cn(
            "flex items-start gap-3 rounded-lg border border-border p-3 text-left",
            visibility === "public" && "border-primary bg-primary/5",
          )}
        >
          <Globe className="mt-0.5 size-4" />
          <span>
            <span className="block font-medium">Public</span>
            <span className="text-sm text-muted-foreground">Listed in Explore when published.</span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => onChange("private")}
          className={cn(
            "flex items-start gap-3 rounded-lg border border-border p-3 text-left",
            visibility === "private" && "border-primary bg-primary/5",
          )}
        >
          <Lock className="mt-0.5 size-4" />
          <span>
            <span className="block font-medium">Link only</span>
            <span className="text-sm text-muted-foreground">Buyers need your shop link.</span>
          </span>
        </button>
      </div>
    </fieldset>
  );
}
