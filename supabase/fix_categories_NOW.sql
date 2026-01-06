-- =====================================================
-- FIX URGENTE: CATEGORIES - Execute AGORA no Supabase
-- =====================================================

-- 1. DESABILITAR RLS temporariamente (para teste)
ALTER TABLE public.categories DISABLE ROW LEVEL SECURITY;

-- 2. Limpar TODAS as políticas existentes
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'categories' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.categories', pol.policyname);
    END LOOP;
END $$;

-- 3. Reabilitar RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- 4. Criar política TOTALMENTE permissiva
CREATE POLICY "allow_all_categories" ON public.categories
FOR ALL USING (true) WITH CHECK (true);

-- 5. Verificar
SELECT 'Políticas de categories:' as info;
SELECT policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE tablename = 'categories';

-- 6. Testar inserção (deve funcionar agora)
INSERT INTO public.categories (name, slug, description, icon_class, color_hex, display_order, is_active)
VALUES ('TEST_DELETE_ME', 'test-delete-me', 'Teste', '🧪', '#FF0000', 999, true);

-- 7. Limpar teste
DELETE FROM public.categories WHERE slug = 'test-delete-me';

SELECT 'SUCCESS! Categories está funcionando!' as resultado;
