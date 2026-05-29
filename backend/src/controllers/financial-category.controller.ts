import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { z } from 'zod';

const categorySchema = z.object({
  name: z.string().min(1, 'O nome é obrigatório'),
  type: z.enum(['PAYABLE', 'RECEIVABLE', 'BOTH']),
});

export class FinancialCategoryController {
  private static async getCompanyId(req: Request): Promise<string | null> {
    let companyId = (req as any).companyId as string;
    
    if (!companyId && req.query.companyId) {
      companyId = req.query.companyId as string;
    }
    
    if (!companyId && req.body && req.body.companyId) {
      companyId = req.body.companyId as string;
    }
    
    if (!companyId) {
      const firstCompany = await prisma.company.findFirst();
      if (firstCompany) {
        companyId = firstCompany.id;
      }
    }
    
    return companyId || null;
  }

  static async list(req: Request, res: Response) {
    try {
      const companyId = await FinancialCategoryController.getCompanyId(req);
      if (!companyId) {
        return res.status(400).json({ error: 'Empresa não identificada' });
      }

      // Buscar categorias cadastradas
      let categories = await prisma.financialCategory.findMany({
        where: { companyId },
        orderBy: { name: 'asc' },
      });

      // Se não houver nenhuma, faz o seeding automático com as padrões
      if (categories.length === 0) {
        const defaultCategories = [
          // Contas a Pagar (PAYABLE)
          { name: 'Aluguel', type: 'PAYABLE', companyId },
          { name: 'Energia/Água/Internet', type: 'PAYABLE', companyId },
          { name: 'Ferramentas', type: 'PAYABLE', companyId },
          { name: 'Impostos/Taxas', type: 'PAYABLE', companyId },
          { name: 'Marketing/Anúncios', type: 'PAYABLE', companyId },
          { name: 'Peças/Estoque', type: 'PAYABLE', companyId },
          { name: 'Salários/Encargos', type: 'PAYABLE', companyId },
          { name: 'Serviços Terceirizados', type: 'PAYABLE', companyId },
          { name: 'Outros', type: 'PAYABLE', companyId },
          
          // Contas a Receber (RECEIVABLE)
          { name: 'Venda de Peças', type: 'RECEIVABLE', companyId },
          { name: 'Prestação de Serviços', type: 'RECEIVABLE', companyId },
          { name: 'Contrato de Manutenção', type: 'RECEIVABLE', companyId },
          { name: 'Garantias', type: 'RECEIVABLE', companyId },
          { name: 'Venda de Ativos', type: 'RECEIVABLE', companyId },
          { name: 'Outros', type: 'RECEIVABLE', companyId }
        ];

        await prisma.financialCategory.createMany({
          data: defaultCategories,
        });

        // Buscar novamente após seeding
        categories = await prisma.financialCategory.findMany({
          where: { companyId },
          orderBy: { name: 'asc' },
        });
      }

      return res.json(categories);
    } catch (error: any) {
      console.error('Erro ao listar categorias financeiras:', error);
      return res.status(500).json({ error: 'Erro interno ao carregar categorias' });
    }
  }

  static async create(req: Request, res: Response) {
    try {
      const companyId = await FinancialCategoryController.getCompanyId(req);
      if (!companyId) {
        return res.status(400).json({ error: 'Empresa não identificada' });
      }

      const parsed = categorySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0].message });
      }

      const { name, type } = parsed.data;

      // Verificar duplicidade
      const exists = await prisma.financialCategory.findFirst({
        where: {
          companyId,
          name: { equals: name, mode: 'insensitive' },
          type,
        },
      });

      if (exists) {
        return res.status(400).json({ error: 'Já existe uma categoria com este nome e tipo cadastrada.' });
      }

      const newCategory = await prisma.financialCategory.create({
        data: {
          name,
          type,
          companyId,
        },
      });

      return res.status(201).json(newCategory);
    } catch (error: any) {
      console.error('Erro ao criar categoria financeira:', error);
      return res.status(500).json({ error: 'Erro interno ao criar categoria' });
    }
  }

  static async update(req: Request, res: Response) {
    try {
      const companyId = await FinancialCategoryController.getCompanyId(req);
      const id = req.params.id as string;

      if (!companyId) {
        return res.status(400).json({ error: 'Empresa não identificada' });
      }

      const parsed = categorySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0].message });
      }

      const { name, type } = parsed.data;

      // Verificar se a categoria existe e pertence à empresa
      const category = await prisma.financialCategory.findFirst({
        where: { id, companyId },
      });

      if (!category) {
        return res.status(404).json({ error: 'Categoria não encontrada' });
      }

      // Verificar duplicidade com outra categoria
      const duplicate = await prisma.financialCategory.findFirst({
        where: {
          companyId,
          name: { equals: name, mode: 'insensitive' },
          type,
          id: { not: id },
        },
      });

      if (duplicate) {
        return res.status(400).json({ error: 'Já existe outra categoria com este nome e tipo.' });
      }

      const updated = await prisma.financialCategory.update({
        where: { id },
        data: { name, type },
      });

      return res.json(updated);
    } catch (error: any) {
      console.error('Erro ao atualizar categoria financeira:', error);
      return res.status(500).json({ error: 'Erro interno ao atualizar categoria' });
    }
  }

  static async delete(req: Request, res: Response) {
    try {
      const companyId = await FinancialCategoryController.getCompanyId(req);
      const id = req.params.id as string;

      if (!companyId) {
        return res.status(400).json({ error: 'Empresa não identificada' });
      }

      // Verificar se a categoria existe
      const category = await prisma.financialCategory.findFirst({
        where: { id, companyId },
      });

      if (!category) {
        return res.status(404).json({ error: 'Categoria não encontrada' });
      }

      await prisma.financialCategory.delete({
        where: { id },
      });

      return res.json({ success: true });
    } catch (error: any) {
      console.error('Erro ao excluir categoria financeira:', error);
      return res.status(500).json({ error: 'Erro interno ao excluir categoria' });
    }
  }
}
