import { isInviteOnlyMode } from "@/lib/discovery";
import { InviteOnlyHomePage } from "@/components/invite-only-home";
import { MarketplaceHomePage } from "@/components/marketplace-home";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  if (isInviteOnlyMode()) {
    return <InviteOnlyHomePage />;
  }
  return <MarketplaceHomePage />;
}
