-- Revogação de sessões: tokens emitidos antes do incremento deixam de valer
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "tokenVersion" INTEGER NOT NULL DEFAULT 0;
