import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { z } from 'zod';

const attachmentSchema = z.object({
  fileName: z.string(),
  fileType: z.string(),
  fileUrl: z.string(),
});

const createPayableSchema = z.object({
  companyId: z.string(),
  fornecedor: z.string(),
  categoria: z.string(),
  centroCusto: z.string(),
  descricao: z.string(),
  valor: z.number().positive(),
  dataEmissao: z.string().transform((val) => new Date(val)),
  vencimento: z.string().transform((val) => new Date(val)),
  dataPagamento: z.string().optional().nullable().transform((val) => val ? new Date(val) : null),
  formaPagamento: z.string(),
  responsavel: z.string(),
  observacoes: z.string().optional().nullable(),
  status: z.string().default('PENDENTE'),
  
  recorrente: z.boolean().default(false),
  tipoRecorrencia: z.string().optional().nullable(),
  quantidadeParcelas: z.number().optional().nullable(),
  pagamentoAutomatico: z.boolean().default(false),
  attachments: z.array(attachmentSchema).optional(),
  linkedQuotes: z.array(z.object({
    quoteId: z.string(),
    valorVinculado: z.number().positive()
  })).optional(),
});

const createReceivableSchema = z.object({
  companyId: z.string(),
  cliente: z.string(),
  categoria: z.string(),
  descricao: z.string(),
  valor: z.number().positive(),
  dataEmissao: z.string().transform((val) => new Date(val)),
  vencimento: z.string().transform((val) => new Date(val)),
  dataRecebimento: z.string().optional().nullable().transform((val) => val ? new Date(val) : null),
  formaRecebimento: z.string(),
  responsavel: z.string(),
  observacoes: z.string().optional().nullable(),
  status: z.string().default('PENDENTE'),
  quoteId: z.string().optional().nullable(),
  attachments: z.array(attachmentSchema).optional(),
});

function calculateDueDate(baseDate: Date, type: string, index: number): Date {
  const date = new Date(baseDate.getTime());
  switch (type) {
    case 'DIARIA':
      date.setDate(date.getDate() + index);
      break;
    case 'SEMANAL':
      date.setDate(date.getDate() + index * 7);
      break;
    case 'QUINZENAL':
      date.setDate(date.getDate() + index * 15);
      break;
    case 'BIMESTRAL':
      date.setMonth(date.getMonth() + index * 2);
      break;
    case 'TRIMESTRAL':
      date.setMonth(date.getMonth() + index * 3);
      break;
    case 'SEMESTRAL':
      date.setMonth(date.getMonth() + index * 6);
      break;
    case 'ANUAL':
      date.setFullYear(date.getFullYear() + index);
      break;
    case 'MENSAL':
    default:
      date.setMonth(date.getMonth() + index);
      break;
  }
  return date;
}

