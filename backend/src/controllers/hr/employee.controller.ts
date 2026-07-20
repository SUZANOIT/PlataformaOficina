import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { z } from 'zod';

const employeeSchema = z.object({
  companyId: z.string().uuid(),
  nome: z.string().min(2),
  cpf: z.string(),
  rg: z.string().optional().nullable(),
  dataNascimento: z.string().optional().nullable(),
  estadoCivil: z.string().optional().nullable(),
  telefone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  endereco: z.string().optional().nullable(),
  foto: z.string().optional().nullable(),
  dataAdmissao: z.string(),
  status: z.string().default('ATIVO'),
  jobRoleId: z.string().optional().nullable(),
  workScheduleId: z.string().optional().nullable(),
});

export const employeeController = {
  async create(req: Request, res: Response) {
    try {
      const data = employeeSchema.parse(req.body);
      const employee = await prisma.collaborator.create({
        data: {
          ...data,
          dataNascimento: data.dataNascimento ? new Date(data.dataNascimento) : null,
          dataAdmissao: new Date(data.dataAdmissao),
        }
      });
      return res.status(201).json(employee);
    } catch (error: any) {
      return res.status(400).json({ error: error.message || 'Erro ao criar funcionário' });
    }
  },

  async findAll(req: Request, res: Response) {
    try {
      const { companyId } = req.query;
      const employees = await prisma.collaborator.findMany({
        where: { companyId: companyId as string, deletedAt: null },
        include: { jobRole: true, workSchedule: true },
        orderBy: { nome: 'asc' }
      });
      return res.json(employees);
    } catch (error: any) {
      return res.status(500).json({ error: 'Erro ao listar funcionários' });
    }
  },

  async findOne(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const employee = await prisma.collaborator.findUnique({
        where: { id: id as string },
        include: { 
          jobRole: true, 
          workSchedule: true, 
          documents: true,
          salaryConfig: {
            include: { collectiveAgreement: true }
          }
        }
      });
      if (!employee || employee.deletedAt) return res.status(404).json({ error: 'Não encontrado' });
      return res.json(employee);
    } catch (error: any) {
      return res.status(500).json({ error: 'Erro ao buscar' });
    }
  },

  async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = employeeSchema.parse(req.body);
      
      const employee = await prisma.collaborator.update({
        where: { id: id as string },
        data: {
          ...data,
          dataNascimento: data.dataNascimento ? new Date(data.dataNascimento) : null,
          dataAdmissao: new Date(data.dataAdmissao),
        }
      });
      return res.json(employee);
    } catch (error: any) {
      return res.status(400).json({ error: error.message || 'Erro ao atualizar' });
    }
  },

  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      // Soft Delete
      await prisma.collaborator.update({ 
        where: { id: id as string },
        data: { deletedAt: new Date(), status: 'DEMITIDO' }
      });
      return res.status(204).send();
    } catch (error: any) {
      return res.status(500).json({ error: 'Erro ao excluir' });
    }
  }
};
