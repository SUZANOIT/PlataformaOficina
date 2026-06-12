import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { z } from 'zod';

const driverSchema = z.object({
  nome: z.string(),
  cpf: z.string(),
  cnh: z.string(),
  categoria: z.string(),
  validadeCnh: z.string().transform((str) => new Date(str)),
});

const vehicleSchema = z.object({
  placa: z.string(),
  modelo: z.string(),
  tipo: z.string(),
  capacidade: z.string().optional(),
  eixos: z.coerce.number().optional(),
  consumoMedio: z.coerce.number().optional(),
  status: z.string().default('ATIVO'),
  rntrcNumero: z.string().optional(),
  rntrcStatus: z.string().optional(),
  rntrcValidade: z.string().optional().transform((str) => str ? new Date(str) : undefined),
});

export const TowingFleetController = {
  // --- DRIVERS ---
  async listDrivers(req: Request, res: Response) {
    try {
      const companyId = (req as any).companyId;
      const drivers = await prisma.towingDriver.findMany({
        where: { companyId },
        orderBy: { nome: 'asc' }
      });
      return res.json(drivers);
    } catch (error) {
      return res.status(500).json({ error: 'Internal error' });
    }
  },

  async createDriver(req: Request, res: Response) {
    try {
      const companyId = (req as any).companyId;
      const data = driverSchema.parse(req.body);
      const driver = await prisma.towingDriver.create({
        data: { ...data, companyId }
      });
      return res.status(201).json(driver);
    } catch (error: any) {
      if (error instanceof z.ZodError) return res.status(400).json({ error: (error as any).errors });
      return res.status(500).json({ error: 'Internal error' });
    }
  },

  // --- VEHICLES ---
  async listVehicles(req: Request, res: Response) {
    try {
      const companyId = (req as any).companyId;
      const vehicles = await prisma.towingVehicle.findMany({
        where: { companyId },
        orderBy: { placa: 'asc' }
      });
      return res.json(vehicles);
    } catch (error) {
      return res.status(500).json({ error: 'Internal error' });
    }
  },

  async createVehicle(req: Request, res: Response) {
    try {
      const companyId = (req as any).companyId;
      const data = vehicleSchema.parse(req.body);
      const vehicle = await prisma.towingVehicle.create({
        data: { ...data, companyId }
      });
      return res.status(201).json(vehicle);
    } catch (error: any) {
      if (error instanceof z.ZodError) return res.status(400).json({ error: (error as any).errors });
      return res.status(500).json({ error: 'Internal error' });
    }
  }
};
