"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.workScheduleController = void 0;
const prisma_1 = require("../../lib/prisma");
const zod_1 = require("zod");
const workScheduleSchema = zod_1.z.object({
    companyId: zod_1.z.string().uuid(),
    name: zod_1.z.string().min(2),
    type: zod_1.z.string().min(2),
    entryTime: zod_1.z.string().optional().nullable(),
    exitTime: zod_1.z.string().optional().nullable(),
    intervalStart: zod_1.z.string().optional().nullable(),
    intervalEnd: zod_1.z.string().optional().nullable(),
});
exports.workScheduleController = {
    async create(req, res) {
        try {
            const data = workScheduleSchema.parse(req.body);
            const schedule = await prisma_1.prisma.workSchedule.create({
                data
            });
            return res.status(201).json(schedule);
        }
        catch (error) {
            return res.status(400).json({ error: error.message || 'Erro ao criar Escala de Trabalho' });
        }
    },
    async findAll(req, res) {
        try {
            const { companyId } = req.query;
            const schedules = await prisma_1.prisma.workSchedule.findMany({
                where: { companyId: companyId },
                orderBy: { name: 'asc' }
            });
            return res.json(schedules);
        }
        catch (error) {
            return res.status(500).json({ error: 'Erro ao listar Escalas de Trabalho' });
        }
    },
    async findOne(req, res) {
        try {
            const { id } = req.params;
            const schedule = await prisma_1.prisma.workSchedule.findUnique({
                where: { id: id },
            });
            if (!schedule)
                return res.status(404).json({ error: 'Não encontrado' });
            return res.json(schedule);
        }
        catch (error) {
            return res.status(500).json({ error: 'Erro ao buscar' });
        }
    },
    async update(req, res) {
        try {
            const { id } = req.params;
            const data = workScheduleSchema.parse(req.body);
            const schedule = await prisma_1.prisma.workSchedule.update({
                where: { id: id },
                data
            });
            return res.json(schedule);
        }
        catch (error) {
            return res.status(400).json({ error: error.message || 'Erro ao atualizar' });
        }
    },
    async delete(req, res) {
        try {
            const { id } = req.params;
            await prisma_1.prisma.workSchedule.delete({ where: { id: id } });
            return res.status(204).send();
        }
        catch (error) {
            return res.status(500).json({ error: 'Erro ao excluir' });
        }
    }
};
