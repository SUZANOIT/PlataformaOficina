import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const payables = await prisma.financialPayable.findMany({
    where: {
      OR: [
        { fornecedor: { contains: 'OpenAI', mode: 'insensitive' } },
        { fornecedor: { contains: 'Anthropic', mode: 'insensitive' } },
        { fornecedor: { contains: 'Claude', mode: 'insensitive' } },
        { fornecedor: { contains: 'Cursor', mode: 'insensitive' } },
        { fornecedor: { contains: 'GitHub', mode: 'insensitive' } },
        { fornecedor: { contains: 'Google', mode: 'insensitive' } },
        { fornecedor: { contains: 'ChatGPT', mode: 'insensitive' } },
      ]
    }
  });
  console.log('AI Payables found:', payables.length);
  console.log(payables.map(p => ({ fornecedor: p.fornecedor, valor: p.valor, categoria: p.categoria })));
}
main().catch(console.error).finally(() => prisma.$disconnect());
