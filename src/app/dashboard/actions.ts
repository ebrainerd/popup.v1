"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { deriveShopStatus, toCents, computeEndShopTimes } from "@/lib/utils";
import { resolveShopVisibility } from "@/lib/discovery";
import {
  DEFAULT_AUCTION_DURATION,
  MIN_INCREMENT_CENTS,
} from "@/lib/auction-bidding";

export type ActionState = { error: string | null; fieldErrors?: Record<string, string> };

const initialOk: ActionState = { error: null };

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "shop"
  );
}

function computeStatus(startAt: string, endAt: string): "scheduled" | "open" | "ended" {
  return deriveShopStatus(startAt, endAt);
}

const shopSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required.").max(120),
    description: z.string().trim().max(2000).optional().or(z.literal("")),
    cover_url: z.string().url().optional().or(z.literal("")),
    start_at: z.string().min(1, "Start time is required."),
    end_at: z.string().min(1, "End time is required."),
    visibility: z.enum(["public", "private"]),
    shipping_rate: z.coerce.number().min(0).max(100000),
    live_url: z.string().url().optional().or(z.literal("")),
  })
  .refine((d) => new Date(d.end_at) > new Date(d.start_at), {
    message: "End time must be after start time.",
    path: ["end_at"],
  });

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirectTo=/dashboard");
  return { supabase, user };
}

export async function createShop(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, user } = await requireUser();

  const parsed = shopSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    cover_url: formData.get("cover_url") ?? "",
    start_at: formData.get("start_at"),
    end_at: formData.get("end_at"),
    visibility: formData.get("visibility") ?? "public",
    shipping_rate: formData.get("shipping_rate") ?? 0,
    live_url: formData.get("live_url") ?? "",
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
      fieldErrors: Object.fromEntries(
        parsed.error.issues.map((i) => [i.path[0]?.toString() ?? "form", i.message]),
      ),
    };
  }

  const d = parsed.data;
  const startIso = new Date(d.start_at).toISOString();
  const endIso = new Date(d.end_at).toISOString();
  const visibility = resolveShopVisibility(d.visibility);

  const { data: shop, error } = await supabase
    .from("shops")
    .insert({
      seller_id: user.id,
      name: d.name,
      slug: slugify(d.name),
      description: d.description || null,
      cover_url: d.cover_url || null,
      start_at: startIso,
      end_at: endIso,
      visibility,
      shipping_rate: toCents(d.shipping_rate),
      live_url: d.live_url || null,
      // New shops start as drafts: hidden from Explore/search until the seller
      // adds at least one product and explicitly publishes.
      status: "draft",
    })
    .select("id")
    .single();

  if (error || !shop) return { error: error?.message ?? "Could not create shop." };

  revalidatePath("/dashboard");
  redirect(`/dashboard/shops/${shop.id}?created=1`);
}

