import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { z } from 'zod';

const createCompanySchema = z.object({
  razaoSocial: z.string(),
  nomeFantasia: z.string().optional(),
  cnpj: z.string(),
  cnpjSemMascara: z.string(),
  inscricaoEstadual: z.string().optional(),
});

const updateCompanySchema = z.object({
  razaoSocial: z.string().optional(),
  nomeFantasia: z.string().optional().nullable(),
  cnpj: z.string().optional(),
  cnpjSemMascara: z.string().optional(),
  inscricaoEstadual: z.string().optional().nullable(),
  endereco: z.string().optional().nullable(),
  telefone: z.string().optional().nullable(),
  whatsapp: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  logo: z.string().optional().nullable(),
  regimeTributario: z.string().optional().nullable(),
});

const budgetCompanyCreateSchema = z.object({
  razaoSocial: z.string(),
  nomeFantasia: z.string().optional().nullable(),
  cnpj: z.string(),
  cnpjSemMascara: z.string(),
  inscricaoEstadual: z.string().optional().nullable(),
  endereco: z.string().optional().nullable(),
  telefone: z.string().optional().nullable(),
  whatsapp: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  logo: z.string().optional().nullable(),
  regimeTributario: z.string().optional().nullable(),
});

export const CompanyController = {
  async list(req: Request, res: Response) {
    try {
      const { scope } = req.query;
      const companyId = (req as any).companyId;
      
      const companies = await prisma.company.findMany();
      
      if (scope === 'orcamento') {
        const budgetCompanies = companies.filter(c => {
          const isMySub = c.parentCompanyId === companyId;
          const isGlobalDefault = !c.parentCompanyId && (
            c.razaoSocial.toLowerCase().includes('curio') || 
            c.razaoSocial.toLowerCase().includes('curió') || 
            c.nomeFantasia?.toLowerCase().includes('curio') ||
            c.nomeFantasia?.toLowerCase().includes('curió') ||
            c.razaoSocial.toLowerCase().includes('mca') ||
            c.nomeFantasia?.toLowerCase().includes('mca')
          );
          return isMySub || isGlobalDefault;
        });
        return res.json(budgetCompanies);
      }
      
      // Standard listing: return only sub-companies for this tenant
      const filtered = companies.filter(c => c.parentCompanyId === companyId);
      return res.json(filtered);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        console.error('Prisma error in company.list:', error.code, error.message);
        return res.status(500).json({ error: 'Database error', code: error.code });
      }
      console.error('Error in company.list:', error);
      return res.status(500).json({
        error: 'Internal server error',
        details: process.env.NODE_ENV !== 'production' && error instanceof Error ? error.message : undefined,
      });
    }
  },

  async create(req: Request, res: Response) {
    try {
      const data = createCompanySchema.parse(req.body);
      const company = await prisma.company.create({ data });
      console.log(`Company created: ${company.razaoSocial} (id=${company.id})`);
      return res.status(201).json(company);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: (error as any).errors });
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          return res.status(400).json({ error: 'Company with this CNPJ already exists' });
        }
        console.error('Prisma error in company.create:', error.code, error.message);
        return res.status(500).json({ error: 'Database error', code: error.code });
      }
      console.error('Error in company.create:', error);
      return res.status(500).json({
        error: 'Internal server error',
        details: process.env.NODE_ENV !== 'production' && error instanceof Error ? error.message : undefined,
      });
    }
  },

  async getMyCompany(req: Request, res: Response) {
    try {
      const companyId = (req as any).companyId;
      if (!companyId) {
        return res.status(400).json({ error: 'User is not associated with any company' });
      }

      const company = await prisma.company.findUnique({
        where: { id: companyId }
      });

      if (!company) {
        return res.status(404).json({ error: 'Company not found' });
      }

      return res.json(company);
    } catch (error) {
      console.error('Error in getMyCompany:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  async updateMyCompany(req: Request, res: Response) {
    try {
      const companyId = (req as any).companyId;
      if (!companyId) {
        return res.status(400).json({ error: 'User is not associated with any company' });
      }

      // Check if user is ADMIN or ADMINISTRADOR
      const role = (req as any).role;
      if (role !== 'ADMIN' && role !== 'ADMINISTRADOR') {
        return res.status(403).json({ error: 'Only administrators can update workshop profiles' });
      }

      // Validate request body
      const data = updateCompanySchema.parse(req.body);

      const company = await prisma.company.update({
        where: { id: companyId },
        data,
      });

      console.log(`Company updated: ${company.razaoSocial} (id=${company.id})`);
      return res.json(company);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.issues });
      }
      console.error('Error in updateMyCompany:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  // CRUD for sub-companies (Budget emission profiles)
  async listBudgetCompanies(req: Request, res: Response) {
    try {
      const companyId = (req as any).companyId;
      const budgetCompanies = await prisma.company.findMany({
        where: { parentCompanyId: companyId }
      });
      return res.json(budgetCompanies);
    } catch (error) {
      console.error('Error in listBudgetCompanies:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  async createBudgetCompany(req: Request, res: Response) {
    try {
      const companyId = (req as any).companyId;
      const data = budgetCompanyCreateSchema.parse(req.body);

      const budgetCompany = await prisma.company.create({
        data: {
          ...data,
          parentCompanyId: companyId
        }
      });

      console.log(`Budget Company created: ${budgetCompany.razaoSocial} under owner ${companyId}`);
      return res.status(201).json(budgetCompany);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.issues });
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          return res.status(400).json({ error: 'CNPJ already exists' });
        }
      }
      console.error('Error in createBudgetCompany:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  async updateBudgetCompany(req: Request, res: Response) {
    try {
      const companyId = (req as any).companyId as string;
      const id = req.params.id as string;
      const data = updateCompanySchema.parse(req.body);

      // Verify ownership before update
      const existing = await prisma.company.findFirst({
        where: { id, parentCompanyId: companyId }
      });

      if (!existing) {
        return res.status(404).json({ error: 'Budget company not found or access denied' });
      }

      const updated = await prisma.company.update({
        where: { id },
        data
      });

      console.log(`Budget Company updated: ${updated.razaoSocial} (id=${updated.id})`);
      return res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.issues });
      }
      console.error('Error in updateBudgetCompany:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  async deleteBudgetCompany(req: Request, res: Response) {
    try {
      const companyId = (req as any).companyId as string;
      const id = req.params.id as string;

      // Verify ownership before delete
      const existing = await prisma.company.findFirst({
        where: { id, parentCompanyId: companyId }
      });

      if (!existing) {
        return res.status(404).json({ error: 'Budget company not found or access denied' });
      }

      await prisma.company.delete({
        where: { id }
      });

      console.log(`Budget Company deleted: (id=${id})`);
      return res.status(204).send();
    } catch (error) {
      console.error('Error in deleteBudgetCompany:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
};
