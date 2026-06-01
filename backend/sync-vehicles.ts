import { prisma } from './src/lib/prisma';

async function run() {
  try {
    console.log('--- STARTING FLEET VEHICLES SYNCHRONIZATION ---');
    
    // Find all quotes with valid plates
    const quotes = await prisma.quote.findMany({
      where: {
        veiculoPlaca: {
          not: null,
          notIn: ['']
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    console.log(`Found ${quotes.length} quotes with vehicle plates.`);

    let createdCount = 0;
    
    for (const q of quotes) {
      if (!q.veiculoPlaca) continue;
      
      const cleanPlate = q.veiculoPlaca.toUpperCase().replace(/[\s-]/g, "");
      
      // Skip if plate format is invalid or just a placeholder
      if (cleanPlate.length < 5 || cleanPlate === '2022') {
        console.log(`Skipping invalid/placeholder plate: "${q.veiculoPlaca}" in Quote #${q.numeroOrcamento}`);
        continue;
      }
      
      // Check if vehicle already exists in DB
      const existingVehicle = await prisma.vehicle.findUnique({
        where: { placa: cleanPlate }
      });
      
      if (!existingVehicle) {
        console.log(`Creating vehicle for plate ${cleanPlate} (${q.veiculoMarca} ${q.veiculoModelo}) under Client ID ${q.clientId}`);
        
        let parsedYear = 2020;
        if (q.veiculoAno) {
          const match = q.veiculoAno.match(/\d{4}/);
          if (match) {
            parsedYear = parseInt(match[0]);
          }
        }
        
        await prisma.vehicle.create({
          data: {
            placa: cleanPlate,
            marca: q.veiculoMarca || 'N/A',
            modelo: q.veiculoModelo || 'N/A',
            anoFabricacao: parsedYear,
            anoModelo: parsedYear,
            kmAtual: 0,
            status: 'ATIVO',
            clienteId: q.clientId,
            companyId: q.companyId,
            observacoes: `Importado automaticamente do Orçamento #${q.numeroOrcamento}`
          }
        });
        
        createdCount++;
      } else {
        // If vehicle exists, double check if it is linked to the correct client
        if (existingVehicle.clienteId !== q.clientId) {
          console.log(`Updating client for vehicle ${cleanPlate} from ${existingVehicle.clienteId} to ${q.clientId}`);
          await prisma.vehicle.update({
            where: { id: existingVehicle.id },
            data: { clienteId: q.clientId }
          });
        }
      }
    }
    
    console.log(`\nSynchronization completed successfully! Created ${createdCount} missing vehicles.`);
  } catch (err) {
    console.error('Error during synchronization:', err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
