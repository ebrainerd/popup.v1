import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Store, Star, DollarSign, CalendarDays } from "lucide-react";
import { getCurrentProfile } from "@/lib/auth";
import { getSellerShops } from "@/lib/shops";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ShopCalendar } from "@/components/shop-calendar";
import { SellerShopRow } from "@/components/seller-shop-row";
import { deriveShopStatus, formatCurrency } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const profile = (await getCurrentProfile())!;
  const shops = await getSellerShops(profile.id);

  const supabase = await createClient();
  const { data: orders } = await supabase
    .from("orders")
    .select("amount_paid, platform_fee")
    .in("shop_id", shops.length ? shops.map((s) => s.id) : ["00000000-0000-0000-0000-000000000000"]);

  const grossSales = (orders ?? []).reduce((sum, o) => sum + (o.amount_paid ?? 0), 0);
  const published = shops.filter((s) => s.status !== "draft");
  const drafts = shops.filter((s) => s.status === "draft");

  const activeCount = published.filter(
    (s) => deriveShopStatus(s.start_at, s.end_at) !== "ended",
  ).length;

  const live = published.filter((s) => deriveShopStatus(s.start_at, s.end_at) === "open");
  const upcoming = published.filter((s) => deriveShopStatus(s.start_at, s.end_at) === "scheduled");
  const ended = published.filter((s) => deriveShopStatus(s.start_at, s.end_at) === "ended");

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">
            Hi, @{profile.username} 👋
          </h1>
          <p className="text-muted-foreground">Manage your drops and orders.</p>
        </div>
        <Button asChild className="rounded-full">
          <Link href="/dashboard/shops/new">
            <Plus className="size-4" /> Create shop
          </Link>
        </Button>
      </div>

      {process.env.STRIPE_SECRET_KEY && !profile.stripe_onboarded && (
        <Card className="border-primary/40 bg-primary/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="font-medium">Set up payouts to get paid</p>
              <p className="text-sm text-muted-foreground">
                Connect a Stripe payout account before your shops start selling.
              </p>
            </div>
            <Button asChild>
              <Link href="/dashboard/payouts">Set up payouts</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard tone="success" icon={<DollarSign />} label="Gross sales" value={formatCurrency(grossSales)} />
        <StatCard tone="accent" icon={<Store />} label="Active shops" value={String(activeCount)} />
        <StatCard tone="highlight" icon={<CalendarDays />} label="Total shops" value={String(shops.length)} />
        <StatCard
          tone="primary"
          icon={<Star />}
          label="Avg rating"
          value={profile.rating_count > 0 ? Number(profile.rating_avg ?? 0).toFixed(1) : "—"}
        />
      </div>

      {shops.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Store className="size-8 text-muted-foreground" />
            <p className="text-muted-foreground">You haven&apos;t created any drops yet.</p>
            <Button asChild className="rounded-full">
              <Link href="/dashboard/shops/new">Create your first drop</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          <div className="space-y-8">
            <ShopSection title="Dropping Live" shops={live} />
            <ShopSection title="Upcoming" shops={upcoming} />
            <ShopSection title="Drafts" shops={drafts} />
            <ShopSection title="Ended" shops={ended} />
          </div>
          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Calendar
            </h2>
            <ShopCalendar
              shops={shops.map((s) => ({
                id: s.id,
                name: s.name,
                start_at: s.start_at,
                end_at: s.end_at,
              }))}
            />
          </div>
        </div>
      )}
    </div>
  );
}

const STAT_TONES = {
  primary: "bg-primary/15 text-primary shadow-[0_0_18px_-4px_var(--primary)]",
  accent: "bg-accent/15 text-accent shadow-[0_0_18px_-4px_var(--accent)]",
  highlight: "bg-highlight/15 text-highlight shadow-[0_0_18px_-4px_var(--highlight)]",
  success: "bg-success/15 text-success shadow-[0_0_18px_-4px_var(--success)]",
} as const;

function StatCard({
  icon,
  label,
  value,
  tone = "primary",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: keyof typeof STAT_TONES;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <span
          className={`flex size-10 items-center justify-center rounded-full [&_svg]:size-4 ${STAT_TONES[tone]}`}
        >
          {icon}
        </span>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-bold tabular-nums">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function ShopSection({
  title,
  shops,
}: {
  title: string;
  shops: Awaited<ReturnType<typeof getSellerShops>>;
}) {
  if (shops.length === 0) return null;
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      <div className="space-y-2">
        {shops.map((shop) => (
          <SellerShopRow key={shop.id} shop={shop} />
        ))}
      </div>
    </section>
  );
}
