"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ChevronDown, MessageCircle, Monitor, Package, ShoppingBag, User } from "lucide-react";
import {
  SHOP_LAYOUT_MODE_META,
  SHOP_THEME_PRESET_META,
  previewPageBackground,
  shopThemeCssVars,
  shopThemeRootClassName,
  SHOP_PRESET_VISUAL,
  type ShopTheme,
} from "@/lib/shop-theme";
import { cn, formatCurrency } from "@/lib/utils";

type PreviewProduct = {
  title: string;
  price: string;
  photoUrl?: string;
};

export type ShopPreviewPhase = "scheduled" | "open" | "live";

export function ShopThemePreview({
  theme,
  shopName,
  coverUrl,
  products,
  viewport = "desktop",
  phase = "open",
  showActivity = false,
}: {
  theme: ShopTheme;
  shopName: string;
  coverUrl?: string;
  products: PreviewProduct[];
  viewport?: "desktop" | "mobile";
  phase?: ShopPreviewPhase;
  /** Show a looping "just sold" ticker so an open/live shop feels alive. */
  showActivity?: boolean;
}) {
  const preset = SHOP_THEME_PRESET_META[theme.preset];
  const layout = SHOP_LAYOUT_MODE_META[theme.layout];
  const visual = SHOP_PRESET_VISUAL[theme.preset];
  const isMobile = viewport === "mobile";
  const previewProducts = products.filter((p) => p.title.trim()).slice(0, theme.productGridColumns);
  const displayProducts =
    previewProducts.length > 0 ? previewProducts : [{ title: "Sample item", price: "24.00" }];

  const cssVars = {
    ...shopThemeCssVars(theme),
    background: previewPageBackground(theme),
    color: visual.foreground,
    fontFamily: visual.fontFamily,
  } as React.CSSProperties;

  return (
    <div
      className={cn(
        "mx-auto flex flex-col overflow-hidden rounded-2xl border shadow-xl",
        isMobile ? "w-[300px]" : "w-full max-w-3xl",
        shopThemeRootClassName(theme),
      )}
      style={{
        ...cssVars,
        borderColor: visual.border,
      }}
    >
      {/* Browser / device chrome */}
      <div
        className="flex items-center gap-2 border-b px-3 py-2 text-[10px]"
        style={{ borderColor: visual.border, background: visual.cardBackground, color: visual.mutedForeground }}
      >
        <div className="flex gap-1">
          <span className="size-2 rounded-full bg-red-400/80" />
          <span className="size-2 rounded-full bg-amber-400/80" />
          <span className="size-2 rounded-full bg-emerald-400/80" />
        </div>
        <span className="ml-1 truncate font-medium">
          {isMobile ? "popupdrop.co · mobile" : "popupdrop.co/shop/preview"}
        </span>
        <span className="ml-auto flex items-center gap-1">
          <span className="rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide" style={{ background: `${visual.mutedForeground}22`, color: visual.mutedForeground }}>
            {phase === "scheduled" ? "Scheduled" : phase === "live" ? "Live" : "Open"}
          </span>
          <span className="rounded-full px-2 py-0.5 text-[9px]" style={{ background: `${theme.accent}22`, color: theme.accent }}>
            {preset.label}
          </span>
        </span>
      </div>

      <div className="relative flex-1 space-y-3 p-3 sm:p-4" style={{ background: previewPageBackground(theme) }}>
        {showActivity && phase !== "scheduled" && (
          <MockSaleTicker products={displayProducts} accent={theme.accent} />
        )}
        <LayoutPreview
          theme={theme}
          layout={layout.id}
          shopName={shopName}
          coverUrl={coverUrl}
          products={displayProducts}
          isMobile={isMobile}
          visual={visual}
          phase={phase}
        />
      </div>
    </div>
  );
}

const MOCK_BUYERS = ["ava", "noah", "mia", "liam", "zoe", "kai", "ivy", "leo"];

/**
 * A looping "someone just bought X" pill for the studio preview. Purely
 * cosmetic — it gives sellers a feel for the live buying energy while they
 * build, so an open shop never looks static.
 */
