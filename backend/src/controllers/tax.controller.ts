import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { z } from 'zod';
import { AuditLogger } from '../utils/audit.logger';

const municipalSchema = z.object({
  codigo: z.string(),
  descricao: z.string(),
  municipio: z.string().optional().nullable(),
  codigoServico: z.string().optional().nullable(),
  aliquotaIss: z.number().optional().nullable(),
  retencaoIss: z.boolean().default(false),
  situacaoTributaria: z.string().optional().nullable(),
  status: z.string().default('ATIVO'),
});

const estadualSchema = z.object({
  codigo: z.string(),
  descricao: z.string(),
  uf: z.string().optional().nullable(),
  cfop: z.string().optional().nullable(),
  cstIcms: z.string().optional().nullable(),
  csosn: z.string().optional().nullable(),
  aliquotaIcms: z.number().optional().nullable(),
  fcp: z.number().optional().nullable(),
  difal: z.number().optional().nullable(),
  observacao: z.string().optional().nullable(),
  status: z.string().default('ATIVO'),
});

const federalSchema = z.object({
  codigo: z.string(),
  descricao: z.string(),
  cstPis: z.string().optional().nullable(),
  cstCofins: z.string().optional().nullable(),
  cstIpi: z.string().optional().nullable(),
  aliquotaPis: z.number().optional().nullable(),
  aliquotaCofins: z.number().optional().nullable(),
  aliquotaIpi: z.number().optional().nullable(),
  naturezaReceita: z.string().optional().nullable(),
  status: z.string().default('ATIVO'),
});

