const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedTaxes() {
  const companies = await prisma.company.findMany();
  
  if (companies.length === 0) {
    console.log('No companies found.');
    return;
  }

  for (const company of companies) {
    const companyId = company.id;

    // 1. Municipal
    await prisma.tributacao.upsert({
      where: {
        companyId_esfera_codigo: {
          companyId,
          esfera: 'MUNICIPAL',
          codigo: 'ISS-SN'
        }
      },
      update: {},
      create: {
        companyId,
        esfera: 'MUNICIPAL',
        codigo: 'ISS-SN',
        descricao: 'ISS - Simples Nacional (Serviços)',
        codigoServico: '14.01',
        aliquotaIss: 5.0,
        retencaoIss: false,
        situacaoTributaria: '01',
        status: 'ATIVO'
      }
    });

    // 2. Estadual
    await prisma.tributacao.upsert({
      where: {
        companyId_esfera_codigo: {
          companyId,
          esfera: 'ESTADUAL',
          codigo: 'ICMS-SN'
        }
      },
      update: {},
      create: {
        companyId,
        esfera: 'ESTADUAL',
        codigo: 'ICMS-SN',
        descricao: 'ICMS - Simples Nacional (Peças)',
        cfop: '5102',
        csosn: '102',
        cstIcms: '00',
        aliquotaIcms: 18.0,
        fcp: 0.0,
        difal: 0.0,
        status: 'ATIVO'
      }
    });

    // 3. Federal
    await prisma.tributacao.upsert({
      where: {
        companyId_esfera_codigo: {
          companyId,
          esfera: 'FEDERAL',
          codigo: 'FED-SN'
        }
      },
      update: {},
      create: {
        companyId,
        esfera: 'FEDERAL',
        codigo: 'FED-SN',
        descricao: 'PIS/COFINS - Simples Nacional',
        cstPis: '01',
        cstCofins: '01',
        cstIpi: '99',
        aliquotaPis: 0.65,
        aliquotaCofins: 3.0,
        aliquotaIpi: 0.0,
        status: 'ATIVO'
      }
    });

    console.log(`Taxes created for company: ${company.razaoSocial || company.nomeFantasia}`);
  }
}

seedTaxes()
  .then(() => {
    console.log('Seeding completed.');
    prisma.$disconnect();
  })
  .catch((err) => {
    console.error(err);
    prisma.$disconnect();
  });
