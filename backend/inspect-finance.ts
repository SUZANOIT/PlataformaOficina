import { prisma } from './src/lib/prisma';

async function run() {
  try {
    const vehicles = await prisma.vehicle.findMany();
    console.log('Vehicles:');
    for (const v of vehicles) {
      // Find quotes matching this plate
      const quotes = await prisma.quote.findMany({
        where: {
          veiculoPlaca: {
            equals: v.placa,
            mode: 'insensitive'
          }
        },
        include: {
          financialReceivables: true,
          linkedReceivables: {
            include: {
              receivable: true
            }
          }
        }
      });
      console.log(`- Vehicle Placa: ${v.placa}, Brand/Model: ${v.marca} ${v.modelo}`);
      console.log(`  Matching Quotes count: ${quotes.length}`);
      for (const q of quotes) {
        console.log(`    * Quote #${q.numeroOrcamento}, Total: ${q.total}, Status: ${q.status}, ClientId: ${q.clientId}`);
        console.log(`      Receivables count: ${q.financialReceivables.length}`);
        for (const r of q.financialReceivables) {
          console.log(`        - Receivable ID: ${r.id}, Val: ${r.valor}, Status: ${r.status}, RecDate: ${r.dataRecebimento}`);
        }
        console.log(`      Linked Receivables count: ${q.linkedReceivables.length}`);
        for (const l of q.linkedReceivables) {
          console.log(`        - Linked Receivable ID: ${l.receivable.id}, Val: ${l.valorVinculado}, Status: ${l.receivable.status}, RecDate: ${l.receivable.dataRecebimento}`);
        }
      }
    }

    // Let's also check all quotes with ANY plate that is not in the vehicles table!
    const allQuotes = await prisma.quote.findMany({
      where: {
        veiculoPlaca: { not: null }
      }
    });
    console.log('\nAll quotes with plates:');
    for (const q of allQuotes) {
      console.log(`- Quote #${q.numeroOrcamento}, Plate: ${q.veiculoPlaca}, ClientId: ${q.clientId}, Status: ${q.status}`);
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
