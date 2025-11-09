import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      leads: {
        Row: {
          id: string;
          user_id: string;
          company_name: string;
          contact_name: string;
          email: string;
          phone: string | null;
          status: string;
          source: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      customers: {
        Row: {
          id: string;
          user_id: string;
          company_name: string;
          contact_name: string;
          email: string;
          phone: string | null;
          address: string | null;
          status: string;
          total_revenue: number;
          created_at: string;
          updated_at: string;
        };
      };
      deals: {
        Row: {
          id: string;
          user_id: string;
          customer_id: string | null;
          lead_id: string | null;
          title: string;
          amount: number;
          stage: string;
          probability: number;
          expected_close_date: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      activities: {
        Row: {
          id: string;
          user_id: string;
          related_to: string;
          related_id: string;
          type: string;
          title: string;
          description: string | null;
          status: string;
          due_date: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
      };
    };
  };
}
