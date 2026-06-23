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

  distanciaKm: z.coerce.number().optional(),
  tempoEstimadoMin: z.coerce.number().optional(),

  veiculoPlaca: z.string().optional(),
  veiculoMarca: z.string().optional(),
  veiculoModelo: z.string().optional(),
  veiculoAno: z.string().optional(),
  veiculoCor: z.string().optional(),
  veiculoChassi: z.string().optional(),
  veiculoValorAproximado: z.coerce.number().optional().nullable(),

  tipoGuincho: z.string().optional(),
  
  driverId: z.string().optional().nullable(),
  vehicleId: z.string().optional().nullable(),

  taxaSaida: z.coerce.number().optional().default(0),
  valorKm: z.coerce.number().optional().default(0),
  horasParadas: z.coerce.number().optional().default(0),
  valorHoraParada: z.coerce.number().optional().default(0),
  pedagios: z.coerce.number().optional().default(0),
  qtdPedagios: z.coerce.number().optional().default(0),
  pedagiosDetalhes: z.any().optional(),
  despesasExtras: z.coerce.number().optional().default(0),
  descontos: z.coerce.number().optional().default(0),
  acrescimos: z.coerce.number().optional().default(0),
  impostos: z.coerce.number().optional().default(0),
  valorTotal: z.coerce.number().optional().default(0),
  valorVeiculo: z.coerce.number().optional().default(0),
  tipoCliente: z.string().optional().default('Particular'),
  plataformaId: z.string().optional().nullable(),

  observacoes: z.string().optional(),
  status: z.string().optional(),

  // Validação ANTT
  anttTipoCarga: z.string().optional(),
  anttEixos: z.coerce.number().optional().nullable(),
  anttComposicao: z.boolean().optional(),
  anttAltoDesempenho: z.boolean().optional(),
  anttRetornoVazio: z.boolean().optional(),
  anttPisoMinimo: z.coerce.number().optional(),
});

