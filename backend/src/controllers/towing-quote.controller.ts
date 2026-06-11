import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { z } from 'zod';
import { AuditLogger } from '../utils/audit.logger';

const createTowingQuoteSchema = z.object({
  clienteNome: z.string().optional(),
  clienteEmpresa: z.string().optional(),
  clienteTelefone: z.string().optional(),
  clienteEmail: z.string().optional(),
  clienteDoc: z.string().optional(),

  origemCep: z.string().optional(),
  origemEndereco: z.string().optional(),
  origemNumero: z.string().optional(),
  origemComplemento: z.string().optional(),
  origemCidade: z.string().optional(),
  origemEstado: z.string().optional(),

  destinoCep: z.string().optional(),
  destinoEndereco: z.string().optional(),
  destinoNumero: z.string().optional(),
  destinoComplemento: z.string().optional(),
  destinoCidade: z.string().optional(),
  destinoEstado: z.string().optional(),

  distanciaKm: z.number().optional(),
  tempoEstimadoMin: z.number().optional(),

  veiculoPlaca: z.string().optional(),
  veiculoMarca: z.string().optional(),
  veiculoModelo: z.string().optional(),
  veiculoAno: z.string().optional(),
  veiculoCor: z.string().optional(),

  tipoGuincho: z.string().optional(),

  taxaSaida: z.number().optional().default(0),
  valorKm: z.number().optional().default(0),
  horasParadas: z.number().optional().default(0),
  valorHoraParada: z.number().optional().default(0),
  pedagios: z.number().optional().default(0),
  despesasExtras: z.number().optional().default(0),
  descontos: z.number().optional().default(0),
  acrescimos: z.number().optional().default(0),
  valorTotal: z.number().optional().default(0),

  observacoes: z.string().optional(),
});

export const TowingQuoteController = {
  async list(req: Request, res: Response) {
    try {
      const companyId = (req as any).companyId;
      const quotes = await prisma.towingQuote.findMany({
        where: { companyId },
        orderBy: { createdAt: 'desc' }
      });
      return res.json(quotes);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  async getDashboardStats(req: Request, res: Response) {
    try {
      const companyId = (req as any).companyId;
      const quotes = await prisma.towingQuote.findMany({
        where: { companyId }
      });

      const totalQuotes = quotes.length;
      const totalRevenue = quotes.reduce((acc, q) => acc + q.valorTotal, 0);
      const ticketMedio = totalQuotes > 0 ? totalRevenue / totalQuotes : 0;
      const totalKm = quotes.reduce((acc, q) => acc + (q.distanciaKm || 0), 0);
      
      const closedQuotes = quotes.filter(q => q.status === 'Aprovado' || q.status === 'Concluído');
      const closedRevenue = closedQuotes.reduce((acc, q) => acc + q.valorTotal, 0);

      return res.json({
        totalQuotes,
        totalRevenue,
        ticketMedio,
        totalKm,
        closedQuotes: closedQuotes.length,
        closedRevenue
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  async show(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const companyId = (req as any).companyId;

      const quote = await prisma.towingQuote.findUnique({
        where: { id }
      });

      if (!quote || quote.companyId !== companyId) {
        return res.status(404).json({ error: 'Quote not found' });
      }

      return res.json(quote);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  async create(req: Request, res: Response) {
    try {
      const companyId = (req as any).companyId;
      const userId = (req as any).userId;

      const data = createTowingQuoteSchema.parse(req.body);

      // A sequence format: ORC-GUI-2026-XXXXXX is handled using the DB autoincrement ID
      const quote = await prisma.towingQuote.create({
        data: {
          ...data,
          companyId,
          userId,
        }
      });

      // Update formatted number
      const ano = quote.createdAt.getFullYear();
      const numFormatado = \`ORC-GUI-\${ano}-\${quote.numeroOrcamento.toString().padStart(6, '0')}\`;

      const updatedQuote = await prisma.towingQuote.update({
        where: { id: quote.id },
        data: { numeroFormatado: numFormatado }
      });

      AuditLogger.log(userId, companyId, 'CREATE_TOWING_QUOTE', \`Orçamento de guincho \${numFormatado} criado\`, 'SUCCESS');

      return res.status(201).json(updatedQuote);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error(error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const companyId = (req as any).companyId;
      const userId = (req as any).userId;

      const data = createTowingQuoteSchema.parse(req.body);

      const existingQuote = await prisma.towingQuote.findUnique({
        where: { id }
      });

      if (!existingQuote || existingQuote.companyId !== companyId) {
        return res.status(404).json({ error: 'Quote not found' });
      }

      const updatedQuote = await prisma.towingQuote.update({
        where: { id },
        data
      });

      AuditLogger.log(userId, companyId, 'UPDATE_TOWING_QUOTE', \`Orçamento de guincho \${existingQuote.numeroFormatado} atualizado\`, 'SUCCESS');

      return res.json(updatedQuote);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error(error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },
  
  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const companyId = (req as any).companyId;
      const userId = (req as any).userId;

      const existingQuote = await prisma.towingQuote.findUnique({
        where: { id }
      });

      if (!existingQuote || existingQuote.companyId !== companyId) {
        return res.status(404).json({ error: 'Quote not found' });
      }

      await prisma.towingQuote.delete({
        where: { id }
      });

      AuditLogger.log(userId, companyId, 'DELETE_TOWING_QUOTE', \`Orçamento de guincho \${existingQuote.numeroFormatado} deletado\`, 'SUCCESS');

      return res.status(204).send();
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
};
