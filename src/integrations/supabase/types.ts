export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      affiliate_campaigns: {
        Row: {
          affiliate_id: string
          campaign_name: string
          clicks: number
          conversions: number
          created_at: string
          id: string
          link_id: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          affiliate_id: string
          campaign_name: string
          clicks?: number
          conversions?: number
          created_at?: string
          id?: string
          link_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          affiliate_id?: string
          campaign_name?: string
          clicks?: number
          conversions?: number
          created_at?: string
          id?: string
          link_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_campaigns_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "affiliate_links"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_links: {
        Row: {
          affiliate_id: string
          clicks_count: number
          conversions_count: number
          created_at: string
          id: string
          product_id: string
          unique_code: string
        }
        Insert: {
          affiliate_id: string
          clicks_count?: number
          conversions_count?: number
          created_at?: string
          id?: string
          product_id: string
          unique_code: string
        }
        Update: {
          affiliate_id?: string
          clicks_count?: number
          conversions_count?: number
          created_at?: string
          id?: string
          product_id?: string
          unique_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_links_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_ranks: {
        Row: {
          badge_color: string
          commission_boost_percent: number
          created_at: string
          fee_discount_percent: number
          id: string
          min_earnings: number
          rank_name: string
          sort_order: number
        }
        Insert: {
          badge_color?: string
          commission_boost_percent?: number
          created_at?: string
          fee_discount_percent?: number
          id?: string
          min_earnings?: number
          rank_name: string
          sort_order?: number
        }
        Update: {
          badge_color?: string
          commission_boost_percent?: number
          created_at?: string
          fee_discount_percent?: number
          id?: string
          min_earnings?: number
          rank_name?: string
          sort_order?: number
        }
        Relationships: []
      }
      affiliate_referral_codes: {
        Row: {
          affiliate_id: string
          created_at: string
          id: string
          referral_code: string
        }
        Insert: {
          affiliate_id: string
          created_at?: string
          id?: string
          referral_code: string
        }
        Update: {
          affiliate_id?: string
          created_at?: string
          id?: string
          referral_code?: string
        }
        Relationships: []
      }
      ai_content_calendar: {
        Row: {
          affiliate_link_id: string | null
          ai_generated: boolean
          content: string | null
          content_type: string
          created_at: string
          id: string
          performance_metrics: Json | null
          platform: string | null
          scheduled_at: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          affiliate_link_id?: string | null
          ai_generated?: boolean
          content?: string | null
          content_type?: string
          created_at?: string
          id?: string
          performance_metrics?: Json | null
          platform?: string | null
          scheduled_at?: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          affiliate_link_id?: string | null
          ai_generated?: boolean
          content?: string | null
          content_type?: string
          created_at?: string
          id?: string
          performance_metrics?: Json | null
          platform?: string | null
          scheduled_at?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_content_calendar_affiliate_link_id_fkey"
            columns: ["affiliate_link_id"]
            isOneToOne: false
            referencedRelation: "affiliate_links"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_decisions: {
        Row: {
          action_taken: string
          created_at: string
          data_snapshot: Json | null
          decision_type: string
          id: string
          reasoning: string | null
          rolled_back: boolean
          rolled_back_at: string | null
          was_auto: boolean
        }
        Insert: {
          action_taken: string
          created_at?: string
          data_snapshot?: Json | null
          decision_type: string
          id?: string
          reasoning?: string | null
          rolled_back?: boolean
          rolled_back_at?: string | null
          was_auto?: boolean
        }
        Update: {
          action_taken?: string
          created_at?: string
          data_snapshot?: Json | null
          decision_type?: string
          id?: string
          reasoning?: string | null
          rolled_back?: boolean
          rolled_back_at?: string | null
          was_auto?: boolean
        }
        Relationships: []
      }
      ai_optimization_settings: {
        Row: {
          alert_min_severity: string
          auto_adjust_prices: boolean
          auto_generate_captions: boolean
          auto_optimize_commissions: boolean
          auto_schedule_posts: boolean
          content_frequency: string
          created_at: string
          id: string
          preferred_platforms: string[]
          preferred_posting_times: string[]
          smart_alerts_enabled: boolean
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          alert_min_severity?: string
          auto_adjust_prices?: boolean
          auto_generate_captions?: boolean
          auto_optimize_commissions?: boolean
          auto_schedule_posts?: boolean
          content_frequency?: string
          created_at?: string
          id?: string
          preferred_platforms?: string[]
          preferred_posting_times?: string[]
          smart_alerts_enabled?: boolean
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          alert_min_severity?: string
          auto_adjust_prices?: boolean
          auto_generate_captions?: boolean
          auto_optimize_commissions?: boolean
          auto_schedule_posts?: boolean
          content_frequency?: string
          created_at?: string
          id?: string
          preferred_platforms?: string[]
          preferred_posting_times?: string[]
          smart_alerts_enabled?: boolean
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_smart_alerts: {
        Row: {
          action_text: string | null
          action_url: string | null
          ai_analysis: Json | null
          alert_type: string
          created_at: string
          description: string
          dismissed_at: string | null
          id: string
          is_read: boolean
          related_link_id: string | null
          related_product_id: string | null
          severity: string
          title: string
          user_id: string | null
        }
        Insert: {
          action_text?: string | null
          action_url?: string | null
          ai_analysis?: Json | null
          alert_type?: string
          created_at?: string
          description: string
          dismissed_at?: string | null
          id?: string
          is_read?: boolean
          related_link_id?: string | null
          related_product_id?: string | null
          severity?: string
          title: string
          user_id?: string | null
        }
        Update: {
          action_text?: string | null
          action_url?: string | null
          ai_analysis?: Json | null
          alert_type?: string
          created_at?: string
          description?: string
          dismissed_at?: string | null
          id?: string
          is_read?: boolean
          related_link_id?: string | null
          related_product_id?: string | null
          severity?: string
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_smart_alerts_related_link_id_fkey"
            columns: ["related_link_id"]
            isOneToOne: false
            referencedRelation: "affiliate_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_smart_alerts_related_product_id_fkey"
            columns: ["related_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      certificates: {
        Row: {
          certificate_hash: string
          id: string
          issued_at: string
          metadata: Json | null
          rank_name: string
          user_id: string
          verified_count: number
        }
        Insert: {
          certificate_hash: string
          id?: string
          issued_at?: string
          metadata?: Json | null
          rank_name: string
          user_id: string
          verified_count?: number
        }
        Update: {
          certificate_hash?: string
          id?: string
          issued_at?: string
          metadata?: Json | null
          rank_name?: string
          user_id?: string
          verified_count?: number
        }
        Relationships: []
      }
      clicks: {
        Row: {
          created_at: string
          id: string
          ip_hash: string | null
          link_id: string
          referrer: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          ip_hash?: string | null
          link_id: string
          referrer?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          ip_hash?: string | null
          link_id?: string
          referrer?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clicks_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "affiliate_links"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_rules: {
        Row: {
          affiliate_id: string | null
          bonus_amount: number | null
          boost_percent: number | null
          commission_override: number | null
          created_at: string
          ends_at: string | null
          id: string
          is_active: boolean
          metadata: Json | null
          min_sales: number | null
          name: string
          priority: number
          product_id: string | null
          rule_type: string
          starts_at: string | null
          updated_at: string
        }
        Insert: {
          affiliate_id?: string | null
          bonus_amount?: number | null
          boost_percent?: number | null
          commission_override?: number | null
          created_at?: string
          ends_at?: string | null
          id?: string
          is_active?: boolean
          metadata?: Json | null
          min_sales?: number | null
          name: string
          priority?: number
          product_id?: string | null
          rule_type?: string
          starts_at?: string | null
          updated_at?: string
        }
        Update: {
          affiliate_id?: string | null
          bonus_amount?: number | null
          boost_percent?: number | null
          commission_override?: number | null
          created_at?: string
          ends_at?: string | null
          id?: string
          is_active?: boolean
          metadata?: Json | null
          min_sales?: number | null
          name?: string
          priority?: number
          product_id?: string | null
          rule_type?: string
          starts_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commission_rules_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_digests: {
        Row: {
          content: Json
          created_at: string
          digest_type: string
          id: string
          is_read: boolean
          user_id: string
        }
        Insert: {
          content?: Json
          created_at?: string
          digest_type?: string
          id?: string
          is_read?: boolean
          user_id: string
        }
        Update: {
          content?: Json
          created_at?: string
          digest_type?: string
          id?: string
          is_read?: boolean
          user_id?: string
        }
        Relationships: []
      }
      experiments: {
        Row: {
          created_at: string
          created_by: string | null
          experiment_type: string
          id: string
          name: string
          results: Json | null
          status: string
          updated_at: string
          variants: Json
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          experiment_type?: string
          id?: string
          name: string
          results?: Json | null
          status?: string
          updated_at?: string
          variants?: Json
        }
        Update: {
          created_at?: string
          created_by?: string | null
          experiment_type?: string
          id?: string
          name?: string
          results?: Json | null
          status?: string
          updated_at?: string
          variants?: Json
        }
        Relationships: []
      }
      fraud_events: {
        Row: {
          admin_notes: string | null
          commission_held: boolean | null
          created_at: string
          description: string
          device_fingerprint: string | null
          event_type: string
          id: string
          ip_address: string | null
          metadata: Json | null
          related_id: string | null
          related_type: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          status: string
          user_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          commission_held?: boolean | null
          created_at?: string
          description: string
          device_fingerprint?: string | null
          event_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          related_id?: string | null
          related_type?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string
          user_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          commission_held?: boolean | null
          created_at?: string
          description?: string
          device_fingerprint?: string | null
          event_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          related_id?: string | null
          related_type?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          cta_url: string | null
          id: string
          image_url: string | null
          is_read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          cta_url?: string | null
          id?: string
          image_url?: string | null
          is_read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          cta_url?: string | null
          id?: string
          image_url?: string | null
          is_read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      onboarding_progress: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          current_step: number
          id: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          current_step?: number
          id?: string
          role: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          current_step?: number
          id?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payout_requests: {
        Row: {
          account_name: string | null
          account_number: string | null
          admin_notes: string | null
          amount: number
          bank_name: string | null
          created_at: string
          id: string
          processed_at: string | null
          status: Database["public"]["Enums"]["payout_status"]
          updated_at: string
          user_id: string
          wallet_id: string
        }
        Insert: {
          account_name?: string | null
          account_number?: string | null
          admin_notes?: string | null
          amount: number
          bank_name?: string | null
          created_at?: string
          id?: string
          processed_at?: string | null
          status?: Database["public"]["Enums"]["payout_status"]
          updated_at?: string
          user_id: string
          wallet_id: string
        }
        Update: {
          account_name?: string | null
          account_number?: string | null
          admin_notes?: string | null
          amount?: number
          bank_name?: string | null
          created_at?: string
          id?: string
          processed_at?: string | null
          status?: Database["public"]["Enums"]["payout_status"]
          updated_at?: string
          user_id?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payout_requests_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_referrals: {
        Row: {
          commission_amount: number | null
          commission_paid: boolean | null
          created_at: string
          id: string
          referral_code: string
          referred_user_id: string
          referrer_id: string
        }
        Insert: {
          commission_amount?: number | null
          commission_paid?: boolean | null
          created_at?: string
          id?: string
          referral_code: string
          referred_user_id: string
          referrer_id: string
        }
        Update: {
          commission_amount?: number | null
          commission_paid?: boolean | null
          created_at?: string
          id?: string
          referral_code?: string
          referred_user_id?: string
          referrer_id?: string
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      product_listing_payments: {
        Row: {
          admin_notes: string | null
          amount: number
          business_email: string | null
          business_name: string | null
          created_at: string
          id: string
          payment_gateway: string | null
          payment_reference: string
          product_id: string | null
          status: string
          updated_at: string
          vendor_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          business_email?: string | null
          business_name?: string | null
          created_at?: string
          id?: string
          payment_gateway?: string | null
          payment_reference: string
          product_id?: string | null
          status?: string
          updated_at?: string
          vendor_id: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          business_email?: string | null
          business_name?: string | null
          created_at?: string
          id?: string
          payment_gateway?: string | null
          payment_reference?: string
          product_id?: string | null
          status?: string
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_listing_payments_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          affiliate_enabled: boolean
          commission_percent: number
          cookie_duration_days: number
          cover_image_url: string | null
          created_at: string
          description: string | null
          external_url: string | null
          file_url: string | null
          id: string
          is_approved: boolean
          is_featured: boolean | null
          is_sponsored: boolean | null
          is_subscription: boolean
          platform_fee_percent: number
          price: number
          ranking_score: number | null
          refund_window_days: number
          second_tier_commission_percent: number | null
          status: Database["public"]["Enums"]["product_status"]
          subscription_interval: string | null
          title: string
          updated_at: string
          vendor_id: string
        }
        Insert: {
          affiliate_enabled?: boolean
          commission_percent?: number
          cookie_duration_days?: number
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          external_url?: string | null
          file_url?: string | null
          id?: string
          is_approved?: boolean
          is_featured?: boolean | null
          is_sponsored?: boolean | null
          is_subscription?: boolean
          platform_fee_percent?: number
          price: number
          ranking_score?: number | null
          refund_window_days?: number
          second_tier_commission_percent?: number | null
          status?: Database["public"]["Enums"]["product_status"]
          subscription_interval?: string | null
          title: string
          updated_at?: string
          vendor_id: string
        }
        Update: {
          affiliate_enabled?: boolean
          commission_percent?: number
          cookie_duration_days?: number
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          external_url?: string | null
          file_url?: string | null
          id?: string
          is_approved?: boolean
          is_featured?: boolean | null
          is_sponsored?: boolean | null
          is_subscription?: boolean
          platform_fee_percent?: number
          price?: number
          ranking_score?: number | null
          refund_window_days?: number
          second_tier_commission_percent?: number | null
          status?: Database["public"]["Enums"]["product_status"]
          subscription_interval?: string | null
          title?: string
          updated_at?: string
          vendor_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          admin_notes: string | null
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          is_banned: boolean
          is_verified: boolean
          referral_code: string | null
          referred_by: string | null
          suspended_until: string | null
          updated_at: string
          vendor_tier: string
        }
        Insert: {
          admin_notes?: string | null
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          is_banned?: boolean
          is_verified?: boolean
          referral_code?: string | null
          referred_by?: string | null
          suspended_until?: string | null
          updated_at?: string
          vendor_tier?: string
        }
        Update: {
          admin_notes?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          is_banned?: boolean
          is_verified?: boolean
          referral_code?: string | null
          referred_by?: string | null
          suspended_until?: string | null
          updated_at?: string
          vendor_tier?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_materials: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          material_type: string
          media_url: string | null
          product_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          material_type?: string
          media_url?: string | null
          product_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          material_type?: string
          media_url?: string | null
          product_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_materials_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          affiliate_commission: number
          affiliate_id: string | null
          buyer_email: string
          commission_percent_snapshot: number
          created_at: string
          id: string
          payment_gateway: string | null
          payment_reference: string | null
          platform_fee: number
          platform_fee_percent_snapshot: number
          product_id: string
          refund_eligible_until: string | null
          second_tier_affiliate_id: string | null
          second_tier_commission: number | null
          status: Database["public"]["Enums"]["sale_status"]
          total_amount: number
          updated_at: string
          vendor_earnings: number
          vendor_id: string
        }
        Insert: {
          affiliate_commission?: number
          affiliate_id?: string | null
          buyer_email: string
          commission_percent_snapshot: number
          created_at?: string
          id?: string
          payment_gateway?: string | null
          payment_reference?: string | null
          platform_fee?: number
          platform_fee_percent_snapshot: number
          product_id: string
          refund_eligible_until?: string | null
          second_tier_affiliate_id?: string | null
          second_tier_commission?: number | null
          status?: Database["public"]["Enums"]["sale_status"]
          total_amount: number
          updated_at?: string
          vendor_earnings: number
          vendor_id: string
        }
        Update: {
          affiliate_commission?: number
          affiliate_id?: string | null
          buyer_email?: string
          commission_percent_snapshot?: number
          created_at?: string
          id?: string
          payment_gateway?: string | null
          payment_reference?: string | null
          platform_fee?: number
          platform_fee_percent_snapshot?: number
          product_id?: string
          refund_eligible_until?: string | null
          second_tier_affiliate_id?: string | null
          second_tier_commission?: number | null
          status?: Database["public"]["Enums"]["sale_status"]
          total_amount?: number
          updated_at?: string
          vendor_earnings?: number
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      system_logs: {
        Row: {
          actor_email: string | null
          actor_id: string | null
          amount: number | null
          category: string
          created_at: string
          description: string
          event_type: string
          id: string
          ip_address: string | null
          metadata: Json | null
          related_id: string | null
          related_type: string | null
          status: string | null
          user_agent: string | null
        }
        Insert: {
          actor_email?: string | null
          actor_id?: string | null
          amount?: number | null
          category?: string
          created_at?: string
          description: string
          event_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          related_id?: string | null
          related_type?: string | null
          status?: string | null
          user_agent?: string | null
        }
        Update: {
          actor_email?: string | null
          actor_id?: string | null
          amount?: number | null
          category?: string
          created_at?: string
          description?: string
          event_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          related_id?: string | null
          related_type?: string | null
          status?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          earning_state: Database["public"]["Enums"]["earning_state"] | null
          id: string
          sale_id: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          wallet_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          earning_state?: Database["public"]["Enums"]["earning_state"] | null
          id?: string
          sale_id?: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          wallet_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          earning_state?: Database["public"]["Enums"]["earning_state"] | null
          id?: string
          sale_id?: string | null
          type?: Database["public"]["Enums"]["transaction_type"]
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_messages: {
        Row: {
          created_at: string
          from_admin_id: string
          id: string
          is_read: boolean
          message: string
          to_user_id: string
        }
        Insert: {
          created_at?: string
          from_admin_id: string
          id?: string
          is_read?: boolean
          message: string
          to_user_id: string
        }
        Update: {
          created_at?: string
          from_admin_id?: string
          id?: string
          is_read?: boolean
          message?: string
          to_user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vendor_announcements: {
        Row: {
          announcement_type: string
          content: string
          created_at: string
          id: string
          is_moderated: boolean
          is_published: boolean
          moderated_by: string | null
          product_id: string | null
          title: string
          updated_at: string
          vendor_id: string
        }
        Insert: {
          announcement_type?: string
          content: string
          created_at?: string
          id?: string
          is_moderated?: boolean
          is_published?: boolean
          moderated_by?: string | null
          product_id?: string | null
          title: string
          updated_at?: string
          vendor_id: string
        }
        Update: {
          announcement_type?: string
          content?: string
          created_at?: string
          id?: string
          is_moderated?: boolean
          is_published?: boolean
          moderated_by?: string | null
          product_id?: string | null
          title?: string
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_announcements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_coupons: {
        Row: {
          code: string
          created_at: string
          current_uses: number
          discount_amount: number
          discount_percent: number
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          product_id: string | null
          updated_at: string
          vendor_id: string
        }
        Insert: {
          code: string
          created_at?: string
          current_uses?: number
          discount_amount?: number
          discount_percent?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          product_id?: string | null
          updated_at?: string
          vendor_id: string
        }
        Update: {
          code?: string
          created_at?: string
          current_uses?: number
          discount_amount?: number
          discount_percent?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          product_id?: string | null
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_coupons_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      verification_requests: {
        Row: {
          created_at: string
          id: string
          path: string
          payment_reference: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          path?: string
          payment_reference?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          path?: string
          payment_reference?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      wallets: {
        Row: {
          cleared_balance: number
          created_at: string
          currency: string
          id: string
          pending_balance: number
          total_earned: number
          total_withdrawn: number
          updated_at: string
          user_id: string
          withdrawable_balance: number
        }
        Insert: {
          cleared_balance?: number
          created_at?: string
          currency?: string
          id?: string
          pending_balance?: number
          total_earned?: number
          total_withdrawn?: number
          updated_at?: string
          user_id: string
          withdrawable_balance?: number
        }
        Update: {
          cleared_balance?: number
          created_at?: string
          currency?: string
          id?: string
          pending_balance?: number
          total_earned?: number
          total_withdrawn?: number
          updated_at?: string
          user_id?: string
          withdrawable_balance?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      clear_earning: {
        Args: { _amount: number; _wallet_id: string }
        Returns: undefined
      }
      dismiss_ai_alert: { Args: { alert_id: string }; Returns: undefined }
      generate_affiliate_code: { Args: never; Returns: string }
      generate_profile_referral_code: { Args: never; Returns: string }
      generate_referral_code: { Args: never; Returns: string }
      get_unread_alert_count: { Args: never; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_conversion_count: {
        Args: { link_id: string }
        Returns: undefined
      }
      increment_pending_balance: {
        Args: { _amount: number; _wallet_id: string }
        Returns: undefined
      }
      is_admin: { Args: never; Returns: boolean }
      is_valid_click_insert: { Args: never; Returns: boolean }
      mark_ai_alert_read: { Args: { alert_id: string }; Returns: undefined }
      write_system_log: {
        Args: {
          _actor_id?: string
          _amount?: number
          _category: string
          _description: string
          _event_type: string
          _metadata?: Json
          _related_id?: string
          _related_type?: string
          _status?: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "vendor" | "affiliate"
      earning_state: "pending" | "cleared" | "withdrawable"
      payout_status: "pending" | "processing" | "paid" | "rejected"
      product_status: "draft" | "active" | "paused"
      sale_status: "pending" | "completed" | "refunded"
      transaction_type:
        | "sale_commission"
        | "sale_vendor"
        | "platform_fee"
        | "withdrawal"
        | "refund"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "vendor", "affiliate"],
      earning_state: ["pending", "cleared", "withdrawable"],
      payout_status: ["pending", "processing", "paid", "rejected"],
      product_status: ["draft", "active", "paused"],
      sale_status: ["pending", "completed", "refunded"],
      transaction_type: [
        "sale_commission",
        "sale_vendor",
        "platform_fee",
        "withdrawal",
        "refund",
      ],
    },
  },
} as const
