"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.collectiveAgreementController = void 0;
const prisma_1 = require("../../lib/prisma");
const zod_1 = require("zod");
const collectiveAgreementSchema = zod_1.z.object({
    companyId: zod_1.z.string().uuid(),
    sindicato: zod_1.z.string().min(2),
    estado: zod_1.z.string().min(2),
    cidade: zod_1.z.string().optional(),
    dataBase: zod_1.z.string(), // YYYY-MM-DD
    vigenciaInicio: zod_1.z.string(),
    vigenciaFim: zod_1.z.string(),
    pisoSalarial: zod_1.z.number().min(0),
    jornadaMensal: zod_1.z.number().min(1),
    jornadaSemanal: zod_1.z.number().min(1),
    limiteDiario: zod_1.z.number().optional().nullable(),
    percentualHE50: zod_1.z.number().min(0),
    percentualHE100: zod_1.z.number().min(0),
    percentualNoturno: zod_1.z.number().min(0),
    percentualPericulosidade: zod_1.z.number().optional().nullable(),
    percentualInsalubridade: zod_1.z.number().optional().nullable(),
    beneficiosObrigatorios: zod_1.z.string().optional().nullable(),
    bancoDeHoras: zod_1.z.boolean(),
    descansoObrigatorio: zod_1.z.number().min(0),
});
exports.collectiveAgreementController = {
    async create(req, res) {
        try {
            const data = collectiveAgreementSchema.parse(req.body);
            const agreement = await prisma_1.prisma.collectiveAgreement.create({
                data: {
                    ...data,
                    dataBase: new Date(data.dataBase),
                    vigenciaInicio: new Date(data.vigenciaInicio),
                    vigenciaFim: new Date(data.vigenciaFim),
                }
            });
            return res.status(201).json(agreement);
        }
        catch (error) {
            return res.status(400).json({ error: error.message || 'Erro ao criar Convenção Coletiva' });
        }
    },
    async findAll(req, res) {
        try {
            const { companyId } = req.query;
            const agreements = await prisma_1.prisma.collectiveAgreement.findMany({
                where: { companyId: companyId },
                orderBy: { vigenciaInicio: 'desc' }
            });
            return res.json(agreements);
        }
        catch (error) {
            return res.status(500).json({ error: 'Erro ao listar Convenções Coletivas' });
        }
    },
    async findOne(req, res) {
        try {
            const { id } = req.params;
            const agreement = await prisma_1.prisma.collectiveAgreement.findUnique({
                where: { id: id },
            });
            if (!agreement)
                return res.status(404).json({ error: 'Não encontrado' });
            return res.json(agreement);
        }
        catch (error) {
            return res.status(500).json({ error: 'Erro ao buscar' });
        }
    },
    async update(req, res) {
        try {
            const { id } = req.params;
            const data = collectiveAgreementSchema.parse(req.body);
            const agreement = await prisma_1.prisma.collectiveAgreement.update({
                where: { id: id },
                data: {
                    ...data,
                    dataBase: new Date(data.dataBase),
                    vigenciaInicio: new Date(data.vigenciaInicio),
                    vigenciaFim: new Date(data.vigenciaFim),
                }
            });
            return res.json(agreement);
        }
        catch (error) {
            return res.status(400).json({ error: error.message || 'Erro ao atualizar' });
        }
    },
    async delete(req, res) {
        try {
            const { id } = req.params;
            await prisma_1.prisma.collectiveAgreement.delete({ where: { id: id } });
            return res.status(204).send();
        }
        catch (error) {
            return res.status(500).json({ error: 'Erro ao excluir' });
        }
    }
};