function MockSaleTicker({
  products,
  accent,
}: {
  products: PreviewProduct[];
  accent: string;
}) {
  const [i, setI] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let idx = 0;
    let showTimer: ReturnType<typeof setTimeout>;
    const cycle = () => {
      setI(idx);
      setVisible(true);
      showTimer = setTimeout(() => setVisible(false), 2600);
      idx += 1;
    };
    const first = setTimeout(cycle, 900);
    const interval = setInterval(cycle, 3800);
    return () => {
      clearTimeout(first);
      clearTimeout(showTimer);
      clearInterval(interval);
    };
  }, []);

  const product = products[i % products.length];
  const buyer = MOCK_BUYERS[i % MOCK_BUYERS.length];

  return (
    <div
      className={cn(
        "pointer-events-none absolute right-3 top-3 z-10 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold text-white shadow-lg transition-all duration-500",
        visible ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0",
      )}
      style={{ background: accent }}
    >
      <ShoppingBag className="size-3" />
      @{buyer} just grabbed {product?.title || "an item"}
    </div>
  );
}

function LayoutPreview({
  theme,
  layout,
  shopName,
  coverUrl,
  products,
  isMobile,
  visual,
  phase,
}: {
  theme: ShopTheme;
  layout: ShopTheme["layout"];
  shopName: string;
  coverUrl?: string;
  products: PreviewProduct[];
  isMobile: boolean;
  visual: (typeof SHOP_PRESET_VISUAL)[keyof typeof SHOP_PRESET_VISUAL];
  phase: ShopPreviewPhase;
}) {
  const isScheduled = phase === "scheduled";

  const hero = (
    <HeroBlock
      theme={theme}
      coverUrl={coverUrl}
      visual={visual}
      layout={layout}
      phase={phase}
      large={layout === "broadcast" || (layout === "countdown" && isScheduled)}
      shopName={shopName}
    />
  );

  const title = (
    <div className="space-y-0.5">
      <p
        className={cn("font-bold leading-tight", isMobile ? "text-sm" : "text-lg")}
        style={{
          textTransform: visual.headingTransform as React.CSSProperties["textTransform"],
          letterSpacing: visual.headingLetterSpacing,
        }}
      >
        {shopName.trim() || "Your shop name"}
      </p>
      {theme.showSellerBio && (
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="flex items-center gap-1 text-[10px]" style={{ color: visual.mutedForeground }}>
            <User className="size-3" /> @yourhandle
          </p>
          <span
            className="rounded-md px-1.5 py-0.5 text-[9px] font-semibold text-white"
            style={{ background: theme.accent }}
          >
            Follow
          </span>
        </div>
      )}
    </div>
  );

  const productGrid = (
    <ProductGrid
      products={products}
      theme={theme}
      visual={visual}
      isMobile={isMobile}
      compact={layout === "broadcast"}
      locked={isScheduled}
    />
  );

  // Chat reads as the room when open/live; the Drop Clock keeps it off pre-open.
  const showChatPanel = theme.showChat && !(layout === "countdown" && isScheduled);
  const chat = showChatPanel ? (
    <ChatStub visual={visual} isMobile={isMobile} isScheduled={isScheduled} />
  ) : null;

  const reminder =
    isScheduled && theme.showReminderCta ? (
      <button
        type="button"
        className="w-full rounded-lg py-2 text-center text-[10px] font-semibold"
        style={{ background: theme.accent, color: "#fff" }}
      >
        Remind me when it opens
      </button>
    ) : null;

  const sneakPeek = isScheduled ? (
    <p className="text-[10px] font-medium uppercase tracking-widest" style={{ color: visual.mutedForeground }}>
      Sneak peek
    </p>
  ) : null;

  // Stream + chat always travel together as a band (chat beside the stream on
  // desktop, stacked + collapsible on mobile). Keep in sync with shop-page-view.tsx.
  const streamChatBand = (
    <div className={cn("grid gap-3", !isMobile && chat && "grid-cols-[1fr_120px]")}>
      {hero}
      {chat}
    </div>
  );

  if (layout === "catalog") {
    // Lookbook: products lead, then the stream + chat band, then reminders.
    return (
      <div className="space-y-3">
        {title}
        {sneakPeek}
        {productGrid}
        {streamChatBand}
        {reminder}
      </div>
    );
  }

  // classic — The Room: header → [stream + chat band] → products.
  return (
    <div className="space-y-3">
      {title}
      {reminder}
      {streamChatBand}
      {productGrid}
    </div>
  );
}

