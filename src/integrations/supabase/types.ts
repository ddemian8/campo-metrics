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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      affiliate_referrals: {
        Row: {
          commission_rate: number
          created_at: string
          id: string
          referral_code: string
          referred_id: string | null
          referrer_id: string
          status: string
          updated_at: string
        }
        Insert: {
          commission_rate?: number
          created_at?: string
          id?: string
          referral_code: string
          referred_id?: string | null
          referrer_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          commission_rate?: number
          created_at?: string
          id?: string
          referral_code?: string
          referred_id?: string | null
          referrer_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_referrals_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      anonymous_sessions: {
        Row: {
          ai_report: Json | null
          anonymous_token: string
          created_at: string
          expires_at: string
          gps_data: Json | null
          id: string
          input_method: string | null
          opponent: string | null
          player_name: string | null
          position: string | null
          session_date: string | null
          session_type: string | null
          status: string
          training_day: string | null
        }
        Insert: {
          ai_report?: Json | null
          anonymous_token: string
          created_at?: string
          expires_at?: string
          gps_data?: Json | null
          id?: string
          input_method?: string | null
          opponent?: string | null
          player_name?: string | null
          position?: string | null
          session_date?: string | null
          session_type?: string | null
          status?: string
          training_day?: string | null
        }
        Update: {
          ai_report?: Json | null
          anonymous_token?: string
          created_at?: string
          expires_at?: string
          gps_data?: Json | null
          id?: string
          input_method?: string | null
          opponent?: string | null
          player_name?: string | null
          position?: string | null
          session_date?: string | null
          session_type?: string | null
          status?: string
          training_day?: string | null
        }
        Relationships: []
      }
      club_members: {
        Row: {
          club_id: string
          id: string
          is_active: boolean
          joined_at: string
          player_id: string
          role: string
        }
        Insert: {
          club_id: string
          id?: string
          is_active?: boolean
          joined_at?: string
          player_id: string
          role?: string
        }
        Update: {
          club_id?: string
          id?: string
          is_active?: boolean
          joined_at?: string
          player_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_members_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_members_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clubs: {
        Row: {
          admin_id: string | null
          city: string | null
          country: string | null
          created_at: string
          id: string
          league: string | null
          logo_url: string | null
          max_players: number
          name: string
          paddle_customer_id: string | null
          paddle_subscription_id: string | null
          slug: string
          subscription_status: string
          updated_at: string
          website: string | null
        }
        Insert: {
          admin_id?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          id?: string
          league?: string | null
          logo_url?: string | null
          max_players?: number
          name: string
          paddle_customer_id?: string | null
          paddle_subscription_id?: string | null
          slug: string
          subscription_status?: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          admin_id?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          id?: string
          league?: string | null
          logo_url?: string | null
          max_players?: number
          name?: string
          paddle_customer_id?: string | null
          paddle_subscription_id?: string | null
          slug?: string
          subscription_status?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clubs_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      player_stats_aggregate: {
        Row: {
          avg_accelerations_per90: number | null
          avg_decelerations_per90: number | null
          avg_distance_per90: number | null
          avg_hsr_per90: number | null
          avg_performance_score: number | null
          avg_sprint_distance_per90: number | null
          avg_sprints_per90: number | null
          avg_top_speed: number | null
          best_distance_single_match: number | null
          best_performance_score: number | null
          best_sprint_distance_single: number | null
          best_top_speed: number | null
          last_session_date: string | null
          manual_session_count: number
          pdf_session_count: number
          player_id: string
          screenshot_session_count: number
          total_matches: number
          total_sessions: number
          total_trainings: number
          trust_score: number
          updated_at: string
        }
        Insert: {
          avg_accelerations_per90?: number | null
          avg_decelerations_per90?: number | null
          avg_distance_per90?: number | null
          avg_hsr_per90?: number | null
          avg_performance_score?: number | null
          avg_sprint_distance_per90?: number | null
          avg_sprints_per90?: number | null
          avg_top_speed?: number | null
          best_distance_single_match?: number | null
          best_performance_score?: number | null
          best_sprint_distance_single?: number | null
          best_top_speed?: number | null
          last_session_date?: string | null
          manual_session_count?: number
          pdf_session_count?: number
          player_id: string
          screenshot_session_count?: number
          total_matches?: number
          total_sessions?: number
          total_trainings?: number
          trust_score?: number
          updated_at?: string
        }
        Update: {
          avg_accelerations_per90?: number | null
          avg_decelerations_per90?: number | null
          avg_distance_per90?: number | null
          avg_hsr_per90?: number | null
          avg_performance_score?: number | null
          avg_sprint_distance_per90?: number | null
          avg_sprints_per90?: number | null
          avg_top_speed?: number | null
          best_distance_single_match?: number | null
          best_performance_score?: number | null
          best_sprint_distance_single?: number | null
          best_top_speed?: number | null
          last_session_date?: string | null
          manual_session_count?: number
          pdf_session_count?: number
          player_id?: string
          screenshot_session_count?: number
          total_matches?: number
          total_sessions?: number
          total_trainings?: number
          trust_score?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_stats_aggregate_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_type: string
          affiliate_code: string | null
          avatar_url: string | null
          country: string | null
          created_at: string
          current_club: string | null
          current_league: string | null
          date_of_birth: string | null
          full_name: string | null
          height_cm: number | null
          id: string
          is_public: boolean
          paddle_customer_id: string | null
          paddle_subscription_id: string | null
          position: string | null
          position_specific: string | null
          preferred_foot: string | null
          referred_by: string | null
          reports_reset_date: string | null
          reports_used_this_month: number
          subscription_plan: string
          subscription_status: string
          transfermarkt_url: string | null
          updated_at: string
          user_id: string
          username: string | null
          weight_kg: number | null
        }
        Insert: {
          account_type?: string
          affiliate_code?: string | null
          avatar_url?: string | null
          country?: string | null
          created_at?: string
          current_club?: string | null
          current_league?: string | null
          date_of_birth?: string | null
          full_name?: string | null
          height_cm?: number | null
          id?: string
          is_public?: boolean
          paddle_customer_id?: string | null
          paddle_subscription_id?: string | null
          position?: string | null
          position_specific?: string | null
          preferred_foot?: string | null
          referred_by?: string | null
          reports_reset_date?: string | null
          reports_used_this_month?: number
          subscription_plan?: string
          subscription_status?: string
          transfermarkt_url?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
          weight_kg?: number | null
        }
        Update: {
          account_type?: string
          affiliate_code?: string | null
          avatar_url?: string | null
          country?: string | null
          created_at?: string
          current_club?: string | null
          current_league?: string | null
          date_of_birth?: string | null
          full_name?: string | null
          height_cm?: number | null
          id?: string
          is_public?: boolean
          paddle_customer_id?: string | null
          paddle_subscription_id?: string | null
          position?: string | null
          position_specific?: string | null
          preferred_foot?: string | null
          referred_by?: string | null
          reports_reset_date?: string | null
          reports_used_this_month?: number
          subscription_plan?: string
          subscription_status?: string
          transfermarkt_url?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
          weight_kg?: number | null
        }
        Relationships: []
      }
      reports: {
        Row: {
          ai_report: Json | null
          created_at: string
          generation_time_ms: number | null
          id: string
          is_public: boolean
          model_used: string | null
          player_id: string
          session_id: string
          tokens_used: number | null
          updated_at: string
        }
        Insert: {
          ai_report?: Json | null
          created_at?: string
          generation_time_ms?: number | null
          id?: string
          is_public?: boolean
          model_used?: string | null
          player_id: string
          session_id: string
          tokens_used?: number | null
          updated_at?: string
        }
        Update: {
          ai_report?: Json | null
          created_at?: string
          generation_time_ms?: number | null
          id?: string
          is_public?: boolean
          model_used?: string | null
          player_id?: string
          session_id?: string
          tokens_used?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          competition: string | null
          created_at: string
          gps_data: Json | null
          id: string
          input_method: string | null
          minutes_played: number | null
          opponent: string | null
          player_id: string
          position_specific: string | null
          session_date: string
          session_type: string
          status: string
          training_day: string | null
          updated_at: string
          uploaded_file_url: string | null
        }
        Insert: {
          competition?: string | null
          created_at?: string
          gps_data?: Json | null
          id?: string
          input_method?: string | null
          minutes_played?: number | null
          opponent?: string | null
          player_id: string
          position_specific?: string | null
          session_date: string
          session_type: string
          status?: string
          training_day?: string | null
          updated_at?: string
          uploaded_file_url?: string | null
        }
        Update: {
          competition?: string | null
          created_at?: string
          gps_data?: Json | null
          id?: string
          input_method?: string | null
          minutes_played?: number | null
          opponent?: string | null
          player_id?: string
          position_specific?: string | null
          session_date?: string
          session_type?: string
          status?: string
          training_day?: string | null
          updated_at?: string
          uploaded_file_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
