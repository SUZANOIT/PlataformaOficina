import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Verificando notas duplicadas...');
  
  // Checking FiscalDocument
  const fiscalDocs = await prisma.fiscalDocument.findMany({
    select: { id: true, chaveAcesso: true, numeroNota: true, tipoDocumento: true, nomeArquivo: true }
  });
  
  const chaves = new Map<string, any[]>();
  fiscalDocs.forEach(doc => {
    if (doc.chaveAcesso) {
      if (!chaves.has(doc.chaveAcesso)) {
        chaves.set(doc.chaveAcesso, []);
      }
      chaves.get(doc.chaveAcesso)!.push(doc);
    }
  });
  
  console.log('--- Documentos Fiscais Duplicados (chaveAcesso) ---');
  let dupCount = 0;
  for (const [chave, docs] of chaves.entries()) {
    if (docs.length > 1) {
      console.log(`Chave: ${chave} (Qtd: ${docs.length})`);
      docs.forEach(d => console.log(` - ID: ${d.id}, Arquivo: ${d.nomeArquivo}`));
      dupCount++;
    }
  }
  if (dupCount === 0) console.log('Nenhum encontrado.');

  // Check by fileName just in case
  const arquivos = new Map<string, any[]>();
  fiscalDocs.forEach(doc => {
    if (doc.nomeArquivo) {
      if (!arquivos.has(doc.nomeArquivo)) {
        arquivos.set(doc.nomeArquivo, []);
      }
      arquivos.get(doc.nomeArquivo)!.push(doc);
    }
  });

  console.log('\n--- Documentos Fiscais Duplicados (nomeArquivo) ---');
  dupCount = 0;
  for (const [arq, docs] of arquivos.entries()) {
    if (docs.length > 1) {
      console.log(`Arquivo: ${arq} (Qtd: ${docs.length})`);
      docs.forEach(d => console.log(` - ID: ${d.id}, Chave: ${d.chaveAcesso}`));
      dupCount++;
    }
  }
  if (dupCount === 0) console.log('Nenhum encontrado.');

}

main().catch(console.error).finally(() => prisma.$disconnect());
