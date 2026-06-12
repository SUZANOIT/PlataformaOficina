const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const quotes = await prisma.quote.findMany({
    where: { numeroOrcamento: { in: [89, 90] } },
    select: { 
      id: true, 
      numeroOrcamento: true, 
      isCloned: true, 
      clonedFromId: true,
      companyId: true,
      oficinaId: true
    }
  });
  console.log(JSON.stringify(quotes, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
