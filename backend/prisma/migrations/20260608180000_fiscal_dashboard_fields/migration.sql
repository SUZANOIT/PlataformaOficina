-- Campos estendidos para dashboard fiscal
ALTER TABLE "FiscalDocument" ADD COLUMN IF NOT EXISTS "tipoDocumento" TEXT;
ALTER TABLE "FiscalDocument" ADD COLUMN IF NOT EXISTS "serie" TEXT;
ALTER TABLE "FiscalDocument" ADD COLUMN IF NOT EXISTS "numeroNota" TEXT;
ALTER TABLE "FiscalDocument" ADD COLUMN IF NOT EXISTS "valorBruto" DOUBLE PRECISION;
ALTER TABLE "FiscalDocument" ADD COLUMN IF NOT EXISTS "valorLiquido" DOUBLE PRECISION;
ALTER TABLE "FiscalDocument" ADD COLUMN IF NOT EXISTS "valorImpostos" DOUBLE PRECISION;
ALTER TABLE "FiscalDocument" ADD COLUMN IF NOT EXISTS "icms" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "FiscalDocument" ADD COLUMN IF NOT EXISTS "ipi" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "FiscalDocument" ADD COLUMN IF NOT EXISTS "pis" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "FiscalDocument" ADD COLUMN IF NOT EXISTS "cofins" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "FiscalDocument" ADD COLUMN IF NOT EXISTS "iss" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "FiscalDocument" ADD COLUMN IF NOT EXISTS "irpj" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "FiscalDocument" ADD COLUMN IF NOT EXISTS "csll" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "FiscalDocument" ADD COLUMN IF NOT EXISTS "clienteNome" TEXT;
ALTER TABLE "FiscalDocument" ADD COLUMN IF NOT EXISTS "fornecedorNome" TEXT;
ALTER TABLE "FiscalDocument" ADD COLUMN IF NOT EXISTS "origemNota" TEXT DEFAULT 'UPLOAD_MANUAL';
ALTER TABLE "FiscalDocument" ADD COLUMN IF NOT EXISTS "usuarioResponsavelId" TEXT;
ALTER TABLE "FiscalDocument" ADD COLUMN IF NOT EXISTS "usuarioResponsavelNome" TEXT;

ALTER TABLE "FiscalAudit" ADD COLUMN IF NOT EXISTS "companyId" TEXT;

CREATE INDEX IF NOT EXISTS "FiscalDocument_companyId_tipoDocumento_idx" ON "FiscalDocument"("companyId", "tipoDocumento");
CREATE INDEX IF NOT EXISTS "FiscalDocument_companyId_status_idx" ON "FiscalDocument"("companyId", "status");
CREATE INDEX IF NOT EXISTS "FiscalDocument_companyId_dataEmissao_idx" ON "FiscalDocument"("companyId", "dataEmissao");
CREATE INDEX IF NOT EXISTS "FiscalDocument_companyId_numeroNota_idx" ON "FiscalDocument"("companyId", "numeroNota");
CREATE INDEX IF NOT EXISTS "FiscalDocument_companyId_chaveAcesso_idx" ON "FiscalDocument"("companyId", "chaveAcesso");
CREATE INDEX IF NOT EXISTS "FiscalAudit_companyId_idx" ON "FiscalAudit"("companyId");
