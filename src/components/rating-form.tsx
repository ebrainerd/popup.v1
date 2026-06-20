"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { submitRating } from "@/app/orders/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export function RatingForm({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [stars, setStars] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    if (stars < 1) {
      setError("Pick a star rating.");
      return;
    }
    startTransition(async () => {
      const res = await submitRating(orderId, stars, comment);
      if (res.ok) router.refresh();
      else setError(res.error ?? "Could not submit rating.");
    });
  }

  return (
    <div className="space-y-2 rounded-md border border-border p-3">
      <p className="text-sm font-medium">Rate this seller</p>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onClick={() => setStars(n)}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
          >
            <Star
              className={cn(
                "size-6 transition-colors",
                (hover || stars) >= n
                  ? "fill-current text-primary"
                  : "text-muted-foreground",
              )}
            />
          </button>
        ))}
      </div>
      <Textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={2}
        maxLength={1000}
        placeholder="Share a few words (optional)…"
      />
      {error && <p className="text-xs text-live">{error}</p>}
      <Button size="sm" onClick={submit} disabled={pending}>
        {pending ? "Submitting…" : "Submit rating"}
      </Button>
    </div>
  );
}
