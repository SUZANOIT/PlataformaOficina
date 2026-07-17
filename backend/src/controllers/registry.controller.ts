import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { z } from 'zod';
import { AuditLogger } from '../utils/audit.logger';

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
  cargaHoraria: z.number().optional().nullable(),
  valorHora: z.number().optional().nullable(),
  status: z.string().default('ATIVO'),
  observacoes: z.string().optional().nullable(),
  oficinaId: z.string().optional().nullable(),
  companyId: z.string().optional().nullable(),
});

export const RegistryController = {
  // CLIENTS CRUD
  async listClients(req: Request, res: Response) {
    try {
      const { search } = req.query;
      const companyId = (req as any).companyId || null;

      // Auto-deduplicate clients for the current company
      try {
        const allClients = await prisma.client.findMany({
          where: { companyId },
          include: { quotes: true }
        });

        const groups: { [key: string]: typeof allClients } = {};
        for (const client of allClients) {
          let key = '';
          if (client.cnpj && client.cnpj.trim().replace(/\D/g, '').length === 14) {
            key = `cnpj_${client.cnpj.trim().replace(/\D/g, '')}`;
          } else if (client.email && client.email.trim().includes('@')) {
            key = `email_${client.email.trim().toLowerCase()}`;
          } else {
            key = `nome_${client.nome.trim().toLowerCase()}`;
          }

          if (!groups[key]) {
            groups[key] = [];
          }
          groups[key].push(client);
        }

        for (const [key, group] of Object.entries(groups)) {
          if (group.length <= 1) continue;

          const survivor = group.reduce((prev, curr) => {
            if (curr.quotes.length > prev.quotes.length) return curr;
            if (curr.quotes.length < prev.quotes.length) return prev;
            
            const prevScore = (prev.cnpj ? 1 : 0) + (prev.email ? 1 : 0) + (prev.telefone ? 1 : 0) + (prev.cidade ? 1 : 0);
            const currScore = (curr.cnpj ? 1 : 0) + (curr.email ? 1 : 0) + (curr.telefone ? 1 : 0) + (curr.cidade ? 1 : 0);
            return currScore > prevScore ? curr : prev;
          });

          const duplicates = group.filter(c => c.id !== survivor.id);

          for (const duplicate of duplicates) {
            if (duplicate.quotes.length > 0) {
              await prisma.quote.updateMany({
                where: { clientId: duplicate.id, companyId },
                data: { clientId: survivor.id }
              });
            }

            await prisma.client.delete({
              where: { id: duplicate.id }
            });
          }
        }
      } catch (dedupError) {
        console.error('Error in client auto-deduplication:', dedupError);
      }

      const whereClause: any = { companyId };

      if (search) {
        whereClause.AND = [
          { companyId },
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
      const companyId = (req as any).companyId || null;
      const userId = (req as any).userId || null;
      const data = clientSchema.parse(req.body);

      if (data.cnpj) {
        const cleanedCnpj = data.cnpj.replace(/\D/g, '');
        if (cleanedCnpj) {
          const duplicate = await prisma.client.findFirst({
            where: {
              cnpj: {
                contains: cleanedCnpj
              },
              companyId
            }
          });
          if (duplicate) {
            AuditLogger.log(userId, companyId, 'CREATE_CLIENT', `Attempted duplicate client CNPJ: ${data.cnpj}`, 'DUPLICATE_ATTEMPT');
            return res.status(409).json({ error: 'Já existe um cadastro com os dados informados.', code: 'DUPLICATE_RECORD' });
          }
        }
      }

      const client = await prisma.client.create({
        data: {
          ...data,
          companyId
        },
      });
      AuditLogger.log(userId, companyId, 'CREATE_CLIENT', `Created client: ${client.nome} (${client.id})`, 'SUCCESS');
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
      const companyId = (req as any).companyId || null;
      const userId = (req as any).userId || null;
      const data = clientSchema.parse(req.body);

      const existing = await prisma.client.findFirst({
        where: { id, companyId }
      });
      if (!existing) {
        return res.status(403).json({ error: 'Acesso negado para este cliente.' });
      }

      if (data.cnpj) {
        const cleanedCnpj = data.cnpj.replace(/\D/g, '');
        if (cleanedCnpj) {
          const duplicate = await prisma.client.findFirst({
            where: {
              cnpj: {
                contains: cleanedCnpj
              },
              id: { not: id },
              companyId
            }
          });
          if (duplicate) {
            AuditLogger.log(userId, companyId, 'UPDATE_CLIENT', `Attempted duplicate client CNPJ update: ${data.cnpj}`, 'DUPLICATE_ATTEMPT');
            return res.status(409).json({ error: 'Já existe um cadastro com os dados informados.', code: 'DUPLICATE_RECORD' });
          }
        }
      }

      const client = await prisma.client.update({
        where: { id },
        data: {
          ...data,
          companyId
        },
      });
      AuditLogger.log(userId, companyId, 'UPDATE_CLIENT', `Updated client: ${client.nome} (${client.id})`, 'SUCCESS');
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
      const companyId = (req as any).companyId || null;

      const existing = await prisma.client.findFirst({
        where: { id, companyId }
      });
      if (!existing) {
        return res.status(403).json({ error: 'Acesso negado para este cliente.' });
      }

      await prisma.client.delete({
        where: { id },
      });
      return res.status(204).send();
    } catch (error) {
      console.error('Error deleting client:', error);
      return res.status(500).json({ error: 'Erro ao excluir cliente' });
    }
  },

  async getClientRevenue(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const companyId = (req as any).companyId || null;

      const startDateQuery = req.query.startDate as string;
      const endDateQuery = req.query.endDate as string;
      const prevStartDateQuery = req.query.prevStartDate as string;
      const prevEndDateQuery = req.query.prevEndDate as string;

      const currentYear = new Date().getFullYear();
      
      const startDate = startDateQuery ? new Date(startDateQuery) : new Date(`${currentYear}-01-01T00:00:00.000Z`);
      const endDate = endDateQuery ? new Date(endDateQuery) : new Date(`${currentYear}-12-31T23:59:59.999Z`);
      
      const prevStartDate = prevStartDateQuery ? new Date(prevStartDateQuery) : new Date(`${currentYear - 1}-01-01T00:00:00.000Z`);
      const prevEndDate = prevEndDateQuery ? new Date(prevEndDateQuery) : new Date(`${currentYear - 1}-12-31T23:59:59.999Z`);

      const existing = await prisma.client.findFirst({
        where: { id, companyId }
      });
      if (!existing) {
        return res.status(403).json({ error: 'Acesso negado para este cliente.' });
      }

      const { ClientDashboardService } = require('../services/clientDashboard.service');
      const service = new ClientDashboardService(companyId, id);
      const dashboardData = await service.getDashboardData({ startDate, endDate, prevStartDate, prevEndDate });

      return res.json(dashboardData);

    } catch (error) {
      console.error('Error fetching client revenue:', error);
      return res.status(500).json({ error: 'Erro ao buscar receita do cliente' });
    }
  },

  async deduplicateClients(req: Request, res: Response) {
    try {
      const companyId = (req as any).companyId || null;
      const userId = (req as any).userId || null;

      const clients = await prisma.client.findMany({
        where: { companyId },
        include: { quotes: true }
      });

      const groups: { [key: string]: typeof clients } = {};

      for (const client of clients) {
        let key = '';
        if (client.cnpj && client.cnpj.trim().replace(/\D/g, '').length === 14) {
          key = `cnpj_${client.cnpj.trim().replace(/\D/g, '')}`;
        } else if (client.email && client.email.trim().includes('@')) {
          key = `email_${client.email.trim().toLowerCase()}`;
        } else {
          key = `nome_${client.nome.trim().toLowerCase()}`;
        }

        if (!groups[key]) {
          groups[key] = [];
        }
        groups[key].push(client);
      }

      let groupsUnified = 0;
      let duplicatesDeleted = 0;

      for (const [key, group] of Object.entries(groups)) {
        if (group.length <= 1) continue;

        const survivor = group.reduce((prev, curr) => {
          if (curr.quotes.length > prev.quotes.length) return curr;
          if (curr.quotes.length < prev.quotes.length) return prev;
          
          const prevScore = (prev.cnpj ? 1 : 0) + (prev.email ? 1 : 0) + (prev.telefone ? 1 : 0) + (prev.cidade ? 1 : 0);
          const currScore = (curr.cnpj ? 1 : 0) + (curr.email ? 1 : 0) + (curr.telefone ? 1 : 0) + (curr.cidade ? 1 : 0);
          return currScore > prevScore ? curr : prev;
        });

        const duplicates = group.filter(c => c.id !== survivor.id);

        for (const duplicate of duplicates) {
          if (duplicate.quotes.length > 0) {
            await prisma.quote.updateMany({
              where: { clientId: duplicate.id, companyId },
              data: { clientId: survivor.id }
            });
          }

          await prisma.client.delete({
            where: { id: duplicate.id }
          });
          duplicatesDeleted++;
        }
        groupsUnified++;
      }

      if (typeof AuditLogger !== 'undefined' && AuditLogger.log) {
        AuditLogger.log(userId, companyId, 'DEDUPLICATE_CLIENTS', `Deduplicated clients: unified ${groupsUnified} groups, deleted ${duplicatesDeleted} duplicates`, 'SUCCESS');
      }
      return res.json({ message: 'Deduplicação concluída com sucesso', groupsUnified, duplicatesDeleted });
    } catch (error) {
      console.error('Error deduplicating clients:', error);
      return res.status(500).json({ error: 'Erro ao deduplicar clientes' });
    }
  },

  // SUPPLIERS CRUD
  async listSuppliers(req: Request, res: Response) {
    try {
      const { search } = req.query;
      const companyId = (req as any).companyId || null;
      const whereClause: any = { companyId };

      if (search) {
        whereClause.AND = [
          { companyId },
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
      const companyId = (req as any).companyId || null;
      const userId = (req as any).userId || null;
      const data = supplierSchema.parse(req.body);
      
      let cnpjSemMascara = data.cnpj ? data.cnpj.replace(/\D/g, '') : null;
      
      if (cnpjSemMascara) {
        const duplicate = await prisma.supplier.findFirst({
          where: {
            cnpjSemMascara,
            companyId
          }
        });
        if (duplicate) {
          AuditLogger.log(userId, companyId, 'CREATE_SUPPLIER', `Attempted duplicate supplier CNPJ: ${data.cnpj}`, 'DUPLICATE_ATTEMPT');
          return res.status(409).json({ error: 'Já existe um cadastro com os dados informados.', code: 'DUPLICATE_RECORD' });
        }
      }

      const supplier = await prisma.supplier.create({
        data: {
          ...data,
          cnpjSemMascara,
          companyId
        },
      });
      AuditLogger.log(userId, companyId, 'CREATE_SUPPLIER', `Created supplier: ${supplier.razaoSocial} (${supplier.id})`, 'SUCCESS');
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
      const companyId = (req as any).companyId || null;
      const userId = (req as any).userId || null;
      const data = supplierSchema.parse(req.body);
      
      const existing = await prisma.supplier.findFirst({
        where: { id, companyId }
      });
      if (!existing) {
        return res.status(403).json({ error: 'Acesso negado para este fornecedor.' });
      }

      let cnpjSemMascara = data.cnpj ? data.cnpj.replace(/\D/g, '') : null;

      if (cnpjSemMascara) {
        const duplicate = await prisma.supplier.findFirst({
          where: {
            cnpjSemMascara,
            id: { not: id },
            companyId
          }
        });
        if (duplicate) {
          AuditLogger.log(userId, companyId, 'UPDATE_SUPPLIER', `Attempted duplicate supplier CNPJ update: ${data.cnpj}`, 'DUPLICATE_ATTEMPT');
          return res.status(409).json({ error: 'Já existe um cadastro com os dados informados.', code: 'DUPLICATE_RECORD' });
        }
      }

      const supplier = await prisma.supplier.update({
        where: { id },
        data: {
          ...data,
          cnpjSemMascara,
          companyId
        },
      });
      AuditLogger.log(userId, companyId, 'UPDATE_SUPPLIER', `Updated supplier: ${supplier.razaoSocial} (${supplier.id})`, 'SUCCESS');
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
      const companyId = (req as any).companyId || null;

      const existing = await prisma.supplier.findFirst({
        where: { id, companyId }
      });
      if (!existing) {
        return res.status(403).json({ error: 'Acesso negado para este fornecedor.' });
      }

      await prisma.supplier.delete({
        where: { id },
      });
      return res.status(204).send();
    } catch (error) {
      console.error('Error deleting supplier:', error);
      return res.status(500).json({ error: 'Erro ao excluir fornecedor' });
    }
  },

  // COLLABORATORS CRUD
  async listCollaborators(req: Request, res: Response) {
    try {
      const { search } = req.query;
      const companyId = (req as any).companyId || null;
      const whereClause: any = { companyId };

      if (search) {
        whereClause.AND = [
          { companyId },
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
        include: {
          oficina: true,
          company: true,
          advances: {
            include: {
              oficina: true
            }
          }
        },
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
      const companyId = (req as any).companyId || null;
      const userId = (req as any).userId || null;
      const data = collaboratorSchema.parse(req.body);
      let cpfSemMascara = data.cpf ? data.cpf.replace(/\D/g, '') : null;
      
      if (cpfSemMascara) {
        const duplicate = await prisma.collaborator.findFirst({
          where: {
            cpfSemMascara,
            companyId
          }
        });
        if (duplicate) {
          AuditLogger.log(userId, companyId, 'CREATE_COLLABORATOR', `Attempted duplicate collaborator CPF: ${data.cpf}`, 'DUPLICATE_ATTEMPT');
          return res.status(409).json({ error: 'Já existe um cadastro com os dados informados.', code: 'DUPLICATE_RECORD' });
        }
      }

      let targetOficinaId: string | null = null;
      if (data.oficinaId) {
        const oficinaExists = await prisma.oficina.findFirst({
          where: { id: data.oficinaId, companyId }
        });
        if (oficinaExists) {
          targetOficinaId = data.oficinaId;
        }
      }

      let valorHora: number | null = null;
      if (data.salario && data.cargaHoraria && data.cargaHoraria > 0) {
        valorHora = data.salario / data.cargaHoraria;
      }

      const collaborator = await prisma.collaborator.create({
        data: {
          ...data,
          cpfSemMascara,
          dataAdmissao: data.dataAdmissao ? new Date(data.dataAdmissao) : null,
          oficinaId: targetOficinaId,
          companyId,
          valorHora
        },
        include: {
          oficina: true,
          company: true
        }
      });
      AuditLogger.log(userId, companyId, 'CREATE_COLLABORATOR', `Created collaborator: ${collaborator.nome} (${collaborator.id})`, 'SUCCESS');
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
      const companyId = (req as any).companyId || null;
      const userId = (req as any).userId || null;
      const data = collaboratorSchema.parse(req.body);

      const existing = await prisma.collaborator.findFirst({
        where: { id, companyId }
      });
      if (!existing) {
        return res.status(403).json({ error: 'Acesso negado para este colaborador.' });
      }

      let cpfSemMascara = data.cpf ? data.cpf.replace(/\D/g, '') : null;

      if (cpfSemMascara) {
        const duplicate = await prisma.collaborator.findFirst({
          where: {
            cpfSemMascara,
            id: { not: id },
            companyId
          }
        });
        if (duplicate) {
          AuditLogger.log(userId, companyId, 'UPDATE_COLLABORATOR', `Attempted duplicate collaborator CPF update: ${data.cpf}`, 'DUPLICATE_ATTEMPT');
          return res.status(409).json({ error: 'Já existe um cadastro com os dados informados.', code: 'DUPLICATE_RECORD' });
        }
      }

      let targetOficinaId: string | null = null;
      if (data.oficinaId) {
        const oficinaExists = await prisma.oficina.findFirst({
          where: { id: data.oficinaId, companyId }
        });
        if (oficinaExists) {
          targetOficinaId = data.oficinaId;
        }
      }

      let valorHora: number | null = null;
      if (data.salario && data.cargaHoraria && data.cargaHoraria > 0) {
        valorHora = data.salario / data.cargaHoraria;
      }

      const collaborator = await prisma.collaborator.update({
        where: { id },
        data: {
          ...data,
          cpfSemMascara,
          dataAdmissao: data.dataAdmissao ? new Date(data.dataAdmissao) : null,
          oficinaId: targetOficinaId,
          companyId,
          valorHora
        },
        include: {
          oficina: true,
          company: true
        }
      });
      AuditLogger.log(userId, companyId, 'UPDATE_COLLABORATOR', `Updated collaborator: ${collaborator.nome} (${collaborator.id})`, 'SUCCESS');
      return res.json(collaborator);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.issues });
      }
      console.error('Error updating collaborator:', error);
      return res.status(500).json({ error: 'Erro ao atualizar colaborador' });
    }
  },

  async deleteCollaborator(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const companyId = (req as any).companyId || null;

      const existing = await prisma.collaborator.findFirst({
        where: { id, companyId }
      });
      if (!existing) {
        return res.status(403).json({ error: 'Acesso negado para este colaborador.' });
      }

      await prisma.collaborator.delete({
        where: { id },
      });
      return res.status(204).send();
    } catch (error) {
      console.error('Error deleting collaborator:', error);
      return res.status(500).json({ error: 'Erro ao excluir colaborador' });
    }
  },
};
