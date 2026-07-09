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
        <p className="text-sm text-muted-foreground">
          Your drop has ended. Review what worked, then run it again — duplicate keeps your
          products and theme so you can tweak dates and promote the next one.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <Metric label="Gross sales" value={formatCurrency(report.grossSales)} />
          <Metric label="Orders" value={String(report.orderCount)} />
          <Metric label="Units sold" value={String(report.unitsSold)} />
          <Metric label="Peak viewers" value={String(report.peakViewers)} />
          <Metric label="Chat messages" value={String(report.chatCount)} />
          <Metric label="Waitlist signups" value={String(report.reminderSignups)} />
          <Metric label="New followers" value={String(report.followersGained)} />
          <Metric
            label="Waitlist → purchase"
            value={
              report.reminderToPurchase !== null ? `${report.reminderToPurchase}%` : "—"
            }
          />
          {report.auctionsRun > 0 && (
            <>
              <Metric label="Auctions run" value={String(report.auctionsRun)} />
              <Metric label="Auction revenue" value={formatCurrency(report.auctionRevenue)} />
              <Metric label="Avg bids / auction" value={String(report.avgBidsPerAuction)} />
              <Metric label="Highest bid" value={formatCurrency(report.highestBid)} />
              <Metric label="Unsold auctions" value={String(report.unsoldAuctions)} />
              <Metric
                label="Auction payment rate"
                value={
                  report.auctionPaymentRate !== null ? `${report.auctionPaymentRate}%` : "—"
                }
              />
            </>
          )}
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

        <div className="space-y-3 border-t border-border pt-4">
          <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
            <p className="font-medium">Run this drop again</p>
            <p className="mt-1 text-sm text-muted-foreground">
              <strong className="font-medium text-foreground">Duplicate this drop</strong> copies
              products, cover, and theme — update the schedule, publish, and share the new link.
              Or start fresh with a blank shop.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <form action={`/dashboard/shops/${shopId}/duplicate`} method="POST">
              <Button type="submit" className="rounded-full">
                <Copy className="size-4" />
                Duplicate this drop
              </Button>
            </form>
            <Button asChild variant="outline" className="rounded-full">
              <Link href="/dashboard/shops/new">
                <Plus className="size-4" />
                Start a new shop
              </Link>
            </Button>
          </div>
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
