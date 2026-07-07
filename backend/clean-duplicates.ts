import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando varredura de duplicidades...');
  let totalRemovidos = 0;

  // 1. Limpar duplicidades internas na tabela FiscalDocument
  // Agrupar por chaveAcesso e manter a nota mais antiga (menor data de criação/atualização ou apenas manter o primeiro ID).
  const fiscalDocs = await prisma.fiscalDocument.findMany({
    where: { chaveAcesso: { not: null } },
    select: { id: true, chaveAcesso: true, createdAt: true }
  });

  const fiscalMap = new Map<string, any[]>();
  for (const doc of fiscalDocs) {
    if (doc.chaveAcesso) {
      if (!fiscalMap.has(doc.chaveAcesso)) {
        fiscalMap.set(doc.chaveAcesso, []);
      }
      fiscalMap.get(doc.chaveAcesso)!.push(doc);
    }
  }

  console.log('\n--- Verificando Duplicidades em FiscalDocument ---');
  for (const [chave, docs] of fiscalMap.entries()) {
    if (docs.length > 1) {
      // Ordena por data de criação crescente
      docs.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      
      const toKeep = docs[0];
      const toDelete = docs.slice(1);
      
      console.log(`Chave: ${chave} tem ${docs.length} registros. Mantendo ID: ${toKeep.id}.`);
      
      for (const d of toDelete) {
        await prisma.fiscalDocument.delete({ where: { id: d.id } });
        console.log(` -> Removido FiscalDocument ID: ${d.id}`);
        totalRemovidos++;
      }
    }
  }

  // 2. Limpar notas que estão em NfeImport mas JÁ ESTÃO em FiscalDocument (cross-module duplicates)
  console.log('\n--- Verificando Duplicidades Cruzadas (NfeImport x FiscalDocument) ---');
  const nfeImports = await prisma.nfeImport.findMany({
    select: { id: true, chaveAcesso: true, companyId: true, numeroNf: true }
  });

  for (const nfe of nfeImports) {
    const fiscalEquivalent = await prisma.fiscalDocument.findFirst({
      where: { chaveAcesso: nfe.chaveAcesso, companyId: nfe.companyId }
    });

    if (fiscalEquivalent) {
      console.log(`NF-e Cruzada Duplicada! Chave: ${nfe.chaveAcesso} (NF ${nfe.numeroNf})`);
      console.log(` - Existe no Módulo de Estoque (ID: ${nfe.id}) e no Módulo Fiscal (ID: ${fiscalEquivalent.id})`);
      
      // Decidimos manter qual? Geralmente o Estoque (NfeImport) tem mais dependências (itens, produtos, contas a pagar).
      // Mas o FiscalDocument também tem o arquivo XML salvo.
      // O ideal é manter ambos se eles servem para módulos diferentes? 
      // O sistema bloqueia novas importações para impedir que o mesmo fluxo seja feito 2x. Mas se estão nos dois módulos, pode ser que o usuário realmente quis nos dois.
      // Se a intenção é limpar de NfeImport:
      // await prisma.nfeImport.delete({ where: { id: nfe.id } });
      // console.log(` -> Removido NfeImport ID: ${nfe.id}`);
      // totalRemovidos++;
    }
  }

  console.log(`\nFinalizado. Total de registros removidos: ${totalRemovidos}`);
}

main()
  .catch(e => {
    console.error('Erro na limpeza:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
