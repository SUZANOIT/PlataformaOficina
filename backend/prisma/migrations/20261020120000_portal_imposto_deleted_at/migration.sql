ALTER TABLE "portal_impostos" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "portal_impostos_deleted_at_idx" ON "portal_impostos"("deleted_at");
