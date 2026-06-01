import { fleetController } from './src/controllers/fleet.controller';
import { Request, Response } from 'express';

// Mock express response
function makeMockResponse() {
  const res: any = {};
  res.status = (code: number) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data: any) => {
    res.body = data;
    return res;
  };
  return res;
}

async function run() {
  const { prisma } = require('./src/lib/prisma');
  const vehicles = await prisma.vehicle.findMany();
  
  for (const v of vehicles) {
    const req: any = {
      params: { vehicleId: v.id }
    };
    const res = makeMockResponse();
    await fleetController.getVehicleDetails(req, res);
    
    console.log(`\n========================================`);
    console.log(`VEHICLE: ${v.placa} (${v.marca} ${v.modelo})`);
    if (res.statusCode && res.statusCode !== 200) {
      console.log(`Error ${res.statusCode}:`, res.body);
      continue;
    }
    
    const data = res.body;
    console.log(`Revenues in financeiro:`);
    const revenues = data.financeiro.filter((f: any) => f.tipo === 'RECEITA');
    revenues.forEach((r: any) => {
      console.log(`  - Desc: ${r.descricao}, Val: ${r.valor}, Status: ${r.status}`);
    });
    
    const totalRevenues = revenues.reduce((acc: number, f: any) => acc + f.valor, 0);
    console.log(`Total Faturado: R$ ${totalRevenues}`);
  }
}

run();
