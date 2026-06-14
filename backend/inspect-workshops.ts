import { prisma } from './src/lib/prisma';

async function main() {
  console.log('--- PLATAFORMA GESTAO ---');
  const platforms = await prisma.plataformaGestao.findMany();
  console.log(platforms.map(p => ({
    id: p.id,
    razaoSocial: p.razaoSocial,
    nomeFantasia: p.nomeFantasia,
    cnpj: p.cnpj,
    companyId: p.companyId,
    status: p.status
  })));

  console.log('\n--- OFICINA ---');
  const oficinas = await prisma.oficina.findMany();
  console.log(oficinas.map(o => ({
    id: o.id,
    nome: o.nome,
    cnpj: o.cnpj,
    companyId: o.companyId
  })));

  console.log('\n--- SAAS TENANT ---');
  const tenants = await prisma.saaSTenant.findMany();
  console.log(tenants.map(t => ({
    id: t.id,
    razaoSocial: t.razaoSocial,
    nomeFantasia: t.nomeFantasia,
    cnpj: t.cnpj,
    companyId: t.companyId,
    status: t.status
  })));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