export async function updateShop(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  const shopId = formData.get("shop_id");
  if (typeof shopId !== "string") return { error: "Missing shop id." };

  const parsed = shopSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    cover_url: formData.get("cover_url") ?? "",
    start_at: formData.get("start_at"),
    end_at: formData.get("end_at"),
    visibility: formData.get("visibility") ?? "public",
    shipping_rate: formData.get("shipping_rate") ?? 0,
    live_url: formData.get("live_url") ?? "",
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
      fieldErrors: Object.fromEntries(
        parsed.error.issues.map((i) => [i.path[0]?.toString() ?? "form", i.message]),
      ),
    };
  }

  const d = parsed.data;
  const startIso = new Date(d.start_at).toISOString();
  const endIso = new Date(d.end_at).toISOString();
  const visibility = resolveShopVisibility(d.visibility);

  // Editing must not auto-publish a draft; only refresh the schedule-derived
  // status for already-published shops.
  const { data: current } = await supabase
    .from("shops")
    .select("status")
    .eq("id", shopId)
    .eq("seller_id", user.id)
    .maybeSingle();
  const nextStatus = current?.status === "draft" ? "draft" : computeStatus(startIso, endIso);

  const { error } = await supabase
    .from("shops")
    .update({
      name: d.name,
      slug: slugify(d.name),
      description: d.description || null,
      cover_url: d.cover_url || null,
      start_at: startIso,
      end_at: endIso,
      visibility,
      shipping_rate: toCents(d.shipping_rate),
      live_url: d.live_url || null,
      status: nextStatus,
    })
    .eq("id", shopId)
    .eq("seller_id", user.id);

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/shops/${shopId}`);
  revalidatePath(`/shop/${shopId}`);
  return { ...initialOk };
}

/** Extend an open shop's end time by N minutes. */
export async function extendShop(shopId: string, minutes: number): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  const { data: shop } = await supabase
    .from("shops")
    .select("end_at, start_at")
    .eq("id", shopId)
    .eq("seller_id", user.id)
    .maybeSingle();
  if (!shop) return { error: "Shop not found." };

  const newEnd = new Date(new Date(shop.end_at).getTime() + minutes * 60_000).toISOString();
  const { error } = await supabase
    .from("shops")
    .update({ end_at: newEnd, status: computeStatus(shop.start_at, newEnd) })
    .eq("id", shopId)
    .eq("seller_id", user.id);
  if (error) return { error: error.message };

  revalidatePath(`/dashboard/shops/${shopId}`);
  revalidatePath(`/shop/${shopId}`);
  return { ...initialOk };
}

/** Publish a draft shop (requires at least one product). Makes it findable. */
export async function publishShop(shopId: string): Promise<ActionState> {
  const { supabase, user } = await requireUser();

  const { data: shop } = await supabase
    .from("shops")
    .select("id, start_at, end_at, status")
    .eq("id", shopId)
    .eq("seller_id", user.id)
    .maybeSingle();
  if (!shop) return { error: "Shop not found." };

  const { count } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true })
    .eq("shop_id", shopId);
  if ((count ?? 0) < 1) {
    return { error: "Add at least one product before publishing." };
  }

  const { error } = await supabase
    .from("shops")
    .update({ status: computeStatus(shop.start_at, shop.end_at) })
    .eq("id", shopId)
    .eq("seller_id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/shops/${shopId}`);
  revalidatePath(`/shop/${shopId}`);
  return { ...initialOk };
}

/** Move a published shop back to draft (hides it again). */
export async function unpublishShop(shopId: string): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("shops")
    .update({ status: "draft" })
    .eq("id", shopId)
    .eq("seller_id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/shops/${shopId}`);
  revalidatePath(`/shop/${shopId}`);
  return { ...initialOk };
}

/** Toggle a shop's live state (and optionally update the live URL). */
export async function toggleLive(shopId: string, isLive: boolean): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("shops")
    .update({ is_live: isLive })
    .eq("id", shopId)
    .eq("seller_id", user.id);
  if (error) return { error: error.message };

  // Notify followers when going live (no-op if notifications aren't configured).
  if (isLive) {
    const { notifyFollowersOfLive } = await import("@/lib/notifications");
    await notifyFollowersOfLive(shopId);
  }

  revalidatePath(`/dashboard/shops/${shopId}`);
  revalidatePath(`/shop/${shopId}`);
  return { ...initialOk };
}

export async function endShop(shopId: string): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  const { data: shop } = await supabase
    .from("shops")
    .select("start_at, end_at, status")
    .eq("id", shopId)
    .eq("seller_id", user.id)
    .maybeSingle();
  if (!shop) return { error: "Shop not found." };

  const now = new Date();
  if (deriveShopStatus(shop.start_at, shop.end_at, now) === "ended") {
    return { error: "This shop has already ended." };
  }

  const times = computeEndShopTimes(shop.start_at, shop.end_at, now);
  const nextStatus = shop.status === "draft" ? "draft" : "ended";

  const { error } = await supabase
    .from("shops")
    .update({
      start_at: times.start_at,
      end_at: times.end_at,
      is_live: false,
      status: nextStatus,
    })
    .eq("id", shopId)
    .eq("seller_id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/shops/${shopId}`);
  revalidatePath(`/shop/${shopId}`);
  revalidatePath("/explore");
  return { ...initialOk };
}

