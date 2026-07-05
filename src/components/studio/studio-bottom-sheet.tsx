"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

type Snap = "peek" | "half" | "full";

const HANDLE_STRIP = 40; // px height of the grab handle strip
const SNAP_CYCLE: Snap[] = ["peek", "half", "full"];
const HALF_FRACTION = 0.55;
const FULL_FRACTION = 0.9;

function viewportHeight(): number {
  if (typeof window === "undefined") return 800;
  return window.visualViewport?.height ?? window.innerHeight;
}

/**
 * Mobile-only bottom sheet for the Shop Studio. The shop preview fills the
 * screen behind it; this sheet holds the same tab bar + editing panel as the
 * desktop side rail. It snaps between three heights — peek (just the tabs),
 * half (default), and full — is draggable by the handle, rides above the
 * on-screen keyboard, and never dims the preview so sellers keep seeing their
 * shop while they edit.
 */
export function StudioBottomSheet({
  header,
  children,
  defaultSnap = "half",
}: {
  /** Always-visible tab bar shown even when collapsed to peek. */
  header: ReactNode;
  children: ReactNode;
  defaultSnap?: Snap;
}) {
  // SSR-safe "are we on the client yet" flag without a setState-in-effect.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [snap, setSnap] = useState<Snap>(defaultSnap);
  const [peekPx, setPeekPx] = useState(120);
  const [dragHeight, setDragHeight] = useState<number | null>(null);
  const [keyboardInset, setKeyboardInset] = useState(0);
  const headerWrapRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startY: number; startH: number } | null>(null);

  // Peek height = handle strip + the tab bar, so collapsing still shows tabs.
  useLayoutEffect(() => {
    const measure = () => {
      const h = headerWrapRef.current?.offsetHeight ?? 94;
      setPeekPx(h);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const snapToPx = useCallback(
    (s: Snap): number => {
      if (s === "peek") return peekPx;
      if (s === "half") return Math.round(viewportHeight() * HALF_FRACTION);
      return Math.round(viewportHeight() * FULL_FRACTION);
    },
    [peekPx],
  );

  // Keep the sheet above the software keyboard using the visual viewport.
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const onResize = () => {
      const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setKeyboardInset(inset);
      if (inset > 120) setSnap("full"); // keyboard is open — give room to type
    };
    vv.addEventListener("resize", onResize);
    vv.addEventListener("scroll", onResize);
    return () => {
      vv.removeEventListener("resize", onResize);
      vv.removeEventListener("scroll", onResize);
    };
  }, []);

  const height = dragHeight ?? snapToPx(snap);

  function onHandlePointerDown(e: React.PointerEvent) {
    dragRef.current = { startY: e.clientY, startH: height };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onHandlePointerMove(e: React.PointerEvent) {
    if (!dragRef.current) return;
    const delta = dragRef.current.startY - e.clientY; // up = grow
    const next = Math.min(
      snapToPx("full"),
      Math.max(peekPx, dragRef.current.startH + delta),
    );
    setDragHeight(next);
  }
  function onHandlePointerUp(e: React.PointerEvent) {
    if (!dragRef.current) return;
    const current = dragHeight ?? dragRef.current.startH;
    const moved = Math.abs(current - dragRef.current.startH);
    dragRef.current = null;
    setDragHeight(null);
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);

    // A tap (barely moved) toggles between peek (see your shop) and half (edit);
    // full height is reached by dragging up. This keeps the common gesture —
    // "collapse so I can see my preview" — a single predictable tap.
    if (moved < 8) {
      setSnap((s) => (s === "peek" ? "half" : "peek"));
      return;
    }
    let nearest: Snap = "half";
    let best = Infinity;
    for (const s of SNAP_CYCLE) {
      const d = Math.abs(snapToPx(s) - current);
      if (d < best) {
        best = d;
        nearest = s;
      }
    }
    setSnap(nearest);
  }

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-x-0 bottom-0 z-40 flex flex-col rounded-t-2xl border-t border-border bg-card shadow-[0_-8px_30px_rgba(0,0,0,0.25)] lg:hidden"
      style={{
        height,
        transform: `translateY(${-keyboardInset}px)`,
        transition: dragHeight != null ? "none" : "height 0.28s ease, transform 0.2s ease",
        touchAction: "none",
      }}
      role="dialog"
      aria-label="Shop editor"
    >
      <div ref={headerWrapRef} className="shrink-0">
        {/* Drag handle — drag to resize, or tap to cycle peek / half / full. */}
        <div
          onPointerDown={onHandlePointerDown}
          onPointerMove={onHandlePointerMove}
          onPointerUp={onHandlePointerUp}
          className="flex cursor-grab touch-none flex-col items-center justify-center gap-0.5 active:cursor-grabbing"
          style={{ height: HANDLE_STRIP }}
          aria-label="Drag to resize, or tap to expand or collapse the editor"
          role="button"
        >
          <span className="h-1.5 w-10 rounded-full bg-muted-foreground/40" />
          <span className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
            <ChevronUp
              className={cn("size-3 transition-transform", snap !== "peek" && "rotate-180")}
            />
            {snap === "peek" ? "Tap to edit" : "Tap to see your shop"}
          </span>
        </div>
        {header}
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">{children}</div>
    </div>,
    document.body,
  );
}
