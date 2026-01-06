-- =====================================================
-- FIX SCHEMA - Execute este SQL no Supabase SQL Editor
-- =====================================================

-- 1. CORRIGIR TABELA PROFESSIONALS
-- =====================================================

-- Adicionar coluna status se não existir
ALTER TABLE public.professionals 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'deactivated';

-- Adicionar colunas de plano
ALTER TABLE public.professionals 
ADD COLUMN IF NOT EXISTS plan_active BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS plan_type TEXT,
ADD COLUMN IF NOT EXISTS plan_expiry TIMESTAMPTZ;

-- Adicionar outras colunas necessárias
ALTER TABLE public.professionals 
ADD COLUMN IF NOT EXISTS name TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS location TEXT DEFAULT 'Costa Rica',
ADD COLUMN IF NOT EXISTS areas TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS modalities TEXT[] DEFAULT '{presencial}',
ADD COLUMN IF NOT EXISTS rating NUMERIC DEFAULT 5,
ADD COLUMN IF NOT EXISTS reviews INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS price NUMERIC DEFAULT 0;

-- Adicionar colunas de solicitação de plano (opcional, mas útil)
ALTER TABLE public.professionals 
ADD COLUMN IF NOT EXISTS requested_plan_id TEXT,
ADD COLUMN IF NOT EXISTS requested_plan_at TIMESTAMPTZ;

-- 2. CORRIGIR TABELA PROFILES
-- =====================================================

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
ADD COLUMN IF NOT EXISTS requested_plan_id TEXT,
ADD COLUMN IF NOT EXISTS requested_plan_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ DEFAULT NOW();

-- 3. CORRIGIR TABELA PLANS (adicionar novos campos)
-- =====================================================

ALTER TABLE public.plans 
ADD COLUMN IF NOT EXISTS max_reservations_per_month INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS highlighted_profile BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS custom_branding BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS chat_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS color TEXT DEFAULT 'from-slate-500 to-slate-600';

-- 4. INSERIR OS 4 NOVOS PLANOS
-- =====================================================

-- Deletar planos antigos
DELETE FROM public.plans;

-- Inserir novos planos
INSERT INTO public.plans (id, name, duration_months, description, price, promo_price, max_photos, max_reservations_per_month, display_order, features, is_active, is_featured, includes_analytics, priority_support, highlighted_profile, custom_branding, chat_enabled, color) VALUES
('plan-free', 'Prueba', 1, 'Conoce la plataforma sin compromiso', 0, NULL, 1, 1, 1, 
  ARRAY['1 reserva de prueba', 'Perfil básico en el catálogo', 'Chat con clientes', 'Panel de gestión básico'], 
  true, false, false, false, false, false, true, 'from-slate-500 to-slate-600'),

('plan-starter', 'Starter', 1, 'Ideal para comenzar tu negocio', 12000, NULL, 3, 15, 2, 
  ARRAY['Todo lo del plan Prueba', '15 reservas por mes', '3 fotos en tu perfil', 'Horarios personalizados', 'Notificaciones push', 'Soporte por email'], 
  true, false, false, false, false, false, true, 'from-emerald-500 to-teal-600'),

('plan-pro', 'Profesional', 1, 'Para profesionales establecidos', 25000, 22000, 8, 50, 3, 
  ARRAY['Todo lo del plan Starter', '50 reservas por mes', '8 fotos en tu perfil', 'Estadísticas de rendimiento', 'Perfil destacado en búsquedas', 'Soporte prioritario', 'Insignia verificado'], 
  true, true, true, true, true, false, true, 'from-blue-500 to-indigo-600'),

('plan-elite', 'Elite', 1, 'Sin límites, máximo potencial', 45000, 39000, 20, -1, 4, 
  ARRAY['Todo lo del plan Profesional', 'Reservas ILIMITADAS', '20 fotos + videos', 'Analytics avanzados', 'Perfil premium destacado', 'Soporte 24/7 WhatsApp', 'Promociones personalizadas', 'Primero en resultados'], 
  true, false, true, true, true, true, true, 'from-amber-500 to-orange-600');

-- 5. POLÍTICAS RLS PARA PROFESSIONALS
-- =====================================================

-- Habilitar RLS
ALTER TABLE public.professionals ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas
DROP POLICY IF EXISTS "Professionals read" ON public.professionals;
DROP POLICY IF EXISTS "Professionals insert" ON public.professionals;
DROP POLICY IF EXISTS "Professionals update" ON public.professionals;
DROP POLICY IF EXISTS "Anyone can read professionals" ON public.professionals;
DROP POLICY IF EXISTS "Users can update own professional" ON public.professionals;
DROP POLICY IF EXISTS "Users can insert own professional" ON public.professionals;

-- Criar políticas novas (mais permissivas para funcionar)
CREATE POLICY "Anyone can read professionals" ON public.professionals
FOR SELECT USING (true);

CREATE POLICY "Users can insert own professional" ON public.professionals
FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update professionals" ON public.professionals
FOR UPDATE USING (true);

-- 6. VERIFICAR ESTRUTURA
-- =====================================================
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'professionals' 
ORDER BY ordinal_position;
