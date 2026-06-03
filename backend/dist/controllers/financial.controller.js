"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinancialController = void 0;
// Utility to parse YYYY-MM-DD strings as local dates without timezone shift
function parseLocalDate(val) {
    const [year, month, day] = val.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day));
}
const prisma_1 = require("../lib/prisma");
const zod_1 = require("zod");
const attachmentSchema = zod_1.z.object({
    fileName: zod_1.z.string(),
    fileType: zod_1.z.string(),
    fileUrl: zod_1.z.string(),
});
const createPayableSchema = zod_1.z.object({
    companyId: zod_1.z.string(),
    fornecedor: zod_1.z.string(),
    categoria: zod_1.z.string(),
    centroCusto: zod_1.z.string(),
    descricao: zod_1.z.string(),
    valor: zod_1.z.number().positive(),
    dataEmissao: zod_1.z.string().transform((val) => {
        const [year, month, day] = val.split('-').map(Number);
        return new Date(Date.UTC(year, month - 1, day));
    }),
    vencimento: zod_1.z.string().transform((val) => {
        const [year, month, day] = val.split('-').map(Number);
        return new Date(Date.UTC(year, month - 1, day));
    }),
    dataPagamento: zod_1.z.string().optional().nullable().transform((val) => val ? new Date(val) : null),
    formaPagamento: zod_1.z.string(),
    responsavel: zod_1.z.string().optional(),
    observacoes: zod_1.z.string().optional().nullable(),
    status: zod_1.z.string().default('PENDENTE'),
    recorrente: zod_1.z.boolean().default(false),
    tipoRecorrencia: zod_1.z.string().optional().nullable(),
    quantidadeParcelas: zod_1.z.number().optional().nullable(),
    pagamentoAutomatico: zod_1.z.boolean().default(false),
    attachments: zod_1.z.array(attachmentSchema).optional(),
    linkedQuotes: zod_1.z.array(zod_1.z.object({
        quoteId: zod_1.z.string(),
        valorVinculado: zod_1.z.number().positive()
    })).optional(),
});
const createReceivableSchema = zod_1.z.object({
    companyId: zod_1.z.string(),
    cliente: zod_1.z.string(),
    categoria: zod_1.z.string(),
    descricao: zod_1.z.string(),
    valor: zod_1.z.number().positive(),
    dataEmissao: zod_1.z.string().transform((val) => new Date(val)),
    vencimento: zod_1.z.string().transform((val) => new Date(val)),
    dataRecebimento: zod_1.z.string().optional().nullable().transform((val) => val ? new Date(val) : null),
    formaRecebimento: zod_1.z.string(),
    responsavel: zod_1.z.string().optional(),
    observacoes: zod_1.z.string().optional().nullable(),
    status: zod_1.z.string().default('PENDENTE'),
    quoteId: zod_1.z.string().optional().nullable(),
    attachments: zod_1.z.array(attachmentSchema).optional(),
    linkedQuotes: zod_1.z.array(zod_1.z.object({
        quoteId: zod_1.z.string(),
        valorVinculado: zod_1.z.number().positive()
    })).optional(),
});
function calculateDueDate(baseDate, type, index) {
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
exports.FinancialController = {
    // 1. Dashboard Financeiro
    async getDashboardStats(req, res) {
        try {
            const { companyId, startDate, endDate } = req.query;
            const filterPayable = {};
            const filterReceivable = {};
            if (companyId) {
                filterPayable.companyId = companyId;
                filterReceivable.companyId = companyId;
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
            const payables = await prisma_1.prisma.financialPayable.findMany({
                where: filterPayable,
            });
            const receivables = await prisma_1.prisma.financialReceivable.findMany({
                where: filterReceivable,
                include: {
                    quote: {
                        include: {
                            plataformaGestao: true,
                        },
                    },
                },
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
            const despesasPorCategoria = {};
            payables.forEach(p => {
                despesasPorCategoria[p.categoria] = (despesasPorCategoria[p.categoria] || 0) + p.valor;
            });
            // B) Receitas por categoria
            const receitasPorCategoria = {};
            receivables.forEach(r => {
                receitasPorCategoria[r.categoria] = (receitasPorCategoria[r.categoria] || 0) + r.valor;
            });
            // C) Contas por status
            const contasPorStatus = {};
            payables.forEach(p => {
                contasPorStatus[p.status] = (contasPorStatus[p.status] || 0) + 1;
            });
            receivables.forEach(r => {
                contasPorStatus[r.status] = (contasPorStatus[r.status] || 0) + 1;
            });
            // D) Fluxo de caixa mensal (dos últimos 6 meses até os próximos 3 meses)
            const fluxoMensal = {};
            const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
            const fillMonthBucket = (date, valor, type) => {
                const key = `${meses[date.getMonth()]}/${date.getFullYear()}`;
                if (!fluxoMensal[key]) {
                    fluxoMensal[key] = { receitas: 0, despesas: 0, saldo: 0 };
                }
                if (type === 'receita') {
                    fluxoMensal[key].receitas += valor;
                }
                else {
                    fluxoMensal[key].despesas += valor;
                }
                fluxoMensal[key].saldo = fluxoMensal[key].receitas - fluxoMensal[key].despesas;
            };
            payables.forEach(p => fillMonthBucket(p.vencimento, p.valor, 'despesa'));
            receivables.forEach(r => fillMonthBucket(r.vencimento, r.valor, 'receita'));
            // E) Contas por empresa
            const contasPorEmpresa = {};
            const companies = await prisma_1.prisma.company.findMany({ select: { id: true, nomeFantasia: true, razaoSocial: true } });
            const companyMap = new Map(companies.map(c => [c.id, c.nomeFantasia || c.razaoSocial]));
            payables.forEach(p => {
                const name = companyMap.get(p.companyId) || 'Outra';
                if (!contasPorEmpresa[name])
                    contasPorEmpresa[name] = { pagar: 0, receber: 0 };
                contasPorEmpresa[name].pagar += p.valor;
            });
            receivables.forEach(r => {
                const name = companyMap.get(r.companyId) || 'Outra';
                if (!contasPorEmpresa[name])
                    contasPorEmpresa[name] = { pagar: 0, receber: 0 };
                contasPorEmpresa[name].receber += r.valor;
            });
            // F) Contas por centro de custo
            const contasPorCentroCusto = {};
            payables.forEach(p => {
                const center = p.centroCusto || 'Geral';
                contasPorCentroCusto[center] = (contasPorCentroCusto[center] || 0) + p.valor;
            });
            // G) Receita por plataforma de gestão
            const receitaPorPlataforma = {};
            receivables.forEach(r => {
                const platformName = r.quote?.plataformaGestao?.nomeFantasia || 'Sem plataforma';
                receitaPorPlataforma[platformName] = (receitaPorPlataforma[platformName] || 0) + r.valor;
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
                    fluxoMensal,
                    receitaPorPlataforma
                }
            });
        }
        catch (error) {
            console.error('Error in getDashboardStats:', error);
            return res.status(500).json({ error: 'Erro ao gerar dashboard financeiro' });
        }
    },
    async getApprovedQuotes(req, res) {
        try {
            const { type } = req.query;
            const approvedQuotes = await prisma_1.prisma.quote.findMany({
                where: {
                    status: {
                        in: ['Aprovado', 'Pago', 'Aguardando Pagamento', 'Emitir Nota Fiscal']
                    }
                },
                include: {
                    client: true,
                    oficina: true,
                    items: true,
                    linkedPayables: {
                        include: {
                            payable: true
                        }
                    },
                    linkedReceivables: {
                        include: {
                            receivable: true
                        }
                    }
                }
            });
            const result = approvedQuotes.map(quote => {
                // Calcular o total já utilizado
                const totalUtilizado = type === 'receivable'
                    ? quote.linkedReceivables
                        .filter(link => link.receivable.status !== 'CANCELADA' && link.receivable.status !== 'REPROVADA')
                        .reduce((sum, link) => sum + link.valorVinculado, 0)
                    : quote.linkedPayables
                        .filter(link => link.payable.status !== 'CANCELADA' && link.payable.status !== 'REPROVADA')
                        .reduce((sum, link) => sum + link.valorVinculado, 0);
                const saldoDisponivel = Math.max(0, quote.total - totalUtilizado);
                const statusFinanceiro = saldoDisponivel === 0 ? 'Consumido' : (totalUtilizado > 0 ? 'Parcialmente Consumido' : 'Disponível');
                return {
                    id: quote.id,
                    numeroOrcamento: quote.numeroOrcamento,
                    client: {
                        id: quote.client.id,
                        nome: quote.client.nome,
                        empresa: quote.client.empresa || ''
                    },
                    clientName: quote.client.nome,
                    empresa: quote.client.empresa || '',
                    total: quote.total,
                    totalUtilizado,
                    saldoDisponivel,
                    statusFinanceiro,
                    status: quote.status,
                    oficinaId: quote.oficinaId,
                    oficina: quote.oficina,
                    osExterna: quote.osExterna,
                    veiculoMarca: quote.veiculoMarca,
                    veiculoModelo: quote.veiculoModelo,
                    veiculoAno: quote.veiculoAno,
                    veiculoPlaca: quote.veiculoPlaca,
                    veiculoPrefixo: quote.veiculoPrefixo,
                    veiculoAnoFabricacao: quote.veiculoAnoFabricacao,
                    veiculoAnoModelo: quote.veiculoAnoModelo,
                    veiculoChassi: quote.veiculoChassi,
                    veiculoRenavam: quote.veiculoRenavam,
                    veiculoFrota: quote.veiculoFrota,
                    veiculoSubfrota: quote.veiculoSubfrota,
                    veiculoHodometro: quote.veiculoHodometro,
                    veiculoTipo: quote.veiculoTipo,
                    notaFiscalDescricao: quote.notaFiscalDescricao,
                    items: quote.items
                };
            });
            return res.json(result);
        }
        catch (error) {
            console.error('Error fetching approved quotes:', error);
            return res.status(500).json({ error: 'Erro ao buscar orçamentos aprovados' });
        }
    },
    // 2. Contas a Pagar
    async listPayables(req, res) {
        try {
            const { companyId, status, category, costCenter, search, startDate, endDate, page = 1, limit = 10 } = req.query;
            const whereClause = {};
            if (companyId)
                whereClause.companyId = companyId;
            if (status)
                whereClause.status = status;
            if (category)
                whereClause.categoria = category;
            if (costCenter)
                whereClause.centroCusto = costCenter;
            if (req.query.quoteId) {
                whereClause.linkedQuotes = {
                    some: {
                        quoteId: req.query.quoteId
                    }
                };
            }
            if (search) {
                whereClause.OR = [
                    { fornecedor: { contains: search, mode: 'insensitive' } },
                    { descricao: { contains: search, mode: 'insensitive' } },
                    { responsavel: { contains: search, mode: 'insensitive' } },
                ];
            }
            if (startDate || endDate) {
                whereClause.vencimento = {};
                if (startDate) {
                    whereClause.vencimento.gte = new Date(startDate);
                }
                if (endDate) {
                    const end = new Date(endDate);
                    end.setUTCHours(23, 59, 59, 999);
                    whereClause.vencimento.lte = end;
                }
            }
            const skip = (Number(page) - 1) * Number(limit);
            const [payables, totalCount] = await prisma_1.prisma.$transaction([
                prisma_1.prisma.financialPayable.findMany({
                    where: whereClause,
                    include: {
                        company: true,
                        attachments: true,
                        linkedQuotes: {
                            include: {
                                quote: {
                                    include: {
                                        client: true,
                                        oficina: true,
                                        items: true
                                    }
                                }
                            }
                        }
                    },
                    orderBy: { vencimento: 'asc' },
                    skip,
                    take: Number(limit)
                }),
                prisma_1.prisma.financialPayable.count({ where: whereClause })
            ]);
            return res.json({ payables, totalCount, page: Number(page), limit: Number(limit) });
        }
        catch (error) {
            console.error('Error listing payables:', error);
            return res.status(500).json({ error: 'Erro ao buscar contas a pagar' });
        }
    },
    async createPayable(req, res) {
        try {
            const body = createPayableSchema.parse(req.body);
            // Validar saldos dos orçamentos se houver vinculação
            if (body.linkedQuotes && body.linkedQuotes.length > 0) {
                for (const link of body.linkedQuotes) {
                    const quote = await prisma_1.prisma.quote.findUnique({
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
            const executor = req.headers['x-user-email'] || 'Usuário';
            const userId = req.userId;
            const creatorUser = userId ? await prisma_1.prisma.user.findUnique({
                where: { id: userId },
                select: { name: true }
            }) : null;
            const responsavelNome = creatorUser?.name || executor || 'Sistema';
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
                const payable = await prisma_1.prisma.financialPayable.create({
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
                        responsavel: responsavelNome,
                        observacoes: body.observacoes,
                        status: finalStatus,
                        recorrente: body.recorrente,
                        tipoRecorrencia: body.tipoRecorrencia,
                        quantidadeParcelas: body.quantidadeParcelas,
                        parcelaAtual: i + 1,
                        pagamentoAutomatico: body.pagamentoAutomatico,
                        parentRecurrenceId: i === 0 ? undefined : actualParentId,
                        responsavel_lancamento_id: userId || null,
                        responsavel_lancamento_nome: responsavelNome,
                        data_criacao: new Date(),
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
                    await prisma_1.prisma.financialPayable.update({
                        where: { id: payable.id },
                        data: { parentRecurrenceId: actualParentId }
                    });
                }
                const quoteNumbers = [];
                if (body.linkedQuotes && body.linkedQuotes.length > 0) {
                    for (const l of body.linkedQuotes) {
                        const qRecord = await prisma_1.prisma.quote.findUnique({ where: { id: l.quoteId }, select: { numeroOrcamento: true } });
                        if (qRecord)
                            quoteNumbers.push(qRecord.numeroOrcamento);
                    }
                }
                const origemText = quoteNumbers.length > 0
                    ? `Orçamento #${quoteNumbers.join(', #')}`
                    : 'Lançamento Manual';
                const auditChanges = [
                    `Data/Hora: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`,
                    `Usuário: ${responsavelNome}`,
                    `Operação: Criação de Conta a Pagar`,
                    `Origem: ${origemText}`,
                    `Valor: R$ ${body.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                ].join('\n');
                // Criar log de auditoria
                await prisma_1.prisma.financialAudit.create({
                    data: {
                        payableId: payable.id,
                        action: 'CREATE',
                        newStatus: finalStatus,
                        user: responsavelNome,
                        changes: auditChanges,
                    }
                });
                createdPayables.push(payable);
            }
            return res.status(201).json(createdPayables[0]);
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({ error: error.errors || error.message });
            }
            console.error('Error creating payable:', error);
            return res.status(500).json({ error: 'Erro ao criar lançamento de conta a pagar' });
        }
    },
    async updatePayable(req, res) {
        try {
            const id = req.params.id;
            const { editMode, ...updateFields } = req.body; // editMode: 'CURRENT' ou 'SEQUENCE'
            const executor = req.headers['x-user-email'] || 'Usuário';
            const original = await prisma_1.prisma.financialPayable.findUnique({
                where: { id },
            });
            if (!original) {
                return res.status(404).json({ error: 'Lançamento não encontrado' });
            }
            // Validar saldos dos orçamentos se houver vinculação no update
            if (updateFields.linkedQuotes !== undefined) {
                if (updateFields.linkedQuotes && updateFields.linkedQuotes.length > 0) {
                    for (const link of updateFields.linkedQuotes) {
                        const quote = await prisma_1.prisma.quote.findUnique({
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
                await prisma_1.prisma.payableQuoteLink.deleteMany({
                    where: { payableId: id }
                });
                if (updateFields.linkedQuotes && updateFields.linkedQuotes.length > 0) {
                    await prisma_1.prisma.payableQuoteLink.createMany({
                        data: updateFields.linkedQuotes.map((l) => ({
                            payableId: id,
                            quoteId: l.quoteId,
                            valorVinculado: Number(l.valorVinculado)
                        }))
                    });
                }
            }
            const updateData = {
                fornecedor: updateFields.fornecedor,
                categoria: updateFields.categoria,
                centroCusto: updateFields.centroCusto,
                descricao: updateFields.descricao,
                valor: updateFields.valor ? Number(updateFields.valor) : undefined,
                dataEmissao: updateFields.dataEmissao ? parseLocalDate(updateFields.dataEmissao) : undefined,
                vencimento: updateFields.vencimento ? parseLocalDate(updateFields.vencimento) : undefined,
                dataPagamento: updateFields.dataPagamento ? new Date(updateFields.dataPagamento) : null,
                formaPagamento: updateFields.formaPagamento,
                responsavel: updateFields.responsavel,
                observacoes: updateFields.observacoes,
                status: updateFields.status,
            };
            if (updateFields.attachments && Array.isArray(updateFields.attachments)) {
                updateData.attachments = {
                    deleteMany: {},
                    create: updateFields.attachments.map((att) => ({
                        fileName: att.fileName,
                        fileType: att.fileType,
                        fileUrl: att.fileUrl,
                    })),
                };
            }
            if (editMode === 'SEQUENCE' && original.parentRecurrenceId) {
                // Atualizar toda a sequência das pendentes futuras
                const related = await prisma_1.prisma.financialPayable.findMany({
                    where: {
                        parentRecurrenceId: original.parentRecurrenceId,
                        status: { in: ['PENDENTE', 'EM ANÁLISE'] },
                    }
                });
                for (const item of related) {
                    await prisma_1.prisma.financialPayable.update({
                        where: { id: item.id },
                        data: {
                            ...updateData,
                            // Mantém as datas calculadas
                            dataEmissao: undefined,
                            vencimento: undefined,
                        }
                    });
                    await prisma_1.prisma.financialAudit.create({
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
            const updated = await prisma_1.prisma.financialPayable.update({
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
            await prisma_1.prisma.financialAudit.create({
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
        }
        catch (error) {
            console.error('Error updating payable:', error);
            return res.status(500).json({ error: 'Erro ao atualizar conta a pagar' });
        }
    },
    async deletePayable(req, res) {
        try {
            const id = req.params.id;
            const { deleteMode } = req.query; // 'CURRENT' ou 'SEQUENCE'
            const original = await prisma_1.prisma.financialPayable.findUnique({ where: { id } });
            if (!original) {
                return res.status(404).json({ error: 'Lançamento não encontrado' });
            }
            if (deleteMode === 'SEQUENCE' && original.parentRecurrenceId) {
                await prisma_1.prisma.financialPayable.deleteMany({
                    where: {
                        parentRecurrenceId: original.parentRecurrenceId,
                    }
                });
            }
            else {
                await prisma_1.prisma.financialPayable.delete({ where: { id } });
            }
            return res.status(204).send();
        }
        catch (error) {
            console.error('Error deleting payable:', error);
            return res.status(500).json({ error: 'Erro ao deletar conta a pagar' });
        }
    },
    // 3. Contas a Receber
    async listReceivables(req, res) {
        try {
            const { companyId, status, category, search, startDate, endDate, page = 1, limit = 10 } = req.query;
            const whereClause = {};
            if (companyId)
                whereClause.companyId = companyId;
            if (status)
                whereClause.status = status;
            if (category)
                whereClause.categoria = category;
            if (search) {
                whereClause.OR = [
                    { cliente: { contains: search, mode: 'insensitive' } },
                    { descricao: { contains: search, mode: 'insensitive' } },
                    { responsavel: { contains: search, mode: 'insensitive' } },
                ];
            }
            if (startDate || endDate) {
                whereClause.vencimento = {};
                if (startDate) {
                    whereClause.vencimento.gte = new Date(startDate);
                }
                if (endDate) {
                    const end = new Date(endDate);
                    end.setUTCHours(23, 59, 59, 999);
                    whereClause.vencimento.lte = end;
                }
            }
            const skip = (Number(page) - 1) * Number(limit);
            const [receivables, totalCount] = await prisma_1.prisma.$transaction([
                prisma_1.prisma.financialReceivable.findMany({
                    where: whereClause,
                    include: {
                        company: true,
                        attachments: true,
                        quote: true,
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
                prisma_1.prisma.financialReceivable.count({ where: whereClause })
            ]);
            return res.json({ receivables, totalCount, page: Number(page), limit: Number(limit) });
        }
        catch (error) {
            console.error('Error listing receivables:', error);
            return res.status(500).json({ error: 'Erro ao buscar contas a receber' });
        }
    },
    async createReceivable(req, res) {
        try {
            const body = createReceivableSchema.parse(req.body);
            const executor = req.headers['x-user-email'] || 'Usuário';
            const userId = req.userId;
            const creatorUser = userId ? await prisma_1.prisma.user.findUnique({
                where: { id: userId },
                select: { name: true }
            }) : null;
            const responsavelNome = creatorUser?.name || executor || 'Sistema';
            // Validar saldos dos orçamentos se houver vinculação
            if (body.linkedQuotes && body.linkedQuotes.length > 0) {
                for (const link of body.linkedQuotes) {
                    const quote = await prisma_1.prisma.quote.findUnique({
                        where: { id: link.quoteId },
                        include: {
                            linkedReceivables: {
                                include: { receivable: true }
                            }
                        }
                    });
                    if (!quote) {
                        return res.status(404).json({ error: `Orçamento de ID ${link.quoteId} não encontrado.` });
                    }
                    // Calcular o total já utilizado (desconsiderando CANCELADA ou REPROVADA)
                    const totalUtilizado = quote.linkedReceivables
                        .filter(l => l.receivable.status !== 'CANCELADA' && l.receivable.status !== 'REPROVADA')
                        .reduce((sum, l) => sum + l.valorVinculado, 0);
                    const saldoDisponivel = Math.max(0, quote.total - totalUtilizado);
                    if (link.valorVinculado > saldoDisponivel) {
                        return res.status(400).json({
                            error: `Saldo restante a receber insuficiente no orçamento #${quote.numeroOrcamento}. Saldo restante a receber: R$ ${saldoDisponivel.toFixed(2)}, tentou lançar: R$ ${link.valorVinculado.toFixed(2)}.`
                        });
                    }
                }
            }
            const receivable = await prisma_1.prisma.financialReceivable.create({
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
                    responsavel: responsavelNome,
                    observacoes: body.observacoes,
                    status: body.status,
                    quoteId: body.quoteId || (body.linkedQuotes && body.linkedQuotes.length > 0 ? body.linkedQuotes[0].quoteId : null),
                    responsavel_lancamento_id: userId || null,
                    responsavel_lancamento_nome: responsavelNome,
                    data_criacao: new Date(),
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
            const quoteNumbers = [];
            if (body.linkedQuotes && body.linkedQuotes.length > 0) {
                for (const l of body.linkedQuotes) {
                    const qRecord = await prisma_1.prisma.quote.findUnique({ where: { id: l.quoteId }, select: { numeroOrcamento: true } });
                    if (qRecord)
                        quoteNumbers.push(qRecord.numeroOrcamento);
                }
            }
            const origemText = quoteNumbers.length > 0
                ? `Orçamento #${quoteNumbers.join(', #')}`
                : 'Lançamento Manual';
            const auditChanges = [
                `Data/Hora: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`,
                `Usuário: ${responsavelNome}`,
                `Operação: Criação de Conta a Receber`,
                `Origem: ${origemText}`,
                `Valor: R$ ${body.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            ].join('\n');
            await prisma_1.prisma.financialAudit.create({
                data: {
                    receivableId: receivable.id,
                    action: 'CREATE',
                    newStatus: body.status,
                    user: responsavelNome,
                    changes: auditChanges,
                }
            });
            return res.status(201).json(receivable);
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({ error: error.errors || error.message });
            }
            console.error('Error creating receivable:', error);
            return res.status(500).json({ error: 'Erro ao criar conta a receber' });
        }
    },
    async updateReceivable(req, res) {
        try {
            const id = req.params.id;
            const updateFields = req.body;
            const executor = req.headers['x-user-email'] || 'Usuário';
            const original = await prisma_1.prisma.financialReceivable.findUnique({ where: { id } });
            if (!original) {
                return res.status(404).json({ error: 'Lançamento não encontrado' });
            }
            // Validar saldos dos orçamentos se houver vinculação no update
            if (updateFields.linkedQuotes !== undefined) {
                if (updateFields.linkedQuotes && updateFields.linkedQuotes.length > 0) {
                    for (const link of updateFields.linkedQuotes) {
                        const quote = await prisma_1.prisma.quote.findUnique({
                            where: { id: link.quoteId },
                            include: {
                                linkedReceivables: {
                                    include: { receivable: true }
                                }
                            }
                        });
                        if (!quote) {
                            return res.status(404).json({ error: `Orçamento de ID ${link.quoteId} não encontrado.` });
                        }
                        // Calcular o saldo desconsiderando este receivable
                        const totalUtilizado = quote.linkedReceivables
                            .filter(l => l.receivable.status !== 'CANCELADA' && l.receivable.status !== 'REPROVADA' && l.receivableId !== id)
                            .reduce((sum, l) => sum + l.valorVinculado, 0);
                        const saldoDisponivel = Math.max(0, quote.total - totalUtilizado);
                        if (link.valorVinculado > saldoDisponivel) {
                            return res.status(400).json({
                                error: `Saldo restante a receber insuficiente no orçamento #${quote.numeroOrcamento}. Saldo restante a receber: R$ ${saldoDisponivel.toFixed(2)}, tentou lançar: R$ ${link.valorVinculado.toFixed(2)}.`
                            });
                        }
                    }
                }
                // Se a validação passou, limpar os links antigos e criar os novos
                await prisma_1.prisma.receivableQuoteLink.deleteMany({
                    where: { receivableId: id }
                });
                if (updateFields.linkedQuotes && updateFields.linkedQuotes.length > 0) {
                    await prisma_1.prisma.receivableQuoteLink.createMany({
                        data: updateFields.linkedQuotes.map((l) => ({
                            receivableId: id,
                            quoteId: l.quoteId,
                            valorVinculado: Number(l.valorVinculado)
                        }))
                    });
                }
            }
            const updateData = {
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
                quoteId: updateFields.quoteId !== undefined ? updateFields.quoteId : (updateFields.linkedQuotes && updateFields.linkedQuotes.length > 0 ? updateFields.linkedQuotes[0].quoteId : undefined),
            };
            if (updateFields.attachments && Array.isArray(updateFields.attachments)) {
                updateData.attachments = {
                    deleteMany: {},
                    create: updateFields.attachments.map((att) => ({
                        fileName: att.fileName,
                        fileType: att.fileType,
                        fileUrl: att.fileUrl,
                    })),
                };
            }
            const updated = await prisma_1.prisma.financialReceivable.update({
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
            await prisma_1.prisma.financialAudit.create({
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
        }
        catch (error) {
            console.error('Error updating receivable:', error);
            return res.status(500).json({ error: 'Erro ao atualizar conta a receber' });
        }
    },
    async deleteReceivable(req, res) {
        try {
            const id = req.params.id;
            const original = await prisma_1.prisma.financialReceivable.findUnique({ where: { id } });
            if (!original) {
                return res.status(404).json({ error: 'Lançamento não encontrado' });
            }
            await prisma_1.prisma.financialReceivable.delete({ where: { id } });
            return res.status(204).send();
        }
        catch (error) {
            console.error('Error deleting receivable:', error);
            return res.status(500).json({ error: 'Erro ao deletar conta a receber' });
        }
    },
    // 4. Workflow de Aprovação Financeira
    async approveTransaction(req, res) {
        try {
            const id = req.params.id;
            const { type, action, comments } = req.body; // type: 'PAGAR' | 'RECEBER', action: 'APPROVE' | 'REJECT'
            const executor = req.headers['x-user-email'] || 'Usuário';
            let newStatus = action === 'APPROVE' ? 'APROVADA' : 'REPROVADA';
            if (type === 'PAGAR') {
                const original = await prisma_1.prisma.financialPayable.findUnique({ where: { id } });
                if (!original)
                    return res.status(404).json({ error: 'Lançamento não encontrado' });
                // Se foi aprovado e tem pagamento automático
                if (original.pagamentoAutomatico && newStatus === 'APROVADA') {
                    newStatus = 'PAGA';
                }
                const updated = await prisma_1.prisma.financialPayable.update({
                    where: { id },
                    data: {
                        status: newStatus,
                        dataPagamento: newStatus === 'PAGA' ? new Date() : null,
                    },
                    include: { company: true, attachments: true }
                });
                await prisma_1.prisma.financialAudit.create({
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
            }
            else {
                const original = await prisma_1.prisma.financialReceivable.findUnique({ where: { id } });
                if (!original)
                    return res.status(404).json({ error: 'Lançamento não encontrado' });
                const updated = await prisma_1.prisma.financialReceivable.update({
                    where: { id },
                    data: { status: newStatus },
                    include: { company: true, attachments: true }
                });
                await prisma_1.prisma.financialAudit.create({
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
        }
        catch (error) {
            console.error('Error in approveTransaction:', error);
            return res.status(500).json({ error: 'Erro ao processar aprovação' });
        }
    },
    // 5. Histórico de Auditoria & Recorrência
    async getAuditHistory(req, res) {
        try {
            const { payableId, receivableId } = req.query;
            const whereClause = {};
            if (payableId)
                whereClause.payableId = payableId;
            if (receivableId)
                whereClause.receivableId = receivableId;
            const audits = await prisma_1.prisma.financialAudit.findMany({
                where: whereClause,
                orderBy: { createdAt: 'desc' }
            });
            return res.json(audits);
        }
        catch (error) {
            console.error('Error listing audits:', error);
            return res.status(500).json({ error: 'Erro ao buscar histórico de auditoria' });
        }
    },
    async getRecurrentHistory(req, res) {
        try {
            const { parentRecurrenceId } = req.query;
            if (!parentRecurrenceId) {
                return res.status(400).json({ error: 'parentRecurrenceId é obrigatório' });
            }
            const installments = await prisma_1.prisma.financialPayable.findMany({
                where: { parentRecurrenceId: parentRecurrenceId },
                orderBy: { parcelaAtual: 'asc' },
                include: { company: true }
            });
            return res.json(installments);
        }
        catch (error) {
            console.error('Error listing recurrences:', error);
            return res.status(500).json({ error: 'Erro ao carregar histórico de recorrência' });
        }
    }
};
