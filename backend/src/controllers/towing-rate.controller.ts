import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { z } from 'zod';

const rateSchema = z.object({
  tipoGuincho: z.string(),
  taxaSaida: z.number().default(0),
  valorKm: z.number().default(0),
  valorHoraParada: z.number().default(0),
});

export const TowingRateController = {
  async list(req: Request, res: Response) {
    try {
      const companyId = (req as any).companyId;
      const rates = await prisma.towingRate.findMany({
        where: { companyId },
        orderBy: { tipoGuincho: 'asc' }
      });
      return res.json(rates);
    } catch (error) {
      return res.status(500).json({ error: 'Internal error' });
    }
  },

  async save(req: Request, res: Response) {
    try {
      const companyId = (req as any).companyId;
      const data = rateSchema.parse(req.body);
      
      const existing = await prisma.towingRate.findFirst({
        where: { companyId, tipoGuincho: data.tipoGuincho }
      });

      if (existing) {
        const rate = await prisma.towingRate.update({
          where: { id: existing.id },
          data
        });
        return res.json(rate);
      } else {
        const rate = await prisma.towingRate.create({
          data: { ...data, companyId }
        });
        return res.status(201).json(rate);
      }
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors });
      return res.status(500).json({ error: 'Internal error' });
    }
  }
};
