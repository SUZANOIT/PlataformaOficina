import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { z } from 'zod';
import { AuditLogger } from '../utils/audit.logger';

const tributacaoSchema = z.object({
  esfera: z.enum(['MUNICIPAL', 'ESTADUAL', 'FEDERAL']),
  codigo: z.string(),
  descricao: z.string(),
  status: z.string().default('ATIVO'),
  
  // Municipal specific
  municipio: z.string().optional().nullable(),
  codigoServico: z.string().optional().nullable(),
  aliquotaIss: z.number().optional().nullable(),
  retencaoIss: z.boolean().default(false),
  situacaoTributaria: z.string().optional().nullable(),

  // Estadual specific
  uf: z.string().optional().nullable(),
  cfop: z.string().optional().nullable(),
  cstIcms: z.string().optional().nullable(),
  csosn: z.string().optional().nullable(),
  aliquotaIcms: z.number().optional().nullable(),
  fcp: z.number().optional().nullable(),
  difal: z.number().optional().nullable(),
  observacao: z.string().optional().nullable(),

  // Federal specific
  cstPis: z.string().optional().nullable(),
  cstCofins: z.string().optional().nullable(),
  cstIpi: z.string().optional().nullable(),
  aliquotaPis: z.number().optional().nullable(),
  aliquotaCofins: z.number().optional().nullable(),
  aliquotaIpi: z.number().optional().nullable(),
  naturezaReceita: z.string().optional().nullable(),
});

export const TaxController = {
  async list(req: Request, res: Response) {
    try {
      const companyId = (req as any).companyId || null;
      if (!companyId) return res.status(400).json({ error: 'Empresa não identificada.' });

      const taxes = await prisma.tributacao.findMany({
        where: { companyId },
        orderBy: [{ esfera: 'asc' }, { codigo: 'asc' }],
      });
      return res.json(taxes);
    } catch (error) {
      console.error('Error listing taxes:', error);
      return res.status(500).json({ error: 'Erro ao listar tributações' });
    }
  },

  async create(req: Request, res: Response) {
    try {
      const companyId = (req as any).companyId || null;
      const userId = (req as any).userId || null;
      if (!companyId) return res.status(400).json({ error: 'Empresa não identificada.' });

      const data = tributacaoSchema.parse(req.body);

      const duplicate = await prisma.tributacao.findUnique({
        where: { companyId_esfera_codigo: { companyId, esfera: data.esfera, codigo: data.codigo } }
      });
      if (duplicate) {
        return res.status(409).json({ error: 'Já existe uma tributação desta esfera com este código.' });
      }

      const tax = await prisma.tributacao.create({
        data: { ...data, companyId },
      });

      AuditLogger.log(userId, companyId, 'CREATE_TAX', `Created tax code ${tax.codigo} for ${tax.esfera}`, 'SUCCESS');
      return res.status(201).json(tax);
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ error: error.issues });
      console.error('Error creating tax:', error);
      return res.status(500).json({ error: 'Erro ao criar tributação' });
    }
  },

  async update(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const companyId = (req as any).companyId || null;
      const userId = (req as any).userId || null;

      const existing = await prisma.tributacao.findFirst({
        where: { id, companyId }
      });
      if (!existing) return res.status(404).json({ error: 'Tributação não encontrada.' });

      const data = tributacaoSchema.parse(req.body);

      if (data.codigo !== existing.codigo || data.esfera !== existing.esfera) {
        const duplicate = await prisma.tributacao.findUnique({
          where: { companyId_esfera_codigo: { companyId, esfera: data.esfera, codigo: data.codigo } }
        });
        if (duplicate) {
          return res.status(409).json({ error: 'Já existe uma tributação desta esfera com este código.' });
        }
      }

      const tax = await prisma.tributacao.update({
        where: { id },
        data: { ...data, companyId },
      });

      AuditLogger.log(userId, companyId, 'UPDATE_TAX', `Updated tax code ${tax.codigo} for ${tax.esfera}`, 'SUCCESS');
      return res.json(tax);
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ error: error.issues });
      console.error('Error updating tax:', error);
      return res.status(500).json({ error: 'Erro ao atualizar tributação' });
    }
  },

  async delete(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const companyId = (req as any).companyId || null;
      const userId = (req as any).userId || null;

      const existing = await prisma.tributacao.findFirst({
        where: { id, companyId }
      });
      if (!existing) return res.status(404).json({ error: 'Tributação não encontrada.' });

      // Check if any product is using this tax configuration
      const countMunicipal = await prisma.product.count({ where: { tributacaoMunicipalId: id } });
      const countEstadual = await prisma.product.count({ where: { tributacaoEstadualId: id } });
      const countFederal = await prisma.product.count({ where: { tributacaoFederalId: id } });

      if (countMunicipal > 0 || countEstadual > 0 || countFederal > 0) {
        return res.status(400).json({ error: 'Não é possível excluir esta tributação pois ela está vinculada a produtos cadastrados.' });
      }

      await prisma.tributacao.delete({ where: { id } });

      AuditLogger.log(userId, companyId, 'DELETE_TAX', `Deleted tax code ${existing.codigo} for ${existing.esfera}`, 'SUCCESS');
      return res.status(204).send();
    } catch (error) {
      console.error('Error deleting tax:', error);
      return res.status(500).json({ error: 'Erro ao excluir tributação' });
    }
  }
};
