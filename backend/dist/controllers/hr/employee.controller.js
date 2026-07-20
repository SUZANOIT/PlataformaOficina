"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.employeeController = void 0;
const prisma_1 = require("../../lib/prisma");
const zod_1 = require("zod");
const employeeSchema = zod_1.z.object({
    companyId: zod_1.z.string().uuid(),
    nome: zod_1.z.string().min(2),
    cpf: zod_1.z.string(),
    rg: zod_1.z.string().optional().nullable(),
    dataNascimento: zod_1.z.string().optional().nullable(),
    estadoCivil: zod_1.z.string().optional().nullable(),
    telefone: zod_1.z.string().optional().nullable(),
    email: zod_1.z.string().email().optional().nullable(),
    endereco: zod_1.z.string().optional().nullable(),
    foto: zod_1.z.string().optional().nullable(),
    dataAdmissao: zod_1.z.string(),
    status: zod_1.z.string().default('ATIVO'),
    jobRoleId: zod_1.z.string().optional().nullable(),
    workScheduleId: zod_1.z.string().optional().nullable(),
});
exports.employeeController = {
    async create(req, res) {
        try {
            const data = employeeSchema.parse(req.body);
            const employee = await prisma_1.prisma.collaborator.create({
                data: {
                    ...data,
                    dataNascimento: data.dataNascimento ? new Date(data.dataNascimento) : null,
                    dataAdmissao: new Date(data.dataAdmissao),
                }
            });
            return res.status(201).json(employee);
        }
        catch (error) {
            return res.status(400).json({ error: error.message || 'Erro ao criar funcionário' });
        }
    },
    async findAll(req, res) {
        try {
            const { companyId } = req.query;
            const employees = await prisma_1.prisma.collaborator.findMany({
                where: { companyId: companyId, deletedAt: null },
                include: { jobRole: true, workSchedule: true },
                orderBy: { nome: 'asc' }
            });
            return res.json(employees);
        }
        catch (error) {
            return res.status(500).json({ error: 'Erro ao listar funcionários' });
        }
    },
    async findOne(req, res) {
        try {
            const { id } = req.params;
            const employee = await prisma_1.prisma.collaborator.findUnique({
                where: { id: id },
                include: {
                    jobRole: true,
                    workSchedule: true,
                    documents: true,
                    salaryConfig: {
                        include: { collectiveAgreement: true }
                    }
                }
            });
            if (!employee || employee.deletedAt)
                return res.status(404).json({ error: 'Não encontrado' });
            return res.json(employee);
        }
        catch (error) {
            return res.status(500).json({ error: 'Erro ao buscar' });
        }
    },
    async update(req, res) {
        try {
            const { id } = req.params;
            const data = employeeSchema.parse(req.body);
            const employee = await prisma_1.prisma.collaborator.update({
                where: { id: id },
                data: {
                    ...data,
                    dataNascimento: data.dataNascimento ? new Date(data.dataNascimento) : null,
                    dataAdmissao: new Date(data.dataAdmissao),
                }
            });
            return res.json(employee);
        }
        catch (error) {
            return res.status(400).json({ error: error.message || 'Erro ao atualizar' });
        }
    },
    async delete(req, res) {
        try {
            const { id } = req.params;
            // Soft Delete
            await prisma_1.prisma.collaborator.update({
                where: { id: id },
                data: { deletedAt: new Date(), status: 'DEMITIDO' }
            });
            return res.status(204).send();
        }
        catch (error) {
            return res.status(500).json({ error: 'Erro ao excluir' });
        }
    }
};
