"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaxController = void 0;
const prisma_1 = require("../lib/prisma");
const zod_1 = require("zod");
const audit_logger_1 = require("../utils/audit.logger");
const municipalSchema = zod_1.z.object({
    codigo: zod_1.z.string(),
    descricao: zod_1.z.string(),
    municipio: zod_1.z.string().optional().nullable(),
    codigoServico: zod_1.z.string().optional().nullable(),
    aliquotaIss: zod_1.z.number().optional().nullable(),
    retencaoIss: zod_1.z.boolean().default(false),
    situacaoTributaria: zod_1.z.string().optional().nullable(),
    status: zod_1.z.string().default('ATIVO'),
});
const estadualSchema = zod_1.z.object({
    codigo: zod_1.z.string(),
    descricao: zod_1.z.string(),
    uf: zod_1.z.string().optional().nullable(),
    cfop: zod_1.z.string().optional().nullable(),
    cstIcms: zod_1.z.string().optional().nullable(),
    csosn: zod_1.z.string().optional().nullable(),
    aliquotaIcms: zod_1.z.number().optional().nullable(),
    fcp: zod_1.z.number().optional().nullable(),
    difal: zod_1.z.number().optional().nullable(),
    observacao: zod_1.z.string().optional().nullable(),
    status: zod_1.z.string().default('ATIVO'),
});
const federalSchema = zod_1.z.object({
    codigo: zod_1.z.string(),
    descricao: zod_1.z.string(),
    cstPis: zod_1.z.string().optional().nullable(),
    cstCofins: zod_1.z.string().optional().nullable(),
    cstIpi: zod_1.z.string().optional().nullable(),
    aliquotaPis: zod_1.z.number().optional().nullable(),
    aliquotaCofins: zod_1.z.number().optional().nullable(),
    aliquotaIpi: zod_1.z.number().optional().nullable(),
    naturezaReceita: zod_1.z.string().optional().nullable(),
    status: zod_1.z.string().default('ATIVO'),
});
exports.TaxController = {
    // --- MUNICIPAL ---
    async listMunicipal(req, res) {
        try {
            const companyId = req.companyId || null;
            if (!companyId)
                return res.status(400).json({ error: 'Empresa não identificada.' });
            const taxes = await prisma_1.prisma.tributacaoMunicipal.findMany({
                where: { companyId },
                orderBy: { codigo: 'asc' },
            });
            return res.json(taxes);
        }
        catch (error) {
            console.error('Error listing municipal taxes:', error);
            return res.status(500).json({ error: 'Erro ao listar tributações municipais' });
        }
    },
    async createMunicipal(req, res) {
        try {
            const companyId = req.companyId || null;
            const userId = req.userId || null;
            if (!companyId)
                return res.status(400).json({ error: 'Empresa não identificada.' });
            const data = municipalSchema.parse(req.body);
            const duplicate = await prisma_1.prisma.tributacaoMunicipal.findUnique({
                where: { companyId_codigo: { companyId, codigo: data.codigo } }
            });
            if (duplicate) {
                return res.status(409).json({ error: 'Já existe uma tributação municipal com este código.' });
            }
            const tax = await prisma_1.prisma.tributacaoMunicipal.create({
                data: { ...data, companyId },
            });
            audit_logger_1.AuditLogger.log(userId, companyId, 'CREATE_TAX_MUNICIPAL', `Created municipal tax code ${tax.codigo}`, 'SUCCESS');
            return res.status(201).json(tax);
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError)
                return res.status(400).json({ error: error.issues });
            console.error('Error creating municipal tax:', error);
            return res.status(500).json({ error: 'Erro ao criar tributação municipal' });
        }
    },
    async updateMunicipal(req, res) {
        try {
            const id = req.params.id;
            const companyId = req.companyId || null;
            const userId = req.userId || null;
            const existing = await prisma_1.prisma.tributacaoMunicipal.findFirst({
                where: { id, companyId }
            });
            if (!existing)
                return res.status(404).json({ error: 'Tributação não encontrada.' });
            const data = municipalSchema.parse(req.body);
            if (data.codigo !== existing.codigo) {
                const duplicate = await prisma_1.prisma.tributacaoMunicipal.findUnique({
                    where: { companyId_codigo: { companyId, codigo: data.codigo } }
                });
                if (duplicate) {
                    return res.status(409).json({ error: 'Já existe uma tributação municipal com este código.' });
                }
            }
            const tax = await prisma_1.prisma.tributacaoMunicipal.update({
                where: { id },
                data: { ...data, companyId },
            });
            audit_logger_1.AuditLogger.log(userId, companyId, 'UPDATE_TAX_MUNICIPAL', `Updated municipal tax code ${tax.codigo}`, 'SUCCESS');
            return res.json(tax);
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError)
                return res.status(400).json({ error: error.issues });
            console.error('Error updating municipal tax:', error);
            return res.status(500).json({ error: 'Erro ao atualizar tributação municipal' });
        }
    },
    async deleteMunicipal(req, res) {
        try {
            const id = req.params.id;
            const companyId = req.companyId || null;
            const userId = req.userId || null;
            const existing = await prisma_1.prisma.tributacaoMunicipal.findFirst({
                where: { id, companyId }
            });
            if (!existing)
                return res.status(404).json({ error: 'Tributação não encontrada.' });
            // Check if any product is using this tax configuration
            const count = await prisma_1.prisma.product.count({
                where: { tributacaoMunicipalId: id }
            });
            if (count > 0) {
                return res.status(400).json({ error: 'Não é possível excluir esta tributação pois ela está vinculada a produtos cadastrados.' });
            }
            await prisma_1.prisma.tributacaoMunicipal.delete({ where: { id } });
            audit_logger_1.AuditLogger.log(userId, companyId, 'DELETE_TAX_MUNICIPAL', `Deleted municipal tax code ${existing.codigo}`, 'SUCCESS');
            return res.status(204).send();
        }
        catch (error) {
            console.error('Error deleting municipal tax:', error);
            return res.status(500).json({ error: 'Erro ao excluir tributação municipal' });
        }
    },
    // --- ESTADUAL ---
    async listEstadual(req, res) {
        try {
            const companyId = req.companyId || null;
            if (!companyId)
                return res.status(400).json({ error: 'Empresa não identificada.' });
            const taxes = await prisma_1.prisma.tributacaoEstadual.findMany({
                where: { companyId },
                orderBy: { codigo: 'asc' },
            });
            return res.json(taxes);
        }
        catch (error) {
            console.error('Error listing estadual taxes:', error);
            return res.status(500).json({ error: 'Erro ao listar tributações estaduais' });
        }
    },
    async createEstadual(req, res) {
        try {
            const companyId = req.companyId || null;
            const userId = req.userId || null;
            if (!companyId)
                return res.status(400).json({ error: 'Empresa não identificada.' });
            const data = estadualSchema.parse(req.body);
            const duplicate = await prisma_1.prisma.tributacaoEstadual.findUnique({
                where: { companyId_codigo: { companyId, codigo: data.codigo } }
            });
            if (duplicate) {
                return res.status(409).json({ error: 'Já existe uma tributação estadual com este código.' });
            }
            const tax = await prisma_1.prisma.tributacaoEstadual.create({
                data: { ...data, companyId },
            });
            audit_logger_1.AuditLogger.log(userId, companyId, 'CREATE_TAX_ESTADUAL', `Created estadual tax code ${tax.codigo}`, 'SUCCESS');
            return res.status(201).json(tax);
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError)
                return res.status(400).json({ error: error.issues });
            console.error('Error creating estadual tax:', error);
            return res.status(500).json({ error: 'Erro ao criar tributação estadual' });
        }
    },
    async updateEstadual(req, res) {
        try {
            const id = req.params.id;
            const companyId = req.companyId || null;
            const userId = req.userId || null;
            const existing = await prisma_1.prisma.tributacaoEstadual.findFirst({
                where: { id, companyId }
            });
            if (!existing)
                return res.status(404).json({ error: 'Tributação não encontrada.' });
            const data = estadualSchema.parse(req.body);
            if (data.codigo !== existing.codigo) {
                const duplicate = await prisma_1.prisma.tributacaoEstadual.findUnique({
                    where: { companyId_codigo: { companyId, codigo: data.codigo } }
                });
                if (duplicate) {
                    return res.status(409).json({ error: 'Já existe uma tributação estadual com este código.' });
                }
            }
            const tax = await prisma_1.prisma.tributacaoEstadual.update({
                where: { id },
                data: { ...data, companyId },
            });
            audit_logger_1.AuditLogger.log(userId, companyId, 'UPDATE_TAX_ESTADUAL', `Updated estadual tax code ${tax.codigo}`, 'SUCCESS');
            return res.json(tax);
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError)
                return res.status(400).json({ error: error.issues });
            console.error('Error updating estadual tax:', error);
            return res.status(500).json({ error: 'Erro ao atualizar tributação estadual' });
        }
    },
    async deleteEstadual(req, res) {
        try {
            const id = req.params.id;
            const companyId = req.companyId || null;
            const userId = req.userId || null;
            const existing = await prisma_1.prisma.tributacaoEstadual.findFirst({
                where: { id, companyId }
            });
            if (!existing)
                return res.status(404).json({ error: 'Tributação não encontrada.' });
            const count = await prisma_1.prisma.product.count({
                where: { tributacaoEstadualId: id }
            });
            if (count > 0) {
                return res.status(400).json({ error: 'Não é possível excluir esta tributação pois ela está vinculada a produtos cadastrados.' });
            }
            await prisma_1.prisma.tributacaoEstadual.delete({ where: { id } });
            audit_logger_1.AuditLogger.log(userId, companyId, 'DELETE_TAX_ESTADUAL', `Deleted estadual tax code ${existing.codigo}`, 'SUCCESS');
            return res.status(204).send();
        }
        catch (error) {
            console.error('Error deleting estadual tax:', error);
            return res.status(500).json({ error: 'Erro ao excluir tributação estadual' });
        }
    },
    // --- FEDERAL ---
    async listFederal(req, res) {
        try {
            const companyId = req.companyId || null;
            if (!companyId)
                return res.status(400).json({ error: 'Empresa não identificada.' });
            const taxes = await prisma_1.prisma.tributacaoFederal.findMany({
                where: { companyId },
                orderBy: { codigo: 'asc' },
            });
            return res.json(taxes);
        }
        catch (error) {
            console.error('Error listing federal taxes:', error);
            return res.status(500).json({ error: 'Erro ao listar tributações federais' });
        }
    },
    async createFederal(req, res) {
        try {
            const companyId = req.companyId || null;
            const userId = req.userId || null;
            if (!companyId)
                return res.status(400).json({ error: 'Empresa não identificada.' });
            const data = federalSchema.parse(req.body);
            const duplicate = await prisma_1.prisma.tributacaoFederal.findUnique({
                where: { companyId_codigo: { companyId, codigo: data.codigo } }
            });
            if (duplicate) {
                return res.status(409).json({ error: 'Já existe uma tributação federal com este código.' });
            }
            const tax = await prisma_1.prisma.tributacaoFederal.create({
                data: { ...data, companyId },
            });
            audit_logger_1.AuditLogger.log(userId, companyId, 'CREATE_TAX_FEDERAL', `Created federal tax code ${tax.codigo}`, 'SUCCESS');
            return res.status(201).json(tax);
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError)
                return res.status(400).json({ error: error.issues });
            console.error('Error creating federal tax:', error);
            return res.status(500).json({ error: 'Erro ao criar tributação federal' });
        }
    },
    async updateFederal(req, res) {
        try {
            const id = req.params.id;
            const companyId = req.companyId || null;
            const userId = req.userId || null;
            const existing = await prisma_1.prisma.tributacaoFederal.findFirst({
                where: { id, companyId }
            });
            if (!existing)
                return res.status(404).json({ error: 'Tributação não encontrada.' });
            const data = federalSchema.parse(req.body);
            if (data.codigo !== existing.codigo) {
                const duplicate = await prisma_1.prisma.tributacaoFederal.findUnique({
                    where: { companyId_codigo: { companyId, codigo: data.codigo } }
                });
                if (duplicate) {
                    return res.status(409).json({ error: 'Já existe uma tributação federal com este código.' });
                }
            }
            const tax = await prisma_1.prisma.tributacaoFederal.update({
                where: { id },
                data: { ...data, companyId },
            });
            audit_logger_1.AuditLogger.log(userId, companyId, 'UPDATE_TAX_FEDERAL', `Updated federal tax code ${tax.codigo}`, 'SUCCESS');
            return res.json(tax);
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError)
                return res.status(400).json({ error: error.issues });
            console.error('Error updating federal tax:', error);
            return res.status(500).json({ error: 'Erro ao atualizar tributação federal' });
        }
    },
    async deleteFederal(req, res) {
        try {
            const id = req.params.id;
            const companyId = req.companyId || null;
            const userId = req.userId || null;
            const existing = await prisma_1.prisma.tributacaoFederal.findFirst({
                where: { id, companyId }
            });
            if (!existing)
                return res.status(404).json({ error: 'Tributação não encontrada.' });
            const count = await prisma_1.prisma.product.count({
                where: { tributacaoFederalId: id }
            });
            if (count > 0) {
                return res.status(400).json({ error: 'Não é possível excluir esta tributação pois ela está vinculada a produtos cadastrados.' });
            }
            await prisma_1.prisma.tributacaoFederal.delete({ where: { id } });
            audit_logger_1.AuditLogger.log(userId, companyId, 'DELETE_TAX_FEDERAL', `Deleted federal tax code ${existing.codigo}`, 'SUCCESS');
            return res.status(204).send();
        }
        catch (error) {
            console.error('Error deleting federal tax:', error);
            return res.status(500).json({ error: 'Erro ao excluir tributação federal' });
        }
    }
};
