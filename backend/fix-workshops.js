const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const mcaWorkshops = await prisma.oficina.findMany({
    where: { nome: 'MCA' },
    include: { company: true }
  });

  for (const w of mcaWorkshops) {
    if (w.company) {
      const companyName = w.company.nomeFantasia || w.company.razaoSocial;
      if (companyName && !companyName.toLowerCase().includes('mca')) {
        console.log(`Fixing workshop ${w.id} for company ${companyName}`);
        await prisma.oficina.update({
          where: { id: w.id },
          data: {
            nome: companyName,
            responsavel: `Administrador ${companyName}`,
            cnpj: w.company.cnpjSemMascara || "00000000000000"
          }
        });
      }
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
