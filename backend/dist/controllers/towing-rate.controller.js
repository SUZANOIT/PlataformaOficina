"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TowingRateController = void 0;
const prisma_1 = require("../lib/prisma");
const zod_1 = require("zod");
const rateSchema = zod_1.z.object({
    quantidadeEixos: zod_1.z.coerce.number().min(2, 'Quantidade mínima é 2 eixos.'),
    taxaSaida: zod_1.z.number().default(0),
    valorKm: zod_1.z.number().default(0),
    valorHoraParada: zod_1.z.number().default(0),
    status: zod_1.z.string().default('ATIVO'),
});
exports.TowingRateController = {
    async list(req, res) {
        try {
            const companyId = req.companyId;
            const { status } = req.query;
            const whereClause = { companyId };
            if (status) {
                whereClause.status = status;
            }
            const rates = await prisma_1.prisma.towingRate.findMany({
                where: whereClause,
                orderBy: { quantidadeEixos: 'asc' }
            });
            return res.json(rates);
        }
        catch (error) {
            return res.status(500).json({ error: 'Internal error' });
        }
    },
    async save(req, res) {
        try {
            const companyId = req.companyId;
            const userId = req.userId;
            const data = rateSchema.parse(req.body);
            const existing = await prisma_1.prisma.towingRate.findFirst({
                where: { companyId, quantidadeEixos: data.quantidadeEixos }
            });
            // Fetch user details for audit trail
            const user = await prisma_1.prisma.user.findUnique({
                where: { id: userId },
                select: { name: true }
            });
            const userName = user?.name || 'Sistema';
            let rate;
            if (existing) {
                // Log history comparison
                await prisma_1.prisma.towingRateHistory.create({
                    data: {
                        towingRateId: existing.id,
                        companyId,
                        userId,
                        userName,
                        taxaSaidaAnterior: existing.taxaSaida,
                        taxaSaidaNova: data.taxaSaida,
                        valorKmAnterior: existing.valorKm,
                        valorKmNovo: data.valorKm,
                        valorHoraParadaAnterior: existing.valorHoraParada,
                        valorHoraParadaNovo: data.valorHoraParada,
                        statusAnterior: existing.status,
                        statusNovo: data.status,
                    }
                });
                rate = await prisma_1.prisma.towingRate.update({
                    where: { id: existing.id },
                    data: {
                        quantidadeEixos: data.quantidadeEixos,
                        taxaSaida: data.taxaSaida,
                        valorKm: data.valorKm,
                        valorHoraParada: data.valorHoraParada,
                        status: data.status,
                    }
                });
            }
            else {
                rate = await prisma_1.prisma.towingRate.create({
                    data: {
                        companyId,
                        quantidadeEixos: data.quantidadeEixos,
                        taxaSaida: data.taxaSaida,
                        valorKm: data.valorKm,
                        valorHoraParada: data.valorHoraParada,
                        status: data.status,
                    }
                });
                // Log initial history
                await prisma_1.prisma.towingRateHistory.create({
                    data: {
                        towingRateId: rate.id,
                        companyId,
                        userId,
                        userName,
                        taxaSaidaAnterior: 0,
                        taxaSaidaNova: data.taxaSaida,
                        valorKmAnterior: 0,
                        valorKmNovo: data.valorKm,
                        valorHoraParadaAnterior: 0,
                        valorHoraParadaNovo: data.valorHoraParada,
                        statusAnterior: 'NOVO',
                        statusNovo: data.status,
                    }
                });
            }
            return res.json(rate);
        }
        catch (error) {
            console.error(error);
            if (error instanceof zod_1.z.ZodError)
                return res.status(400).json({ error: error.errors });
            return res.status(500).json({ error: 'Internal error' });
        }
    },
    async getHistory(req, res) {
        try {
            const companyId = req.companyId;
            const id = req.params.id;
            const rate = await prisma_1.prisma.towingRate.findFirst({
                where: { id, companyId }
            });
            if (!rate) {
                return res.status(404).json({ error: 'Tabela de frete não encontrada.' });
            }
            const history = await prisma_1.prisma.towingRateHistory.findMany({
                where: { towingRateId: id, companyId },
                orderBy: { createdAt: 'desc' }
            });
            return res.json(history);
        }
        catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'Internal error' });
        }
    }
};
