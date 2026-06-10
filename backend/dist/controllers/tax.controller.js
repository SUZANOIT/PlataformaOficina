"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaxController = void 0;
const prisma_1 = require("../lib/prisma");
const zod_1 = require("zod");
const audit_logger_1 = require("../utils/audit.logger");
const tributacaoSchema = zod_1.z.object({
    esfera: zod_1.z.enum(['MUNICIPAL', 'ESTADUAL', 'FEDERAL']),
    codigo: zod_1.z.string(),
    descricao: zod_1.z.string(),
    status: zod_1.z.string().default('ATIVO'),
    // Municipal specific
    municipio: zod_1.z.string().optional().nullable(),
    codigoServico: zod_1.z.string().optional().nullable(),
    aliquotaIss: zod_1.z.number().optional().nullable(),
    retencaoIss: zod_1.z.boolean().default(false),
    situacaoTributaria: zod_1.z.string().optional().nullable(),
    // Estadual specific
    uf: zod_1.z.string().optional().nullable(),
    cfop: zod_1.z.string().optional().nullable(),
    cstIcms: zod_1.z.string().optional().nullable(),
    csosn: zod_1.z.string().optional().nullable(),
    aliquotaIcms: zod_1.z.number().optional().nullable(),
    fcp: zod_1.z.number().optional().nullable(),
    difal: zod_1.z.number().optional().nullable(),
    observacao: zod_1.z.string().optional().nullable(),
    // Federal specific
    cstPis: zod_1.z.string().optional().nullable(),
    cstCofins: zod_1.z.string().optional().nullable(),
    cstIpi: zod_1.z.string().optional().nullable(),
    aliquotaPis: zod_1.z.number().optional().nullable(),
    aliquotaCofins: zod_1.z.number().optional().nullable(),
    aliquotaIpi: zod_1.z.number().optional().nullable(),
    naturezaReceita: zod_1.z.string().optional().nullable(),
});
exports.TaxController = {
    async list(req, res) {
        try {
            const companyId = req.companyId || null;
            if (!companyId)
                return res.status(400).json({ error: 'Empresa não identificada.' });
            const taxes = await prisma_1.prisma.tributacao.findMany({
                where: { companyId },
                orderBy: [{ esfera: 'asc' }, { codigo: 'asc' }],
            });
            return res.json(taxes);
        }
        catch (error) {
            console.error('Error listing taxes:', error);
            return res.status(500).json({ error: 'Erro ao listar tributações' });
        }
    },
    async create(req, res) {
        try {
            const companyId = req.companyId || null;
            const userId = req.userId || null;
            if (!companyId)
                return res.status(400).json({ error: 'Empresa não identificada.' });
            const data = tributacaoSchema.parse(req.body);
            const duplicate = await prisma_1.prisma.tributacao.findUnique({
                where: { companyId_esfera_codigo: { companyId, esfera: data.esfera, codigo: data.codigo } }
            });
            if (duplicate) {
                return res.status(409).json({ error: 'Já existe uma tributação desta esfera com este código.' });
            }
            const tax = await prisma_1.prisma.tributacao.create({
                data: { ...data, companyId },
            });
            audit_logger_1.AuditLogger.log(userId, companyId, 'CREATE_TAX', `Created tax code ${tax.codigo} for ${tax.esfera}`, 'SUCCESS');
            return res.status(201).json(tax);
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError)
                return res.status(400).json({ error: error.issues });
            console.error('Error creating tax:', error);
            return res.status(500).json({ error: 'Erro ao criar tributação' });
        }
    },
    async update(req, res) {
        try {
            const id = req.params.id;
            const companyId = req.companyId || null;
            const userId = req.userId || null;
            const existing = await prisma_1.prisma.tributacao.findFirst({
                where: { id, companyId }
            });
            if (!existing)
                return res.status(404).json({ error: 'Tributação não encontrada.' });
            const data = tributacaoSchema.parse(req.body);
            if (data.codigo !== existing.codigo || data.esfera !== existing.esfera) {
                const duplicate = await prisma_1.prisma.tributacao.findUnique({
                    where: { companyId_esfera_codigo: { companyId, esfera: data.esfera, codigo: data.codigo } }
                });
                if (duplicate) {
                    return res.status(409).json({ error: 'Já existe uma tributação desta esfera com este código.' });
                }
            }
            const tax = await prisma_1.prisma.tributacao.update({
                where: { id },
                data: { ...data, companyId },
            });
            audit_logger_1.AuditLogger.log(userId, companyId, 'UPDATE_TAX', `Updated tax code ${tax.codigo} for ${tax.esfera}`, 'SUCCESS');
            return res.json(tax);
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError)
                return res.status(400).json({ error: error.issues });
            console.error('Error updating tax:', error);
            return res.status(500).json({ error: 'Erro ao atualizar tributação' });
        }
    },
    async delete(req, res) {
        try {
            const id = req.params.id;
            const companyId = req.companyId || null;
            const userId = req.userId || null;
            const existing = await prisma_1.prisma.tributacao.findFirst({
                where: { id, companyId }
            });
            if (!existing)
                return res.status(404).json({ error: 'Tributação não encontrada.' });
            // Check if any product is using this tax configuration
            const countMunicipal = await prisma_1.prisma.product.count({ where: { tributacaoMunicipalId: id } });
            const countEstadual = await prisma_1.prisma.product.count({ where: { tributacaoEstadualId: id } });
            const countFederal = await prisma_1.prisma.product.count({ where: { tributacaoFederalId: id } });
            if (countMunicipal > 0 || countEstadual > 0 || countFederal > 0) {
                return res.status(400).json({ error: 'Não é possível excluir esta tributação pois ela está vinculada a produtos cadastrados.' });
            }
            await prisma_1.prisma.tributacao.delete({ where: { id } });
            audit_logger_1.AuditLogger.log(userId, companyId, 'DELETE_TAX', `Deleted tax code ${existing.codigo} for ${existing.esfera}`, 'SUCCESS');
            return res.status(204).send();
        }
        catch (error) {
            console.error('Error deleting tax:', error);
            return res.status(500).json({ error: 'Erro ao excluir tributação' });
        }
    }
};
