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
  marca: z.string().optional().nullable(),
  modelo: z.string(),
  ano: z.coerce.number().optional().nullable(),
  tipo: z.string().optional(),
  towingTypeId: z.string().optional().nullable(),
  capacidade: z.string().optional().nullable(),
  eixos: z.coerce.number().optional().nullable(),
  consumoMedio: z.coerce.number().optional().nullable(),
  status: z.string().default('ATIVO'),
  rntrcNumero: z.string().optional().nullable(),
  rntrcStatus: z.string().optional().nullable(),
  rntrcValidade: z.string().optional().nullable().transform((str) => str ? new Date(str) : undefined),
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

  async updateDriver(req: Request, res: Response) {
    try {
      const companyId = (req as any).companyId;
      const id = req.params.id as string;
      const data = driverSchema.parse(req.body);

      const existing = await prisma.towingDriver.findFirst({
        where: { id, companyId }
      });
      if (!existing) {
        return res.status(404).json({ error: 'Motorista não encontrado' });
      }

      const driver = await prisma.towingDriver.update({
        where: { id },
        data
      });
      return res.json(driver);
    } catch (error: any) {
      if (error instanceof z.ZodError) return res.status(400).json({ error: (error as any).errors });
      return res.status(500).json({ error: 'Internal error' });
    }
  },

  async deleteDriver(req: Request, res: Response) {
    try {
      const companyId = (req as any).companyId;
      const id = req.params.id as string;

      const existing = await prisma.towingDriver.findFirst({
        where: { id, companyId }
      });
      if (!existing) {
        return res.status(404).json({ error: 'Motorista não encontrado' });
      }

      await prisma.towingDriver.delete({
        where: { id }
      });
      return res.status(204).send();
    } catch (error) {
      return res.status(500).json({ error: 'Internal error' });
    }
  },


  // --- VEHICLES ---
  async listVehicles(req: Request, res: Response) {
    try {
      const companyId = (req as any).companyId;
      const vehicles = await prisma.towingVehicle.findMany({
        where: { companyId },
        include: {
          towingType: true,
          company: {
            select: {
              razaoSocial: true,
              nomeFantasia: true
            }
          }
        },
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
      const parsedData = vehicleSchema.parse(req.body);
      
      let tipo = parsedData.tipo || '';
      if (parsedData.towingTypeId) {
        const towingType = await prisma.towingType.findFirst({
          where: { id: parsedData.towingTypeId, companyId }
        });
        if (towingType) {
          tipo = towingType.name;
        }
      }

      const vehicle = await prisma.towingVehicle.create({
        data: { 
          placa: parsedData.placa,
          marca: parsedData.marca,
          modelo: parsedData.modelo,
          ano: parsedData.ano,
          tipo,
          towingTypeId: parsedData.towingTypeId,
          capacidade: parsedData.capacidade,
          eixos: parsedData.eixos,
          consumoMedio: parsedData.consumoMedio,
          status: parsedData.status,
          rntrcNumero: parsedData.rntrcNumero,
          rntrcStatus: parsedData.rntrcStatus,
          rntrcValidade: parsedData.rntrcValidade,
          companyId 
        },
        include: {
          towingType: true,
          company: {
            select: {
              razaoSocial: true,
              nomeFantasia: true
            }
          }
        }
      });
      return res.status(201).json(vehicle);
    } catch (error: any) {
      console.error(error);
      if (error instanceof z.ZodError) return res.status(400).json({ error: (error as any).errors });
      return res.status(500).json({ error: 'Internal error' });
    }
  },

  async updateVehicle(req: Request, res: Response) {
    try {
      const companyId = (req as any).companyId;
      const id = req.params.id as string;
      const parsedData = vehicleSchema.parse(req.body);

      const existing = await prisma.towingVehicle.findFirst({
        where: { id, companyId }
      });
      if (!existing) {
        return res.status(404).json({ error: 'Veículo não encontrado' });
      }

      let tipo = parsedData.tipo || existing.tipo;
      if (parsedData.towingTypeId) {
        const towingType = await prisma.towingType.findFirst({
          where: { id: parsedData.towingTypeId, companyId }
        });
        if (towingType) {
          tipo = towingType.name;
        }
      }

      const vehicle = await prisma.towingVehicle.update({
        where: { id },
        data: {
          placa: parsedData.placa,
          marca: parsedData.marca,
          modelo: parsedData.modelo,
          ano: parsedData.ano,
          tipo,
          towingTypeId: parsedData.towingTypeId,
          capacidade: parsedData.capacidade,
          eixos: parsedData.eixos,
          consumoMedio: parsedData.consumoMedio,
          status: parsedData.status,
          rntrcNumero: parsedData.rntrcNumero,
          rntrcStatus: parsedData.rntrcStatus,
          rntrcValidade: parsedData.rntrcValidade,
        },
        include: {
          towingType: true,
          company: {
            select: {
              razaoSocial: true,
              nomeFantasia: true
            }
          }
        }
      });
      return res.json(vehicle);
    } catch (error: any) {
      console.error(error);
      if (error instanceof z.ZodError) return res.status(400).json({ error: (error as any).errors });
      return res.status(500).json({ error: 'Internal error' });
    }
  },

  async deleteVehicle(req: Request, res: Response) {
    try {
      const companyId = (req as any).companyId;
      const id = req.params.id as string;

      const existing = await prisma.towingVehicle.findFirst({
        where: { id, companyId }
      });
      if (!existing) {
        return res.status(404).json({ error: 'Veículo não encontrado' });
      }

      await prisma.towingVehicle.delete({
        where: { id }
      });
      return res.status(204).send();
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Internal error' });
    }
  },

  // --- TOWING TYPES (AUTO-SEED ON DEMAND) ---
  async listTypes(req: Request, res: Response) {
    try {
      const companyId = (req as any).companyId;
      let types = await prisma.towingType.findMany({
        where: { companyId },
        orderBy: { name: 'asc' }
      });

      if (types.length === 0) {
        const defaults = ["Plataforma leve", "Plataforma pesada", "Lança", "Munck", "Prancha"];
        await prisma.towingType.createMany({
          data: defaults.map(name => ({
            name,
            companyId
          }))
        });

        types = await prisma.towingType.findMany({
          where: { companyId },
          orderBy: { name: 'asc' }
        });
      }

      return res.json(types);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Internal error' });
    }
  }
};