function HeroBlock({
  theme,
  coverUrl,
  visual,
  layout,
  phase,
  large,
  shopName,
}: {
  theme: ShopTheme;
  coverUrl?: string;
  visual: (typeof SHOP_PRESET_VISUAL)[keyof typeof SHOP_PRESET_VISUAL];
  layout: ShopTheme["layout"];
  phase: ShopPreviewPhase;
  large: boolean;
  shopName?: string;
}) {
  const isScheduled = phase === "scheduled";
  const isLive = phase === "live";
  const isCountdownOpen = layout === "countdown" && phase === "open";
  const showCountdown = isScheduled;
  const showLive = isLive;

  return (
    <div
      className={cn(
        "relative overflow-hidden transition-[aspect-ratio] duration-700",
        large ? "aspect-video rounded-xl" : isCountdownOpen ? "aspect-[2/1] rounded-lg" : "aspect-[2/1] rounded-lg",
        visual.heroTreatment === "frame" && "border-2 p-0.5",
      )}
      style={{
        borderColor: visual.heroTreatment === "frame" ? theme.accent : undefined,
        borderRadius: visual.radius,
      }}
    >
      <div className="relative h-full w-full overflow-hidden" style={{ borderRadius: visual.radius }}>
        {coverUrl ? (
          <Image src={coverUrl} alt="" fill className="object-cover" unoptimized />
        ) : (
          <div
            className="h-full w-full"
            style={{
              background:
                visual.heroTreatment === "gradient"
                  ? `linear-gradient(135deg, ${theme.accent}55, ${visual.cardBackground})`
                  : visual.heroTreatment === "flat"
                    ? visual.cardBackground
                    : `linear-gradient(180deg, ${theme.accent}33, ${visual.cardBackground})`,
            }}
          />
        )}
        {showCountdown && (
          <div
            className={cn(
              "absolute inset-0 flex flex-col bg-black/55 text-white transition-colors duration-700",
              layout === "broadcast"
                ? "items-start justify-end bg-gradient-to-t from-black/75 to-transparent p-3"
                : "items-center justify-center",
              layout === "countdown" && "bg-black/55",
            )}
          >
            {layout === "countdown" && shopName && (
              <p className="mb-1 text-sm font-extrabold tracking-tight sm:text-base md:text-lg">
                {shopName.trim() || "Your shop name"}
              </p>
            )}
            <p
              className={cn(
                "font-medium uppercase tracking-[0.2em] opacity-90",
                layout === "countdown" ? "text-[10px]" : layout === "broadcast" ? "text-[8px]" : "text-[9px]",
              )}
            >
              {layout === "countdown" ? "Drop opens in" : "Opens in"}
            </p>
            <p
              className={cn(
                "mt-1 font-extrabold tabular-nums",
                layout === "countdown" ? "text-3xl sm:text-4xl" : layout === "broadcast" ? "text-xl" : "text-2xl",
              )}
            >
              02:14:08
            </p>
          </div>
        )}
        {isCountdownOpen && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/25">
            <p className="text-sm font-extrabold tracking-tight text-white sm:text-base">We&apos;re open</p>
          </div>
        )}
        {showLive && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold text-white" style={{ background: theme.accent }}>
            <Monitor className="size-3" /> LIVE
          </div>
        )}
      </div>
    </div>
  );
}

