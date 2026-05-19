"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuoteController = void 0;
const client_1 = require("@prisma/client");
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
            if (!data.items || data.items.length === 0) {
                return res.status(400).json({ error: 'Quote must contain at least one item' });
            }
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
            console.log(`Quote created: #${quote.numeroOrcamento} for client ${client.nome} (id=${quote.id})`);
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
                    company: true
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
            console.log(`Quote updated: #${quote.numeroOrcamento} (id=${quote.id})`);
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
    }
};
