import Link from "next/link";
import { Eye, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DraftPreviewBanner({
  shopId,
  scheduleLabel,
}: {
  shopId: string;
  scheduleLabel: string;
}) {
  return (
    <div className="mb-6 rounded-xl border border-highlight/40 bg-highlight/10 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-2">
          <Eye className="mt-0.5 size-5 shrink-0 text-highlight" />
          <div>
            <p className="font-medium">Draft preview — only you can see this</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {scheduleLabel} Purchases and chat stay disabled until you publish.
            </p>
          </div>
        </div>
        <Button asChild size="sm" className="rounded-full">
          <Link href={`/dashboard/shops/${shopId}`}>
            <Rocket className="size-4" />
            Publish drop
          </Link>
        </Button>
      </div>
    </div>
  );
}
