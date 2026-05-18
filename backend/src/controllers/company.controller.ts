import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { z } from 'zod';

const createCompanySchema = z.object({
  razaoSocial: z.string(),
  nomeFantasia: z.string().optional(),
  cnpj: z.string(),
  cnpjSemMascara: z.string(),
  inscricaoEstadual: z.string().optional(),
});

export const CompanyController = {
  async list(req: Request, res: Response) {
    try {
      const companies = await prisma.company.findMany();
      return res.json(companies);
    } catch (error) {
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  async create(req: Request, res: Response) {
    try {
      const data = createCompanySchema.parse(req.body);
      const company = await prisma.company.create({ data });
      return res.status(201).json(company);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  },
};
