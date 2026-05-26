import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const payables = await prisma.financialPayable.findMany({
    include: {
      linkedQuotes: true
    }
  });
  console.log("Total payables:", payables.length);
  console.log("Payables with linked quotes:", payables.filter(p => p.linkedQuotes.length > 0).length);
  if (payables.length > 0) {
    console.log("Sample payable:", JSON.stringify(payables[0], null, 2));
  }
}
main().finally(() => prisma.$disconnect());
