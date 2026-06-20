"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { deriveShopStatus, toCents } from "@/lib/utils";

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
      visibility: d.visibility,
      shipping_rate: toCents(d.shipping_rate),
      live_url: d.live_url || null,
      status: computeStatus(startIso, endIso),
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

  const { error } = await supabase
    .from("shops")
    .update({
      name: d.name,
      slug: slugify(d.name),
      description: d.description || null,
      cover_url: d.cover_url || null,
      start_at: startIso,
      end_at: endIso,
      visibility: d.visibility,
      shipping_rate: toCents(d.shipping_rate),
      live_url: d.live_url || null,
      status: computeStatus(startIso, endIso),
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

export async function deleteShop(shopId: string): Promise<void> {
  const { supabase, user } = await requireUser();
  await supabase.from("shops").delete().eq("id", shopId).eq("seller_id", user.id);
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

const productSchema = z.object({
  shop_id: z.string().uuid(),
  title: z.string().trim().min(1, "Title is required.").max(140),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  photo_url: z.string().url().optional().or(z.literal("")),
  price: z.coerce.number().min(0, "Price must be positive.").max(1_000_000),
  quantity: z.coerce.number().int().min(0).max(1_000_000),
});

export async function createProduct(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, user } = await requireUser();

  const parsed = productSchema.safeParse({
    shop_id: formData.get("shop_id"),
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    photo_url: formData.get("photo_url") ?? "",
    price: formData.get("price") ?? 0,
    quantity: formData.get("quantity") ?? 1,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const d = parsed.data;

  // Ownership is also enforced by RLS; this is a friendly early check.
  const { data: shop } = await supabase
    .from("shops")
    .select("id")
    .eq("id", d.shop_id)
    .eq("seller_id", user.id)
    .maybeSingle();
  if (!shop) return { error: "Shop not found." };

  const { error } = await supabase.from("products").insert({
    shop_id: d.shop_id,
    title: d.title,
    description: d.description || null,
    photo_url: d.photo_url || null,
    price: toCents(d.price),
    quantity: d.quantity,
  });
  if (error) return { error: error.message };

  revalidatePath(`/dashboard/shops/${d.shop_id}`);
  revalidatePath(`/shop/${d.shop_id}`);
  return { ...initialOk };
}

export async function deleteProduct(productId: string, shopId: string): Promise<void> {
  const { supabase, user } = await requireUser();
  // RLS guards ownership via owns_shop(); verify shop belongs to the user too.
  const { data: shop } = await supabase
    .from("shops")
    .select("id")
    .eq("id", shopId)
    .eq("seller_id", user.id)
    .maybeSingle();
  if (shop) {
    await supabase.from("products").delete().eq("id", productId);
    revalidatePath(`/dashboard/shops/${shopId}`);
    revalidatePath(`/shop/${shopId}`);
  }
}
