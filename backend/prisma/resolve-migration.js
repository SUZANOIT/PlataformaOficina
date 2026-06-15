const { PrismaClient } = require('@prisma/client');

async function main() {
  console.log('🔍 [Resolve Migration] Inicializando Prisma Client...');
  const prisma = new PrismaClient();
  try {
    console.log('🔍 [Resolve Migration] Verificando e limpando migração falhada...');
    const result = await prisma.$executeRawUnsafe(
      `DELETE FROM "_prisma_migrations" WHERE "finished_at" IS NULL AND "migration_name" = '20260608150000_create_fiscal_tables'`
    );
    console.log(`✅ [Resolve Migration] Limpeza concluída. Registros removidos: ${result}`);
  } catch (err) {
    if (err.message.includes('relation "_prisma_migrations" does not exist') || err.message.includes('42P01')) {
      console.log('🔍 [Resolve Migration] Tabela _prisma_migrations ainda não existe no banco. Ignorando...');
    } else {
      console.error('❌ [Resolve Migration] Falha crítica ao interagir com o banco de dados:', err);
      process.exit(1); // Força falha para exibir o log de erro real no Railway
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(err => {
  console.error('❌ [Resolve Migration] Erro crítico não tratado:', err);
  process.exit(1);
});