function ProductGrid({
  products,
  theme,
  visual,
  isMobile,
  compact,
  locked,
}: {
  products: PreviewProduct[];
  theme: ShopTheme;
  visual: (typeof SHOP_PRESET_VISUAL)[keyof typeof SHOP_PRESET_VISUAL];
  isMobile: boolean;
  compact?: boolean;
  locked?: boolean;
}) {
  const cols = isMobile ? 2 : theme.productGridColumns;

  return (
    <div
      className={cn(
        "grid gap-2",
        cols === 3 ? "grid-cols-3" : "grid-cols-2",
        compact && "grid-cols-3",
        locked && "opacity-70",
      )}
    >
      {products.map((product, i) => (
        <div
          key={`${product.title}-${i}`}
          className="overflow-hidden border"
          style={{
            background: visual.cardBackground,
            borderColor: visual.border,
            borderRadius: visual.radius,
          }}
        >
          <div className="aspect-square" style={{ background: `${theme.accent}12` }}>
            {product.photoUrl ? (
              <Image
                src={product.photoUrl}
                alt=""
                width={120}
                height={120}
                className="h-full w-full object-cover"
                unoptimized
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <Package className="size-4" style={{ color: visual.mutedForeground }} />
              </div>
            )}
          </div>
          <div className="space-y-0.5 p-1.5">
            <p className="truncate text-[9px] font-medium">{product.title}</p>
            <p className="flex items-center gap-1 text-[9px] font-bold" style={{ color: theme.accent }}>
              {formatCurrency(Math.round(parseFloat(product.price || "0") * 100))}
              {locked && (
                <span
                  className="rounded-full px-1 text-[8px] font-semibold uppercase"
                  style={{ background: `${visual.mutedForeground}22`, color: visual.mutedForeground }}
                >
                  soon
                </span>
              )}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function ChatStub({
  visual,
  isMobile,
  isScheduled,
}: {
  visual: (typeof SHOP_PRESET_VISUAL)[keyof typeof SHOP_PRESET_VISUAL];
  isMobile: boolean;
  isScheduled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const label = isScheduled ? "Announcements" : "Shop chat";

  if (isMobile) {
    return (
      <div>
        <button
          type="button"
          className="flex w-full items-center justify-between rounded-lg border px-2 py-1.5 text-left text-[9px] font-semibold"
          style={{ borderColor: visual.border, background: visual.cardBackground, borderRadius: visual.radius }}
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          <span className="flex items-center gap-1">
            <MessageCircle className="size-3" style={{ color: visual.mutedForeground }} />
            {label}
          </span>
          <ChevronDown
            className={cn("size-3 transition-transform", open && "rotate-180")}
            style={{ color: visual.mutedForeground }}
          />
        </button>
        {open && (
          <div
            className="mt-2 flex min-h-[4.5rem] max-h-[5.5rem] flex-col overflow-hidden rounded-lg border p-2"
            style={{ borderColor: visual.border, background: visual.cardBackground, borderRadius: visual.radius }}
          >
            <p className="mb-1 flex items-center gap-1 text-[9px] font-medium" style={{ color: visual.mutedForeground }}>
              <MessageCircle className="size-3" /> {label}
            </p>
            <div className="space-y-1">
              <div className="h-1.5 w-3/4 rounded-full" style={{ background: `${visual.mutedForeground}33` }} />
              <div className="h-1.5 w-1/2 rounded-full" style={{ background: `${visual.mutedForeground}22` }} />
              <div className="h-1.5 w-2/3 rounded-full" style={{ background: `${visual.mutedForeground}22` }} />
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className="flex min-h-[100px] flex-col rounded-lg border p-2"
      style={{ borderColor: visual.border, background: visual.cardBackground, borderRadius: visual.radius }}
    >
      <p className="mb-1 flex items-center gap-1 text-[9px] font-medium" style={{ color: visual.mutedForeground }}>
        <MessageCircle className="size-3" /> Shop chat
      </p>
      <div className="space-y-1">
        <div className="h-1.5 w-3/4 rounded-full" style={{ background: `${visual.mutedForeground}33` }} />
        <div className="h-1.5 w-1/2 rounded-full" style={{ background: `${visual.mutedForeground}22` }} />
      </div>
    </div>
  );
}
