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
    console.warn('⚠️ [Resolve Migration] Aviso ao tentar limpar tabela _prisma_migrations:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(err => {
  console.error('❌ [Resolve Migration] Erro crítico na execução:', err);
  process.exit(0); // Garante que o build/deploy não quebre caso o script falhe por indisponibilidade temporária
});
