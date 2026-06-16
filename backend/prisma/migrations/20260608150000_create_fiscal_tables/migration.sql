-- CreateTable
CREATE TABLE "FiscalDocument" (
    "id" TEXT NOT NULL,
    "numeroDocumento" TEXT NOT NULL,
    "chaveAcesso" TEXT,
    "tipo" TEXT NOT NULL,
    "nomeArquivo" TEXT NOT NULL,
    "dataEmissao" TIMESTAMP(3),
    "valorTotal" DOUBLE PRECISION,
    "emitenteNome" TEXT,
    "emitenteCnpj" TEXT,
    "destinatarioNome" TEXT,
    "destinatarioCnpj" TEXT,
    "status" TEXT NOT NULL DEFAULT 'IMPORTADO',
    "xmlContent" TEXT,
    "fileUrl" TEXT,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FiscalDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FiscalAudit" (
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

-- CreateIndex
CREATE INDEX "FiscalDocument_companyId_idx" ON "FiscalDocument"("companyId");

-- AddForeignKey
ALTER TABLE "FiscalDocument" ADD CONSTRAINT "FiscalDocument_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
