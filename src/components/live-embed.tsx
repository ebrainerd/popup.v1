import { ExternalLink, Radio } from "lucide-react";
import type { LiveEmbed as LiveEmbedType } from "@/lib/embeds";
import { Button } from "@/components/ui/button";

export function LiveEmbed({ embed }: { embed: NonNullable<LiveEmbedType> }) {
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
      <div className="overflow-hidden rounded-xl border border-border bg-black">
        <div className="relative aspect-video w-full">
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
