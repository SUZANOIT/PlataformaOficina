const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const curioCompany = await prisma.company.findFirst({
    where: { razaoSocial: { contains: 'Curio' } }
  });
  console.log('Curio:', curioCompany);

  if (curioCompany) {
    const workshops = await prisma.oficina.findMany({
      where: { companyId: curioCompany.id }
    });
    console.log('Workshops for Curio:', workshops);
    
    if (workshops.length > 0 && workshops[0].nome === 'MCA') {
      await prisma.oficina.update({
        where: { id: workshops[0].id },
        data: { nome: curioCompany.nomeFantasia || curioCompany.razaoSocial }
      });
      console.log('Renamed Curio workshop!');
    }
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
