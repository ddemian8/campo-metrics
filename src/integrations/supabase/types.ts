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
      players: {
        Row: {
          age_calculated: number | null
          country: string | null
          created_at: string
          date_of_birth: string | null
          first_name: string
          height_cm: number | null
          id: string
          last_name: string
          league: string | null
          position: string | null
          team_name: string | null
          transfermarkt_club: string | null
          transfermarkt_league: string | null
          transfermarkt_url: string | null
          updated_at: string
          user_id: string | null
          weight_kg: number | null
        }
        Insert: {
          age_calculated?: number | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          first_name: string
          height_cm?: number | null
          id?: string
          last_name: string
          league?: string | null
          position?: string | null
          team_name?: string | null
          transfermarkt_club?: string | null
          transfermarkt_league?: string | null
          transfermarkt_url?: string | null
          updated_at?: string
          user_id?: string | null
          weight_kg?: number | null
        }
        Update: {
          age_calculated?: number | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          first_name?: string
          height_cm?: number | null
          id?: string
          last_name?: string
          league?: string | null
          position?: string | null
          team_name?: string | null
          transfermarkt_club?: string | null
          transfermarkt_league?: string | null
          transfermarkt_url?: string | null
          updated_at?: string
          user_id?: string | null
          weight_kg?: number | null
        }
        Relationships: []
      }
      sessions: {
        Row: {
          acc_ev: number | null
          age_calculated: number | null
          athlete_name: string | null
          av_sp: number | null
          consent_leaderboard: boolean | null
          consent_public_profile: boolean | null
          consent_terms: boolean | null
          consent_timestamp: string | null
          country: string | null
          created_at: string
          date_of_birth: string | null
          dec_ev: number | null
          dist_sp_z4: number | null
          dist_sp_z4plus: number | null
          dist_sp_z5: number | null
          distance: number | null
          duration: string | null
          entry_method: string | null
          first_name: string
          height_cm: number | null
          hmld: number | null
          id: string
          last_name: string
          league: string | null
          max_sp: number | null
          md_day: string | null
          opponent: string | null
          position: string | null
          session_date: string | null
          session_type: string | null
          sp_ev: number | null
          status: string | null
          team_name: string | null
          transfermarkt_club: string | null
          transfermarkt_league: string | null
          transfermarkt_url: string | null
          updated_at: string
          user_id: string | null
          weight_kg: number | null
        }
        Insert: {
          acc_ev?: number | null
          age_calculated?: number | null
          athlete_name?: string | null
          av_sp?: number | null
          consent_leaderboard?: boolean | null
          consent_public_profile?: boolean | null
          consent_terms?: boolean | null
          consent_timestamp?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          dec_ev?: number | null
          dist_sp_z4?: number | null
          dist_sp_z4plus?: number | null
          dist_sp_z5?: number | null
          distance?: number | null
          duration?: string | null
          entry_method?: string | null
          first_name: string
          height_cm?: number | null
          hmld?: number | null
          id?: string
          last_name: string
          league?: string | null
          max_sp?: number | null
          md_day?: string | null
          opponent?: string | null
          position?: string | null
          session_date?: string | null
          session_type?: string | null
          sp_ev?: number | null
          status?: string | null
          team_name?: string | null
          transfermarkt_club?: string | null
          transfermarkt_league?: string | null
          transfermarkt_url?: string | null
          updated_at?: string
          user_id?: string | null
          weight_kg?: number | null
        }
        Update: {
          acc_ev?: number | null
          age_calculated?: number | null
          athlete_name?: string | null
          av_sp?: number | null
          consent_leaderboard?: boolean | null
          consent_public_profile?: boolean | null
          consent_terms?: boolean | null
          consent_timestamp?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          dec_ev?: number | null
          dist_sp_z4?: number | null
          dist_sp_z4plus?: number | null
          dist_sp_z5?: number | null
          distance?: number | null
          duration?: string | null
          entry_method?: string | null
          first_name?: string
          height_cm?: number | null
          hmld?: number | null
          id?: string
          last_name?: string
          league?: string | null
          max_sp?: number | null
          md_day?: string | null
          opponent?: string | null
          position?: string | null
          session_date?: string | null
          session_type?: string | null
          sp_ev?: number | null
          status?: string | null
          team_name?: string | null
          transfermarkt_club?: string | null
          transfermarkt_league?: string | null
          transfermarkt_url?: string | null
          updated_at?: string
          user_id?: string | null
          weight_kg?: number | null
        }
        Relationships: []
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
