"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlatformController = void 0;
const prisma_1 = require("../lib/prisma");
const zod_1 = require("zod");
const platformSchema = zod_1.z.object({
    razaoSocial: zod_1.z.string().min(1, 'Razão Social é obrigatória'),
    nomeFantasia: zod_1.z.string().min(1, 'Nome Fantasia é obrigatório'),
    cnpj: zod_1.z.string().min(14, 'CNPJ inválido'),
    telefone: zod_1.z.string().min(1, 'Telefone é obrigatório'),
    email: zod_1.z.string().email('E-mail inválido'),
    responsavel: zod_1.z.string().optional().nullable(),
    status: zod_1.z.enum(['ATIVO', 'INATIVO']).default('ATIVO'),
    observacoes: zod_1.z.string().optional().nullable(),
    endereco: zod_1.z.string().optional().nullable(),
    cidade: zod_1.z.string().optional().nullable(),
    estado: zod_1.z.string().optional().nullable(),
    cep: zod_1.z.string().optional().nullable(),
});
exports.PlatformController = {
    async list(req, res) {
        try {
            const companyId = req.companyId;
            const { search, status, page = '1', limit = '10' } = req.query;
            const pageNum = parseInt(page, 10);
            const limitNum = parseInt(limit, 10);
            const skip = (pageNum - 1) * limitNum;
            const whereClause = { companyId };
            if (status && status !== 'TODOS') {
                whereClause.status = status;
            }
            if (search) {
                const searchStr = search;
                whereClause.AND = [
                    {
                        OR: [
                            { nomeFantasia: { contains: searchStr, mode: 'insensitive' } },
                            { razaoSocial: { contains: searchStr, mode: 'insensitive' } },
                            { cnpj: { contains: searchStr, mode: 'insensitive' } },
                        ]
                    }
                ];
            }
            const [platforms, total] = await Promise.all([
                prisma_1.prisma.plataformaGestao.findMany({
                    where: whereClause,
                    orderBy: { nomeFantasia: 'asc' },
                    skip,
                    take: limitNum,
                }),
                prisma_1.prisma.plataformaGestao.count({ where: whereClause }),
            ]);
            return res.json({
                data: platforms,
                total,
                page: pageNum,
                totalPages: Math.ceil(total / limitNum),
            });
        }
        catch (error) {
            console.error('Error listing platforms:', error);
            return res.status(500).json({ error: 'Erro ao listar plataformas de gestão' });
        }
    },
    async create(req, res) {
        try {
            const companyId = req.companyId;
            const data = platformSchema.parse(req.body);
            const cnpjSemMascara = data.cnpj.replace(/\D/g, '');
            if (cnpjSemMascara.length !== 14) {
                return res.status(400).json({ error: 'CNPJ deve conter exatamente 14 dígitos' });
            }
            // Check duplicate CNPJ
            const duplicate = await prisma_1.prisma.plataformaGestao.findFirst({
                where: {
                    companyId,
                    cnpjSemMascara,
                }
            });
            if (duplicate) {
                return res.status(400).json({ error: 'Já existe uma plataforma cadastrada com este CNPJ' });
            }
            const platform = await prisma_1.prisma.plataformaGestao.create({
                data: {
                    ...data,
                    cnpjSemMascara,
                    companyId,
                }
            });
            return res.status(201).json(platform);
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({ error: error.errors[0]?.message || 'Erro de validação' });
            }
            console.error('Error creating platform:', error);
            return res.status(500).json({ error: 'Erro ao cadastrar plataforma de gestão' });
        }
    },
    async update(req, res) {
        try {
            const id = req.params.id;
            const companyId = req.companyId;
            const data = platformSchema.parse(req.body);
            const cnpjSemMascara = data.cnpj.replace(/\D/g, '');
            if (cnpjSemMascara.length !== 14) {
                return res.status(400).json({ error: 'CNPJ deve conter exatamente 14 dígitos' });
            }
            // Check ownership
            const existing = await prisma_1.prisma.plataformaGestao.findFirst({
                where: { id, companyId }
            });
            if (!existing) {
                return res.status(404).json({ error: 'Plataforma de gestão não encontrada ou acesso não autorizado' });
            }
            // Check duplicate CNPJ on other platforms
            const duplicate = await prisma_1.prisma.plataformaGestao.findFirst({
                where: {
                    companyId,
                    cnpjSemMascara,
                    id: { not: id },
                }
            });
            if (duplicate) {
                return res.status(400).json({ error: 'Já existe outra plataforma cadastrada com este CNPJ' });
            }
            const platform = await prisma_1.prisma.plataformaGestao.update({
                where: { id },
                data: {
                    ...data,
                    cnpjSemMascara,
                }
            });
            return res.json(platform);
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({ error: error.errors[0]?.message || 'Erro de validação' });
            }
            console.error('Error updating platform:', error);
            return res.status(500).json({ error: 'Erro ao atualizar plataforma de gestão' });
        }
    },
    async delete(req, res) {
        try {
            const id = req.params.id;
            const companyId = req.companyId;
            // Check ownership
            const existing = await prisma_1.prisma.plataformaGestao.findFirst({
                where: { id, companyId }
            });
            if (!existing) {
                return res.status(404).json({ error: 'Plataforma de gestão não encontrada ou acesso não autorizado' });
            }
            await prisma_1.prisma.plataformaGestao.delete({
                where: { id }
            });
            return res.status(204).send();
        }
        catch (error) {
            console.error('Error deleting platform:', error);
            return res.status(500).json({ error: 'Erro ao excluir plataforma de gestão' });
        }
    }
};
