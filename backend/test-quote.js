const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const q = await prisma.quote.findUnique({
    where: { id: '5be7095c-bee6-421e-8203-f9e34afedbde' },
    include: { company: true, oficina: true }
  });
  console.log(JSON.stringify(q, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
