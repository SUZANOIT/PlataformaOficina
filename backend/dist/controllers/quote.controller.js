"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuoteController = void 0;
const prisma_1 = require("../lib/prisma");
const zod_1 = require("zod");
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
    items: zod_1.z.array(zod_1.z.object({
        descricao: zod_1.z.string(),
        quantidade: zod_1.z.number(),
        valorUnitario: zod_1.z.number(),
        valorTotal: zod_1.z.number(),
    })),
    subtotal: zod_1.z.number(),
    total: zod_1.z.number(),
});
exports.QuoteController = {
    async list(req, res) {
        try {
            const quotes = await prisma_1.prisma.quote.findMany({
                include: {
                    client: true,
                    company: true,
                    items: true,
                },
                orderBy: { createdAt: 'desc' }
            });
            return res.json(quotes);
        }
        catch (error) {
            return res.status(500).json({ error: 'Internal server error' });
        }
    },
    async getDashboardStats(req, res) {
        try {
            const quotesCount = await prisma_1.prisma.quote.count();
            const quotes = await prisma_1.prisma.quote.findMany({
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
            // Calculate breakdown by company
            const companies = await prisma_1.prisma.company.findMany();
            const companyBreakdown = await Promise.all(companies.map(async (company) => {
                const companyQuotes = await prisma_1.prisma.quote.findMany({
                    where: { companyId: company.id },
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
            return res.json({
                quotesCount,
                totalSold,
                recentQuotes,
                companyBreakdown
            });
        }
        catch (error) {
            return res.status(500).json({ error: 'Internal server error' });
        }
    },
    async create(req, res) {
        try {
            const data = createQuoteSchema.parse(req.body);
            // Create client first
            const client = await prisma_1.prisma.client.create({
                data: data.client,
            });
            // Create quote
            const quote = await prisma_1.prisma.quote.create({
                data: {
                    companyId: data.companyId,
                    clientId: client.id,
                    condicaoPagamento: data.condicaoPagamento,
                    parcelas: data.parcelas,
                    valorParcela: data.valorParcela,
                    validade: data.validade,
                    garantia: data.garantia,
                    prazoExecucao: data.prazoExecucao,
                    observacao: data.observacao,
                    subtotal: data.subtotal,
                    total: data.total,
                    items: {
                        create: data.items,
                    },
                },
                include: {
                    items: true,
                    client: true,
                    company: true
                }
            });
            return res.status(201).json(quote);
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({ error: error.errors });
            }
            return res.status(500).json({ error: 'Internal server error' });
        }
    },
    async show(req, res) {
        try {
            const { id } = req.params;
            const quote = await prisma_1.prisma.quote.findUnique({
                where: { id },
                include: {
                    items: true,
                    client: true,
                    company: true
                }
            });
            if (!quote) {
                return res.status(404).json({ error: 'Quote not found' });
            }
            return res.json(quote);
        }
        catch (error) {
            return res.status(500).json({ error: 'Internal server error' });
        }
    },
    async update(req, res) {
        try {
            const { id } = req.params;
            const data = createQuoteSchema.parse(req.body);
            const existingQuote = await prisma_1.prisma.quote.findUnique({
                where: { id },
                include: { client: true }
            });
            if (!existingQuote) {
                return res.status(404).json({ error: 'Quote not found' });
            }
            // Update client
            await prisma_1.prisma.client.update({
                where: { id: existingQuote.clientId },
                data: data.client,
            });
            // Update quote & items (delete old, create new)
            const quote = await prisma_1.prisma.quote.update({
                where: { id },
                data: {
                    companyId: data.companyId,
                    condicaoPagamento: data.condicaoPagamento,
                    parcelas: data.parcelas,
                    valorParcela: data.valorParcela,
                    validade: data.validade,
                    garantia: data.garantia,
                    prazoExecucao: data.prazoExecucao,
                    observacao: data.observacao,
                    subtotal: data.subtotal,
                    total: data.total,
                    items: {
                        deleteMany: {},
                        create: data.items,
                    }
                },
                include: {
                    items: true,
                    client: true,
                    company: true
                }
            });
            return res.json(quote);
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({ error: error.errors });
            }
            return res.status(500).json({ error: 'Internal server error' });
        }
    },
    async delete(req, res) {
        try {
            const { id } = req.params;
            const existingQuote = await prisma_1.prisma.quote.findUnique({
                where: { id }
            });
            if (!existingQuote) {
                return res.status(404).json({ error: 'Quote not found' });
            }
            await prisma_1.prisma.quote.delete({
                where: { id }
            });
            return res.status(204).send();
        }
        catch (error) {
            return res.status(500).json({ error: 'Internal server error' });
        }
    }
};
