-- =====================================================
-- FITNESSMATCH - SCHEMA COMPLETO DO BANCO DE DADOS
-- =====================================================
-- Versão: 2.0
-- Data: Janeiro 2026
-- Desenvolvido por: JBNEXO (https://jbnexo.com)
-- 
-- Este arquivo contém TODA a estrutura do banco de dados.
-- Se precisar migrar para outro host, basta executar este SQL.
-- =====================================================

-- =====================================================
-- EXTENSÕES
-- =====================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- Para busca fuzzy

-- =====================================================
-- TABELA: profiles (extensão do auth.users)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY, -- Referência ao auth.users(id)
  name TEXT NOT NULL DEFAULT 'Usuario',
  last_name TEXT DEFAULT '',
  email TEXT NOT NULL,
  phone TEXT DEFAULT '',
  phone_verified BOOLEAN DEFAULT FALSE,
  role TEXT NOT NULL DEFAULT 'client', -- 'client', 'teacher', 'admin'
  city TEXT DEFAULT 'San José',
  status TEXT DEFAULT 'active', -- 'active', 'blocked', 'deactivated'
  avatar_url TEXT DEFAULT '',
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  requested_plan_id TEXT,
  requested_plan_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_last_seen ON public.profiles(last_seen);

-- =====================================================
-- TABELA: professionals (dados extras de instrutores)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.professionals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID UNIQUE NOT NULL, -- Referência ao profiles(id)
  name TEXT,
  email TEXT,
  phone TEXT,
  bio TEXT DEFAULT 'Profesional activo en FitnessMatch',
  location TEXT DEFAULT 'Costa Rica',
  price NUMERIC DEFAULT 0,
  rating NUMERIC(2,1) DEFAULT 5.0,
  reviews INTEGER DEFAULT 0,
  areas TEXT[] DEFAULT '{}',
  modalities TEXT[] DEFAULT ARRAY['presencial'],
  status TEXT DEFAULT 'deactivated', -- 'active', 'blocked', 'deactivated'
  plan_active BOOLEAN DEFAULT FALSE,
  plan_type TEXT, -- 'Prueba', 'Starter', 'Profesional', 'Elite'
  plan_expiry TIMESTAMPTZ,
  requested_plan_id TEXT,
  requested_plan_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_professionals_user_id ON public.professionals(user_id);
CREATE INDEX IF NOT EXISTS idx_professionals_plan_active ON public.professionals(plan_active);
CREATE INDEX IF NOT EXISTS idx_professionals_status ON public.professionals(status);
CREATE INDEX IF NOT EXISTS idx_professionals_rating ON public.professionals(rating DESC);
CREATE INDEX IF NOT EXISTS idx_professionals_price ON public.professionals(price);
CREATE INDEX IF NOT EXISTS idx_professionals_areas ON public.professionals USING GIN(areas);

-- =====================================================
-- TABELA: categories (disciplinas/especialidades)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.categories (
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

CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_order ON public.categories(display_order);

-- =====================================================
-- TABELA: plans (planos de assinatura)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.plans (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  duration_months INTEGER NOT NULL DEFAULT 1,
  description TEXT DEFAULT '',
  price NUMERIC NOT NULL DEFAULT 0,
  promo_price NUMERIC,
  max_photos INTEGER DEFAULT 1,
  max_reservations_per_month INTEGER DEFAULT 10,
  display_order INTEGER DEFAULT 0,
  features TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  is_featured BOOLEAN DEFAULT FALSE,
  includes_analytics BOOLEAN DEFAULT FALSE,
  priority_support BOOLEAN DEFAULT FALSE,
  highlighted_profile BOOLEAN DEFAULT FALSE,
  custom_branding BOOLEAN DEFAULT FALSE,
  chat_enabled BOOLEAN DEFAULT TRUE,
  color TEXT DEFAULT 'from-slate-500 to-slate-600',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_plans_order ON public.plans(display_order);
CREATE INDEX IF NOT EXISTS idx_plans_active ON public.plans(is_active);

-- =====================================================
-- TABELA: time_slots (horários disponíveis)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.time_slots (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  professional_id UUID NOT NULL, -- Pode ser user_id ou professionals.id
  pro_user_id UUID, -- user_id do profissional para queries mais fáceis
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  capacity_total INTEGER DEFAULT 1,
  capacity_booked INTEGER DEFAULT 0,
  slot_type TEXT DEFAULT 'individual', -- 'grupo', 'individual'
  location TEXT DEFAULT '',
  price NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'active', -- 'active', 'cancelled'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_time_slots_professional ON public.time_slots(professional_id);
CREATE INDEX IF NOT EXISTS idx_time_slots_pro_user ON public.time_slots(pro_user_id);
CREATE INDEX IF NOT EXISTS idx_time_slots_start ON public.time_slots(start_at);
CREATE INDEX IF NOT EXISTS idx_time_slots_status ON public.time_slots(status);

-- =====================================================
-- TABELA: bookings (reservas)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  client_id UUID NOT NULL,
  professional_id UUID NOT NULL, -- user_id do profissional
  slot_id UUID,
  client_name TEXT NOT NULL,
  teacher_name TEXT NOT NULL,
  booking_date TIMESTAMPTZ NOT NULL,
  price NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'Pendiente', -- 'Pendiente', 'Confirmada', 'Rechazada', 'Cancelada'
  message TEXT DEFAULT '',
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID,
  cancellation_reason TEXT,
  refund_amount NUMERIC DEFAULT 0,
  is_recurring BOOLEAN DEFAULT false,
  recurring_id UUID,
  package_id UUID,
  has_review BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bookings_client ON public.bookings(client_id);
CREATE INDEX IF NOT EXISTS idx_bookings_professional ON public.bookings(professional_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON public.bookings(booking_date);

-- =====================================================
-- TABELA: messages (chat)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sender_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  text TEXT NOT NULL DEFAULT '',
  is_read BOOLEAN DEFAULT FALSE,
  attachment_url TEXT,
  attachment_type TEXT, -- 'image', 'pdf', 'file'
  attachment_name TEXT,
  attachment_size INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON public.messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON public.messages(created_at);

-- =====================================================
-- TABELA: conversations (conversas)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  participant_ids UUID[] NOT NULL,
  last_message TEXT DEFAULT '',
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversations_participants ON public.conversations USING GIN(participant_ids);

-- =====================================================
-- TABELA: notifications (notificações)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  notification_type TEXT DEFAULT 'system', -- 'booking', 'system', 'chat'
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(is_read);

-- =====================================================
-- TABELA: reviews (avaliações)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL,
  professional_id UUID NOT NULL,
  booking_id UUID,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  reply TEXT,
  reply_at TIMESTAMPTZ,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id, booking_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_professional ON public.reviews(professional_id);
CREATE INDEX IF NOT EXISTS idx_reviews_client ON public.reviews(client_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON public.reviews(rating);

-- =====================================================
-- TABELA: favorites (favoritos)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL,
  professional_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id, professional_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_client ON public.favorites(client_id);
CREATE INDEX IF NOT EXISTS idx_favorites_professional ON public.favorites(professional_id);

-- =====================================================
-- TABELA: session_packages (pacotes de sessões)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.session_packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  professional_id UUID NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  total_sessions INTEGER NOT NULL CHECK (total_sessions > 0),
  price NUMERIC NOT NULL,
  discount_percent INTEGER DEFAULT 0 CHECK (discount_percent >= 0 AND discount_percent <= 50),
  valid_days INTEGER DEFAULT 90,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_packages_professional ON public.session_packages(professional_id);

-- =====================================================
-- TABELA: client_packages (pacotes comprados)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.client_packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL,
  package_id UUID,
  professional_id UUID NOT NULL,
  sessions_total INTEGER NOT NULL,
  sessions_used INTEGER DEFAULT 0,
  purchase_date TIMESTAMPTZ DEFAULT NOW(),
  expiry_date TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_packages_client ON public.client_packages(client_id);
CREATE INDEX IF NOT EXISTS idx_client_packages_status ON public.client_packages(status);

-- =====================================================
-- TABELA: recurring_bookings (agenda recorrente)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.recurring_bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL,
  professional_id UUID NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id, professional_id, day_of_week, start_time)
);

CREATE INDEX IF NOT EXISTS idx_recurring_client ON public.recurring_bookings(client_id);
CREATE INDEX IF NOT EXISTS idx_recurring_active ON public.recurring_bookings(is_active);

-- =====================================================
-- TABELA: training_logs (histórico de treinos)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.training_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL,
  professional_id UUID NOT NULL,
  booking_id UUID,
  session_date DATE NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  professional_notes TEXT,
  client_notes TEXT,
  completed BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_training_client ON public.training_logs(client_id);
CREATE INDEX IF NOT EXISTS idx_training_date ON public.training_logs(session_date);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) - POLÍTICAS PERMISSIVAS
-- Para desenvolvimento/testes. Em produção, restringir mais.
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
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_logs ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS PERMISSIVAS (para funcionar sem restrições complexas)
-- Em produção, você pode restringir mais baseado em auth.uid()

-- PROFILES
CREATE POLICY "Profiles select" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Profiles insert" ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Profiles update" ON public.profiles FOR UPDATE USING (true);
CREATE POLICY "Profiles delete" ON public.profiles FOR DELETE USING (true);

-- PROFESSIONALS
CREATE POLICY "Professionals select" ON public.professionals FOR SELECT USING (true);
CREATE POLICY "Professionals insert" ON public.professionals FOR INSERT WITH CHECK (true);
CREATE POLICY "Professionals update" ON public.professionals FOR UPDATE USING (true);
CREATE POLICY "Professionals delete" ON public.professionals FOR DELETE USING (true);

-- CATEGORIES
CREATE POLICY "Categories select" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Categories insert" ON public.categories FOR INSERT WITH CHECK (true);
CREATE POLICY "Categories update" ON public.categories FOR UPDATE USING (true);
CREATE POLICY "Categories delete" ON public.categories FOR DELETE USING (true);

-- PLANS
CREATE POLICY "Plans select" ON public.plans FOR SELECT USING (true);
CREATE POLICY "Plans insert" ON public.plans FOR INSERT WITH CHECK (true);
CREATE POLICY "Plans update" ON public.plans FOR UPDATE USING (true);
CREATE POLICY "Plans delete" ON public.plans FOR DELETE USING (true);

-- TIME_SLOTS
CREATE POLICY "Time_slots select" ON public.time_slots FOR SELECT USING (true);
CREATE POLICY "Time_slots insert" ON public.time_slots FOR INSERT WITH CHECK (true);
CREATE POLICY "Time_slots update" ON public.time_slots FOR UPDATE USING (true);
CREATE POLICY "Time_slots delete" ON public.time_slots FOR DELETE USING (true);

-- BOOKINGS
CREATE POLICY "Bookings select" ON public.bookings FOR SELECT USING (true);
CREATE POLICY "Bookings insert" ON public.bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "Bookings update" ON public.bookings FOR UPDATE USING (true);
CREATE POLICY "Bookings delete" ON public.bookings FOR DELETE USING (true);

-- MESSAGES
CREATE POLICY "Messages select" ON public.messages FOR SELECT USING (true);
CREATE POLICY "Messages insert" ON public.messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Messages update" ON public.messages FOR UPDATE USING (true);
CREATE POLICY "Messages delete" ON public.messages FOR DELETE USING (true);

-- CONVERSATIONS
CREATE POLICY "Conversations select" ON public.conversations FOR SELECT USING (true);
CREATE POLICY "Conversations insert" ON public.conversations FOR INSERT WITH CHECK (true);
CREATE POLICY "Conversations update" ON public.conversations FOR UPDATE USING (true);
CREATE POLICY "Conversations delete" ON public.conversations FOR DELETE USING (true);

-- NOTIFICATIONS
CREATE POLICY "Notifications select" ON public.notifications FOR SELECT USING (true);
CREATE POLICY "Notifications insert" ON public.notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Notifications update" ON public.notifications FOR UPDATE USING (true);
CREATE POLICY "Notifications delete" ON public.notifications FOR DELETE USING (true);

-- REVIEWS
CREATE POLICY "Reviews select" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Reviews insert" ON public.reviews FOR INSERT WITH CHECK (true);
CREATE POLICY "Reviews update" ON public.reviews FOR UPDATE USING (true);
CREATE POLICY "Reviews delete" ON public.reviews FOR DELETE USING (true);

-- FAVORITES
CREATE POLICY "Favorites select" ON public.favorites FOR SELECT USING (true);
CREATE POLICY "Favorites insert" ON public.favorites FOR INSERT WITH CHECK (true);
CREATE POLICY "Favorites update" ON public.favorites FOR UPDATE USING (true);
CREATE POLICY "Favorites delete" ON public.favorites FOR DELETE USING (true);

-- SESSION_PACKAGES
CREATE POLICY "Session_packages select" ON public.session_packages FOR SELECT USING (true);
CREATE POLICY "Session_packages insert" ON public.session_packages FOR INSERT WITH CHECK (true);
CREATE POLICY "Session_packages update" ON public.session_packages FOR UPDATE USING (true);
CREATE POLICY "Session_packages delete" ON public.session_packages FOR DELETE USING (true);

-- CLIENT_PACKAGES
CREATE POLICY "Client_packages select" ON public.client_packages FOR SELECT USING (true);
CREATE POLICY "Client_packages insert" ON public.client_packages FOR INSERT WITH CHECK (true);
CREATE POLICY "Client_packages update" ON public.client_packages FOR UPDATE USING (true);
CREATE POLICY "Client_packages delete" ON public.client_packages FOR DELETE USING (true);

-- RECURRING_BOOKINGS
CREATE POLICY "Recurring_bookings select" ON public.recurring_bookings FOR SELECT USING (true);
CREATE POLICY "Recurring_bookings insert" ON public.recurring_bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "Recurring_bookings update" ON public.recurring_bookings FOR UPDATE USING (true);
CREATE POLICY "Recurring_bookings delete" ON public.recurring_bookings FOR DELETE USING (true);

-- TRAINING_LOGS
CREATE POLICY "Training_logs select" ON public.training_logs FOR SELECT USING (true);
CREATE POLICY "Training_logs insert" ON public.training_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Training_logs update" ON public.training_logs FOR UPDATE USING (true);
CREATE POLICY "Training_logs delete" ON public.training_logs FOR DELETE USING (true);

-- =====================================================
-- FUNÇÕES E TRIGGERS
-- =====================================================

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_professionals_updated_at ON public.professionals;
CREATE TRIGGER update_professionals_updated_at BEFORE UPDATE ON public.professionals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_bookings_updated_at ON public.bookings;
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Função para calcular média de avaliações
CREATE OR REPLACE FUNCTION update_professional_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.professionals
  SET 
    rating = (
      SELECT COALESCE(ROUND(AVG(rating)::numeric, 1), 5)
      FROM public.reviews
      WHERE professional_id = COALESCE(NEW.professional_id, OLD.professional_id) AND is_public = true
    ),
    reviews = (
      SELECT COUNT(*)
      FROM public.reviews
      WHERE professional_id = COALESCE(NEW.professional_id, OLD.professional_id) AND is_public = true
    )
  WHERE user_id = COALESCE(NEW.professional_id, OLD.professional_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar rating
DROP TRIGGER IF EXISTS trigger_update_rating ON public.reviews;
CREATE TRIGGER trigger_update_rating
AFTER INSERT OR UPDATE OR DELETE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION update_professional_rating();

-- =====================================================
-- DADOS INICIAIS (SEED) - CATEGORIAS
-- =====================================================
INSERT INTO public.categories (name, slug, description, icon_class, color_hex, display_order, is_active) VALUES
('Pádel', 'padel', 'Entrenadores de pádel profesionales', '🎾', '#3B82F6', 1, TRUE),
('Tenis', 'tenis', 'Clases de tenis para todos los niveles', '🎾', '#10B981', 2, TRUE),
('Pilates', 'pilates', 'Instructores certificados de Pilates', '🧘', '#8B5CF6', 3, TRUE),
('Yoga', 'yoga', 'Profesores de yoga y meditación', '🧘', '#F59E0B', 4, TRUE),
('Personal Trainer', 'personal-trainer', 'Entrenamiento personalizado', '💪', '#EF4444', 5, TRUE),
('Crossfit', 'crossfit', 'Entrenamiento funcional de alta intensidad', '🏋️', '#6366F1', 6, TRUE),
('Nutrición', 'nutricion', 'Nutricionistas y dietistas certificados', '🥗', '#22C55E', 7, TRUE),
('Fisioterapia', 'fisioterapia', 'Fisioterapeutas especializados', '💆', '#06B6D4', 8, TRUE),
('Coach de Vida', 'life-coach', 'Coaching personal y profesional', '🌟', '#A855F7', 9, TRUE),
('Natación', 'natacion', 'Instructores de natación certificados', '🏊', '#0EA5E9', 10, TRUE)
ON CONFLICT (slug) DO NOTHING;

-- =====================================================
-- DADOS INICIAIS (SEED) - PLANOS
-- =====================================================
DELETE FROM public.plans;

INSERT INTO public.plans (
  id, name, duration_months, description, price, promo_price, 
  max_photos, max_reservations_per_month, display_order, features, 
  is_active, is_featured, includes_analytics, priority_support, 
  highlighted_profile, custom_branding, chat_enabled, color
) VALUES
(
  uuid_generate_v4(), 'Prueba', 1, 'Conoce la plataforma sin compromiso', 
  0, NULL, 1, 1, 1, 
  ARRAY['1 reserva de prueba', 'Perfil básico en el catálogo', 'Chat con clientes', 'Panel de gestión básico'], 
  true, false, false, false, false, false, true, 
  'from-slate-500 to-slate-600'
),
(
  uuid_generate_v4(), 'Starter', 1, 'Ideal para comenzar tu negocio', 
  12000, NULL, 3, 15, 2, 
  ARRAY['Todo lo del plan Prueba', '15 reservas por mes', '3 fotos en tu perfil', 'Horarios personalizados', 'Notificaciones push', 'Soporte por email'], 
  true, false, false, false, false, false, true, 
  'from-emerald-500 to-teal-600'
),
(
  uuid_generate_v4(), 'Profesional', 1, 'Para profesionales establecidos', 
  25000, 22000, 8, 50, 3, 
  ARRAY['Todo lo del plan Starter', '50 reservas por mes', '8 fotos en tu perfil', 'Estadísticas de rendimiento', 'Perfil destacado en búsquedas', 'Soporte prioritario', 'Insignia verificado'], 
  true, true, true, true, true, false, true, 
  'from-blue-500 to-indigo-600'
),
(
  uuid_generate_v4(), 'Elite', 1, 'Sin límites, máximo potencial', 
  45000, 39000, 20, -1, 4, 
  ARRAY['Todo lo del plan Profesional', 'Reservas ILIMITADAS', '20 fotos + videos', 'Analytics avanzados', 'Perfil premium destacado', 'Soporte 24/7 WhatsApp', 'Promociones personalizadas', 'Primero en resultados'], 
  true, false, true, true, true, true, true, 
  'from-amber-500 to-orange-600'
);

-- =====================================================
-- STORAGE BUCKETS (Executar no Dashboard do Supabase)
-- Ou use a API do Supabase para criar os buckets
-- =====================================================
-- Os buckets precisam ser criados manualmente no Dashboard:
-- 1. avatars - Para fotos de perfil
-- 2. chat - Para anexos do chat (imagens, PDFs)
-- 3. portfolio - Para fotos do portfolio dos profissionais

-- Políticas de storage (executar após criar os buckets):
/*
-- BUCKET: avatars
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Users can update their own avatar" ON storage.objects
FOR UPDATE USING (bucket_id = 'avatars');

CREATE POLICY "Users can delete their own avatar" ON storage.objects
FOR DELETE USING (bucket_id = 'avatars');

-- BUCKET: chat
CREATE POLICY "Chat attachments are accessible to participants" ON storage.objects
FOR SELECT USING (bucket_id = 'chat');

CREATE POLICY "Users can upload chat attachments" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'chat');

-- BUCKET: portfolio
CREATE POLICY "Portfolio images are publicly accessible" ON storage.objects
FOR SELECT USING (bucket_id = 'portfolio');

CREATE POLICY "Professionals can upload portfolio images" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'portfolio');

CREATE POLICY "Professionals can update portfolio images" ON storage.objects
FOR UPDATE USING (bucket_id = 'portfolio');

CREATE POLICY "Professionals can delete portfolio images" ON storage.objects
FOR DELETE USING (bucket_id = 'portfolio');
*/

-- =====================================================
-- REAL-TIME (habilitar para tabelas que precisam)
-- =====================================================
-- Execute isso no Dashboard: Database > Replication
-- Ou descomente as linhas abaixo:

-- ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;

-- =====================================================
-- VERIFICAÇÃO FINAL
-- =====================================================
SELECT 'Tabelas criadas:' AS info;
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

SELECT 'Planos inseridos:' AS info;
SELECT name, price, max_reservations_per_month FROM public.plans ORDER BY display_order;

SELECT 'Categorias inseridas:' AS info;
SELECT name, slug FROM public.categories ORDER BY display_order;

-- =====================================================
-- FIM DO SCHEMA COMPLETO
-- =====================================================
-- FitnessMatch © 2026 - Desenvolvido por JBNEXO
-- https://jbnexo.com | @brunxsousa
-- Made in Costa Rica 🇨🇷
-- =====================================================
