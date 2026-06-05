-- Migration: V6__criar_assinaturas.sql
-- Objetivo: Criar tabelas de assinaturas, licenciamento de módulos, pagamentos e históricos.

CREATE TABLE IF NOT EXISTS "Subscription" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" TEXT NOT NULL UNIQUE,
  "planId" UUID NOT NULL,
  "status" VARCHAR(50) NOT NULL DEFAULT 'Trial',
  "dataContratacao" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "dataVencimento" TIMESTAMP WITH TIME ZONE NOT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT "fk_sub_company" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE,
  CONSTRAINT "fk_sub_plan" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "ModuleLicense" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" TEXT NOT NULL,
  "moduleId" UUID NOT NULL,
  "ativa" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT "fk_license_company" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE,
  CONSTRAINT "fk_license_module" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE,
  CONSTRAINT "uq_company_module" UNIQUE ("companyId", "moduleId")
);

CREATE TABLE IF NOT EXISTS "Payment" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "subscriptionId" UUID NOT NULL,
  "valor" DOUBLE PRECISION NOT NULL,
  "status" VARCHAR(50) NOT NULL DEFAULT 'PENDENTE',
  "dataPagamento" TIMESTAMP WITH TIME ZONE,
  "dataVencimento" TIMESTAMP WITH TIME ZONE NOT NULL,
  "referenciaMes" VARCHAR(20) NOT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT "fk_payment_sub" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "SubscriptionHistory" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "subscriptionId" UUID NOT NULL,
  "planoAnterior" VARCHAR(255),
  "planoNovo" VARCHAR(255) NOT NULL,
  "statusAnterior" VARCHAR(50),
  "statusNovo" VARCHAR(50) NOT NULL,
  "motivo" TEXT,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT "fk_history_sub" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE CASCADE
);

-- Criar assinatura padrão ativa para a empresa padrão
INSERT INTO "Subscription" ("id", "companyId", "planId", "status", "dataContratacao", "dataVencimento")
VALUES (
  'sub-mca-padrao-uuid-000000000001',
  'mca-padrao-company-uuid-000000000001',
  'd4e5f67a-8b9c-0d1e-2f3a-4b5c6d7e8f9a', -- Enterprise Plan
  'Ativa',
  NOW(),
  NOW() + INTERVAL '10 years'
) ON CONFLICT ("companyId") DO NOTHING;
