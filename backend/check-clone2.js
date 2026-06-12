const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const ids = ['061d48c2-9feb-4c87-a99f-8ec798de2f11', '4769994b-3b54-44af-a3af-0398a0bb0eec'];
  const quotes = await prisma.quote.findMany({
    where: { id: { in: ids } },
    select: { 
      id: true, 
      numeroOrcamento: true, 
      companyId: true,
      oficinaId: true
    }
  });
  console.log(JSON.stringify(quotes, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
