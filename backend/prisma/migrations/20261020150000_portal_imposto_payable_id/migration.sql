ALTER TABLE "portal_impostos" ADD COLUMN IF NOT EXISTS "payable_id" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "portal_impostos_payable_id_key" ON "portal_impostos"("payable_id");
