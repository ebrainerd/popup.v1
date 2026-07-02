import { ExternalLink, Radio } from "lucide-react";
import type { LiveEmbed as LiveEmbedType } from "@/lib/embeds";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function LiveEmbed({
  embed,
  fillHeight = false,
}: {
  embed: NonNullable<LiveEmbedType>;
  /** Fill the parent's height on desktop (chat-sidebar rows) instead of 16:9. */
  fillHeight?: boolean;
}) {
  if (!embed.embeddable) {
    // Instagram / other external: link out only.
    return (
      <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <Radio className="size-5 text-live animate-live-pulse" />
          <span className="font-medium">This seller is live on another platform.</span>
        </div>
        <Button asChild variant="outline" size="sm">
          <a href={embed.href} target="_blank" rel="noopener noreferrer">
            Watch externally
            <ExternalLink className="size-4" />
          </a>
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-primary/60 bg-black glow-primary",
        fillHeight && "lg:flex lg:h-full lg:flex-col",
      )}
    >
      <div className="flex items-center gap-2 px-4 py-2">
        <Radio className="size-4 text-live animate-live-pulse" />
        <span className="text-sm font-semibold uppercase tracking-wide text-live">
          Dropping Live
        </span>
      </div>
      <div className={cn("relative aspect-video w-full", fillHeight && "lg:aspect-auto lg:min-h-0 lg:flex-1")}>
        <iframe
          src={embed.src}
          title="Live stream"
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 h-full w-full"
        />
      </div>
    </div>
  );
}
