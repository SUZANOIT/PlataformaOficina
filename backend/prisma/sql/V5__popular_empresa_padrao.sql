-- Migration: V5__popular_empresa_padrao.sql
-- Objetivo: Criar a empresa padrão e associar todos os dados existentes a ela.

-- 1. Criar empresa padrão se não existir
INSERT INTO "Company" (
  "id", 
  "razaoSocial", 
  "nomeFantasia", 
  "cnpj", 
  "cnpjSemMascara", 
  "plano_id", 
  "status_assinatura", 
  "data_contratacao", 
  "data_vencimento"
)
VALUES (
  'mca-padrao-company-uuid-000000000001', 
  'MCA CARD', 
  'MCA Gestão de Oficina', 
  '00.000.000/0001-00', 
  '00000000000100', 
  'd4e5f67a-8b9c-0d1e-2f3a-4b5c6d7e8f9a', -- Enterprise (Enterprise is unlimited)
  'Ativa', 
  NOW(), 
  NOW() + INTERVAL '10 years'
) ON CONFLICT ("cnpj") DO NOTHING;

-- 2. Atualizar todos os registros das tabelas existentes para vinculá-los à empresa padrão
UPDATE "User" SET "companyId" = 'mca-padrao-company-uuid-000000000001' WHERE "companyId" IS NULL;
UPDATE "Client" SET "companyId" = 'mca-padrao-company-uuid-000000000001' WHERE "companyId" IS NULL;
UPDATE "Supplier" SET "companyId" = 'mca-padrao-company-uuid-000000000001' WHERE "companyId" IS NULL;
UPDATE "Vehicle" SET "companyId" = 'mca-padrao-company-uuid-000000000001' WHERE "companyId" IS NULL;
UPDATE "Collaborator" SET "companyId" = 'mca-padrao-company-uuid-000000000001' WHERE "companyId" IS NULL;
UPDATE "TaxSetting" SET "companyId" = 'mca-padrao-company-uuid-000000000001' WHERE "companyId" IS NULL;
UPDATE "PlataformaGestao" SET "companyId" = 'mca-padrao-company-uuid-000000000001' WHERE "companyId" IS NULL;
UPDATE "Oficina" SET "companyId" = 'mca-padrao-company-uuid-000000000001' WHERE "companyId" IS NULL;

-- Atualizar tabelas com companyId obrigatório onde valores possam estar vazios ou nulos
UPDATE "Quote" SET "companyId" = 'mca-padrao-company-uuid-000000000001' WHERE "companyId" IS NULL OR "companyId" = '';
UPDATE "FinancialPayable" SET "companyId" = 'mca-padrao-company-uuid-000000000001' WHERE "companyId" IS NULL OR "companyId" = '';
UPDATE "FinancialReceivable" SET "companyId" = 'mca-padrao-company-uuid-000000000001' WHERE "companyId" IS NULL OR "companyId" = '';
UPDATE "FinancialCategory" SET "companyId" = 'mca-padrao-company-uuid-000000000001' WHERE "companyId" IS NULL OR "companyId" = '';
UPDATE "FiscalDocument" SET "companyId" = 'mca-padrao-company-uuid-000000000001' WHERE "companyId" IS NULL OR "companyId" = '';
