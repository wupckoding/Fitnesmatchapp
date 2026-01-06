-- =====================================================
-- FIX: Remover CHECK CONSTRAINT que bloqueia nomes de planos
-- Execute este SQL no Supabase SQL Editor
-- =====================================================

-- 1. Remover a constraint antiga que só aceita "Mensual", "Trimestral", "Anual"
ALTER TABLE public.professionals 
DROP CONSTRAINT IF EXISTS professionals_plan_type_check;

-- 2. Verificar se foi removida (deve retornar vazio)
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'public.professionals'::regclass 
AND contype = 'c';

-- 3. Atualizar todos os planos existentes para os novos nomes
UPDATE public.professionals 
SET plan_type = 'Starter' 
WHERE plan_type = 'Mensual';

UPDATE public.professionals 
SET plan_type = 'Profesional' 
WHERE plan_type = 'Trimestral';

UPDATE public.professionals 
SET plan_type = 'Elite' 
WHERE plan_type = 'Anual';

-- 4. Verificar os valores atuais
SELECT user_id, plan_type, plan_active, status 
FROM public.professionals;
