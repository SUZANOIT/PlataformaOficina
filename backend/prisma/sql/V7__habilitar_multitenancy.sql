-- Migration: V7__habilitar_multitenancy.sql
-- Objetivo: Criar índices de desempenho para o campo companyId nas tabelas do sistema.

CREATE INDEX IF NOT EXISTS "idx_user_company" ON "User"("companyId");
CREATE INDEX IF NOT EXISTS "idx_client_company" ON "Client"("companyId");
CREATE INDEX IF NOT EXISTS "idx_quote_company" ON "Quote"("companyId");
CREATE INDEX IF NOT EXISTS "idx_payable_company" ON "FinancialPayable"("companyId");
CREATE INDEX IF NOT EXISTS "idx_receivable_company" ON "FinancialReceivable"("companyId");
CREATE INDEX IF NOT EXISTS "idx_supplier_company" ON "Supplier"("companyId");
CREATE INDEX IF NOT EXISTS "idx_vehicle_company" ON "Vehicle"("companyId");
CREATE INDEX IF NOT EXISTS "idx_collaborator_company" ON "Collaborator"("companyId");
CREATE INDEX IF NOT EXISTS "idx_platform_company" ON "PlataformaGestao"("companyId");
CREATE INDEX IF NOT EXISTS "idx_oficina_company" ON "Oficina"("companyId");
