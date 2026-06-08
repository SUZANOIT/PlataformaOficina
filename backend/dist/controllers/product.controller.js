"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductController = void 0;
const prisma_1 = require("../lib/prisma");
const zod_1 = require("zod");
const audit_logger_1 = require("../utils/audit.logger");
const productSchema = zod_1.z.object({
    codigo: zod_1.z.string().optional().nullable(),
    codigoBarras: zod_1.z.string().optional().nullable(),
    descricao: zod_1.z.string(),
    unidade: zod_1.z.string().optional().nullable(),
    valorCusto: zod_1.z.number().default(0),
    custoMedio: zod_1.z.number().default(0),
    quantidadeEstoque: zod_1.z.number().default(0),
    ncm: zod_1.z.string().optional().nullable(),
    cest: zod_1.z.string().optional().nullable(),
    cfopEntrada: zod_1.z.string().optional().nullable(),
    tributacaoMunicipalId: zod_1.z.string().optional().nullable(),
    tributacaoEstadualId: zod_1.z.string().optional().nullable(),
    tributacaoFederalId: zod_1.z.string().optional().nullable(),
});
exports.ProductController = {
    async list(req, res) {
        try {
            const { search } = req.query;
            const companyId = req.companyId || null;
            if (!companyId) {
                return res.status(400).json({ error: 'Identificador da empresa não encontrado.' });
            }
            const whereClause = { companyId };
            if (search) {
                whereClause.AND = [
                    { companyId },
                    {
                        OR: [
                            { descricao: { contains: search, mode: 'insensitive' } },
                            { codigo: { contains: search, mode: 'insensitive' } },
                            { codigoBarras: { contains: search, mode: 'insensitive' } },
                            { ncm: { contains: search, mode: 'insensitive' } },
                        ]
                    }
                ];
            }
            const products = await prisma_1.prisma.product.findMany({
                where: whereClause,
                include: {
                    tributacaoMunicipal: true,
                    tributacaoEstadual: true,
                    tributacaoFederal: true,
                },
                orderBy: { descricao: 'asc' },
            });
            return res.json(products);
        }
        catch (error) {
            console.error('Error listing products:', error);
            return res.status(500).json({ error: 'Erro ao listar produtos' });
        }
    },
    async getOne(req, res) {
        try {
            const id = req.params.id;
            const companyId = req.companyId || null;
            const product = await prisma_1.prisma.product.findFirst({
                where: { id, companyId },
                include: {
                    tributacaoMunicipal: true,
                    tributacaoEstadual: true,
                    tributacaoFederal: true,
                    movements: {
                        orderBy: { createdAt: 'desc' },
                        take: 50,
                    }
                }
            });
            if (!product) {
                return res.status(404).json({ error: 'Produto não encontrado.' });
            }
            return res.json(product);
        }
        catch (error) {
            console.error('Error fetching product:', error);
            return res.status(500).json({ error: 'Erro ao buscar detalhes do produto' });
        }
    },
    async create(req, res) {
        try {
            const companyId = req.companyId || null;
            const userId = req.userId || null;
            if (!companyId) {
                return res.status(400).json({ error: 'Identificador da empresa não encontrado.' });
            }
            const data = productSchema.parse(req.body);
            // Check if product code is already in use for this company
            if (data.codigo) {
                const duplicate = await prisma_1.prisma.product.findFirst({
                    where: { codigo: data.codigo, companyId }
                });
                if (duplicate) {
                    return res.status(409).json({ error: 'Já existe um produto com este código de referência.', code: 'DUPLICATE_CODE' });
                }
            }
            const product = await prisma_1.prisma.product.create({
                data: {
                    ...data,
                    companyId,
                    custoMedio: data.custoMedio || data.valorCusto, // Default average cost to initial cost
                },
            });
            // If initial stock is greater than 0, generate an initial entry movement
            if (product.quantidadeEstoque > 0) {
                await prisma_1.prisma.stockMovement.create({
                    data: {
                        productId: product.id,
                        tipo: 'ENTRADA',
                        quantidade: product.quantidadeEstoque,
                        valorUnitario: product.valorCusto,
                        valorTotal: product.quantidadeEstoque * product.valorCusto,
                        origem: 'AJUSTE_MANUAL',
                        documentoOrigem: 'Saldo Inicial',
                        userId,
                    }
                });
            }
            audit_logger_1.AuditLogger.log(userId, companyId, 'CREATE_PRODUCT', `Created product: ${product.descricao} (${product.id})`, 'SUCCESS');
            return res.status(201).json(product);
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({ error: error.issues });
            }
            console.error('Error creating product:', error);
            return res.status(500).json({ error: 'Erro ao criar produto' });
        }
    },
    async update(req, res) {
        try {
            const id = req.params.id;
            const companyId = req.companyId || null;
            const userId = req.userId || null;
            const existing = await prisma_1.prisma.product.findFirst({
                where: { id, companyId }
            });
            if (!existing) {
                return res.status(404).json({ error: 'Produto não encontrado.' });
            }
            const data = productSchema.parse(req.body);
            if (data.codigo) {
                const duplicate = await prisma_1.prisma.product.findFirst({
                    where: { codigo: data.codigo, companyId, id: { not: id } }
                });
                if (duplicate) {
                    return res.status(409).json({ error: 'Já existe um produto com este código de referência.', code: 'DUPLICATE_CODE' });
                }
            }
            // Check if stock has changed to generate manual stock adjustment
            const stockDifference = data.quantidadeEstoque - existing.quantidadeEstoque;
            if (stockDifference !== 0) {
                await prisma_1.prisma.stockMovement.create({
                    data: {
                        productId: id,
                        tipo: stockDifference > 0 ? 'ENTRADA' : 'SAIDA',
                        quantidade: Math.abs(stockDifference),
                        valorUnitario: data.valorCusto,
                        valorTotal: Math.abs(stockDifference) * data.valorCusto,
                        origem: 'AJUSTE_MANUAL',
                        documentoOrigem: 'Ajuste de Estoque Manual',
                        userId,
                    }
                });
            }
            const product = await prisma_1.prisma.product.update({
                where: { id },
                data: {
                    ...data,
                    companyId
                },
            });
            audit_logger_1.AuditLogger.log(userId, companyId, 'UPDATE_PRODUCT', `Updated product: ${product.descricao} (${product.id})`, 'SUCCESS');
            return res.json(product);
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({ error: error.issues });
            }
            console.error('Error updating product:', error);
            return res.status(500).json({ error: 'Erro ao atualizar produto' });
        }
    },
    async delete(req, res) {
        try {
            const id = req.params.id;
            const companyId = req.companyId || null;
            const userId = req.userId || null;
            const existing = await prisma_1.prisma.product.findFirst({
                where: { id, companyId }
            });
            if (!existing) {
                return res.status(404).json({ error: 'Produto não encontrado.' });
            }
            await prisma_1.prisma.product.delete({
                where: { id },
            });
            audit_logger_1.AuditLogger.log(userId, companyId, 'DELETE_PRODUCT', `Deleted product: ${existing.descricao} (${id})`, 'SUCCESS');
            return res.status(204).send();
        }
        catch (error) {
            console.error('Error deleting product:', error);
            return res.status(500).json({ error: 'Erro ao excluir produto' });
        }
    }
};
