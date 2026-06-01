import { prisma } from './src/lib/prisma';

async function run() {
  try {
    const clients = await prisma.client.findMany({
      include: {
        veiculos: true
      }
    });
    console.log(`Total Clients: ${clients.length}`);
    for (const c of clients) {
      console.log(`- Client: ${c.nome} (ID: ${c.id}), Status: ${c.status}, Vehicles Count: ${c.veiculos.length}`);
      for (const v of c.veiculos) {
        console.log(`   * Vehicle: ${v.placa}, Status: ${v.status}, CompanyId: ${v.companyId}`);
      }
    }
  } catch (err) {
    console.error('Error querying db:', err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
