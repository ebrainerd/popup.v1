import Link from "next/link";
import { BarChart3, Copy, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import type { DropReport } from "@/lib/drop-analytics";

export function DropReportCard({
  report,
  shopId,
}: {
  report: DropReport;
  shopId: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="size-5" />
          Drop report
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <Metric label="Gross sales" value={formatCurrency(report.grossSales)} />
          <Metric label="Orders" value={String(report.orderCount)} />
          <Metric label="Units sold" value={String(report.unitsSold)} />
          <Metric label="Peak viewers" value={String(report.peakViewers)} />
          <Metric label="Chat messages" value={String(report.chatCount)} />
          <Metric label="Waitlist" value={String(report.reminderSignups)} />
          <Metric label="New followers" value={String(report.followersGained)} />
          <Metric
            label="Reminder → purchase"
            value={
              report.reminderToPurchase !== null ? `${report.reminderToPurchase}%` : "—"
            }
          />
        </dl>

        {report.sellThrough.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Sell-through
            </p>
            <ul className="space-y-1 text-sm">
              {report.sellThrough.map((p) => (
                <li key={p.title} className="flex justify-between gap-2">
                  <span className="truncate">{p.title}</span>
                  <span className="shrink-0 text-muted-foreground">
                    {p.sold}/{p.total}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-wrap gap-2 border-t border-border pt-4">
          <Button asChild className="rounded-full">
            <Link href="/dashboard/shops/new">
              <Plus className="size-4" />
              Schedule next drop
            </Link>
          </Button>
          <form action={`/dashboard/shops/${shopId}/duplicate`} method="POST">
            <Button type="submit" variant="outline" className="rounded-full">
              <Copy className="size-4" />
              Duplicate this drop
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-lg font-bold tabular-nums">{value}</dd>
    </div>
  );
}
