-- =====================================================
-- NOVAS FUNCIONALIDADES - FitnessMatch
-- Execute este SQL no Supabase SQL Editor
-- =====================================================

-- =====================================================
-- 1. TABELA DE AVALIAÇÕES (Reviews)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  professional_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  reply TEXT,
  reply_at TIMESTAMPTZ,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Evitar múltiplas avaliações para mesma reserva
  UNIQUE(client_id, booking_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_reviews_professional ON public.reviews(professional_id);
CREATE INDEX IF NOT EXISTS idx_reviews_client ON public.reviews(client_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON public.reviews(rating);

-- RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reviews são públicos para leitura" ON public.reviews
FOR SELECT USING (is_public = true);

CREATE POLICY "Clientes podem criar reviews" ON public.reviews
FOR INSERT WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Profissionais podem responder" ON public.reviews
FOR UPDATE USING (auth.uid() = professional_id);

-- =====================================================
-- 2. TABELA DE FAVORITOS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  professional_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(client_id, professional_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_client ON public.favorites(client_id);
CREATE INDEX IF NOT EXISTS idx_favorites_professional ON public.favorites(professional_id);

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários gerenciam próprios favoritos" ON public.favorites
FOR ALL USING (auth.uid() = client_id);

-- =====================================================
-- 3. PACOTES DE SESSÕES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.session_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  total_sessions INTEGER NOT NULL CHECK (total_sessions > 0),
  price DECIMAL(10,2) NOT NULL,
  discount_percent INTEGER DEFAULT 0 CHECK (discount_percent >= 0 AND discount_percent <= 50),
  valid_days INTEGER DEFAULT 90,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_packages_professional ON public.session_packages(professional_id);

-- Pacotes comprados pelos clientes
CREATE TABLE IF NOT EXISTS public.client_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  package_id UUID REFERENCES public.session_packages(id) ON DELETE SET NULL,
  professional_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  sessions_total INTEGER NOT NULL,
  sessions_used INTEGER DEFAULT 0,
  purchase_date TIMESTAMPTZ DEFAULT NOW(),
  expiry_date TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'completed')),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_packages_client ON public.client_packages(client_id);
CREATE INDEX IF NOT EXISTS idx_client_packages_status ON public.client_packages(status);

ALTER TABLE public.session_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pacotes públicos para leitura" ON public.session_packages
FOR SELECT USING (is_active = true);

CREATE POLICY "Profissionais gerenciam próprios pacotes" ON public.session_packages
FOR ALL USING (auth.uid() = professional_id);

CREATE POLICY "Clientes veem próprios pacotes" ON public.client_packages
FOR SELECT USING (auth.uid() = client_id OR auth.uid() = professional_id);

-- =====================================================
-- 4. AGENDA RECORRENTE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.recurring_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  professional_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
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

ALTER TABLE public.recurring_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários gerenciam próprias recorrências" ON public.recurring_bookings
FOR ALL USING (auth.uid() = client_id OR auth.uid() = professional_id);

-- =====================================================
-- 5. HISTÓRICO DE TREINOS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.training_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  professional_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  session_date DATE NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  professional_notes TEXT,
  client_notes TEXT,
  completed BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_training_client ON public.training_logs(client_id);
CREATE INDEX IF NOT EXISTS idx_training_date ON public.training_logs(session_date);

ALTER TABLE public.training_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participantes veem histórico" ON public.training_logs
FOR SELECT USING (auth.uid() = client_id OR auth.uid() = professional_id);

CREATE POLICY "Profissionais adicionam logs" ON public.training_logs
FOR INSERT WITH CHECK (auth.uid() = professional_id);

CREATE POLICY "Participantes atualizam logs" ON public.training_logs
FOR UPDATE USING (auth.uid() = client_id OR auth.uid() = professional_id);

-- =====================================================
-- 6. ATUALIZAR TABELA DE BOOKINGS (adicionar campos)
-- =====================================================
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
ADD COLUMN IF NOT EXISTS refund_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS recurring_id UUID REFERENCES public.recurring_bookings(id),
ADD COLUMN IF NOT EXISTS package_id UUID REFERENCES public.client_packages(id),
ADD COLUMN IF NOT EXISTS has_review BOOLEAN DEFAULT false;

-- =====================================================
-- 7. FUNÇÃO PARA CALCULAR MÉDIA DE AVALIAÇÕES
-- =====================================================
CREATE OR REPLACE FUNCTION update_professional_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.professionals
  SET 
    rating = (
      SELECT COALESCE(ROUND(AVG(rating)::numeric, 1), 5)
      FROM public.reviews
      WHERE professional_id = NEW.professional_id AND is_public = true
    ),
    reviews = (
      SELECT COUNT(*)
      FROM public.reviews
      WHERE professional_id = NEW.professional_id AND is_public = true
    )
  WHERE user_id = NEW.professional_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar rating quando nova review é criada
DROP TRIGGER IF EXISTS trigger_update_rating ON public.reviews;
CREATE TRIGGER trigger_update_rating
AFTER INSERT OR UPDATE OR DELETE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION update_professional_rating();

-- =====================================================
-- 8. ÍNDICES ADICIONAIS PARA BUSCA AVANÇADA
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_professionals_rating ON public.professionals(rating DESC);
CREATE INDEX IF NOT EXISTS idx_professionals_price ON public.professionals(price);
CREATE INDEX IF NOT EXISTS idx_professionals_areas ON public.professionals USING GIN(areas);
CREATE INDEX IF NOT EXISTS idx_time_slots_start ON public.time_slots(start_at);
CREATE INDEX IF NOT EXISTS idx_time_slots_available ON public.time_slots(capacity_total, capacity_booked);

-- =====================================================
-- PRONTO! Execute este SQL no Supabase Dashboard
-- =====================================================
