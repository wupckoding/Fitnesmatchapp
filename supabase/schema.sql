-- =====================================================
-- FITNESSMATCH - SCHEMA DO BANCO DE DADOS SUPABASE
-- =====================================================
-- Execute este script no SQL Editor do Supabase

-- Habilitar extensão UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABELA: profiles (extensão do auth.users)
-- =====================================================
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  last_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL,
  phone TEXT DEFAULT '',
  phone_verified BOOLEAN DEFAULT FALSE,
  role TEXT NOT NULL CHECK (role IN ('client', 'teacher', 'admin')) DEFAULT 'client',
  city TEXT DEFAULT 'San José',
  status TEXT CHECK (status IN ('active', 'blocked', 'deactivated')) DEFAULT 'active',
  avatar_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABELA: professionals (dados extras de instrutores)
-- =====================================================
CREATE TABLE public.professionals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  bio TEXT DEFAULT 'Nuevo profesional en FitnessMatch',
  location TEXT DEFAULT 'Costa Rica',
  price INTEGER DEFAULT 0,
  rating DECIMAL(2,1) DEFAULT 5.0,
  reviews INTEGER DEFAULT 0,
  areas TEXT[] DEFAULT '{}',
  modalities TEXT[] DEFAULT ARRAY['presencial'],
  plan_active BOOLEAN DEFAULT FALSE,
  plan_type TEXT CHECK (plan_type IN ('Mensual', 'Trimestral', 'Anual')),
  plan_expiry TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABELA: categories (disciplinas/esportes)
-- =====================================================
CREATE TABLE public.categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  icon_class TEXT DEFAULT '⭐',
  color_hex TEXT DEFAULT '#3B82F6',
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  meta_title TEXT DEFAULT '',
  meta_description TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABELA: plans (planos de assinatura)
-- =====================================================
CREATE TABLE public.plans (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  duration_months INTEGER NOT NULL DEFAULT 1,
  description TEXT DEFAULT '',
  price INTEGER NOT NULL DEFAULT 0,
  promo_price INTEGER,
  max_photos INTEGER DEFAULT 1,
  display_order INTEGER DEFAULT 0,
  features TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  is_featured BOOLEAN DEFAULT FALSE,
  includes_analytics BOOLEAN DEFAULT FALSE,
  priority_support BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABELA: time_slots (horários disponíveis)
-- =====================================================
CREATE TABLE public.time_slots (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  professional_id UUID REFERENCES public.professionals(id) ON DELETE CASCADE NOT NULL,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  capacity_total INTEGER DEFAULT 1,
  capacity_booked INTEGER DEFAULT 0,
  slot_type TEXT CHECK (slot_type IN ('grupo', 'individual')) DEFAULT 'individual',
  location TEXT DEFAULT '',
  price INTEGER DEFAULT 0,
  status TEXT CHECK (status IN ('active', 'cancelled')) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABELA: bookings (reservas)
-- =====================================================
CREATE TABLE public.bookings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  client_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  professional_id UUID REFERENCES public.professionals(id) ON DELETE CASCADE NOT NULL,
  slot_id UUID REFERENCES public.time_slots(id) ON DELETE SET NULL,
  client_name TEXT NOT NULL,
  teacher_name TEXT NOT NULL,
  booking_date TIMESTAMPTZ NOT NULL,
  price INTEGER DEFAULT 0,
  status TEXT CHECK (status IN ('Pendiente', 'Confirmada', 'Rechazada', 'Cancelada')) DEFAULT 'Pendiente',
  message TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABELA: messages (chat)
-- =====================================================
CREATE TABLE public.messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  receiver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  text TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABELA: conversations (conversas)
-- =====================================================
CREATE TABLE public.conversations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  participant_ids UUID[] NOT NULL,
  last_message TEXT DEFAULT '',
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABELA: notifications (notificações)
-- =====================================================
CREATE TABLE public.notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  notification_type TEXT CHECK (notification_type IN ('booking', 'system', 'chat')) DEFAULT 'system',
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================
CREATE INDEX idx_professionals_user_id ON public.professionals(user_id);
CREATE INDEX idx_professionals_plan_active ON public.professionals(plan_active);
CREATE INDEX idx_time_slots_professional ON public.time_slots(professional_id);
CREATE INDEX idx_time_slots_start ON public.time_slots(start_at);
CREATE INDEX idx_bookings_client ON public.bookings(client_id);
CREATE INDEX idx_bookings_professional ON public.bookings(professional_id);
CREATE INDEX idx_bookings_status ON public.bookings(status);
CREATE INDEX idx_messages_sender ON public.messages(sender_id);
CREATE INDEX idx_messages_receiver ON public.messages(receiver_id);
CREATE INDEX idx_notifications_user ON public.notifications(user_id);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- PROFILES: Usuário pode ver todos, mas só editar o próprio
CREATE POLICY "Profiles são visíveis para todos" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Usuários podem editar próprio perfil" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Usuários podem inserir próprio perfil" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- PROFESSIONALS: Visível para todos, editável pelo próprio
CREATE POLICY "Professionals visíveis para todos" ON public.professionals FOR SELECT USING (true);
CREATE POLICY "Professionals podem editar próprio" ON public.professionals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Professionals podem inserir próprio" ON public.professionals FOR INSERT WITH CHECK (auth.uid() = user_id);

-- CATEGORIES: Leitura para todos, escrita para admins
CREATE POLICY "Categories visíveis para todos" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Admins podem gerenciar categories" ON public.categories FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- PLANS: Leitura para todos
CREATE POLICY "Plans visíveis para todos" ON public.plans FOR SELECT USING (true);
CREATE POLICY "Admins podem gerenciar plans" ON public.plans FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- TIME_SLOTS: Visível para todos, editável pelo pro
CREATE POLICY "Slots visíveis para todos" ON public.time_slots FOR SELECT USING (true);
CREATE POLICY "Pros podem gerenciar próprios slots" ON public.time_slots FOR ALL USING (
  EXISTS (SELECT 1 FROM public.professionals WHERE id = professional_id AND user_id = auth.uid())
);

-- BOOKINGS: Visível para envolvidos
CREATE POLICY "Bookings visíveis para envolvidos" ON public.bookings FOR SELECT USING (
  client_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM public.professionals WHERE id = professional_id AND user_id = auth.uid())
);
CREATE POLICY "Clientes podem criar bookings" ON public.bookings FOR INSERT WITH CHECK (client_id = auth.uid());
CREATE POLICY "Envolvidos podem atualizar bookings" ON public.bookings FOR UPDATE USING (
  client_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM public.professionals WHERE id = professional_id AND user_id = auth.uid())
);

