"use client";

import { useId, useState } from "react";
import { CircleHelp } from "lucide-react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function FieldHelp({
  label,
  children,
  className,
}: {
  /** Short label for screen readers, e.g. "Duration" */
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const tooltipId = useId();

  return (
    <span className={cn("relative inline-flex align-middle", className)}>
      <button
        type="button"
        className="inline-flex rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={`More about ${label}`}
        aria-describedby={open ? tooltipId : undefined}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((v) => !v)}
      >
        <CircleHelp className="size-3.5" aria-hidden />
      </button>
      <span
        id={tooltipId}
        role="tooltip"
        className={cn(
          "pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-64 -translate-x-1/2 rounded-lg border border-border bg-card px-3 py-2 text-left text-xs leading-relaxed text-foreground shadow-md",
          open ? "visible opacity-100" : "invisible opacity-0",
        )}
      >
        {children}
      </span>
    </span>
  );
}

export function LabelWithHelp({
  htmlFor,
  children,
  helpLabel,
  help,
}: {
  htmlFor?: string;
  children: React.ReactNode;
  helpLabel: string;
  help: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Label htmlFor={htmlFor}>{children}</Label>
      <FieldHelp label={helpLabel}>{help}</FieldHelp>
    </div>
  );
}

export function CheckboxWithHelp({
  id,
  name,
  checked,
  onChange,
  label,
  help,
}: {
  id: string;
  name: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  help: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <input
        id={id}
        type="checkbox"
        name={name}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5"
      />
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        <label htmlFor={id} className="cursor-pointer">
          {label}
        </label>
        <FieldHelp label={label}>{help}</FieldHelp>
      </div>
    </div>
  );
}