export async function deleteShop(shopId: string): Promise<void> {
  const { supabase, user } = await requireUser();
  await supabase.from("shops").delete().eq("id", shopId).eq("seller_id", user.id);
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

// Stripe's minimum chargeable amount is $0.50 USD — items below that can't be
// purchased, so we don't allow listing them.
const MIN_PRICE_USD = 0.5;
const MAX_PHOTOS = 8;

/** Parse a JSON array of photo URLs from a form field. */
function parsePhotoUrls(raw: FormDataEntryValue | null | undefined): string[] {
  if (typeof raw !== "string" || !raw) return [];
  try {
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) {
      return arr
        .filter((u): u is string => typeof u === "string" && /^https?:\/\//.test(u))
        .slice(0, MAX_PHOTOS);
    }
  } catch {
    /* ignore */
  }
  return [];
}

const productSchema = z
  .object({
    shop_id: z.string().uuid(),
    title: z.string().trim().min(1, "Title is required.").max(140),
    description: z.string().trim().max(2000).optional().or(z.literal("")),
    sale_type: z.enum(["buy_now", "auction"]).default("buy_now"),
    price: z.coerce.number().min(0).max(1_000_000),
    quantity: z.coerce.number().int().min(0).max(1_000_000),
    shipping_rate: z.coerce.number().min(0).max(100000).default(0),
    auction_starting_bid: z.coerce.number().min(0).optional(),
    auction_min_increment: z.coerce.number().min(0).optional(),
    auction_duration_seconds: z.coerce.number().int().min(0).optional(),
    auction_allow_prebids: z.coerce.boolean().optional(),
    auction_sudden_death: z.coerce.boolean().optional(),
  })
  .superRefine((d, ctx) => {
    if (d.sale_type === "buy_now") {
      if (d.price < MIN_PRICE_USD) {
        ctx.addIssue({
          code: "custom",
          message: "Price must be at least $0.50 (the payment minimum).",
          path: ["price"],
        });
      }
      return;
    }
    if (d.quantity !== 1) {
      ctx.addIssue({ code: "custom", message: "Auction items must have quantity 1.", path: ["quantity"] });
    }
    const start = d.auction_starting_bid ?? 0;
    const inc = d.auction_min_increment ?? 0;
    if (start < MIN_PRICE_USD) {
      ctx.addIssue({
        code: "custom",
        message: "Starting bid must be at least $0.50.",
        path: ["auction_starting_bid"],
      });
    }
    if (inc < MIN_INCREMENT_CENTS / 100) {
      ctx.addIssue({
        code: "custom",
        message: "Minimum increment must be at least $0.50.",
        path: ["auction_min_increment"],
      });
    }
    if (!d.auction_duration_seconds || d.auction_duration_seconds < 1) {
      ctx.addIssue({
        code: "custom",
        message: "Choose an auction duration.",
        path: ["auction_duration_seconds"],
      });
    }
  });

function parseProductForm(formData: FormData) {
  return {
    shop_id: formData.get("shop_id"),
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    sale_type: formData.get("sale_type") ?? "buy_now",
    price: formData.get("price") ?? 0,
    quantity: formData.get("quantity") ?? 1,
    shipping_rate: formData.get("shipping_rate") ?? 0,
    auction_starting_bid: formData.get("auction_starting_bid") ?? undefined,
    auction_min_increment: formData.get("auction_min_increment") ?? undefined,
    auction_duration_seconds: formData.get("auction_duration_seconds") ?? undefined,
    auction_allow_prebids: formData.get("auction_allow_prebids") === "on",
    auction_sudden_death: formData.get("auction_sudden_death") === "on",
  };
}

function productInsertFromParsed(d: z.infer<typeof productSchema>, photoUrls: string[]) {
  const isAuction = d.sale_type === "auction";
  const startingCents = isAuction ? toCents(d.auction_starting_bid ?? 0) : toCents(d.price);
  return {
    shop_id: d.shop_id,
    title: d.title,
    description: d.description || null,
    photo_url: photoUrls[0] ?? null,
    photo_urls: photoUrls,
    sale_type: d.sale_type,
    price: isAuction ? startingCents : toCents(d.price),
    quantity: isAuction ? 1 : d.quantity,
    shipping_rate: toCents(d.shipping_rate ?? 0),
    auction_starting_bid: isAuction ? startingCents : null,
    auction_min_increment: isAuction ? toCents(d.auction_min_increment ?? 1) : null,
    auction_duration_seconds: isAuction ? d.auction_duration_seconds ?? DEFAULT_AUCTION_DURATION : null,
    auction_allow_prebids: isAuction ? d.auction_allow_prebids !== false : true,
    auction_sudden_death: isAuction ? Boolean(d.auction_sudden_death) : false,
  };
}

const finishProductSchema = z
  .object({
    id: z.string().uuid().optional(),
    title: z.string().trim().min(1).max(140),
    description: z.string().trim().max(2000).optional().or(z.literal("")),
    sale_type: z.enum(["buy_now", "auction"]),
    price: z.coerce.number().min(0).max(1_000_000),
    quantity: z.coerce.number().int().min(0).max(1_000_000),
    photo_urls: z.array(z.string().url()).max(MAX_PHOTOS),
    shipping_rate: z.coerce.number().min(0).max(100000),
    auction_starting_bid: z.coerce.number().min(0).optional(),
    auction_min_increment: z.coerce.number().min(0).optional(),
    auction_duration_seconds: z.coerce.number().int().min(0).optional(),
    auction_allow_prebids: z.boolean().optional(),
    auction_sudden_death: z.boolean().optional(),
  })
  .superRefine((d, ctx) => {
    if (d.sale_type === "buy_now") {
      if (d.price < MIN_PRICE_USD) {
        ctx.addIssue({
          code: "custom",
          message: "Price must be at least $0.50.",
          path: ["price"],
        });
      }
      return;
    }
    if (d.quantity !== 1) {
      ctx.addIssue({ code: "custom", message: "Auction items must have quantity 1.", path: ["quantity"] });
    }
    const start = d.auction_starting_bid ?? 0;
    const inc = d.auction_min_increment ?? 0;
    if (start < MIN_PRICE_USD) {
      ctx.addIssue({
        code: "custom",
        message: "Starting bid must be at least $0.50.",
        path: ["auction_starting_bid"],
      });
    }
    if (inc < MIN_INCREMENT_CENTS / 100) {
      ctx.addIssue({
        code: "custom",
        message: "Minimum increment must be at least $0.50.",
        path: ["auction_min_increment"],
      });
    }
    if (!d.auction_duration_seconds || d.auction_duration_seconds < 1) {
      ctx.addIssue({
        code: "custom",
        message: "Choose an auction duration.",
        path: ["auction_duration_seconds"],
      });
    }
  });

const finishShopSetupSchema = z
  .object({
    shopId: z.string().uuid().optional(),
    name: z.string().trim().min(1, "Name is required.").max(120),
    description: z.string().trim().max(2000).optional().or(z.literal("")),
    coverUrl: z.string().url().optional().or(z.literal("")),
    startAt: z.string().min(1, "Start time is required."),
    endAt: z.string().min(1, "End time is required."),
    visibility: z.enum(["public", "private"]),
    youtubeUrl: z.string().url().optional().or(z.literal("")),
    twitchUrl: z.string().url().optional().or(z.literal("")),
    products: z.array(finishProductSchema).min(1, "Add at least one product."),
  })
  .refine((d) => new Date(d.endAt) > new Date(d.startAt), {
    message: "End time must be after start time.",
    path: ["endAt"],
  });

function finishProductInsert(
  shopId: string,
  product: z.infer<typeof finishProductSchema>,
) {
  const parsed = productSchema.safeParse({
    shop_id: shopId,
    title: product.title,
    description: product.description ?? "",
    sale_type: product.sale_type,
    price: product.sale_type === "buy_now" ? product.price : product.auction_starting_bid ?? 0,
    quantity: product.sale_type === "auction" ? 1 : product.quantity,
    shipping_rate: product.shipping_rate,
    auction_starting_bid: product.auction_starting_bid,
    auction_min_increment: product.auction_min_increment,
    auction_duration_seconds: product.auction_duration_seconds,
    auction_allow_prebids: product.auction_allow_prebids,
    auction_sudden_death: product.auction_sudden_death,
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid product.");
  return productInsertFromParsed(parsed.data, product.photo_urls);
}

/** Create or update a draft shop and products after the setup wizard finishes. */
export async function finishShopSetup(
  input: z.infer<typeof finishShopSetupSchema>,
): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  const parsed = finishShopSetupSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
      fieldErrors: Object.fromEntries(
        parsed.error.issues.map((i) => [i.path.join(".") || "form", i.message]),
      ),
    };
  }

  const d = parsed.data;
  const startIso = new Date(d.startAt).toISOString();
  const endIso = new Date(d.endAt).toISOString();
  const visibility = resolveShopVisibility(d.visibility);
  const shopPayload = {
    name: d.name,
    slug: slugify(d.name),
    description: d.description || null,
    cover_url: d.coverUrl || null,
    start_at: startIso,
    end_at: endIso,
    visibility,
    shipping_rate: 0,
    live_url: d.youtubeUrl || null,
    twitch_url: d.twitchUrl || null,
  };

  let shopId = d.shopId;

  if (shopId) {
    const { data: current } = await supabase
      .from("shops")
      .select("status")
      .eq("id", shopId)
      .eq("seller_id", user.id)
      .maybeSingle();
    if (!current) return { error: "Shop not found." };
    if (current.status !== "draft") return { error: "Only draft shops can be edited in setup." };

    const { error } = await supabase
      .from("shops")
      .update({ ...shopPayload, status: "draft" })
      .eq("id", shopId)
      .eq("seller_id", user.id);
    if (error) return { error: error.message };
  } else {
    const { data: shop, error } = await supabase
      .from("shops")
      .insert({
        seller_id: user.id,
        ...shopPayload,
        status: "draft",
      })
      .select("id")
      .single();
    if (error || !shop) return { error: error?.message ?? "Could not create shop." };
    shopId = shop.id;
  }

  if (!shopId) return { error: "Could not save shop." };

  const { data: existingProducts } = await supabase
    .from("products")
    .select("id")
    .eq("shop_id", shopId);
  const incomingIds = new Set(d.products.map((p) => p.id).filter(Boolean) as string[]);
  const toDelete = (existingProducts ?? []).filter((p) => !incomingIds.has(p.id));

  for (const productId of toDelete.map((p) => p.id)) {
    const { data: blocked } = await supabase
      .from("auction_runs")
      .select("id")
      .eq("product_id", productId)
      .in("status", ["live", "awaiting_payment", "paid"])
      .maybeSingle();
    if (!blocked) {
      await supabase.from("products").delete().eq("id", productId).eq("shop_id", shopId);
    }
  }

  for (const product of d.products) {
    const row = finishProductInsert(shopId, product);
    if (product.id) {
      const { error } = await supabase
        .from("products")
        .update(row)
        .eq("id", product.id)
        .eq("shop_id", shopId);
      if (error) return { error: error.message };
    } else {
      const { error } = await supabase.from("products").insert(row);
      if (error) return { error: error.message };
    }
  }

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/shops/${shopId}`);
  revalidatePath(`/shop/${shopId}`);
  redirect(`/dashboard/shops/${shopId}?created=1`);
}

const saveDraftProductSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(140),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  sale_type: z.enum(["buy_now", "auction"]).default("buy_now"),
  price: z.coerce.number().min(0).max(1_000_000).default(MIN_PRICE_USD),
  quantity: z.coerce.number().int().min(0).max(1_000_000).default(1),
  photo_urls: z.array(z.string().url()).max(MAX_PHOTOS).default([]),
  shipping_rate: z.coerce.number().min(0).max(100000).default(0),
  auction_starting_bid: z.coerce.number().min(0).optional(),
  auction_min_increment: z.coerce.number().min(0).optional(),
  auction_duration_seconds: z.coerce.number().int().min(0).optional(),
  auction_allow_prebids: z.boolean().optional(),
  auction_sudden_death: z.boolean().optional(),
});

const saveShopDraftSchema = z
  .object({
    shopId: z.string().uuid().optional(),
    name: z.string().trim().min(1, "Add a shop name before saving.").max(120),
    description: z.string().trim().max(2000).optional().or(z.literal("")),
    coverUrl: z.string().optional().or(z.literal("")),
    startAt: z.string().min(1),
    endAt: z.string().min(1),
    visibility: z.enum(["public", "private"]),
    youtubeUrl: z.string().url().optional().or(z.literal("")),
    twitchUrl: z.string().url().optional().or(z.literal("")),
    products: z.array(saveDraftProductSchema).default([]),
  })
  .refine((d) => new Date(d.endAt) > new Date(d.startAt), {
    message: "End time must be after start time.",
    path: ["endAt"],
  });

function saveDraftProductRow(shopId: string, product: z.infer<typeof saveDraftProductSchema>) {
  const isAuction = product.sale_type === "auction";
  const buyNowCents = toCents(Math.max(product.price, MIN_PRICE_USD));
  const startingCents = toCents(Math.max(product.auction_starting_bid ?? MIN_PRICE_USD, MIN_PRICE_USD));
  return {
    shop_id: shopId,
    title: product.title,
    description: product.description || null,
    photo_url: product.photo_urls[0] ?? null,
    photo_urls: product.photo_urls,
    sale_type: product.sale_type,
    price: isAuction ? startingCents : buyNowCents,
    quantity: isAuction ? 1 : product.quantity,
    shipping_rate: toCents(product.shipping_rate),
    auction_starting_bid: isAuction ? startingCents : null,
    auction_min_increment: isAuction ? toCents(product.auction_min_increment ?? 1) : null,
    auction_duration_seconds: isAuction
      ? product.auction_duration_seconds ?? DEFAULT_AUCTION_DURATION
      : null,
    auction_allow_prebids: isAuction ? product.auction_allow_prebids !== false : true,
    auction_sudden_death: isAuction ? Boolean(product.auction_sudden_death) : false,
  };
}

async function syncDraftProducts(
  supabase: Awaited<ReturnType<typeof createClient>>,
  shopId: string,
  products: z.infer<typeof saveDraftProductSchema>[],
) {
  const { data: existingProducts } = await supabase
    .from("products")
    .select("id")
    .eq("shop_id", shopId);
  const incomingIds = new Set(products.map((p) => p.id).filter(Boolean) as string[]);
  const toDelete = (existingProducts ?? []).filter((p) => !incomingIds.has(p.id));

  for (const productId of toDelete.map((p) => p.id)) {
    const { data: blocked } = await supabase
      .from("auction_runs")
      .select("id")
      .eq("product_id", productId)
      .in("status", ["live", "awaiting_payment", "paid"])
      .maybeSingle();
    if (!blocked) {
      await supabase.from("products").delete().eq("id", productId).eq("shop_id", shopId);
    }
  }

  for (const product of products) {
    const row = saveDraftProductRow(shopId, product);
    if (product.id) {
      const { error } = await supabase
        .from("products")
        .update(row)
        .eq("id", product.id)
        .eq("shop_id", shopId);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from("products").insert(row);
      if (error) throw new Error(error.message);
    }
  }
}

/** Save wizard progress as a dashboard draft without finishing setup. */
export async function saveShopDraft(
  input: z.infer<typeof saveShopDraftSchema>,
): Promise<ActionState & { shopId?: string }> {
  const { supabase, user } = await requireUser();
  const parsed = saveShopDraftSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
      fieldErrors: Object.fromEntries(
        parsed.error.issues.map((i) => [i.path.join(".") || "form", i.message]),
      ),
    };
  }

  const d = parsed.data;
  const coverUrl = d.coverUrl && /^https?:\/\//.test(d.coverUrl) ? d.coverUrl : null;
  const shopPayload = {
    name: d.name,
    slug: slugify(d.name),
    description: d.description || null,
    cover_url: coverUrl,
    start_at: new Date(d.startAt).toISOString(),
    end_at: new Date(d.endAt).toISOString(),
    visibility: resolveShopVisibility(d.visibility),
    shipping_rate: 0,
    live_url: d.youtubeUrl || null,
    twitch_url: d.twitchUrl || null,
  };

  let shopId = d.shopId;

  try {
    if (shopId) {
      const { data: current } = await supabase
        .from("shops")
        .select("status")
        .eq("id", shopId)
        .eq("seller_id", user.id)
        .maybeSingle();
      if (!current) return { error: "Shop not found." };
      if (current.status !== "draft") return { error: "Only draft shops can be saved here." };

      const { error } = await supabase
        .from("shops")
        .update({ ...shopPayload, status: "draft" })
        .eq("id", shopId)
        .eq("seller_id", user.id);
      if (error) return { error: error.message };
    } else {
      const { data: shop, error } = await supabase
        .from("shops")
        .insert({
          seller_id: user.id,
          ...shopPayload,
          status: "draft",
        })
        .select("id")
        .single();
      if (error || !shop) return { error: error?.message ?? "Could not save draft." };
      shopId = shop.id;
    }

    if (!shopId) return { error: "Could not save draft." };

    await syncDraftProducts(supabase, shopId, d.products);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not save draft." };
  }

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/shops/${shopId}`);
  revalidatePath(`/dashboard/shops/${shopId}/setup`);
  revalidatePath(`/shop/${shopId}`);
  return { error: null, shopId };
}

