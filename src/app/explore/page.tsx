import type { Metadata } from "next";
import { isInviteOnlyMode } from "@/lib/discovery";
import { ExploreHoldingPage } from "@/components/explore-holding-page";
import MarketplaceExplorePage from "./marketplace-explore";

export const metadata: Metadata = { title: "Explore" };
export const dynamic = "force-dynamic";

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; sort?: string }>;
}) {
  if (isInviteOnlyMode()) {
    return <ExploreHoldingPage />;
  }
  return <MarketplaceExplorePage searchParams={searchParams} />;
}
