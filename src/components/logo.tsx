import { cn } from "@/lib/utils";

/** L2 arcs mark — letter-free concentric ping + ember core. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-7 w-7 shrink-0 text-primary", className)}
      aria-hidden
    >
      {/* Outer / mid arcs open toward the left (signal / pop) */}
      <path
        d="M15.5 5.25a10.75 10.75 0 1 0 0 21.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M15.5 8.5a7.5 7.5 0 1 0 0 15"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="16" cy="16" r="4.25" fill="currentColor" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 text-xl font-extrabold tracking-tight text-foreground",
        className,
      )}
    >
      <LogoMark className="transition-transform duration-300 hover:scale-110" />
      <span className="font-[family-name:var(--font-syne)] font-extrabold leading-none">
        Pop
        <span className="relative inline-block">
          Up
          <span
            aria-hidden
            className="absolute -bottom-[0.12em] left-0 h-[0.12em] w-[0.72em] rounded-full bg-primary"
          />
        </span>
      </span>
    </span>
  );
}
