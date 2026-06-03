import { prisma } from './src/lib/prisma';

async function run() {
  try {
    console.log('=== STARTING VEHICLE CONSOLIDATION AND LINKING ===');
    
    // 1. Get all quotes
    const quotes = await prisma.quote.findMany({
      orderBy: { createdAt: 'asc' }
    });

    console.log(`Found ${quotes.length} total quotes.`);
    let linkedCount = 0;
    let createdCount = 0;

    for (const q of quotes) {
      if (!q.veiculoPlaca || q.veiculoPlaca.trim() === '') {
        console.log(`Quote #${q.numeroOrcamento} has no vehicle plate. Skipping.`);
        continue;
      }

      const cleanPlate = q.veiculoPlaca.toUpperCase().replace(/[\s-]/g, "");

      if (cleanPlate.length < 5 || cleanPlate === '2022') {
        console.log(`Skipping invalid plate: "${q.veiculoPlaca}" in Quote #${q.numeroOrcamento}`);
        continue;
      }

      // Check if vehicle exists in the database
      let vehicle = await prisma.vehicle.findUnique({
        where: { placa: cleanPlate }
      });

      if (!vehicle) {
        // Parse year
        let parsedYear = 2020;
        const yearSource = q.veiculoAnoFabricacao || q.veiculoAno || q.veiculoAnoModelo;
        if (yearSource) {
          const match = yearSource.match(/\d{4}/);
          if (match) {
            parsedYear = parseInt(match[0]);
          }
        }

        console.log(`Creating master vehicle record for plate ${cleanPlate} (${q.veiculoMarca || 'N/A'} ${q.veiculoModelo || 'N/A'})`);
        
        vehicle = await prisma.vehicle.create({
          data: {
            placa: cleanPlate,
            chassi: q.veiculoChassi || null,
            vin: q.veiculoChassi || null,
            prefixo: q.veiculoPrefixo || null,
            marca: q.veiculoMarca || 'N/A',
            modelo: q.veiculoModelo || 'N/A',
            anoFabricacao: parsedYear,
            anoModelo: parsedYear,
            kmAtual: q.veiculoHodometro ? (parseInt(q.veiculoHodometro.replace(/\D/g, '')) || 0) : 0,
            status: 'ATIVO',
            clienteId: q.clientId,
            companyId: q.companyId,
            observacoes: `Criado automaticamente na consolidação do Orçamento #${q.numeroOrcamento}`
          }
        });
        createdCount++;
      } else {
        // If vehicle exists, update its kmAtual if the quote's hodometro is higher
        const quoteKm = q.veiculoHodometro ? (parseInt(q.veiculoHodometro.replace(/\D/g, '')) || 0) : 0;
        if (quoteKm > vehicle.kmAtual) {
          await prisma.vehicle.update({
            where: { id: vehicle.id },
            data: { kmAtual: quoteKm }
          });
        }
      }

      // Link quote to vehicle
      await prisma.quote.update({
        where: { id: q.id },
        data: {
          veiculoId: vehicle.id
        }
      });
      linkedCount++;
    }

    console.log(`\nConsolidation finished!`);
    console.log(`Linked ${linkedCount} quotes to master vehicles.`);
    console.log(`Created ${createdCount} new master vehicles.`);
  } catch (error) {
    console.error('Error during consolidation:', error);
  } finally {
    await prisma.$disconnect();
  }
}

run();
