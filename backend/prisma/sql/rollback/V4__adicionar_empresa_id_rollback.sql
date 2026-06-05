-- Rollback: V4__adicionar_empresa_id_rollback.sql
-- Objetivo: Remover restrição e coluna companyId da tabela Oficina.

ALTER TABLE "Oficina" DROP CONSTRAINT IF EXISTS "fk_oficina_company";
ALTER TABLE "Oficina" DROP COLUMN IF EXISTS "companyId";
