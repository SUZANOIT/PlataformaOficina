import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { z } from 'zod';

const workScheduleSchema = z.object({
  companyId: z.string().uuid(),
  name: z.string().min(2),
  type: z.string().min(2),
  entryTime: z.string().optional().nullable(),
  exitTime: z.string().optional().nullable(),
  intervalStart: z.string().optional().nullable(),
  intervalEnd: z.string().optional().nullable(),
});

export const workScheduleController = {
  async create(req: Request, res: Response) {
    try {
      const data = workScheduleSchema.parse(req.body);
      const schedule = await prisma.workSchedule.create({
        data
      });
      return res.status(201).json(schedule);
    } catch (error: any) {
      return res.status(400).json({ error: error.message || 'Erro ao criar Escala de Trabalho' });
    }
  },

  async findAll(req: Request, res: Response) {
    try {
      const { companyId } = req.query;
      const schedules = await prisma.workSchedule.findMany({
        where: { companyId: companyId as string },
        orderBy: { name: 'asc' }
      });
      return res.json(schedules);
    } catch (error: any) {
      return res.status(500).json({ error: 'Erro ao listar Escalas de Trabalho' });
    }
  },

  async findOne(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const schedule = await prisma.workSchedule.findUnique({
        where: { id: id as string },
      });
      if (!schedule) return res.status(404).json({ error: 'Não encontrado' });
      return res.json(schedule);
    } catch (error: any) {
      return res.status(500).json({ error: 'Erro ao buscar' });
    }
  },

  async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = workScheduleSchema.parse(req.body);
      
      const schedule = await prisma.workSchedule.update({
        where: { id: id as string },
        data
      });
      return res.json(schedule);
    } catch (error: any) {
      return res.status(400).json({ error: error.message || 'Erro ao atualizar' });
    }
  },

  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await prisma.workSchedule.delete({ where: { id: id as string } });
      return res.status(204).send();
    } catch (error: any) {
      return res.status(500).json({ error: 'Erro ao excluir' });
    }
  }
};
