-- Fluxo de Manutenção do Portal do Gestor de Frota:
-- solicitação de orçamento do cliente, histórico de movimentações e emissão de OS.
-- Somente criação de tabelas novas; nenhum dado existente é alterado.

CREATE TABLE IF NOT EXISTS "solicitacoes_orcamento" (
  "id" TEXT NOT NULL,
  "protocolo" SERIAL NOT NULL,
  "empresa_id" TEXT NOT NULL,
  "cliente_id" TEXT NOT NULL,
  "veiculo_id" TEXT NOT NULL,
  "solicitante_id" TEXT,
  "descricao" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'AGUARDANDO_ANALISE',
  "motivo_recusa" TEXT,
  "orcamento_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "solicitacoes_orcamento_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "solicitacoes_orcamento_protocolo_key" ON "solicitacoes_orcamento"("protocolo");
CREATE UNIQUE INDEX IF NOT EXISTS "solicitacoes_orcamento_orcamento_id_key" ON "solicitacoes_orcamento"("orcamento_id");
CREATE INDEX IF NOT EXISTS "solicitacoes_orcamento_empresa_id_idx" ON "solicitacoes_orcamento"("empresa_id");
CREATE INDEX IF NOT EXISTS "solicitacoes_orcamento_cliente_id_idx" ON "solicitacoes_orcamento"("cliente_id");
CREATE INDEX IF NOT EXISTS "solicitacoes_orcamento_veiculo_id_idx" ON "solicitacoes_orcamento"("veiculo_id");
CREATE INDEX IF NOT EXISTS "solicitacoes_orcamento_status_idx" ON "solicitacoes_orcamento"("status");

CREATE TABLE IF NOT EXISTS "solicitacoes_orcamento_historico" (
  "id" TEXT NOT NULL,
  "solicitacao_id" TEXT NOT NULL,
  "usuario_id" TEXT,
  "responsavel" TEXT NOT NULL,
  "perfil" TEXT NOT NULL,
  "status_anterior" TEXT,
  "status_novo" TEXT NOT NULL,
  "descricao" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "solicitacoes_orcamento_historico_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "solicitacoes_orcamento_historico_solicitacao_id_idx" ON "solicitacoes_orcamento_historico"("solicitacao_id");

CREATE TABLE IF NOT EXISTS "ordens_servico" (
  "id" TEXT NOT NULL,
  "numero" SERIAL NOT NULL,
  "orcamento_id" TEXT NOT NULL,
  "empresa_id" TEXT NOT NULL,
  "cliente_id" TEXT NOT NULL,
  "veiculo_id" TEXT NOT NULL,
  "km" INTEGER NOT NULL,
  "gerada_por_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ordens_servico_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ordens_servico_numero_key" ON "ordens_servico"("numero");
-- Uma única OS por orçamento (impede duplicidade no banco)
CREATE UNIQUE INDEX IF NOT EXISTS "ordens_servico_orcamento_id_key" ON "ordens_servico"("orcamento_id");
CREATE INDEX IF NOT EXISTS "ordens_servico_empresa_id_idx" ON "ordens_servico"("empresa_id");
CREATE INDEX IF NOT EXISTS "ordens_servico_cliente_id_idx" ON "ordens_servico"("cliente_id");
CREATE INDEX IF NOT EXISTS "ordens_servico_veiculo_id_idx" ON "ordens_servico"("veiculo_id");

DO $$ BEGIN ALTER TABLE "solicitacoes_orcamento" ADD CONSTRAINT "solicitacoes_orcamento_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "solicitacoes_orcamento" ADD CONSTRAINT "solicitacoes_orcamento_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "solicitacoes_orcamento" ADD CONSTRAINT "solicitacoes_orcamento_veiculo_id_fkey" FOREIGN KEY ("veiculo_id") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "solicitacoes_orcamento" ADD CONSTRAINT "solicitacoes_orcamento_solicitante_id_fkey" FOREIGN KEY ("solicitante_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "solicitacoes_orcamento" ADD CONSTRAINT "solicitacoes_orcamento_orcamento_id_fkey" FOREIGN KEY ("orcamento_id") REFERENCES "Quote"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "solicitacoes_orcamento_historico" ADD CONSTRAINT "solicitacoes_orcamento_historico_solicitacao_id_fkey" FOREIGN KEY ("solicitacao_id") REFERENCES "solicitacoes_orcamento"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "ordens_servico" ADD CONSTRAINT "ordens_servico_orcamento_id_fkey" FOREIGN KEY ("orcamento_id") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "ordens_servico" ADD CONSTRAINT "ordens_servico_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "ordens_servico" ADD CONSTRAINT "ordens_servico_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "ordens_servico" ADD CONSTRAINT "ordens_servico_veiculo_id_fkey" FOREIGN KEY ("veiculo_id") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "ordens_servico" ADD CONSTRAINT "ordens_servico_gerada_por_id_fkey" FOREIGN KEY ("gerada_por_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