export async function createProduct(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, user } = await requireUser();

  const parsed = productSchema.safeParse(parseProductForm(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const d = parsed.data;
  const photoUrls = parsePhotoUrls(formData.get("photo_urls"));

  // Ownership is also enforced by RLS; this is a friendly early check.
  const { data: shop } = await supabase
    .from("shops")
    .select("id")
    .eq("id", d.shop_id)
    .eq("seller_id", user.id)
    .maybeSingle();
  if (!shop) return { error: "Shop not found." };

  const { error } = await supabase.from("products").insert(productInsertFromParsed(d, photoUrls));
  if (error) return { error: error.message };

  revalidatePath(`/dashboard/shops/${d.shop_id}`);
  revalidatePath(`/shop/${d.shop_id}`);
  return { ...initialOk };
}

const updateProductSchema = z
  .object({
    product_id: z.string().uuid(),
    shop_id: z.string().uuid(),
    title: z.string().trim().min(1, "Title is required.").max(140),
    description: z.string().trim().max(2000).optional().or(z.literal("")),
    sale_type: z.enum(["buy_now", "auction"]),
    price: z.coerce.number().min(0).max(1_000_000),
    quantity: z.coerce.number().int().min(0).max(1_000_000),
    shipping_rate: z.coerce.number().min(0).max(100000).default(0),
    auction_starting_bid: z.coerce.number().min(0).optional(),
    auction_min_increment: z.coerce.number().min(0).optional(),
    auction_duration_seconds: z.coerce.number().int().min(0).optional(),
    auction_allow_prebids: z.boolean().optional(),
    auction_sudden_death: z.boolean().optional(),
  })
  .superRefine((d, ctx) => {
    if (d.sale_type === "buy_now" && d.price < MIN_PRICE_USD) {
      ctx.addIssue({
        code: "custom",
        message: "Price must be at least $0.50.",
        path: ["price"],
      });
    }
    if (d.sale_type === "auction" && d.quantity !== 1) {
      ctx.addIssue({ code: "custom", message: "Auction quantity must be 1.", path: ["quantity"] });
    }
  });

export type UpdateProductResult = { ok: boolean; error?: string };

export async function updateProduct(input: {
  product_id: string;
  shop_id: string;
  title: string;
  description?: string;
  photo_urls?: string[];
  sale_type?: "buy_now" | "auction";
  price: number;
  quantity: number;
  shipping_rate?: number;
  auction_starting_bid?: number;
  auction_min_increment?: number;
  auction_duration_seconds?: number;
  auction_allow_prebids?: boolean;
  auction_sudden_death?: boolean;
}): Promise<UpdateProductResult> {
  const { supabase, user } = await requireUser();

  const parsed = updateProductSchema.safeParse({
    ...input,
    sale_type: input.sale_type ?? "buy_now",
    auction_allow_prebids: input.auction_allow_prebids ?? true,
    auction_sudden_death: input.auction_sudden_death ?? false,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const d = parsed.data;
  const photoUrls = (input.photo_urls ?? [])
    .filter((u) => typeof u === "string" && /^https?:\/\//.test(u))
    .slice(0, MAX_PHOTOS);

  const { data: shop } = await supabase
    .from("shops")
    .select("id")
    .eq("id", d.shop_id)
    .eq("seller_id", user.id)
    .maybeSingle();
  if (!shop) return { ok: false, error: "Shop not found." };

  const { data: liveRun } = await supabase
    .from("auction_runs")
    .select("id, bid_count, status")
    .eq("product_id", d.product_id)
    .in("status", ["live", "awaiting_payment"])
    .maybeSingle();
  if (liveRun && (liveRun.bid_count > 0 || liveRun.status === "awaiting_payment")) {
    return { ok: false, error: "Cannot edit while an auction is live or awaiting payment." };
  }

  const isAuction = d.sale_type === "auction";
  const startingCents = isAuction ? toCents(d.auction_starting_bid ?? d.price) : toCents(d.price);

  const { error } = await supabase
    .from("products")
    .update({
      title: d.title,
      description: d.description || null,
      photo_url: photoUrls[0] ?? null,
      photo_urls: photoUrls,
      sale_type: d.sale_type,
      price: isAuction ? startingCents : toCents(d.price),
      quantity: isAuction ? 1 : d.quantity,
      shipping_rate: toCents(d.shipping_rate ?? 0),
      auction_starting_bid: isAuction ? startingCents : null,
      auction_min_increment: isAuction ? toCents(d.auction_min_increment ?? 1) : null,
      auction_duration_seconds: isAuction ? d.auction_duration_seconds ?? DEFAULT_AUCTION_DURATION : null,
      auction_allow_prebids: isAuction ? d.auction_allow_prebids !== false : true,
      auction_sudden_death: isAuction ? Boolean(d.auction_sudden_death) : false,
    })
    .eq("id", d.product_id)
    .eq("shop_id", d.shop_id);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/dashboard/shops/${d.shop_id}`);
  revalidatePath(`/shop/${d.shop_id}`);
  return { ok: true };
}

export async function deleteProduct(productId: string, shopId: string): Promise<void> {
  const { supabase, user } = await requireUser();
  const { data: shop } = await supabase
    .from("shops")
    .select("id")
    .eq("id", shopId)
    .eq("seller_id", user.id)
    .maybeSingle();
  if (!shop) return;

  const { data: blocked } = await supabase
    .from("auction_runs")
    .select("id")
    .eq("product_id", productId)
    .in("status", ["live", "awaiting_payment", "paid"])
    .maybeSingle();
  if (blocked) return;

  await supabase.from("products").delete().eq("id", productId);
  revalidatePath(`/dashboard/shops/${shopId}`);
  revalidatePath(`/shop/${shopId}`);
}

/** Duplicate a shop as a new draft with products copied. */
export async function duplicateShop(shopId: string): Promise<void> {
  const { supabase, user } = await requireUser();

  const { data: source } = await supabase
    .from("shops")
    .select("*")
    .eq("id", shopId)
    .eq("seller_id", user.id)
    .maybeSingle();
  if (!source) redirect("/dashboard");

  const { data: products } = await supabase
    .from("products")
    .select("*")
    .eq("shop_id", shopId);

  const start = new Date();
  start.setDate(start.getDate() + 7);
  const end = new Date(start);
  end.setHours(end.getHours() + 4);

  const { data: copy, error } = await supabase
    .from("shops")
    .insert({
      seller_id: user.id,
      name: `${source.name} (copy)`,
      slug: slugify(`${source.name}-copy-${Date.now()}`),
      description: source.description,
      cover_url: source.cover_url,
      start_at: start.toISOString(),
      end_at: end.toISOString(),
      visibility: source.visibility,
      shipping_rate: source.shipping_rate,
      live_url: source.live_url,
      twitch_url: source.twitch_url,
      status: "draft",
    })
    .select("id")
    .single();

  if (error || !copy) redirect(`/dashboard/shops/${shopId}`);

  if (products && products.length > 0) {
    await supabase.from("products").insert(
      products.map((p) => ({
        shop_id: copy.id,
        title: p.title,
        description: p.description,
        photo_url: p.photo_url,
        photo_urls: p.photo_urls,
        price: p.price,
        quantity: p.quantity,
        shipping_rate: p.shipping_rate,
        is_flash_only: p.is_flash_only,
        sale_type: p.sale_type,
        auction_starting_bid: p.auction_starting_bid,
        auction_min_increment: p.auction_min_increment,
        auction_duration_seconds: p.auction_duration_seconds,
        auction_allow_prebids: p.auction_allow_prebids,
        auction_sudden_death: p.auction_sudden_death,
      })),
    );
  }

  revalidatePath("/dashboard");
  redirect(`/dashboard/shops/${copy.id}/setup`);
}
