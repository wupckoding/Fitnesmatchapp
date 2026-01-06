-- =====================================================
-- FIX ALL PERMISSIONS - Execute no Supabase SQL Editor
-- Corrige TODAS as políticas RLS e constraints
-- =====================================================

-- =====================================================
-- 1. REMOVER CHECK CONSTRAINTS
-- =====================================================

ALTER TABLE public.professionals 
DROP CONSTRAINT IF EXISTS professionals_plan_type_check;

ALTER TABLE public.professionals 
DROP CONSTRAINT IF EXISTS professionals_status_check;

-- =====================================================
-- 2. FIX TABELA PLANS - Permitir CRUD completo
-- =====================================================

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas
DROP POLICY IF EXISTS "Anyone can read plans" ON public.plans;
DROP POLICY IF EXISTS "Anyone can insert plans" ON public.plans;
DROP POLICY IF EXISTS "Anyone can update plans" ON public.plans;
DROP POLICY IF EXISTS "Anyone can delete plans" ON public.plans;
DROP POLICY IF EXISTS "Plans are viewable by everyone" ON public.plans;
DROP POLICY IF EXISTS "Plans are editable by everyone" ON public.plans;

-- Criar novas políticas permissivas
CREATE POLICY "Plans select" ON public.plans FOR SELECT USING (true);
CREATE POLICY "Plans insert" ON public.plans FOR INSERT WITH CHECK (true);
CREATE POLICY "Plans update" ON public.plans FOR UPDATE USING (true);
CREATE POLICY "Plans delete" ON public.plans FOR DELETE USING (true);

-- =====================================================
-- 3. FIX TABELA PROFESSIONALS - Permitir CRUD completo
-- =====================================================

ALTER TABLE public.professionals ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas
DROP POLICY IF EXISTS "Anyone can read professionals" ON public.professionals;
DROP POLICY IF EXISTS "Users can insert own professional" ON public.professionals;
DROP POLICY IF EXISTS "Users can update professionals" ON public.professionals;
DROP POLICY IF EXISTS "Professionals read" ON public.professionals;
DROP POLICY IF EXISTS "Professionals insert" ON public.professionals;
DROP POLICY IF EXISTS "Professionals update" ON public.professionals;
DROP POLICY IF EXISTS "Professionals delete" ON public.professionals;

-- Criar novas políticas permissivas
CREATE POLICY "Professionals select" ON public.professionals FOR SELECT USING (true);
CREATE POLICY "Professionals insert" ON public.professionals FOR INSERT WITH CHECK (true);
CREATE POLICY "Professionals update" ON public.professionals FOR UPDATE USING (true);
CREATE POLICY "Professionals delete" ON public.professionals FOR DELETE USING (true);

-- =====================================================
-- 4. FIX TABELA PROFILES - Permitir CRUD completo
-- =====================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Usuários podem editar perfis" ON public.profiles;
DROP POLICY IF EXISTS "Profiles select" ON public.profiles;
DROP POLICY IF EXISTS "Profiles insert" ON public.profiles;
DROP POLICY IF EXISTS "Profiles update" ON public.profiles;
DROP POLICY IF EXISTS "Profiles delete" ON public.profiles;

-- Criar novas políticas permissivas
CREATE POLICY "Profiles select" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Profiles insert" ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Profiles update" ON public.profiles FOR UPDATE USING (true);
CREATE POLICY "Profiles delete" ON public.profiles FOR DELETE USING (true);

-- =====================================================
-- 5. FIX TABELA CATEGORIES - Permitir CRUD completo
-- =====================================================

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Categories select" ON public.categories;
DROP POLICY IF EXISTS "Categories insert" ON public.categories;
DROP POLICY IF EXISTS "Categories update" ON public.categories;
DROP POLICY IF EXISTS "Categories delete" ON public.categories;

CREATE POLICY "Categories select" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Categories insert" ON public.categories FOR INSERT WITH CHECK (true);
CREATE POLICY "Categories update" ON public.categories FOR UPDATE USING (true);
CREATE POLICY "Categories delete" ON public.categories FOR DELETE USING (true);

-- =====================================================
-- 6. FIX TABELA BOOKINGS - Permitir CRUD completo
-- =====================================================

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Bookings select" ON public.bookings;
DROP POLICY IF EXISTS "Bookings insert" ON public.bookings;
DROP POLICY IF EXISTS "Bookings update" ON public.bookings;
DROP POLICY IF EXISTS "Bookings delete" ON public.bookings;
DROP POLICY IF EXISTS "Users can view own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can insert own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can update own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can delete own bookings" ON public.bookings;

CREATE POLICY "Bookings select" ON public.bookings FOR SELECT USING (true);
CREATE POLICY "Bookings insert" ON public.bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "Bookings update" ON public.bookings FOR UPDATE USING (true);
CREATE POLICY "Bookings delete" ON public.bookings FOR DELETE USING (true);

-- =====================================================
-- 7. FIX TABELA TIME_SLOTS - Permitir CRUD completo
-- =====================================================

ALTER TABLE public.time_slots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Time_slots select" ON public.time_slots;
DROP POLICY IF EXISTS "Time_slots insert" ON public.time_slots;
DROP POLICY IF EXISTS "Time_slots update" ON public.time_slots;
DROP POLICY IF EXISTS "Time_slots delete" ON public.time_slots;

CREATE POLICY "Time_slots select" ON public.time_slots FOR SELECT USING (true);
CREATE POLICY "Time_slots insert" ON public.time_slots FOR INSERT WITH CHECK (true);
CREATE POLICY "Time_slots update" ON public.time_slots FOR UPDATE USING (true);
CREATE POLICY "Time_slots delete" ON public.time_slots FOR DELETE USING (true);

-- =====================================================
-- 8. FIX TABELA MESSAGES - Permitir CRUD completo
-- =====================================================

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Messages select" ON public.messages;
DROP POLICY IF EXISTS "Messages insert" ON public.messages;
DROP POLICY IF EXISTS "Messages update" ON public.messages;
DROP POLICY IF EXISTS "Messages delete" ON public.messages;

CREATE POLICY "Messages select" ON public.messages FOR SELECT USING (true);
CREATE POLICY "Messages insert" ON public.messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Messages update" ON public.messages FOR UPDATE USING (true);
CREATE POLICY "Messages delete" ON public.messages FOR DELETE USING (true);

-- =====================================================
-- 9. FIX TABELA NOTIFICATIONS - Permitir CRUD completo
-- =====================================================

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Notifications select" ON public.notifications;
DROP POLICY IF EXISTS "Notifications insert" ON public.notifications;
DROP POLICY IF EXISTS "Notifications update" ON public.notifications;
DROP POLICY IF EXISTS "Notifications delete" ON public.notifications;

CREATE POLICY "Notifications select" ON public.notifications FOR SELECT USING (true);
CREATE POLICY "Notifications insert" ON public.notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Notifications update" ON public.notifications FOR UPDATE USING (true);
CREATE POLICY "Notifications delete" ON public.notifications FOR DELETE USING (true);

-- =====================================================
-- 10. VERIFICAR RESULTADO
-- =====================================================

SELECT schemaname, tablename, policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, cmd;
