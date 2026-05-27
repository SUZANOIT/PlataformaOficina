import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { z } from 'zod';

const createAdvanceSchema = z.object({
  valor: z.number().positive(),
  formaPagamento: z.string(),
  observacoes: z.string().optional().nullable(),
  data: z.string().optional().nullable(),
  oficinaId: z.string().optional().nullable(),
});

export const AdvanceController = {
  async listAdvances(req: Request, res: Response) {
    try {
      const collaboratorId = req.params.id as string;

      // Verify collaborator exists
      const collaborator = await prisma.collaborator.findUnique({
        where: { id: collaboratorId }
      });

      if (!collaborator) {
        return res.status(404).json({ error: 'Colaborador não encontrado' });
      }

      const advances = await prisma.salaryAdvance.findMany({
        where: { collaboratorId },
        include: {
          pdfs: {
            orderBy: { generatedAt: 'desc' }
          },
          payable: true,
          oficina: true
        },
        orderBy: { data: 'desc' }
      });

      return res.json(advances);
    } catch (error) {
      console.error('Error listing advances:', error);
      return res.status(500).json({ error: 'Erro ao listar adiantamentos' });
    }
  },

  async createAdvance(req: Request, res: Response) {
    try {
      const collaboratorId = req.params.id as string;
      const dataParsed = createAdvanceSchema.parse(req.body);

      // Verify collaborator exists and fetch details
      const collaborator = await prisma.collaborator.findUnique({
        where: { id: collaboratorId }
      });

      if (!collaborator) {
        return res.status(404).json({ error: 'Colaborador não encontrado' });
      }

      // Fetch logged-in user name
      const userId = (req as any).userId;
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });
      const responsavel = user?.name || 'Sistema';

      // Capture active companyId
      const companyId = collaborator.companyId || (req as any).companyId;
      if (!companyId) {
        return res.status(400).json({ error: 'Nenhuma empresa vinculada ao colaborador ou usuário' });
      }

      // Unique receipt ID ADV-YYYYMMDD-[4-char-random]
      const todayStr = new Date().toISOString().substring(0, 10).replace(/-/g, '');
      const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
      const numeroComprovante = `ADV-${todayStr}-${randomHex}`;

      const advanceDate = dataParsed.data ? new Date(dataParsed.data) : new Date();

      // 1. Auto-create Corresponding FinancialPayable (Contas a Pagar)
      const payable = await prisma.financialPayable.create({
        data: {
          companyId,
          fornecedor: collaborator.nome,
          categoria: 'Adiantamento Salarial',
          centroCusto: 'Pessoal',
          descricao: `Adiantamento Salarial - ${collaborator.nome} (${numeroComprovante})`,
          valor: dataParsed.valor,
          dataEmissao: advanceDate,
          vencimento: advanceDate,
          dataPagamento: advanceDate,
          formaPagamento: dataParsed.formaPagamento,
          responsavel: responsavel,
          status: 'PAGA', // Automatically Paid
          observacoes: dataParsed.observacoes || 'Lançamento automático de adiantamento salarial'
        }
      });

      // 2. Create SalaryAdvance
      const advance = await prisma.salaryAdvance.create({
        data: {
          collaboratorId,
          valor: dataParsed.valor,
          formaPagamento: dataParsed.formaPagamento,
          status: 'PENDENTE',
          data: advanceDate,
          responsavel: responsavel,
          observacoes: dataParsed.observacoes || null,
          numeroComprovante,
          payableId: payable.id,
          oficinaId: dataParsed.oficinaId || null
        },
        include: {
          pdfs: true,
          payable: true,
          oficina: true
        }
      });

      return res.status(201).json(advance);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.issues });
      }
      console.error('Error creating advance:', error);
      return res.status(500).json({ error: 'Erro ao cadastrar adiantamento' });
    }
  },

  async updateAdvanceStatus(req: Request, res: Response) {
    try {
      const advanceId = req.params.advanceId as string;
      const { status } = req.body;

      if (!status || !['PENDENTE', 'DESCONTADO_EM_FOLHA'].includes(status)) {
        return res.status(400).json({ error: 'Status inválido. Use PENDENTE ou DESCONTADO_EM_FOLHA' });
      }

      const advance = await prisma.salaryAdvance.update({
        where: { id: advanceId },
        data: { status },
        include: {
          pdfs: true,
          payable: true
        }
      });

      return res.json(advance);
    } catch (error) {
      console.error('Error updating advance status:', error);
      return res.status(500).json({ error: 'Erro ao atualizar status do adiantamento' });
    }
  },

  async deleteAdvance(req: Request, res: Response) {
    try {
      const advanceId = req.params.advanceId as string;

      const advance = await prisma.salaryAdvance.findUnique({
        where: { id: advanceId }
      });

      if (!advance) {
        return res.status(404).json({ error: 'Adiantamento não encontrado' });
      }

      // Delete the advance (associated payable is kept but unlinked or optionally deleted. Let's delete it too to keep clean records)
      if (advance.payableId) {
        try {
          await prisma.financialPayable.delete({
            where: { id: advance.payableId }
          });
        } catch (e) {
          console.warn('Linked payable not found or already deleted:', e);
        }
      }

      await prisma.salaryAdvance.delete({
        where: { id: advanceId }
      });

      return res.status(204).send();
    } catch (error) {
      console.error('Error deleting advance:', error);
      return res.status(500).json({ error: 'Erro ao excluir adiantamento' });
    }
  },

  async logPdfGeneration(req: Request, res: Response) {
    try {
      const advanceId = req.params.advanceId as string;
      const { fileName } = req.body;

      if (!fileName) {
        return res.status(400).json({ error: 'Nome do arquivo é obrigatório' });
      }

      const advance = await prisma.salaryAdvance.findUnique({
        where: { id: advanceId }
      });

      if (!advance) {
        return res.status(404).json({ error: 'Adiantamento não encontrado' });
      }

      const pdfLog = await prisma.salaryAdvancePdf.create({
        data: {
          salaryAdvanceId: advanceId,
          fileName
        }
      });

      return res.status(201).json(pdfLog);
    } catch (error) {
      console.error('Error logging PDF generation:', error);
      return res.status(500).json({ error: 'Erro ao salvar logs de comprovante' });
    }
  }
};