export const TaxController = {
  // --- MUNICIPAL ---
  async listMunicipal(req: Request, res: Response) {
    try {
      const companyId = (req as any).companyId || null;
      if (!companyId) return res.status(400).json({ error: 'Empresa não identificada.' });

      const taxes = await prisma.tributacaoMunicipal.findMany({
        where: { companyId },
        orderBy: { codigo: 'asc' },
      });
      return res.json(taxes);
    } catch (error) {
      console.error('Error listing municipal taxes:', error);
      return res.status(500).json({ error: 'Erro ao listar tributações municipais' });
    }
  },

  async createMunicipal(req: Request, res: Response) {
    try {
      const companyId = (req as any).companyId || null;
      const userId = (req as any).userId || null;
      if (!companyId) return res.status(400).json({ error: 'Empresa não identificada.' });

      const data = municipalSchema.parse(req.body);

      const duplicate = await prisma.tributacaoMunicipal.findUnique({
        where: { companyId_codigo: { companyId, codigo: data.codigo } }
      });
      if (duplicate) {
        return res.status(409).json({ error: 'Já existe uma tributação municipal com este código.' });
      }

      const tax = await prisma.tributacaoMunicipal.create({
        data: { ...data, companyId },
      });

      AuditLogger.log(userId, companyId, 'CREATE_TAX_MUNICIPAL', `Created municipal tax code ${tax.codigo}`, 'SUCCESS');
      return res.status(201).json(tax);
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ error: error.issues });
      console.error('Error creating municipal tax:', error);
      return res.status(500).json({ error: 'Erro ao criar tributação municipal' });
    }
  },

  async updateMunicipal(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const companyId = (req as any).companyId || null;
      const userId = (req as any).userId || null;

      const existing = await prisma.tributacaoMunicipal.findFirst({
        where: { id, companyId }
      });
      if (!existing) return res.status(404).json({ error: 'Tributação não encontrada.' });

      const data = municipalSchema.parse(req.body);

      if (data.codigo !== existing.codigo) {
        const duplicate = await prisma.tributacaoMunicipal.findUnique({
          where: { companyId_codigo: { companyId, codigo: data.codigo } }
        });
        if (duplicate) {
          return res.status(409).json({ error: 'Já existe uma tributação municipal com este código.' });
        }
      }

      const tax = await prisma.tributacaoMunicipal.update({
        where: { id },
        data: { ...data, companyId },
      });

      AuditLogger.log(userId, companyId, 'UPDATE_TAX_MUNICIPAL', `Updated municipal tax code ${tax.codigo}`, 'SUCCESS');
      return res.json(tax);
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ error: error.issues });
      console.error('Error updating municipal tax:', error);
      return res.status(500).json({ error: 'Erro ao atualizar tributação municipal' });
    }
  },

  async deleteMunicipal(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const companyId = (req as any).companyId || null;
      const userId = (req as any).userId || null;

      const existing = await prisma.tributacaoMunicipal.findFirst({
        where: { id, companyId }
      });
      if (!existing) return res.status(404).json({ error: 'Tributação não encontrada.' });

      // Check if any product is using this tax configuration
      const count = await prisma.product.count({
        where: { tributacaoMunicipalId: id }
      });
      if (count > 0) {
        return res.status(400).json({ error: 'Não é possível excluir esta tributação pois ela está vinculada a produtos cadastrados.' });
      }

      await prisma.tributacaoMunicipal.delete({ where: { id } });

      AuditLogger.log(userId, companyId, 'DELETE_TAX_MUNICIPAL', `Deleted municipal tax code ${existing.codigo}`, 'SUCCESS');
      return res.status(204).send();
    } catch (error) {
      console.error('Error deleting municipal tax:', error);
      return res.status(500).json({ error: 'Erro ao excluir tributação municipal' });
    }
  },

  // --- ESTADUAL ---
  async listEstadual(req: Request, res: Response) {
    try {
      const companyId = (req as any).companyId || null;
      if (!companyId) return res.status(400).json({ error: 'Empresa não identificada.' });

      const taxes = await prisma.tributacaoEstadual.findMany({
        where: { companyId },
        orderBy: { codigo: 'asc' },
      });
      return res.json(taxes);
    } catch (error) {
      console.error('Error listing estadual taxes:', error);
      return res.status(500).json({ error: 'Erro ao listar tributações estaduais' });
    }
  },

  async createEstadual(req: Request, res: Response) {
    try {
      const companyId = (req as any).companyId || null;
      const userId = (req as any).userId || null;
      if (!companyId) return res.status(400).json({ error: 'Empresa não identificada.' });

      const data = estadualSchema.parse(req.body);

      const duplicate = await prisma.tributacaoEstadual.findUnique({
        where: { companyId_codigo: { companyId, codigo: data.codigo } }
      });
      if (duplicate) {
        return res.status(409).json({ error: 'Já existe uma tributação estadual com este código.' });
      }

      const tax = await prisma.tributacaoEstadual.create({
        data: { ...data, companyId },
      });

      AuditLogger.log(userId, companyId, 'CREATE_TAX_ESTADUAL', `Created estadual tax code ${tax.codigo}`, 'SUCCESS');
      return res.status(201).json(tax);
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ error: error.issues });
      console.error('Error creating estadual tax:', error);
      return res.status(500).json({ error: 'Erro ao criar tributação estadual' });
    }
  },

  async updateEstadual(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const companyId = (req as any).companyId || null;
      const userId = (req as any).userId || null;

      const existing = await prisma.tributacaoEstadual.findFirst({
        where: { id, companyId }
      });
      if (!existing) return res.status(404).json({ error: 'Tributação não encontrada.' });

      const data = estadualSchema.parse(req.body);

      if (data.codigo !== existing.codigo) {
        const duplicate = await prisma.tributacaoEstadual.findUnique({
          where: { companyId_codigo: { companyId, codigo: data.codigo } }
        });
        if (duplicate) {
          return res.status(409).json({ error: 'Já existe uma tributação estadual com este código.' });
        }
      }

      const tax = await prisma.tributacaoEstadual.update({
        where: { id },
        data: { ...data, companyId },
      });

      AuditLogger.log(userId, companyId, 'UPDATE_TAX_ESTADUAL', `Updated estadual tax code ${tax.codigo}`, 'SUCCESS');
      return res.json(tax);
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ error: error.issues });
      console.error('Error updating estadual tax:', error);
      return res.status(500).json({ error: 'Erro ao atualizar tributação estadual' });
    }
  },

  async deleteEstadual(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const companyId = (req as any).companyId || null;
      const userId = (req as any).userId || null;

      const existing = await prisma.tributacaoEstadual.findFirst({
        where: { id, companyId }
      });
      if (!existing) return res.status(404).json({ error: 'Tributação não encontrada.' });

      const count = await prisma.product.count({
        where: { tributacaoEstadualId: id }
      });
      if (count > 0) {
        return res.status(400).json({ error: 'Não é possível excluir esta tributação pois ela está vinculada a produtos cadastrados.' });
      }

      await prisma.tributacaoEstadual.delete({ where: { id } });

      AuditLogger.log(userId, companyId, 'DELETE_TAX_ESTADUAL', `Deleted estadual tax code ${existing.codigo}`, 'SUCCESS');
      return res.status(204).send();
    } catch (error) {
      console.error('Error deleting estadual tax:', error);
      return res.status(500).json({ error: 'Erro ao excluir tributação estadual' });
    }
  },

  // --- FEDERAL ---
  async listFederal(req: Request, res: Response) {
    try {
      const companyId = (req as any).companyId || null;
      if (!companyId) return res.status(400).json({ error: 'Empresa não identificada.' });

      const taxes = await prisma.tributacaoFederal.findMany({
        where: { companyId },
        orderBy: { codigo: 'asc' },
      });
      return res.json(taxes);
    } catch (error) {
      console.error('Error listing federal taxes:', error);
      return res.status(500).json({ error: 'Erro ao listar tributações federais' });
    }
  },

  async createFederal(req: Request, res: Response) {
    try {
      const companyId = (req as any).companyId || null;
      const userId = (req as any).userId || null;
      if (!companyId) return res.status(400).json({ error: 'Empresa não identificada.' });

      const data = federalSchema.parse(req.body);

      const duplicate = await prisma.tributacaoFederal.findUnique({
        where: { companyId_codigo: { companyId, codigo: data.codigo } }
      });
      if (duplicate) {
        return res.status(409).json({ error: 'Já existe uma tributação federal com este código.' });
      }

      const tax = await prisma.tributacaoFederal.create({
        data: { ...data, companyId },
      });

      AuditLogger.log(userId, companyId, 'CREATE_TAX_FEDERAL', `Created federal tax code ${tax.codigo}`, 'SUCCESS');
      return res.status(201).json(tax);
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ error: error.issues });
      console.error('Error creating federal tax:', error);
      return res.status(500).json({ error: 'Erro ao criar tributação federal' });
    }
  },

  async updateFederal(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const companyId = (req as any).companyId || null;
      const userId = (req as any).userId || null;

      const existing = await prisma.tributacaoFederal.findFirst({
        where: { id, companyId }
      });
      if (!existing) return res.status(404).json({ error: 'Tributação não encontrada.' });

      const data = federalSchema.parse(req.body);

      if (data.codigo !== existing.codigo) {
        const duplicate = await prisma.tributacaoFederal.findUnique({
          where: { companyId_codigo: { companyId, codigo: data.codigo } }
        });
        if (duplicate) {
          return res.status(409).json({ error: 'Já existe uma tributação federal com este código.' });
        }
      }

      const tax = await prisma.tributacaoFederal.update({
        where: { id },
        data: { ...data, companyId },
      });

      AuditLogger.log(userId, companyId, 'UPDATE_TAX_FEDERAL', `Updated federal tax code ${tax.codigo}`, 'SUCCESS');
      return res.json(tax);
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ error: error.issues });
      console.error('Error updating federal tax:', error);
      return res.status(500).json({ error: 'Erro ao atualizar tributação federal' });
    }
  },

  async deleteFederal(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const companyId = (req as any).companyId || null;
      const userId = (req as any).userId || null;

      const existing = await prisma.tributacaoFederal.findFirst({
        where: { id, companyId }
      });
      if (!existing) return res.status(404).json({ error: 'Tributação não encontrada.' });

      const count = await prisma.product.count({
        where: { tributacaoFederalId: id }
      });
      if (count > 0) {
        return res.status(400).json({ error: 'Não é possível excluir esta tributação pois ela está vinculada a produtos cadastrados.' });
      }

      await prisma.tributacaoFederal.delete({ where: { id } });

      AuditLogger.log(userId, companyId, 'DELETE_TAX_FEDERAL', `Deleted federal tax code ${existing.codigo}`, 'SUCCESS');
      return res.status(204).send();
    } catch (error) {
      console.error('Error deleting federal tax:', error);
      return res.status(500).json({ error: 'Erro ao excluir tributação federal' });
    }
  }
};
