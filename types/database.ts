export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          username: string | null;
          telegram_id: number | null;
          weight_unit: string;
          timezone: string;
          theme: string;
          quiet_hours_start: string | null;
          quiet_hours_end: string | null;
          reminders_enabled: boolean;
          reminder_time: string | null;
          is_pro: boolean;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          username?: string | null;
          telegram_id?: number | null;
          weight_unit?: string;
          timezone?: string;
          theme?: string;
          quiet_hours_start?: string | null;
          quiet_hours_end?: string | null;
          reminders_enabled?: boolean;
          reminder_time?: string | null;
          is_pro?: boolean;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          username?: string | null;
          telegram_id?: number | null;
          weight_unit?: string;
          timezone?: string;
          theme?: string;
          quiet_hours_start?: string | null;
          quiet_hours_end?: string | null;
          reminders_enabled?: boolean;
          reminder_time?: string | null;
          is_pro?: boolean;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      telegram_auth: {
        Row: {
          user_id: string;
          password: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          password: string;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          password?: string;
          created_at?: string;
        };
      };
      species: {
        Row: {
          id: number;
          name: string;
          common_names: string[] | null;
          avg_weight_g: number | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          name: string;
          common_names?: string[] | null;
          avg_weight_g?: number | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          name?: string;
          common_names?: string[] | null;
          avg_weight_g?: number | null;
          created_at?: string;
        };
      };
      birds: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          species: string;
          date_of_birth: string | null;
          date_type: string;
          target_weight: number | null;
          current_weight: number | null;
          status: string;
          avatar_url: string | null;
          avatar_color: Json;
          timezone: string;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          species: string;
          date_of_birth?: string | null;
          date_type?: string;
          target_weight?: number | null;
          current_weight?: number | null;
          status?: string;
          avatar_url?: string | null;
          avatar_color?: Json;
          timezone?: string;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          species?: string;
          date_of_birth?: string | null;
          date_type?: string;
          target_weight?: number | null;
          current_weight?: number | null;
          status?: string;
          avatar_url?: string | null;
          avatar_color?: Json;
          timezone?: string;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      daily_logs: {
        Row: {
          id: string;
          bird_id: string;
          user_id: string;
          log_date: string;
          log_type: string;
          weight: number | null;
          weight_unit: string;
          overall_status: string;
          activity_level: string;
          appetite: string;
          poop_feces_color: string | null;
          poop_feces_consistency: string | null;
          poop_urates_color: string | null;
          poop_urine_amount: string | null;
          poop_photo_url: string | null;
          observations: string | null;
          custom_fields: Json;
          logged_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          bird_id: string;
          user_id: string;
          log_date: string;
          log_type?: string;
          weight?: number | null;
          weight_unit?: string;
          overall_status?: string;
          activity_level?: string;
          appetite?: string;
          poop_feces_color?: string | null;
          poop_feces_consistency?: string | null;
          poop_urates_color?: string | null;
          poop_urine_amount?: string | null;
          poop_photo_url?: string | null;
          observations?: string | null;
          custom_fields?: Json;
          logged_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          bird_id?: string;
          user_id?: string;
          log_date?: string;
          log_type?: string;
          weight?: number | null;
          weight_unit?: string;
          overall_status?: string;
          activity_level?: string;
          appetite?: string;
          poop_feces_color?: string | null;
          poop_feces_consistency?: string | null;
          poop_urates_color?: string | null;
          poop_urine_amount?: string | null;
          poop_photo_url?: string | null;
          observations?: string | null;
          custom_fields?: Json;
          logged_at?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      medications: {
        Row: {
          id: string;
          bird_id: string;
          user_id: string;
          name: string;
          dosage: string | null;
          route: string;
          schedule: string | null;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          bird_id: string;
          user_id: string;
          name: string;
          dosage?: string | null;
          route?: string;
          schedule?: string | null;
          active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          bird_id?: string;
          user_id?: string;
          name?: string;
          dosage?: string | null;
          route?: string;
          schedule?: string | null;
          active?: boolean;
          created_at?: string;
        };
      };
      medication_logs: {
        Row: {
          id: string;
          medication_id: string;
          bird_id: string;
          given_at: string;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          medication_id: string;
          bird_id: string;
          given_at?: string;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          medication_id?: string;
          bird_id?: string;
          given_at?: string;
          notes?: string | null;
          created_at?: string;
        };
      };
      egg_logs: {
        Row: {
          id: string;
          bird_id: string;
          user_id: string;
          laid_at: string;
          egg_number: number | null;
          clutch_id: string | null;
          location: string | null;
          shell_appearance: string;
          fertile: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          bird_id: string;
          user_id: string;
          laid_at: string;
          egg_number?: number | null;
          clutch_id?: string | null;
          location?: string | null;
          shell_appearance?: string;
          fertile?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          bird_id?: string;
          user_id?: string;
          laid_at?: string;
          egg_number?: number | null;
          clutch_id?: string | null;
          location?: string | null;
          shell_appearance?: string;
          fertile?: string;
          created_at?: string;
        };
      };
      reminders: {
        Row: {
          id: string;
          user_id: string;
          bird_id: string | null;
          type: string;
          reminder_time: string | null;
          days_of_week: number[] | null;
          active: boolean;
          quiet_hours_start: string | null;
          quiet_hours_end: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          bird_id?: string | null;
          type?: string;
          reminder_time?: string | null;
          days_of_week?: number[] | null;
          active?: boolean;
          quiet_hours_start?: string | null;
          quiet_hours_end?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          bird_id?: string | null;
          type?: string;
          reminder_time?: string | null;
          days_of_week?: number[] | null;
          active?: boolean;
          quiet_hours_start?: string | null;
          quiet_hours_end?: string | null;
          created_at?: string;
        };
      };
    };
    Views: {};
    Functions: {
      handle_new_user: {
        Args: Record<string, never>;
        Returns: unknown;
      };
      create_demo_bird: {
        Args: { p_user_id: string };
        Returns: string;
      };
    };
    Enums: {};
  };
}
