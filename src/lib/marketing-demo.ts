import type { ShopWizardDraft } from "@/lib/shop-wizard";
import { defaultShopTheme } from "@/lib/shop-theme";
import { COVER_STUDIO, PRODUCTS } from "@/lib/marketing-images";
import type { AuctionFieldState } from "@/components/auction-product-fields";

const defaultAuctionFields = (): AuctionFieldState => ({
  saleType: "buy_now",
  startingBid: "",
  minIncrement: "1.00",
  durationSeconds: 60,
  endsWithShop: false,
  allowPrebids: true,
  suddenDeath: false,
});

function hoursFromNow(h: number): string {
  const d = new Date(Date.now() + h * 3_600_000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Prefilled Studio draft for marketing screenshots on /dashboard/shops/new */
export function marketingDemoDraft(): ShopWizardDraft {
  return {
    name: "Autumn Kiln Drop",
    description:
      "Warm-toned mugs, bud vases, and catch-all dishes — thrown fresh this week in my Portland studio.",
    visibility: "public",
    coverUrl: COVER_STUDIO,
    streamSource: "native",
    youtubeUrl: "",
    twitchUrl: "",
    startLocal: hoursFromNow(48),
    endLocal: hoursFromNow(52),
    scheduleSet: true,
    completedSteps: ["details", "products", "live", "layout", "schedule"],
    theme: {
      ...defaultShopTheme(),
      preset: "market_stall",
      layout: "classic",
      accent: "#ff5c1a",
      background: "gradient",
      productGridColumns: 3,
      showChat: true,
      showSellerBio: true,
      showReminderCta: true,
    },
    products: [
      {
        clientId: "demo-1",
        title: "Harvest Mug",
        description: "16oz mug with rust speckle glaze.",
        price: "38",
        quantity: "6",
        shippingRate: "",
        photo_urls: [PRODUCTS.mug],
        auctionFields: defaultAuctionFields(),
      },
      {
        clientId: "demo-2",
        title: "Amber Bud Vase",
        description: "Perfect for a single stem.",
        price: "42",
        quantity: "4",
        shippingRate: "",
        photo_urls: [PRODUCTS.vaseSet],
        auctionFields: defaultAuctionFields(),
      },
      {
        clientId: "demo-3",
        title: "Cinnamon Bowl",
        description: "Serving bowl with layered glaze.",
        price: "58",
        quantity: "3",
        shippingRate: "",
        photo_urls: [PRODUCTS.bowl],
        auctionFields: defaultAuctionFields(),
      },
      {
        clientId: "demo-4",
        title: "Catch-All Dish",
        description: "For keys, rings, and tiny treasures.",
        price: "28",
        quantity: "8",
        shippingRate: "",
        photo_urls: [PRODUCTS.ringDish],
        auctionFields: defaultAuctionFields(),
      },
      {
        clientId: "demo-5",
        title: "Taper Candle Holder",
        description: "Stoneware, fits standard tapers.",
        price: "34",
        quantity: "5",
        shippingRate: "",
        photo_urls: [PRODUCTS.candle],
        auctionFields: defaultAuctionFields(),
      },
      {
        clientId: "demo-6",
        title: "Limited Glaze Vase",
        description: "One-of-one tall vase.",
        price: "72",
        quantity: "1",
        shippingRate: "",
        photo_urls: [PRODUCTS.limitedVase],
        auctionFields: defaultAuctionFields(),
      },
    ],
  };
}

export function isMarketingDemoEnabled(): boolean {
  return process.env.NEXT_PUBLIC_MARKETING_DEMO === "1";
}
