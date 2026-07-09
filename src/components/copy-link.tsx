"use client";

import { useState } from "react";
import { Check, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CopyLinkProps = {
  path: string;
  label?: string;
  /** Compact icon control (e.g. dashboard shop row actions). */
  iconOnly?: boolean;
  className?: string;
};

export function CopyLink({
  path,
  label = "Copy link",
  iconOnly = false,
  className,
}: CopyLinkProps) {
  const [copied, setCopied] = useState(false);

  function onCopy() {
    const url = `${window.location.origin}${path}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  if (iconOnly) {
    return (
      <button
        type="button"
        onClick={onCopy}
        className={cn(
          "inline-flex size-11 items-center justify-center rounded-md text-muted-foreground touch-manipulation hover:bg-muted hover:text-foreground md:size-9",
          className,
        )}
        aria-label={copied ? "Shop link copied" : label}
      >
        {copied ? <Check className="size-4 text-success" /> : <Link2 className="size-4" />}
      </button>
    );
  }

  return (
    <Button variant="outline" size="sm" onClick={onCopy} className={className}>
      {copied ? <Check className="size-4 text-success" /> : <Link2 className="size-4" />}
      {copied ? "Copied!" : label}
    </Button>
  );
}
