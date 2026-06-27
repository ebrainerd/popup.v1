/**
 * Hand-maintained Supabase schema types.
 *
 * Once the Supabase project exists you can regenerate this file with:
 *   npx supabase gen types typescript --project-id <id> > src/lib/database.types.ts
 * Until then, this mirrors supabase/migrations/0001_init.sql.
 */

export type ShopVisibility = "public" | "private";
export type ShopStatusColumn = "draft" | "scheduled" | "open" | "ended" | "canceled";
export type ProductSaleType = "buy_now" | "auction";
export type AuctionRunStatus =
  | "queued"
  | "live"
  | "ended"
  | "awaiting_payment"
  | "paid"
  | "payment_expired"
  | "canceled"
  | "unsold";
export type AuctionBidEventType =
  | "prebid"
  | "bid"
  | "proxy_bid"
  | "outbid"
  | "win"
  | "extend";
export type OrderStatus =
  | "paid"
  | "shipped"
  | "in_transit"
  | "delivered"
  | "received"
  | "refunded"
  | "canceled";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          display_name: string | null;
          avatar_url: string | null;
          bio: string | null;
          stripe_account_id: string | null;
          stripe_onboarded: boolean;
          rating_avg: number | null;
          rating_count: number;
          follower_count: number;
          created_at: string;
        };
        Insert: {
          id: string;
          username: string;
          display_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          stripe_account_id?: string | null;
          stripe_onboarded?: boolean;
          rating_avg?: number | null;
          rating_count?: number;
          follower_count?: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      shops: {
        Row: {
          id: string;
          seller_id: string;
          name: string;
          slug: string;
          description: string | null;
          cover_url: string | null;
          start_at: string;
          end_at: string;
          visibility: ShopVisibility;
          shipping_rate: number;
          is_live: boolean;
          live_url: string | null;
          twitch_url: string | null;
          status: ShopStatusColumn;
          peak_viewers: number;
          featured_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          seller_id: string;
          name: string;
          slug?: string;
          description?: string | null;
          cover_url?: string | null;
          start_at: string;
          end_at: string;
          visibility?: ShopVisibility;
          shipping_rate?: number;
          is_live?: boolean;
          live_url?: string | null;
          twitch_url?: string | null;
          status?: ShopStatusColumn;
          peak_viewers?: number;
          featured_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["shops"]["Insert"]>;
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          shop_id: string;
          title: string;
          description: string | null;
          photo_url: string | null;
          photo_urls: string[];
          price: number;
          quantity: number;
          shipping_rate: number;
          discount_price: number | null;
          is_flash_only: boolean;
          flash_expires_at: string | null;
          sale_type: ProductSaleType;
          auction_starting_bid: number | null;
          auction_min_increment: number | null;
          auction_duration_seconds: number | null;
          auction_allow_prebids: boolean;
          auction_sudden_death: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          shop_id: string;
          title: string;
          description?: string | null;
          photo_url?: string | null;
          photo_urls?: string[];
          price: number;
          quantity?: number;
          shipping_rate?: number;
          discount_price?: number | null;
          is_flash_only?: boolean;
          flash_expires_at?: string | null;
          sale_type?: ProductSaleType;
          auction_starting_bid?: number | null;
          auction_min_increment?: number | null;
          auction_duration_seconds?: number | null;
          auction_allow_prebids?: boolean;
          auction_sudden_death?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["products"]["Insert"]>;
        Relationships: [];
      };
      orders: {
        Row: {
          id: string;
          buyer_id: string;
          shop_id: string;
          product_id: string;
          amount_paid: number;
          platform_fee: number;
          shipping_address: Record<string, unknown> | null;
          status: OrderStatus;
          tracking_number: string | null;
          carrier: string | null;
          shipped_at: string | null;
          delivered_at: string | null;
          created_at: string;
          stripe_session_id: string | null;
          payment_intent: string | null;
          shipping_amount: number;
          transfer_id: string | null;
          released_at: string | null;
          received_at: string | null;
          ship_reminder_sent_at: string | null;
          receipt_nudge_count: number;
          receipt_nudge_at: string | null;
          auction_id: string | null;
          winning_bid_id: string | null;
        };
        Insert: {
          id?: string;
          buyer_id: string;
          shop_id: string;
          product_id: string;
          amount_paid: number;
          platform_fee?: number;
          shipping_address?: Record<string, unknown> | null;
          status?: OrderStatus;
          tracking_number?: string | null;
          carrier?: string | null;
          shipped_at?: string | null;
          delivered_at?: string | null;
          created_at?: string;
          stripe_session_id?: string | null;
          payment_intent?: string | null;
          shipping_amount?: number;
          transfer_id?: string | null;
          released_at?: string | null;
          received_at?: string | null;
          ship_reminder_sent_at?: string | null;
          receipt_nudge_count?: number;
          receipt_nudge_at?: string | null;
          auction_id?: string | null;
          winning_bid_id?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["orders"]["Insert"]>;
        Relationships: [];
      };
      auction_runs: {
        Row: {
          id: string;
          shop_id: string;
          product_id: string;
          seller_id: string;
          status: AuctionRunStatus;
          starting_bid: number;
          min_increment: number;
          current_bid: number;
          current_winner_id: string | null;
          winning_bid_id: string | null;
          bid_count: number;
          starts_at: string | null;
          ends_at: string | null;
          soft_close_seconds: number;
          sudden_death: boolean;
          checkout_expires_at: string | null;
          stripe_session_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          shop_id: string;
          product_id: string;
          seller_id: string;
          status: AuctionRunStatus;
          starting_bid: number;
          min_increment: number;
          current_bid: number;
          current_winner_id?: string | null;
          winning_bid_id?: string | null;
          bid_count?: number;
          starts_at?: string | null;
          ends_at?: string | null;
          soft_close_seconds?: number;
          sudden_death?: boolean;
          checkout_expires_at?: string | null;
          stripe_session_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["auction_runs"]["Insert"]>;
        Relationships: [];
      };
      auction_max_bids: {
        Row: {
          id: string;
          auction_id: string;
          bidder_id: string;
          max_amount: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          auction_id: string;
          bidder_id: string;
          max_amount: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["auction_max_bids"]["Insert"]>;
        Relationships: [];
      };
      auction_bid_events: {
        Row: {
          id: string;
          auction_id: string;
          bidder_id: string | null;
          visible_amount: number;
          event_type: AuctionBidEventType;
          created_at: string;
        };
        Insert: {
          id?: string;
          auction_id: string;
          bidder_id?: string | null;
          visible_amount: number;
          event_type: AuctionBidEventType;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["auction_bid_events"]["Insert"]>;
        Relationships: [];
      };
      shop_follows: {
        Row: {
          seller_id: string;
          follower_id: string;
          created_at: string;
        };
        Insert: {
          seller_id: string;
          follower_id: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["shop_follows"]["Insert"]>;
        Relationships: [];
      };
      ratings: {
        Row: {
          id: string;
          rater_id: string;
          seller_id: string;
          order_id: string;
          stars: number;
          comment: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          rater_id: string;
          seller_id: string;
          order_id: string;
          stars: number;
          comment?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["ratings"]["Insert"]>;
        Relationships: [];
      };
      chat_messages: {
        Row: {
          id: string;
          shop_id: string;
          user_id: string;
          message: string;
          is_hidden: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          shop_id: string;
          user_id: string;
          message: string;
          is_hidden?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["chat_messages"]["Insert"]>;
        Relationships: [];
      };
      shop_mutes: {
        Row: {
          shop_id: string;
          user_id: string;
          muted_by: string;
          created_at: string;
        };
        Insert: {
          shop_id: string;
          user_id: string;
          muted_by: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["shop_mutes"]["Insert"]>;
        Relationships: [];
      };
      push_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["push_subscriptions"]["Insert"]>;
        Relationships: [];
      };
      drop_reminders: {
        Row: {
          id: string;
          shop_id: string;
          user_id: string;
          email_enabled: boolean;
          push_enabled: boolean;
          before_24h_sent_at: string | null;
          before_1h_sent_at: string | null;
          opening_sent_at: string | null;
          created_at: string;
          cancelled_at: string | null;
        };
        Insert: {
          id?: string;
          shop_id: string;
          user_id: string;
          email_enabled?: boolean;
          push_enabled?: boolean;
          before_24h_sent_at?: string | null;
          before_1h_sent_at?: string | null;
          opening_sent_at?: string | null;
          created_at?: string;
          cancelled_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["drop_reminders"]["Insert"]>;
        Relationships: [];
      };
      drop_reminder_deliveries: {
        Row: {
          id: string;
          reminder_id: string;
          reminder_window: "24h" | "1h" | "opening";
          status: "processing" | "sent" | "failed" | "skipped_no_provider";
          attempted_at: string;
          sent_at: string | null;
          error: string | null;
        };
        Insert: {
          id?: string;
          reminder_id: string;
          reminder_window: "24h" | "1h" | "opening";
          status: "processing" | "sent" | "failed" | "skipped_no_provider";
          attempted_at?: string;
          sent_at?: string | null;
          error?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["drop_reminder_deliveries"]["Insert"]>;
        Relationships: [];
      };
      shop_announcements: {
        Row: {
          id: string;
          shop_id: string;
          seller_id: string;
          message: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          shop_id: string;
          seller_id: string;
          message: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["shop_announcements"]["Insert"]>;
        Relationships: [];
      };
      product_reservations: {
        Row: {
          id: string;
          product_id: string;
          buyer_id: string;
          session_id: string | null;
          status: "held" | "completed" | "released";
          expires_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          buyer_id: string;
          session_id?: string | null;
          status?: "held" | "completed" | "released";
          expires_at: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["product_reservations"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      bump_peak_viewers: {
        Args: { p_shop: string; p_count: number };
        Returns: undefined;
      };
      is_muted: {
        Args: { target_shop: string; target_user: string };
        Returns: boolean;
      };
      decrement_stock: {
        Args: { p_product: string; p_qty: number };
        Returns: undefined;
      };
      reserve_product: {
        Args: { p_product: string; p_buyer: string; p_session: string | null; p_ttl_minutes: number };
        Returns: string | null;
      };
      held_quantity: {
        Args: { p_product: string };
        Returns: number;
      };
      drop_reminder_count: {
        Args: { target_shop: string };
        Returns: number;
      };
      queue_auction_run: { Args: { p_product_id: string }; Returns: string };
      start_auction_run: { Args: { p_auction_id: string }; Returns: undefined };
      place_auction_bid: {
        Args: { p_auction_id: string; p_max_amount: number };
        Returns: Record<string, unknown>;
      };
      finalize_auction_run: {
        Args: { p_auction_id: string };
        Returns: Record<string, unknown>;
      };
      cancel_auction_run: { Args: { p_auction_id: string }; Returns: undefined };
      compute_auction_visible_bid: {
        Args: {
          p_starting_bid: number;
          p_min_increment: number;
          p_winner_max: number;
          p_runner_up_max: number;
        };
        Returns: number;
      };
      auction_next_minimum_bid: {
        Args: {
          p_starting_bid: number;
          p_min_increment: number;
          p_current_bid: number;
          p_bid_count: number;
        };
        Returns: number;
      };
      settle_auction_payment: {
        Args: { p_auction_id: string; p_order_id: string; p_stripe_session_id: string };
        Returns: undefined;
      };
      expire_auction_payment: {
        Args: { p_auction_id: string };
        Returns: undefined;
      };
    };
    Enums: {
      shop_visibility: ShopVisibility;
      shop_status: ShopStatusColumn;
      order_status: OrderStatus;
    };
    CompositeTypes: Record<string, never>;
  };
}

// Convenience row aliases
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Shop = Database["public"]["Tables"]["shops"]["Row"];
export type Product = Database["public"]["Tables"]["products"]["Row"];
export type Order = Database["public"]["Tables"]["orders"]["Row"];
export type Rating = Database["public"]["Tables"]["ratings"]["Row"];
export type ChatMessage = Database["public"]["Tables"]["chat_messages"]["Row"];
export type DropReminder = Database["public"]["Tables"]["drop_reminders"]["Row"];
export type ShopAnnouncement = Database["public"]["Tables"]["shop_announcements"]["Row"];
export type AuctionRun = Database["public"]["Tables"]["auction_runs"]["Row"];
export type AuctionBidEvent = Database["public"]["Tables"]["auction_bid_events"]["Row"];
