const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const quoteNumbers = [72, 73, 77, 78, 55, 89];
  const quotes = await prisma.quote.findMany({
    where: { numeroOrcamento: { in: quoteNumbers } },
    include: { company: true, oficina: true }
  });

  for (const q of quotes) {
    if (q.company?.nomeFantasia?.toLowerCase().includes('curio') || q.company?.razaoSocial?.toLowerCase().includes('curio')) {
      if (q.oficina?.nome === 'MCA COMERCIO AUTOMOTIVO LTDA') {
        console.log(`Fixing quote ${q.numeroOrcamento} (ID: ${q.id}) - Removing MCA workshop`);
        await prisma.quote.update({
          where: { id: q.id },
          data: { oficinaId: null }
        });
      }
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
