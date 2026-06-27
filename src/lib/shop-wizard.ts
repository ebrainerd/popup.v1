import type { Product, Shop } from "@/lib/database.types";
import type { AuctionFieldState } from "@/components/auction-product-fields";
import { defaultAuctionFields } from "@/components/auction-product-fields";
import { isoToLocalInput, localInputToIso } from "@/lib/datetime";
import { parseLiveEmbed } from "@/lib/embeds";

export const WIZARD_STEPS = [
  { id: "details", label: "Shop details", shortLabel: "Details" },
  { id: "products", label: "Products", shortLabel: "Products" },
  { id: "live", label: "Live stream", shortLabel: "Live" },
  { id: "schedule", label: "Schedule", shortLabel: "Schedule" },
] as const;

export type WizardStepId = (typeof WIZARD_STEPS)[number]["id"];

export type WizardProductDraft = {
  clientId: string;
  dbId?: string;
  title: string;
  description: string;
  price: string;
  quantity: string;
  shippingRate: string;
  photo_urls: string[];
  auctionFields: AuctionFieldState;
};

export type ShopWizardDraft = {
  shopId?: string;
  name: string;
  description: string;
  visibility: "public" | "private";
  coverUrl: string;
  youtubeUrl: string;
  twitchUrl: string;
  startLocal: string;
  endLocal: string;
  products: WizardProductDraft[];
  completedSteps: WizardStepId[];
};

export function wizardStorageKey(shopId?: string): string {
  return shopId ? `popup-shop-wizard:${shopId}` : "popup-shop-wizard:new";
}

function plusHoursLocal(h: number): string {
  return isoToLocalInput(new Date(Date.now() + h * 3_600_000).toISOString());
}

export function defaultWizardDraft(): ShopWizardDraft {
  return {
    name: "",
    description: "",
    visibility: "private",
    coverUrl: "",
    youtubeUrl: "",
    twitchUrl: "",
    startLocal: plusHoursLocal(1),
    endLocal: plusHoursLocal(3),
    products: [],
    completedSteps: [],
  };
}

export function newWizardProduct(): WizardProductDraft {
  return {
    clientId: crypto.randomUUID(),
    title: "",
    description: "",
    price: "",
    quantity: "1",
    shippingRate: "0.00",
    photo_urls: [],
    auctionFields: defaultAuctionFields(),
  };
}

function splitStreamUrls(liveUrl: string | null, twitchUrl: string | null): {
  youtubeUrl: string;
  twitchUrl: string;
} {
  const twitch = twitchUrl?.trim() ?? "";
  if (twitch) {
    return { youtubeUrl: liveUrl?.trim() ?? "", twitchUrl: twitch };
  }
  if (!liveUrl?.trim()) return { youtubeUrl: "", twitchUrl: "" };
  const embed = parseLiveEmbed(liveUrl);
  if (embed?.kind === "twitch") return { youtubeUrl: "", twitchUrl: liveUrl };
  return { youtubeUrl: liveUrl, twitchUrl: "" };
}

export function productToWizardDraft(product: Product): WizardProductDraft {
  const isAuction = product.sale_type === "auction";
  const photos =
    product.photo_urls?.length > 0
      ? product.photo_urls
      : product.photo_url
        ? [product.photo_url]
        : [];

  return {
    clientId: product.id,
    dbId: product.id,
    title: product.title,
    description: product.description ?? "",
    price: ((isAuction ? product.auction_starting_bid ?? product.price : product.price) / 100).toFixed(
      2,
    ),
    quantity: String(product.quantity),
    shippingRate: ((product.shipping_rate ?? 0) / 100).toFixed(2),
    photo_urls: photos,
    auctionFields: {
      saleType: product.sale_type,
      startingBid: ((product.auction_starting_bid ?? product.price) / 100).toFixed(2),
      minIncrement: ((product.auction_min_increment ?? 100) / 100).toFixed(2),
      durationSeconds: product.auction_duration_seconds ?? 60,
      allowPrebids: product.auction_allow_prebids,
      suddenDeath: product.auction_sudden_death,
    },
  };
}

export function shopToWizardDraft(shop: Shop, products: Product[]): ShopWizardDraft {
  const streams = splitStreamUrls(shop.live_url, shop.twitch_url ?? null);
  const base: ShopWizardDraft = {
    shopId: shop.id,
    name: shop.name,
    description: shop.description ?? "",
    visibility: shop.visibility,
    coverUrl: shop.cover_url ?? "",
    youtubeUrl: streams.youtubeUrl,
    twitchUrl: streams.twitchUrl,
    startLocal: isoToLocalInput(shop.start_at),
    endLocal: isoToLocalInput(shop.end_at),
    products: products.map(productToWizardDraft),
    completedSteps: [],
  };
  return { ...base, completedSteps: inferCompletedSteps(base) };
}

