import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Altering QuoteItem table...');
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "QuoteItem" 
    ADD COLUMN IF NOT EXISTS "codigo_peca" VARCHAR(100),
    ADD COLUMN IF NOT EXISTS "tipo_peca" VARCHAR(30);
  `);
  console.log('Table QuoteItem successfully altered!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
