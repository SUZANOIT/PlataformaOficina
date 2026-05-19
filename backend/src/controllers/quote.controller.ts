import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { z } from 'zod';

const createQuoteSchema = z.object({
  companyId: z.string(),
  client: z.object({
    nome: z.string(),
    empresa: z.string().nullish(),
    cnpj: z.string().nullish(),
    telefone: z.string().nullish(),
    email: z.string().nullish(),
    cidade: z.string().nullish(),
    estado: z.string().nullish(),
    logradouro: z.string().nullish(),
    numero: z.string().nullish(),
    complemento: z.string().nullish(),
    bairro: z.string().nullish(),
    cep: z.string().nullish(),
    dataSituacao: z.string().nullish(),
    atividadePrincipal: z.string().nullish(),
  }),
  condicaoPagamento: z.string(),
  parcelas: z.number().nullish(),
  valorParcela: z.number().nullish(),
  validade: z.string(),
  garantia: z.string().nullish(),
  prazoExecucao: z.string().nullish(),
  observacao: z.string().nullish(),
  veiculoMarca: z.string().nullish(),
  veiculoModelo: z.string().nullish(),
  veiculoAno: z.string().nullish(),
  veiculoPlaca: z.string().nullish(),
  items: z.array(z.object({
    descricao: z.string(),
    quantidade: z.number(),
    valorUnitario: z.number(),
    valorTotal: z.number(),
  })),
  subtotal: z.number(),
  total: z.number(),
});

