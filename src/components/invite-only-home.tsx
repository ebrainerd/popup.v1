import { getCurrentUser } from "@/lib/auth";
import { createShopPath } from "@/lib/auth-routes";
import { LandingHero } from "@/components/landing/landing-hero";
import { LandingMarquee } from "@/components/landing/landing-marquee";
import { LandingSteps } from "@/components/landing/landing-steps";
import { LandingFeatures } from "@/components/landing/landing-features";
import { LandingCta } from "@/components/landing/landing-cta";

/**
 * Invite-only landing page: a scrollable walkthrough that shows sellers
 * exactly how a PopUp drop works, from first product to sold out.
 * Sections live in `src/components/landing/`.
 */
export async function InviteOnlyHomePage() {
  const user = await getCurrentUser();
  const createShopHref = createShopPath(Boolean(user));

  return (
    <div>
      <LandingHero createShopHref={createShopHref} />
      <LandingMarquee />
      <LandingSteps />
      <LandingFeatures />
      <LandingCta createShopHref={createShopHref} />
    </div>
  );
}
