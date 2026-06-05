import { prisma } from './src/lib/prisma';

async function main() {
  const tables: any = await prisma.$queryRaw`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
    ORDER BY table_name;
  `;
  console.log('Tables in PostgreSQL:');
  console.log(tables.map((t: any) => t.table_name));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
