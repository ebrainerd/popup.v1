"use client";

import { useState, type ReactNode } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function CollapsibleSection({
  id,
  title,
  description,
  defaultOpen = false,
  action,
  complete,
  children,
}: {
  id?: string;
  title: ReactNode;
  description?: string;
  defaultOpen?: boolean;
  action?: ReactNode;
  complete?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Card id={id}>
      <CardHeader className="p-0">
        <div className="flex items-stretch">
          <button
            type="button"
            className="flex min-w-0 flex-1 items-start justify-between gap-3 p-6 text-left"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <CardTitle>{title}</CardTitle>
                {complete === true && (
                  <Check className="size-4 shrink-0 text-success" aria-label="Complete" />
                )}
              </div>
              {description && (
                <p className="mt-1 text-sm text-muted-foreground">{description}</p>
              )}
            </div>
            <ChevronDown
              className={cn(
                "mt-0.5 size-5 shrink-0 text-muted-foreground transition-transform",
                open && "rotate-180",
              )}
            />
          </button>
          {action && (
            <div
              className="flex shrink-0 items-start border-l border-border p-4"
              onClick={(e) => e.stopPropagation()}
            >
              {action}
            </div>
          )}
        </div>
      </CardHeader>
      {open && <CardContent>{children}</CardContent>}
    </Card>
  );
}
