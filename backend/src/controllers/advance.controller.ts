import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { z } from 'zod';

const createAdvanceSchema = z.object({
  valor: z.number().positive(),
  formaPagamento: z.string(),
  observacoes: z.string().optional().nullable(),
  data: z.string().optional().nullable(),
  paymentDate: z.string(),
  oficinaId: z.string().optional().nullable(),
});

export const AdvanceController = {
  async listAdvances(req: Request, res: Response) {
    try {
      const collaboratorId = req.params.id as string;
      const companyId = (req as any).companyId || null;

      // Verify collaborator exists and belongs to the company
      const collaborator = await prisma.collaborator.findFirst({
        where: { id: collaboratorId, companyId }
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
      const companyId = (req as any).companyId || null;
      const dataParsed = createAdvanceSchema.parse(req.body);

      // Verify collaborator exists and belongs to the company
      const collaborator = await prisma.collaborator.findFirst({
        where: { id: collaboratorId, companyId }
      });

      if (!collaborator) {
        return res.status(404).json({ error: 'Colaborador não encontrado' });
      }

      if (collaborator.status === 'INATIVO') {
        return res.status(400).json({ error: 'Não é permitido registrar adiantamentos para colaboradores inativos.' });
      }

      // Calculate available balance for the month of the advance
      const advanceDate = dataParsed.data ? new Date(dataParsed.data) : new Date();
      const paymentDateObj = new Date(dataParsed.paymentDate);
      const competencyMonth = paymentDateObj.getUTCMonth();
      const competencyYear = paymentDateObj.getUTCFullYear();
      const payrollCompetency = `${String(competencyMonth + 1).padStart(2, '0')}/${competencyYear}`;

      const startOfMonth = new Date(Date.UTC(competencyYear, competencyMonth, 1));
      const endOfMonth = new Date(Date.UTC(competencyYear, competencyMonth + 1, 0, 23, 59, 59, 999));

      const currentMonthAdvances = await prisma.salaryAdvance.findMany({
        where: {
          collaboratorId,
          OR: [
            { payroll_competency: payrollCompetency },
            { 
              data: {
                gte: startOfMonth,
                lte: endOfMonth
              },
              payroll_competency: null
            }
          ]
        }
      });
      const totalAdvancesCurrentMonth = currentMonthAdvances.reduce((sum, adv) => sum + adv.valor, 0);

      const unexcusedAbsences = await prisma.employeeAbsence.findMany({
        where: {
          collaboratorId,
          tipo: 'NAO_JUSTIFICADA',
          dataFalta: {
            gte: startOfMonth,
            lte: endOfMonth
          }
        }
      });
      const unexcusedDays = unexcusedAbsences.reduce((sum, a) => sum + (a.diasFalta || 1), 0);
      const baseSalary = collaborator.salario || 0;
      const totalDiscountsCurrentMonth = unexcusedDays * (baseSalary / 30);
      const availableBalance = Math.max(0, baseSalary - totalAdvancesCurrentMonth - totalDiscountsCurrentMonth);

      if (dataParsed.valor > availableBalance) {
        return res.status(400).json({
          error: `O valor do adiantamento (R$ ${dataParsed.valor.toFixed(2)}) excede o saldo disponível para o mês (R$ ${availableBalance.toFixed(2)}).`
        });
      }

      // Fetch logged-in user name
      const userId = (req as any).userId;
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });
      const responsavel = user?.name || 'Sistema';

      if (!companyId) {
        return res.status(400).json({ error: 'Nenhuma empresa vinculada ao colaborador ou usuário' });
      }

      // Unique receipt ID ADV-YYYYMMDD-[4-char-random]
      const todayStr = new Date().toISOString().substring(0, 10).replace(/-/g, '');
      const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
      const numeroComprovante = `ADV-${todayStr}-${randomHex}`;

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
          observacoes: dataParsed.observacoes || 'Lançamento automático de adiantamento salarial',
          responsavel_lancamento_id: userId || null,
          responsavel_lancamento_nome: responsavel,
          data_criacao: new Date()
        }
      });

      // Write audit log for the auto-created payable
      const auditChanges = [
        `Data/Hora: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`,
        `Usuário: ${responsavel}`,
        `Operação: Criação de Conta a Pagar (Adiantamento)`,
        `Origem: Adiantamento Salarial (${numeroComprovante})`,
        `Valor: R$ ${dataParsed.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      ].join('\n');

      await prisma.financialAudit.create({
        data: {
          payableId: payable.id,
          action: 'CREATE',
          newStatus: 'PAGA',
          user: responsavel,
          changes: auditChanges
        }
      });

      // Verify if the provided oficinaId is a valid Oficina record belonging to the company
      let targetOficinaId: string | null = null;
      if (dataParsed.oficinaId) {
        const oficinaExists = await prisma.oficina.findFirst({
          where: { id: dataParsed.oficinaId, companyId }
        });
        if (oficinaExists) {
          targetOficinaId = dataParsed.oficinaId;
        }
      }

      // If the provided one is not a valid Oficina, fall back to the collaborator's associated oficinaId (if valid)
      if (!targetOficinaId && collaborator.oficinaId) {
        const oficinaExists = await prisma.oficina.findFirst({
          where: { id: collaborator.oficinaId, companyId }
        });
        if (oficinaExists) {
          targetOficinaId = collaborator.oficinaId;
        }
      }

      // 2. Create SalaryAdvance
      const advance = await prisma.salaryAdvance.create({
        data: {
          collaboratorId,
          valor: dataParsed.valor,
          formaPagamento: dataParsed.formaPagamento,
          status: 'PENDENTE',
          discount_status: 'PENDENTE',
          data: advanceDate,
          payment_date: paymentDateObj,
          payroll_competency: payrollCompetency,
          responsavel: responsavel,
          observacoes: dataParsed.observacoes || null,
          numeroComprovante,
          payableId: payable.id,
          oficinaId: targetOficinaId
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
      const companyId = (req as any).companyId || null;
      const userId = (req as any).userId;
      const user = await prisma.user.findUnique({ where: { id: userId } });
      const userNome = user?.name || 'Sistema';
      const { status } = req.body;

      if (!status || !['PENDENTE', 'APROVADO', 'REPROVADO', 'DESCONTADO_EM_FOLHA'].includes(status)) {
        return res.status(400).json({ error: 'Status inválido. Use PENDENTE, APROVADO, REPROVADO ou DESCONTADO_EM_FOLHA' });
      }

      const advance = await prisma.salaryAdvance.findUnique({
        where: { id: advanceId },
        include: { collaborator: true }
      });

      if (!advance || advance.collaborator.companyId !== companyId) {
        return res.status(404).json({ error: 'Adiantamento não encontrado' });
      }

      const updated = await prisma.salaryAdvance.update({
        where: { id: advanceId },
        data: { status },
        include: {
          pdfs: {
            orderBy: { generatedAt: 'desc' }
          },
          payable: true
        }
      });

      let auditAction = 'ALTERACAO_STATUS_ADIANTAMENTO';
      if (status === 'APROVADO') {
        auditAction = 'APROVACAO_ADIANTAMENTO';
      } else if (status === 'REPROVADO') {
        auditAction = 'REPROVACAO_ADIANTAMENTO';
      }

      await prisma.absenceAudit.create({
        data: {
          collaboratorId: advance.collaboratorId,
          collaboratorName: advance.collaborator.nome,
          usuario: userNome,
          action: auditAction,
          valorAnterior: `Status: ${advance.status}, Valor: R$ ${advance.valor.toFixed(2)}`,
          valorNovo: `Status: ${status}, Valor: R$ ${advance.valor.toFixed(2)}`,
          companyId: companyId || '',
        }
      });

      return res.json(updated);
    } catch (error) {
      console.error('Error updating advance status:', error);
      return res.status(500).json({ error: 'Erro ao atualizar status do adiantamento' });
    }
  },

  async deleteAdvance(req: Request, res: Response) {
    try {
      const advanceId = req.params.advanceId as string;
      const companyId = (req as any).companyId || null;

      const advance = await prisma.salaryAdvance.findUnique({
        where: { id: advanceId },
        include: { collaborator: true }
      });

      if (!advance || advance.collaborator.companyId !== companyId) {
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

      const userId = (req as any).userId;
      const user = await prisma.user.findUnique({ where: { id: userId } });
      const responsavel = user?.name || 'Sistema';

      await prisma.absenceAudit.create({
        data: {
          collaboratorId: advance.collaboratorId,
          collaboratorName: advance.collaborator.nome,
          usuario: responsavel,
          action: 'CANCELAMENTO_ADIANTAMENTO',
          valorAnterior: advance.valor.toString(),
          valorNovo: '0',
          companyId: companyId
        }
      });

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
      const companyId = (req as any).companyId || null;
      const { fileName } = req.body;

      if (!fileName) {
        return res.status(400).json({ error: 'Nome do arquivo é obrigatório' });
      }

      const advance = await prisma.salaryAdvance.findUnique({
        where: { id: advanceId },
        include: { collaborator: true }
      });

      if (!advance || advance.collaborator.companyId !== companyId) {
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
