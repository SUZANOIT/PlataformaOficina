-- AlterTable
ALTER TABLE "PlataformaGestao" ADD COLUMN "contratoVersao" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "valorBaseGuincho" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "valorDeslocamento" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "valorHoraEspecializada" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "valorHoraParadaGuincho" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "valorHoraTecnica" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "valorKmGuincho" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "valorServicoMecanico" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "TowingQuote" ADD COLUMN "plataformaId" TEXT,
ADD COLUMN "tipoCliente" TEXT NOT NULL DEFAULT 'Particular',
ADD COLUMN "valorVeiculo" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "PlataformaContratoHistory" (
    "id" TEXT NOT NULL,
    "plataformaId" TEXT NOT NULL,
    "companyId" TEXT,
    "userId" TEXT,
    "userName" TEXT,
    "versao" INTEGER NOT NULL DEFAULT 1,
    "valorBaseGuinchoAnt" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "valorKmGuinchoAnt" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "valorHoraParadaGuinchoAnt" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "valorServicoMecanicoAnt" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "valorDeslocamentoAnt" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "valorHoraTecnicaAnt" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "valorHoraEspecializadaAnt" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "valorBaseGuinchoNovo" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "valorKmGuinchoNovo" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "valorHoraParadaGuinchoNovo" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "valorServicoMecanicoNovo" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "valorDeslocamentoNovo" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "valorHoraTecnicaNovo" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "valorHoraEspecializadaNovo" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlataformaContratoHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlataformaContratoHistory_plataformaId_idx" ON "PlataformaContratoHistory"("plataformaId");

-- CreateIndex
CREATE INDEX "PlataformaContratoHistory_companyId_idx" ON "PlataformaContratoHistory"("companyId");

-- AddForeignKey
ALTER TABLE "TowingQuote" ADD CONSTRAINT "TowingQuote_plataformaId_fkey" FOREIGN KEY ("plataformaId") REFERENCES "PlataformaGestao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlataformaContratoHistory" ADD CONSTRAINT "PlataformaContratoHistory_plataformaId_fkey" FOREIGN KEY ("plataformaId") REFERENCES "PlataformaGestao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlataformaContratoHistory" ADD CONSTRAINT "PlataformaContratoHistory_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlataformaContratoHistory" ADD CONSTRAINT "PlataformaContratoHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
