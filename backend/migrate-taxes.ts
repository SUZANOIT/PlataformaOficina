import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting data migration...');

  // 1. Municipal
  const municipais = await prisma.tributacaoMunicipal.findMany();
  console.log(`Migrating ${municipais.length} municipal taxes...`);
  for (const m of municipais) {
    await prisma.tributacao.upsert({
      where: { id: m.id },
      update: {},
      create: {
        id: m.id,
        esfera: 'MUNICIPAL',
        codigo: m.codigo,
        descricao: m.descricao,
        status: m.status,
        municipio: m.municipio,
        codigoServico: m.codigoServico,
        aliquotaIss: m.aliquotaIss,
        retencaoIss: m.retencaoIss,
        situacaoTributaria: m.situacaoTributaria,
        companyId: m.companyId,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
      }
    });
  }

  // 2. Estadual
  const estaduais = await prisma.tributacaoEstadual.findMany();
  console.log(`Migrating ${estaduais.length} estadual taxes...`);
  for (const e of estaduais) {
    await prisma.tributacao.upsert({
      where: { id: e.id },
      update: {},
      create: {
        id: e.id,
        esfera: 'ESTADUAL',
        codigo: e.codigo,
        descricao: e.descricao,
        status: e.status,
        uf: e.uf,
        cfop: e.cfop,
        cstIcms: e.cstIcms,
        csosn: e.csosn,
        aliquotaIcms: e.aliquotaIcms,
        fcp: e.fcp,
        difal: e.difal,
        observacao: e.observacao,
        companyId: e.companyId,
        createdAt: e.createdAt,
        updatedAt: e.updatedAt,
      }
    });
  }

  // 3. Federal
  const federais = await prisma.tributacaoFederal.findMany();
  console.log(`Migrating ${federais.length} federal taxes...`);
  for (const f of federais) {
    await prisma.tributacao.upsert({
      where: { id: f.id },
      update: {},
      create: {
        id: f.id,
        esfera: 'FEDERAL',
        codigo: f.codigo,
        descricao: f.descricao,
        status: f.status,
        cstPis: f.cstPis,
        cstCofins: f.cstCofins,
        cstIpi: f.cstIpi,
        aliquotaPis: f.aliquotaPis,
        aliquotaCofins: f.aliquotaCofins,
        aliquotaIpi: f.aliquotaIpi,
        naturezaReceita: f.naturezaReceita,
        companyId: f.companyId,
        createdAt: f.createdAt,
        updatedAt: f.updatedAt,
      }
    });
  }

  console.log('Data migration complete!');
}

main()
  .catch(e => {
    throw e;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
