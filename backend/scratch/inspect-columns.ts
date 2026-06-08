import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const columns = await prisma.$queryRaw`
    SELECT column_name, data_type, character_maximum_length 
    FROM information_schema.columns 
    WHERE table_name = 'QuoteItem'
  `;
  console.log('Columns of QuoteItem table:');
  console.log(JSON.stringify(columns, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