function isValidOptionalUrl(value: string): boolean {
  if (!value.trim()) return true;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function isProductValid(product: WizardProductDraft): boolean {
  if (!product.title.trim()) return false;
  if (product.auctionFields.saleType === "buy_now") {
    const price = parseFloat(product.price);
    return !Number.isNaN(price) && price >= 0.5 && parseInt(product.quantity, 10) >= 0;
  }
  const start = parseFloat(product.auctionFields.startingBid);
  const inc = parseFloat(product.auctionFields.minIncrement);
  return (
    !Number.isNaN(start) &&
    start >= 0.5 &&
    !Number.isNaN(inc) &&
    inc >= 0.5 &&
    product.auctionFields.durationSeconds >= 1
  );
}

export function getStepValidation(
  stepId: WizardStepId,
  draft: ShopWizardDraft,
): { valid: boolean; message?: string } {
  switch (stepId) {
    case "details":
      if (!draft.name.trim()) return { valid: false, message: "Shop name is required." };
      return { valid: true };
    case "products":
      if (draft.products.length < 1) {
        return { valid: false, message: "Add at least one product." };
      }
      if (!draft.products.every(isProductValid)) {
        return { valid: false, message: "Complete each product's required fields." };
      }
      return { valid: true };
    case "live":
      if (!isValidOptionalUrl(draft.youtubeUrl)) {
        return { valid: false, message: "Enter a valid YouTube URL or leave it blank." };
      }
      if (!isValidOptionalUrl(draft.twitchUrl)) {
        return { valid: false, message: "Enter a valid Twitch URL or leave it blank." };
      }
      return { valid: true };
    case "schedule": {
      if (!draft.startLocal || !draft.endLocal) {
        return { valid: false, message: "Set both opening and closing times." };
      }
      if (new Date(draft.endLocal) <= new Date(draft.startLocal)) {
        return { valid: false, message: "Closing time must be after opening time." };
      }
      return { valid: true };
    }
    default:
      return { valid: true };
  }
}

export function isStepComplete(stepId: WizardStepId, draft: ShopWizardDraft): boolean {
  return draft.completedSteps.includes(stepId);
}

export function markStepComplete(draft: ShopWizardDraft, stepId: WizardStepId): ShopWizardDraft {
  if (draft.completedSteps.includes(stepId)) return draft;
  return { ...draft, completedSteps: [...draft.completedSteps, stepId] };
}

export function inferCompletedSteps(draft: ShopWizardDraft): WizardStepId[] {
  const completed: WizardStepId[] = [];
  for (const step of WIZARD_STEPS) {
    if (getStepValidation(step.id, draft).valid) completed.push(step.id);
    else break;
  }
  return completed;
}

export function maxReachableStepIndex(draft: ShopWizardDraft): number {
  let max = 0;
  for (let i = 0; i < WIZARD_STEPS.length; i++) {
    const prevSteps = WIZARD_STEPS.slice(0, i);
    const canReach = prevSteps.every((s) => isStepComplete(s.id, draft));
    if (canReach) max = i;
    else break;
  }
  return max;
}

export function canNavigateToStep(targetIndex: number, draft: ShopWizardDraft): boolean {
  return targetIndex <= maxReachableStepIndex(draft);
}

export function wizardDraftToFinishPayload(draft: ShopWizardDraft) {
  return buildWizardPersistPayload(draft);
}

export function wizardDraftToSavePayload(draft: ShopWizardDraft) {
  return buildWizardPersistPayload(draft, { draftMode: true });
}

function buildWizardPersistPayload(
  draft: ShopWizardDraft,
  options?: { draftMode?: boolean },
) {
  const defaults = defaultWizardDraft();
  const startLocal =
    draft.startLocal &&
    draft.endLocal &&
    new Date(draft.endLocal) > new Date(draft.startLocal)
      ? draft.startLocal
      : defaults.startLocal;
  const endLocal =
    draft.startLocal &&
    draft.endLocal &&
    new Date(draft.endLocal) > new Date(draft.startLocal)
      ? draft.endLocal
      : defaults.endLocal;

  return {
    shopId: draft.shopId,
    name: draft.name.trim(),
    description: draft.description.trim(),
    visibility: draft.visibility,
    coverUrl: draft.coverUrl.trim(),
    youtubeUrl: draft.youtubeUrl.trim(),
    twitchUrl: draft.twitchUrl.trim(),
    startAt: localInputToIso(startLocal),
    endAt: localInputToIso(endLocal),
    products: mapWizardProducts(draft, Boolean(options?.draftMode)),
  };
}

function mapWizardProducts(draft: ShopWizardDraft, draftMode: boolean) {
  const items = draftMode
    ? draft.products.filter((p) => p.title.trim())
    : draft.products;

  return items.map((p) => ({
    id: p.dbId,
    title: p.title.trim(),
    description: p.description.trim(),
    photo_urls: p.photo_urls,
    sale_type: p.auctionFields.saleType,
    price: draftMode ? parseFloat(p.price) || 0.5 : parseFloat(p.price) || 0,
    quantity: parseInt(p.quantity, 10) || 0,
    shipping_rate: parseFloat(p.shippingRate) || 0,
    auction_starting_bid: draftMode
      ? parseFloat(p.auctionFields.startingBid) || 0.5
      : parseFloat(p.auctionFields.startingBid) || 0,
    auction_min_increment: parseFloat(p.auctionFields.minIncrement) || 1,
    auction_duration_seconds: p.auctionFields.durationSeconds || 60,
    auction_allow_prebids: p.auctionFields.allowPrebids,
    auction_sudden_death: p.auctionFields.suddenDeath,
  }));
}

export function wizardHasDraftContent(draft: ShopWizardDraft): boolean {
  return Boolean(
    draft.name.trim() ||
      draft.description.trim() ||
      draft.coverUrl.trim() ||
      draft.youtubeUrl.trim() ||
      draft.twitchUrl.trim() ||
      draft.products.some((p) => p.title.trim()),
  );
}

export function loadWizardDraftFromStorage(shopId?: string): ShopWizardDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(wizardStorageKey(shopId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ShopWizardDraft;
    return { ...defaultWizardDraft(), ...parsed, shopId: shopId ?? parsed.shopId };
  } catch {
    return null;
  }
}

export function saveWizardDraftToStorage(draft: ShopWizardDraft): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(wizardStorageKey(draft.shopId), JSON.stringify(draft));
}

export function clearWizardDraftStorage(shopId?: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(wizardStorageKey(shopId));
  if (!shopId) sessionStorage.removeItem(wizardStorageKey());
}
