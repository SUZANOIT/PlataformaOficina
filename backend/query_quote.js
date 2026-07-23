const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const quote = await prisma.quote.findUnique({
    where: { id: "d0319ea9-d9a4-47f7-95c1-f5adfe3fa0dc" },
    include: { items: true }
  });
  console.log(JSON.stringify(quote, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
