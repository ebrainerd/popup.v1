/**
 * Hand-maintained Supabase schema types.
 *
 * Once the Supabase project exists you can regenerate this file with:
 *   npx supabase gen types typescript --project-id <id> > src/lib/database.types.ts
 * Until then, this mirrors supabase/migrations/0001_init.sql.
 */

export type ShopVisibility = "public" | "private";
export type ShopStatusColumn = "draft" | "scheduled" | "open" | "ended" | "canceled";
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
          rating_avg: number | null;
          rating_count: number;
          created_at: string;
        };
        Insert: {
          id: string;
          username: string;
          display_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          stripe_account_id?: string | null;
          rating_avg?: number | null;
          rating_count?: number;
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
          status: ShopStatusColumn;
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
          status?: ShopStatusColumn;
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
          price: number;
          quantity: number;
          discount_price: number | null;
          is_flash_only: boolean;
          flash_expires_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          shop_id: string;
          title: string;
          description?: string | null;
          photo_url?: string | null;
          price: number;
          quantity?: number;
          discount_price?: number | null;
          is_flash_only?: boolean;
          flash_expires_at?: string | null;
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
        };
        Update: Partial<Database["public"]["Tables"]["orders"]["Insert"]>;
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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
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
