-- Rollback: V2__criar_planos_rollback.sql
-- Objetivo: Remover restrição de chave estrangeira e excluir a tabela Plan.

ALTER TABLE "Company" DROP CONSTRAINT IF EXISTS "fk_company_plan";
DROP TABLE IF EXISTS "Plan";
