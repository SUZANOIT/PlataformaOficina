import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { z } from 'zod';

const rateSchema = z.object({
  quantidadeEixos: z.coerce.number().min(2, 'Quantidade mínima é 2 eixos.'),
  taxaSaida: z.number().default(0),
  valorKm: z.number().default(0),
  valorHoraParada: z.number().default(0),
  status: z.string().default('ATIVO'),
});

export const TowingRateController = {
  async list(req: Request, res: Response) {
    try {
      const companyId = (req as any).companyId;
      const { status } = req.query;
      
      const whereClause: any = { companyId };
      if (status) {
        whereClause.status = status as string;
      }

      const rates = await prisma.towingRate.findMany({
        where: whereClause,

        orderBy: { quantidadeEixos: 'asc' }
      });
      return res.json(rates);
    } catch (error) {
      return res.status(500).json({ error: 'Internal error' });
    }
  },

  async save(req: Request, res: Response) {
    try {
      const companyId = (req as any).companyId;
      const userId = (req as any).userId;
      const data = rateSchema.parse(req.body);

      const existing = await prisma.towingRate.findFirst({
        where: { companyId, quantidadeEixos: data.quantidadeEixos }
      });

      // Fetch user details for audit trail
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true }
      });
      const userName = user?.name || 'Sistema';

      let rate;

      if (existing) {
        // Log history comparison
        await prisma.towingRateHistory.create({
          data: {
            towingRateId: existing.id,
            companyId,
            userId,
            userName,
            taxaSaidaAnterior: existing.taxaSaida,
            taxaSaidaNova: data.taxaSaida,
            valorKmAnterior: existing.valorKm,
            valorKmNovo: data.valorKm,
            valorHoraParadaAnterior: existing.valorHoraParada,
            valorHoraParadaNovo: data.valorHoraParada,
            statusAnterior: existing.status,
            statusNovo: data.status,
          }
        });

        rate = await prisma.towingRate.update({
          where: { id: existing.id },
          data: {
            quantidadeEixos: data.quantidadeEixos,
            taxaSaida: data.taxaSaida,
            valorKm: data.valorKm,
            valorHoraParada: data.valorHoraParada,
            status: data.status,
          }
        });
      } else {
        rate = await prisma.towingRate.create({
          data: {
            companyId,
            quantidadeEixos: data.quantidadeEixos,
            taxaSaida: data.taxaSaida,
            valorKm: data.valorKm,
            valorHoraParada: data.valorHoraParada,
            status: data.status,
          }
        });

        // Log initial history
        await prisma.towingRateHistory.create({
          data: {
            towingRateId: rate.id,
            companyId,
            userId,
            userName,
            taxaSaidaAnterior: 0,
            taxaSaidaNova: data.taxaSaida,
            valorKmAnterior: 0,
            valorKmNovo: data.valorKm,
            valorHoraParadaAnterior: 0,
            valorHoraParadaNovo: data.valorHoraParada,
            statusAnterior: 'NOVO',
            statusNovo: data.status,
          }
        });
      }

      return res.json(rate);
    } catch (error: any) {
      console.error(error);
      if (error instanceof z.ZodError) return res.status(400).json({ error: (error as any).errors });
      return res.status(500).json({ error: 'Internal error' });
    }
  },

  async getHistory(req: Request, res: Response) {
    try {
      const companyId = (req as any).companyId;
      const id = req.params.id as string;

      const rate = await prisma.towingRate.findFirst({
        where: { id, companyId }
      });
      if (!rate) {
        return res.status(404).json({ error: 'Tabela de frete não encontrada.' });
      }

      const history = await prisma.towingRateHistory.findMany({
        where: { towingRateId: id, companyId },
        orderBy: { createdAt: 'desc' }
      });

      return res.json(history);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Internal error' });
    }
  }
};

