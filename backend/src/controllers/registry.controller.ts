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

const collaboratorSchema = z.object({
  nome: z.string(),
  cpf: z.string().optional().nullable(),
  telefone: z.string().optional().nullable(),
  whatsapp: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  cargo: z.string().optional().nullable(),
  departamento: z.string().optional().nullable(),
  dataAdmissao: z.string().optional().nullable(),
  salario: z.number().optional().nullable(),
  status: z.string().default('ATIVO'),
  observacoes: z.string().optional().nullable(),
});

export const RegistryController = {
  // CLIENTS CRUD
  async listClients(req: Request, res: Response) {
    try {
      const companyId = (req as any).companyId;
      const { search } = req.query;
      const whereClause: any = { companyId };

      if (search) {
        whereClause.AND = [
          {
            OR: [
              { nome: { contains: search as string, mode: 'insensitive' } },
              { empresa: { contains: search as string, mode: 'insensitive' } },
              { cnpj: { contains: search as string, mode: 'insensitive' } },
              { email: { contains: search as string, mode: 'insensitive' } },
            ]
          }
        ];
      }

      const clients = await prisma.client.findMany({
        where: whereClause,
        include: {
          _count: {
            select: { quotes: true }
          }
        },
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
      const companyId = (req as any).companyId;
      const data = clientSchema.parse(req.body);
      const client = await prisma.client.create({
        data: {
          ...data,
          companyId,
        },
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
      const companyId = (req as any).companyId;
      const data = clientSchema.parse(req.body);

      // Validate ownership
      await prisma.client.findFirstOrThrow({
        where: { id, companyId }
      });

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
      return res.status(500).json({ error: 'Erro ao atualizar cliente ou acesso não autorizado' });
    }
  },

  async deleteClient(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const companyId = (req as any).companyId;

      // Validate ownership
      await prisma.client.findFirstOrThrow({
        where: { id, companyId }
      });

      await prisma.client.delete({
        where: { id },
      });
      return res.status(204).send();
    } catch (error) {
      console.error('Error deleting client:', error);
      return res.status(500).json({ error: 'Erro ao excluir cliente ou acesso não autorizado' });
    }
  },

  // SUPPLIERS CRUD
  async listSuppliers(req: Request, res: Response) {
    try {
      const companyId = (req as any).companyId;
      const { search } = req.query;
      const whereClause: any = { companyId };

      if (search) {
        whereClause.AND = [
          {
            OR: [
              { razaoSocial: { contains: search as string, mode: 'insensitive' } },
              { nomeFantasia: { contains: search as string, mode: 'insensitive' } },
              { cnpj: { contains: search as string, mode: 'insensitive' } },
              { email: { contains: search as string, mode: 'insensitive' } },
            ]
          }
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
      const companyId = (req as any).companyId;
      const data = supplierSchema.parse(req.body);
      
      // Sanitizar CNPJ sem mascara para indice único se fornecido
      let cnpjSemMascara = data.cnpj ? data.cnpj.replace(/\D/g, '') : null;
      
      const supplier = await prisma.supplier.create({
        data: {
          ...data,
          cnpjSemMascara,
          companyId,
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
      const companyId = (req as any).companyId;
      const data = supplierSchema.parse(req.body);
      
      let cnpjSemMascara = data.cnpj ? data.cnpj.replace(/\D/g, '') : null;

      // Validate ownership
      await prisma.supplier.findFirstOrThrow({
        where: { id, companyId }
      });

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
      return res.status(500).json({ error: 'Erro ao atualizar fornecedor ou acesso não autorizado' });
    }
  },

  async deleteSupplier(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const companyId = (req as any).companyId;

      // Validate ownership
      await prisma.supplier.findFirstOrThrow({
        where: { id, companyId }
      });

      await prisma.supplier.delete({
        where: { id },
      });
      return res.status(204).send();
    } catch (error) {
      console.error('Error deleting supplier:', error);
      return res.status(500).json({ error: 'Erro ao excluir fornecedor ou acesso não autorizado' });
    }
  },

  // COLLABORATORS CRUD
  async listCollaborators(req: Request, res: Response) {
    try {
      const companyId = (req as any).companyId;
      const { search } = req.query;
      const whereClause: any = { companyId };

      if (search) {
        whereClause.AND = [
          {
            OR: [
              { nome: { contains: search as string, mode: 'insensitive' } },
              { cpf: { contains: search as string, mode: 'insensitive' } },
              { email: { contains: search as string, mode: 'insensitive' } },
              { cargo: { contains: search as string, mode: 'insensitive' } },
              { departamento: { contains: search as string, mode: 'insensitive' } },
            ]
          }
        ];
      }

      const collaborators = await prisma.collaborator.findMany({
        where: whereClause,
        orderBy: { nome: 'asc' },
      });
      return res.json(collaborators);
    } catch (error) {
      console.error('Error listing collaborators:', error);
      return res.status(500).json({ error: 'Erro ao listar colaboradores' });
    }
  },

  async createCollaborator(req: Request, res: Response) {
    try {
      const companyId = (req as any).companyId;
      const data = collaboratorSchema.parse(req.body);
      let cpfSemMascara = data.cpf ? data.cpf.replace(/\D/g, '') : null;
      
      const collaborator = await prisma.collaborator.create({
        data: {
          ...data,
          cpfSemMascara,
          dataAdmissao: data.dataAdmissao ? new Date(data.dataAdmissao) : null,
          companyId,
        },
      });
      return res.status(201).json(collaborator);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.issues });
      }
      console.error('Error creating collaborator:', error);
      return res.status(500).json({ error: 'Erro ao criar colaborador' });
    }
  },

  async updateCollaborator(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const companyId = (req as any).companyId;
      const data = collaboratorSchema.parse(req.body);
      let cpfSemMascara = data.cpf ? data.cpf.replace(/\D/g, '') : null;

      // Validate ownership
      await prisma.collaborator.findFirstOrThrow({
        where: { id, companyId }
      });

      const collaborator = await prisma.collaborator.update({
        where: { id },
        data: {
          ...data,
          cpfSemMascara,
          dataAdmissao: data.dataAdmissao ? new Date(data.dataAdmissao) : null,
        },
      });
      return res.json(collaborator);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.issues });
      }
      console.error('Error updating collaborator:', error);
      return res.status(500).json({ error: 'Erro ao atualizar colaborador ou acesso não autorizado' });
    }
  },

  async deleteCollaborator(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const companyId = (req as any).companyId;

      // Validate ownership
      await prisma.collaborator.findFirstOrThrow({
        where: { id, companyId }
      });

      await prisma.collaborator.delete({
        where: { id },
      });
      return res.status(204).send();
    } catch (error) {
      console.error('Error deleting collaborator:', error);
      return res.status(500).json({ error: 'Erro ao excluir colaborador ou acesso não autorizado' });
    }
  },
};
