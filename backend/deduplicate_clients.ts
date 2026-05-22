import { prisma } from './src/lib/prisma';

async function main() {
  console.log('==================================================');
  console.log('🔄 INICIANDO DEDUPLICAÇÃO DE CLIENTES...');
  console.log('==================================================');

  // 1. Obter todos os clientes
  const clients = await prisma.client.findMany({
    include: {
      quotes: true
    }
  });

  console.log(`Total de clientes cadastrados: ${clients.length}`);

  // 2. Agrupar clientes duplicados
  // Usaremos uma chave de agrupamento: CNPJ (se houver), ou e-mail, ou nome limpo
  const groups: { [key: string]: typeof clients } = {};

  for (const client of clients) {
    let key = '';
    if (client.cnpj && client.cnpj.trim().replace(/\D/g, '').length === 14) {
      key = `cnpj_${client.cnpj.trim().replace(/\D/g, '')}`;
    } else if (client.email && client.email.trim().includes('@')) {
      key = `email_${client.email.trim().toLowerCase()}`;
    } else {
      key = `nome_${client.nome.trim().toLowerCase()}`;
    }

    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(client);
  }

  let mergedCount = 0;
  let deletedCount = 0;

  // 3. Processar cada grupo
  for (const [key, group] of Object.entries(groups)) {
    if (group.length <= 1) continue;

    console.log(`\nEncontrado grupo com duplicados [Chave: ${key}]:`);
    group.forEach((c, idx) => {
      console.log(`  [${idx}] ID: ${c.id} | Nome: "${c.nome}" | Orçamentos: ${c.quotes.length}`);
    });

    // Eleger o sobrevivente: preferir o cliente com o maior número de orçamentos, ou o que tem mais campos preenchidos
    const survivor = group.reduce((prev, curr) => {
      if (curr.quotes.length > prev.quotes.length) return curr;
      if (curr.quotes.length < prev.quotes.length) return prev;
      
      // Desempate: quem tem mais informações cadastrais
      const prevScore = (prev.cnpj ? 1 : 0) + (prev.email ? 1 : 0) + (prev.telefone ? 1 : 0) + (prev.cidade ? 1 : 0);
      const currScore = (curr.cnpj ? 1 : 0) + (curr.email ? 1 : 0) + (curr.telefone ? 1 : 0) + (curr.cidade ? 1 : 0);
      return currScore > prevScore ? curr : prev;
    });

    console.log(`🏆 Sobrevivente Eleito -> ID: ${survivor.id} | Nome: "${survivor.nome}"`);

    // Obter os duplicados (todos exceto o sobrevivente)
    const duplicates = group.filter(c => c.id !== survivor.id);

    for (const duplicate of duplicates) {
      if (duplicate.quotes.length > 0) {
        console.log(`  👉 Re-vinculando ${duplicate.quotes.length} orçamentos do ID ${duplicate.id} para o ID ${survivor.id}...`);
        
        // Atualizar todos os quotes vinculados ao cliente duplicado para o sobrevivente
        await prisma.quote.updateMany({
          where: { clientId: duplicate.id },
          data: { clientId: survivor.id }
        });
      }

      console.log(`  ❌ Excluindo cliente duplicado (ID: ${duplicate.id})...`);
      await prisma.client.delete({
        where: { id: duplicate.id }
      });

      deletedCount++;
    }

    mergedCount++;
  }

  console.log('\n==================================================');
  console.log('🎉 PROCESSO CONCLUÍDO COM SUCESSO!');
  console.log(`Grupos unificados: ${mergedCount}`);
  console.log(`Clientes duplicados deletados: ${deletedCount}`);
  console.log('==================================================');
}

main()
  .catch(err => {
    console.error('Erro na execução do script:', err);
  })
  .finally(() => {
    prisma.$disconnect();
  });
