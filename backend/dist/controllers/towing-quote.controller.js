"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TowingQuoteController = void 0;
const prisma_1 = require("../lib/prisma");
const zod_1 = require("zod");
const audit_logger_1 = require("../utils/audit.logger");
const createTowingQuoteSchema = zod_1.z.object({
    clienteNome: zod_1.z.string().optional(),
    clienteEmpresa: zod_1.z.string().optional(),
    clienteTelefone: zod_1.z.string().optional(),
    clienteEmail: zod_1.z.string().optional(),
    clienteDoc: zod_1.z.string().optional(),
    origemCep: zod_1.z.string().optional(),
    origemEndereco: zod_1.z.string().optional(),
    origemNumero: zod_1.z.string().optional(),
    origemComplemento: zod_1.z.string().optional(),
    origemCidade: zod_1.z.string().optional(),
    origemEstado: zod_1.z.string().optional(),
    destinoCep: zod_1.z.string().optional(),
    destinoEndereco: zod_1.z.string().optional(),
    destinoNumero: zod_1.z.string().optional(),
    destinoComplemento: zod_1.z.string().optional(),
    destinoCidade: zod_1.z.string().optional(),
    destinoEstado: zod_1.z.string().optional(),
    distanciaKm: zod_1.z.number().optional(),
    tempoEstimadoMin: zod_1.z.number().optional(),
    veiculoPlaca: zod_1.z.string().optional(),
    veiculoMarca: zod_1.z.string().optional(),
    veiculoModelo: zod_1.z.string().optional(),
    veiculoAno: zod_1.z.string().optional(),
    veiculoCor: zod_1.z.string().optional(),
    tipoGuincho: zod_1.z.string().optional(),
    taxaSaida: zod_1.z.number().optional().default(0),
    valorKm: zod_1.z.number().optional().default(0),
    horasParadas: zod_1.z.number().optional().default(0),
    valorHoraParada: zod_1.z.number().optional().default(0),
    pedagios: zod_1.z.number().optional().default(0),
    despesasExtras: zod_1.z.number().optional().default(0),
    descontos: zod_1.z.number().optional().default(0),
    acrescimos: zod_1.z.number().optional().default(0),
    valorTotal: zod_1.z.number().optional().default(0),
    observacoes: zod_1.z.string().optional(),
});
exports.TowingQuoteController = {
    async list(req, res) {
        try {
            const companyId = req.companyId;
            const quotes = await prisma_1.prisma.towingQuote.findMany({
                where: { companyId },
                orderBy: { createdAt: 'desc' }
            });
            return res.json(quotes);
        }
        catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    },
    async getDashboardStats(req, res) {
        try {
            const companyId = req.companyId;
            const quotes = await prisma_1.prisma.towingQuote.findMany({
                where: { companyId }
            });
            const totalQuotes = quotes.length;
            const totalRevenue = quotes.reduce((acc, q) => acc + q.valorTotal, 0);
            const ticketMedio = totalQuotes > 0 ? totalRevenue / totalQuotes : 0;
            const totalKm = quotes.reduce((acc, q) => acc + (q.distanciaKm || 0), 0);
            const closedQuotes = quotes.filter(q => q.status === 'Aprovado' || q.status === 'Concluído');
            const closedRevenue = closedQuotes.reduce((acc, q) => acc + q.valorTotal, 0);
            return res.json({
                totalQuotes,
                totalRevenue,
                ticketMedio,
                totalKm,
                closedQuotes: closedQuotes.length,
                closedRevenue
            });
        }
        catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    },
    async show(req, res) {
        try {
            const id = req.params.id;
            const companyId = req.companyId;
            const quote = await prisma_1.prisma.towingQuote.findUnique({
                where: { id }
            });
            if (!quote || quote.companyId !== companyId) {
                return res.status(404).json({ error: 'Quote not found' });
            }
            return res.json(quote);
        }
        catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    },
    async create(req, res) {
        try {
            const companyId = req.companyId;
            const userId = req.userId;
            const data = createTowingQuoteSchema.parse(req.body);
            // A sequence format: ORC-GUI-2026-XXXXXX is handled using the DB autoincrement ID
            const quote = await prisma_1.prisma.towingQuote.create({
                data: {
                    ...data,
                    companyId,
                    userId,
                }
            });
            // Update formatted number
            const ano = quote.createdAt.getFullYear();
            const numFormatado = `ORC-GUI-${ano}-${quote.numeroOrcamento.toString().padStart(6, '0')}`;
            const updatedQuote = await prisma_1.prisma.towingQuote.update({
                where: { id: quote.id },
                data: { numeroFormatado: numFormatado }
            });
            audit_logger_1.AuditLogger.log(userId, companyId, 'CREATE_TOWING_QUOTE', `Orçamento de guincho ${numFormatado} criado`, 'SUCCESS');
            return res.status(201).json(updatedQuote);
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({ error: error.errors });
            }
            console.error(error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    },
    async update(req, res) {
        try {
            const id = req.params.id;
            const companyId = req.companyId;
            const userId = req.userId;
            const data = createTowingQuoteSchema.parse(req.body);
            const existingQuote = await prisma_1.prisma.towingQuote.findUnique({
                where: { id }
            });
            if (!existingQuote || existingQuote.companyId !== companyId) {
                return res.status(404).json({ error: 'Quote not found' });
            }
            const updatedQuote = await prisma_1.prisma.towingQuote.update({
                where: { id },
                data
            });
            audit_logger_1.AuditLogger.log(userId, companyId, 'UPDATE_TOWING_QUOTE', `Orçamento de guincho ${existingQuote.numeroFormatado} atualizado`, 'SUCCESS');
            return res.json(updatedQuote);
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({ error: error.errors });
            }
            console.error(error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    },
    async delete(req, res) {
        try {
            const id = req.params.id;
            const companyId = req.companyId;
            const userId = req.userId;
            const existingQuote = await prisma_1.prisma.towingQuote.findUnique({
                where: { id }
            });
            if (!existingQuote || existingQuote.companyId !== companyId) {
                return res.status(404).json({ error: 'Quote not found' });
            }
            await prisma_1.prisma.towingQuote.delete({
                where: { id }
            });
            audit_logger_1.AuditLogger.log(userId, companyId, 'DELETE_TOWING_QUOTE', `Orçamento de guincho ${existingQuote.numeroFormatado} deletado`, 'SUCCESS');
            return res.status(204).send();
        }
        catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }
};
