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
  plataformaGestaoId: z.string().nullish(),
  osExterna: z.string().max(100).nullish(),
  items: z.array(z.object({
    descricao: z.string(),
    quantidade: z.number(),
    valorUnitario: z.number(),
    valorTotal: z.number(),
    tipo: z.string().optional().default("Peça"),
  })),
  subtotal: z.number(),
  total: z.number(),
  status: z.string().optional().default("Aguardando Aprovação"),
});

export const QuoteController = {
  async list(req: Request, res: Response) {
    try {
      const quotes = await prisma.quote.findMany({
        include: {
          client: true,
          company: true,
          items: true,
          plataformaGestao: true
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
        where: {
          status: {
            in: ['Aprovado', 'Emitir Nota Fiscal', 'Cobertura', 'Pago']
          }
        },
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
            where: { 
              companyId: company.id,
              status: {
                in: ['Aprovado', 'Emitir Nota Fiscal', 'Cobertura', 'Pago']
              }
            },
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

      const activeClientsCount = await prisma.client.count({
        where: { status: 'ATIVO' }
      });

      const activeClientsList = await prisma.client.findMany({
        where: { status: 'ATIVO' },
        select: {
          id: true,
          nome: true,
          empresa: true,
          cnpj: true,
          email: true,
          telefone: true
        },
        orderBy: { nome: 'asc' }
      });

      return res.json({
        quotesCount,
        totalSold,
        recentQuotes,
        companyBreakdown,
        activeClientsCount,
        activeClientsList
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

      // Prevenir duplicação de cliente: busca por CNPJ, E-mail ou Nome antes de criar
      let client;
      
      const normalizedCnpj = data.client.cnpj ? data.client.cnpj.trim().replace(/\D/g, '') : '';
      const normalizedEmail = data.client.email ? data.client.email.trim().toLowerCase() : '';
      const normalizedNome = data.client.nome.trim();

      if (normalizedCnpj && normalizedCnpj.length === 14) {
        client = await prisma.client.findFirst({
          where: {
            cnpj: {
              contains: normalizedCnpj
            }
          }
        });
      }

      if (!client && normalizedEmail) {
        client = await prisma.client.findFirst({
          where: {
            email: {
              equals: normalizedEmail,
              mode: 'insensitive'
            }
          }
        });
      }

      if (!client) {
        client = await prisma.client.findFirst({
          where: {
            nome: {
              equals: normalizedNome,
              mode: 'insensitive'
            }
          }
        });
      }

      if (client) {
        // Atualiza os dados do cliente existente para mantê-lo atualizado
        client = await prisma.client.update({
          where: { id: client.id },
          data: data.client,
        });
      } else {
        // Cria um novo cliente apenas se realmente não existir na base
        client = await prisma.client.create({
          data: data.client,
        });
      }

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
          plataformaGestaoId: data.plataformaGestaoId,
          osExterna: data.osExterna,
          subtotal: data.subtotal,
          total: data.total,
          status: data.status,
          items: {
            create: data.items,
          },
        },
        include: {
          items: true,
          client: true,
          company: true,
          plataformaGestao: true
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
          company: true,
          plataformaGestao: true
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
          plataformaGestaoId: data.plataformaGestaoId,
          osExterna: data.osExterna,
          subtotal: data.subtotal,
          total: data.total,
          status: data.status,
          items: {
            deleteMany: {},
            create: data.items,
          }
        },
        include: {
          items: true,
          client: true,
          company: true,
          plataformaGestao: true
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
