-- Rollback: V7__habilitar_multitenancy_rollback.sql
-- Objetivo: Remover índices de desempenho de companyId do banco de dados.

DROP INDEX IF EXISTS "idx_user_company";
DROP INDEX IF EXISTS "idx_client_company";
DROP INDEX IF EXISTS "idx_quote_company";
DROP INDEX IF EXISTS "idx_payable_company";
DROP INDEX IF EXISTS "idx_receivable_company";
DROP INDEX IF EXISTS "idx_supplier_company";
DROP INDEX IF EXISTS "idx_vehicle_company";
DROP INDEX IF EXISTS "idx_collaborator_company";
DROP INDEX IF EXISTS "idx_platform_company";
DROP INDEX IF EXISTS "idx_oficina_company";
