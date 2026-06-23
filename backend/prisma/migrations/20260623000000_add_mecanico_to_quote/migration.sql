-- AlterTable
ALTER TABLE "Quote" ADD COLUMN "mecanicoId" TEXT;

-- CreateIndex
CREATE INDEX "Quote_mecanicoId_idx" ON "Quote"("mecanicoId");

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_mecanicoId_fkey" FOREIGN KEY ("mecanicoId") REFERENCES "Collaborator"("id") ON DELETE SET NULL ON UPDATE CASCADE;
