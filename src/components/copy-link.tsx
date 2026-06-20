"use client";

import { useState } from "react";
import { Check, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CopyLink({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);

  function onCopy() {
    const url = `${window.location.origin}${path}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <Button variant="outline" size="sm" onClick={onCopy}>
      {copied ? <Check className="size-4 text-success" /> : <Link2 className="size-4" />}
      {copied ? "Copied!" : "Copy link"}
    </Button>
  );
}
