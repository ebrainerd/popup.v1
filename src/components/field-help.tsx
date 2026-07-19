"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const tooltipId = useId();

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) {
      setCoords(null);
      return;
    }
    const rect = buttonRef.current.getBoundingClientRect();
    setCoords({
      top: rect.top - 8,
      left: rect.left + rect.width / 2,
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function reposition() {
      if (!buttonRef.current) return;
      const rect = buttonRef.current.getBoundingClientRect();
      setCoords({
        top: rect.top - 8,
        left: rect.left + rect.width / 2,
      });
    }
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open]);

  const tooltip =
    open &&
    coords &&
    typeof document !== "undefined" &&
    createPortal(
      <span
        id={tooltipId}
        role="tooltip"
        className="pointer-events-none fixed z-[200] w-64 -translate-x-1/2 -translate-y-full rounded-lg border border-border bg-card px-3 py-2 text-left text-xs leading-relaxed text-foreground shadow-md"
        style={{ top: coords.top, left: coords.left }}
      >
        {children}
      </span>,
      document.body,
    );

  return (
    <span className={cn("relative inline-flex align-middle", className)}>
      <button
        ref={buttonRef}
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
      {tooltip}
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
