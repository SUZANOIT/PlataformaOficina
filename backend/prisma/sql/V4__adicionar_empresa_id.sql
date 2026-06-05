-- Migration: V4__adicionar_empresa_id.sql
-- Objetivo: Adicionar coluna companyId na tabela Oficina e estabelecer relação de chave estrangeira.

ALTER TABLE "Oficina" ADD COLUMN IF NOT EXISTS "companyId" TEXT;
ALTER TABLE "Oficina" ADD CONSTRAINT "fk_oficina_company" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL;
