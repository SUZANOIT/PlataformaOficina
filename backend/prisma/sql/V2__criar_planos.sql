-- Migration: V2__criar_planos.sql
-- Objetivo: Criar a tabela Plan e inserir os planos padrão da plataforma.

CREATE TABLE IF NOT EXISTS "Plan" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "nome" VARCHAR(255) NOT NULL UNIQUE,
  "descricao" TEXT,
  "limite_usuarios" INTEGER NOT NULL DEFAULT 2,
  "limite_os_mes" INTEGER NOT NULL DEFAULT 200,
  "preco" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir os planos padrão
INSERT INTO "Plan" ("id", "nome", "descricao", "limite_usuarios", "limite_os_mes", "preco")
VALUES 
  ('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Start', 'Plano inicial para pequenas oficinas', 2, 200, 99.00),
  ('b2c3d4e5-f67a-8b9c-0d1e-2f3a4b5c6d7e', 'Professional', 'Plano profissional para oficinas em crescimento', 10, 2000, 249.00),
  ('c3d4e5f6-7a8b-9c0d-1e2f-3a4b5c6d7e8f', 'Business', 'Plano business para oficinas consolidadas', 30, 999999, 499.00),
  ('d4e5f67a-8b9c-0d1e-2f3a-4b5c6d7e8f9a', 'Enterprise', 'Plano completo e ilimitado para grandes frotas e oficinas', 999999, 999999, 999.00)
ON CONFLICT ("nome") DO NOTHING;

-- Adicionar chave estrangeira na tabela Company
ALTER TABLE "Company" ADD CONSTRAINT "fk_company_plan" FOREIGN KEY ("plano_id") REFERENCES "Plan"("id") ON DELETE SET NULL;
