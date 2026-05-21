import { PrismaClient } from '@prisma/client';

// Obter a URL do Railway por argumento ou variável de ambiente
const railwayUrl = process.argv[2] || process.env.RAILWAY_DATABASE_URL;

if (!railwayUrl) {
  console.error('\n❌ Erro: Por favor, forneça a URL de conexão do banco de dados do Railway.');
  console.log('\nUso do Script:');
  console.log('  npx ts-node migrate-to-railway.ts "postgresql://usuario:senha@host:porta/banco"');
  console.log('\nOu defina a variável de ambiente:');
  console.log('  export RAILWAY_DATABASE_URL="sua-url-do-railway"');
  console.log('  npx ts-node migrate-to-railway.ts\n');
  throw new Error('Railway Database URL não fornecida.');
}

const localUrl = process.env.DATABASE_URL || "postgresql://admin:adminpassword@localhost:5432/orcamentos?schema=public";

console.log('🔌 Conectando ao Banco de Dados Local...');
const localPrisma = new PrismaClient({
  datasources: {
    db: {
      url: localUrl
    }
  }
});

console.log('🔌 Conectando ao Banco de Dados Railway (Destino)...');
const railwayPrisma = new PrismaClient({
  datasources: {
    db: {
      url: railwayUrl
    }
  }
});

