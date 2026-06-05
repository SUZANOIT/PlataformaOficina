-- Migration: V1__criar_empresa.sql
-- Objetivo: Adicionar campos de controle SaaS na tabela Company existente.

ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "plano_id" UUID;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "status_assinatura" VARCHAR(50) DEFAULT 'Trial';
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "data_contratacao" TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "data_vencimento" TIMESTAMP WITH TIME ZONE;
