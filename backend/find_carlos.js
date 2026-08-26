const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("=== Buscando Carlos Mendes ===");
  const carlos = await prisma.client.findMany({
    where: {
      nome: {
        contains: 'Carlos Mendes',
        mode: 'insensitive'
      }
    }
  });
  console.log(JSON.stringify(carlos, null, 2));

  console.log("\n=== Buscando clientes com 'cnpj' que parece CPF mas tem 14 digitos (como se fosse CNPJ com zeros à esquerda) ===");
  const allClients = await prisma.client.findMany({
    select: { id: true, nome: true, cnpj: true }
  });

  const anomalias = allClients.filter(c => {
    if (!c.cnpj) return false;
    const docLimpo = c.cnpj.replace(/\D/g, '');
    
    // Tem 14 dígitos (aparece como PJ no sistema hoje) mas a string não tem '/' (como CNPJ de verdade tem)
    if (docLimpo.length === 14 && !c.cnpj.includes('/')) {
      return true;
    }
    
    // Tamanhos diferentes de 11 e 14
    if (docLimpo.length !== 11 && docLimpo.length !== 14 && docLimpo.length > 0) return true;

    return false;
  });

  console.log(`Encontrados ${anomalias.length} clientes suspeitos:`);
  console.log(JSON.stringify(anomalias, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