export const FinancialController = {
  // 1. Dashboard Financeiro
  async getDashboardStats(req: Request, res: Response) {
    try {
      const { companyId, startDate, endDate } = req.query as any;

      const filterPayable: any = {};
      const filterReceivable: any = {};

      if (companyId) {
        filterPayable.companyId = companyId;
        filterReceivable.companyId = companyId;
      } else {
        filterPayable.company = {
          NOT: [
            { razaoSocial: { contains: 'curio', mode: 'insensitive' } },
            { nomeFantasia: { contains: 'curio', mode: 'insensitive' } }
          ]
        };
        filterReceivable.company = {
          NOT: [
            { razaoSocial: { contains: 'curio', mode: 'insensitive' } },
            { nomeFantasia: { contains: 'curio', mode: 'insensitive' } }
          ]
        };
      }

      if (startDate || endDate) {
        filterPayable.vencimento = {};
        filterReceivable.vencimento = {};
        if (startDate) {
          filterPayable.vencimento.gte = new Date(startDate);
          filterReceivable.vencimento.gte = new Date(startDate);
        }
        if (endDate) {
          filterPayable.vencimento.lte = new Date(endDate);
          filterReceivable.vencimento.lte = new Date(endDate);
        }
      }

      const payables = await prisma.financialPayable.findMany({
        where: filterPayable,
      });

      const receivables = await prisma.financialReceivable.findMany({
        where: filterReceivable,
      });

      // Cálculo de KPIs Básicos
      const totalContasPagar = payables.reduce((sum, p) => sum + p.valor, 0);
      const totalContasReceber = receivables.reduce((sum, r) => sum + r.valor, 0);
      const despesasPagas = payables.filter(p => p.status === 'PAGA').reduce((sum, p) => sum + p.valor, 0);
      const despesasPendentes = payables.filter(p => p.status === 'PENDENTE' || p.status === 'EM ANÁLISE').reduce((sum, p) => sum + p.valor, 0);
      const recebimentosRealizados = receivables.filter(r => r.status === 'RECEBIDA').reduce((sum, r) => sum + r.valor, 0);
      const recebimentosPendentes = receivables.filter(r => r.status === 'PENDENTE' || r.status === 'EM ANÁLISE').reduce((sum, r) => sum + r.valor, 0);

      // Saldo Financeiro Líquido Realizado (Recebidos - Pagos)
      const saldoLiquido = recebimentosRealizados - despesasPagas;
      const totalMovimentado = despesasPagas + recebimentosRealizados;

      // Alertas e previsão de vencimento
      const hoje = new Date();
      const contasVencidas = [
        ...payables.filter(p => p.status === 'PENDENTE' && p.vencimento < hoje),
        ...receivables.filter(r => r.status === 'PENDENTE' && r.vencimento < hoje)
      ].length;

      // Agrupamentos e Gráficos
      // A) Despesas por categoria
      const despesasPorCategoria: Record<string, number> = {};
      payables.forEach(p => {
        despesasPorCategoria[p.categoria] = (despesasPorCategoria[p.categoria] || 0) + p.valor;
      });

      // B) Receitas por categoria
      const receitasPorCategoria: Record<string, number> = {};
      receivables.forEach(r => {
        receitasPorCategoria[r.categoria] = (receitasPorCategoria[r.categoria] || 0) + r.valor;
      });

      // C) Contas por status
      const contasPorStatus: Record<string, number> = {};
      payables.forEach(p => {
        contasPorStatus[p.status] = (contasPorStatus[p.status] || 0) + 1;
      });
      receivables.forEach(r => {
        contasPorStatus[r.status] = (contasPorStatus[r.status] || 0) + 1;
      });

      // D) Fluxo de caixa mensal (dos últimos 6 meses até os próximos 3 meses)
      const fluxoMensal: Record<string, { receitas: number; despesas: number; saldo: number }> = {};
      const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

      const fillMonthBucket = (date: Date, valor: number, type: 'receita' | 'despesa') => {
        const key = `${meses[date.getMonth()]}/${date.getFullYear()}`;
        if (!fluxoMensal[key]) {
          fluxoMensal[key] = { receitas: 0, despesas: 0, saldo: 0 };
        }
        if (type === 'receita') {
          fluxoMensal[key].receitas += valor;
        } else {
          fluxoMensal[key].despesas += valor;
        }
        fluxoMensal[key].saldo = fluxoMensal[key].receitas - fluxoMensal[key].despesas;
      };

      payables.forEach(p => fillMonthBucket(p.vencimento, p.valor, 'despesa'));
      receivables.forEach(r => fillMonthBucket(r.vencimento, r.valor, 'receita'));

      // E) Contas por empresa
      const contasPorEmpresa: Record<string, { pagar: number; receber: number }> = {};
      const companies = await prisma.company.findMany({
        where: {
          NOT: [
            { razaoSocial: { contains: 'curio', mode: 'insensitive' } },
            { nomeFantasia: { contains: 'curio', mode: 'insensitive' } }
          ]
        },
        select: { id: true, nomeFantasia: true, razaoSocial: true }
      });
      const companyMap = new Map(companies.map(c => [c.id, c.nomeFantasia || c.razaoSocial]));

      payables.forEach(p => {
        const name = companyMap.get(p.companyId) || 'Outra';
        if (!contasPorEmpresa[name]) contasPorEmpresa[name] = { pagar: 0, receber: 0 };
        contasPorEmpresa[name].pagar += p.valor;
      });
      receivables.forEach(r => {
        const name = companyMap.get(r.companyId) || 'Outra';
        if (!contasPorEmpresa[name]) contasPorEmpresa[name] = { pagar: 0, receber: 0 };
        contasPorEmpresa[name].receber += r.valor;
      });

      // F) Contas por centro de custo
      const contasPorCentroCusto: Record<string, number> = {};
      payables.forEach(p => {
        const center = p.centroCusto || 'Geral';
        contasPorCentroCusto[center] = (contasPorCentroCusto[center] || 0) + p.valor;
      });

      return res.json({
        kpis: {
          totalContasPagar,
          totalContasReceber,
          despesasPagas,
          despesasPendentes,
          recebimentosRealizados,
          recebimentosPendentes,
          saldoLiquido,
          totalMovimentado,
          contasVencidas,
          totalLancamentos: payables.length + receivables.length
        },
        graficos: {
          despesasPorCategoria,
          receitasPorCategoria,
          contasPorStatus,
          contasPorEmpresa,
          contasPorCentroCusto,
          fluxoMensal
        }
      });
    } catch (error) {
      console.error('Error in getDashboardStats:', error);
      return res.status(500).json({ error: 'Erro ao gerar dashboard financeiro' });
    }
  },

  async getApprovedQuotes(req: Request, res: Response) {
    try {
      const approvedQuotes = await prisma.quote.findMany({
        where: {
          status: 'Aprovado',
          company: {
            NOT: [
              { razaoSocial: { contains: 'curio', mode: 'insensitive' } },
              { nomeFantasia: { contains: 'curio', mode: 'insensitive' } }
            ]
          }
        },
        include: {
          client: true,
          linkedPayables: {
            include: {
              payable: true
            }
          }
        }
      });

      const result = approvedQuotes.map(quote => {
        // Calcular o total já utilizado (desconsiderando CANCELADA ou REPROVADA)
        const totalUtilizado = quote.linkedPayables
          .filter(link => link.payable.status !== 'CANCELADA' && link.payable.status !== 'REPROVADA')
          .reduce((sum, link) => sum + link.valorVinculado, 0);

        const saldoDisponivel = Math.max(0, quote.total - totalUtilizado);

        return {
          id: quote.id,
          numeroOrcamento: quote.numeroOrcamento,
          client: quote.client.nome,
          empresa: quote.client.empresa || '',
          total: quote.total,
          totalUtilizado,
          saldoDisponivel,
          statusFinanceiro: saldoDisponivel === 0 ? 'Consumido' : (totalUtilizado > 0 ? 'Parcialmente Consumido' : 'Disponível')
        };
      });

      return res.json(result);
    } catch (error) {
      console.error('Error fetching approved quotes:', error);
      return res.status(500).json({ error: 'Erro ao buscar orçamentos aprovados' });
    }
  },

  // 2. Contas a Pagar
  async listPayables(req: Request, res: Response) {
    try {
      const { companyId, status, category, costCenter, search, page = 1, limit = 10 } = req.query as any;

      const whereClause: any = {};

      if (companyId) {
        whereClause.companyId = companyId as string;
      } else {
        whereClause.company = {
          NOT: [
            { razaoSocial: { contains: 'curio', mode: 'insensitive' } },
            { nomeFantasia: { contains: 'curio', mode: 'insensitive' } }
          ]
        };
      }
      if (status) whereClause.status = status as string;
      if (category) whereClause.categoria = category as string;
      if (costCenter) whereClause.centroCusto = costCenter as string;
      if (req.query.quoteId) {
        whereClause.linkedQuotes = {
          some: {
            quoteId: req.query.quoteId as string
          }
        };
      }
      if (search) {
        whereClause.OR = [
          { fornecedor: { contains: search as string, mode: 'insensitive' } },
          { descricao: { contains: search as string, mode: 'insensitive' } },
          { responsavel: { contains: search as string, mode: 'insensitive' } },
        ];
      }

      const skip = (Number(page) - 1) * Number(limit);

      const [payables, totalCount] = await prisma.$transaction([
        prisma.financialPayable.findMany({
          where: whereClause,
          include: { 
            company: true, 
            attachments: true,
            linkedQuotes: {
              include: {
                quote: {
                  include: {
                    client: true
                  }
                }
              }
            }
          },
          orderBy: { vencimento: 'asc' },
          skip,
          take: Number(limit)
        }),
        prisma.financialPayable.count({ where: whereClause })
      ]);

      return res.json({ payables, totalCount, page: Number(page), limit: Number(limit) });
    } catch (error) {
      console.error('Error listing payables:', error);
      return res.status(500).json({ error: 'Erro ao buscar contas a pagar' });
    }
  },

  async createPayable(req: Request, res: Response) {
    try {
      const body = createPayableSchema.parse(req.body);

      // Validar saldos dos orçamentos se houver vinculação
      if (body.linkedQuotes && body.linkedQuotes.length > 0) {
        for (const link of body.linkedQuotes) {
          const quote = await prisma.quote.findUnique({
            where: { id: link.quoteId },
            include: {
              linkedPayables: {
                include: { payable: true }
              }
            }
          });

          if (!quote) {
            return res.status(404).json({ error: `Orçamento de ID ${link.quoteId} não encontrado.` });
          }

          // Calcular o total já utilizado (desconsiderando CANCELADA ou REPROVADA)
          const totalUtilizado = quote.linkedPayables
            .filter(l => l.payable.status !== 'CANCELADA' && l.payable.status !== 'REPROVADA')
            .reduce((sum, l) => sum + l.valorVinculado, 0);

          const saldoDisponivel = Math.max(0, quote.total - totalUtilizado);

          if (link.valorVinculado > saldoDisponivel) {
            return res.status(400).json({ 
              error: `Saldo insuficiente no orçamento #${quote.numeroOrcamento}. Saldo disponível: R$ ${saldoDisponivel.toFixed(2)}, tentou lançar: R$ ${link.valorVinculado.toFixed(2)}.` 
            });
          }
        }
      }

      const createdPayables = [];

      const installments = body.recorrente && body.quantidadeParcelas ? body.quantidadeParcelas : 1;

      // Obter nome de usuário logado
      const executor = req.headers['x-user-email'] as string || 'Usuário';

      let actualParentId = '';

      for (let i = 0; i < installments; i++) {
        const dueDate = calculateDueDate(body.vencimento, body.tipoRecorrencia || 'MENSAL', i);
        const issueDate = calculateDueDate(body.dataEmissao, body.tipoRecorrencia || 'MENSAL', i);

        // Se pagamento automático está ativo e a conta deve ser salva como paga
        let finalStatus = body.status;
        let payDate = body.dataPagamento;
        if (body.pagamentoAutomatico && body.status === 'APROVADA') {
          finalStatus = 'PAGA';
          payDate = payDate || new Date();
        }

        const payable = await prisma.financialPayable.create({
          data: {
            companyId: body.companyId,
            fornecedor: body.fornecedor,
            categoria: body.categoria,
            centroCusto: body.centroCusto,
            descricao: `${body.descricao}${body.recorrente ? ` (${i + 1}/${installments})` : ''}`,
            valor: body.valor,
            dataEmissao: issueDate,
            vencimento: dueDate,
            dataPagamento: payDate,
            formaPagamento: body.formaPagamento,
            responsavel: body.responsavel,
            observacoes: body.observacoes,
            status: finalStatus,
            recorrente: body.recorrente,
            tipoRecorrencia: body.tipoRecorrencia,
            quantidadeParcelas: body.quantidadeParcelas,
            parcelaAtual: i + 1,
            pagamentoAutomatico: body.pagamentoAutomatico,
            parentRecurrenceId: i === 0 ? undefined : actualParentId,
            attachments: {
              create: body.attachments?.map(att => ({
                fileName: att.fileName,
                fileType: att.fileType,
                fileUrl: att.fileUrl,
              })) || [],
            },
            linkedQuotes: body.linkedQuotes && body.linkedQuotes.length > 0 ? {
              create: body.linkedQuotes.map(l => ({
                quoteId: l.quoteId,
                valorVinculado: l.valorVinculado
              }))
            } : undefined,
          },
        });

        if (i === 0 && body.recorrente) {
          actualParentId = payable.id;
          // Atualiza a primeira para guardar o ID agrupador
          await prisma.financialPayable.update({
            where: { id: payable.id },
            data: { parentRecurrenceId: actualParentId }
          });
        }

        // Criar log de auditoria
        await prisma.financialAudit.create({
          data: {
            payableId: payable.id,
            action: 'CREATE',
            newStatus: finalStatus,
            user: executor,
            changes: `Conta criada${body.recorrente ? ` (Parcela ${i + 1}/${installments})` : ''}`,
          }
        });

        createdPayables.push(payable);
      }

      return res.status(201).json(createdPayables[0]);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: (error as any).errors || error.message });
      }
      console.error('Error creating payable:', error);
      return res.status(500).json({ error: 'Erro ao criar lançamento de conta a pagar' });
    }
  },

  async updatePayable(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const { editMode, ...updateFields } = req.body; // editMode: 'CURRENT' ou 'SEQUENCE'

      const executor = req.headers['x-user-email'] as string || 'Usuário';

      const original = await prisma.financialPayable.findUnique({
        where: { id },
      });

      if (!original) {
        return res.status(404).json({ error: 'Lançamento não encontrado' });
      }

      // Validar saldos dos orçamentos se houver vinculação no update
      if (updateFields.linkedQuotes !== undefined) {
        if (updateFields.linkedQuotes && updateFields.linkedQuotes.length > 0) {
          for (const link of updateFields.linkedQuotes) {
            const quote = await prisma.quote.findUnique({
              where: { id: link.quoteId },
              include: {
                linkedPayables: {
                  include: { payable: true }
                }
              }
            });

            if (!quote) {
              return res.status(404).json({ error: `Orçamento de ID ${link.quoteId} não encontrado.` });
            }

            // Calcular o saldo desconsiderando este payable
            const totalUtilizado = quote.linkedPayables
              .filter(l => l.payable.status !== 'CANCELADA' && l.payable.status !== 'REPROVADA' && l.payableId !== id)
              .reduce((sum, l) => sum + l.valorVinculado, 0);

            const saldoDisponivel = Math.max(0, quote.total - totalUtilizado);

            if (link.valorVinculado > saldoDisponivel) {
              return res.status(400).json({ 
                error: `Saldo insuficiente no orçamento #${quote.numeroOrcamento}. Saldo disponível: R$ ${saldoDisponivel.toFixed(2)}, tentou lançar: R$ ${link.valorVinculado.toFixed(2)}.` 
              });
            }
          }
        }

        // Se a validação passou, limpar os links antigos e criar os novos
        await prisma.payableQuoteLink.deleteMany({
          where: { payableId: id }
        });

        if (updateFields.linkedQuotes && updateFields.linkedQuotes.length > 0) {
          await prisma.payableQuoteLink.createMany({
            data: updateFields.linkedQuotes.map((l: any) => ({
              payableId: id,
              quoteId: l.quoteId,
              valorVinculado: Number(l.valorVinculado)
            }))
          });
        }
      }

      const updateData: any = {
        fornecedor: updateFields.fornecedor,
        categoria: updateFields.categoria,
        centroCusto: updateFields.centroCusto,
        descricao: updateFields.descricao,
        valor: updateFields.valor ? Number(updateFields.valor) : undefined,
        dataEmissao: updateFields.dataEmissao ? new Date(updateFields.dataEmissao) : undefined,
        vencimento: updateFields.vencimento ? new Date(updateFields.vencimento) : undefined,
        dataPagamento: updateFields.dataPagamento ? new Date(updateFields.dataPagamento) : null,
        formaPagamento: updateFields.formaPagamento,
        responsavel: updateFields.responsavel,
        observacoes: updateFields.observacoes,
        status: updateFields.status,
      };

      if (updateFields.attachments && Array.isArray(updateFields.attachments)) {
        updateData.attachments = {
          deleteMany: {},
          create: updateFields.attachments.map((att: any) => ({
            fileName: att.fileName,
            fileType: att.fileType,
            fileUrl: att.fileUrl,
          })),
        };
      }

      if (editMode === 'SEQUENCE' && original.parentRecurrenceId) {
        // Atualizar toda a sequência das pendentes futuras
        const related = await prisma.financialPayable.findMany({
          where: {
            parentRecurrenceId: original.parentRecurrenceId,
            status: { in: ['PENDENTE', 'EM ANÁLISE'] },
          }
        });

        for (const item of related) {
          await prisma.financialPayable.update({
            where: { id: item.id },
            data: {
              ...updateData,
              // Mantém as datas calculadas
              dataEmissao: undefined,
              vencimento: undefined,
            }
          });

          await prisma.financialAudit.create({
            data: {
              payableId: item.id,
              action: 'UPDATE_SEQUENCE',
              previousStatus: item.status,
              newStatus: updateFields.status || item.status,
              user: executor,
              changes: 'Atualização da sequência recorrente',
            }
          });
        }
      }

      const updated = await prisma.financialPayable.update({
        where: { id },
        data: updateData,
        include: { 
          company: true, 
          attachments: true,
          linkedQuotes: {
            include: {
              quote: {
                include: {
                  client: true
                }
              }
            }
          }
        }
      });

      await prisma.financialAudit.create({
        data: {
          payableId: id,
          action: 'UPDATE',
          previousStatus: original.status,
          newStatus: updated.status,
          user: executor,
          changes: `Conta editada (${editMode === 'SEQUENCE' ? 'Toda a sequência' : 'Apenas esta parcela'})`,
        }
      });

      return res.json(updated);
    } catch (error) {
      console.error('Error updating payable:', error);
      return res.status(500).json({ error: 'Erro ao atualizar conta a pagar' });
    }
  },

  async deletePayable(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const { deleteMode } = req.query; // 'CURRENT' ou 'SEQUENCE'

      const original = await prisma.financialPayable.findUnique({ where: { id } });
      if (!original) {
        return res.status(404).json({ error: 'Lançamento não encontrado' });
      }

      if (deleteMode === 'SEQUENCE' && original.parentRecurrenceId) {
        await prisma.financialPayable.deleteMany({
          where: {
            parentRecurrenceId: original.parentRecurrenceId,
          }
        });
      } else {
        await prisma.financialPayable.delete({ where: { id } });
      }

      return res.status(204).send();
    } catch (error) {
      console.error('Error deleting payable:', error);
      return res.status(500).json({ error: 'Erro ao deletar conta a pagar' });
    }
  },

  // 3. Contas a Receber
  async listReceivables(req: Request, res: Response) {
    try {
      const { companyId, status, category, search, page = 1, limit = 10 } = req.query as any;

      const whereClause: any = {};

      if (companyId) {
        whereClause.companyId = companyId as string;
      } else {
        whereClause.company = {
          NOT: [
            { razaoSocial: { contains: 'curio', mode: 'insensitive' } },
            { nomeFantasia: { contains: 'curio', mode: 'insensitive' } }
          ]
        };
      }
      if (status) whereClause.status = status as string;
      if (category) whereClause.categoria = category as string;
      if (search) {
        whereClause.OR = [
          { cliente: { contains: search as string, mode: 'insensitive' } },
          { descricao: { contains: search as string, mode: 'insensitive' } },
          { responsavel: { contains: search as string, mode: 'insensitive' } },
        ];
      }

      const skip = (Number(page) - 1) * Number(limit);

      const [receivables, totalCount] = await prisma.$transaction([
        prisma.financialReceivable.findMany({
          where: whereClause,
          include: { company: true, attachments: true, quote: true },
          orderBy: { vencimento: 'asc' },
          skip,
          take: Number(limit)
        }),
        prisma.financialReceivable.count({ where: whereClause })
      ]);

      return res.json({ receivables, totalCount, page: Number(page), limit: Number(limit) });
    } catch (error) {
      console.error('Error listing receivables:', error);
      return res.status(500).json({ error: 'Erro ao buscar contas a receber' });
    }
  },

  async createReceivable(req: Request, res: Response) {
    try {
      const body = createReceivableSchema.parse(req.body);
      const executor = req.headers['x-user-email'] as string || 'Usuário';

      const receivable = await prisma.financialReceivable.create({
        data: {
          companyId: body.companyId,
          cliente: body.cliente,
          categoria: body.categoria,
          descricao: body.descricao,
          valor: body.valor,
          dataEmissao: body.dataEmissao,
          vencimento: body.vencimento,
          dataRecebimento: body.dataRecebimento,
          formaRecebimento: body.formaRecebimento,
          responsavel: body.responsavel,
          observacoes: body.observacoes,
          status: body.status,
          quoteId: body.quoteId,
          attachments: {
            create: body.attachments?.map(att => ({
              fileName: att.fileName,
              fileType: att.fileType,
              fileUrl: att.fileUrl,
            })) || [],
          },
        },
        include: { company: true, attachments: true }
      });

      await prisma.financialAudit.create({
        data: {
          receivableId: receivable.id,
          action: 'CREATE',
          newStatus: body.status,
          user: executor,
          changes: 'Lançamento de conta a receber criado',
        }
      });

      return res.status(201).json(receivable);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: (error as any).errors || error.message });
      }
      console.error('Error creating receivable:', error);
      return res.status(500).json({ error: 'Erro ao criar conta a receber' });
    }
  },

  async updateReceivable(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const updateFields = req.body;
      const executor = req.headers['x-user-email'] as string || 'Usuário';

      const original = await prisma.financialReceivable.findUnique({ where: { id } });
      if (!original) {
        return res.status(404).json({ error: 'Lançamento não encontrado' });
      }

      const updateData: any = {
        cliente: updateFields.cliente,
        categoria: updateFields.categoria,
        descricao: updateFields.descricao,
        valor: updateFields.valor ? Number(updateFields.valor) : undefined,
        dataEmissao: updateFields.dataEmissao ? new Date(updateFields.dataEmissao) : undefined,
        vencimento: updateFields.vencimento ? new Date(updateFields.vencimento) : undefined,
        dataRecebimento: updateFields.dataRecebimento ? new Date(updateFields.dataRecebimento) : null,
        formaRecebimento: updateFields.formaRecebimento,
        responsavel: updateFields.responsavel,
        observacoes: updateFields.observacoes,
        status: updateFields.status,
        quoteId: updateFields.quoteId,
      };

      if (updateFields.attachments && Array.isArray(updateFields.attachments)) {
        updateData.attachments = {
          deleteMany: {},
          create: updateFields.attachments.map((att: any) => ({
            fileName: att.fileName,
            fileType: att.fileType,
            fileUrl: att.fileUrl,
          })),
        };
      }

      const updated = await prisma.financialReceivable.update({
        where: { id },
        data: updateData,
        include: { company: true, attachments: true }
      });

      await prisma.financialAudit.create({
        data: {
          receivableId: id,
          action: 'UPDATE',
          previousStatus: original.status,
          newStatus: updated.status,
          user: executor,
          changes: 'Lançamento de conta a receber atualizado',
        }
      });

      return res.json(updated);
    } catch (error) {
      console.error('Error updating receivable:', error);
      return res.status(500).json({ error: 'Erro ao atualizar conta a receber' });
    }
  },

  async deleteReceivable(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const original = await prisma.financialReceivable.findUnique({ where: { id } });
      if (!original) {
        return res.status(404).json({ error: 'Lançamento não encontrado' });
      }

      await prisma.financialReceivable.delete({ where: { id } });
      return res.status(204).send();
    } catch (error) {
      console.error('Error deleting receivable:', error);
      return res.status(500).json({ error: 'Erro ao deletar conta a receber' });
    }
  },

  // 4. Workflow de Aprovação Financeira
  async approveTransaction(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const { type, action, comments } = req.body; // type: 'PAGAR' | 'RECEBER', action: 'APPROVE' | 'REJECT'
      const executor = req.headers['x-user-email'] as string || 'Usuário';

      let newStatus = action === 'APPROVE' ? 'APROVADA' : 'REPROVADA';

      if (type === 'PAGAR') {
        const original = await prisma.financialPayable.findUnique({ where: { id } });
        if (!original) return res.status(404).json({ error: 'Lançamento não encontrado' });

        // Se foi aprovado e tem pagamento automático
        if (original.pagamentoAutomatico && newStatus === 'APROVADA') {
          newStatus = 'PAGA';
        }

        const updated = await prisma.financialPayable.update({
          where: { id },
          data: { 
            status: newStatus,
            dataPagamento: newStatus === 'PAGA' ? new Date() : null,
          },
          include: { company: true, attachments: true }
        });

        await prisma.financialAudit.create({
          data: {
            payableId: id,
            action: action === 'APPROVE' ? 'APPROVAL' : 'REJECTION',
            previousStatus: original.status,
            newStatus,
            user: executor,
            changes: `Fluxo de Aprovação: ${action === 'APPROVE' ? 'Aprovado' : 'Reprovado'}`,
            comments: comments || '',
          }
        });

        return res.json(updated);
      } else {
        const original = await prisma.financialReceivable.findUnique({ where: { id } });
        if (!original) return res.status(404).json({ error: 'Lançamento não encontrado' });

        const updated = await prisma.financialReceivable.update({
          where: { id },
          data: { status: newStatus },
          include: { company: true, attachments: true }
        });

        await prisma.financialAudit.create({
          data: {
            receivableId: id,
            action: action === 'APPROVE' ? 'APPROVAL' : 'REJECTION',
            previousStatus: original.status,
            newStatus,
            user: executor,
            changes: `Fluxo de Aprovação: ${action === 'APPROVE' ? 'Aprovado' : 'Reprovado'}`,
            comments: comments || '',
          }
        });

        return res.json(updated);
      }
    } catch (error) {
      console.error('Error in approveTransaction:', error);
      return res.status(500).json({ error: 'Erro ao processar aprovação' });
    }
  },

  // 5. Histórico de Auditoria & Recorrência
  async getAuditHistory(req: Request, res: Response) {
    try {
      const { payableId, receivableId } = req.query as any;
      const whereClause: any = {};
      if (payableId) whereClause.payableId = payableId as string;
      if (receivableId) whereClause.receivableId = receivableId as string;

      const audits = await prisma.financialAudit.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' }
      });

      return res.json(audits);
    } catch (error) {
      console.error('Error listing audits:', error);
      return res.status(500).json({ error: 'Erro ao buscar histórico de auditoria' });
    }
  },

  async getRecurrentHistory(req: Request, res: Response) {
    try {
      const { parentRecurrenceId } = req.query as any;
      if (!parentRecurrenceId) {
        return res.status(400).json({ error: 'parentRecurrenceId é obrigatório' });
      }

      const installments = await prisma.financialPayable.findMany({
        where: { parentRecurrenceId: parentRecurrenceId as string },
        orderBy: { parcelaAtual: 'asc' },
        include: { company: true }
      });

      return res.json(installments);
    } catch (error) {
      console.error('Error listing recurrences:', error);
      return res.status(500).json({ error: 'Erro ao carregar histórico de recorrência' });
    }
  },

  // 6. CRUD de Impostos
  async listTaxes(req: Request, res: Response) {
    try {
      const taxes = await prisma.taxSetting.findMany({
        orderBy: { nome: 'asc' }
      });
      return res.json(taxes);
    } catch (error) {
      console.error('Error listing taxes:', error);
      return res.status(500).json({ error: 'Erro ao listar impostos' });
    }
  },

  async createTax(req: Request, res: Response) {
    try {
      const { nome, aliquota, tipo, status } = req.body;
      if (!nome || aliquota === undefined) {
        return res.status(400).json({ error: 'Nome e alíquota são obrigatórios' });
      }

      const tax = await prisma.taxSetting.create({
        data: {
          nome,
          aliquota: Number(aliquota),
          tipo: tipo || 'FATURAMENTO',
          status: status || 'ATIVO'
        }
      });
      return res.json(tax);
    } catch (error) {
      console.error('Error creating tax:', error);
      return res.status(500).json({ error: 'Erro ao cadastrar imposto' });
    }
  },

  async updateTax(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const { nome, aliquota, tipo, status } = req.body;

      const tax = await prisma.taxSetting.update({
        where: { id },
        data: {
          nome,
          aliquota: aliquota !== undefined ? Number(aliquota) : undefined,
          tipo,
          status
        }
      });
      return res.json(tax);
    } catch (error) {
      console.error('Error updating tax:', error);
      return res.status(500).json({ error: 'Erro ao atualizar imposto' });
    }
  },

  async deleteTax(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      await prisma.taxSetting.delete({
        where: { id }
      });
      return res.json({ success: true });
    } catch (error) {
      console.error('Error deleting tax:', error);
      return res.status(500).json({ error: 'Erro ao deletar imposto' });
    }
  }
};
