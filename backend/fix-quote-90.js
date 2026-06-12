const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const q = await prisma.quote.findUnique({
    where: { numeroOrcamento: 90 }
  });
  if (q && q.oficinaId === 'ce2a6a2b-79f9-4749-b7fe-4b859ebecc44') {
    await prisma.quote.update({
      where: { numeroOrcamento: 90 },
      data: { oficinaId: null }
    });
    console.log('Fixed quote 90');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
