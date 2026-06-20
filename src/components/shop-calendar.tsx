"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type CalShop = { id: string; name: string; start_at: string; end_at: string };

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

/** Minimal month calendar that highlights days a shop opens. */
export function ShopCalendar({ shops }: { shops: CalShop[] }) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  // Map day-of-month -> shops opening that day
  const byDay = new Map<number, CalShop[]>();
  for (const s of shops) {
    const d = new Date(s.start_at);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      byDay.set(day, [...(byDay.get(day) ?? []), s]);
    }
  }

  const cells: (number | null)[] = [
    ...Array<null>(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const monthLabel = cursor.toLocaleString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setCursor(new Date(year, month - 1, 1))}
          className="rounded-md p-1 hover:bg-muted"
          aria-label="Previous month"
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="text-sm font-semibold">{monthLabel}</span>
        <button
          type="button"
          onClick={() => setCursor(new Date(year, month + 1, 1))}
          className="rounded-md p-1 hover:bg-muted"
          aria-label="Next month"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-muted-foreground">
        {WEEKDAYS.map((d, i) => (
          <div key={i}>{d}</div>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={i} />;
          const dayShops = byDay.get(day) ?? [];
          const isToday =
            today.getFullYear() === year &&
            today.getMonth() === month &&
            today.getDate() === day;
          const cell = (
            <div
              className={cn(
                "relative flex aspect-square flex-col items-center justify-center rounded-md text-xs",
                isToday && "ring-1 ring-primary",
                dayShops.length > 0
                  ? "bg-primary/10 font-semibold text-primary"
                  : "text-foreground",
              )}
            >
              {day}
              {dayShops.length > 0 && (
                <span className="absolute bottom-1 h-1 w-1 rounded-full bg-primary" />
              )}
            </div>
          );
          return dayShops.length === 1 ? (
            <Link key={i} href={`/dashboard/shops/${dayShops[0].id}`} title={dayShops[0].name}>
              {cell}
            </Link>
          ) : (
            <div key={i} title={dayShops.map((s) => s.name).join(", ")}>
              {cell}
            </div>
          );
        })}
      </div>
    </div>
  );
}
