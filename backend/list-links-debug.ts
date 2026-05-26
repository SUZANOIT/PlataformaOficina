import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const links = await prisma.payableQuoteLink.findMany({
    include: {
      payable: true,
      quote: true
    }
  });
  console.log("Links:", JSON.stringify(links, null, 2));
}
main().finally(() => prisma.$disconnect());
