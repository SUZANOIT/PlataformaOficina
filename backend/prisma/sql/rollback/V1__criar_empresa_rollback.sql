-- Rollback: V1__criar_empresa_rollback.sql
-- Objetivo: Remover campos de controle SaaS adicionados à tabela Company.

ALTER TABLE "Company" DROP COLUMN IF EXISTS "plano_id";
ALTER TABLE "Company" DROP COLUMN IF EXISTS "status_assinatura";
ALTER TABLE "Company" DROP COLUMN IF EXISTS "data_contratacao";
ALTER TABLE "Company" DROP COLUMN IF EXISTS "data_vencimento";
