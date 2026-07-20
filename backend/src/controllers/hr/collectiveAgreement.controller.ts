import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { z } from 'zod';

const collectiveAgreementSchema = z.object({
  companyId: z.string().uuid(),
  sindicato: z.string().min(2),
  estado: z.string().min(2),
  cidade: z.string().optional(),
  dataBase: z.string(), // YYYY-MM-DD
  vigenciaInicio: z.string(),
  vigenciaFim: z.string(),
  pisoSalarial: z.number().min(0),
  jornadaMensal: z.number().min(1),
  jornadaSemanal: z.number().min(1),
  limiteDiario: z.number().optional().nullable(),
  percentualHE50: z.number().min(0),
  percentualHE100: z.number().min(0),
  percentualNoturno: z.number().min(0),
  percentualPericulosidade: z.number().optional().nullable(),
  percentualInsalubridade: z.number().optional().nullable(),
  beneficiosObrigatorios: z.string().optional().nullable(),
  bancoDeHoras: z.boolean(),
  descansoObrigatorio: z.number().min(0),
});

export const collectiveAgreementController = {
  async create(req: Request, res: Response) {
    try {
      const data = collectiveAgreementSchema.parse(req.body);
      const agreement = await prisma.collectiveAgreement.create({
        data: {
          ...data,
          dataBase: new Date(data.dataBase),
          vigenciaInicio: new Date(data.vigenciaInicio),
          vigenciaFim: new Date(data.vigenciaFim),
        }
      });
      return res.status(201).json(agreement);
    } catch (error: any) {
      return res.status(400).json({ error: error.message || 'Erro ao criar Convenção Coletiva' });
    }
  },

  async findAll(req: Request, res: Response) {
    try {
      const { companyId } = req.query;
      const agreements = await prisma.collectiveAgreement.findMany({
        where: { companyId: companyId as string },
        orderBy: { vigenciaInicio: 'desc' }
      });
      return res.json(agreements);
    } catch (error: any) {
      return res.status(500).json({ error: 'Erro ao listar Convenções Coletivas' });
    }
  },

  async findOne(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const agreement = await prisma.collectiveAgreement.findUnique({
        where: { id: id as string },
      });
      if (!agreement) return res.status(404).json({ error: 'Não encontrado' });
      return res.json(agreement);
    } catch (error: any) {
      return res.status(500).json({ error: 'Erro ao buscar' });
    }
  },

  async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = collectiveAgreementSchema.parse(req.body);
      
      const agreement = await prisma.collectiveAgreement.update({
        where: { id: id as string },
        data: {
          ...data,
          dataBase: new Date(data.dataBase),
          vigenciaInicio: new Date(data.vigenciaInicio),
          vigenciaFim: new Date(data.vigenciaFim),
        }
      });
      return res.json(agreement);
    } catch (error: any) {
      return res.status(400).json({ error: error.message || 'Erro ao atualizar' });
    }
  },

  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await prisma.collectiveAgreement.delete({ where: { id: id as string } });
      return res.status(204).send();
    } catch (error: any) {
      return res.status(500).json({ error: 'Erro ao excluir' });
    }
  }
};
