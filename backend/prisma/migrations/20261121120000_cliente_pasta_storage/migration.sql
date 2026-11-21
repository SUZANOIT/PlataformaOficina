-- Pasta de cada cliente no armazenamento de arquivos (notas fiscais e comprovantes)
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "pastaStorage" TEXT;
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "pastaStorageCriadaEm" TIMESTAMP(3);
