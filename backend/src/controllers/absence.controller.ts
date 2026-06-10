import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { z } from 'zod';
import { AuditLogger } from '../utils/audit.logger';

// Parse date string (YYYY-MM-DD) as UTC to avoid timezone shift
function parseLocalDate(val: string): Date {
  const [year, month, day] = val.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

const createAbsenceSchema = z.object({
  collaboratorId: z.string(),
  dataFalta: z.string(), // YYYY-MM-DD
  tipo: z.enum(['JUSTIFICADA', 'NAO_JUSTIFICADA']),
  diasFalta: z.number().int().positive().default(1),
  motivo: z.string().optional().nullable(),
  observacao: z.string().optional().nullable(),
  fileName: z.string().optional().nullable(),
  fileType: z.string().optional().nullable(),
  fileUrl: z.string().optional().nullable(),
});

const updateAbsenceSchema = z.object({
  dataFalta: z.string(), // YYYY-MM-DD
  tipo: z.enum(['JUSTIFICADA', 'NAO_JUSTIFICADA']),
  diasFalta: z.number().int().positive().default(1),
  motivo: z.string().optional().nullable(),
  observacao: z.string().optional().nullable(),
  fileName: z.string().optional().nullable(),
  fileType: z.string().optional().nullable(),
  fileUrl: z.string().optional().nullable(),
});

// Helper to recalculate employee accumulated absences cache
async function recalculateCollaboratorAbsences(collaboratorId: string) {
  const collaborator = await prisma.collaborator.findUnique({
    where: { id: collaboratorId },
  });
  if (!collaborator) return;

  const absences = await prisma.employeeAbsence.findMany({
    where: { collaboratorId, tipo: 'NAO_JUSTIFICADA' },
  });

  const baseSalary = collaborator.salario || 0;
  const totalFaltas = absences.reduce((sum, a) => sum + (a.diasFalta || 1), 0);
  const totalDesconto = totalFaltas * (baseSalary / 30);

  await prisma.collaborator.update({
    where: { id: collaboratorId },
    data: {
      faltas: totalFaltas,
      descontoAusencia: totalDesconto,
      dataUltimaAtualizacao: new Date(),
    },
  });
}

export const AbsenceController = {
  // 1. List Absences
  async listAbsences(req: Request, res: Response) {
    try {
      const companyId = (req as any).companyId || null;
      const userId = (req as any).userId;
      const user = await prisma.user.findUnique({ where: { id: userId } });

      const { startDate, endDate, collaboratorId, tipo } = req.query as any;

      const whereClause: any = { companyId };

      // Restrição de colaborador só se aplica a quem não é Admin/RH
      if (user?.roleColaborador && !user.roleAdmin && !user.roleRh) {
        const collaborator = await prisma.collaborator.findFirst({
          where: { email: user.email, companyId },
        });
        if (!collaborator) {
          return res.json([]);
        }
        whereClause.collaboratorId = collaborator.id;
      } else if (collaboratorId) {
        whereClause.collaboratorId = collaboratorId;
      }

      if (tipo) {
        whereClause.tipo = tipo;
      }

      if (startDate || endDate) {
        whereClause.dataFalta = {};
        if (startDate) {
          whereClause.dataFalta.gte = parseLocalDate(startDate);
        }
        if (endDate) {
          const end = parseLocalDate(endDate);
          end.setUTCHours(23, 59, 59, 999);
          whereClause.dataFalta.lte = end;
        }
      }

      const absences = await prisma.employeeAbsence.findMany({
        where: whereClause,
        include: {
          collaborator: true,
        },
        orderBy: { dataFalta: 'desc' },
      });

      return res.json(absences);
    } catch (error) {
      console.error('Error listing absences:', error);
      return res.status(500).json({ error: 'Erro ao listar faltas.' });
    }
  },

  // 2. Create Absence
  async createAbsence(req: Request, res: Response) {
    try {
      const companyId = (req as any).companyId || null;
      const userId = (req as any).userId || null;

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user?.roleAdmin && !user?.roleRh) {
        return res.status(403).json({ error: 'Acesso negado. Apenas Admin ou RH podem registrar faltas.' });
      }

      const body = createAbsenceSchema.parse(req.body);

      const collaborator = await prisma.collaborator.findFirst({
        where: { id: body.collaboratorId, companyId },
      });
      if (!collaborator) {
        return res.status(404).json({ error: 'Colaborador não encontrado.' });
      }

      const parsedDate = parseLocalDate(body.dataFalta);

      const absence = await prisma.employeeAbsence.create({
        data: {
          collaboratorId: body.collaboratorId,
          dataFalta: parsedDate,
          tipo: body.tipo,
          diasFalta: body.diasFalta,
          motivo: body.motivo,
          observacao: body.observacao,
          fileName: body.fileName,
          fileType: body.fileType,
          fileUrl: body.fileUrl,
          responsavelId: userId,
          responsavelNome: user.name,
          companyId,
          oficinaId: collaborator.oficinaId,
        },
        include: {
          collaborator: true,
        },
      });

      // Recalculate collaborator cache values
      await recalculateCollaboratorAbsences(body.collaboratorId);

      // Save Audit Log
      const baseSalary = collaborator.salario || 0;
      const calculatedDiscount = body.tipo === 'NAO_JUSTIFICADA' ? (body.diasFalta * (baseSalary / 30)) : 0;
      
      await prisma.absenceAudit.create({
        data: {
          collaboratorId: collaborator.id,
          collaboratorName: collaborator.nome,
          usuario: user.name,
          action: 'INCLUSAO_FALTAS',
          valorAnterior: 'Nenhuma falta registrada nesta data',
          valorNovo: `Data: ${body.dataFalta}, Dias: ${body.diasFalta}, Motivo: ${body.motivo || 'N/A'}, Tipo: ${body.tipo}, Desconto: R$ ${calculatedDiscount.toFixed(2)}`,
          companyId: companyId || '',
        },
      });

      AuditLogger.log(userId, companyId, 'CREATE_ABSENCE', `Created absence for collaborator: ${collaborator.nome} (${collaborator.id}), date: ${body.dataFalta}, type: ${body.tipo}, days: ${body.diasFalta}`, 'SUCCESS');

      return res.status(201).json(absence);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.issues });
      }
      console.error('Error creating absence:', error);
      return res.status(500).json({ error: 'Erro ao cadastrar falta.' });
    }
  },

  // 3. Update Absence
  async updateAbsence(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const companyId = (req as any).companyId || null;
      const userId = (req as any).userId || null;

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user?.roleAdmin && !user?.roleRh) {
        return res.status(403).json({ error: 'Acesso negado. Apenas Admin ou RH podem alterar faltas.' });
      }

      const body = updateAbsenceSchema.parse(req.body);

      const existingAbsence = await prisma.employeeAbsence.findFirst({
        where: { id, companyId },
        include: { collaborator: true },
      });
      if (!existingAbsence) {
        return res.status(404).json({ error: 'Registro de falta não encontrado.' });
      }

      const parsedDate = parseLocalDate(body.dataFalta);

      const updated = await prisma.employeeAbsence.update({
        where: { id },
        data: {
          dataFalta: parsedDate,
          tipo: body.tipo,
          diasFalta: body.diasFalta,
          motivo: body.motivo,
          observacao: body.observacao,
          fileName: body.fileName,
          fileType: body.fileType,
          fileUrl: body.fileUrl,
        },
        include: {
          collaborator: true,
        },
      });

      // Recalculate collaborator cache values
      await recalculateCollaboratorAbsences(existingAbsence.collaboratorId);

      // Save Audit Log
      const baseSalary = existingAbsence.collaborator.salario || 0;
      const oldDiscount = existingAbsence.tipo === 'NAO_JUSTIFICADA' ? ((existingAbsence.diasFalta || 1) * (baseSalary / 30)) : 0;
      const newDiscount = body.tipo === 'NAO_JUSTIFICADA' ? (body.diasFalta * (baseSalary / 30)) : 0;

      await prisma.absenceAudit.create({
        data: {
          collaboratorId: existingAbsence.collaborator.id,
          collaboratorName: existingAbsence.collaborator.nome,
          usuario: user.name,
          action: 'ALTERACAO_FALTAS',
          valorAnterior: `Data: ${existingAbsence.dataFalta.toISOString().substring(0, 10)}, Dias: ${existingAbsence.diasFalta || 1}, Motivo: ${existingAbsence.motivo || 'N/A'}, Tipo: ${existingAbsence.tipo}, Desconto: R$ ${oldDiscount.toFixed(2)}`,
          valorNovo: `Data: ${body.dataFalta}, Dias: ${body.diasFalta}, Motivo: ${body.motivo || 'N/A'}, Tipo: ${body.tipo}, Desconto: R$ ${newDiscount.toFixed(2)}`,
          companyId: companyId || '',
        },
      });

      AuditLogger.log(userId, companyId, 'UPDATE_ABSENCE', `Updated absence id: ${id} for collaborator: ${existingAbsence.collaborator.nome}, new date: ${body.dataFalta}, new type: ${body.tipo}, days: ${body.diasFalta}`, 'SUCCESS');

      return res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.issues });
      }
      console.error('Error updating absence:', error);
      return res.status(500).json({ error: 'Erro ao editar falta.' });
    }
  },

  // 4. Delete Absence
  async deleteAbsence(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const companyId = (req as any).companyId || null;
      const userId = (req as any).userId || null;

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user?.roleAdmin && !user?.roleRh) {
        return res.status(403).json({ error: 'Acesso negado. Apenas Admin ou RH podem excluir faltas.' });
      }

      const existingAbsence = await prisma.employeeAbsence.findFirst({
        where: { id, companyId },
        include: { collaborator: true },
      });
      if (!existingAbsence) {
        return res.status(404).json({ error: 'Registro de falta não encontrado.' });
      }

      await prisma.employeeAbsence.delete({
        where: { id },
      });

      // Recalculate collaborator cache values
      await recalculateCollaboratorAbsences(existingAbsence.collaboratorId);

      // Save Audit Log
      const baseSalary = existingAbsence.collaborator.salario || 0;
      const oldDiscount = existingAbsence.tipo === 'NAO_JUSTIFICADA' ? ((existingAbsence.diasFalta || 1) * (baseSalary / 30)) : 0;

      await prisma.absenceAudit.create({
        data: {
          collaboratorId: existingAbsence.collaborator.id,
          collaboratorName: existingAbsence.collaborator.nome,
          usuario: user.name,
          action: 'EXCLUSAO_FALTAS',
          valorAnterior: `Data: ${existingAbsence.dataFalta.toISOString().substring(0, 10)}, Dias: ${existingAbsence.diasFalta || 1}, Motivo: ${existingAbsence.motivo || 'N/A'}, Tipo: ${existingAbsence.tipo}, Desconto: R$ ${oldDiscount.toFixed(2)}`,
          valorNovo: 'Registro de falta excluído',
          companyId: companyId || '',
        },
      });

      AuditLogger.log(userId, companyId, 'DELETE_ABSENCE', `Deleted absence id: ${id} for collaborator: ${existingAbsence.collaborator.nome}`, 'SUCCESS');

      return res.status(204).send();
    } catch (error) {
      console.error('Error deleting absence:', error);
      return res.status(500).json({ error: 'Erro ao excluir falta.' });
    }
  },

  // 5. Monthly Closing (Calculations)
  async getMonthlyClosing(req: Request, res: Response) {
    try {
      const companyId = (req as any).companyId || null;
      const userId = (req as any).userId;
      const user = await prisma.user.findUnique({ where: { id: userId } });

      const { month, year } = req.query as any;

      const m = month ? parseInt(month) : (new Date().getMonth() + 1);
      const y = year ? parseInt(year) : new Date().getFullYear();

      const startOfMonth = new Date(Date.UTC(y, m - 1, 1));
      const endOfMonth = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));

      const collaboratorWhere: any = { companyId };

      // Restrição de colaborador só se aplica a quem não é Admin/RH
      if (user?.roleColaborador && !user.roleAdmin && !user.roleRh) {
        const collaborator = await prisma.collaborator.findFirst({
          where: { email: user.email, companyId },
        });
        if (!collaborator) {
          return res.json({
            items: [],
            totals: { salarios: 0, descontos: 0, adiantamentos: 0, saldos: 0 },
            status: 'ABERTO'
          });
        }
        collaboratorWhere.id = collaborator.id;
      }

      const collaborators = await prisma.collaborator.findMany({
        where: collaboratorWhere,
        include: {
          absences: {
            where: {
              dataFalta: {
                gte: startOfMonth,
                lte: endOfMonth,
              },
            },
          },
          advances: {
            where: {
              data: {
                gte: startOfMonth,
                lte: endOfMonth,
              },
            },
          },
        },
        orderBy: { nome: 'asc' },
      });

      const competencyStr = `${String(m).padStart(2, '0')}/${y}`;

      const historyRecords = await prisma.absenceHistory.findMany({
        where: {
          companyId: companyId || '',
          competencia: competencyStr,
        },
      });

      const isClosed = historyRecords.length > 0;

      let totalSalarios = 0;
      let totalDescontos = 0;
      let totalAdiantamentos = 0;
      let totalSaldos = 0;

      const items = collaborators.map((collab) => {
        const baseSalary = collab.salario || 0;
        
        // Count unexcused absences
        const unexcusedAbsences = collab.absences.filter((a) => a.tipo === 'NAO_JUSTIFICADA');
        const totalFaltasNaoJustificadas = unexcusedAbsences.reduce((sum, a) => sum + (a.diasFalta || 1), 0);

        // Calculate unexcused discounts
        const totalDescontoFaltas = totalFaltasNaoJustificadas * (baseSalary / 30);

        // Sum advances for the month
        const totalAdiantamentosCollab = collab.advances.reduce((sum, adv) => sum + adv.valor, 0);

        // Net projected salary
        const salarioLiquidoProjetado = Math.max(0, baseSalary - totalDescontoFaltas - totalAdiantamentosCollab);

        totalSalarios += baseSalary;
        totalDescontos += totalDescontoFaltas;
        totalAdiantamentos += totalAdiantamentosCollab;
        totalSaldos += salarioLiquidoProjetado;

        return {
          collaboratorId: collab.id,
          nome: collab.nome,
          salario: baseSalary,
          faltasCount: totalFaltasNaoJustificadas,
          faltasDesconto: totalDescontoFaltas,
          adiantamentos: totalAdiantamentosCollab,
          saldoLiquido: salarioLiquidoProjetado,
        };
      });

      return res.json({
        items,
        totals: {
          salarios: totalSalarios,
          descontos: totalDescontos,
          adiantamentos: totalAdiantamentos,
          saldos: totalSaldos
        },
        status: isClosed ? 'FECHADO' : 'ABERTO'
      });
    } catch (error) {
      console.error('Error getting monthly closing:', error);
      return res.status(500).json({ error: 'Erro ao gerar fechamento mensal.' });
    }
  },

  // 6. Close Month (Freeze closing data into history & generate FinancialPayables)
  async closeMonth(req: Request, res: Response) {
    try {
      const companyId = (req as any).companyId || null;
      const userId = (req as any).userId || null;

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user?.roleAdmin && !user?.roleRh) {
        return res.status(403).json({ error: 'Acesso negado. Apenas Admin ou RH podem fechar o mês.' });
      }

      const { month, year } = req.body;

      if (!month || !year) {
        return res.status(400).json({ error: 'Mês e Ano são obrigatórios.' });
      }

      const m = parseInt(month);
      const y = parseInt(year);
      const competencyStr = `${String(m).padStart(2, '0')}/${y}`;

      const startOfMonth = new Date(Date.UTC(y, m - 1, 1));
      const endOfMonth = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));

      // Fetch collaborators
      const collaborators = await prisma.collaborator.findMany({
        where: { companyId },
        include: {
          absences: {
            where: {
              dataFalta: {
                gte: startOfMonth,
                lte: endOfMonth,
              },
            },
          },
          advances: {
            where: {
              OR: [
                { payroll_competency: competencyStr },
                {
                  data: {
                    gte: startOfMonth,
                    lte: endOfMonth,
                  },
                  payroll_competency: null
                }
              ]
            },
          },
        },
      });

      // Clear existing records for this competency to allow re-closing/updates
      await prisma.absenceHistory.deleteMany({
        where: {
          companyId: companyId || '',
          competencia: competencyStr,
        },
      });

      const historyToCreate = [];
      const fifthOfSubsequentMonth = new Date(Date.UTC(y, m, 5)); // 5th of next month

      for (const collab of collaborators) {
        const baseSalary = collab.salario || 0;
        const unexcusedDays = collab.absences
          .filter((a) => a.tipo === 'NAO_JUSTIFICADA')
          .reduce((sum, a) => sum + (a.diasFalta || 1), 0);
        const totalDesconto = unexcusedDays * (baseSalary / 30);
        const totalAdiantamentos = collab.advances.reduce((sum, adv) => sum + adv.valor, 0);
        const saldoLiquidoProjetado = Math.max(0, baseSalary - totalDesconto - totalAdiantamentos);

        historyToCreate.push({
          collaboratorId: collab.id,
          collaboratorName: collab.nome,
          competencia: competencyStr,
          faltas: unexcusedDays,
          valorDescontado: totalDesconto,
          usuarioResponsavel: user.name,
          companyId: companyId || '',
        });

        // Generate accounts payable record in the financial module
        if (saldoLiquidoProjetado > 0) {
          const descFind = `Folha de Pagamento - Ref: ${competencyStr}`;
          const existingPayable = await prisma.financialPayable.findFirst({
            where: {
              companyId: companyId || '',
              fornecedor: collab.nome,
              categoria: 'Folha de Pagamento',
              descricao: {
                contains: descFind,
              },
            },
          });

          if (!existingPayable) {
            await prisma.financialPayable.create({
              data: {
                companyId: companyId || '',
                fornecedor: collab.nome,
                categoria: 'Folha de Pagamento',
                centroCusto: 'Recursos Humanos',
                descricao: `Folha de Pagamento - ${collab.nome} - Ref: ${competencyStr}`,
                valor: saldoLiquidoProjetado,
                dataEmissao: new Date(),
                vencimento: fifthOfSubsequentMonth,
                formaPagamento: 'TRANSFERÊNCIA',
                responsavel: user.name,
                status: 'PENDENTE',
              },
            });
          }
        }
      }

      if (historyToCreate.length > 0) {
        await prisma.absenceHistory.createMany({
          data: historyToCreate,
        });
      }

      // Automatically mark all salary advances in that month as DESCONTADO_EM_FOLHA
      await prisma.salaryAdvance.updateMany({
        where: {
          collaborator: { companyId },
          OR: [
            { payroll_competency: competencyStr },
            {
              data: {
                gte: startOfMonth,
                lte: endOfMonth,
              },
              payroll_competency: null
            }
          ],
          status: 'PENDENTE',
        },
        data: {
          status: 'DESCONTADO_EM_FOLHA',
          discount_status: 'DESCONTADO',
          discounted_at: new Date(),
          discounted_by: user.name
        },
      });

      // Save Audit Log
      await prisma.absenceAudit.create({
        data: {
          collaboratorId: 'COMPANY_LEVEL',
          collaboratorName: 'TODOS COLABORADORES',
          usuario: user.name,
          action: 'FECHAMENTO_MENSAL',
          valorAnterior: 'Aberto',
          valorNovo: `Fechado Competência ${competencyStr}`,
          companyId: companyId || '',
        },
      });

      AuditLogger.log(userId, companyId, 'CLOSE_MONTH', `Closed month for competency: ${competencyStr}`, 'SUCCESS');

      return res.json({ success: true, message: `Competência ${competencyStr} fechada com sucesso.` });
    } catch (error) {
      console.error('Error closing month:', error);
      return res.status(500).json({ error: 'Erro ao fechar mês.' });
    }
  },

  // 7. Dashboard Stats
  async getDashboardStats(req: Request, res: Response) {
    try {
      const companyId = (req as any).companyId || null;
      const { month, year } = req.query as any;

      const m = month ? parseInt(month) : (new Date().getMonth() + 1);
      const y = year ? parseInt(year) : new Date().getFullYear();

      const startOfMonth = new Date(Date.UTC(y, m - 1, 1));
      const endOfMonth = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));

      const absences = await prisma.employeeAbsence.findMany({
        where: {
          companyId,
          dataFalta: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
        include: {
          collaborator: true,
        },
      });

      const competencyStr = `${String(m).padStart(2, '0')}/${y}`;
      const advances = await prisma.salaryAdvance.findMany({
        where: {
          collaborator: { companyId },
          OR: [
            { payroll_competency: competencyStr },
            {
              data: {
                gte: startOfMonth,
                lte: endOfMonth,
              },
              payroll_competency: null
            }
          ]
        },
      });

      const unexcused = absences.filter((a) => a.tipo === 'NAO_JUSTIFICADA');
      const justified = absences.filter((a) => a.tipo === 'JUSTIFICADA');

      const totalUnexcusedCount = unexcused.reduce((sum, a) => sum + (a.diasFalta || 1), 0);
      const totalJustifiedCount = justified.reduce((sum, a) => sum + (a.diasFalta || 1), 0);

      // Calculate total discount
      const totalDiscount = unexcused.reduce((sum, a) => {
        const base = a.collaborator.salario || 0;
        const days = a.diasFalta || 1;
        return sum + (days * (base / 30));
      }, 0);

      const totalAdvancesAmount = advances.reduce((sum, a) => sum + a.valor, 0);

      // Distribution by department
      const departmentDistribution: Record<string, number> = {};
      absences.forEach((a) => {
        const dept = a.collaborator.departamento || 'Não Informado';
        departmentDistribution[dept] = (departmentDistribution[dept] || 0) + (a.diasFalta || 1);
      });

      // Top 5 employees with most absences
      const collaboratorAbsencesCounts: Record<string, { nome: string; count: number; cargo: string }> = {};
      absences.forEach((a) => {
        const id = a.collaboratorId;
        if (!collaboratorAbsencesCounts[id]) {
          collaboratorAbsencesCounts[id] = {
            nome: a.collaborator.nome,
            count: 0,
            cargo: a.collaborator.cargo || 'Não informado',
          };
        }
        collaboratorAbsencesCounts[id].count += (a.diasFalta || 1);
      });

      const topCollaborators = Object.values(collaboratorAbsencesCounts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Monthly Trend (last 6 months)
      const trendData: Record<string, { unexcused: number; total: number }> = {};
      const monthsStr = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

      for (let i = 5; i >= 0; i--) {
        const d = new Date(y, m - 1 - i, 1);
        const label = `${monthsStr[d.getMonth()]}/${d.getFullYear()}`;
        trendData[label] = { unexcused: 0, total: 0 };
      }

      const sixMonthsAgo = new Date(y, m - 1 - 5, 1);
      const historicalAbsences = await prisma.employeeAbsence.findMany({
        where: {
          companyId,
          dataFalta: {
            gte: sixMonthsAgo,
            lte: endOfMonth,
          },
        },
      });

      historicalAbsences.forEach((a) => {
        const date = new Date(a.dataFalta);
        const label = `${monthsStr[date.getMonth()]}/${date.getFullYear()}`;
        if (trendData[label]) {
          trendData[label].total += (a.diasFalta || 1);
          if (a.tipo === 'NAO_JUSTIFICADA') {
            trendData[label].unexcused += (a.diasFalta || 1);
          }
        }
      });

      return res.json({
        kpis: {
          totalUnexcusedCount,
          totalJustifiedCount,
          totalDiscount,
          totalAdvancesAmount,
        },
        departmentDistribution,
        topCollaborators,
        trend: trendData,
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      return res.status(500).json({ error: 'Erro ao carregar estatísticas do dashboard.' });
    }
  },

  // 8. List Audit Logs
  async listAuditLogs(req: Request, res: Response) {
    try {
      const companyId = (req as any).companyId || null;
      const userId = (req as any).userId;
      
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user?.roleAdmin && !user?.roleRh) {
        return res.status(403).json({ error: 'Acesso negado. Apenas Admin ou RH podem visualizar logs de auditoria.' });
      }

      const audits = await prisma.absenceAudit.findMany({
        where: { companyId },
        orderBy: { createdAt: 'desc' },
      });

      return res.json(audits);
    } catch (error) {
      console.error('Error fetching audits:', error);
      return res.status(500).json({ error: 'Erro ao buscar logs de auditoria.' });
    }
  },
};
