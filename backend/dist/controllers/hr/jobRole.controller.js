"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jobRoleController = void 0;
const prisma_1 = require("../../lib/prisma");
const zod_1 = require("zod");
const jobRoleSchema = zod_1.z.object({
    companyId: zod_1.z.string().uuid(),
    title: zod_1.z.string().min(2),
    description: zod_1.z.string().optional().nullable(),
    cbo: zod_1.z.string().optional().nullable(),
});
exports.jobRoleController = {
    async create(req, res) {
        try {
            const data = jobRoleSchema.parse(req.body);
            const jobRole = await prisma_1.prisma.jobRole.create({
                data
            });
            return res.status(201).json(jobRole);
        }
        catch (error) {
            return res.status(400).json({ error: error.message || 'Erro ao criar Cargo/Função' });
        }
    },
    async findAll(req, res) {
        try {
            const { companyId } = req.query;
            const jobRoles = await prisma_1.prisma.jobRole.findMany({
                where: { companyId: companyId },
                orderBy: { title: 'asc' }
            });
            return res.json(jobRoles);
        }
        catch (error) {
            return res.status(500).json({ error: 'Erro ao listar Cargos/Funções' });
        }
    },
    async findOne(req, res) {
        try {
            const { id } = req.params;
            const jobRole = await prisma_1.prisma.jobRole.findUnique({
                where: { id: id },
            });
            if (!jobRole)
                return res.status(404).json({ error: 'Não encontrado' });
            return res.json(jobRole);
        }
        catch (error) {
            return res.status(500).json({ error: 'Erro ao buscar' });
        }
    },
    async update(req, res) {
        try {
            const { id } = req.params;
            const data = jobRoleSchema.parse(req.body);
            const jobRole = await prisma_1.prisma.jobRole.update({
                where: { id: id },
                data
            });
            return res.json(jobRole);
        }
        catch (error) {
            return res.status(400).json({ error: error.message || 'Erro ao atualizar' });
        }
    },
    async delete(req, res) {
        try {
            const { id } = req.params;
            await prisma_1.prisma.jobRole.delete({ where: { id: id } });
            return res.status(204).send();
        }
        catch (error) {
            return res.status(500).json({ error: 'Erro ao excluir' });
        }
    }
};
