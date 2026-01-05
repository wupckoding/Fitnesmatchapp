// Tipos gerados para o Supabase (baseados no schema.sql)

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
          name: string;
          last_name: string;
          email: string;
          phone: string | null;
          phone_verified: boolean;
          role: 'client' | 'teacher' | 'admin';
          city: string;
          status: 'active' | 'blocked' | 'deactivated';
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name: string;
          last_name?: string;
          email: string;
          phone?: string | null;
          phone_verified?: boolean;
          role?: 'client' | 'teacher' | 'admin';
          city?: string;
          status?: 'active' | 'blocked' | 'deactivated';
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          last_name?: string;
          email?: string;
          phone?: string | null;
          phone_verified?: boolean;
          role?: 'client' | 'teacher' | 'admin';
          city?: string;
          status?: 'active' | 'blocked' | 'deactivated';
          avatar_url?: string | null;
          updated_at?: string;
        };
      };
      professionals: {
        Row: {
          id: string;
          user_id: string;
          bio: string;
          location: string;
          price: number;
          rating: number;
          reviews: number;
          areas: string[];
          modalities: string[];
          plan_active: boolean;
          plan_type: 'Mensual' | 'Trimestral' | 'Anual' | null;
          plan_expiry: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          bio?: string;
          location?: string;
          price?: number;
          rating?: number;
          reviews?: number;
          areas?: string[];
          modalities?: string[];
          plan_active?: boolean;
          plan_type?: 'Mensual' | 'Trimestral' | 'Anual' | null;
          plan_expiry?: string | null;
        };
        Update: {
          bio?: string;
          location?: string;
          price?: number;
          rating?: number;
          reviews?: number;
          areas?: string[];
          modalities?: string[];
          plan_active?: boolean;
          plan_type?: 'Mensual' | 'Trimestral' | 'Anual' | null;
          plan_expiry?: string | null;
        };
      };
      categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string;
          icon_class: string;
          color_hex: string;
          display_order: number;
          is_active: boolean;
          meta_title: string;
          meta_description: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string;
          icon_class?: string;
          color_hex?: string;
          display_order?: number;
          is_active?: boolean;
          meta_title?: string;
          meta_description?: string;
        };
        Update: {
          name?: string;
          slug?: string;
          description?: string;
          icon_class?: string;
          color_hex?: string;
          display_order?: number;
          is_active?: boolean;
          meta_title?: string;
          meta_description?: string;
        };
      };
      plans: {
        Row: {
          id: string;
          name: string;
          duration_months: number;
          description: string;
          price: number;
          promo_price: number | null;
          max_photos: number;
          display_order: number;
          features: string[];
          is_active: boolean;
          is_featured: boolean;
          includes_analytics: boolean;
          priority_support: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          duration_months?: number;
          description?: string;
          price: number;
          promo_price?: number | null;
          max_photos?: number;
          display_order?: number;
          features?: string[];
          is_active?: boolean;
          is_featured?: boolean;
          includes_analytics?: boolean;
          priority_support?: boolean;
        };
        Update: {
          name?: string;
          duration_months?: number;
          description?: string;
          price?: number;
          promo_price?: number | null;
          max_photos?: number;
          display_order?: number;
          features?: string[];
          is_active?: boolean;
          is_featured?: boolean;
          includes_analytics?: boolean;
          priority_support?: boolean;
        };
      };
      time_slots: {
        Row: {
          id: string;
          professional_id: string;
          start_at: string;
          end_at: string;
          capacity_total: number;
          capacity_booked: number;
          slot_type: 'grupo' | 'individual';
          location: string;
          price: number;
          status: 'active' | 'cancelled';
          created_at: string;
        };
        Insert: {
          id?: string;
          professional_id: string;
          start_at: string;
          end_at: string;
          capacity_total?: number;
          capacity_booked?: number;
          slot_type?: 'grupo' | 'individual';
          location?: string;
          price?: number;
          status?: 'active' | 'cancelled';
        };
        Update: {
          start_at?: string;
          end_at?: string;
          capacity_total?: number;
          capacity_booked?: number;
          slot_type?: 'grupo' | 'individual';
          location?: string;
          price?: number;
          status?: 'active' | 'cancelled';
        };
      };
      bookings: {
        Row: {
          id: string;
          client_id: string;
          professional_id: string;
          slot_id: string | null;
          client_name: string;
          teacher_name: string;
          booking_date: string;
          price: number;
          status: 'Pendiente' | 'Confirmada' | 'Rechazada' | 'Cancelada';
          message: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          professional_id: string;
          slot_id?: string | null;
          client_name: string;
          teacher_name: string;
          booking_date: string;
          price?: number;
          status?: 'Pendiente' | 'Confirmada' | 'Rechazada' | 'Cancelada';
          message?: string;
        };
        Update: {
          slot_id?: string | null;
          client_name?: string;
          teacher_name?: string;
          booking_date?: string;
          price?: number;
          status?: 'Pendiente' | 'Confirmada' | 'Rechazada' | 'Cancelada';
          message?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          sender_id: string;
          receiver_id: string;
          text: string;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          sender_id: string;
          receiver_id: string;
          text: string;
          is_read?: boolean;
        };
        Update: {
          text?: string;
          is_read?: boolean;
        };
      };
      conversations: {
        Row: {
          id: string;
          participant_ids: string[];
          last_message: string;
          last_message_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          participant_ids: string[];
          last_message?: string;
          last_message_at?: string;
        };
        Update: {
          participant_ids?: string[];
          last_message?: string;
          last_message_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          message: string;
          notification_type: 'booking' | 'system' | 'chat';
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          message: string;
          notification_type?: 'booking' | 'system' | 'chat';
          is_read?: boolean;
        };
        Update: {
          title?: string;
          message?: string;
          notification_type?: 'booking' | 'system' | 'chat';
          is_read?: boolean;
        };
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
  };
}

// Tipos helper para uso no app
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Professional = Database['public']['Tables']['professionals']['Row'];
export type Category = Database['public']['Tables']['categories']['Row'];
export type Plan = Database['public']['Tables']['plans']['Row'];
export type TimeSlot = Database['public']['Tables']['time_slots']['Row'];
export type Booking = Database['public']['Tables']['bookings']['Row'];
export type Message = Database['public']['Tables']['messages']['Row'];
export type Conversation = Database['public']['Tables']['conversations']['Row'];
export type Notification = Database['public']['Tables']['notifications']['Row'];

// Tipo combinado para Professional com dados do Profile
export type ProfessionalWithProfile = Professional & {
  profile: Profile;
};