async function run() {
  console.log('\n==================================================');
  console.log('🚀 INICIANDO MIGRAÇÃO AUTOMÁTICA E SEGURA PARA O RAILWAY');
  console.log('==================================================');

  // 1. Migrar Usuários
  console.log('\n👤 Sincronizando Usuários...');
  const users = await localPrisma.user.findMany();
  let userCount = 0;
  for (const user of users) {
    await railwayPrisma.user.upsert({
      where: { id: user.id },
      update: {
        name: user.name,
        email: user.email,
        password: user.password,
        updatedAt: user.updatedAt
      },
      create: {
        id: user.id,
        name: user.name,
        email: user.email,
        password: user.password,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
    userCount++;
  }
  console.log(`✅ ${userCount} Usuários migrados/sincronizados.`);

  // 2. Migrar Empresas
  console.log('\n🏢 Sincronizando Empresas...');
  const companies = await localPrisma.company.findMany();
  let companyCount = 0;
  for (const company of companies) {
    await railwayPrisma.company.upsert({
      where: { id: company.id },
      update: {
        razaoSocial: company.razaoSocial,
        nomeFantasia: company.nomeFantasia,
        cnpj: company.cnpj,
        cnpjSemMascara: company.cnpjSemMascara,
        inscricaoEstadual: company.inscricaoEstadual,
        updatedAt: company.updatedAt
      },
      create: {
        id: company.id,
        razaoSocial: company.razaoSocial,
        nomeFantasia: company.nomeFantasia,
        cnpj: company.cnpj,
        cnpjSemMascara: company.cnpjSemMascara,
        inscricaoEstadual: company.inscricaoEstadual,
        createdAt: company.createdAt,
        updatedAt: company.updatedAt
      }
    });
    companyCount++;
  }
  console.log(`✅ ${companyCount} Empresas migradas/sincronizadas.`);

  // 3. Migrar Clientes
  console.log('\n👥 Sincronizando Clientes...');
  const clients = await localPrisma.client.findMany();
  let clientCount = 0;
  for (const client of clients) {
    await railwayPrisma.client.upsert({
      where: { id: client.id },
      update: {
        nome: client.nome,
        empresa: client.empresa,
        cnpj: client.cnpj,
        telefone: client.telefone,
        email: client.email,
        cidade: client.cidade,
        estado: client.estado,
        logradouro: client.logradouro,
        numero: client.numero,
        complemento: client.complemento,
        bairro: client.bairro,
        cep: client.cep,
        dataSituacao: client.dataSituacao,
        atividadePrincipal: client.atividadePrincipal,
        updatedAt: client.updatedAt
      },
      create: {
        id: client.id,
        nome: client.nome,
        empresa: client.empresa,
        cnpj: client.cnpj,
        telefone: client.telefone,
        email: client.email,
        cidade: client.cidade,
        estado: client.estado,
        logradouro: client.logradouro,
        numero: client.numero,
        complemento: client.complemento,
        bairro: client.bairro,
        cep: client.cep,
        dataSituacao: client.dataSituacao,
        atividadePrincipal: client.atividadePrincipal,
        createdAt: client.createdAt,
        updatedAt: client.updatedAt
      }
    });
    clientCount++;
  }
  console.log(`✅ ${clientCount} Clientes migrados/sincronizados.`);

  // 4. Migrar Orçamentos
  console.log('\n📄 Sincronizando Orçamentos...');
  const quotes = await localPrisma.quote.findMany();
  let quoteCount = 0;
  for (const quote of quotes) {
    await railwayPrisma.quote.upsert({
      where: { id: quote.id },
      update: {
        numeroOrcamento: quote.numeroOrcamento,
        companyId: quote.companyId,
        clientId: quote.clientId,
        condicaoPagamento: quote.condicaoPagamento,
        parcelas: quote.parcelas,
        valorParcela: quote.valorParcela,
        validade: quote.validade,
        garantia: quote.garantia,
        prazoExecucao: quote.prazoExecucao,
        observacao: quote.observacao,
        veiculoMarca: quote.veiculoMarca,
        veiculoModelo: quote.veiculoModelo,
        veiculoAno: quote.veiculoAno,
        veiculoPlaca: quote.veiculoPlaca,
        subtotal: quote.subtotal,
        total: quote.total,
        status: quote.status,
        updatedAt: quote.updatedAt
      },
      create: {
        id: quote.id,
        numeroOrcamento: quote.numeroOrcamento,
        companyId: quote.companyId,
        clientId: quote.clientId,
        condicaoPagamento: quote.condicaoPagamento,
        parcelas: quote.parcelas,
        valorParcela: quote.valorParcela,
        validade: quote.validade,
        garantia: quote.garantia,
        prazoExecucao: quote.prazoExecucao,
        observacao: quote.observacao,
        veiculoMarca: quote.veiculoMarca,
        veiculoModelo: quote.veiculoModelo,
        veiculoAno: quote.veiculoAno,
        veiculoPlaca: quote.veiculoPlaca,
        subtotal: quote.subtotal,
        total: quote.total,
        status: quote.status,
        createdAt: quote.createdAt,
        updatedAt: quote.updatedAt
      }
    });
    quoteCount++;
  }
  console.log(`✅ ${quoteCount} Orçamentos migrados/sincronizados.`);

  // 5. Migrar Itens de Orçamentos
  console.log('\n🔧 Sincronizando Itens de Orçamentos...');
  const items = await localPrisma.quoteItem.findMany();
  let itemCount = 0;
  for (const item of items) {
    await railwayPrisma.quoteItem.upsert({
      where: { id: item.id },
      update: {
        quoteId: item.quoteId,
        descricao: item.descricao,
        quantidade: item.quantidade,
        valorUnitario: item.valorUnitario,
        valorTotal: item.valorTotal,
        tipo: item.tipo,
        updatedAt: item.updatedAt
      },
      create: {
        id: item.id,
        quoteId: item.quoteId,
        descricao: item.descricao,
        quantidade: item.quantidade,
        valorUnitario: item.valorUnitario,
        valorTotal: item.valorTotal,
        tipo: item.tipo,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt
      }
    });
    itemCount++;
  }
  console.log(`✅ ${itemCount} Itens de Orçamentos migrados/sincronizados.`);

  // 6. Migrar Configuração de Email
  console.log('\n✉️ Sincronizando Configurações de E-mail...');
  const emailConfigs = await localPrisma.emailConfig.findMany();
  let emailCount = 0;
  for (const conf of emailConfigs) {
    await railwayPrisma.emailConfig.upsert({
      where: { id: conf.id },
      update: {
        host: conf.host,
        port: conf.port,
        user: conf.user,
        password: conf.password,
        fromName: conf.fromName,
        fromEmail: conf.fromEmail,
        updatedAt: conf.updatedAt
      },
      create: {
        id: conf.id,
        host: conf.host,
        port: conf.port,
        user: conf.user,
        password: conf.password,
        fromName: conf.fromName,
        fromEmail: conf.fromEmail,
        createdAt: conf.createdAt,
        updatedAt: conf.updatedAt
      }
    });
    emailCount++;
  }
  console.log(`✅ ${emailCount} Configurações de e-mail migradas/sincronizadas.`);

  console.log('\n==================================================');
  console.log('🎉 SUCESSO: MIGRAÇÃO CONCLUÍDA SEM DUPLICAÇÕES!');
  console.log('==================================================\n');
}

run()
  .catch((e) => {
    console.error('\n❌ Erro durante a migração:', e);
  })
  .finally(async () => {
    await localPrisma.$disconnect();
    await railwayPrisma.$disconnect();
  });
