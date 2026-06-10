-- Migration: V3__criar_modulos.sql
-- Objetivo: Criar a tabela Module e inserir os módulos do sistema.

CREATE TABLE IF NOT EXISTS "Module" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "nome" VARCHAR(255) NOT NULL,
  "chave" VARCHAR(255) NOT NULL UNIQUE,
  "descricao" TEXT,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir todos os módulos do sistema
INSERT INTO "Module" ("id", "nome", "chave", "descricao") VALUES
  (gen_random_uuid(), 'Clientes', 'clientes', 'Cadastro e gestão de clientes'),
  (gen_random_uuid(), 'Veículos', 'veiculos', 'Cadastro e histórico de veículos'),
  (gen_random_uuid(), 'Plataformas de Gestão', 'plataformas', 'Integração com plataformas parceiras'),
  (gen_random_uuid(), 'Ordem de Serviço', 'ordens_servico', 'Emissão e controle de OS'),
  (gen_random_uuid(), 'Orçamentos', 'orcamentos', 'Geração de orçamentos comerciais'),
  (gen_random_uuid(), 'Dashboard Básico', 'dashboard_basico', 'Métricas básicas operacionais'),
  (gen_random_uuid(), 'Contas a Receber', 'contas_receber', 'Controle financeiro de receitas'),
  (gen_random_uuid(), 'Contas a Pagar', 'contas_pagar', 'Controle financeiro de despesas'),
  (gen_random_uuid(), 'Fluxo de Caixa', 'fluxo_caixa', 'Gráficos e relatórios financeiros de caixa'),
  (gen_random_uuid(), 'Estoque', 'estoque', 'Controle de estoque de peças e insumos'),
  (gen_random_uuid(), 'Fornecedores', 'fornecedores', 'Cadastro e gestão de fornecedores'),
  (gen_random_uuid(), 'Leitura de XML', 'xml', 'Importação automática de notas fiscais via XML'),
  (gen_random_uuid(), 'Central de Documentos', 'documentos', 'Armazenamento de notas e ordens em PDF/XML'),
  (gen_random_uuid(), 'Emissão Fiscal', 'emissao_fiscal', 'Emissão de NFS-e / NF-e integrada'),
  (gen_random_uuid(), 'Rede Credenciada de Oficinas', 'rede_credenciada', 'Gestão de oficinas parceiras credenciadas'),
  (gen_random_uuid(), 'Recursos Humanos', 'rh', 'Cadastro de colaboradores, salários e cargos'),
  (gen_random_uuid(), 'Adiantamentos de Salário', 'adiantamentos', 'Solicitação e recibo de adiantamentos de folha'),
  (gen_random_uuid(), 'Aprovação por Níveis', 'aprovacao_niveis', 'Alçada de aprovação de pagamentos por perfil'),
  (gen_random_uuid(), 'Trilha de Auditoria', 'auditoria', 'Histórico completo de alterações críticas'),
  (gen_random_uuid(), 'Multiempresa', 'multiempresa', 'Suporte a filiais e grupo de empresas'),
  (gen_random_uuid(), 'Business Intelligence', 'bi', 'Relatórios avançados e gráficos analíticos de BI'),
  (gen_random_uuid(), 'Integrações', 'integracoes', 'Integrações de ERP de terceiros'),
  (gen_random_uuid(), 'Notificações via WhatsApp', 'whatsapp', 'Disparo de PDFs e notificações de aprovação no WhatsApp'),
  (gen_random_uuid(), 'Consulta de CNPJ ReceitaWS', 'receitaws', 'Preenchimento automático de cadastros via ReceitaWS')
ON CONFLICT ("chave") DO NOTHING;

-- Remove módulos descontinuados (API Externa, Aplicativo Mobile, Integração FIPE)
DELETE FROM "Module" WHERE "chave" IN ('api', 'mobile', 'fipe');
