CREATE TABLE IF NOT EXISTS "FiscalDocument" (
    "id" TEXT NOT NULL,
    "numeroDocumento" TEXT NOT NULL,
    "chaveAcesso" TEXT,
    "tipo" TEXT NOT NULL,
    "nomeArquivo" TEXT NOT NULL,
    "dataEmissao" TIMESTAMP(3),
    "valorTotal" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'IMPORTADO',
    "xmlContent" TEXT,
    "fileUrl" TEXT,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FiscalDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "FiscalAudit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "userProfile" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FiscalAudit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "FiscalDocument_companyId_idx" ON "FiscalDocument"("companyId");

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FiscalDocument_companyId_fkey') THEN
        ALTER TABLE "FiscalDocument" ADD CONSTRAINT "FiscalDocument_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
