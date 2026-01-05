import { supabase, isSupabaseConfigured } from './supabaseClient';
import { UserRole } from '../types';

export interface SignUpData {
  email: string;
  password: string;
  name: string;
  lastName?: string;
  phone?: string;
  role: UserRole;
}

export interface SignInData {
  email: string;
  password: string;
}

export const AuthService = {
  // Registrar novo usuário
  signUp: async (data: SignUpData) => {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured');
    }

    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          name: data.name,
          last_name: data.lastName || '',
          phone: data.phone || '',
          role: data.role
        }
      }
    });

    if (error) throw error;

    // Se for teacher, criar entrada em professionals
    if (authData.user && data.role === UserRole.TEACHER) {
      await supabase.from('professionals').insert({
        user_id: authData.user.id,
        bio: 'Nuevo profesional en FitnessMatch',
        location: 'Costa Rica',
        modalities: ['presencial']
      });
    }

    return authData;
  },

  // Login com email e senha
  signIn: async (data: SignInData) => {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured');
    }

    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password
    });

    if (error) throw error;
    return authData;
  },

  // Login com telefone (OTP)
  signInWithPhone: async (phone: string) => {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured');
    }

    const { data, error } = await supabase.auth.signInWithOtp({
      phone: phone
    });

    if (error) throw error;
    return data;
  },

  // Verificar OTP
  verifyOtp: async (phone: string, token: string) => {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured');
    }

    const { data, error } = await supabase.auth.verifyOtp({
      phone: phone,
      token: token,
      type: 'sms'
    });

    if (error) throw error;
    return data;
  },

  // Logout
  signOut: async () => {
    if (!isSupabaseConfigured()) {
      return;
    }

    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  // Obter sessão atual
  getSession: async () => {
    if (!isSupabaseConfigured()) {
      return null;
    }

    const { data: { session } } = await supabase.auth.getSession();
    return session;
  },

  // Obter usuário atual
  getCurrentUser: async () => {
    if (!isSupabaseConfigured()) {
      return null;
    }

    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  // Obter perfil completo do usuário atual
  getCurrentProfile: async () => {
    if (!isSupabaseConfigured()) {
      return null;
    }

    const user = await AuthService.getCurrentUser();
    if (!user) return null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!profile) return null;

    // Se for teacher, buscar dados profissionais também
    if (profile.role === 'teacher') {
      const { data: proData } = await supabase
        .from('professionals')
        .select('*')
        .eq('user_id', user.id)
        .single();

      return { ...profile, ...proData, id: user.id };
    }

    return profile;
  },

  // Listener para mudanças de autenticação
  onAuthStateChange: (callback: (event: string, session: any) => void) => {
    if (!isSupabaseConfigured()) {
      return { data: { subscription: { unsubscribe: () => {} } } };
    }

    return supabase.auth.onAuthStateChange(callback);
  },

  // Recuperar senha
  resetPassword: async (email: string) => {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured');
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    });

    if (error) throw error;
  },

  // Atualizar senha
  updatePassword: async (newPassword: string) => {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured');
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) throw error;
  }
};
