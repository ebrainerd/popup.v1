import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-1.5 text-xl font-extrabold tracking-tight", className)}>
      <span
        aria-hidden
        className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-md shadow-primary/30 transition-transform duration-300 hover:scale-110"
      >
        P
      </span>
      <span>PopUp</span>
    </span>
  );
}