export const QuoteController = {
  async list(req: Request, res: Response) {
    try {
      const quotes = await prisma.quote.findMany({
        include: {
          client: true,
          company: true,
          items: true,
        },
        orderBy: { createdAt: 'desc' }
      });
      return res.json(quotes);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        console.error('Prisma error in quote.list:', error.code, error.message);
        return res.status(500).json({ error: 'Database error', code: error.code });
      }
      console.error('Error in quote.list:', error);
      return res.status(500).json({
        error: 'Internal server error',
        details: process.env.NODE_ENV !== 'production' && error instanceof Error ? error.message : undefined,
      });
    }
  },

  async getDashboardStats(req: Request, res: Response) {
    try {
      const quotesCount = await prisma.quote.count();
      const quotes = await prisma.quote.findMany({
        select: { total: true }
      });
      const totalSold = quotes.reduce((acc, q) => acc + q.total, 0);

      const recentQuotes = await prisma.quote.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { 
          client: true,
          company: true
        }
      });

      // Calculate breakdown by company
      const companies = await prisma.company.findMany();
      const companyBreakdown = await Promise.all(
        companies.map(async (company) => {
          const companyQuotes = await prisma.quote.findMany({
            where: { companyId: company.id },
            select: { total: true }
          });
          
          const count = companyQuotes.length;
          const total = companyQuotes.reduce((acc, q) => acc + q.total, 0);
          
          return {
            companyId: company.id,
            companyName: company.razaoSocial || company.nomeFantasia,
            quotesCount: count,
            totalSold: total
          };
        })
      );

      return res.json({
        quotesCount,
        totalSold,
        recentQuotes,
        companyBreakdown
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        console.error('Prisma error in quote.getDashboardStats:', error.code, error.message);
        return res.status(500).json({ error: 'Database error', code: error.code });
      }
      console.error('Error in quote.getDashboardStats:', error);
      return res.status(500).json({
        error: 'Internal server error',
        details: process.env.NODE_ENV !== 'production' && error instanceof Error ? error.message : undefined,
      });
    }
  },

  async create(req: Request, res: Response) {
    try {
      const data = createQuoteSchema.parse(req.body);

      if (!data.items || data.items.length === 0) {
        return res.status(400).json({ error: 'Quote must contain at least one item' });
      }

      // Create client first
      const client = await prisma.client.create({
        data: data.client,
      });

      // Create quote
      const quote = await prisma.quote.create({
        data: {
          companyId: data.companyId,
          clientId: client.id,
          condicaoPagamento: data.condicaoPagamento,
          parcelas: data.parcelas,
          valorParcela: data.valorParcela,
          validade: data.validade,
          garantia: data.garantia,
          prazoExecucao: data.prazoExecucao,
          observacao: data.observacao,
          veiculoMarca: data.veiculoMarca,
          veiculoModelo: data.veiculoModelo,
          veiculoAno: data.veiculoAno,
          veiculoPlaca: data.veiculoPlaca,
          subtotal: data.subtotal,
          total: data.total,
          items: {
            create: data.items,
          },
        },
        include: {
          items: true,
          client: true,
          company: true
        }
      });

      console.log(`Quote created: #${quote.numeroOrcamento} for client ${client.nome} (id=${quote.id})`);
      return res.status(201).json(quote);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: (error as any).errors });
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2003') {
          return res.status(400).json({ error: 'Invalid companyId: company not found' });
        }
        console.error('Prisma error in quote.create:', error.code, error.message);
        return res.status(500).json({ error: 'Database error', code: error.code });
      }
      console.error('Error in quote.create:', error);
      return res.status(500).json({
        error: 'Internal server error',
        details: process.env.NODE_ENV !== 'production' && error instanceof Error ? error.message : undefined,
      });
    }
  },

  async show(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const quote = await prisma.quote.findUnique({
        where: { id },
        include: {
          items: true,
          client: true,
          company: true
        }
      });

      if (!quote) {
        return res.status(404).json({ error: 'Quote not found' });
      }

      return res.json(quote);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        console.error('Prisma error in quote.show:', error.code, error.message);
        return res.status(500).json({ error: 'Database error', code: error.code });
      }
      console.error('Error in quote.show:', error);
      return res.status(500).json({
        error: 'Internal server error',
        details: process.env.NODE_ENV !== 'production' && error instanceof Error ? error.message : undefined,
      });
    }
  },

  async update(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const data = createQuoteSchema.parse(req.body);

      if (!data.items || data.items.length === 0) {
        return res.status(400).json({ error: 'Quote must contain at least one item' });
      }

      const existingQuote = await prisma.quote.findUnique({
        where: { id },
        include: { client: true }
      });

      if (!existingQuote) {
        return res.status(404).json({ error: 'Quote not found' });
      }

      // Update client
      await prisma.client.update({
        where: { id: existingQuote.clientId },
        data: data.client,
      });

      // Update quote & items (delete old, create new)
      const quote = await prisma.quote.update({
        where: { id },
        data: {
          companyId: data.companyId,
          condicaoPagamento: data.condicaoPagamento,
          parcelas: data.parcelas,
          valorParcela: data.valorParcela,
          validade: data.validade,
          garantia: data.garantia,
          prazoExecucao: data.prazoExecucao,
          observacao: data.observacao,
          veiculoMarca: data.veiculoMarca,
          veiculoModelo: data.veiculoModelo,
          veiculoAno: data.veiculoAno,
          veiculoPlaca: data.veiculoPlaca,
          subtotal: data.subtotal,
          total: data.total,
          items: {
            deleteMany: {},
            create: data.items,
          }
        },
        include: {
          items: true,
          client: true,
          company: true
        }
      });

      console.log(`Quote updated: #${quote.numeroOrcamento} (id=${quote.id})`);
      return res.json(quote);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: (error as any).errors });
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          return res.status(404).json({ error: 'Quote not found' });
        }
        if (error.code === 'P2003') {
          return res.status(400).json({ error: 'Invalid companyId: company not found' });
        }
        console.error('Prisma error in quote.update:', error.code, error.message);
        return res.status(500).json({ error: 'Database error', code: error.code });
      }
      console.error('Error in quote.update:', error);
      return res.status(500).json({
        error: 'Internal server error',
        details: process.env.NODE_ENV !== 'production' && error instanceof Error ? error.message : undefined,
      });
    }
  },

  async delete(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      
      const existingQuote = await prisma.quote.findUnique({
        where: { id }
      });

      if (!existingQuote) {
        return res.status(404).json({ error: 'Quote not found' });
      }

      await prisma.quote.delete({
        where: { id }
      });

      console.log(`Quote deleted: #${existingQuote.numeroOrcamento} (id=${existingQuote.id})`);
      return res.status(204).send();
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          return res.status(404).json({ error: 'Quote not found' });
        }
        console.error('Prisma error in quote.delete:', error.code, error.message);
        return res.status(500).json({ error: 'Database error', code: error.code });
      }
      console.error('Error in quote.delete:', error);
      return res.status(500).json({
        error: 'Internal server error',
        details: process.env.NODE_ENV !== 'production' && error instanceof Error ? error.message : undefined,
      });
    }
  }
};