-- MESSAGES: Visível para sender e receiver
CREATE POLICY "Messages visíveis para participantes" ON public.messages FOR SELECT USING (
  sender_id = auth.uid() OR receiver_id = auth.uid()
);
CREATE POLICY "Usuários podem enviar messages" ON public.messages FOR INSERT WITH CHECK (sender_id = auth.uid());
CREATE POLICY "Receiver pode marcar como lida" ON public.messages FOR UPDATE USING (receiver_id = auth.uid());

-- CONVERSATIONS: Visível para participantes
CREATE POLICY "Conversations visíveis para participantes" ON public.conversations FOR SELECT USING (
  auth.uid() = ANY(participant_ids)
);
CREATE POLICY "Participantes podem criar/atualizar conversations" ON public.conversations FOR ALL USING (
  auth.uid() = ANY(participant_ids)
);

-- NOTIFICATIONS: Só para o próprio usuário
CREATE POLICY "Notifications só para o usuário" ON public.notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Sistema pode criar notifications" ON public.notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Usuário pode atualizar próprias notifications" ON public.notifications FOR UPDATE USING (user_id = auth.uid());

-- =====================================================
-- FUNÇÕES E TRIGGERS
-- =====================================================

-- Função para criar profile automaticamente após signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'Usuario'),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'client')
  );
  
  -- Se for teacher, cria entrada em professionals
  IF COALESCE(NEW.raw_user_meta_data->>'role', 'client') = 'teacher' THEN
    INSERT INTO public.professionals (user_id)
    VALUES (NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para executar após signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_professionals_updated_at BEFORE UPDATE ON public.professionals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =====================================================
-- DADOS INICIAIS (SEED)
-- =====================================================

-- Categorias iniciais
INSERT INTO public.categories (name, slug, description, icon_class, color_hex, display_order, is_active) VALUES
('Pádel', 'padel', 'Entrenadores de pádel profesionales', '🎾', '#3B82F6', 1, TRUE),
('Tenis', 'tenis', 'Clases de tenis para todos los niveles', '🎾', '#10B981', 2, TRUE),
('Pilates', 'pilates', 'Instructores certificados de Pilates', '🧘', '#8B5CF6', 3, TRUE),
('Yoga', 'yoga', 'Profesores de yoga y meditación', '🧘', '#F59E0B', 4, TRUE),
('Personal Trainer', 'personal-trainer', 'Entrenamiento personalizado', '💪', '#EF4444', 5, TRUE),
('Crossfit', 'crossfit', 'Entrenamiento funcional de alta intensidad', '🏋️', '#6366F1', 6, TRUE);

-- Planos iniciais
INSERT INTO public.plans (name, duration_months, description, price, promo_price, max_photos, display_order, features, is_active, is_featured, includes_analytics, priority_support) VALUES
('Básico', 1, 'Plan mensual para empezar', 20000, NULL, 1, 1, ARRAY['Presencia en el catálogo', 'Soporte estándar'], TRUE, FALSE, FALSE, FALSE),
('Profesional', 3, 'Plan trimestral con descuento', 60000, 52500, 5, 2, ARRAY['Presencia en el catálogo', 'Soporte prioritario', 'Estadísticas básicas'], TRUE, TRUE, FALSE, TRUE),
('Premium', 6, 'Plan semestral - Mejor valor', 120000, 107500, 10, 3, ARRAY['Presencia destacada', 'Soporte prioritario 24/7', 'Analíticas avanzadas'], TRUE, FALSE, TRUE, TRUE);

-- =====================================================
-- REAL-TIME (habilitar para tabelas que precisam)
-- =====================================================
-- Execute isso no dashboard do Supabase: Database > Replication
-- Ou use estes comandos:

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;

-- =====================================================
-- FIM DO SCHEMA
-- =====================================================
