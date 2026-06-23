const { PrismaClient } = require('@prisma/client');

async function main() {
  console.log('🔍 [Resolve Migration] Inicializando Prisma Client...');
  const prisma = new PrismaClient();
  try {
    console.log('🔍 [Resolve Migration] Listando registros em _prisma_migrations para diagnóstico:');
    try {
      const rows = await prisma.$queryRawUnsafe('SELECT "id", "migration_name", "finished_at", "rolled_back_at" FROM "_prisma_migrations"');
      console.log('🔍 [Resolve Migration] Registros encontrados:', JSON.stringify(rows, null, 2));
    } catch (e) {
      console.log('🔍 [Resolve Migration] Não foi possível listar a tabela _prisma_migrations (talvez ela ainda não exista):', e.message);
    }

    console.log('🔍 [Resolve Migration] Executando deleção incondicional da migração falhada...');
    const result = await prisma.$executeRawUnsafe(
      `DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20260608150000_create_fiscal_tables'`
    );
    console.log(`✅ [Resolve Migration] Linpeza concluída. Registros deletados: ${result}`);
  } catch (err) {
    if (err.message.includes('relation "_prisma_migrations" does not exist') || err.message.includes('42P01')) {
      console.log('🔍 [Resolve Migration] Tabela _prisma_migrations não existe. Ignorando...');
    } else {
      console.error('❌ [Resolve Migration] Erro crítico ao interagir com o banco de dados:', err);
      process.exit(1);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(err => {
  console.error('❌ [Resolve Migration] Erro crítico não tratado no processo:', err);
  process.exit(1);
});