export const TowingQuoteController = {
  async list(req: Request, res: Response) {
    try {
      const companyId = (req as any).companyId;
      const quotes = await prisma.towingQuote.findMany({
        where: { companyId },
        include: {
          driver: true,
          vehicle: true,
          guiaTransporte: {
            include: {
              audits: {
                orderBy: { createdAt: 'desc' }
              }
            }
          }
        },
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

      // ANTT Stats
      const quotesWithAntt = quotes.filter(q => q.anttPisoMinimo && q.anttPisoMinimo > 0);
      const avgAnttFloor = quotesWithAntt.length > 0 ? quotesWithAntt.reduce((acc, q) => acc + q.anttPisoMinimo!, 0) / quotesWithAntt.length : 0;
      
      let belowAntt = 0;
      let aboveAntt = 0;
      let totalDiff = 0;

      quotesWithAntt.forEach(q => {
        const diff = q.valorTotal - q.anttPisoMinimo!;
        totalDiff += diff;
        if (q.valorTotal < q.anttPisoMinimo!) {
          belowAntt++;
        } else {
          aboveAntt++;
        }
      });

      const avgAnttDiff = quotesWithAntt.length > 0 ? totalDiff / quotesWithAntt.length : 0;

      return res.json({
        totalQuotes,
        totalRevenue,
        ticketMedio,
        totalKm,
        closedQuotes: closedQuotes.length,
        closedRevenue,
        anttStats: {
          avgAnttFloor,
          avgAnttDiff,
          belowAntt,
          aboveAntt
        }
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  async show(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const companyId = (req as any).companyId;

      const quote = await prisma.towingQuote.findUnique({
        where: { id },
        include: {
          driver: true,
          vehicle: true,
          guiaTransporte: {
            include: {
              audits: {
                orderBy: { createdAt: 'desc' }
              }
            }
          }
        }
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

      const company = await prisma.company.findUnique({
        where: { id: companyId }
      });
      const isCurio = company && (
        (company.razaoSocial || '').toLowerCase().includes('curio') ||
        (company.razaoSocial || '').toLowerCase().includes('curió') ||
        (company.nomeFantasia || '').toLowerCase().includes('curio') ||
        (company.nomeFantasia || '').toLowerCase().includes('curió')
      );

      // A sequence format: ORC-GUI-2026-XXXXXX is handled using the DB autoincrement ID
      const quote = await prisma.towingQuote.create({
        data: {
          ...data,
          status: isCurio ? 'Cobertura' : (data.status || 'Orçamento'),
          companyId,
          userId,
        }
      });

      // Update formatted number
      const ano = quote.createdAt.getFullYear();
      const numFormatado = `ORC-GUI-${ano}-${quote.numeroOrcamento.toString().padStart(6, '0')}`;

      const updatedQuote = await prisma.towingQuote.update({
        where: { id: quote.id },
        data: { numeroFormatado: numFormatado }
      });

      // Automatic GuiaTransporte Generation
      if (updatedQuote.status === 'Aprovado') {
        const guia = await prisma.guiaTransporte.create({
          data: {
            orcamentoId: updatedQuote.id,
            clienteId: updatedQuote.clientId,
            valorTotal: updatedQuote.valorTotal,
            status: 'APROVADO',
          }
        });
        const anoGuia = guia.createdAt.getFullYear();
        const numGuiaFormatado = `GT-${anoGuia}-${guia.numeroGuia.toString().padStart(6, '0')}`;
        await prisma.guiaTransporte.update({
          where: { id: guia.id },
          data: { numeroFormatado: numGuiaFormatado }
        });
        await prisma.guiaTransporteAudit.create({
          data: {
            guiaTransporteId: guia.id,
            acao: 'APROVAÇÃO_ORÇAMENTO',
            detalhes: `Orçamento de guincho ${numFormatado} criado e aprovado. Guia ${numGuiaFormatado} gerada automaticamente.`
          }
        });
      }

      AuditLogger.log(userId, companyId, 'CREATE_TOWING_QUOTE', `Orçamento de guincho ${numFormatado} criado`, 'SUCCESS');

      return res.status(201).json(updatedQuote);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.issues });
      }
      console.error(error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  async update(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const companyId = (req as any).companyId;
      const userId = (req as any).userId;

      const data = createTowingQuoteSchema.parse(req.body);

      const existingQuote = await prisma.towingQuote.findUnique({
        where: { id }
      });

      if (!existingQuote || existingQuote.companyId !== companyId) {
        return res.status(404).json({ error: 'Quote not found' });
      }

      const company = await prisma.company.findUnique({
        where: { id: companyId }
      });
      const isCurio = company && (
        (company.razaoSocial || '').toLowerCase().includes('curio') ||
        (company.razaoSocial || '').toLowerCase().includes('curió') ||
        (company.nomeFantasia || '').toLowerCase().includes('curio') ||
        (company.nomeFantasia || '').toLowerCase().includes('curió')
      );

      const updatedQuote = await prisma.towingQuote.update({
        where: { id },
        data: {
          ...data,
          status: isCurio ? 'Cobertura' : (data.status || existingQuote.status),
        }
      });

      // Automatic GuiaTransporte Generation Hook on Update
      if (updatedQuote.status === 'Aprovado') {
        const existingGuia = await prisma.guiaTransporte.findUnique({
          where: { orcamentoId: updatedQuote.id }
        });
        if (!existingGuia) {
          const guia = await prisma.guiaTransporte.create({
            data: {
              orcamentoId: updatedQuote.id,
              clienteId: updatedQuote.clientId,
              valorTotal: updatedQuote.valorTotal,
              status: 'APROVADO',
            }
          });
          const anoGuia = guia.createdAt.getFullYear();
          const numGuiaFormatado = `GT-${anoGuia}-${guia.numeroGuia.toString().padStart(6, '0')}`;
          await prisma.guiaTransporte.update({
            where: { id: guia.id },
            data: { numeroFormatado: numGuiaFormatado }
          });
          await prisma.guiaTransporteAudit.create({
            data: {
              guiaTransporteId: guia.id,
              acao: 'APROVAÇÃO_ORÇAMENTO',
              detalhes: `Orçamento de guincho ${updatedQuote.numeroFormatado} aprovado. Guia ${numGuiaFormatado} gerada automaticamente.`
            }
          });
        }
      }

      AuditLogger.log(userId, companyId, 'UPDATE_TOWING_QUOTE', `Orçamento de guincho ${existingQuote.numeroFormatado} atualizado`, 'SUCCESS');

      return res.json(updatedQuote);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.issues });
      }
      console.error(error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },
  
  async delete(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
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

      AuditLogger.log(userId, companyId, 'DELETE_TOWING_QUOTE', `Orçamento de guincho ${existingQuote.numeroFormatado} deletado`, 'SUCCESS');

      return res.status(204).send();
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
};
