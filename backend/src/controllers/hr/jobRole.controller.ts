import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { z } from 'zod';

const jobRoleSchema = z.object({
  companyId: z.string().uuid(),
  title: z.string().min(2),
  description: z.string().optional().nullable(),
  cbo: z.string().optional().nullable(),
});

export const jobRoleController = {
  async create(req: Request, res: Response) {
    try {
      const data = jobRoleSchema.parse(req.body);

      const jobRole = await prisma.jobRole.create({
        data
      });
      return res.status(201).json(jobRole);
    } catch (error: any) {
      return res.status(400).json({ error: error.message || 'Erro ao criar Cargo/Função' });
    }
  },

  async findAll(req: Request, res: Response) {
    try {
      const { companyId } = req.query;

      const jobRoles = await prisma.jobRole.findMany({
        where: { companyId: companyId as string },
        orderBy: { title: 'asc' }
      });
      return res.json(jobRoles);
    } catch (error: any) {
      return res.status(500).json({ error: 'Erro ao listar Cargos/Funções' });
    }
  },

  async findOne(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const jobRole = await prisma.jobRole.findUnique({
        where: { id: id as string },
      });
      if (!jobRole) return res.status(404).json({ error: 'Não encontrado' });
      return res.json(jobRole);
    } catch (error: any) {
      return res.status(500).json({ error: 'Erro ao buscar' });
    }
  },

  async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = jobRoleSchema.parse(req.body);
      
      const jobRole = await prisma.jobRole.update({
        where: { id: id as string },
        data
      });
      return res.json(jobRole);
    } catch (error: any) {
      return res.status(400).json({ error: error.message || 'Erro ao atualizar' });
    }
  },

  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await prisma.jobRole.delete({ where: { id: id as string } });
      return res.status(204).send();
    } catch (error: any) {
      return res.status(500).json({ error: 'Erro ao excluir' });
    }
  }
};
