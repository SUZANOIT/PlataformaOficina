"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuoteController = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = require("../lib/prisma");
const zod_1 = require("zod");
const audit_logger_1 = require("../utils/audit.logger");
const quoteHistory_helper_1 = require("../utils/quoteHistory.helper");
const createQuoteSchema = zod_1.z.object({
    companyId: zod_1.z.string(),
    client: zod_1.z.object({
        nome: zod_1.z.string(),
        empresa: zod_1.z.string().nullish(),
        cnpj: zod_1.z.string().nullish(),
        telefone: zod_1.z.string().nullish(),
        email: zod_1.z.string().nullish(),
        cidade: zod_1.z.string().nullish(),
        estado: zod_1.z.string().nullish(),
        logradouro: zod_1.z.string().nullish(),
        numero: zod_1.z.string().nullish(),
        complemento: zod_1.z.string().nullish(),
        bairro: zod_1.z.string().nullish(),
        cep: zod_1.z.string().nullish(),
        dataSituacao: zod_1.z.string().nullish(),
        atividadePrincipal: zod_1.z.string().nullish(),
    }),
    condicaoPagamento: zod_1.z.string(),
    parcelas: zod_1.z.number().nullish(),
    valorParcela: zod_1.z.number().nullish(),
    validade: zod_1.z.string(),
    garantia: zod_1.z.string().nullish(),
    prazoExecucao: zod_1.z.string().nullish(),
    observacao: zod_1.z.string().nullish(),
    veiculoMarca: zod_1.z.string().nullish(),
    veiculoModelo: zod_1.z.string().nullish(),
    veiculoAno: zod_1.z.string().nullish(),
    veiculoPlaca: zod_1.z.string().nullish(),
    veiculoPrefixo: zod_1.z.string().nullish(),
    veiculoAnoFabricacao: zod_1.z.string().nullish(),
    veiculoAnoModelo: zod_1.z.string().nullish(),
    veiculoChassi: zod_1.z.string().nullish(),
    veiculoRenavam: zod_1.z.string().nullish(),
    veiculoFrota: zod_1.z.string().nullish(),
    veiculoSubfrota: zod_1.z.string().nullish(),
    veiculoHodometro: zod_1.z.string().nullish(),
    veiculoTipo: zod_1.z.string().nullish(),
    plataformaGestaoId: zod_1.z.string().nullish(),
    osExterna: zod_1.z.string().max(100).nullish(),
    oficinaId: zod_1.z.string().nullish(),
    notaFiscalDescricao: zod_1.z.string().nullish(),
    isCloned: zod_1.z.boolean().optional().default(false),
    clonedFromId: zod_1.z.string().nullish(),
    items: zod_1.z.array(zod_1.z.object({
        descricao: zod_1.z.string(),
        quantidade: zod_1.z.number(),
        valorUnitario: zod_1.z.number(),
        valorTotal: zod_1.z.number(),
        tipo: zod_1.z.string().optional().default("Peça"),
        codigoPeca: zod_1.z.string().max(100).nullish(),
        tipoPeca: zod_1.z.string().nullish(),
    })).superRefine((items, ctx) => {
        items.forEach((item, index) => {
            if (item.tipo === 'Peça') {
                const validTipos = ['Genuína', 'Original', 'Paralela', 'Remanufaturada'];
                if (!item.tipoPeca || !validTipos.includes(item.tipoPeca)) {
                    ctx.addIssue({
                        code: zod_1.z.ZodIssueCode.custom,
                        message: 'Tipo da peça deve ser Genuína, Original, Paralela ou Remanufaturada',
                        path: [index, 'tipoPeca']
                    });
                }
            }
        });
    }),
    subtotal: zod_1.z.number(),
    total: zod_1.z.number(),
    status: zod_1.z.string().optional().default("Aguardando Aprovação"),
});
async function resolveClientForQuote(clientData, existingClient) {
    const normalizedCnpj = clientData.cnpj ? clientData.cnpj.trim().replace(/\D/g, '') : '';
    const normalizedEmail = clientData.email ? clientData.email.trim().toLowerCase() : '';
    const normalizedNome = clientData.nome.trim();
    if (existingClient) {
        const existingCnpj = existingClient.cnpj ? existingClient.cnpj.trim().replace(/\D/g, '') : '';
        const existingEmail = existingClient.email ? existingClient.email.trim().toLowerCase() : '';
        const existingNome = existingClient.nome.trim().toLowerCase();
        const isSameClient = (normalizedCnpj && existingCnpj && normalizedCnpj === existingCnpj) ||
            (normalizedEmail && existingEmail && normalizedEmail === existingEmail) ||
            existingNome === normalizedNome.toLowerCase();
        if (isSameClient) {
            return prisma_1.prisma.client.update({
                where: { id: existingClient.id },
                data: clientData,
            });
        }
    }
    let client;
    if (normalizedCnpj && normalizedCnpj.length === 14) {
        client = await prisma_1.prisma.client.findFirst({
            where: {
                cnpj: {
                    contains: normalizedCnpj
                }
            }
        });
    }
    if (!client && normalizedEmail) {
        client = await prisma_1.prisma.client.findFirst({
            where: {
                email: {
                    equals: normalizedEmail,
                    mode: 'insensitive'
                }
            }
        });
    }
    if (!client) {
        client = await prisma_1.prisma.client.findFirst({
            where: {
                nome: {
                    equals: normalizedNome,
                    mode: 'insensitive'
                }
            }
        });
    }
    if (client) {
        return prisma_1.prisma.client.update({
            where: { id: client.id },
            data: clientData,
        });
    }
    return prisma_1.prisma.client.create({
        data: clientData,
    });
}
exports.QuoteController = {
    async list(req, res) {
        try {
            const quotes = await prisma_1.prisma.quote.findMany({
                include: {
                    client: true,
                    company: true,
                    items: true,
                    plataformaGestao: true,
                    oficina: true
                },
                orderBy: { createdAt: 'desc' }
            });
            return res.json(quotes);
        }
        catch (error) {
            if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
                console.error('Prisma error in quote.list:', error.code, error.message);
                return res.status(500).json({ error: 'Database error', code: error.code });
            }
            console.error('Error in quote.list:', error);
            return res.status(500).json({
                error: 'Internal server error',
                details: process.env.NODE_ENV !== 'production' && error instanceof Error ? error.message : undefined,
            });
        }
    },
    async getDashboardStats(req, res) {
        try {
            const quotesCount = await prisma_1.prisma.quote.count();
            // Find MCA company dynamically
            const mcaCompany = await prisma_1.prisma.company.findFirst({
                where: {
                    OR: [
                        { razaoSocial: { contains: 'mca', mode: 'insensitive' } },
                        { nomeFantasia: { contains: 'mca', mode: 'insensitive' } }
                    ]
                }
            });
            const mcaCompanyId = mcaCompany?.id || 'mca-padrao-company-uuid-000000000001';
            const quotes = await prisma_1.prisma.quote.findMany({
                where: {
                    companyId: mcaCompanyId,
                    status: {
                        in: ['Aprovado', 'Emitir Nota Fiscal', 'Pago']
                    }
                },
                select: { total: true }
            });
            const totalSold = quotes.reduce((acc, q) => acc + q.total, 0);
            const recentQuotes = await prisma_1.prisma.quote.findMany({
                take: 5,
                orderBy: { createdAt: 'desc' },
                include: {
                    client: true,
                    company: true
                }
            });
            // Calculate breakdown by company excluding Cobertura
            const companies = await prisma_1.prisma.company.findMany();
            const companyBreakdown = await Promise.all(companies.map(async (company) => {
                const companyQuotes = await prisma_1.prisma.quote.findMany({
                    where: {
                        companyId: company.id,
                        status: {
                            in: ['Aprovado', 'Emitir Nota Fiscal', 'Pago']
                        }
                    },
                    select: { total: true }
                });
                const count = companyQuotes.length;
                const total = companyQuotes.reduce((acc, q) => acc + q.total, 0);
                return {
                    companyId: company.id,
                    companyName: company.razaoSocial || company.nomeFantasia,
                    quotesCount: count,
                    totalSold: total
                };
            }));
            const activeClientsCount = await prisma_1.prisma.client.count({
                where: { status: 'ATIVO' }
            });
            const activeClientsList = await prisma_1.prisma.client.findMany({
                where: { status: 'ATIVO' },
                select: {
                    id: true,
                    nome: true,
                    empresa: true,
                    cnpj: true,
                    email: true,
                    telefone: true
                },
                orderBy: { nome: 'asc' }
            });
            return res.json({
                quotesCount,
                totalSold,
                recentQuotes,
                companyBreakdown,
                activeClientsCount,
                activeClientsList
            });
        }
        catch (error) {
            if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
                console.error('Prisma error in quote.getDashboardStats:', error.code, error.message);
                return res.status(500).json({ error: 'Database error', code: error.code });
            }
            console.error('Error in quote.getDashboardStats:', error);
            return res.status(500).json({
                error: 'Internal server error',
                details: process.env.NODE_ENV !== 'production' && error instanceof Error ? error.message : undefined,
            });
        }
    },
    async create(req, res) {
        try {
            const data = createQuoteSchema.parse(req.body);
            let finalCompanyId = data.companyId;
            if (data.isCloned || data.clonedFromId) {
                const curio = await prisma_1.prisma.company.findFirst({
                    where: {
                        OR: [
                            { razaoSocial: { contains: 'curio', mode: 'insensitive' } },
                            { nomeFantasia: { contains: 'curio', mode: 'insensitive' } },
                            { razaoSocial: { contains: 'curió', mode: 'insensitive' } },
                            { nomeFantasia: { contains: 'curió', mode: 'insensitive' } }
                        ]
                    }
                });
                if (!curio) {
                    return res.status(400).json({ error: 'Empresa Curio não cadastrada no sistema' });
                }
                finalCompanyId = curio.id;
            }
            // Validar limite mensal de Ordens de Serviço (OS) do plano
            const company = await prisma_1.prisma.company.findUnique({
                where: { id: finalCompanyId },
                include: { plan: true }
            });
            const isCurio = company && ((company.razaoSocial || '').toLowerCase().includes('curio') ||
                (company.razaoSocial || '').toLowerCase().includes('curió') ||
                (company.nomeFantasia || '').toLowerCase().includes('curio') ||
                (company.nomeFantasia || '').toLowerCase().includes('curió'));
            if (company && company.plan) {
                const startOfMonth = new Date();
                startOfMonth.setDate(1);
                startOfMonth.setHours(0, 0, 0, 0);
                const endOfMonth = new Date();
                endOfMonth.setMonth(endOfMonth.getMonth() + 1);
                endOfMonth.setDate(0);
                endOfMonth.setHours(23, 59, 59, 999);
                const osCount = await prisma_1.prisma.quote.count({
                    where: {
                        companyId: finalCompanyId,
                        createdAt: {
                            gte: startOfMonth,
                            lte: endOfMonth
                        }
                    }
                });
                if (osCount >= company.plan.limiteOsMes) {
                    return res.status(403).json({
                        error: `Limite mensal de ordens de serviço atingido para o plano ${company.plan.nome} (${company.plan.limiteOsMes} OS/mês).`,
                        code: 'PLAN_LIMIT_REACHED'
                    });
                }
            }
            if (!data.items || data.items.length === 0) {
                return res.status(400).json({ error: 'Quote must contain at least one item' });
            }
            // Prevenir duplicação de cliente: busca por CNPJ, E-mail ou Nome antes de criar
            let client;
            const normalizedCnpj = data.client.cnpj ? data.client.cnpj.trim().replace(/\D/g, '') : '';
            const normalizedEmail = data.client.email ? data.client.email.trim().toLowerCase() : '';
            const normalizedNome = data.client.nome.trim();
            if (normalizedCnpj && normalizedCnpj.length === 14) {
                client = await prisma_1.prisma.client.findFirst({
                    where: {
                        cnpj: {
                            contains: normalizedCnpj
                        }
                    }
                });
            }
            if (!client && normalizedEmail) {
                client = await prisma_1.prisma.client.findFirst({
                    where: {
                        email: {
                            equals: normalizedEmail,
                            mode: 'insensitive'
                        }
                    }
                });
            }
            if (!client) {
                client = await prisma_1.prisma.client.findFirst({
                    where: {
                        nome: {
                            equals: normalizedNome,
                            mode: 'insensitive'
                        }
                    }
                });
            }
            if (client) {
                // Atualiza os dados do cliente existente para mantê-lo atualizado
                client = await prisma_1.prisma.client.update({
                    where: { id: client.id },
                    data: data.client,
                });
            }
            else {
                // Cria um novo cliente apenas se realmente não existir na base
                client = await prisma_1.prisma.client.create({
                    data: data.client,
                });
            }
            // Resolve or create vehicle
            let veiculoId = null;
            if (data.veiculoPlaca && data.veiculoPlaca.trim() !== '') {
                const cleanPlate = data.veiculoPlaca.toUpperCase().replace(/[\s-]/g, "");
                const cleanChassi = data.veiculoChassi ? data.veiculoChassi.trim() : '';
                let vehicle = await prisma_1.prisma.vehicle.findUnique({
                    where: { placa: cleanPlate }
                });
                if (!vehicle && cleanChassi) {
                    vehicle = await prisma_1.prisma.vehicle.findFirst({
                        where: { OR: [{ chassi: cleanChassi }, { vin: cleanChassi }] }
                    });
                }
                const parsedYear = data.veiculoAnoFabricacao ? (parseInt(data.veiculoAnoFabricacao) || 2020) : (data.veiculoAno ? (parseInt(data.veiculoAno) || 2020) : 2020);
                const parsedAnoModelo = data.veiculoAnoModelo ? (parseInt(data.veiculoAnoModelo) || 2020) : (data.veiculoAno ? (parseInt(data.veiculoAno) || 2020) : 2020);
                const hodometro = data.veiculoHodometro ? (parseInt(data.veiculoHodometro.replace(/\D/g, '')) || 0) : 0;
                if (vehicle) {
                    vehicle = await prisma_1.prisma.vehicle.update({
                        where: { id: vehicle.id },
                        data: {
                            clienteId: client.id,
                            kmAtual: hodometro > vehicle.kmAtual ? hodometro : vehicle.kmAtual,
                            marca: data.veiculoMarca || vehicle.marca,
                            modelo: data.veiculoModelo || vehicle.modelo,
                            prefixo: data.veiculoPrefixo || vehicle.prefixo,
                            chassi: data.veiculoChassi || vehicle.chassi,
                            vin: data.veiculoChassi || vehicle.vin,
                            renavam: data.veiculoRenavam || vehicle.renavam,
                            frota: data.veiculoFrota || vehicle.frota,
                            subfrota: data.veiculoSubfrota || vehicle.subfrota,
                            tipoVeiculo: data.veiculoTipo || vehicle.tipoVeiculo,
                        }
                    });
                    veiculoId = vehicle.id;
                }
                else {
                    const newVehicle = await prisma_1.prisma.vehicle.create({
                        data: {
                            placa: cleanPlate,
                            marca: data.veiculoMarca || 'N/A',
                            modelo: data.veiculoModelo || 'N/A',
                            anoFabricacao: parsedYear,
                            anoModelo: parsedAnoModelo,
                            chassi: data.veiculoChassi || null,
                            vin: data.veiculoChassi || null,
                            renavam: data.veiculoRenavam || null,
                            frota: data.veiculoFrota || null,
                            subfrota: data.veiculoSubfrota || null,
                            prefixo: data.veiculoPrefixo || null,
                            tipoVeiculo: data.veiculoTipo || null,
                            kmAtual: hodometro,
                            clienteId: client.id,
                            companyId: finalCompanyId,
                            status: 'ATIVO',
                            observacoes: `Criado automaticamente via Novo Orçamento`
                        }
                    });
                    veiculoId = newVehicle.id;
                }
            }
            // Create quote
            const quote = await prisma_1.prisma.quote.create({
                data: {
                    companyId: finalCompanyId,
                    clientId: client.id,
                    condicaoPagamento: data.condicaoPagamento,
                    parcelas: data.parcelas,
                    valorParcela: data.valorParcela,
                    validade: data.validade,
                    garantia: data.garantia,
                    prazoExecucao: data.prazoExecucao,
                    observacao: data.observacao,
                    veiculoMarca: data.veiculoMarca,
                    veiculoModelo: data.veiculoModelo,
                    veiculoAno: data.veiculoAno,
                    veiculoPlaca: data.veiculoPlaca,
                    veiculoPrefixo: data.veiculoPrefixo,
                    veiculoAnoFabricacao: data.veiculoAnoFabricacao,
                    veiculoAnoModelo: data.veiculoAnoModelo,
                    veiculoChassi: data.veiculoChassi,
                    veiculoRenavam: data.veiculoRenavam,
                    veiculoFrota: data.veiculoFrota,
                    veiculoSubfrota: data.veiculoSubfrota,
                    veiculoHodometro: data.veiculoHodometro,
                    veiculoTipo: data.veiculoTipo,
                    veiculoId: veiculoId,
                    plataformaGestaoId: data.plataformaGestaoId || null,
                    osExterna: data.osExterna,
                    oficinaId: data.oficinaId || null,
                    notaFiscalDescricao: data.notaFiscalDescricao || null,
                    isCloned: data.isCloned || !!data.clonedFromId,
                    clonedFromId: data.clonedFromId,
                    subtotal: data.subtotal,
                    total: data.total,
                    status: isCurio ? 'Cobertura' : data.status,
                    items: {
                        create: data.items,
                    },
                },
                include: {
                    items: true,
                    client: true,
                    company: true,
                    plataformaGestao: true,
                    oficina: true
                }
            });
            console.log(`Quote created: #${quote.numeroOrcamento} for client ${client.nome} (id=${quote.id})`);
            // Audit log for added parts
            const parts = data.items.filter(item => item.tipo === 'Peça');
            if (parts.length > 0) {
                const userId = req.userId || 'SYSTEM';
                const companyId = req.companyId || finalCompanyId;
                parts.forEach(part => {
                    audit_logger_1.AuditLogger.log(userId, companyId, 'ADD_PART', `Peça adicionada no orçamento #${quote.numeroOrcamento}: Descrição: ${part.descricao}, Código: ${part.codigoPeca}, Tipo: ${part.tipoPeca}, Qtd: ${part.quantidade}, Valor: ${part.valorUnitario}`, 'SUCCESS');
                });
            }
            try {
                const userId = req.userId || undefined;
                const userName = req.userName || 'Sistema';
                await prisma_1.prisma.quoteHistory.create({
                    data: quoteHistory_helper_1.QuoteHistoryHelper.createEvent({
                        quoteId: quote.id,
                        companyId: finalCompanyId,
                        userId,
                        userName
                    }, 'CRIADO', 'ORÇAMENTO CRIADO')
                });
            }
            catch (err) {
                console.error('Failed to log quote history on create:', err);
            }
            return res.status(201).json(quote);
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({ error: error.errors });
            }
            if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2003') {
                    return res.status(400).json({ error: 'Invalid companyId: company not found' });
                }
                console.error('Prisma error in quote.create:', error.code, error.message);
                return res.status(500).json({ error: 'Database error', code: error.code });
            }
            console.error('Error in quote.create:', error);
            return res.status(500).json({
                error: 'Internal server error',
                details: process.env.NODE_ENV !== 'production' && error instanceof Error ? error.message : undefined,
            });
        }
    },
    async show(req, res) {
        try {
            const id = req.params.id;
            const quote = await prisma_1.prisma.quote.findUnique({
                where: { id },
                include: {
                    items: true,
                    client: true,
                    company: true,
                    plataformaGestao: true,
                    oficina: true,
                    history: {
                        orderBy: { createdAt: 'desc' },
                        take: 1
                    }
                }
            });
            if (!quote) {
                return res.status(404).json({ error: 'Quote not found' });
            }
            return res.json(quote);
        }
        catch (error) {
            if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
                console.error('Prisma error in quote.show:', error.code, error.message);
                return res.status(500).json({ error: 'Database error', code: error.code });
            }
            console.error('Error in quote.show:', error);
            return res.status(500).json({
                error: 'Internal server error',
                details: process.env.NODE_ENV !== 'production' && error instanceof Error ? error.message : undefined,
            });
        }
    },
    async update(req, res) {
        try {
            const id = req.params.id;
            const data = createQuoteSchema.parse(req.body);
            if (!data.items || data.items.length === 0) {
                return res.status(400).json({ error: 'Quote must contain at least one item' });
            }
            const existingQuote = await prisma_1.prisma.quote.findUnique({
                where: { id },
                include: { client: true, items: true }
            });
            if (!existingQuote) {
                return res.status(404).json({ error: 'Quote not found' });
            }
            if (existingQuote.isCloned || existingQuote.clonedFromId) {
                if (data.companyId !== existingQuote.companyId) {
                    return res.status(400).json({ error: 'Não é permitido alterar a empresa de um orçamento clonado.' });
                }
            }
            const targetCompanyId = data.companyId || existingQuote.companyId;
            const company = await prisma_1.prisma.company.findUnique({
                where: { id: targetCompanyId }
            });
            const isCurio = company && ((company.razaoSocial || '').toLowerCase().includes('curio') ||
                (company.razaoSocial || '').toLowerCase().includes('curió') ||
                (company.nomeFantasia || '').toLowerCase().includes('curio') ||
                (company.nomeFantasia || '').toLowerCase().includes('curió'));
            const client = await resolveClientForQuote(data.client, existingQuote.client);
            // Resolve or create vehicle
            let veiculoId = null;
            if (data.veiculoPlaca && data.veiculoPlaca.trim() !== '') {
                const cleanPlate = data.veiculoPlaca.toUpperCase().replace(/[\s-]/g, "");
                const cleanChassi = data.veiculoChassi ? data.veiculoChassi.trim() : '';
                let vehicle = await prisma_1.prisma.vehicle.findUnique({
                    where: { placa: cleanPlate }
                });
                if (!vehicle && cleanChassi) {
                    vehicle = await prisma_1.prisma.vehicle.findFirst({
                        where: { OR: [{ chassi: cleanChassi }, { vin: cleanChassi }] }
                    });
                }
                const parsedYear = data.veiculoAnoFabricacao ? (parseInt(data.veiculoAnoFabricacao) || 2020) : (data.veiculoAno ? (parseInt(data.veiculoAno) || 2020) : 2020);
                const parsedAnoModelo = data.veiculoAnoModelo ? (parseInt(data.veiculoAnoModelo) || 2020) : (data.veiculoAno ? (parseInt(data.veiculoAno) || 2020) : 2020);
                const hodometro = data.veiculoHodometro ? (parseInt(data.veiculoHodometro.replace(/\D/g, '')) || 0) : 0;
                if (vehicle) {
                    vehicle = await prisma_1.prisma.vehicle.update({
                        where: { id: vehicle.id },
                        data: {
                            clienteId: client.id,
                            kmAtual: hodometro > vehicle.kmAtual ? hodometro : vehicle.kmAtual,
                            marca: data.veiculoMarca || vehicle.marca,
                            modelo: data.veiculoModelo || vehicle.modelo,
                            prefixo: data.veiculoPrefixo || vehicle.prefixo,
                            chassi: data.veiculoChassi || vehicle.chassi,
                            vin: data.veiculoChassi || vehicle.vin,
                            renavam: data.veiculoRenavam || vehicle.renavam,
                            frota: data.veiculoFrota || vehicle.frota,
                            subfrota: data.veiculoSubfrota || vehicle.subfrota,
                            tipoVeiculo: data.veiculoTipo || vehicle.tipoVeiculo,
                        }
                    });
                    veiculoId = vehicle.id;
                }
                else {
                    const newVehicle = await prisma_1.prisma.vehicle.create({
                        data: {
                            placa: cleanPlate,
                            marca: data.veiculoMarca || 'N/A',
                            modelo: data.veiculoModelo || 'N/A',
                            anoFabricacao: parsedYear,
                            anoModelo: parsedAnoModelo,
                            chassi: data.veiculoChassi || null,
                            vin: data.veiculoChassi || null,
                            renavam: data.veiculoRenavam || null,
                            frota: data.veiculoFrota || null,
                            subfrota: data.veiculoSubfrota || null,
                            prefixo: data.veiculoPrefixo || null,
                            tipoVeiculo: data.veiculoTipo || null,
                            kmAtual: hodometro,
                            clienteId: client.id,
                            companyId: data.companyId,
                            status: 'ATIVO',
                            observacoes: `Criado automaticamente via Edição de Orçamento`
                        }
                    });
                    veiculoId = newVehicle.id;
                }
            }
            // Update quote & items (delete old, create new) in transaction
            const quoteItems = data.items.map(item => ({
                descricao: item.descricao,
                quantidade: item.quantidade,
                valorUnitario: item.valorUnitario,
                valorTotal: item.valorTotal,
                tipo: item.tipo,
                codigoPeca: item.codigoPeca,
                tipoPeca: item.tipoPeca,
            }));
            let quote = await prisma_1.prisma.$transaction(async (tx) => {
                const updatedQuote = await tx.quote.update({
                    where: { id },
                    data: {
                        clientId: client.id,
                        condicaoPagamento: data.condicaoPagamento,
                        parcelas: data.parcelas,
                        valorParcela: data.valorParcela,
                        validade: data.validade,
                        garantia: data.garantia,
                        prazoExecucao: data.prazoExecucao,
                        observacao: data.observacao,
                        veiculoMarca: data.veiculoMarca,
                        veiculoModelo: data.veiculoModelo,
                        veiculoAno: data.veiculoAno,
                        veiculoPlaca: data.veiculoPlaca,
                        veiculoPrefixo: data.veiculoPrefixo,
                        veiculoAnoFabricacao: data.veiculoAnoFabricacao,
                        veiculoAnoModelo: data.veiculoAnoModelo,
                        veiculoChassi: data.veiculoChassi,
                        veiculoRenavam: data.veiculoRenavam,
                        veiculoFrota: data.veiculoFrota,
                        veiculoSubfrota: data.veiculoSubfrota,
                        veiculoHodometro: data.veiculoHodometro,
                        veiculoTipo: data.veiculoTipo,
                        veiculoId: veiculoId,
                        plataformaGestaoId: data.plataformaGestaoId || null,
                        osExterna: data.osExterna,
                        oficinaId: data.oficinaId || null,
                        notaFiscalDescricao: data.notaFiscalDescricao || null,
                        subtotal: data.subtotal,
                        total: data.total,
                        status: isCurio ? 'Cobertura' : data.status,
                        items: {
                            deleteMany: {},
                            create: quoteItems,
                        }
                    },
                    include: {
                        items: true,
                        client: true,
                        company: true,
                        plataformaGestao: true,
                        oficina: true
                    }
                });
                try {
                    const userId = req.userId || undefined;
                    const userName = req.userName || 'Sistema';
                    const historyEvents = quoteHistory_helper_1.QuoteHistoryHelper.generateDiff(existingQuote, { ...data, items: quoteItems }, { quoteId: id, companyId: existingQuote.companyId, userId, userName });
                    if (historyEvents.length > 0) {
                        await tx.quoteHistory.createMany({
                            data: historyEvents
                        });
                    }
                }
                catch (err) {
                    console.error('Failed to log quote history on update:', err);
                }
                return updatedQuote;
            });
            if (data.companyId && data.companyId !== existingQuote.companyId) {
                const targetCompany = await prisma_1.basePrisma.company.findUnique({
                    where: { id: data.companyId }
                });
                if (!targetCompany) {
                    return res.status(400).json({ error: 'Invalid companyId: company not found' });
                }
                quote = await prisma_1.basePrisma.quote.update({
                    where: { id },
                    data: { companyId: data.companyId },
                    include: {
                        items: true,
                        client: true,
                        company: true,
                        plataformaGestao: true,
                        oficina: true
                    }
                });
            }
            console.log(`Quote updated: #${quote.numeroOrcamento} (id=${quote.id})`);
            const userId = req.userId || 'SYSTEM';
            const companyId = req.companyId || data.companyId;
            audit_logger_1.AuditLogger.log(userId, companyId, 'UPDATE_QUOTE', `Orçamento #${quote.numeroOrcamento} atualizado por ${userId}`, 'SUCCESS');
            // Audit log for added/updated parts
            const parts = data.items.filter(item => item.tipo === 'Peça');
            if (parts.length > 0) {
                parts.forEach(part => {
                    audit_logger_1.AuditLogger.log(userId, companyId, 'ADD_PART', `Peça atualizada no orçamento #${quote.numeroOrcamento}: Descrição: ${part.descricao}, Código: ${part.codigoPeca}, Tipo: ${part.tipoPeca}, Qtd: ${part.quantidade}, Valor: ${part.valorUnitario}`, 'SUCCESS');
                });
            }
            return res.json(quote);
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({ error: error.errors });
            }
            if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2025') {
                    return res.status(404).json({ error: 'Quote not found' });
                }
                if (error.code === 'P2003') {
                    return res.status(400).json({ error: 'Invalid companyId: company not found' });
                }
                console.error('Prisma error in quote.update:', error.code, error.message);
                return res.status(500).json({ error: 'Database error', code: error.code });
            }
            console.error('Error in quote.update:', error);
            return res.status(500).json({
                error: 'Internal server error',
                details: process.env.NODE_ENV !== 'production' && error instanceof Error ? error.message : undefined,
            });
        }
    },
    async delete(req, res) {
        try {
            const id = req.params.id;
            const existingQuote = await prisma_1.prisma.quote.findUnique({
                where: { id }
            });
            if (!existingQuote) {
                return res.status(404).json({ error: 'Quote not found' });
            }
            await prisma_1.prisma.quote.delete({
                where: { id }
            });
            console.log(`Quote deleted: #${existingQuote.numeroOrcamento} (id=${existingQuote.id})`);
            return res.status(204).send();
        }
        catch (error) {
            if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2025') {
                    return res.status(404).json({ error: 'Quote not found' });
                }
                console.error('Prisma error in quote.delete:', error.code, error.message);
                return res.status(500).json({ error: 'Database error', code: error.code });
            }
            console.error('Error in quote.delete:', error);
            return res.status(500).json({
                error: 'Internal server error',
                details: process.env.NODE_ENV !== 'production' && error instanceof Error ? error.message : undefined,
            });
        }
    },
    async getHistory(req, res) {
        try {
            const id = req.params.id;
            const history = await prisma_1.prisma.quoteHistory.findMany({
                where: { quoteId: id },
                orderBy: { createdAt: 'desc' }
            });
            return res.json(history);
        }
        catch (error) {
            console.error('Error fetching quote history:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }
};
