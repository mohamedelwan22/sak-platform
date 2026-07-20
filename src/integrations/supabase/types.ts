export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      cities: {
        Row: {
          country_id: string;
          created_at: string;
          id: string;
          is_active: boolean;
          name: string;
          updated_at: string;
        };
        Insert: {
          country_id: string;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name: string;
          updated_at?: string;
        };
        Update: {
          country_id?: string;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cities_country_id_fkey";
            columns: ["country_id"];
            isOneToOne: false;
            referencedRelation: "countries";
            referencedColumns: ["id"];
          },
        ];
      };
      countries: {
        Row: {
          code: string;
          created_at: string;
          currency: string | null;
          currencyCode: string | null;
          flag: string | null;
          id: string;
          iso2: string | null;
          iso3: string | null;
          name: string;
          nationality: string | null;
          phoneCode: string | null;
          status: string;
          updated_at: string;
        };
        Insert: {
          code: string;
          created_at?: string;
          currency?: string | null;
          currencyCode?: string | null;
          flag?: string | null;
          id?: string;
          iso2?: string | null;
          iso3?: string | null;
          name: string;
          nationality?: string | null;
          phoneCode?: string | null;
          status?: string;
          updated_at?: string;
        };
        Update: {
          code?: string;
          created_at?: string;
          currency?: string | null;
          currencyCode?: string | null;
          flag?: string | null;
          id?: string;
          iso2?: string | null;
          iso3?: string | null;
          name?: string;
          nationality?: string | null;
          phoneCode?: string | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      gold_price_history: {
        Row: {
          created_at: string;
          gram_price_usd: number;
          id: string;
          source: string;
        };
        Insert: {
          created_at?: string;
          gram_price_usd: number;
          id?: string;
          source?: string;
        };
        Update: {
          created_at?: string;
          gram_price_usd?: number;
          id?: string;
          source?: string;
        };
        Relationships: [];
      };
      holdings: {
        Row: {
          created_at: string;
          id: string;
          land_id: string;
          maturity_date: string;
          purchase_date: string;
          purchase_price_per_sak_usd: number;
          sak_owned: number;
          status: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          land_id: string;
          maturity_date: string;
          purchase_date?: string;
          purchase_price_per_sak_usd: number;
          sak_owned: number;
          status?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          land_id?: string;
          maturity_date?: string;
          purchase_date?: string;
          purchase_price_per_sak_usd?: number;
          sak_owned?: number;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "holdings_land_id_fkey";
            columns: ["land_id"];
            isOneToOne: false;
            referencedRelation: "lands";
            referencedColumns: ["id"];
          },
        ];
      };
      kyc_submissions: {
        Row: {
          back_image_path: string | null;
          created_at: string;
          document_type: string;
          front_image_path: string;
          id: string;
          rejection_reason: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          selfie_image_path: string;
          status: string;
          user_id: string;
        };
        Insert: {
          back_image_path?: string | null;
          created_at?: string;
          document_type: string;
          front_image_path: string;
          id?: string;
          rejection_reason?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          selfie_image_path: string;
          status?: string;
          user_id: string;
        };
        Update: {
          back_image_path?: string | null;
          created_at?: string;
          document_type?: string;
          front_image_path?: string;
          id?: string;
          rejection_reason?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          selfie_image_path?: string;
          status?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      lands: {
        Row: {
          area_m2: number;
          asset_type: string;
          available_sak: number;
          city: string;
          country: string;
          cover_image_url: string | null;
          created_at: string;
          description_ar: string;
          description_en: string;
          expected_roi: number;
          gallery: Json;
          id: string;
          lat: number | null;
          lng: number | null;
          maturity_months: number;
          project_id: string | null;
          risk_level: string;
          status: string;
          title_ar: string;
          title_en: string;
          total_sak_inventory: number;
          updated_at: string;
        };
        Insert: {
          area_m2?: number;
          asset_type?: string;
          available_sak: number;
          city?: string;
          country: string;
          cover_image_url?: string | null;
          created_at?: string;
          description_ar?: string;
          description_en?: string;
          expected_roi?: number;
          gallery?: Json;
          id?: string;
          lat?: number | null;
          lng?: number | null;
          maturity_months?: number;
          project_id?: string | null;
          risk_level?: string;
          status?: string;
          title_ar: string;
          title_en: string;
          total_sak_inventory: number;
          updated_at?: string;
        };
        Update: {
          area_m2?: number;
          asset_type?: string;
          available_sak?: number;
          city?: string;
          country?: string;
          cover_image_url?: string | null;
          created_at?: string;
          description_ar?: string;
          description_en?: string;
          expected_roi?: number;
          gallery?: Json;
          id?: string;
          lat?: number | null;
          lng?: number | null;
          maturity_months?: number;
          project_id?: string | null;
          risk_level?: string;
          status?: string;
          title_ar?: string;
          title_en?: string;
          total_sak_inventory?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lands_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          body: string;
          category: string;
          created_at: string;
          id: string;
          is_read: boolean;
          title: string;
          user_id: string;
        };
        Insert: {
          body?: string;
          category?: string;
          created_at?: string;
          id?: string;
          is_read?: boolean;
          title: string;
          user_id: string;
        };
        Update: {
          body?: string;
          category?: string;
          created_at?: string;
          id?: string;
          is_read?: boolean;
          title?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      payment_requests: {
        Row: {
          created_at: string;
          id: string;
          method: string;
          processed_at: string | null;
          proof_path: string | null;
          rate_used_at_approval: number | null;
          rejection_reason: string | null;
          reviewed_by: string | null;
          sak_amount: number | null;
          status: string;
          type: string;
          usd_amount: number;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          method: string;
          processed_at?: string | null;
          proof_path?: string | null;
          rate_used_at_approval?: number | null;
          rejection_reason?: string | null;
          reviewed_by?: string | null;
          sak_amount?: number | null;
          status?: string;
          type: string;
          usd_amount: number;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          method?: string;
          processed_at?: string | null;
          proof_path?: string | null;
          rate_used_at_approval?: number | null;
          rejection_reason?: string | null;
          reviewed_by?: string | null;
          sak_amount?: number | null;
          status?: string;
          type?: string;
          usd_amount?: number;
          user_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          account_status: string;
          created_at: string;
          email: string;
          full_name: string;
          id: string;
          kyc_status: string;
          language: string;
          phone: string | null;
          referral_code: string | null;
          updated_at: string;
        };
        Insert: {
          account_status?: string;
          created_at?: string;
          email?: string;
          full_name?: string;
          id: string;
          kyc_status?: string;
          language?: string;
          phone?: string | null;
          referral_code?: string | null;
          updated_at?: string;
        };
        Update: {
          account_status?: string;
          created_at?: string;
          email?: string;
          full_name?: string;
          id?: string;
          kyc_status?: string;
          language?: string;
          phone?: string | null;
          referral_code?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      projects: {
        Row: {
          city: string;
          country: string;
          cover_image_url: string | null;
          created_at: string;
          description_ar: string;
          description_en: string;
          expected_roi: number;
          id: string;
          risk_level: string;
          sort_order: number;
          status: string;
          title_ar: string;
          title_en: string;
          updated_at: string;
        };
        Insert: {
          city?: string;
          country: string;
          cover_image_url?: string | null;
          created_at?: string;
          description_ar?: string;
          description_en?: string;
          expected_roi?: number;
          id?: string;
          risk_level?: string;
          sort_order?: number;
          status?: string;
          title_ar: string;
          title_en: string;
          updated_at?: string;
        };
        Update: {
          city?: string;
          country?: string;
          cover_image_url?: string | null;
          created_at?: string;
          description_ar?: string;
          description_en?: string;
          expected_roi?: number;
          id?: string;
          risk_level?: string;
          sort_order?: number;
          status?: string;
          title_ar?: string;
          title_en?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      sak_config: {
        Row: {
          created_at: string;
          effective_from: string;
          id: string;
          sak_to_gold_ratio: number;
          sell_fee_percent: number;
        };
        Insert: {
          created_at?: string;
          effective_from?: string;
          id?: string;
          sak_to_gold_ratio?: number;
          sell_fee_percent?: number;
        };
        Update: {
          created_at?: string;
          effective_from?: string;
          id?: string;
          sak_to_gold_ratio?: number;
          sell_fee_percent?: number;
        };
        Relationships: [];
      };
      transactions: {
        Row: {
          created_at: string;
          description: string;
          direction: string;
          id: string;
          reference_id: string | null;
          sak_amount: number;
          sak_price_at_time: number | null;
          status: string;
          type: string;
          usd_amount: number;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          description?: string;
          direction: string;
          id?: string;
          reference_id?: string | null;
          sak_amount?: number;
          sak_price_at_time?: number | null;
          status?: string;
          type: string;
          usd_amount?: number;
          user_id: string;
        };
        Update: {
          created_at?: string;
          description?: string;
          direction?: string;
          id?: string;
          reference_id?: string | null;
          sak_amount?: number;
          sak_price_at_time?: number | null;
          status?: string;
          type?: string;
          usd_amount?: number;
          user_id?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
      wallets: {
        Row: {
          created_at: string;
          id: string;
          sak_balance: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          sak_balance?: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          sak_balance?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      current_sak_price: { Args: never; Returns: number };
      fn_approve_deposit: {
        Args: { p_admin: string; p_request: string };
        Returns: number;
      };
      fn_approve_withdrawal: {
        Args: { p_admin: string; p_request: string };
        Returns: number;
      };
      fn_buy_sak: {
        Args: { p_land: string; p_sak: number; p_user: string };
        Returns: string;
      };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      is_admin: { Args: { _user_id: string }; Returns: boolean };
    };
    Enums: {
      app_role: "super_admin" | "admin" | "investor";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["super_admin", "admin", "investor"],
    },
  },
} as const;
