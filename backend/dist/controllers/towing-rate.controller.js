"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TowingRateController = void 0;
const prisma_1 = require("../lib/prisma");
const zod_1 = require("zod");
const rateSchema = zod_1.z.object({
    tipoGuincho: zod_1.z.string(),
    taxaSaida: zod_1.z.number().default(0),
    valorKm: zod_1.z.number().default(0),
    valorHoraParada: zod_1.z.number().default(0),
});
exports.TowingRateController = {
    async list(req, res) {
        try {
            const companyId = req.companyId;
            const rates = await prisma_1.prisma.towingRate.findMany({
                where: { companyId },
                orderBy: { tipoGuincho: 'asc' }
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
            const data = rateSchema.parse(req.body);
            const existing = await prisma_1.prisma.towingRate.findFirst({
                where: { companyId, tipoGuincho: data.tipoGuincho }
            });
            if (existing) {
                const rate = await prisma_1.prisma.towingRate.update({
                    where: { id: existing.id },
                    data
                });
                return res.json(rate);
            }
            else {
                const rate = await prisma_1.prisma.towingRate.create({
                    data: { ...data, companyId }
                });
                return res.status(201).json(rate);
            }
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError)
                return res.status(400).json({ error: error.errors });
            return res.status(500).json({ error: 'Internal error' });
        }
    }
};
