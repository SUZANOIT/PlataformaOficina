import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { z } from 'zod';

const clientSchema = z.object({
  nome: z.string(),
  empresa: z.string().optional().nullable(),
  cnpj: z.string().optional().nullable(),
  telefone: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  cidade: z.string().optional().nullable(),
  estado: z.string().optional().nullable(),
  logradouro: z.string().optional().nullable(),
  numero: z.string().optional().nullable(),
  complemento: z.string().optional().nullable(),
  bairro: z.string().optional().nullable(),
  cep: z.string().optional().nullable(),
  dataSituacao: z.string().optional().nullable(),
  atividadePrincipal: z.string().optional().nullable(),
});

const supplierSchema = z.object({
  razaoSocial: z.string(),
  nomeFantasia: z.string().optional().nullable(),
  cnpj: z.string().optional().nullable(),
  cnpjSemMascara: z.string().optional().nullable(),
  telefone: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  logradouro: z.string().optional().nullable(),
  numero: z.string().optional().nullable(),
  complemento: z.string().optional().nullable(),
  bairro: z.string().optional().nullable(),
  cep: z.string().optional().nullable(),
  cidade: z.string().optional().nullable(),
  estado: z.string().optional().nullable(),
  dataSituacao: z.string().optional().nullable(),
  atividadePrincipal: z.string().optional().nullable(),
});

export const RegistryController = {
  // CLIENTS CRUD
  async listClients(req: Request, res: Response) {
    try {
      const { search } = req.query;
      const whereClause: any = {};

      if (search) {
        whereClause.OR = [
          { nome: { contains: search as string, mode: 'insensitive' } },
          { empresa: { contains: search as string, mode: 'insensitive' } },
          { cnpj: { contains: search as string, mode: 'insensitive' } },
          { email: { contains: search as string, mode: 'insensitive' } },
        ];
      }

      const clients = await prisma.client.findMany({
        where: whereClause,
        orderBy: { nome: 'asc' },
      });
      return res.json(clients);
    } catch (error) {
      console.error('Error listing clients:', error);
      return res.status(500).json({ error: 'Erro ao listar clientes' });
    }
  },

  async createClient(req: Request, res: Response) {
    try {
      const data = clientSchema.parse(req.body);
      const client = await prisma.client.create({
        data,
      });
      return res.status(201).json(client);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.issues });
      }
      console.error('Error creating client:', error);
      return res.status(500).json({ error: 'Erro ao criar cliente' });
    }
  },

  async updateClient(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const data = clientSchema.parse(req.body);

      const client = await prisma.client.update({
        where: { id },
        data,
      });
      return res.json(client);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.issues });
      }
      console.error('Error updating client:', error);
      return res.status(500).json({ error: 'Erro ao atualizar cliente' });
    }
  },

  async deleteClient(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      await prisma.client.delete({
        where: { id },
      });
      return res.status(204).send();
    } catch (error) {
      console.error('Error deleting client:', error);
      return res.status(500).json({ error: 'Erro ao excluir cliente' });
    }
  },

  // SUPPLIERS CRUD
  async listSuppliers(req: Request, res: Response) {
    try {
      const { search } = req.query;
      const whereClause: any = {};

      if (search) {
        whereClause.OR = [
          { razaoSocial: { contains: search as string, mode: 'insensitive' } },
          { nomeFantasia: { contains: search as string, mode: 'insensitive' } },
          { cnpj: { contains: search as string, mode: 'insensitive' } },
          { email: { contains: search as string, mode: 'insensitive' } },
        ];
      }

      const suppliers = await prisma.supplier.findMany({
        where: whereClause,
        orderBy: { razaoSocial: 'asc' },
      });
      return res.json(suppliers);
    } catch (error) {
      console.error('Error listing suppliers:', error);
      return res.status(500).json({ error: 'Erro ao listar fornecedores' });
    }
  },

  async createSupplier(req: Request, res: Response) {
    try {
      const data = supplierSchema.parse(req.body);
      
      // Sanitizar CNPJ sem mascara para indice único se fornecido
      let cnpjSemMascara = data.cnpj ? data.cnpj.replace(/\D/g, '') : null;
      
      const supplier = await prisma.supplier.create({
        data: {
          ...data,
          cnpjSemMascara,
        },
      });
      return res.status(201).json(supplier);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.issues });
      }
      console.error('Error creating supplier:', error);
      return res.status(500).json({ error: 'Erro ao criar fornecedor' });
    }
  },

  async updateSupplier(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const data = supplierSchema.parse(req.body);
      
      let cnpjSemMascara = data.cnpj ? data.cnpj.replace(/\D/g, '') : null;

      const supplier = await prisma.supplier.update({
        where: { id },
        data: {
          ...data,
          cnpjSemMascara,
        },
      });
      return res.json(supplier);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.issues });
      }
      console.error('Error updating supplier:', error);
      return res.status(500).json({ error: 'Erro ao atualizar fornecedor' });
    }
  },

  async deleteSupplier(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      await prisma.supplier.delete({
        where: { id },
      });
      return res.status(204).send();
    } catch (error) {
      console.error('Error deleting supplier:', error);
      return res.status(500).json({ error: 'Erro ao excluir fornecedor' });
    }
  },
};
