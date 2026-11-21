-- KM informada pelo gestor ao solicitar o orçamento
ALTER TABLE "solicitacoes_orcamento" ADD COLUMN IF NOT EXISTS "km" INTEGER;
