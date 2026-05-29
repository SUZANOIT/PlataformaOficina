import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { z } from 'zod';
import { AuditLogger } from '../utils/audit.logger';

const platformSchema = z.object({
  razaoSocial: z.string().min(1, 'Razão Social é obrigatória'),
  nomeFantasia: z.string().min(1, 'Nome Fantasia é obrigatório'),
  cnpj: z.string().min(14, 'CNPJ inválido'),
  telefone: z.string().min(1, 'Telefone é obrigatório'),
  email: z.string().email('E-mail inválido'),
  responsavel: z.string().optional().nullable(),
  status: z.enum(['ATIVO', 'INATIVO']).default('ATIVO'),
  observacoes: z.string().optional().nullable(),
  endereco: z.string().optional().nullable(),
  cidade: z.string().optional().nullable(),
  estado: z.string().optional().nullable(),
  cep: z.string().optional().nullable(),
});

export const PlatformController = {
  async list(req: Request, res: Response) {
    try {
      const companyId = (req as any).companyId;
      const { search, status, page = '1', limit = '10' } = req.query;
      
      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);
      const skip = (pageNum - 1) * limitNum;

      const whereClause: any = { companyId };

      if (status && status !== 'TODOS') {
        whereClause.status = status as string;
      }

      if (search) {
        const searchStr = search as string;
        whereClause.AND = [
          {
            OR: [
              { nomeFantasia: { contains: searchStr, mode: 'insensitive' } },
              { razaoSocial: { contains: searchStr, mode: 'insensitive' } },
              { cnpj: { contains: searchStr, mode: 'insensitive' } },
            ]
          }
        ];
      }

      const [platforms, total] = await Promise.all([
        prisma.plataformaGestao.findMany({
          where: whereClause,
          orderBy: { nomeFantasia: 'asc' },
          skip,
          take: limitNum,
        }),
        prisma.plataformaGestao.count({ where: whereClause }),
      ]);

      return res.json({
        data: platforms,
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum),
      });
    } catch (error) {
      console.error('Error listing platforms:', error);
      return res.status(500).json({ error: 'Erro ao listar plataformas de gestão' });
    }
  },

  async create(req: Request, res: Response) {
    try {
      const companyId = (req as any).companyId;
      const userId = (req as any).userId;
      const data = platformSchema.parse(req.body);
      
      const cnpjSemMascara = data.cnpj.replace(/\D/g, '');
      if (cnpjSemMascara.length !== 14) {
        return res.status(400).json({ error: 'CNPJ deve conter exatamente 14 dígitos' });
      }

      // Check duplicate CNPJ
      const duplicate = await prisma.plataformaGestao.findFirst({
        where: {
          companyId,
          cnpjSemMascara,
        }
      });

      if (duplicate) {
        AuditLogger.log(userId, companyId, 'CREATE_PLATFORM', `Attempted duplicate platform CNPJ: ${data.cnpj}`, 'DUPLICATE_ATTEMPT');
        return res.status(409).json({ error: 'Já existe um cadastro com os dados informados.', code: 'DUPLICATE_RECORD' });
      }

      const platform = await prisma.plataformaGestao.create({
        data: {
          ...data,
          cnpjSemMascara,
          companyId,
        }
      });

      AuditLogger.log(userId, companyId, 'CREATE_PLATFORM', `Created platform: ${platform.nomeFantasia} (${platform.id})`, 'SUCCESS');
      return res.status(201).json(platform);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: (error as any).errors[0]?.message || 'Erro de validação' });
      }
      console.error('Error creating platform:', error);
      return res.status(500).json({ error: 'Erro ao cadastrar plataforma de gestão' });
    }
  },

  async update(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const companyId = (req as any).companyId as string;
      const userId = (req as any).userId;
      const data = platformSchema.parse(req.body);

      const cnpjSemMascara = data.cnpj.replace(/\D/g, '');
      if (cnpjSemMascara.length !== 14) {
        return res.status(400).json({ error: 'CNPJ deve conter exatamente 14 dígitos' });
      }

      // Check ownership
      const existing = await prisma.plataformaGestao.findFirst({
        where: { id, companyId }
      });

      if (!existing) {
        return res.status(404).json({ error: 'Plataforma de gestão não encontrada ou acesso não autorizado' });
      }

      // Check duplicate CNPJ on other platforms
      const duplicate = await prisma.plataformaGestao.findFirst({
        where: {
          companyId,
          cnpjSemMascara,
          id: { not: id },
        }
      });

      if (duplicate) {
        AuditLogger.log(userId, companyId, 'UPDATE_PLATFORM', `Attempted duplicate platform CNPJ update: ${data.cnpj}`, 'DUPLICATE_ATTEMPT');
        return res.status(409).json({ error: 'Já existe um cadastro com os dados informados.', code: 'DUPLICATE_RECORD' });
      }

      const platform = await prisma.plataformaGestao.update({
        where: { id },
        data: {
          ...data,
          cnpjSemMascara,
        }
      });

      AuditLogger.log(userId, companyId, 'UPDATE_PLATFORM', `Updated platform: ${platform.nomeFantasia} (${platform.id})`, 'SUCCESS');
      return res.json(platform);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: (error as any).errors[0]?.message || 'Erro de validação' });
      }
      console.error('Error updating platform:', error);
      return res.status(500).json({ error: 'Erro ao atualizar plataforma de gestão' });
    }
  },

  async delete(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const companyId = (req as any).companyId as string;

      // Check ownership
      const existing = await prisma.plataformaGestao.findFirst({
        where: { id, companyId }
      });

      if (!existing) {
        return res.status(404).json({ error: 'Plataforma de gestão não encontrada ou acesso não autorizado' });
      }

      await prisma.plataformaGestao.delete({
        where: { id }
      });

      return res.status(204).send();
    } catch (error) {
      console.error('Error deleting platform:', error);
      return res.status(500).json({ error: 'Erro ao excluir plataforma de gestão' });
    }
  }
};
